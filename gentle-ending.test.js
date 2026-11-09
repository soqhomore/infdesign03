import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createRainBedroom} from './assets/demo/rain-bedroom.js';
test('현재 엔딩에는 빗줄기·젖은 유리와 빗소리 재생 연결이 없다',async()=>{const set=createRainBedroom();try{assert.equal(set.scene.getObjectByName('창밖의 비와 유리창 물방울'),undefined);}finally{set.dispose();}const source=await fs.readFile('assets/demo/journey.js','utf8');assert.ok(!source.includes('createRainSound'));assert.ok(!source.includes('rainSound.'));});
test('검정 로딩 화면은 사용자가 지정한 질문으로 시작한다',async()=>{const html=await fs.readFile('local/room.html','utf8');assert.match(html,/당신은 왜 일하고 싶으신가요\?\s*(?:<[^>]+>)*생각해 봐요\./);const css=await fs.readFile('local/conversation.css','utf8');assert.match(css,/#loading\{background:#000/);});

import {openingRemaining} from './assets/demo/opening.js';
test('로딩이 빨라도 질문을 3.5초 보여주되 준비가 늦으면 추가 대기하지 않는다',()=>{assert.equal(openingRemaining(100,200),3400);assert.equal(openingRemaining(100,5000),0);});
