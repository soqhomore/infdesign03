import test from 'node:test';import assert from 'node:assert/strict';
import {entryTransition as next} from './assets/demo/entry-flow.js';
test('읽기는 시간 제한이 없고 확정 후 호명해도 직접 문을 열기 전에는 입장하지 않는다',()=>{assert.equal(next('before',1000),'before');assert.equal(next('settling',.9),'settling');assert.equal(next('settling',1),'waiting');assert.equal(next('waiting',1.5),'called');assert.equal(next('called',1000),'called');assert.equal(next('enter',3),'seating');assert.equal(next('seating',.9),'seating');assert.equal(next('seating',1),'interview');});
test('동작 줄이기는 이동만 짧게 하고 호명·착석 정적을 유지한다',()=>{assert.equal(next('enter',.35,{reduced:true}),'seating');assert.equal(next('waiting',.3,{reduced:true}),'waiting');});

import fs from 'node:fs/promises';
test('호명·문 열기 조작은 읽기 화면이 숨겨져도 접근할 수 있는 형제 영역이다',async()=>{
 const source=await fs.readFile('assets/demo/journey.js','utf8'),html=source.match(/root.innerHTML=`([\s\S]*?)`;document.body/)[1],stack=[];let ancestors;
 for(const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi)){const [,close,tag,attrs]=m;if(close){while(stack.length){if(stack.pop().tag===tag)break;}continue;}const id=attrs.match(/id="([^"]+)"/)?.[1];if(id==='door-invitation')ancestors=stack.map(o=>o.id);if(!['input','br','hr','img','meta','link'].includes(tag))stack.push({tag,id});}
 assert.ok(ancestors);assert.ok(!ancestors.includes('before'));
});
