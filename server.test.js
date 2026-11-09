import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './server.mjs';
import { createInterviewService } from './interview-service.js';
import { Readable } from 'node:stream';

async function withServer(run,options={}) {
 const server=createServer({service:createInterviewService(),...options});
 // Exercise the real HTTP request handler in-process; this sandbox cannot bind sockets.
 const request=(url,init={})=>new Promise((resolve,reject)=>{
   const req=Readable.from(init.body?[Buffer.from(init.body)]:[]);
   req.url=new URL(url).pathname;req.method=init.method||'GET';
   req.headers=Object.fromEntries([...new Headers(init.headers)].map(([k,v])=>[k.toLowerCase(),v]));req.headers.host='127.0.0.1:4173';
   const res={status:200,headers:{},writeHead(status,headers={}){this.status=status;this.headers=headers;},end(data){resolve(new Response(data,{status:this.status,headers:this.headers}));}};
   req.on('error',reject);server.emit('request',req,res);
 });
 await run('http://127.0.0.1:4173',request);
}
test('HTTP로 새 대화·입력·전환·삭제가 이어지고 3D 자산도 유지된다',()=>withServer(async (base,fetch)=>{
 const post=async(path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const config=await (await fetch(base+'/api/interview/config')).json();assert.equal(config.aiAvailable,false);
 const response=await post('/api/interview/sessions',{mode:'demo'});assert.equal(response.status,201);let v=await response.json();const path='/api/interview/sessions/'+v.id;
 assert.equal((await post(path+'/break',{})).status,409);
 for(const answer of ['회사의 비전에 공감했습니다','고객을 응대했습니다']){v=await(await post(path+'/turn',{answer,phase:'angry'})).json();assert.equal(v.phase,'normal');}
 assert.equal((await post(path+'/break',{})).status,200);v=await(await post(path+'/turn',{answer:'먹고살려고요'})).json();assert.equal(v.phase,'angry');assert.match(v.line,/월급/);
 assert.equal((await fetch(base+path,{method:'DELETE'})).status,200);assert.equal((await post(path+'/turn',{answer:'종료 후'})).status,404);
 for(const file of ['/','/scene.js','/game.js','/interview.html','/vendor/build/three.module.js','/characters.js','/face-photo.js','/face-editor.js','/face-editor.css','/render-policy.js','/assets/characters/anatomy.json','/assets/characters/reference.jpg','/assets/characters/seated-human.json'])assert.equal((await fetch(base+file)).status,200,file);
}));
test('변경 없는 자산은 ETag로 304를 반환하고 변경된 태그에는 본문을 보낸다',()=>withServer(async(base,fetch)=>{
 const first=await fetch(base+'/assets/characters/reference.jpg');const tag=first.headers.get('etag');assert.ok(tag);
 assert.ok((await first.arrayBuffer()).byteLength<300000);
 const cached=await fetch(base+'/assets/characters/reference.jpg',{headers:{'If-None-Match':tag}});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
 assert.equal((await fetch(base+'/assets/characters/reference.jpg',{headers:{'If-None-Match':'old-tag'}})).status,200);
 assert.equal((await fetch(base+'/server.mjs',{headers:{'If-None-Match':tag}})).status,404);
}));
test('사용자가 제공한 Bithumb 두 서체를 올바른 MIME으로 제공한다',()=>withServer(async(base,fetch)=>{
 for(const kind of ['Basic','Original']){const response=await fetch(base+'/assets/fonts/BithumbGothic'+kind+'.otf');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'font/otf');const bytes=new Uint8Array(await response.arrayBuffer());assert.equal(new TextDecoder().decode(bytes.slice(0,4)),'OTTO');assert.ok(bytes.length>400000);}
 const css=await fetch(base+'/assets/fonts/bithumb.css');assert.match(css.headers.get('content-type'),/text\/css/);const text=await css.text();assert.match(text,/Bithumb Basic/);assert.match(text,/Bithumb Original/);const embedded=[...text.matchAll(/data:font\/otf;base64,([^"\)]+)/g)];assert.equal(embedded.length,2);for(const match of embedded)assert.equal(Buffer.from(match[1],'base64').toString('ascii',0,4),'OTTO');
}));
test('공개 진입은 점검 화면이고 로컬 주소는 3D 다회 면접을 연다',()=>withServer(async(base,fetch)=>{
 for(const route of ['/','/interview.html']){const text=await(await fetch(base+route)).text();assert.match(text,/서버 오류 수정중입니다/);assert.doesNotMatch(text,/<script/);}
 const local=await fetch(base+'/local/');assert.equal(local.status,200);const html=await local.text();
 assert.match(html,/data-experience="conversation"/);assert.match(html,/<base href="\/">/);assert.match(html,/id="stage"/);assert.match(html,/id="answer-form"/);assert.match(html,/src="\/scene.js"/);assert.match(html,/src="\/interview.js"/);
 for(const route of ['/local/stage.js','/assets/demo/camera-drama.js','/local/conversation.css'])assert.equal((await fetch(base+route)).status,200);
}));
test('로컬 UI를 끄면 로컬 진입과 파일을 제공하지 않는다',()=>withServer(async(base,fetch)=>{
 for(const route of ['/local/','/local/stage.js','/local/conversation.css','/local/dialogue-shooting.js'])assert.equal((await fetch(base+route)).status,404);
 assert.equal((await fetch(base+'/')).status,200);
},{localUI:false}));
test('정적 비밀 파일·서버 소스·교차출처·과대 본문·잘못된 JSON을 차단한다',()=>withServer(async (base,fetch)=>{
 for(const file of ['/.env','/.env.example','/interview-service.js','/server.mjs','/handoff/MANIFEST.json','/package.json','/vendor/../server.mjs'])assert.equal((await fetch(base+file)).status,404,file);
 const post=body=>fetch(base+'/api/interview/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body});
 assert.equal((await post('{')).status,400);assert.equal((await post('x'.repeat(17000))).status,413);
 assert.equal((await fetch(base+'/api/interview/sessions',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{"mode":"demo"}'})).status,403);
 assert.equal((await post('{"mode":"ai"}')).status,503);
}));

test('DNS 재바인딩 호스트와 일반 텍스트 API 요청을 거부한다',async()=>{
 const server=createServer({service:createInterviewService()});
 const invoke=(host,contentType)=>new Promise(resolve=>{
  const req=Readable.from([Buffer.from('{"mode":"demo"}')]);req.method='POST';req.url='/api/interview/sessions';req.headers={host,'content-type':contentType};
  server.emit('request',req,{writeHead(status){this.status=status;},end(){resolve(this.status);}});
 });
 assert.equal(await invoke('attacker.example:4173','application/json'),403);
 assert.equal(await invoke('127.0.0.1:4173','text/plain'),415);
});
