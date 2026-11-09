import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createInterviewService } from './interview-service.js';

async function client() {
 const service=createInterviewService();const html=await fs.readFile(new URL('./references/app-templates/interview.html',import.meta.url),'utf8');
 class Element {
  constructor(){this.value='';this.textContent='';this.disabled=false;this.hidden=false;this.children=[];this.attributes={};this.listeners={};this.classes=new Set();this.classList={add:(c)=>this.classes.add(c),remove:(c)=>this.classes.delete(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
  setAttribute(k,v){this.attributes[k]=v;} addEventListener(k,fn){this.listeners[k]=fn;} append(...nodes){this.children.push(...nodes);} replaceChildren(...nodes){this.children=nodes;} focus(){} requestSubmit(){return this.onsubmit({preventDefault(){}});}
 }
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 const document={body:new Element(),getElementById:id=>{assert(elements[id],id);return elements[id];},createElement:()=>new Element(),addEventListener(){}};
 let mic;class SpeechRecognition{constructor(){mic=this;}start(){}abort(){}}
 const ctx={document,window:{SpeechRecognition,speechSynthesis:{cancel(){},getVoices:()=>[]}},SpeechSynthesisUtterance:class{},AbortController,crypto:{randomUUID},addEventListener(){},fetch:async(url,init={})=>{
  const data=init.body?JSON.parse(init.body):{};let value;
  try {
   if(url.endsWith('/config'))value=service.config();
   else if(url.endsWith('/sessions'))value=service.create(data);
   else{const match=url.match(/sessions\/([^/]+)(?:\/(turn|break))?/);const [,id,action]=match;
    value=init.method==='DELETE'?service.end(id):action==='turn'?await service.turn(id,data.answer,data.requestId):service.break(id);}
   return new Response(JSON.stringify(value));
  }catch(e){return new Response(JSON.stringify({error:e.message}),{status:e.status||500});}
 }};
 vm.runInNewContext(await fs.readFile(new URL('./interview.js',import.meta.url),'utf8'),ctx);
 await new Promise(r=>setImmediate(r));
 return {e:elements,service,get mic(){return mic;},async submit(text){elements.answer.value=text;elements.answer.oninput();await elements['answer-form'].requestSubmit();}};
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
test('문자로 여러 번 답하고 전환한 뒤 발끈 응답·종료·초기화한다',async()=>{
 const c=await client();try{
  await c.e['start-demo'].onclick();assert.equal(c.e.happiness.disabled,true);
  await c.submit('회사 비전에 공감합니다');await c.submit('고객 응대를 했습니다');assert.equal(c.e.happiness.disabled,false);
  await c.e.happiness.onclick();await c.submit('먹고살려고요');assert.match(c.e.line.textContent,/월급/);
  await c.e.end.onclick();assert.equal(c.e['finished'].hidden,false);await c.e.again.onclick();
  await c.e['start-demo'].onclick();assert.equal(c.e.history.children.length,1);assert.equal(c.e.answer.value,'');
 }finally{c.service.dispose();}
});
