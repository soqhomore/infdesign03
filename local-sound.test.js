import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transitionCues, shouldSuspendPresentation, presentationPauseDelay } from './local/sound.js';
import { createServer } from './server.mjs';
import { createInterviewService } from './interview-service.js';
import { Readable } from 'node:stream';

const s = (phase, normalTurns = 0, angryTurns = 0) => ({ phase, normalTurns, angryTurns });

test('면접 상태 변화마다 정해진 소리 신호를 낸다', () => {
 assert.deepEqual(transitionCues(s('setup'), s('normal')), ['ambience']);
 assert.deepEqual(transitionCues(s('normal', 0), s('normal', 1)), ['page']);
 assert.deepEqual(transitionCues(s('normal', 2), s('angry', 2)), ['rupture', 'beat:1']);
 assert.deepEqual(transitionCues(s('angry', 2, 0), s('angry', 2, 1)), ['slam', 'beat:2']);
 assert.deepEqual(transitionCues(s('angry', 2, 2), s('angry', 2, 3)), ['slam', 'beat:4']);
 assert.deepEqual(transitionCues(s('angry', 2, 3), s('done', 2, 4)), ['slam', 'cut', 'door', 'ambience']);
 assert.deepEqual(transitionCues(s('normal', 3), s('done', 3)), ['cut', 'door', 'ambience']);
 assert.deepEqual(transitionCues(s('done', 2, 4), s('setup')), ['silence']);
 assert.deepEqual(transitionCues(s('setup'), s('setup')), []);
 assert.deepEqual(transitionCues(s('angry', 2, 1), s('angry', 2, 1)), []);
});

test('효과음 파일과 소리 모듈을 올바른 형식으로 제공하고 출처를 남긴다', async () => {
 const server = createServer({ service: createInterviewService() });
 const get = url => new Promise(resolve => {
  const req = Readable.from([]); Object.assign(req, { url, method: 'GET', headers: { host: '127.0.0.1:4173' } });
  const res = { writeHead(status, headers = {}) { this.status = status; this.headers = headers; }, end() { resolve(this); } };
  server.emit('request', req, res);
 });
 const credits = await readFile(new URL('./assets/sfx/CREDITS.md', import.meta.url), 'utf8');
 for (const name of ['room-tone', 'clock', 'page-turn', 'record-scratch', 'glass-crack', 'table-slam', 'door-close']) {
  const res = await get(`/assets/sfx/${name}.mp3`);
  assert.equal(res.status, 200, name); assert.equal(res.headers['Content-Type'], 'audio/mpeg');
  assert.match(credits, new RegExp(`${name}\\.mp3`));
 }
 assert.equal((await get('/local/sound.js')).status, 200);
 assert.match(await readFile(new URL('./local/room.html', import.meta.url), 'utf8'), /src="\/local\/sound\.js"/);
});

test('행복 전환 중 효과음은 재생하고 일반 일시정지·공간 보기에서는 멈춘다',()=>{assert.equal(shouldSuspendPresentation({kind:'happiness-transition'}),false);assert.equal(shouldSuspendPresentation(),true);assert.equal(shouldSuspendPresentation({kind:'menu'}),true);});

test('글자가 날아가는 동안에는 음향 시간도 즉시 멈추고 평소에는 기존 효과음 꼬리를 유지한다',()=>{assert.equal(presentationPauseDelay(.4,1.45),0);assert.equal(presentationPauseDelay(2,1.45),1600);});
