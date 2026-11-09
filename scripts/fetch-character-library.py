#!/usr/bin/env python3
"""Fetch only selected official CC0 MakeHuman assets. Python standard library only.

Run from a normal terminal with network access. Does not execute downloaded files.
The zip is read with byte ranges; the entire ~267 MiB asset pack is not downloaded.
"""
import argparse
import datetime
import hashlib
import io
import json
from pathlib import Path
import struct
import urllib.request
import zipfile
import zlib

PACK = 'https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip'
RIG_ROOT = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/rigs/'
PREFIXES = (
    'clothes/male_elegantsuit01/',
    'clothes/shoes01/',
    'hair/short01/',
    'eyes/low-poly/',
    'eyes/brown/',
    'skins/middleage_asian_male/',
)
DESTINATION = Path(__file__).resolve().parents[1] / 'references/character-source/library'
MAX_ENTRY = 24 * 1024 * 1024


def request(url, **kwargs):
    return urllib.request.urlopen(urllib.request.Request(url, headers={
        'User-Agent': 'interview-room-character-assets/1.0', **kwargs.pop('headers', {})
    }, **kwargs), timeout=45)


def zip_index(read_range, total):
    start = max(0, total - 65557)
    tail = read_range(start, total - 1)
    marker = tail.rfind(b'PK\x05\x06')
    if marker < 0:
        raise ValueError('ZIP end record is missing')
    _, disk, central_disk, _, count, size, offset, _ = struct.unpack_from('<4s4H2IH', tail, marker)
    if disk or central_disk or count == 65535 or size > 8 * 1024 * 1024:
        raise ValueError('Unsupported ZIP layout')
    data = read_range(offset, offset + size - 1)
    entries = []
    pos = 0
    while pos < len(data) and data[pos:pos + 4] == b'PK\x01\x02':
        item = struct.unpack_from('<4s6H3I5H2I', data, pos)
        name_len, extra_len, comment_len = item[10:13]
        name = data[pos + 46:pos + 46 + name_len].decode('utf8')
        entries.append(dict(name=name, method=item[4], crc=item[7], compressed=item[8], size=item[9], offset=item[16]))
        pos += 46 + name_len + extra_len + comment_len
    if len(entries) != count:
        raise ValueError('ZIP index entry count mismatch')
    return entries


def extract(entry, read_range, total):
    if entry['size'] > MAX_ENTRY or entry['compressed'] > MAX_ENTRY:
        raise ValueError('Asset exceeds the bounded download size')
    start = entry['offset']
    header = read_range(start, start + 29)
    fields = struct.unpack('<4s5H3I2H', header)
    if fields[0] != b'PK\x03\x04' or fields[2] & 1:
        raise ValueError('Invalid or encrypted asset')
    offset = start + 30 + fields[-2] + fields[-1]
    if offset + entry['compressed'] > total:
        raise ValueError('Invalid asset offset')
    packed = read_range(offset, offset + entry['compressed'] - 1)
    if entry['method'] == 8:
        decoder = zlib.decompressobj(-15)
        content = decoder.decompress(packed, entry['size'] + 1)
        if not decoder.eof or decoder.unconsumed_tail:
            raise ValueError('Invalid compressed asset')
    elif entry['method'] == 0:
        content = packed
    else:
        raise ValueError('Unsupported compression')
    if len(content) != entry['size'] or zlib.crc32(content) & 0xffffffff != entry['crc']:
        raise ValueError('Asset integrity check failed')
    return content


def safe_path(root, name):
    target = (root / name).resolve()
    if not target.is_relative_to(root.resolve()):
        raise ValueError('Unsafe asset path')
    return target


def write_atomic(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.partial')
    temp.write_bytes(content)
    temp.replace(path)


def self_test():
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as zipped:
        zipped.writestr('clothes/male_elegantsuit01/test.obj', 'v 0 1 2\nf 1 1 1\n')
    data = archive.getvalue()
    read = lambda a, b: data[a:b + 1]
    entries = zip_index(read, len(data))
    assert extract(entries[0], read, len(data)) == b'v 0 1 2\nf 1 1 1\n'
    invalid = dict(entries[0], crc=0)
    try:
        extract(invalid, read, len(data))
        raise AssertionError('Corrupt asset accepted')
    except ValueError:
        pass
    try:
        safe_path(Path('/tmp/asset-test'), '../../unsafe')
        raise AssertionError('Unsafe path accepted')
    except ValueError:
        pass
    print('ZIP range extraction, CRC and path checks passed. No network used.')


def main():
    with request(PACK, method='HEAD') as response:
        total = int(response.headers['Content-Length'])
    transferred = 0

    def read_range(first, last):
        nonlocal transferred
        if last < first:
            return b''
        with request(PACK, headers={'Range': f'bytes={first}-{last}'}) as response:
            if response.status != 206:
                raise ValueError('Server did not honor byte ranges; full download refused')
            content = response.read(last - first + 2)
        if len(content) != last - first + 1:
            raise ValueError('Incomplete range response')
        transferred += len(content)
        return content

    entries = zip_index(read_range, total)
    selected = [entry for entry in entries if entry['size'] and entry['name'].startswith(PREFIXES)]
    if not any(entry['name'].endswith('male_elegantsuit01.obj') for entry in selected):
        raise ValueError('Required suit asset not found in official pack')
    records = []
    for entry in selected:
        path = safe_path(DESTINATION, entry['name'])
        content = path.read_bytes() if path.exists() else b''
        if len(content) != entry['size'] or zlib.crc32(content) & 0xffffffff != entry['crc']:
            content = extract(entry, read_range, total)
            write_atomic(path, content)
        records.append(dict(path=entry['name'], bytes=len(content), sha256=hashlib.sha256(content).hexdigest(), crc32=entry['crc']))
        print(f"OK {entry['name']} ({len(content):,} bytes)", flush=True)
    for name in ('default.mhskel', 'default_weights.mhw'):
        with request(RIG_ROOT + name) as response:
            content = response.read(4 * 1024 * 1024 + 1)
        if len(content) > 4 * 1024 * 1024:
            raise ValueError('Rig source exceeds size limit')
        json.loads(content)
        write_atomic(DESTINATION / 'rigs' / name, content)
        records.append(dict(path='rigs/' + name, bytes=len(content), sha256=hashlib.sha256(content).hexdigest(), url=RIG_ROOT + name))
        print(f'OK rigs/{name}', flush=True)
    provenance = dict(license='CC0: official system asset pack',
        license_source='https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html',
        pack_url=PACK, downloaded_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        transfer_bytes=transferred, files=records)
    write_atomic(DESTINATION / 'SOURCE.json', (json.dumps(provenance, ensure_ascii=False, indent=2) + '\n').encode())
    print(f'\nReady: {DESTINATION}\nZIP bytes transferred: {transferred:,} / {total:,}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        try:
            main()
        except Exception as error:
            raise SystemExit(f'Asset download stopped: {error}')
