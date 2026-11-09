import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('사진 형식과 파일·해상도 상한으로 해독 비용을 제한한다',async()=>{
 const {validatePhoto,validateDimensions}=await import('./face-photo.js');
 assert.doesNotThrow(()=>validatePhoto({type:'image/jpeg',size:500000}));
 assert.throws(()=>validatePhoto({type:'image/svg+xml',size:1000}),/JPG/);
 assert.throws(()=>validatePhoto({type:'image/png',size:13*1024*1024}),/12MB/);
 assert.throws(()=>validateDimensions(16000,16000),/해상도/);
 assert.throws(()=>validateDimensions(0,400),/해상도/);
});

test('양 눈을 찍으면 기울어진 사진도 기준 눈 위치에 정확히 맞춘다',async()=>{
 const {photoTransform,transformPoint,FACE_EYES}=await import('./face-photo.js');
 const eyes=[{x:150,y:100},{x:350,y:140}];
 const m=photoTransform(eyes,{});
 eyes.forEach((p,i)=>{const q=transformPoint(m,p);assert.ok(Math.abs(q.x-FACE_EYES[i].x)<1e-8);assert.ok(Math.abs(q.y-FACE_EYES[i].y)<1e-8);});
 assert.throws(()=>photoTransform([{x:1,y:1},{x:1,y:1}],{}),/눈/);
 const shifted=photoTransform(eyes,{x:20,y:-10,zoom:1,rotation:0});
 const p=transformPoint(shifted,eyes[0]);assert.ok(Math.abs(p.x-FACE_EYES[0].x-20)<1e-8);
});
test('얼굴 경계 피부색은 흰 배경과 투명 픽셀을 제외해 고른다',async()=>{
 const {skinColorFromSamples}=await import('./face-photo.js');
 const color=skinColorFromSamples(new Uint8ClampedArray([255,255,255,255,180,130,100,255,182,132,102,255,0,0,0,0,178,128,98,255]));
 assert.equal(color,'#b48264');assert.equal(skinColorFromSamples(new Uint8ClampedArray([255,255,255,255,0,0,0,0])),null);
});

test('실제 해부학적 머리·손 자산에 유효한 삼각형과 눈 기준이 있다',async()=>{
 const d=JSON.parse(await readFile('assets/characters/anatomy.json','utf8'));
 assert.ok(d.head.positions.length>6000);assert.ok(d.hand.positions.length>900);
 for(const part of [d.head,d.hand]){assert.equal(part.positions.length%3,0);assert.equal(part.indices.length%3,0);assert.ok(part.positions.every(Number.isFinite));assert.ok(part.indices.every(i=>Number.isInteger(i)&&i>=0&&i<part.positions.length/3));}
 const ys=d.head.positions.filter((_,i)=>i%3===1);assert.ok(Math.max(...ys)>.24&&Math.min(...ys)<.01);
});

test('세 인물은 착석 몸체와 입체 가면을 유지하며 사진은 앞면에만 투영된다',async()=>{
 const {buildCharacter}=await import('./characters.js');
 const {Box3}=await import('three');
 const original=globalThis.document,noop=()=>{};
 globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>({fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop})})};
 try{
  const data=JSON.parse(await readFile('assets/characters/anatomy.json','utf8'));
  const people=[0,1,2].map(i=>buildCharacter(data,i));
  for(const p of people){
   assert.ok(p.headRoot.parent===p.upperRoot);p.root.updateMatrixWorld(true);
   const box=new Box3().setFromObject(p.root);assert.ok(box.max.y>1.38&&box.max.y<1.5);assert.ok(box.min.y<.06);
   const head=p.face.photoMesh;let draws=0;p.root.traverse(o=>{if(!o.isMesh)return;draws+=Array.isArray(o.material)?o.geometry.groups.length:1;});assert.ok(draws<100,'인물 하나가 100회 이상 그려지지 않아야 한다');
   const pos=head.geometry.attributes.position,uv=head.geometry.attributes.uv;
   assert.equal(pos.count,4);for(let i=0;i<pos.count;i++)assert.ok(Math.abs(pos.getZ(i)-.13)<.0001);
   assert.deepEqual([Math.min(...uv.array),Math.max(...uv.array)],[0,1]);

  }
  assert.notEqual(people[0].uniforms,people[1].uniforms,'사진 교체 상태는 인물별로 독립적이어야 한다');
 }finally{globalThis.document=original;}
});

test('음수 위치의 면접관도 유효한 좌표 뺄셈으로 의상 셰이더를 만든다',async()=>{
 const {buildCharacter}=await import('./characters.js');
 const original=globalThis.document,noop=()=>{};
 globalThis.document={createElement:()=>({getContext:()=>({fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop})})};
 try{
  const data=JSON.parse(await readFile('assets/characters/anatomy.json','utf8'));
  for(let i=0;i<3;i++){
   const p=buildCharacter(data,i);let torso;p.root.traverse(o=>{if(o.name==='양복 몸판과 안쪽 셔츠')torso=o;});
   const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <color_fragment>'};torso.material[0].onBeforeCompile(shader);
   assert.doesNotMatch(shader.fragmentShader,/\.x--[\d.]/);assert.doesNotMatch(shader.fragmentShader,/\.x-\+[\d.]/);
  }
 }finally{globalThis.document=original;}
});
