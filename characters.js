import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {paintFace,DEFAULT_EYES} from './face-photo.js';

const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const profiles=[
 {name:'왼쪽 면접관',x:-1.81,jacket:'#686970',shirt:'#171c21',skin:'#bf967f',hair:'#211e1b',width:1,headWidth:1},
 {name:'가운데 면접관',x:0,jacket:'#172335',shirt:'#eeeae4',skin:'#bf9278',hair:'#262624',width:1.07,headWidth:1.04},
 {name:'오른쪽 면접관',x:1.81,jacket:'#282b2d',shirt:'#73705b',skin:'#c09b80',hair:'#423023',width:.94,headWidth:.94},
];
function geometry(data){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));g.setIndex(data.indices);g.computeVertexNormals();return g;
}
function textile(color,pinstripe=false){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 x.fillStyle='#a6a6a6';x.fillRect(0,0,256,256);
 for(let n=0;n<256;n+=2){x.strokeStyle=n%4?'#888888':'#c0c0c0';x.lineWidth=.5;x.beginPath();x.moveTo(n,0);x.lineTo(n,256);x.stroke();x.beginPath();x.moveTo(0,n);x.lineTo(256,n);x.stroke();}
 if(pinstripe){x.strokeStyle='#d8d8d8';x.lineWidth=1.4;for(let n=6;n<256;n+=24){x.beginPath();x.moveTo(n,0);x.lineTo(n,256);x.stroke();}}
 const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,3);map.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({color,map,roughness:.91,bumpMap:map,bumpScale:.00035});
}
function photographClothing(material,profile,index,uniforms){
 // Reuse fabric folds from the approved photo on the front of the solid garment.
 // Rear and side surfaces retain their woven PBR material.
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vGarmentPosition; varying float vGarmentFacing;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGarmentPosition=(modelMatrix*vec4(position,1.0)).xyz;vGarmentFacing=(mat3(modelMatrix)*normal).z;');
  shader.fragmentShader='uniform sampler2D garmentPhoto; uniform float hasGarmentPhoto; varying vec3 vGarmentPosition; varying float vGarmentFacing;\n'+shader.fragmentShader;
  const center=[340,897,1436][index],eyeY=[289,286,352][index];
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 garmentUv=vec2((${center.toFixed(1)}+(vGarmentPosition.x-${profile.x.toFixed(2)})*870.0)/1672.0,1.0-(${eyeY.toFixed(1)}+(1.262-vGarmentPosition.y)*970.0)/941.0);
   vec3 garmentColor=texture2D(garmentPhoto,garmentUv).rgb;
   float backgroundMask=1.0-smoothstep(0.46,0.63,min(garmentColor.r,min(garmentColor.g,garmentColor.b)));
   float shirtMask=1.0-smoothstep(0.055,0.10,abs(vGarmentPosition.x-${profile.x.toFixed(2)}));
   float skinInPhoto=step(garmentColor.g*1.14,garmentColor.r)*step(garmentColor.b*1.18,garmentColor.g);
   float garmentBlend=smoothstep(0.0,0.75,vGarmentFacing)*hasGarmentPhoto*max(backgroundMask,shirtMask)*0.93*smoothstep(0.88,0.99,vGarmentPosition.y)*(1.0-skinInPhoto);
   diffuseColor.rgb=mix(diffuseColor.rgb,garmentColor,garmentBlend);`);
 };
 material.customProgramCacheKey=()=> 'garment-photo-'+index;
}
function addMesh(parent,g,mat,name){const o=new THREE.Mesh(g,mat);o.name=name;o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function sphere(parent,p,scale,mat,name){const o=addMesh(parent,new THREE.SphereGeometry(1,24,16),mat,name);o.position.set(...p);o.scale.set(...scale);return o;}
function curve(parent,points,r,mat,name,segments=24){return addMesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,6,false),mat,name);}
function panel(parent,points,mat,name){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex(points.slice(2).flatMap((_,i)=>[0,i+1,i+2]));g.computeVertexNormals();
 const o=addMesh(parent,g,mat,name);o.material.side=THREE.DoubleSide;return o;
}
function sleeve(parent,points,radii,mat,name){
 const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=path.computeFrenetFrames(24,false),p=[],uv=[],ind=[];
 for(let i=0;i<=24;i++){
  const t=i/24,at=path.getPointAt(t),radius=THREE.MathUtils.lerp(radii[0],radii[1],t)*(1+.025*Math.sin(t*40));
  for(let j=0;j<=20;j++){const a=j/20*Math.PI*2,v=at.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius*.88);p.push(...v.toArray());uv.push(j/20,t);if(i<24&&j<20){const n=i*21+j;ind.push(n,n+21,n+1,n+1,n+21,n+22);}}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return addMesh(parent,g,mat,name);
}
function torso(parent,coat,shirt,width){
 const rings=[[.56,.20,.115,.11],[.66,.205,.12,.14],[.80,.195,.115,.185],[.96,.24,.125,.235],[1.075,.235,.105,.255],[1.115,.185,.09,.27],[1.15,.075,.068,.28]],p=[],uv=[],indices=[];
 for(let i=0;i<rings.length;i++)for(let j=0;j<=64;j++){const a=j/64*Math.PI*2,[y,w,d,z]=rings[i];p.push(Math.sin(a)*w*width,y,z+Math.cos(a)*d);uv.push(j/64,i/(rings.length-1));}
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<64;j++){const n=i*65+j;indices.push(n,n+1,n+65,n+1,n+66,n+65);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
 const m=addMesh(parent,g,[coat,shirt],'양복 몸판과 안쪽 셔츠');
 // Assign the shirt only in the opening between both jacket fronts.
 const buckets=[[],[]];
 for(let k=0;k<indices.length;k+=3){const ids=indices.slice(k,k+3),x=ids.reduce((a,n)=>a+p[n*3],0)/3,y=ids.reduce((a,n)=>a+p[n*3+1],0)/3,z=ids.reduce((a,n)=>a+p[n*3+2],0)/3,material=z>.29&&y>.70&&Math.abs(x)<.065+(y-.9)*.14?1:0;buckets[material].push(...ids);}
 g.setIndex(buckets.flat());g.clearGroups();g.addGroup(0,buckets[0].length,0);g.addGroup(buckets[0].length,buckets[1].length,1);
 return m;
}
function hair(parent,headGeo,profile,index){
 const mat=new THREE.MeshStandardMaterial({color:profile.hair,roughness:.76}),p=headGeo.attributes.position,indices=[];
 for(let i=0;i<headGeo.index.count;i+=3){const ids=[0,1,2].map(j=>headGeo.index.getX(i+j));if(ids.every(k=>p.getY(k)>(Math.abs(p.getX(k))>.045?.145:p.getZ(k)>.05?.188+.009*Math.sin(p.getX(k)*60):.105)))indices.push(...ids);}
 const cap=headGeo.clone();cap.setIndex(indices);const a=cap.attributes.position;
 for(let i=0;i<a.count;i++){a.setXYZ(i,a.getX(i)*1.035,(a.getY(i)-.13)*1.04+.13,(a.getZ(i)-.015)*1.04+.015);}cap.computeVertexNormals();addMesh(parent,cap,mat,'입체 두피와 머리카락');
 const strandMat=new THREE.MeshStandardMaterial({color:index===1?'#77736b':index===2?'#74543a':'#3a332d',roughness:.77});
 // Layered curved strands follow the skull rather than facing the camera.
 for(let i=0;i<80;i++){
  const t=i/79,x=(t-.5)*.152,start=[x*.35+.012,.254-Math.abs(x)*.2,.012],end=[x,.193+.012*Math.sin(i*1.9),.098-Math.abs(x)*.32];
  const points=[start,[x*.75,.255-Math.abs(x)*.20,.055],[x*1.03,.230-Math.abs(x)*.21,.085],end];
  curve(parent,points,index===0?.00155:.0011,i%6===0?strandMat:mat,'모발 결',12);
 }
 if(index===2){
  for(const sign of [-1,1])for(let i=0;i<44;i++){
   const t=i/43,back=t>.58,angle=(t*.68+.06)*Math.PI,x=sign*(.065+.023*Math.sin(angle));
   curve(parent,[[sign*.025,.254,.012],[x,.198,back?-.047:.056],[sign*(.082+.025*t),.07,back?-.075:.047],[sign*(.105+.035*Math.sin(i*3)), -.095-.035*Math.sin(i*.8), back?-.052:.09],[sign*(.13+.028*Math.sin(i)), -.23+.025*Math.sin(i*1.4),.11]],.0024,i%4===0?strandMat:mat,'긴 머리 겹',28);
  }
 }
 const strands=parent.children.filter(o=>o.name==='모발 결'||o.name==='긴 머리 겹');
 for(const material of [mat,strandMat]){const batch=strands.filter(o=>o.material===material);if(!batch.length)continue;addMesh(parent,mergeGeometries(batch.map(o=>o.geometry)),material,'합친 입체 모발');batch.forEach(o=>{parent.remove(o);o.geometry.dispose();});}
}
function head(parent,data,profile,index){
 const root=new THREE.Group();root.name='사진을 입힌 입체 머리';root.position.set(0,1.115,.30);parent.add(root);
 const g=geometry(data),p=g.attributes.position,n=g.attributes.normal,weights=[];
 for(let i=0;i<p.count;i++)weights.push(smooth(.016,.07,p.getZ(i))*smooth(-.1,.45,n.getZ(i))*smooth(.015,.045,p.getY(i))*(1-smooth(.055,.078,Math.abs(p.getX(i)))));
 g.setAttribute('faceWeight',new THREE.Float32BufferAttribute(weights,1));
 const uniforms={faceMap:{value:null},hasFace:{value:0}};
 const mat=new THREE.MeshStandardMaterial({color:profile.skin,roughness:.68});
 mat.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute float faceWeight; varying vec3 vFacePoint; varying float vFaceWeight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFacePoint=position;vFaceWeight=faceWeight;');
  shader.fragmentShader='uniform sampler2D faceMap; uniform float hasFace; varying vec3 vFacePoint; varying float vFaceWeight;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec2 faceUv=vec2(0.5+vFacePoint.x/0.271669,0.5625+(vFacePoint.y-0.128415)/0.271669);\nvec4 portrait=texture2D(faceMap,faceUv);\nfloat inside=step(0.0,faceUv.x)*step(faceUv.x,1.0)*step(0.0,faceUv.y)*step(faceUv.y,1.0);\ndiffuseColor.rgb=mix(diffuseColor.rgb,portrait.rgb,portrait.a*vFaceWeight*hasFace*inside);');
 };
 mat.customProgramCacheKey=()=> 'portrait-projection-v1';
 addMesh(root,g,mat,'해부학적 얼굴·귀·목');
 // The base mesh has open eye sockets. Close them with curved eyeball surfaces.
 for(const sign of [-1,1]){
  const eye=sphere(root,[sign*.030775,.128415,.104535],[.0115,.0095,.011],mat,'입체 안구');
  const eg=eye.geometry.clone();eg.applyMatrix4(new THREE.Matrix4().compose(eye.position,eye.quaternion,eye.scale));
  const ep=eg.attributes.position;eg.setAttribute('faceWeight',new THREE.Float32BufferAttribute(Array(ep.count).fill(1),1));eye.geometry=eg;eye.position.set(0,0,0);eye.scale.set(1,1,1);
 }
 // A dark cavity prevents light leaking through the mouth opening in orbit view.
 sphere(root,[0,.060,.105],[.022,.007,.012],new THREE.MeshStandardMaterial({color:'#4d2924',roughness:1}),'입 안쪽');
 hair(root,g,profile,index);root.scale.set(1.15*profile.headWidth,1.15,1.15);
 if(index===2)root.rotation.x=.075;
 return {root,uniforms};
}
function person(data,profile,index){
 const root=new THREE.Group();root.name=profile.name;root.position.set(profile.x,0,-.18);
 const coat=textile(profile.jacket,index===2),shirt=textile(profile.shirt),skin=new THREE.MeshStandardMaterial({color:profile.skin,roughness:.73}),dark=new THREE.MeshStandardMaterial({color:'#171b20',roughness:.9}),button=new THREE.MeshStandardMaterial({color:'#24262a',roughness:.48});
 const garmentUniforms={garmentPhoto:{value:null},hasGarmentPhoto:{value:0}};
 photographClothing(coat,profile,index,garmentUniforms);photographClothing(shirt,profile,index,garmentUniforms);
 torso(root,coat,shirt,profile.width);
 // Seated thighs, knees, lower legs and shoes remain solid in orbit view.
 for(const sign of [-1,1]){
  sleeve(root,[[sign*.105,.555,.08],[sign*.13,.50,.30],[sign*.145,.49,.49]],[.10,.085],dark,' 착석한 바지 허벅지');
  sleeve(root,[[sign*.145,.49,.49],[sign*.155,.25,.48],[sign*.16,.085,.50]],[.075,.055],dark,'바지 아랫단');
  sphere(root,[sign*.16,.052,.56],[.065,.045,.14],new THREE.MeshStandardMaterial({color:'#242322',roughness:.4}),'구두');
  const elbow=[sign*.29,.855,.51],wrist=[sign*(index===0?.07:.17),.817,.865];
  sleeve(root,[[sign*.218,1.067,.255],[sign*.27,.98,.35],elbow,wrist],[.087,.053],coat,'구부린 재킷 소매');
  const axis=new THREE.Vector3(...wrist).sub(new THREE.Vector3(...elbow)).normalize();
  const cuff=addMesh(root,new THREE.CylinderGeometry(.046,.047,.026,24),shirt,'셔츠 소맷단');cuff.position.set(...wrist);cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
  const palm=new THREE.Group();palm.position.set(...wrist);palm.position.addScaledVector(axis,.012);
  palm.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(sign*(index===0?-.65:-.12),-.02,.8).normalize());
  if(sign<0)palm.scale.x=-1;root.add(palm);addMesh(palm,geometry(data.hand),skin,'해부학적 손과 손가락');
  for(let k=0;k<3;k++)sphere(root,[sign*(.234-k*.012),.839+k*.003,.742-k*.023],[.005,.003,.005],button,'소매 단추');
  const z=.378;
  panel(root,[[sign*.067,1.143,.332],[sign*.162,1.086,.352],[sign*.119,1.018,z],[sign*.071,.790,.312],[sign*.036,1.038,z+.005]],coat,'재킷 노치 라펠');
  curve(root,[[sign*.067,1.143,.334],[sign*.160,1.086,.354],[sign*.118,1.018,z+.002],[sign*.071,.790,.314]],.00065,new THREE.MeshStandardMaterial({color:profile.jacket,roughness:1}),'라펠 가장자리 봉제선',16);
  if(index===1)panel(root,[[sign*.007,1.14,.353],[sign*.056,1.145,.342],[sign*.070,1.08,.373],[sign*.027,1.052,.375]],shirt,'와이셔츠 칼라');
 }
 if(index===1)for(let j=0;j<5;j++)sphere(root,[0,1.07-j*.057,.371-j*.004],[.003,.003,.0018],button,'셔츠 단추');
 sphere(root,[.055,.79,.32],[.009,.009,.003],button,'재킷 앞 단추');
 if(index>0){const pen=new THREE.MeshStandardMaterial({color:index===2?'#dccb37':'#292c30',metalness:.3,roughness:.35});curve(root,[[-.15,.88,.96],[-.12,.795,1.055]],.003,pen,'손에 든 필기용 펜',4);curve(root,[[-.12,.795,1.055],[-.116,.784,1.067]],.0011,button,'필기용 펜촉',4);}
 // Welt breast pocket, opening and lapel pin from the reference.
 curve(root,[[.105,.977,.363],[.19,.989,.340]],.0018,coat,'가슴 주머니 웰트',4);
 if(index===0)sphere(root,[.127,1.048,.375],[.008,.008,.002],new THREE.MeshStandardMaterial({color:'#9e8e65',metalness:.55,roughness:.4}),'라펠 배지');
 const face=head(root,data.head,profile,index);
 return {root,headRoot:face.root,uniforms:face.uniforms,garmentUniforms,texture:null,defaultCanvas:null};
}
export function buildCharacter(data,index){return person(data,profiles[index],index);}
export async function createInterviewers({scene,manager,anisotropy=4,onChange=()=>{}}){
 // Register the JSON load in the room's existing progress lifecycle.
 const [data,image]=await Promise.all([
  new THREE.FileLoader(manager).setResponseType('json').loadAsync('./assets/characters/anatomy.json'),
  new THREE.ImageLoader(manager).loadAsync('./assets/characters/reference.jpg'),
 ]);
 const people=profiles.map((_,i)=>buildCharacter(data,i));people.forEach(p=>scene.add(p.root));
 const garmentPhoto=new THREE.Texture(image);garmentPhoto.colorSpace=THREE.SRGBColorSpace;garmentPhoto.anisotropy=anisotropy;garmentPhoto.needsUpdate=true;
 people.forEach(p=>{p.garmentUniforms.garmentPhoto.value=garmentPhoto;p.garmentUniforms.hasGarmentPhoto.value=1;});
 function replace(index,canvas){
  const p=people[index];if(!p)throw Error('면접관을 찾지 못했어요.');
  const next=new THREE.CanvasTexture(canvas);next.colorSpace=THREE.SRGBColorSpace;next.anisotropy=anisotropy;
  p.uniforms.faceMap.value=next;p.uniforms.hasFace.value=1;p.texture?.dispose();p.texture=next;
  onChange();
 }
 people.forEach((p,i)=>{p.defaultCanvas=paintFace(document.createElement('canvas'),image,DEFAULT_EYES[i]);replace(i,p.defaultCanvas);});
 return {people,names:profiles.map(p=>p.name),replace,restore(index){replace(index,people[index].defaultCanvas);},get ready(){return true;}};
}
