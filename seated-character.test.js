import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('전체 인체 원본으로 착석한 피부·정장·바지·구두를 만든다',async()=>{
 const {buildSeatedHuman}=await import('./scripts/seated-human.mjs');
 const asset=buildSeatedHuman(await fs.readFile('references/character-source/makehuman-base.obj','utf8'));
 for(const name of ['skin','jacket','shirt','trousers','shoes']){
  const p=asset.parts[name];assert.ok(p.indices.length>30,name);assert.equal(p.positions.length,p.sourceVertices.length*3);assert.ok(p.positions.every(Number.isFinite));assert.ok(p.indices.every(i=>Number.isInteger(i)&&i>=0&&i<p.sourceVertices.length));
 }
 const all=Object.values(asset.parts).flatMap(p=>p.positions),ys=all.filter((_,i)=>i%3===1);
 assert.ok(Math.min(...ys)>=-.01);assert.ok(Math.max(...ys)<1.2);
 for(const p of Object.values(asset.landmarks)){assert.ok(p.every(Number.isFinite));}
 assert.ok(asset.landmarks.leftWrist[1]>.79&&asset.landmarks.leftWrist[1]<.84);
 assert.ok(asset.landmarks.leftKnee[2]>.45);
 assert.ok(asset.metadata.sourceBodyVertices>10000);
 assert.equal(asset.metadata.downloadRequired,false);
 // Count spatial edges across materials: a garment cuff must not leave an open
 // ring where its expanded fabric meets the unexpanded hand surface.
 const common=new Set(asset.parts.skin.sourceVertices.filter(id=>asset.parts.shirt.sourceVertices.includes(id))),edges=new Map();
 for(const part of Object.values(asset.parts))for(let i=0;i<part.indices.length;i+=3)for(let j=0;j<3;j++){
  const a=part.indices[i+j],b=part.indices[i+(j+1)%3];if(!common.has(part.sourceVertices[a])||!common.has(part.sourceVertices[b]))continue;
  const point=id=>part.positions.slice(id*3,id*3+3).map(n=>n.toFixed(6)).join(','),key=[point(a),point(b)].sort().join('|');edges.set(key,(edges.get(key)||0)+1);
 }
 assert.ok(common.size>20);assert.equal([...edges.values()].filter(n=>n===1).length,0,'소맷단과 피부 사이에 열린 가장자리가 없어야 한다');
 const THREE=await import('three'),material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const mesh=(shape,name)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(shape.positions,3));g.setIndex(shape.indices);const m=new THREE.Mesh(g,material);m.name=name;return m;};
 const surfaces=[mesh(asset.parts.jacket,'body'),mesh(asset.parts.skin,'body'),...Object.entries(asset.details).map(([name,shape])=>mesh(shape,name))],ray=new THREE.Raycaster();
 try{
  for(const [x,y] of [[-.0137083,1.1175],[.0323281,1.120625],[-.0323281,1.120625],[-.0449115,1.12375],[.0326849,1.1215625],[-.0326849,1.1215625]]){
   ray.set(new THREE.Vector3(x,y,1.5),new THREE.Vector3(0,0,-1));const hit=ray.intersectObjects(surfaces,false)[0];
   assert.ok(hit);assert.notEqual(hit.object.name,'body','목 근처 패널 내부를 몸체가 뚫고 나오면 안 된다');
  }
 }finally{surfaces.forEach(m=>m.geometry.dispose());material.dispose();}
});

test('가운데 인물은 인체 기반 몸체와 의상 전용 재질을 실제 사용한다',async()=>{
 const {buildCharacter}=await import('./characters.js');const {Raycaster,Vector3}=await import('three');
 const data=JSON.parse(await fs.readFile('assets/characters/anatomy.json','utf8')),asset=JSON.parse(await fs.readFile('assets/characters/seated-human.json','utf8'));
 const original=globalThis.document,noop=()=>{};globalThis.document={createElement:()=>({getContext:()=>({fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop})})};
 try{
  const p=buildCharacter(data,1,asset);assert.equal(p.root.userData.construction,'local-full-human');assert.equal(p.garmentUniforms,null);assert.ok(p.headRoot.parent===p.upperRoot);
  let legacy=false;p.root.traverse(o=>{if(o.name==='구부린 재킷 소매')legacy=true;});assert.equal(legacy,false);
  p.root.updateMatrixWorld(true);
  const ray=new Raycaster(new Vector3(0,1.0,2),new Vector3(0,0,-1));assert.ok(ray.intersectObject(p.root,true).length>0,'정면 가슴에 비어 있는 구멍이 없어야 한다');
  ray.set(new Vector3(2,1.0,.12),new Vector3(-1,0,0));assert.ok(ray.intersectObject(p.root,true).length>0,'옆에서도 몸통 부피가 있어야 한다');
 }finally{globalThis.document=original;}
});
