import test from 'node:test';import assert from 'node:assert/strict';import {createDuvetGeometry} from './assets/demo/bedding.js';import {createRainBedroom} from './assets/demo/rain-bedroom.js';
test('이불은 얇은 평면 여러 장 대신 두께가 있고 가장자리가 내려오는 닫힌 한 덩어리다',()=>{const g=createDuvetGeometry(),p=g.attributes.position;assert.ok(g.index);for(let i=0;i<p.count;i++)for(const n of [p.getX(i),p.getY(i),p.getZ(i)])assert.ok(Number.isFinite(n));assert.ok(g.boundingBox.min.y>.15);assert.ok(g.boundingBox.max.y<.56);const width=g.boundingBox.max.x-g.boundingBox.min.x;assert.ok(width<1.45);const edges=new Map();for(let i=0;i<g.index.count;i+=3){const t=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)];for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}}assert.ok([...edges.values()].every(n=>n===2));g.dispose();});
test('엔딩 방에는 햇빛과 한 장의 입체 이불이 있다',()=>{const set=createRainBedroom();try{assert.ok(set.scene.getObjectByName('창으로 들어오는 햇빛'));const duvet=set.scene.getObjectByName('부드러운 입체 이불');assert.ok(duvet);assert.ok(duvet.material.bumpMap);}finally{set.dispose();}});
test('침대의 네 다리가 바닥과 프레임을 잇고 창밖에는 맑은 하늘의 깊이가 있다',()=>{
 const set=createRainBedroom();try{
  const legs=[];set.scene.traverse(o=>{if(o.name==='침대 받침 다리')legs.push(o);});assert.equal(legs.length,4);
  for(const leg of legs){leg.geometry.computeBoundingBox();const b=leg.geometry.boundingBox.clone().translate(leg.position);assert.ok(b.min.y<=-.009);assert.ok(b.max.y>=.031);}
  const sky=set.scene.getObjectByName('창밖의 맑은 하늘');assert.ok(sky);assert.equal(sky.castShadow,false);assert.equal(sky.userData.skipAO,true);
  const rug=set.scene.getObjectByName('침대 아래 낮은 직물 러그');assert.ok(rug);assert.equal(rug.receiveShadow,true);
 }finally{set.dispose();}
});
