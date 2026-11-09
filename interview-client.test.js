import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createInterviewService } from './interview-service.js';

async function client({local=false,speech=false,voices,beforeTurn=async()=>{},journey}={}) {
 const service=createInterviewService();const html=await fs.readFile(new URL(local?'./local/room.html':'./references/app-templates/interview.html',import.meta.url),'utf8');
 class Element {
  constructor(){this.value='';this.textContent='';this.disabled=false;this.hidden=false;this.children=[];this.attributes={};this.listeners={};this.classes=new Set();this.classList={add:(c)=>this.classes.add(c),remove:(c)=>this.classes.delete(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  setAttribute(k,v){this.attributes[k]=v;} addEventListener(k,fn){this.listeners[k]=fn;} append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;} focus(){} requestSubmit(){return this.onsubmit({preventDefault(){}});}
  getBoundingClientRect(){return this.hidden?{left:0,top:0,width:0,height:0}:(this.rect||{left:0,top:0,width:90,height:90});}
 }
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 const events=[],listeners={},utterances=[],speechListeners={};const timers=new Map();let timerId=0;
 const synth={cancel(){},getVoices:()=>voices??(speech?[{lang:'ko-KR',name:'Yuna',localService:true}]:[]),speak(u){utterances.push(u);},addEventListener(type,fn){(speechListeners[type]??=new Set()).add(fn);},removeEventListener(type,fn){speechListeners[type]?.delete(fn);}};
 const document={body:new Element(),getElementById:id=>elements[id]??null,createElement:()=>new Element(),addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatchEvent(e){events.push(e);for(const fn of listeners[e.type]||[])fn(e);}};
 let mic;class SpeechRecognition{constructor(){mic=this;}start(){}abort(){}}
 const ctx={document,setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}},window:{__interviewJourney:journey,SpeechRecognition,speechSynthesis:synth},SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},AbortController,crypto:{randomUUID},addEventListener(){},fetch:async(url,init={})=>{
  const data=init.body?JSON.parse(init.body):{};let value;
  try {
   if(url.endsWith('/config'))value=service.config();
   else if(url.endsWith('/sessions'))value=service.create(data);
   else{const match=url.match(/sessions\/([^/]+)(?:\/(turn|break))?/);const [,id,action]=match;
    if(action==='turn')await beforeTurn();
    value=init.method==='DELETE'?service.end(id):action==='turn'?await service.turn(id,data.answer,data.requestId):service.break(id);}
   return new Response(JSON.stringify(value));
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:e.status||500});}
 }};
 vm.runInNewContext(await fs.readFile(new URL('./interview.js',import.meta.url),'utf8'),ctx);
 await new Promise(r=>setImmediate(r));
 return {e:elements,service,events,utterances,body:document.body,voicesChanged(){for(const fn of [...speechListeners.voiceschanged||[]])fn();},tick(){const batch=[...timers];for(const [id,fn]of batch){if(timers.delete(id))fn();}},pause(){document.dispatchEvent({type:'interview:pause'});},resume(){document.dispatchEvent({type:'interview:resume'});},get mic(){return mic;},async submit(text){elements.answer.value=text;elements.answer.oninput();await elements['answer-form'].requestSubmit();}};
}
test('음성 인식 후 키보드로 고치면 늦게 온 인식이 답변을 덮어쓰지 않는다',async()=>{
 const c=await client();try{
  await c.e['start-demo'].onclick();c.e.mic.onclick();const mic=c.mic;
  mic.onresult({results:[[{transcript:'잘못 들은 말'}]]});
  c.e.answer.value='내가 고친 답변';c.e.answer.oninput();
  mic.onresult({results:[[{transcript:'늦게 온 인식'}]]});
  assert.equal(c.e.answer.value,'내가 고친 답변');assert.equal(c.e.mic.attributes['aria-pressed'],'false');
 }finally{c.service.dispose();}
});
test('다회 면접 상태를 3D에 전달하고 버튼 직후와 다음 응답을 구별한다',async()=>{
 const c=await client();const state=()=>c.events.filter(e=>e.type==='interview:state').at(-1)?.detail;
 try{
  await c.e['start-demo'].onclick();assert.equal(state()?.phase,'normal');
  await c.submit('성장하려고요');await c.submit('고객 응대를 했어요');assert.equal(state().normalTurns,2);
  await c.e.happiness.onclick();assert.equal(state().phase,'angry');assert.equal(state().angryTurns,0);
  await c.submit('먹고살려고요');assert.equal(state().angryTurns,1);assert.equal('history' in state(),false);
  await c.e.end.onclick();assert.equal(state().phase,'done');await c.e.again.onclick();assert.equal(state().phase,'setup');
 }finally{c.service.dispose();}
});

