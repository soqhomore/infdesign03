import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const setup=async(reducedMotion=false)=>{const {createCameraDrama}=await import('./assets/demo/camera-drama.js');const camera=new THREE.PerspectiveCamera(47,16/9,.045,65);camera.position.set(0,1.25,3.42);camera.lookAt(0,1.1,0);return{camera,motion:createCameraDrama({camera,reducedMotion}),base:camera.position.clone(),rotation:camera.quaternion.clone()};};
const tick=(m,a,b)=>{let paints=0;for(let t=a;t<b;t+=1/60)if(m.update(t))paints++;return paints;};
test('행복 전에는 카메라를 바꾸지 않고 버튼의 유한 충격 후 기본 구도로 돌아온다',async()=>{
 const {motion:m,camera,base,rotation}=await setup();m.setState({phase:'normal'});assert.equal(tick(m,0,1),0);assert.ok(camera.position.equals(base));m.setState({phase:'angry',angryTurns:0});let max=0,maxFov=47;for(let t=1;t<3;t+=1/60){m.update(t);max=Math.max(max,camera.position.distanceTo(base));maxFov=Math.max(maxFov,camera.fov);}assert.ok(max>.065);assert.ok(maxFov>50);tick(m,3,4);assert.ok(camera.position.distanceTo(base)<1e-7);assert.ok(camera.quaternion.angleTo(rotation)<1e-7);assert.equal(camera.fov,47);assert.equal(tick(m,4,5),0);
});
test('실제 반박 응답부터 가까워지고 단계별 반응이 커지며 초기화는 정확히 복원한다',async()=>{
 const {motion:m,camera,base,rotation}=await setup();m.setState({phase:'angry',angryTurns:0});tick(m,0,2);m.setState({phase:'angry',angryTurns:1});tick(m,2,4);const first=camera.position.distanceTo(base);assert.ok(first>.02);m.setState({phase:'angry',angryTurns:4});tick(m,4,6);assert.ok(camera.position.distanceTo(base)>first*2);assert.ok(camera.fov<47);const settled=camera.position.clone();m.setState({phase:'angry',angryTurns:4});tick(m,6,8);assert.ok(camera.position.distanceTo(settled)<1e-8);m.setState({phase:'done',angryTurns:4});assert.ok(camera.position.equals(base));assert.ok(camera.quaternion.angleTo(rotation)<1e-7);assert.equal(camera.fov,47);
});
test('메뉴·편집은 원래 카메라로 멈추고 복귀 시 큰 시간 점프가 없다',async()=>{
 const {motion:m,camera,base}=await setup();m.setState({phase:'angry',angryTurns:0});tick(m,0,.25);m.update(.25,{paused:true});assert.ok(camera.position.equals(base));m.update(500,{paused:true});m.update(500.01);assert.ok(camera.position.distanceTo(base)<.25);m.suspend();assert.ok(camera.position.equals(base));m.setState({phase:'setup'});assert.equal(tick(m,501,502),0);
});
test('동작 줄이기는 카메라 충격·줌을 하지 않고 설정 변경 시 즉시 복원한다',async()=>{
 const {motion:m,camera,base}=await setup(true);m.setState({phase:'angry',angryTurns:4});assert.equal(tick(m,0,2),0);assert.ok(camera.position.equals(base));assert.equal(camera.fov,47);m.setReducedMotion(false);tick(m,2,3);m.setReducedMotion(true);assert.ok(camera.position.equals(base));assert.equal(camera.fov,47);
});
test('전환 중 빠르게 답해도 반박 클로즈업은 외침이 끝난 뒤 시작한다',async()=>{
 const {motion:m,camera}=await setup();m.setState({phase:'angry',angryTurns:0});tick(m,0,.15);m.setState({phase:'angry',angryTurns:1});tick(m,.15,1.42);assert.ok(camera.fov>=46.99);tick(m,1.42,2.5);assert.ok(camera.fov<46.8);
});
