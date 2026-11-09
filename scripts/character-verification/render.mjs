// Geometry-only CPU inspection. This is NOT a browser/WebGL screenshot.
import fs from 'node:fs/promises';
import * as THREE from '../../node_modules/three/build/three.module.js';
import {PNG} from '/Users/sqmr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs/lib/png.js';
import {buildCharacter,createFaceController} from '../../characters.js';
import {photoTransform,DEFAULT_EYES} from '../../face-photo.js';
const noop=()=>{};
globalThis.document={createElement(){return {width:256,height:256,getContext(){return {fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop};}};}};
const data=JSON.parse(await fs.readFile(new URL('../../assets/characters/anatomy.json',import.meta.url)));
const photo=PNG.sync.read(await fs.readFile(new URL('../../assets/characters/reference.png',import.meta.url)));
const seated=JSON.parse(await fs.readFile(new URL('../../assets/characters/seated-human.json',import.meta.url)));
const models=[0,1,2].map(i=>buildCharacter(data,i,seated));
const mode=process.argv[3]||'basic',faces=createFaceController(models);
for(let i=0;i<3;i++){
 if(mode==='photo')faces.replace(i,{getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray([180,140,112,255])})})});
 else faces.setStyle(i,mode);
}
const snapshot=process.argv[4]===undefined?null:Number(process.argv[4]);
const anger=process.argv[5]===undefined?null:Number(process.argv[5]);
if(anger!==null){faces.setMood('offended');faces.setAnger(anger);}
if(snapshot!==null)for(let t=0;t<=snapshot;t+=1/60)faces.update(t);
const view=process.argv[2]||'group',centerOnly=view!=='group';
const W=1500,H=780,png=new PNG({width:W,height:H}),depth=new Float32Array(W*H).fill(Infinity);
for(let i=0;i<W*H;i++){png.data.set([216,219,216,255],i*4);}
const camera=new THREE.PerspectiveCamera(47,W/H,.01,20);camera.position.set(0,1.31,3.35);camera.lookAt(0,1.0,.14);camera.updateMatrixWorld();
if(snapshot!==null&&view==='group'){camera.position.set(0,1.25,3.42);camera.lookAt(0,1.22,-.8);camera.updateMatrixWorld();}
if(centerOnly){camera.position.set(...(view==='side'?[2.2,1.1,.1]:[0,1.12,2.35]));camera.lookAt(0,.83,.12);camera.updateMatrixWorld();}
if(view==='head'){camera.position.set(0,1.36,.94);camera.lookAt(0,1.34,.25);camera.updateMatrixWorld();}
const vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),light=new THREE.Vector3(-.3,.7,1).normalize();
let triangles=0;
for(let person=0;person<3;person++){
 if(centerOnly&&person!==1)continue;
 const model=models[person];model.root.updateMatrixWorld(true);const m=photoTransform(DEFAULT_EYES[person],{}),det=m.a*m.d-m.b*m.c;
 model.root.traverseVisible(o=>{
  if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,fw=g.attributes.faceWeight,world=o.matrixWorld,normMat=new THREE.Matrix3().getNormalMatrix(world),verts=[];
  for(let i=0;i<p.count;i++){const local=new THREE.Vector3().fromBufferAttribute(p,i),v=local.clone().applyMatrix4(world).applyMatrix4(vp),normal=new THREE.Vector3().fromBufferAttribute(n,i).applyMatrix3(normMat).normalize();verts.push({x:(v.x*.5+.5)*W,y:(.5-v.y*.5)*H,z:v.z,shade:.70+.30*Math.max(0,normal.dot(light)),world:new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(world),normal,local,fw:fw?.getX(i)||0});}
  const ind=g.index?.array||Array.from({length:p.count},(_,i)=>i);
  for(let k=0;k<ind.length;k+=3){
   const [a,b,c]=[verts[ind[k]],verts[ind[k+1]],verts[ind[k+2]]];
   const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);if(Math.abs(area)<.01)continue;
   const minx=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxx=Math.min(W-1,Math.ceil(Math.max(a.x,b.x,c.x))),miny=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxy=Math.min(H-1,Math.ceil(Math.max(a.y,b.y,c.y)));
   const group=g.groups.find(s=>k>=s.start&&k<s.start+s.count),mat=Array.isArray(o.material)?o.material[group?.materialIndex||0]:o.material;
   const base=mat.color.clone().convertLinearToSRGB().toArray().map(v=>v*255);triangles++;
   for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
    const u=((b.x-x)*(c.y-y)-(b.y-y)*(c.x-x))/area,v=((c.x-x)*(a.y-y)-(c.y-y)*(a.x-x))/area,w=1-u-v;if(u<0||v<0||w<0)continue;
    const z=u*a.z+v*b.z+w*c.z,idx=y*W+x;if(z>=depth[idx])continue;depth[idx]=z;
    let color=base.slice();
    if(mat.customProgramCacheKey?.().startsWith('garment-photo-')){
     const wx=u*a.world.x+v*b.world.x+w*c.world.x,wy=u*a.world.y+v*b.world.y+w*c.world.y,facing=u*a.normal.z+v*b.normal.z+w*c.normal.z;
     const sx=[340,897,1436][person]+(wx-[-1.81,0,1.81][person])*870,sy=[289,286,352][person]+(1.262-wy)*970;
     if(sx>=0&&sy>=0&&sx<photo.width&&sy<photo.height){const sample=(Math.floor(sy)*photo.width+Math.floor(sx))*4,amt=Math.min(1,Math.max(0,facing/.75))*.93*Math.min(1,Math.max(0,(wy-.88)/.11))*(photo.data[sample]>photo.data[sample+1]*1.08&&photo.data[sample+1]>photo.data[sample+2]*1.12?0:1);for(let ch=0;ch<3;ch++)color[ch]=base[ch]*(1-amt)+photo.data[sample+ch]*amt;}
    }
    const weight=u*a.fw+v*b.fw+w*c.fw;
    if(weight>0){const px=u*a.local.x+v*b.local.x+w*c.local.x,py=u*a.local.y+v*b.local.y+w*c.local.y,tx=(.5+px/.271669)*1024,ty=(.4375-(py-.172)/.271669)*1024;
     const sx=(m.d*(tx-m.e)-m.c*(ty-m.f))/det,sy=(-m.b*(tx-m.e)+m.a*(ty-m.f))/det;
     const r=Math.hypot(tx-512,ty-490),alpha=1-Math.max(0,Math.min(1,(r-382)/108));
     if(tx>=0&&tx<1024&&ty>=0&&ty<1024&&sx>=0&&sy>=0&&sx<photo.width&&sy<photo.height){const s=(Math.floor(sy)*photo.width+Math.floor(sx))*4;for(let ch=0;ch<3;ch++)color[ch]=color[ch]*(1-weight*alpha)+photo.data[s+ch]*weight*alpha;}
    }
    if(mat.customProgramCacheKey?.()==='portrait-mask-v3'){const heat=model.uniforms.faceHeat.value;for(let ch=0;ch<3;ch++)color[ch]*=1+([1.18,.42,.34][ch]-1)*heat*.72;}
    const shade=u*a.shade+v*b.shade+w*c.shade;for(let ch=0;ch<3;ch++)png.data[idx*4+ch]=Math.min(255,color[ch]*shade);
   }
  }
 });
}
const preview=anger!==null?`character-drama-${mode}-${anger}.png`:snapshot===null?`character-mask-${mode}-${view}.png`:`character-gaze-${mode}-${view}-${snapshot}.png`;
await fs.writeFile(new URL('../../'+preview,import.meta.url),PNG.sync.write(png));console.log({triangles,models:models.map(p=>p.root.name),preview,kind:'CPU geometry inspection; no room, no WebGL shader verification'});
