import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {dialogueFont,splitDialogue,makeDialogueCard,makeLetterBurst} from './game.js';

test('행복버튼 전 Pretendard, 전환 후와 종료 후에는 Original을 선택한다',()=>{
 assert.equal(dialogueFont({phase:'normal'}),'Pretendard');assert.equal(dialogueFont({phase:'angry',angryTurns:0}),'Bithumb Original');assert.equal(dialogueFont({phase:'done',afterBreak:true}),'Bithumb Original');assert.equal(dialogueFont({phase:'setup'}),'Pretendard');
});
test('대사를 마디로 나누되 문구나 이모지를 잘라 버리지 않는다',()=>{
 const text='돈을 벌고 싶다는 말씀은 알겠습니다. 그렇다면 이 회사에서 어떤 일을 하실 수 있나요? 🙂';const parts=splitDialogue(text);assert.ok(parts.length>2);assert.ok(parts.every(p=>Array.from(p).length<=18));assert.equal(parts.join('').replace(/\s/g,''),text.replace(/\s/g,''));
});
test('대사 글자는 실제 입체 장면에서 조준되고 파편은 같은 글자 텍스처를 쓴다',()=>{
 const noop=()=>{},canvas={getContext:()=>({measureText:t=>({width:t.length*60}),strokeText:noop,fillText:noop})};
 const card=makeDialogueCard('지원한 이유는 뭔가요?',{canvasFactory:()=>canvas}),scene=new THREE.Scene();scene.add(card);scene.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(card.position.x,card.position.y,5),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObjects([card])[0]?.object,card);
 const burst=makeLetterBurst(card);assert.equal(burst.mesh.material.map,card.material.map);assert.equal(burst.pieces.length,32);assert.ok(burst.mesh.geometry.attributes.position.array.every(Number.isFinite));assert.equal(burst.mesh.geometry.attributes.uv.count,burst.mesh.geometry.attributes.position.count);
});

test('최신 대사만 띄우고 실제 조준·파괴·일시정지·초기화가 이어진다',async()=>{
 const {initDialogueShooting}=await import('./game.js');
 const saved={document:globalThis.document,innerWidth:globalThis.innerWidth,matchMedia:globalThis.matchMedia,addEventListener:globalThis.addEventListener};
 const ids={},listeners={},noop=()=>{},context={measureText:t=>({width:t.length*60}),strokeText:noop,fillText:noop};
 class Element{
  constructor(){this.children=[];this.listeners={};this.style={};this.classList={add:noop,remove:noop,toggle:noop};this.clientWidth=1280;this.clientHeight=720;}
  set id(v){this._id=v;ids[v]=this;}get id(){return this._id;}
  setAttribute(){}append(e){this.children.push(e);}replaceChildren(...els){this.children=els;}addEventListener(k,fn){this.listeners[k]=fn;}getContext(){return context;}focus(){}
 }
 let resolveFont;const fontGate=new Promise(r=>resolveFont=r);globalThis.document={body:new Element(),fonts:{load:()=>fontGate},createElement:()=>new Element(),getElementById:id=>ids[id],addEventListener:(k,fn)=>listeners[k]=fn};globalThis.innerWidth=1280;globalThis.matchMedia=()=>({matches:false,addEventListener:noop});globalThis.addEventListener=noop;
 let rendered,camera;const renderer={autoClear:true,domElement:{getBoundingClientRect:()=>({left:0,top:0,width:1280,height:720})},clearDepth:noop,render(s,c){rendered=s;camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld();}},stage=new Element();
 try{
  const fx=initDialogueShooting({renderer,stage,invalidate:noop});fx.setState({phase:'angry',line:'이전 문장입니다.',afterBreak:true});fx.setState({phase:'angry',line:'최신 대사를 확인합니다. 계속 답해 보세요.',afterBreak:true});resolveFont([{}]);await new Promise(r=>setImmediate(r));fx.render();
  const cards=()=>rendered.children.filter(m=>m.name==='저격할 대사');assert.equal(cards().length,2);assert.ok(cards().every(c=>!c.userData.text.includes('이전')));
  const card=cards()[0],at=card.position.clone().project(camera),event={button:0,clientX:(at.x*.5+.5)*1280,clientY:(.5-at.y*.5)*720,preventDefault(){}};
  fx.setPaused(true);stage.listeners.pointerdown(event);assert.equal(cards().length,2);fx.setPaused(false);
  listeners.keydown({key:'1',target:{tagName:'TEXTAREA'},preventDefault:noop});assert.equal(cards().length,2);
  stage.listeners.pointerdown(event);assert.equal(cards().length,1);assert.equal(rendered.children.length,2,'파편은 하나의 메시로 묶여야 한다');assert.equal(renderer.autoClear,true);
  for(let t=0;t<1.5;t+=1/60)fx.update(t);assert.equal(rendered.children.length,1,'파편은 실제 시간 약1초 후 해제되어야 한다');
  fx.setState({phase:'setup',line:''});assert.equal(rendered.children.length,0);
  document.fonts.load=()=>Promise.reject(Error('font missing'));const failed=initDialogueShooting({renderer,stage:new Element(),invalidate:noop});await new Promise(r=>setImmediate(r));assert.equal(ids['dialogue-shot-note'].hidden,false);
  failed.setState({phase:'angry',line:'서체 실패 후에도 안내를 유지합니다.'});await new Promise(r=>setImmediate(r));assert.equal(ids['dialogue-shot-note'].hidden,false);assert.match(ids['dialogue-shot-note'].textContent,/서체/);
 }finally{Object.assign(globalThis,saved);}
});
