import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {buildCharacter,createFaceController} from './characters.js';
import * as THREE from 'three';

async function setup(reducedMotion=false){
 const old=globalThis.document,noop=()=>{};globalThis.document={createElement:()=>({getContext:()=>({fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop})})};
 try{const data=JSON.parse(await fs.readFile('assets/characters/anatomy.json')),seated=JSON.parse(await fs.readFile('assets/characters/seated-human.json')),p=[0,1,2].map(i=>buildCharacter(data,i,seated));return{p,api:createFaceController(p,{reducedMotion})};}finally{globalThis.document=old;}
}
function tick(api,start,end){let changed=0;for(let t=start;t<end;t+=1/60)if(api.update(t))changed++;return changed;}

test('행복버튼 직후는 0단계이고 반박 응답마다 분노가 커진다',async()=>{
 const {stageAnger}=await import('./local/stage.js');
 assert.equal(stageAnger({phase:'angry',angryTurns:0}),0);
 assert.deepEqual([1,2,3,4,5].map(angryTurns=>stageAnger({phase:'angry',angryTurns})),[.25,.5,.75,1,1]);
 assert.equal(stageAnger({phase:'setup',angryTurns:4}),0);assert.equal(stageAnger({phase:'done',angryTurns:4}),1);
});

test('모든 가면은 점점 붉어지고 사진 shader도 열감을 받으며 초기화하면 복원된다',async()=>{
 const {p,api}=await setup(true),find=(person,name)=>{let result;person.headRoot.traverse(o=>{if(o.name===name)result=o;});return result;};
 api.setStyle(0,'capybara');const baseCapy=find(p[0],'카피바라 머리').material.color.clone(),baseBasic=find(p[1],'매끈한 가면').material.color.clone();
 api.setAnger(.25);tick(api,0,1);const mild=find(p[1],'매끈한 가면').material.color.clone();assert.ok(mild.g<baseBasic.g);
 api.setAnger(1);tick(api,1,2);const strong=find(p[1],'매끈한 가면').material.color;assert.ok(strong.g<mild.g);assert.ok(find(p[0],'카피바라 머리').material.color.g<baseCapy.g);
 const canvas={getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray([180,140,112,255])})})};api.replace(1,canvas);assert.equal(api.getStyle(1),'photo');assert.ok(p[1].uniforms.faceHeat.value>.9);
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};p[1].face.photoMesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.faceHeat,p[1].uniforms.faceHeat);assert.match(shader.fragmentShader,/faceHeat/);
 api.setAnger(0);assert.ok(find(p[1],'매끈한 가면').material.color.equals(baseBasic));assert.ok(find(p[0],'카피바라 머리').material.color.equals(baseCapy));assert.equal(p[1].uniforms.faceHeat.value,0);
});

test('분노 떨림은 단계에 따라 커지고 유한 burst 뒤 정지하며 동작 줄이기는 떨지 않는다',async()=>{
 async function sample(level,reducedMotion=false){
  const {p,api}=await setup(reducedMotion);api.update(0);api.setMood('offended');const base=p[1].headRoot.position.clone();api.setAnger(level);let max=0;
  for(let t=0;t<1.5;t+=1/60){api.update(t);max=Math.max(max,p[1].headRoot.position.distanceTo(base));}
  api.setReducedMotion(true);const frozen=p[1].headRoot.position.clone();tick(api,2,4);assert.ok(p[1].headRoot.position.equals(frozen));return max;
 }
 const mild=await sample(.25),strong=await sample(1),still=await sample(1,true);assert.ok(mild>0);assert.ok(strong>mild*1.5);assert.equal(still,0);
 const {p,api}=await setup(),reference=await setup();api.setMood('offended');reference.api.setMood('offended');api.setAnger(1);
 for(let t=0;t<4.5;t+=1/60){api.update(t);reference.api.update(t);}
 // Synchronize the two independently throttled paint clocks for comparison.
 api.update(4.55);reference.api.update(4.55);
 for(let i=0;i<3;i++){assert.ok(p[i].headRoot.position.distanceTo(reference.p[i].headRoot.position)<1e-6,'부들거림이 끝난 뒤 원래 소동작 위치로 돌아와야 한다');assert.ok(p[i].headRoot.quaternion.angleTo(reference.p[i].headRoot.quaternion)<1e-6);}
 api.setAnger(0);api.setReducedMotion(true);assert.equal(tick(api,5,10),0);
});

