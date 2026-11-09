import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createInterviewService} from './interview-service.js';

async function browser(options){return (await import('./assets/demo/browser-interview.js')).createBrowserInterview(options);}
test('공개 체험은 서버 없이 기존 준비 대사와 같은 다회 면접을 끝까지 진행한다',async()=>{
 const transport=await browser(),service=createInterviewService();try{
  const config=await transport.request('config');assert.equal(config.aiAvailable,false);assert.equal(config.browserOnly,true);
  let a=await transport.request('sessions',{method:'POST',data:{mode:'demo'}}),b=service.create({mode:'demo'});
  const id=a.id,compare=()=>{for(const key of ['mode','phase','line','normalTurns','angryTurns','canBreak','canReply','history'])assert.deepEqual(a[key],b[key]);};compare();
  for(const [n,text]of ['회사 비전에 공감했어요.','고객을 응대했어요.'].entries()){a=await transport.request(`sessions/${id}/turn`,{method:'POST',data:{answer:text,requestId:`normal-${n}`}});b=await service.turn(b.id,text);compare();}
  const before=a.line;a=await transport.request(`sessions/${id}/break`,{method:'POST'});b=service.break(b.id);assert.equal(a.line,before);compare();
  for(const [n,text]of ['돈 벌려고요.','그럼 월급을 줘야죠.','제 말도 들어 주세요.','저도 제 생활이 있어요.'].entries()){a=await transport.request(`sessions/${id}/turn`,{method:'POST',data:{answer:text,requestId:`angry-${n}`}});b=await service.turn(b.id,text);compare();}
  assert.equal(a.phase,'done');await assert.rejects(transport.request(`sessions/${id}/turn`,{method:'POST',data:{answer:'더 답하기'}}),/끝/);
  assert.deepEqual(await transport.request(`sessions/${id}`,{method:'DELETE'}),{ended:true});
 }finally{service.dispose();}
});
test('공개 준비 대사는 잘못된 입력·조기 버튼·AI 요청을 조용히 허용하지 않는다',async()=>{
 const t=await browser();await assert.rejects(t.request('sessions',{method:'POST',data:{mode:'ai'}}),/준비|AI/);const s=await t.request('sessions',{method:'POST',data:{mode:'demo'}});
 await assert.rejects(t.request(`sessions/${s.id}/break`,{method:'POST'}),/두 번/);
 for(const answer of ['','가'.repeat(601)])await assert.rejects(t.request(`sessions/${s.id}/turn`,{method:'POST',data:{answer}}),/답변|600/);
 const data={answer:'경험을 쌓고 싶어요.',requestId:'request-1'},first=await t.request(`sessions/${s.id}/turn`,{method:'POST',data});assert.equal(first.normalTurns,1);assert.deepEqual(await t.request(`sessions/${s.id}/turn`,{method:'POST',data}),first);
 await assert.rejects(t.request(`sessions/${s.id}/turn`,{method:'POST',data:{...data,answer:'다른 내용'}}),/같은 요청/);
});
test('공개 대화는 페이지별로 격리되고 만료·취소를 지킨다',async()=>{
 let now=100;const a=await browser({now:()=>now}),b=await browser({now:()=>now});const s=await a.request('sessions',{method:'POST',data:{mode:'demo'}});
 await assert.rejects(b.request(`sessions/${s.id}/turn`,{method:'POST',data:{answer:'다른 탭'}}),/만료/);
 const abort=new AbortController();abort.abort();await assert.rejects(a.request(`sessions/${s.id}/turn`,{method:'POST',data:{answer:'취소'},signal:abort.signal}),e=>e.name==='AbortError');
 now+=21*60*1000;await assert.rejects(a.request(`sessions/${s.id}/turn`,{method:'POST',data:{answer:'늦은 답변'}}),/만료/);
});
test('배포 결과의 모든 진입점은 게임이며 실행 파일만 포함한다',async()=>{
 const {buildPublic}=await import('./scripts/build-public.mjs'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'interview-public-'));
 try{await buildPublic({outDir:dir,writeSourceEntries:false});
  for(const name of ['index.html','interview.html','local/index.html','local/room.html']){const html=await fs.readFile(path.join(dir,name),'utf8');assert.match(html,/data-experience="conversation"/);assert.match(html,/public-interview.js/);assert.doesNotMatch(html,/서버 오류 수정중입니다|OPENAI_API_KEY|\.env\.example/);}
  for(const name of ['.env','server.mjs','interview-service.js','HANDOFF.md','handoff','references','node_modules'])await assert.rejects(fs.stat(path.join(dir,name)),e=>e.code==='ENOENT');
  for(const name of ['scene.js','interview.js','local/stage.js','assets/demo/browser-interview.js','assets/demo/interview-model.js','assets/demo/public-interview.js','vendor/build/three.module.js','assets/fonts/interface.css','assets/characters/seated-human.json'])assert.ok((await fs.stat(path.join(dir,name))).isFile(),name);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('빌드 출력 경로를 잘못 지정해도 기존 파일을 지우지 않는다',async()=>{
 const {buildPublic}=await import('./scripts/build-public.mjs'),dir=await fs.mkdtemp(path.join(os.tmpdir(),'interview-protected-'));
 try{await fs.writeFile(path.join(dir,'keep.txt'),'보존');await assert.rejects(buildPublic({outDir:dir,writeSourceEntries:false}),/비어|전용/);assert.equal(await fs.readFile(path.join(dir,'keep.txt'),'utf8'),'보존');}finally{await fs.rm(dir,{recursive:true,force:true});}
});
