import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const profiles=[
 {name:'왼쪽 면접관',x:-1.81,jacket:'#686970',shirt:'#171c21',skin:'#bf967f',hair:'#211e1b',width:1,headWidth:1},
 {name:'가운데 면접관',x:0,jacket:'#172335',shirt:'#eeeae4',skin:'#bf9278',hair:'#262624',width:1.07,headWidth:1.04},
 {name:'오른쪽 면접관',x:1.81,jacket:'#282b2d',shirt:'#73705b',skin:'#c09b80',hair:'#423023',width:.94,headWidth:.94},
];
function geometry(data){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));if(data.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));g.setIndex(data.indices);g.computeVertexNormals();return g;
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
  shader.vertexShader='uniform mat4 garmentPoseInverse; varying vec3 vGarmentPosition; varying float vGarmentFacing;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGarmentPosition=(garmentPoseInverse*modelMatrix*vec4(position,1.0)).xyz;vGarmentFacing=(mat3(modelMatrix)*normal).z;');
  shader.fragmentShader='uniform sampler2D garmentPhoto; uniform float hasGarmentPhoto; varying vec3 vGarmentPosition; varying float vGarmentFacing;\n'+shader.fragmentShader;
  const center=[340,897,1436][index],eyeY=[289,286,352][index];
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 garmentUv=vec2((${center.toFixed(1)}+(vGarmentPosition.x-(${profile.x.toFixed(2)}))*870.0)/1672.0,1.0-(${eyeY.toFixed(1)}+(1.262-vGarmentPosition.y)*970.0)/941.0);
   vec3 garmentColor=texture2D(garmentPhoto,garmentUv).rgb;
   float backgroundMask=1.0-smoothstep(0.46,0.63,min(garmentColor.r,min(garmentColor.g,garmentColor.b)));
   float shirtMask=1.0-smoothstep(0.055,0.10,abs(vGarmentPosition.x-(${profile.x.toFixed(2)})));
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
function head(parent,data,profile,index){
 const root=new THREE.Group();root.name='선택 가능한 입체 가면';root.position.set(0,1.115,.30);root.scale.set(1.15*profile.headWidth,1.15,1.15);parent.add(root);
 const ceramic=new THREE.MeshStandardMaterial({color:'#d8d9d2',roughness:.57}),ink=new THREE.MeshStandardMaterial({color:'#232a2d',roughness:.85}),brown=new THREE.MeshStandardMaterial({color:'#a77e59',roughness:.92}),muzzle=new THREE.MeshStandardMaterial({color:'#bc9670',roughness:.92}),earInner=new THREE.MeshStandardMaterial({color:'#76533d',roughness:1});
 const neckMaterial=ceramic.clone();const neck=addMesh(root,new THREE.CylinderGeometry(.035,.043,.085,32),neckMaterial,'가면을 받치는 목');neck.position.set(0,.040,.018);
 const views={},brows=[];
 for(const name of ['basic','capybara','photo']){const g=new THREE.Group();g.name=name==='basic'?'기본 회백색 가면':name==='capybara'?'카피바라 입체 마스크':'사용자 사진 네모 판';root.add(g);views[name]=g;g.visible=name==='basic';}
 sphere(views.basic,[0,.157,.040],[.082,.116,.074],ceramic,'매끈한 가면');
 const addBrow=(group,sign,y,width)=>{
  const basic=group===views.basic,x=sign*(basic?.032:.070),rx=basic?.082:.102,ry=basic?.116:.101,rz=basic?.074:.088,cz=basic?.040:.025;
  const front=at=>cz+rz*Math.sqrt(Math.max(0,1-(at/rx)**2-((y-.157)/ry)**2))+.005,z=front(x);
  const brow=curve(group,[[-width/2,0,front(x-width/2)-z],[0,0,0],[width/2,0,front(x+width/2)-z]],.0023,ink,'표정 눈썹',12);
  brow.position.set(x,y,z);brow.userData.sign=sign;brows.push(brow);
 };
 for(const sign of [-1,1]){
  sphere(views.basic,[sign*.032,.172,.111],[.0085,.0053,.004],ink,'가면의 눈');addBrow(views.basic,sign,.197,.025);
 }
 const mouth=curve(views.basic,[[-.018,.112,.110],[0,.111,.115],[.018,.112,.110]],.0017,ink,'짧은 입',12);
 mouth.geometry.translate(0,-.111,0);mouth.position.y=.111;
 sphere(views.capybara,[0,.157,.025],[.102,.101,.088],brown,'카피바라 머리');
 const snout=addMesh(views.capybara,new RoundedBoxGeometry(.151,.085,.122,3,.022),muzzle,'넓고 길쭉한 주둥이');snout.position.set(0,.120,.112);
 for(const sign of [-1,1]){
  sphere(views.capybara,[sign*.078,.238,.015],[.024,.030,.018],brown,'작고 둥근 귀');sphere(views.capybara,[sign*.078,.239,.030],[.014,.019,.005],earInner,'귀 안쪽');
  sphere(views.capybara,[sign*.070,.181,.090],[.006,.0065,.004],ink,'카피바라 눈');addBrow(views.capybara,sign,.201,.020);
  sphere(views.capybara,[sign*.029,.137,.174],[.005,.0035,.003],ink,'콧구멍');
 }
 curve(views.capybara,[[-.026,.101,.175],[0,.098,.176],[.026,.101,.175]],.0015,earInner,'주둥이 입선',12);
 const photoGeometry=new THREE.PlaneGeometry(.24,.24);photoGeometry.translate(0,.157,.13);
 const uniforms={faceMap:{value:null},hasFace:{value:0},faceHeat:{value:0}},skinMaterial=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,toneMapped:false});
 skinMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader='uniform float faceHeat;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(vec3(1.0),vec3(1.18,0.42,0.34),clamp(faceHeat,0.0,1.0)*0.72);');
 };
 skinMaterial.customProgramCacheKey=()=> 'whole-photo-plane-v1';
 const photoMesh=addMesh(views.photo,photoGeometry,skinMaterial,'사진 전체를 붙인 네모 판');
 let style='basic',heat=0,expressionMood='idle';
 const heatSources=[ceramic,brown,muzzle,earInner].map(material=>({material,base:material.color.clone()})),hot=new THREE.Color('#ef4c42');
 function expression(){const amount=Math.max(expressionMood==='offended'?.32:0,heat*.6);for(const b of brows)b.rotation.z=amount?b.userData.sign*amount:0;mouth.scale.x=1-heat*.25;mouth.scale.y=1+(amount>0?.4:0)+heat*.4;}
 return {root,uniforms,skinMaterial,neckMaterial,views,brows,photoMesh,
  get style(){return style;},
  setStyle(next){if(!Object.hasOwn(views,next))throw Error('알 수 없는 얼굴 유형이에요.');style=next;for(const [key,g] of Object.entries(views))g.visible=key===next;},
  setMood(mood){expressionMood=mood;expression();},
  setHeat(value){heat=THREE.MathUtils.clamp(value,0,1);uniforms.faceHeat.value=heat;for(const {material,base} of heatSources)material.color.copy(base).lerp(hot,heat*.72);expression();},
 };
}