test('반박마다 상체가 앞으로 반응하되 다리와 착석 위치는 고정하고 끝나면 복원한다',async()=>{
 const {p,api}=await setup();assert.ok(p.every(person=>person.upperRoot),'세 인물의 상체 관절 그룹이 있어야 한다');
 const upper=p.map(person=>person.upperRoot.quaternion.clone()),legs=p.map(person=>person.root.children.filter(child=>child!==person.upperRoot).map(child=>child.matrix.clone()));
 api.update(0);api.setMood('offended');api.setAnger(1);let max=0;
 for(let t=0;t<1;t+=1/60){api.update(t);max=Math.max(max,p[1].upperRoot.quaternion.angleTo(upper[1]));}
 assert.ok(max>.06,'고개뿐 아니라 상체 전체가 보이는 크기로 반응해야 한다');
 tick(api,1,4.5);for(let i=0;i<3;i++){assert.ok(p[i].upperRoot.quaternion.angleTo(upper[i])<1e-7);const lower=p[i].root.children.filter(child=>child!==p[i].upperRoot);lower.forEach((child,n)=>{child.updateMatrix();assert.ok(child.matrix.equals(legs[i][n]));});}
});
test('격한 상체 반응이 손을 책상 상판 아래로 밀어 넣지 않는다',async()=>{
 const {p,api}=await setup(),points=[];
 for(const person of p){person.root.updateMatrixWorld(true);person.upperRoot.traverse(o=>{if(!o.isMesh||!/손|피부/.test(o.name))return;const pos=o.geometry.attributes.position;for(let i=0;i<pos.count;i++){const rest=new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);if(rest.y<.87&&rest.y>.76&&rest.z>.5)points.push({o,i,min:Math.min(rest.y,.776)-.003});}});}
 assert.ok(points.length>100);api.update(0);api.setMood('offended');api.setAnger(1);
 for(let t=0;t<.75;t+=1/60){api.update(t);p.forEach(person=>person.root.updateMatrixWorld(true));for(const point of points){const world=new THREE.Vector3().fromBufferAttribute(point.o.geometry.attributes.position,point.i).applyMatrix4(point.o.matrixWorld);assert.ok(world.y>=point.min,`${point.o.name}: 손이 상판 아래로 들어감`);}}
});

test('화면 충격은 모드 전환마다 한 번이고 다음 답변에는 분노만 쌓이며 다시 앉기는 복원한다',async()=>{
 const {initConversationStage}=await import('./local/stage.js'),{p,api}=await setup(true),oldDoc=globalThis.document,oldEvent=globalThis.CustomEvent;
 const ids={},listeners={},classes=new Set(),properties={},appended=[];let impacts=0;
 class Element{constructor(){this.children=[];this.props={};this.style={setProperty:(k,v)=>this.props[k]=v};this.classList={add(name){if(name==='fire')impacts++;},remove(){}};}append(o){this.children.push(o);}prepend(o){this.children.unshift(o);}setAttribute(){}}
 for(const id of ['local-ui','toolbar','local-room','local-faces'])ids[id]=new Element();
 globalThis.CustomEvent=class{constructor(type,{detail}={}){Object.assign(this,{type,detail});}};
 ids.happiness={getBoundingClientRect:()=>({left:0,top:0,width:0,height:0})};
 globalThis.document={getElementById:id=>ids[id],createElement:()=>new Element(),body:{append(o){appended.push(o);},style:{setProperty:(k,v)=>properties[k]=v},classList:{toggle(k,on){on?classes.add(k):classes.delete(k);}}},addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatchEvent(e){for(const fn of listeners[e.type]||[])fn(e);}};
 const dispatch=(phase,angryTurns=0,impact)=>document.dispatchEvent(new CustomEvent('interview:state',{detail:{phase,normalTurns:2,angryTurns,impact}}));
 try{
  const stage=initConversationStage({home(){},openFaces(){},invalidate(){}});stage.setCharacters(api);
  dispatch('normal');dispatch('angry',0,{x:1145,y:745,size:90});assert.equal(impacts,1);assert.ok(classes.has('happiness-impact'));assert.equal(p[1].uniforms.faceHeat.value,0);assert.equal(appended[0].props['--impact-x'],'1145px');assert.equal(appended[0].props['--impact-y'],'745px');
  dispatch('angry',1);dispatch('angry',2);assert.equal(impacts,1);assert.equal(properties['--anger-level'],'0.5');
  tick(api,0,1);assert.ok(p[1].uniforms.faceHeat.value>.4);dispatch('setup');assert.equal(p[1].uniforms.faceHeat.value,0);assert.equal(properties['--anger-level'],'0');assert.equal(classes.has('happiness-impact'),false);
  dispatch('normal');dispatch('angry');assert.equal(impacts,2);
 }finally{globalThis.document=oldDoc;globalThis.CustomEvent=oldEvent;}
});