test('행복버튼을 숨기기 전 위치를 충격 연출에 전달한다',async()=>{
 const c=await client({local:true});try{
  await c.e['start-demo'].onclick();await c.submit('성장하려고요');await c.submit('고객 응대 경험이 있어요');
  c.e.happiness.rect={left:1100,top:700,width:90,height:90};await c.e.happiness.onclick();
  assert.equal(c.e.happiness.hidden,true);const impact=c.events.filter(e=>e.type==='interview:state').at(-1).detail.impact;
  assert.ok(impact);assert.deepEqual(JSON.parse(JSON.stringify(impact)),{x:1145,y:745,size:90});
 }finally{c.service.dispose();}
});
test('이전 음성의 늦은 종료가 새 발언의 말하기 표시를 끄지 않는다',async()=>{
 const c=await client({speech:true});try{
  await c.e['start-demo'].onclick();const first=c.utterances.at(-1);first.onstart();
  await c.submit('비전에 공감했어요');const next=c.utterances.at(-1);next.onstart();first.onend();
  assert.equal(c.body.classes.has('speaking'),true);c.pause();assert.equal(c.body.classes.has('speaking'),false);
 }finally{c.service.dispose();}
});
test('공간 보기 중 도착한 답변은 복귀할 때 한 번 읽는다',async()=>{
 let release;const waiting=new Promise(resolve=>release=resolve);
 const c=await client({local:true,speech:true,beforeTurn:()=>waiting});try{
  await c.e['start-demo'].onclick();const spoken=c.utterances.length;
  const pending=c.submit('회사 비전에 공감했어요');c.pause();release();await pending;
  assert.equal(c.utterances.length,spoken);assert.equal(c.e.history.children.length,3);
  c.resume();assert.equal(c.utterances.length,spoken+1);assert.equal(c.utterances.at(-1).text,c.e.line.textContent);
  c.resume();assert.equal(c.utterances.length,spoken+1);
  await c.submit('고객을 응대했어요');assert.equal(c.utterances.length,spoken+2);
 }finally{c.service.dispose();}
});
test('문자로 여러 번 답하고 전환한 뒤 발끈 응답·종료·초기화한다',async()=>{
 const c=await client({local:true});try{
  await c.e['start-demo'].onclick();assert.equal(c.e.happiness.disabled,true);
  await c.submit('회사 비전에 공감합니다');await c.submit('고객 응대를 했습니다');assert.equal(c.e.happiness.disabled,false);
  await c.e.happiness.onclick();await c.submit('먹고살려고요');assert.match(c.e.line.textContent,/월급/);
  await c.e.end.onclick();assert.equal(c.e['finished'].hidden,false);await c.e.again.onclick();
  await c.e['start-demo'].onclick();assert.equal(c.e.history.children.length,1);assert.equal(c.e.answer.value,'');
 }finally{c.service.dispose();}
});

test('입장이 완료되기 전에는 면접 세션을 만들거나 대화를 시작하지 않는다',async()=>{
 let complete;const c=await client({journey:{enter:()=>new Promise(r=>complete=r)}});try{const pending=c.e['start-demo'].onclick();assert.equal(c.events.filter(e=>e.type==='interview:state').length,0);complete(true);await pending;assert.equal(c.events.filter(e=>e.type==='interview:state').at(-1).detail.phase,'normal');}finally{c.service.dispose();}
});
test('바람을 확정하지 않아 입장을 취소하면 세션 생성 없이 다시 선택한다',async()=>{
 const c=await client({journey:{enter:async()=>false}});try{await c.e['start-demo'].onclick();assert.equal(c.events.filter(e=>e.type==='interview:state').length,0);assert.equal(c.e['start-demo'].disabled,false);}finally{c.service.dispose();}
});