function anatomicalPerson(data,profile,asset){
 const root=new THREE.Group();root.name=profile.name;root.position.set(profile.x,0,-.18);root.userData.construction='local-full-human';
 const materials={jacket:textile('#293345'),shirt:textile('#e5e1d9'),trousers:textile('#252b34'),skin:new THREE.MeshStandardMaterial({color:profile.skin,roughness:.73}),shoes:new THREE.MeshStandardMaterial({color:'#272526',roughness:.48})};
 const names={jacket:'인체 기반 재킷',shirt:'인체 기반 셔츠와 소맷단',trousers:'인체 기반 착석 바지',skin:'연결된 목·팔·손 피부',shoes:'인체 기반 구두'};
 for(const [part,shape] of Object.entries(asset.parts)){const mesh=addMesh(root,geometry(shape),materials[part],names[part]);mesh.userData.sourceVertices=shape.sourceVertices;}
 for(const [name,shape] of Object.entries(asset.details)){const material=name==='shirt'?materials.shirt:materials.jacket;material.side=THREE.DoubleSide;addMesh(root,geometry(shape),material,name==='shirt'?'체형에 맞춘 셔츠 앞판':'체형에 맞춘 노치 라펠');}
 const surface=(x,y)=>{
  let front=-Infinity;
  for(const name of ['jacket','shirt']){const p=asset.parts[name].positions;for(let i=0;i<p.length;i+=3){if(Math.abs(p[i]-x)<.03&&Math.abs(p[i+1]-y)<.025)front=Math.max(front,p[i+2]);}}
  return Number.isFinite(front)?front+.003:.40;
 };
 const patch=(points,mat,name)=>panel(root,points.map(([x,y,lift=0])=>[x,y,surface(x,y)+lift]),mat,name);
 // A continuous collar stand covers the stepped neckline of the dressed body.
 const collarPositions=[],collarUvs=[],collarIndices=[],collarSegments=64;
 for(let row=0;row<2;row++)for(let j=0;j<=collarSegments;j++){
  const angle=j/collarSegments*Math.PI*2,top=row===1;
  collarPositions.push(Math.sin(angle)*(top?.070:.087),top?1.164:1.132,(top?.386:.360)+Math.cos(angle)*(top?.057:.084));collarUvs.push(j/collarSegments,row);
  if(!top&&j<collarSegments){const n=j;collarIndices.push(n,n+1,n+collarSegments+1,n+1,n+collarSegments+2,n+collarSegments+1);}
 }
 addMesh(root,geometry({positions:collarPositions,uv:collarUvs,indices:collarIndices}),materials.shirt,'연결된 셔츠 칼라 밴드');
 for(const sign of [-1,1]){
  patch([[sign*.004,1.133,.009],[sign*.035,1.139,.003],[sign*.050,1.095,.010],[sign*.018,1.071,.014]],materials.shirt,'목에 맞춘 셔츠 칼라');
 }
 const button=new THREE.MeshStandardMaterial({color:'#303135',roughness:.45});
 for(let i=0;i<5;i++){const y=1.065-i*.045;sphere(root,[0,y,surface(0,y)+.006],[.0034,.0034,.0015],button,'셔츠 단추');}
 sphere(root,[.048,.835,surface(.048,.835)+.004],[.008,.008,.002],button,'정장 앞 단추');
 curve(root,[[.095,1.005,surface(.095,1.005)+.003],[.17,1.010,surface(.17,1.01)+.003]],.0018,materials.jacket,'가슴 주머니 봉제선',4);
 const face=head(root,data.head,profile,1,true);face.root.position.fromArray(asset.headPosition);face.root.scale.set(asset.headScale*profile.headWidth,asset.headScale,asset.headScale);
 return {root,headRoot:face.root,uniforms:face.uniforms,garmentUniforms:null,face,texture:null,skinMaterials:[materials.skin,face.skinMaterial]};
}
function person(data,profile,index){
 const root=new THREE.Group();root.name=profile.name;root.position.set(profile.x,0,-.18);
 const coat=textile(profile.jacket,index===2),shirt=textile(profile.shirt),skin=new THREE.MeshStandardMaterial({color:profile.skin,roughness:.73}),dark=new THREE.MeshStandardMaterial({color:'#171b20',roughness:.9}),button=new THREE.MeshStandardMaterial({color:'#24262a',roughness:.48});
 const garmentUniforms={garmentPhoto:{value:null},hasGarmentPhoto:{value:0},garmentPoseInverse:{value:new THREE.Matrix4()}};
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
 return {root,headRoot:face.root,uniforms:face.uniforms,garmentUniforms,face,texture:null,skinMaterials:[skin,face.skinMaterial]};
}
export function buildCharacter(data,index,seatedAsset=null){
 const p=index===1&&seatedAsset?anatomicalPerson(data,profiles[index],seatedAsset):person(data,profiles[index],index);
 const upper=new THREE.Group();upper.name='허리 위 반응 관절';upper.position.set(0,.70,.18);p.root.add(upper);p.root.updateMatrixWorld(true);
 for(const child of [...p.root.children])if(child!==upper&&!/바지|구두/.test(child.name))upper.attach(child);
 p.upperRoot=upper;p.root.updateMatrixWorld(true);p.upperRest=upper.matrixWorld.clone();return p;
}
// Heads face the seated applicant, while small independent gestures leave long
// still periods. Pose ownership stays here so conversation reactions cannot drift.
export function createInterviewerMotion(people,{target=new THREE.Vector3(0,1.25,3.42),reducedMotion=false}={}){
 const forward=new THREE.Vector3(0,0,1),noise=(i,n,salt)=>{const v=Math.sin((i+1)*17.31+n*83.7+salt*11.13)*43758.5453;return v-Math.floor(v);};
 let elapsed=0,lastTime=null,lastPaint=-Infinity,mood='idle',anger=0,heat=0,heatFrom=0,heatStart=0,tremorStart=-Infinity,tremorDuration=0,tremorSettled=true;
 const states=people.map((p,i)=>{
  const head=p.headRoot,position=head.position.clone();head.parent.updateWorldMatrix(true,false);
  const localTarget=head.parent.worldToLocal(target.clone()),eyeOffset=new THREE.Vector3(0,.172,.040).multiply(head.scale),look=new THREE.Quaternion();
  // Account for the eye position above the neck pivot rather than aiming the neck.
  for(let n=0;n<5;n++){const eye=eyeOffset.clone().applyQuaternion(look).add(position);look.setFromUnitVectors(forward,localTarget.clone().sub(eye).normalize());}
  return {head,position,look,person:p,index:i,cycle:0,nextAt:1.2+i*2.6,gesture:null};
 });
 function apply(){
  let changed=false;
  for(const s of states){
   const reactionTime=elapsed-tremorStart,weight=s.index===1?1:s.index===0?.72:.62;
   const reacting=!reducedMotion&&!tremorSettled&&anger>0&&reactionTime>=0&&reactionTime<tremorDuration;
   const upper=s.person.upperRoot;
   if(upper){
    const attack=reacting?Math.sin(Math.PI*THREE.MathUtils.clamp((reactionTime-s.index*.035)/.62,0,1))**2:0;
    const shake=reacting?Math.sin(reactionTime*25+s.index)*Math.exp(-reactionTime*1.8)*smooth(0,.06,reactionTime):0;
    const tilt=attack*(.045+.080*anger)*weight;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt,shake*.025*anger*weight,shake*.018*anger*weight,'YXZ'));
    const y=.70+attack*.100*weight,z=.18+attack*.035*weight;
    if(upper.quaternion.angleTo(q)>1e-7||Math.abs(upper.position.y-y)>1e-8||Math.abs(upper.position.z-z)>1e-8){upper.position.set(0,y,z);upper.quaternion.copy(q);changed=true;}
    upper.updateWorldMatrix(true,false);
    s.person.garmentUniforms?.garmentPoseInverse?.value.copy(s.person.upperRest).multiply(upper.matrixWorld.clone().invert());
    // Keep the applicant in sight while the torso moves underneath the neck.
    const localTarget=upper.worldToLocal(target.clone()),eyeOffset=new THREE.Vector3(0,.172,.040).multiply(s.head.scale),look=new THREE.Quaternion();
    for(let n=0;n<5;n++){const eye=eyeOffset.clone().applyQuaternion(look).add(s.position);look.setFromUnitVectors(forward,localTarget.clone().sub(eye).normalize());}s.look.copy(look);
   }
   const g=s.gesture,u=g?THREE.MathUtils.clamp((elapsed-g.start)/g.duration,0,1):0,e=g?Math.sin(Math.PI*u)**2:0;
   let pitch=0,yaw=0,roll=0;
   if(g){if(g.kind===0)pitch=.024*e;else if(g.kind===1){roll=.018*e*g.sign;pitch=.006*e;}else yaw=.022*e*g.sign;}
   const offended=s.index===1&&mood==='offended',position=s.position.clone();position.y+=.0015*e;if(offended){position.z+=.025;pitch-=.045;}
   const progress=(elapsed-tremorStart)/tremorDuration;
   if(!reducedMotion&&!tremorSettled&&anger>0&&progress>=0&&progress<1){
    const edge=smooth(0,.08,progress)*(1-smooth(.72,1,progress)),weight=s.index===1?1:s.index===0?.65:.55,amp=(.002+anger*.012)*edge*weight,phase=s.index*1.7,t=elapsed-tremorStart;
    position.x+=amp*Math.sin(t*(7+anger*2)*Math.PI*2+phase);position.y+=amp*.35*Math.sin(t*8.3*Math.PI*2+phase);
    yaw+=amp*4*Math.sin(t*7.1*Math.PI*2+phase);roll+=amp*2.5*Math.sin(t*9.2*Math.PI*2+phase);
   }
   const q=s.look.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ')));
   if(s.head.position.distanceToSquared(position)>1e-12||s.head.quaternion.angleTo(q)>1e-6){s.head.position.copy(position);s.head.quaternion.copy(q);changed=true;}
  }
  return changed;
 }
 apply();
 return {
  update(time,{paused=false}={}){
   if(!Number.isFinite(time))return false;
   const dt=lastTime===null?0:Math.min(.1,Math.max(0,time-lastTime));lastTime=time;
   if(paused)return false;elapsed+=dt;
   for(const s of states)if(!reducedMotion&&!s.gesture&&elapsed>=s.nextAt){const n=s.cycle++;s.gesture={start:elapsed,duration:1.7+noise(s.index,n,1),kind:n%3,sign:noise(s.index,n,2)<.5?-1:1};}
   const heating=Math.abs(heat-anger)>1e-7;
   if((!states.some(s=>s.gesture)&&!heating&&tremorSettled)||elapsed-lastPaint<1/24)return false;lastPaint=elapsed;
   const nextHeat=THREE.MathUtils.lerp(heatFrom,anger,smooth(0,.65,elapsed-heatStart)),heatChanged=Math.abs(nextHeat-heat)>1e-7;heat=nextHeat;
   const changed=apply()||heatChanged;
   if(elapsed>=tremorStart+tremorDuration)tremorSettled=true;
   for(const s of states)if(s.gesture&&elapsed-s.gesture.start>=s.gesture.duration){s.gesture=null;s.nextAt=elapsed+5+noise(s.index,s.cycle,3)*5;}
   return changed;
  },
  get heat(){return heat;},
  setAnger(value){value=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,1):0;if(value===anger)return false;anger=value;heatFrom=heat;heatStart=elapsed;tremorStart=elapsed;tremorDuration=1.4+2.4*anger;tremorSettled=reducedMotion||anger===0;if(anger===0){heat=0;heatFrom=0;tremorStart=-Infinity;}apply();return true;},
  setMood(value){if(mood===value)return false;mood=value;return apply();},
  setReducedMotion(value){value=!!value;if(value===reducedMotion)return false;reducedMotion=value;if(value)tremorSettled=true;for(const s of states){s.gesture=null;s.nextAt=elapsed+1.2+s.index*2.6;}return apply();},
 };
}
export function createFaceController(people,{anisotropy=4,onChange=()=>{},gazeTarget,reducedMotion=false}={}){
 const motion=createInterviewerMotion(people,{target:gazeTarget,reducedMotion});
 function personAt(index){if(!Number.isInteger(index)||!people[index])throw Error('면접관을 찾지 못했어요.');return people[index];}
 function applyStyle(p,style){
  p.face.setStyle(style);const color=style==='photo'?(p.photoSkin||'#c2a38d'):style==='capybara'?'#b9967a':'#d8d9d2';
  for(const material of [...p.skinMaterials,p.face.neckMaterial])if(material!==p.face.skinMaterial)material.color.set(color);
 }
 people.forEach(p=>applyStyle(p,'basic'));
 const updateHeat=()=>people.forEach((p,i)=>p.face.setHeat(motion.heat*(i===1?1:i===0?.55:.45)));
 return {people,names:profiles.map(p=>p.name),
  getStyle(index){return personAt(index).face.style;},hasPhoto(index){return !!personAt(index).texture;},
  getPhoto(index){return personAt(index).texture?.image||null;},
  setStyle(index,style){const p=personAt(index);if(style==='photo'&&!p.texture)throw Error('사진을 먼저 골라 적용해 주세요.');applyStyle(p,style);onChange();},
  replace(index,canvas){
   const p=personAt(index),skin='#c2a38d',next=new THREE.CanvasTexture(canvas);next.colorSpace=THREE.SRGBColorSpace;next.anisotropy=anisotropy;
   const aspect=(canvas.width||1)/(canvas.height||1);p.face.photoMesh.scale.set(aspect>=1?1:aspect,aspect>=1?1/aspect:1,1);p.face.photoMesh.scale.x/=p.face.root.scale.x/p.face.root.scale.y;p.face.photoMesh.position.y=.157*(1-p.face.photoMesh.scale.y);p.face.photoMesh.material.map=next;p.face.photoMesh.material.needsUpdate=true;p.photoSkin=skin;p.uniforms.faceMap.value=next;p.uniforms.hasFace.value=1;p.texture?.dispose();p.texture=next;applyStyle(p,'photo');onChange();
  },
  restore(index){const p=personAt(index);p.texture?.dispose();p.texture=null;p.photoSkin=null;p.uniforms.faceMap.value=null;p.uniforms.hasFace.value=0;p.face.photoMesh.material.map=null;p.face.photoMesh.material.needsUpdate=true;applyStyle(p,'basic');onChange();},
  setMood(mood){people[1].face.setMood(mood);motion.setMood(mood);onChange();},
  setAnger(value){if(motion.setAnger(value)){updateHeat();onChange();}},
  update(time,options){const changed=motion.update(time,options);if(changed)updateHeat();return changed;},
  setReducedMotion(value){if(motion.setReducedMotion(value))onChange();},
  get ready(){return true;},
 };
}
export async function createInterviewers({scene,manager,anisotropy=4,onChange=()=>{},gazeTarget,reducedMotion=false}){
 const [data,image,seatedAsset]=await Promise.all([
  new THREE.FileLoader(manager).setResponseType('json').loadAsync('./assets/characters/anatomy.json'),
  new THREE.ImageLoader(manager).loadAsync('./assets/characters/reference.jpg'),
  new THREE.FileLoader(manager).setResponseType('json').loadAsync('./assets/characters/seated-human.json'),
 ]);
 const people=profiles.map((_,i)=>buildCharacter(data,i,seatedAsset));people.forEach(p=>scene.add(p.root));
 const garmentPhoto=new THREE.Texture(image);garmentPhoto.colorSpace=THREE.SRGBColorSpace;garmentPhoto.anisotropy=anisotropy;garmentPhoto.needsUpdate=true;
 people.forEach(p=>{if(p.garmentUniforms){p.garmentUniforms.garmentPhoto.value=garmentPhoto;p.garmentUniforms.hasGarmentPhoto.value=1;}});
 return createFaceController(people,{anisotropy,onChange,gazeTarget,reducedMotion});
}
