import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

function people(){return [-1.81,0,1.81].map(x=>{const root=new THREE.Group(),headRoot=new THREE.Group();root.position.set(x,0,-.18);headRoot.position.set(0,1.15,.34);headRoot.scale.setScalar(1.1);root.add(headRoot);return{root,headRoot};});}
const target=new THREE.Vector3(0,1.25,3.42);
function tick(m,start,end){let changes=0;for(let t=start;t<end;t+=1/60)if(m.update(t))changes++;return changes;}

test('세 고개의 전방이 같은 지원자 눈 위치를 향한다',async()=>{
 const {createInterviewerMotion}=await import('./characters.js'),p=people();createInterviewerMotion(p,{target});
 for(const person of p){person.root.updateMatrixWorld(true);const eye=person.headRoot.localToWorld(new THREE.Vector3(0,.172,.040)),forward=new THREE.Vector3(0,0,1).transformDirection(person.headRoot.matrixWorld),toward=target.clone().sub(eye).normalize();assert.ok(forward.dot(toward)>.9999);}
 assert.ok(p[0].headRoot.rotation.y>.4);assert.ok(p[2].headRoot.rotation.y<-.4);
});

test('가끔 작은 동작만 하고 정지 구간과 서로 다른 타이밍을 유지한다',async()=>{
 const {createInterviewerMotion}=await import('./characters.js'),p=people(),m=createInterviewerMotion(p,{target}),q=p.map(v=>v.headRoot.quaternion.clone()),pos=p.map(v=>v.headRoot.position.clone());
 m.update(0);assert.equal(tick(m,1/60,.7),0);
 let moving=0,still=0,distinct=false,maxAngle=0,maxDisplacement=0;
 for(let t=.7;t<35;t+=1/60){const changed=m.update(t);changed?moving++:still++;const angles=p.map((v,i)=>q[i].angleTo(v.headRoot.quaternion));if(Math.max(...angles)>.01&&Math.min(...angles)<.00001)distinct=true;maxAngle=Math.max(maxAngle,...angles);maxDisplacement=Math.max(maxDisplacement,...p.map((v,i)=>pos[i].distanceTo(v.headRoot.position)));}
 assert.ok(moving>30);assert.ok(still>moving,'정지 프레임이 더 많아야 한다');assert.ok(distinct);assert.ok(maxAngle>.01&&maxAngle<.05);assert.ok(maxDisplacement<.003);
});

test('편집 일시정지·시간 간격 제한·reduced motion을 지키고 발끈 자세는 누적하지 않는다',async()=>{
 const {createInterviewerMotion}=await import('./characters.js'),p=people(),m=createInterviewerMotion(p,{target});
 tick(m,0,2);const q=p.map(v=>v.headRoot.quaternion.clone());m.update(200,{paused:true});m.update(210,{paused:true});assert.ok(p.every((v,i)=>v.headRoot.quaternion.angleTo(q[i])<1e-7));
 m.update(210.01);assert.ok(p.every((v,i)=>v.headRoot.quaternion.angleTo(q[i])<.005),'복귀 시 시간 점프 없이 이어져야 한다');
 m.setReducedMotion(true);assert.equal(tick(m,211,220),0);
 const before=p[1].headRoot.position.clone();m.setMood('offended');assert.ok(p[1].headRoot.position.z>before.z+.02);const angry=p[1].headRoot.position.clone();m.setMood('offended');assert.ok(p[1].headRoot.position.equals(angry));m.setMood('listening');assert.ok(p[1].headRoot.position.equals(before));
});