test('면접 시작 전 메뉴에서 종료를 시도해도 잘못된 세션을 만들지 않는다',async()=>{
 const c=await client();try{c.pause();assert.equal(c.e.end.disabled,true);await c.e.end.onclick();assert.equal(c.events.filter(e=>e.type==='interview:state').length,0);await c.e['start-demo'].onclick();assert.equal(c.events.filter(e=>e.type==='interview:state').at(-1).detail.phase,'normal');}finally{c.service.dispose();}
});

test('빈 voiceschanged 이벤트 뒤에 늦게 도착한 한국어 음성을 기다린다',async()=>{
 const voices=[],c=await client({voices});try{
  await c.e['start-demo'].onclick();c.voicesChanged();
  voices.push({lang:'ko-KR',name:'Yuna'});c.voicesChanged();
  assert.equal(c.utterances.length,1);assert.equal(c.utterances[0].voice.name,'Yuna');
 }finally{c.service.dispose();}
});
test('재생이 차단되면 이유를 표시하고 자동 재시도를 반복하지 않는다',async()=>{
 const c=await client({speech:true});try{
  await c.e['start-demo'].onclick();c.utterances[0].onerror({error:'not-allowed'});
  assert.match(c.e.status.textContent,/차단/);c.tick();assert.equal(c.utterances.length,1);
 }finally{c.service.dispose();}
});
test('일시정지에 끊긴 발언은 복귀 후 읽되 이미 끝난 발언은 반복하지 않는다',async()=>{
 const c=await client({speech:true});try{
  await c.e['start-demo'].onclick();c.utterances[0].onstart();c.pause();c.resume();
  assert.equal(c.utterances.length,2);c.utterances[1].onstart();c.utterances[1].onend();
  c.pause();c.resume();assert.equal(c.utterances.length,2);
 }finally{c.service.dispose();}
});
test('설정에서 목소리를 시험하고 복귀하면 면접관 대사를 이어 읽는다',async()=>{
 const c=await client({local:true,speech:true});try{
  await c.e['start-demo'].onclick();c.pause();c.e['voice-test'].onclick();
  assert.match(c.utterances.at(-1).text,/면접/);c.utterances.at(-1).onstart();
  assert.match(c.e['voice-status'].textContent,/Yuna/);c.resume();
  assert.equal(c.utterances.at(-1).text,c.e.line.textContent);
 }finally{c.service.dispose();}
});
test('음성 시작이 두 번 실패하면 안내하고 늦은 시작 이벤트를 무시한다',async()=>{
 const c=await client({local:true,speech:true});try{
  await c.e['start-demo'].onclick();c.tick();assert.equal(c.utterances.length,2);
  c.tick();assert.match(c.e['voice-status'].textContent,/시작되지/);
  c.utterances[1].onstart();assert.equal(c.body.classes.has('speaking'),false);
  c.tick();assert.equal(c.utterances.length,2);
 }finally{c.service.dispose();}
});
test('음성을 끄거나 초기화하면 기다리던 대사를 나중에 재생하지 않는다',async()=>{
 const voices=[],c=await client({local:true,voices});try{
  await c.e['start-demo'].onclick();c.pause();c.e.sound.onclick();c.resume();
  voices.push({lang:'ko-KR',name:'Yuna'});c.voicesChanged();c.tick();assert.equal(c.utterances.length,0);
  c.e.sound.onclick();c.pause();await c.e.again.onclick();c.resume();c.tick();assert.equal(c.utterances.length,1);
 }finally{c.service.dispose();}
});
test('목소리 시험이 성공하면 이전 음성 오류만 지우고 다른 입력 안내는 보존한다',async()=>{
 const c=await client({local:true,speech:true});try{
  await c.e['start-demo'].onclick();c.utterances[0].onerror({error:'not-allowed'});c.pause();
  c.e['voice-test'].onclick();c.utterances.at(-1).onstart();assert.doesNotMatch(c.e.status.textContent,/차단/);
  c.e.status.textContent='확인한 뒤 답하기를 눌러 주세요.';c.utterances.at(-1).onend();
  assert.equal(c.e.status.textContent,'확인한 뒤 답하기를 눌러 주세요.');
 }finally{c.service.dispose();}
});
