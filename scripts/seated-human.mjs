import * as THREE from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a.clone().lerp(b,t);
const scale=.11;

function parse(source){
 const vertices=[],uv=[],faces=[],groups={};let group='';
 for(const line of source.split('\n')){
  const s=line.trim().split(/\s+/);
  if(s[0]==='v')vertices.push(V(...s.slice(1).map(Number)).multiplyScalar(scale));
  if(s[0]==='vt')uv.push(s.slice(1,3).map(Number));
  if(s[0]==='g')group=s.slice(1).join(' ');
  if(s[0]==='f'){
   const face=s.slice(1).map(v=>{const [p,t]=v.split('/').map(Number);return {p:p-1,t:t-1};});
   if(group==='body')faces.push(face);
   if(group.startsWith('joint-')){groups[group]??=new Set();face.forEach(v=>groups[group].add(v.p));}
  }
 }
 const joint=name=>{const ids=groups['joint-'+name];if(!ids)throw Error('Missing anatomical joint '+name);return [...ids].reduce((sum,id)=>sum.add(vertices[id]),V(0,0,0)).divideScalar(ids.size);};
 return {vertices,uv,faces,joint};
}
function transform(a,b,A,B){
 const q=new THREE.Quaternion().setFromUnitVectors(b.clone().sub(a).normalize(),B.clone().sub(A).normalize());
 return p=>p.clone().sub(a).applyQuaternion(q).add(A);
}
function bendElbow(S,W,upper,lower,sign){
 const direction=W.clone().sub(S),distance=direction.length();direction.normalize();
 if(distance>=upper+lower)throw Error('Wrist is out of anatomical reach');
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const preferred=V(sign,-.25,-.1);preferred.addScaledVector(direction,-preferred.dot(direction)).normalize();
 return S.clone().addScaledVector(direction,along).addScaledVector(preferred,height);
}

