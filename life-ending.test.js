import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {LIFE_CHOICES} from './assets/demo/life-data.js';
import {createLifeScene,initLifeEnding} from './assets/demo/life-ending.js';

test('끝 장면의 창작 대사는 원 발언과 구분하며 다섯 출처를 추적할 수 있다',async()=>{
 const data=JSON.parse(await fs.readFile('handoff/data/b-social-20261109/통합수집.json'));
 assert.equal(LIFE_CHOICES.length,5);
 for(const choice of LIFE_CHOICES){const original=data.records.find(r=>r.id===choice.source.id);assert.equal(original.data_role,'direct_motivation');assert.equal(choice.source.url,original.source_url);assert.ok(original.original_excerpt.includes(choice.source.quote));assert.equal(choice.lineKind,'창작 대사');assert.notEqual(choice.line,choice.source.quote);}
 assert.ok(LIFE_CHOICES.some(c=>c.id==='career'));assert.match(LIFE_CHOICES.find(c=>c.id==='gift').source.note,/2013/);
});

test('다섯 끝 장면은 실제 Three 장면이며 전환 후 GPU 자원을 해제한다',()=>{
 for(const {id}of LIFE_CHOICES){const set=createLifeScene(id);set.update(10);set.scene.updateMatrixWorld(true);set.camera.updateMatrixWorld(true);let meshes=0,disposed=0;const materials=new Set();
  set.scene.traverse(o=>{if(!o.isMesh)return;meshes++;o.geometry.addEventListener('dispose',()=>disposed++);materials.add(o.material);for(const value of o.matrixWorld.elements)assert.ok(Number.isFinite(value));});
  assert.ok(meshes>15);assert.ok(meshes<140);let matDisposed=0;for(const m of materials)m.addEventListener('dispose',()=>matDisposed++);set.dispose();assert.equal(disposed,meshes);assert.equal(matDisposed,materials.size);
 }
});

// Minimal native-dialog harness: exercise lifecycle through public controls,
// without inventing WebGL/browser coverage.
function harness(){
 class Element{
  constructor(){this.children=[];this.listeners={};this.hidden=false;this.isConnected=true;this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c)};this.dataset={};}
  append(...children){this.children.push(...children);}setAttribute(k,v){this[k]=v;}
  set innerHTML(value){this.html=value;this.parts={};for(const key of ['.life-picker','.life-last','#life-last-line','.life-close','.life-return','.life-other','.life-choices','.life-source-list'])this.parts[key]=new Element();}
  querySelector(k){return this.parts[k];}addEventListener(k,fn){this.listeners[k]=fn;}
  showModal(){this.open=true;}close(){this.open=false;queueMicrotask(()=>this.listeners.close?.());}focus(){document.activeElement=this;}
 }
 const body=new Element(),start=new Element(),ui=new Element(),again=new Element(),focus=new Element(),events=[],renders=[];
 const doc={body,activeElement:focus,createElement:()=>new Element(),querySelector:()=>start,getElementById:id=>id==='local-ui'?ui:again,dispatchEvent:e=>events.push(e.type)};
 const renderer={autoClear:false,domElement:{getBoundingClientRect:()=>({width:1280,height:720})},render:(scene,camera)=>renders.push({scene,camera})};
 const old={document:globalThis.document,CustomEvent:globalThis.CustomEvent,matchMedia:globalThis.matchMedia};
 globalThis.document=doc;globalThis.CustomEvent=class{constructor(type){this.type=type;}};globalThis.matchMedia=()=>({matches:false});
 let blocked=false;
 const paused=[],api=initLifeEnding({renderer,invalidate(){},canPresent:()=>!blocked,onPause:v=>{paused.push(v);return v||!blocked;}}),dialog=body.children[0];
 return{api,dialog,start,ui,renderer,renders,paused,events,again,setBlocked(v){blocked=v;},restore(){Object.assign(globalThis,old);}};
}

test('미리보기·전체 면접 끝·일반 종료·초기화가 서로 상태를 오염시키지 않는다',async()=>{
 const h=harness();try{
  h.api.setState({phase:'done',angryTurns:0});await Promise.resolve();assert.equal(h.api.active,false,'일반 면접을 마치면 생활 결말을 강제하지 않음');
  h.api.setState({phase:'setup'});h.start.children[0].onclick();assert.equal(h.api.active,true);assert.equal(h.paused.at(-1),true);
  const choices=h.dialog.parts['.life-choices'].children;choices[0].onclick();assert.equal(h.api.exclusive,true);assert.equal(h.dialog.parts['#life-last-line'].textContent,'드디어 이거 보네.');
  h.api.update(1);h.api.render();assert.equal(h.renders.length,1);assert.equal(h.renderer.autoClear,false,'렌더러 설정 복원');
  h.dialog.parts['.life-other'].onclick();assert.equal(h.api.exclusive,false);choices[1].onclick();assert.equal(h.dialog.parts['#life-last-line'].textContent,LIFE_CHOICES.find(c=>c.id==='food').line);
  h.dialog.parts['.life-return'].onclick();await Promise.resolve();assert.equal(h.api.active,false);assert.equal(h.events.at(-1),'interview:resume');
  h.api.setState({phase:'normal'});h.api.setState({phase:'angry',angryTurns:0});h.api.setState({phase:'done',angryTurns:4});await Promise.resolve();assert.equal(h.api.exclusive,true,'고른 장면으로 전체 흐름 종료');
  h.api.setState({phase:'setup'});await Promise.resolve();assert.equal(h.api.active,false);assert.equal(h.api.exclusive,false);assert.equal(h.ui.children[0].hidden,true);
  h.api.setState({phase:'normal'});h.api.setState({phase:'angry'});h.api.setState({phase:'done',angryTurns:4});await Promise.resolve();assert.equal(h.api.active,true);assert.equal(h.api.exclusive,false,'다시 시작하면 예전 선택이 남지 않음');
  h.dialog.close();await Promise.resolve();assert.equal(document.activeElement,h.again);
 }finally{h.restore();}
});

test('공간·얼굴 편집 중 도착한 종료는 복귀까지 기다리고 다른 화면의 pause를 풀지 않는다',async()=>{
 const h=harness();try{
  h.api.setState({phase:'angry'});h.setBlocked(true);h.api.setState({phase:'done'});await Promise.resolve();assert.equal(h.api.active,false);
  h.api.resume();assert.equal(h.api.active,false);h.setBlocked(false);h.api.resume();assert.equal(h.api.active,true);
  h.setBlocked(true);const before=h.events.length;h.dialog.close();await Promise.resolve();assert.equal(h.events.length,before,'다른 화면이 차지한 pause는 유지');
 }finally{h.restore();}
});
