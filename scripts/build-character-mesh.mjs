import fs from 'node:fs/promises';
import * as THREE from '../vendor/build/three.module.js';

// MakeHuman hm08 base is explicitly CC0; retain its untouched OBJ in references.
const source=await fs.readFile(new URL('../references/character-source/makehuman-base.obj',import.meta.url),'utf8');
const vertices=[],faces=[];let group='';
for(const line of source.split('\n')){
 if(line.startsWith('v '))vertices.push(line.split(/\s+/).slice(1).map(Number));
 if(line.startsWith('g '))group=line.slice(2);
 if(line.startsWith('f ')&&group==='body')faces.push(line.split(/\s+/).slice(1).map(s=>Number(s.split('/')[0])-1));
}
function extract(accept,transform){
 const positions=[],indices=[],lookup=new Map();
 for(const face of faces.filter(f=>f.every(i=>accept(vertices[i])))){
  const ids=face.map(id=>{if(!lookup.has(id)){lookup.set(id,positions.length/3);positions.push(...transform(vertices[id]).map(n=>Math.round(n*1e6)/1e6));}return lookup.get(id);});
  for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);
 }
 return {positions,indices};
}
const wrist=new THREE.Vector3(4.31185,2.4518,1.75655);
const direction=new THREE.Vector3(.3,-.58,.73).normalize();
const q=new THREE.Quaternion().setFromUnitVectors(direction,new THREE.Vector3(0,0,1));
const head=extract(v=>v[1]>5.7,v=>[v[0]*.1,(v[1]-6)*.1,(v[2]-.2)*.1]);
const hand=extract(v=>v[0]>3.8&&new THREE.Vector3(...v).sub(wrist).dot(direction)>-.1,v=>new THREE.Vector3(...v).sub(wrist).applyQuaternion(q).multiplyScalar(.1).toArray());
// Align the broad palm plane horizontally for hands resting on a desk.
let xx=0,xy=0,yy=0;for(let i=0;i<hand.positions.length;i+=3){xx+=hand.positions[i]**2;xy+=hand.positions[i]*hand.positions[i+1];yy+=hand.positions[i+1]**2;}
const angle=-.5*Math.atan2(2*xy,xx-yy),cos=Math.cos(angle),sin=Math.sin(angle);
for(let i=0;i<hand.positions.length;i+=3){const x=hand.positions[i],y=hand.positions[i+1];hand.positions[i]=Math.round((cos*x-sin*y)*1e6)/1e6;hand.positions[i+1]=Math.round((sin*x+cos*y)*1e6)/1e6;}
await fs.mkdir(new URL('../assets/characters/',import.meta.url),{recursive:true});
await fs.writeFile(new URL('../assets/characters/anatomy.json',import.meta.url),JSON.stringify({source:'MakeHuman hm08 base.obj, CC0',head,hand}));
await fs.copyFile(new URL('../references/visual-targets/generated-room-target-v1.png',import.meta.url),new URL('../assets/characters/reference.png',import.meta.url));
console.log(`head ${head.positions.length/3} vertices, hand ${hand.positions.length/3} vertices`);