export function buildSeatedHuman(source){
 const {vertices,uv,faces,joint}=parse(source),pelvis=joint('pelvis');
 const torso=p=>V(p.x*1.04,.56+(p.y-pelvis.y)*1.05,.10+(p.z-pelvis.z)+.46*(p.y-pelvis.y));
 const limbs={};
 for(const [side,sign] of [['l',1],['r',-1]]){
  const S=joint(side+'-shoulder'),E=joint(side+'-elbow'),W=joint(side+'-hand'),F=joint(side+'-finger-3-3');
  const A=torso(S),C=V(sign*.17,.814,.69),B=bendElbow(A,C,S.distanceTo(E),E.distanceTo(W),sign);
  const long=F.clone().sub(W).normalize(),flatten=new THREE.Quaternion().setFromUnitVectors(long,V(0,0,1));
  let xx=0,xy=0,yy=0;
  for(const p of vertices){if(p.x*sign<.43||p.clone().sub(W).dot(long)<-.02)continue;const q=p.clone().sub(W).applyQuaternion(flatten);xx+=q.x*q.x;xy+=q.x*q.y;yy+=q.y*q.y;}
  const roll=new THREE.Quaternion().setFromAxisAngle(V(0,0,1),-.5*Math.atan2(2*xy,xx-yy));
  const aim=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),V(-sign*.08,-.025,1).normalize());
  const handQ=aim.multiply(roll).multiply(flatten);
  const hand=p=>p.clone().sub(W).applyQuaternion(handQ).add(C);
  const H=joint(side+'-upper-leg'),K=joint(side+'-knee'),N=joint(side+'-ankle');
  const hip=torso(H),knee=V(sign*.15,.505,.55),ankle=V(sign*.16,.086,.60);
  limbs[side]={sign,S,E,W,F,A,B,C,H,K,N,hip,knee,ankle,long,
   upper:transform(S,E,A,B),forearm:transform(E,W,B,C),hand,
   thigh:transform(H,K,hip,knee),shin:transform(K,N,knee,ankle),foot:p=>p.clone().sub(N).add(ankle)};
 }
 function armAmount(p){const boundary=.17+.50*Math.max(0,.577-p.y);return smooth(boundary-.035,boundary+.035,Math.abs(p.x));}
 function posed(p,original=p){
  const side=original.x>=0?'l':'r',b=limbs[side],arm=armAmount(original),base=torso(p);
  if(original.y>.06&&arm>0){
   const fore=b.W.clone().sub(b.E).normalize(),towardFore=original.clone().sub(b.E).dot(fore);
   let result=mix(b.upper(p),b.forearm(p),smooth(-.045,.045,towardFore));
   const handWeight=smooth(-.025,.025,original.clone().sub(b.W).dot(b.long));result.lerp(b.hand(p),handWeight);
   return base.lerp(result,arm);
  }
  if(original.y<.10){
   const along=original.clone().sub(b.K).dot(b.N.clone().sub(b.K).normalize());
   const leg=mix(b.thigh(p),b.shin(p),smooth(-.055,.055,along));
   const foot=smooth(b.N.y+.035,b.N.y-.035,original.y);
   leg.lerp(b.foot(p),foot);
   return base.lerp(leg,1-smooth(.005,.095,original.y));
  }
  return base;
 }
 // Surface normals in source space determine cloth clearance before posing.
 const normals=vertices.map(()=>V(0,0,0));
 for(const f of faces)for(let i=1;i<f.length-1;i++){
  const a=vertices[f[0].p],b=vertices[f[i].p],c=vertices[f[i+1].p],n=b.clone().sub(a).cross(c.clone().sub(a));
  for(const id of [f[0].p,f[i].p,f[i+1].p])normals[id].add(n);
 }
 normals.forEach(n=>n.normalize());
 function region(p){
  const b=limbs[p.x>=0?'l':'r'];
  if(armAmount(p)>.6&&p.y>.06){const distance=p.clone().sub(b.W).dot(b.long);return distance>-.005?'skin':distance>-.032?'shirt':'jacket';}
  if(p.y<-.77)return 'shoes';
  if(p.y<.06)return 'trousers';
  if(p.y>.61&&Math.abs(p.x)<.065)return 'skin';
  return 'jacket';
 }
 function dressed(p,id,part){
  const n=normals[id],arm=armAmount(p),v=p.clone();
  if(part==='jacket'){
   v.addScaledVector(n,.014);
   if(arm<.6){v.x*=THREE.MathUtils.lerp(.92,1.12,smooth(.16,.52,p.y));v.addScaledVector(n,(1-smooth(.35,.53,p.y))*.013);const flatten=smooth(.24,.34,p.y)*(1-smooth(.54,.62,p.y))*smooth(.2,.65,n.z)*(1-arm);v.z=THREE.MathUtils.lerp(v.z,.15,flatten*.85);}
  }else if(part==='trousers')v.addScaledVector(n,.014);
  else if(part==='shirt')v.addScaledVector(n,.008);
  else if(part==='shoes'){v.addScaledVector(n,.008);v.y=Math.max(v.y,-.899);}
  return posed(v,p);
 }
 const parts=Object.fromEntries(['skin','jacket','shirt','trousers','shoes'].map(name=>[name,{positions:[],uv:[],indices:[],sourceVertices:[]}])) ,lookup=Object.fromEntries(Object.keys(parts).map(n=>[n,new Map()]));
 const sourceIds=new Set(faces.flatMap(f=>f.map(v=>v.p))),edges=new Map();
 for(const face of faces){
  // Keep the upper neck/trapezius beneath the collar; the separate head is trimmed there.
  if(face.some(v=>vertices[v.p].y>6.15*scale))continue;
  const center=face.reduce((sum,v)=>sum.add(vertices[v.p]),V(0,0,0)).divideScalar(face.length),part=region(center),out=parts[part];
  const indices=face.map(v=>{
   const key=v.p+'/'+v.t;if(!lookup[part].has(key)){
    const i=out.positions.length/3;lookup[part].set(key,i);out.positions.push(...dressed(vertices[v.p],v.p,part).toArray().map(n=>Math.round(n*1e6)/1e6));out.uv.push(...(uv[v.t]||[0,0]));out.sourceVertices.push(v.p);
   }return lookup[part].get(key);
  });
  for(let i=1;i<indices.length-1;i++)out.indices.push(indices[0],indices[i],indices[i+1]);
  for(let i=0;i<face.length;i++){
   const j=(i+1)%face.length,a=face[i].p,b=face[j].p,key=[a,b].sort((x,y)=>x-y).join('/');
   const edge={part,a,b,indices:[indices[i],indices[j]]};
   if(!edges.has(key))edges.set(key,[]);edges.get(key).push(edge);
  }
 }
 // Independent cloth clearance creates a step at cuffs and the collar. Join both
 // posed edges with a narrow sidewall instead of leaving an open ring.
 let seamBridges=0;
 const priority=['skin','shoes','shirt','trousers','jacket'];
 for(const pair of edges.values()){
  if(pair.length!==2||pair[0].part===pair[1].part)continue;
  const [a,b]=pair.sort((a,b)=>priority.indexOf(b.part)-priority.indexOf(a.part)),out=parts[a.part],other=parts[b.part];
  const copies=a.indices.map((_,i)=>{
   const sourceId=i===0?a.a:a.b,id=b.indices[b.a===sourceId?0:1],next=out.positions.length/3;
   out.positions.push(...other.positions.slice(id*3,id*3+3));out.uv.push(...other.uv.slice(id*2,id*2+2));out.sourceVertices.push(sourceId);return next;
  });
  out.indices.push(a.indices[1],a.indices[0],copies[0],a.indices[1],copies[0],copies[1]);seamBridges++;
 }
 // A shoe last is the convex envelope of the posed foot, closing individual toe gaps.
 const originalShoes=parts.shoes,shoes={positions:[],uv:[],indices:[],sourceVertices:[]};
 for(const sign of [-1,1]){
  const points=[];for(let i=0;i<originalShoes.positions.length;i+=3)if(originalShoes.positions[i]*sign>0)points.push(V(...originalShoes.positions.slice(i,i+3)));
  const hull=new ConvexGeometry(points);hull.deleteAttribute('normal');const merged=mergeVertices(hull),pos=merged.attributes.position,base=shoes.positions.length/3;
  for(let i=0;i<pos.count;i++){
   const point=V().fromBufferAttribute(pos,i);shoes.positions.push(...point.toArray());shoes.uv.push(0,0);
   let nearest=0,distance=Infinity;for(let j=0;j<originalShoes.positions.length;j+=3){const d=point.distanceToSquared(V(...originalShoes.positions.slice(j,j+3)));if(d<distance){distance=d;nearest=originalShoes.sourceVertices[j/3];}}
   shoes.sourceVertices.push(nearest);
  }
  for(const i of merged.index.array)shoes.indices.push(base+i);hull.dispose();merged.dispose();
 }
 parts.shoes=shoes;
 // Bin projected triangles once so panel fitting does not raycast the entire
 // anatomical body thousands of times during an offline rebuild.
 const bins=new Map(),cell=.02,frontCache=new Map();
 for(const name of ['jacket','skin']){
  const d=parts[name];for(let k=0;k<d.indices.length;k+=3){
   const t=d.indices.slice(k,k+3).map(i=>d.positions.slice(i*3,i*3+3)),xs=t.map(p=>p[0]),ys=t.map(p=>p[1]);
   const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
   if(maxX<-.13||minX>.13||maxY<.78||minY>1.2)continue;
   for(let ix=Math.floor(minX/cell);ix<=Math.floor(maxX/cell);ix++)for(let iy=Math.floor(minY/cell);iy<=Math.floor(maxY/cell);iy++){
    const key=ix+'/'+iy;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(t);
   }
  }
 }
 function front(x,y){
  const cacheKey=x.toFixed(9)+'/'+y.toFixed(9);if(frontCache.has(cacheKey))return frontCache.get(cacheKey);
  let z=-Infinity;
  for(const [a,b,c] of bins.get(Math.floor(x/cell)+'/'+Math.floor(y/cell))||[]){
   const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(denominator)<1e-12)continue;
   const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/denominator,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/denominator,w=1-u-v;
   if(u>=-1e-9&&v>=-1e-9&&w>=-1e-9){const hit=u*a[2]+v*b[2]+w*c[2];if(hit<=1.5)z=Math.max(z,hit);}
  }
  const result=Number.isFinite(z)?z:.38;frontCache.set(cacheKey,result);return result;
 }
 function ribbon(rows,sign=1,lift=.003){
  const p=[],uv=[],ind=[],dense=[];
  for(let r=0;r<rows.length-1;r++)for(let step=0;step<4;step++){const t=step/4;dense.push(rows[r].map((x,i)=>THREE.MathUtils.lerp(x,rows[r+1][i],t)));}dense.push(rows.at(-1));
  const slices=12;
  for(let i=0;i<dense.length;i++){const [y,a,b]=dense[i];for(let j=0;j<=slices;j++){const x=sign*THREE.MathUtils.lerp(a,b,j/slices);p.push(x,y,front(x,y)+lift);uv.push(j/slices,i/(dense.length-1));if(i<dense.length-1&&j<slices){const n=i*(slices+1)+j;ind.push(n,n+1,n+slices+1,n+1,n+slices+2,n+slices+1);}}}
  // Check each panel's interior as well as its vertices. The anatomical mesh has
  // smaller triangles that otherwise protrude through a linearly interpolated panel.
  for(let pass=0;pass<4;pass++){
   const raise=new Float32Array(p.length/3);
   for(let k=0;k<ind.length;k+=3){const ids=ind.slice(k,k+3);
    for(const weights of [[1/3,1/3,1/3],[.5,.25,.25],[.25,.5,.25],[.25,.25,.5]]){
     const at=[0,1,2].map(axis=>ids.reduce((sum,id,i)=>sum+p[id*3+axis]*weights[i],0)),clearance=front(at[0],at[1])+.0015-at[2];
     if(clearance>0)for(const id of ids)raise[id]=Math.max(raise[id],clearance);
    }
   }
   if(!raise.some(n=>n>0))break;for(let i=0;i<raise.length;i++)p[i*3+2]+=raise[i];
  }
  // Reserve another 3mm for sub-triangle curvature between interior samples.
  for(let i=2;i<p.length;i+=3)p[i]+=.003;
  return {positions:p,uv,indices:ind};
 }
 const lapelRows=[[1.13,.025,.047],[1.10,.033,.112],[1.075,.035,.103],[1.055,.032,.119],[1.02,.030,.098],[.95,.021,.075],[.88,.016,.048],[.835,.010,.030]];
 const details={shirt:ribbon([[1.14,-.043,.043],[1.10,-.05,.05],[1.04,-.04,.04],[.98,-.03,.03],[.91,-.023,.023],[.84,-.016,.016],[.795,-.014,.014]],1,.0025),lapelLeft:ribbon(lapelRows,1,.0055),lapelRight:ribbon(lapelRows,-1,.0055)};
 const landmarks={leftWrist:limbs.l.C.toArray(),rightWrist:limbs.r.C.toArray(),leftElbow:limbs.l.B.toArray(),rightElbow:limbs.r.B.toArray(),leftKnee:limbs.l.knee.toArray(),rightKnee:limbs.r.knee.toArray()};
 return {parts,details,landmarks,headPosition:torso(V(0,6*scale,.2*scale)).toArray(),headScale:1.10,metadata:{source:'MakeHuman hm08 base.obj (local CC0 original)',sourceBodyVertices:sourceIds.size,seamBridges,downloadRequired:false,method:'Anatomical joint landmarks, analytic two-bone arm placement and smoothly blended surface deformation; custom cloth clearance, closed material boundaries and conforming garment panels'}};
}
