import { chromium } from '/Users/sqmr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const {createServer}=await import(path.join(root,'server.mjs'));
const {createInterviewService}=await import(path.join(root,'interview-service.js'));
const service=createInterviewService();const server=createServer({service});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
// Use the real app request handler with an in-memory transport: no local port binding.
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.hostname!=='127.0.0.1')return route.abort();
 const r=route.request(),req=Readable.from(r.postDataBuffer()?[r.postDataBuffer()]:[]);req.url=url.pathname;req.method=r.method();req.headers={...r.headers(),host:'127.0.0.1:4173'};
 const result=await new Promise(resolve=>{
  server.emit('request',req,{status:200,headers:{},writeHead(status,headers={}){this.status=status;this.headers=headers;},end(body){resolve({status:this.status,headers:this.headers,body:body||''});}});
 });
 await route.fulfill(result);
});
await page.goto('http://127.0.0.1:4173/interview.html');
await page.getByRole('button',{name:'로컬 대사 시험',exact:true}).click();
await page.getByRole('button',{name:'음성 켜짐'}).click();
for(const text of ['귀사의 비전에 공감했습니다.','고객 응대 프로젝트를 담당했습니다.']){
 await page.getByRole('textbox',{name:'내 답변'}).fill(text);await page.getByRole('button',{name:'답하기'}).click();await page.waitForFunction(()=>!document.querySelector('#answer').disabled);
}
await page.screenshot({path:path.join(root,'dialogue-normal.png')});
await page.getByRole('button',{name:'행복버튼',exact:true}).click();
await page.waitForFunction(()=>document.body.classList.contains('angry'));
await page.getByRole('textbox',{name:'내 답변'}).fill('먹고살려고 왔죠.');await page.getByRole('button',{name:'답하기'}).click();
await page.waitForFunction(()=>document.querySelector('#line').textContent.includes('월급'));
await page.screenshot({path:path.join(root,'dialogue-angry.png')});
for(let i=0;i<3;i++){
 await page.getByRole('textbox',{name:'내 답변'}).fill('회사도 제 말을 들어야 하는 것 아닌가요?');await page.getByRole('button',{name:'답하기'}).click();
 await page.waitForFunction(()=>!document.querySelector('#answer').disabled||!document.querySelector('#finished').hidden);
}
await page.getByRole('button',{name:'다시 시작'}).click();await page.getByRole('button',{name:'로컬 대사 시험',exact:true}).click();
const state=await page.evaluate(()=>({line:document.querySelector('#line').textContent,historyCount:document.querySelectorAll('#history li').length,happinessDisabled:document.querySelector('#happiness').disabled}));
if(state.historyCount!==1||!state.happinessDisabled)throw Error('초기화 실패');
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'dialogue-mobile.png')});
const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('모바일 가로 넘침');
console.log(JSON.stringify({errors,reset:state,mobileOverflow:overflow,transport:'실제 HTTP 처리기의 메모리 전송; 포트 서버 아님',microphone:'실제 음성 미검증',liveAI:'API 키 부재로 미검증'},null,2));
await browser.close();service.dispose();
if(errors.length)process.exitCode=1;
