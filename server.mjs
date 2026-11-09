import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterviewService, InterviewError } from './interview-service.js';
const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.otf':'font/otf', '.mp3': 'audio/mpeg' };
const publicFiles = new Set(['index.html', 'scene.js', 'game.js', 'flow.js', 'style.css', 'game.css', 'interview.html', 'interview.js', 'interview.css', 'characters.js', 'face-photo.js', 'face-editor.js', 'face-editor.css', 'render-policy.js']);
const localFiles=new Set(['local/room.html','local/stage.js','local/conversation.css','local/sound.js']);
function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
}
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new InterviewError('JSON 요청이 필요해요.', 415);
  const raw = await new Promise((resolve, reject) => {
    let bytes = 0, exceeded = false; const chunks = [];
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 16_384) { if (!exceeded) reject(new InterviewError('요청이 너무 커요.', 413)); exceeded = true; chunks.length = 0; }
      else if (!exceeded) chunks.push(chunk);
    });
    req.on('end', () => { if (!exceeded) resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', () => reject(new InterviewError('요청 전송이 중단됐어요.')));
    req.on('aborted', () => reject(new InterviewError('요청 전송이 중단됐어요.')));
  });
  try { const data = JSON.parse(raw); if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error(); return data; }
  catch { throw new InterviewError('요청 내용을 읽지 못했어요.', 400); }
}
export function createServer({ service = createInterviewService({ apiKey: process.env.OPENAI_API_KEY, model: process.env.INTERVIEW_MODEL || 'gpt-6-luna' }), localUI = !process.env.VERCEL } = {}) {
  return http.createServer(async (req, res) => {
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) throw new InterviewError('로컬 주소로 접속해 주세요.', 403);
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new InterviewError('다른 사이트에서는 요청할 수 없어요.', 403);
        if (req.method === 'GET' && url.pathname === '/api/interview/config') return json(res, 200, service.config());
        if (req.method === 'POST' && url.pathname === '/api/interview/sessions') return json(res, 201, service.create(await body(req)));
        const match = url.pathname.match(/^\/api\/interview\/sessions\/([a-f0-9-]{36})(?:\/(turn|break))?$/);
        if (!match) throw new InterviewError('요청 주소를 찾지 못했어요.', 404);
        const [, id, action] = match;
        if (req.method === 'DELETE' && !action) return json(res, 200, service.end(id));
        if (req.method !== 'POST' || !action) throw new InterviewError('지원하지 않는 요청이에요.', 405);
        const data = await body(req);
        return json(res, 200, action === 'turn' ? await service.turn(id, data.answer, data.requestId) : service.break(id));
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      let rel = decodeURIComponent(url.pathname).replace(/^\//, '') || 'index.html';
      if(localUI&&rel==='local'){res.writeHead(302,{Location:'/local/'});res.end();return;}
      if(rel==='local/')rel='local/room.html';
      const segments = rel.split('/');
      const isPublic = publicFiles.has(rel) || /^(assets|vendor)\//.test(rel) || (localUI&&localFiles.has(rel));
      if (!isPublic || segments.some(s => s.startsWith('.') || s.includes('\\'))) { res.writeHead(404); res.end(); return; }
      const file = path.resolve(root, rel);
      if (!file.startsWith(root + path.sep) || !(await realpath(file)).startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
      const info=await stat(file);
      if(!info.isFile()){res.writeHead(404);res.end();return;}
      const etag=`W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}"`;
      const headers={ 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'ETag':etag };
      if(req.headers['if-none-match']?.split(',').some(tag=>tag.trim()===etag||tag.trim()==='*')){res.writeHead(304,headers);res.end();return;}
      res.writeHead(200,headers);
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch (error) {
      if (req.url?.startsWith('/api/')) json(res, error instanceof InterviewError ? error.status : 500, { error: error instanceof InterviewError ? error.message : '요청을 처리하지 못했어요.' });
      else { res.writeHead(404); res.end('Not found'); }
    }
  }).on('close', () => service.dispose());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4173); const server = createServer();
  server.listen(port, '127.0.0.1', () => console.log(`로컬 면접: http://127.0.0.1:${port}/local/\n점검 화면: http://127.0.0.1:${port}/`));
  server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `포트 ${port}가 사용 중입니다. PORT=4174 npm start 로 실행하세요.` : e.message); process.exit(1); });
}
