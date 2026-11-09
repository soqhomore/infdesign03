import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from 'three';
import {buildCharacter} from './characters.js';

async function setup(){
 const noop=()=>{},original=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop})})};
 try{
  const data=JSON.parse(await fs.readFile('assets/characters/anatomy.json')),seated=JSON.parse(await fs.readFile('assets/characters/seated-human.json'));
  return [0,1,2].map(i=>buildCharacter(data,i,seated));
 }finally{globalThis.document=original;}
}

test('기본 가면·카피바라·내 사진을 전환해도 인물과 고개 자세는 유지한다',async()=>{
 const {createFaceController}=await import('./characters.js'),people=await setup();let changes=0;
 const api=createFaceController(people,{onChange:()=>changes++}),head=people[1].headRoot;
 assert.deepEqual(people.map((_,i)=>api.getStyle(i)),['basic','basic','basic']);
 head.rotation.x=.12;const before=head.position.clone();
 api.setStyle(1,'capybara');assert.equal(api.getStyle(1),'capybara');assert.equal(api.getStyle(0),'basic');
 assert.equal(people[1].headRoot,head);assert.equal(head.rotation.x,.12);assert.ok(head.position.equals(before));
 assert.throws(()=>api.setStyle(1,'photo'),/사진/);assert.equal(api.getStyle(1),'capybara');
 assert.throws(()=>api.setStyle(1,'invalid'));assert.equal(api.getStyle(1),'capybara');
 const canvas={getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray([180,130,100,255])})})};
 api.replace(1,canvas);assert.equal(api.getStyle(1),'photo');assert.equal(api.hasPhoto(1),true);
 const texture=people[1].uniforms.faceMap.value;let disposed=0;texture.addEventListener('dispose',()=>disposed++);
 api.setStyle(1,'basic');api.setStyle(1,'photo');assert.equal(people[1].uniforms.faceMap.value,texture);assert.equal(disposed,0);
 api.restore(1);assert.equal(api.getStyle(1),'basic');assert.equal(api.hasPhoto(1),false);assert.equal(disposed,1);assert.ok(changes>=5);
});

test('마스크는 입체이며 사진이 뒤에 비치지 않고 감정은 버튼 다음 발언부터 바뀐다',async()=>{
 const people=await setup();
 for(const p of people){
  assert.equal(typeof p.face.setMood,'function');
  const names=[];p.headRoot.traverse(o=>names.push(o.name));assert.ok(!names.includes('합친 입체 모발'));
  p.face.setStyle('basic');p.headRoot.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(p.headRoot);assert.ok(box.max.z-box.min.z>.1);
  const brows=p.face.brows;assert.equal(brows[0].rotation.z,0);
  p.face.setMood('offended');assert.ok(Math.abs(brows[0].rotation.z)>.2);
  p.face.setStyle('capybara');assert.ok(p.face.views.capybara.visible);assert.equal(p.face.views.basic.visible,false);
  p.face.setMood('listening');assert.equal(brows[0].rotation.z,0);
  const geo=p.face.photoMesh.geometry;assert.equal(geo.type,'PlaneGeometry');assert.equal(geo.attributes.position.count,4);assert.equal(p.face.photoMesh.material.side,THREE.FrontSide);

 }
});

test('사진 전체 UV와 가로세로 비율을 유지하며 네모 판 중심이 움직이지 않는다',async()=>{
 const {createFaceController}=await import('./characters.js'),people=await setup(),api=createFaceController(people);
 for(const index of [0,1,2])for(const [width,height]of [[800,400],[200,800]]){api.replace(index,{width,height});const mesh=people[index].face.photoMesh;assert.equal(mesh.material.color.getHex(),0xffffff);mesh.updateMatrix();const bounds=new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).applyMatrix4(mesh.matrix),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());people[index].root.updateMatrixWorld(true);const sx=new THREE.Vector3().setFromMatrixColumn(mesh.matrixWorld,0).length(),sy=new THREE.Vector3().setFromMatrixColumn(mesh.matrixWorld,1).length();assert.ok(Math.abs(sx/sy-width/height)<.00001);assert.ok(Math.abs(center.y-.157)<.00001);assert.equal(mesh.material.map.image.width,width);}
});
