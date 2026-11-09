import { initInterview } from './game.js';
import { createInterviewers } from './characters.js';
import { initFaceEditor } from './face-editor.js';
import { createRenderSchedule } from './render-policy.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// All dimensions are metres. The reference photograph determines the home camera.
const stage=document.querySelector('#stage');
const scene=new THREE.Scene();
const renderSchedule=createRenderSchedule();
scene.background=new THREE.Color('#d9e0e4');
const camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,0.045,65);
const homePosition=new THREE.Vector3(0,1.25,3.42);
const homeTarget=new THREE.Vector3(0,1.22,-.8);
let renderer;
try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
}catch(error){
  document.querySelector('#loading p').textContent='이 브라우저에서 3D 화면을 시작하지 못했어요';
  document.querySelector('#load-detail').textContent='하드웨어 가속을 켠 Chrome 또는 Safari에서 다시 열어 주세요.';
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;
renderer.shadowMap.needsUpdate=true;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
renderer.outputColorSpace=THREE.SRGBColorSpace;
stage.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','실시간으로 렌더링되는 3D 면접실');
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.075;
controls.enablePan=true;controls.minDistance=.5;controls.maxDistance=9;
controls.maxPolarAngle=Math.PI*.49;controls.minPolarAngle=.2;
controls.enabled=false;
controls.addEventListener('change',()=>renderSchedule.invalidate());
camera.position.copy(homePosition);controls.target.copy(homeTarget);camera.lookAt(homeTarget);

let seed=8357;
function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
const manager=new THREE.LoadingManager();
const failedAssets=[];
manager.onProgress=(url,loaded,total)=>document.querySelector('#load-detail').textContent=`재질 ${loaded} / ${total}`;
manager.onError=url=>failedAssets.push(url);
const loader=new THREE.TextureLoader(manager);
const anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
function texture(file,repeat=[1,1],color=false){
  const t=loader.load(`./assets/${file}`);t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(...repeat);t.anisotropy=anisotropy;
  if(color)t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
function canvasTexture(width,height,paint,color=false){
  const c=document.createElement('canvas');c.width=width;c.height=height;
  paint(c.getContext('2d'),width,height);
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;
  if(color)t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
const grain=canvasTexture(512,512,(ctx,w,h)=>{
  const image=ctx.createImageData(w,h);
  for(let i=0;i<image.data.length;i+=4){const v=115+random()*35;image.data[i]=image.data[i+1]=image.data[i+2]=v;image.data[i+3]=255;}
  ctx.putImageData(image,0,0);
});
grain.repeat.set(5,5);
const laminateRoughness=canvasTexture(1024,1024,(ctx,w,h)=>{
  ctx.fillStyle='#a5a5a5';ctx.fillRect(0,0,w,h);
  for(let i=0;i<7000;i++){
    const v=105+random()*85;ctx.strokeStyle=`rgba(${v},${v},${v},${.06+random()*.15})`;
    const x=random()*w,y=random()*h;ctx.lineWidth=.2+random()*.65;
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*50,y+random()*4-2);ctx.stroke();
  }
});
laminateRoughness.repeat.set(2.2,1.5);
const weave=canvasTexture(256,256,(ctx,w,h)=>{
  ctx.fillStyle='#969695';ctx.fillRect(0,0,w,h);
  for(let i=0;i<w;i+=4){ctx.fillStyle=i%8===0?'#858584':'#adadab';ctx.fillRect(i,0,1,h);}
  for(let j=0;j<h;j+=4){ctx.fillStyle=j%8===0?'#aaaaa8':'#858584';ctx.globalAlpha=.5;ctx.fillRect(0,j,w,1);}
  ctx.globalAlpha=1;
});
weave.repeat.set(9,15);
const meshFabric=canvasTexture(128,128,(ctx,w,h)=>{
  ctx.fillStyle='#9c9f9d';ctx.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){ctx.fillStyle='#080a09';ctx.fillRect(x+1,y+1,5,6);}
});meshFabric.repeat.set(1.8,2.5);
const brickMat=new THREE.MeshStandardMaterial({
  map:texture('brick-color.jpg',[3.2,.52],true),normalMap:texture('brick-normal.jpg',[3.2,.52]),
  roughnessMap:texture('brick-roughness.jpg',[3.2,.52]),aoMap:texture('brick-ao.jpg',[3.2,.52]),
  normalScale:new THREE.Vector2(.8,.8),roughness:1,color:'#fff6eb',aoMapIntensity:.8
});
const sideBrick=brickMat.clone();
for(const key of ['map','normalMap','roughnessMap','aoMap']){sideBrick[key]=brickMat[key].clone();sideBrick[key].repeat.set(2.8,1.6);}
const woodMat=new THREE.MeshStandardMaterial({map:texture('wood-color.jpg',[3,.23],true),normalMap:texture('wood-normal.jpg',[3,.23]),roughnessMap:texture('wood-roughness.jpg',[3,.23]),normalScale:new THREE.Vector2(.2,.2),roughness:.7,color:'#b18a60'});
const tableMat=new THREE.MeshPhysicalMaterial({color:'#6597bc',roughness:.47,metalness:.03,clearcoat:.16,clearcoatRoughness:.46,roughnessMap:laminateRoughness,bumpMap:grain,bumpScale:.00065});
const silver=new THREE.MeshStandardMaterial({color:'#b6bdc1',metalness:.82,roughness:.36});
const graphite=new THREE.MeshStandardMaterial({color:'#252a2c',roughness:.61,metalness:.12,bumpMap:grain,bumpScale:.001});
const black=new THREE.MeshStandardMaterial({color:'#111416',roughness:.75,metalness:.02});
const fabric=new THREE.MeshStandardMaterial({color:'#343a3e',roughness:.98,bumpMap:weave,bumpScale:.002});
const blindMat=new THREE.MeshStandardMaterial({color:'#a9adaa',roughness:.96,bumpMap:weave,bumpScale:.0009,side:THREE.DoubleSide});
const plaster=new THREE.MeshStandardMaterial({color:'#d3d1cb',roughness:.99,bumpMap:grain,bumpScale:.0018});
const floorMat=new THREE.MeshStandardMaterial({color:'#8c908d',roughness:.9,bumpMap:grain,bumpScale:.003});
const paper=new THREE.MeshStandardMaterial({color:'#f5f3ec',roughness:.93});
const meshMat=new THREE.MeshStandardMaterial({color:'#414748',roughness:.93,alphaMap:meshFabric,alphaTest:.3,bumpMap:meshFabric,bumpScale:.0003,side:THREE.DoubleSide});
function mesh(geometry,material,name,parent=scene){
  const m=new THREE.Mesh(geometry,material);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(name,size,pos,mat,parent=scene,radius=0){
  const geometry=radius?new RoundedBoxGeometry(...size,3,radius):new THREE.BoxGeometry(...size);
  const m=mesh(geometry,mat,name,parent);m.position.set(...pos);return m;
}
function tube(name,points,radius,mat,parent=scene){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve,28,radius,8,false),mat,name,parent);
}
function rod(name,a,b,radius,mat,parent=scene){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const m=mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),12),mat,name,parent);
  m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}

// A fully modelled shell, rather than a backdrop image.
const room=new THREE.Group();room.name='면접실 건축';scene.add(room);
box('바닥',[7,.12,8],[0,-.07,1],floorMat,room);
box('뒷벽 벽돌',[6.9,.87,.18],[0,.43,-1.76],brickMat,room);
box('왼쪽 벽돌 벽',[.18,3.6,7.4],[-3.4,1.8,1.6],sideBrick,room);
box('오른쪽 벽',[.18,3.6,7.4],[3.4,1.8,1.6],plaster,room);
box('천장',[6.9,.12,7.4],[0,3.55,1.6],plaster,room);
box('벽 하단 걸레받이',[6.7,.09,.025],[0,.045,-1.65],graphite,room);
box('목재 창턱',[6.65,.075,.24],[0,.89,-1.61],woodMat,room,.015);
box('창턱 앞 목재',[6.65,.11,.028],[0,.825,-1.475],woodMat,room,.008);
const outside=new THREE.MeshBasicMaterial({color:'#e5f2fc',toneMapped:false});
box('창밖 확산광',[6.6,3.1,.03],[0,2.4,-1.91],outside,room);
const blinds=[];
const glass=new THREE.MeshPhysicalMaterial({color:'#dce6e6',transparent:true,opacity:.12,roughness:.12,metalness:.08,side:THREE.DoubleSide,depthWrite:false});
for(let i=0;i<4;i++){
  const x=-2.505+i*1.67;
  box(`창 ${i+1} 유리`,[1.59,2.75,.012],[x,2.27,-1.81],glass,room);
  for(const dx of [-.823,.823])box('알루미늄 창틀',[.044,2.8,.072],[x+dx,2.28,-1.70],silver,room,.004);
  box('창문 하단 프레임',[1.64,.04,.075],[x,.96,-1.70],silver,room,.004);
  box('블라인드 상단 레일',[1.59,.055,.06],[x,3.50,-1.57],silver,room,.012);
  const panel=mesh(new THREE.PlaneGeometry(1.57,2.49,16,40),blindMat,`회색 롤 블라인드 ${i+1}`,room);
  panel.position.set(x,2.245,-1.565);
  // Very slight natural bow in the hanging fabric.
  const attr=panel.geometry.attributes.position;
  for(let j=0;j<attr.count;j++){const u=attr.getX(j)/1.57,v=attr.getY(j)/2.49;attr.setZ(j,.007*Math.sin((u+.5)*Math.PI)*Math.sin((v+.5)*Math.PI));}
  panel.geometry.computeVertexNormals();panel.castShadow=true;
  const bar=box('블라인드 무게추',[1.575,.016,.018],[x,1.001,-1.56],silver,room,.003);
  const inner={panel,bar,baseHeight:2.49};blinds.push(inner);
  // Discrete bead chain and a wall-mounted pull loop.
  for(let j=0;j<51;j++){
    const bead=mesh(new THREE.SphereGeometry(.0032,5,4),silver,'블라인드 체인',room);
    bead.position.set(x+.801,2.15-j*.014,-1.52);bead.castShadow=false;
  }
  rod('창문 손잡이',[x+.795,1.63,-1.66],[x+.795,1.70,-1.66],.013,graphite,room);
}

const tables=new THREE.Group();tables.name='연결된 파란 회의 책상';scene.add(tables);
for(let side=0;side<2;side++){
  const x=(side===0?-1:1)*1.40;
  const group=new THREE.Group();group.name=`회의 책상 ${side+1}`;group.position.x=x;tables.add(group);
  box('라운드 알루미늄 테두리',[2.80,.052,1.97],[0,.728,1.22],silver,group,.055);
  box('파란 라미네이트 상판',[2.79,.026,1.96],[0,.763,1.22],tableMat,group,.053);
  for(let i=0;i<3;i++){
    const trim=box('적층 테두리 세부선',[2.798,.002,1.968],[0,.714+i*.012,1.22],i===1?graphite:silver,group,.049);
    trim.castShadow=false;
  }
  box('상판 하부 프레임',[2.45,.06,1.38],[0,.662,1.12],graphite,group,.009);
  for(const dx of [-1.06,1.06]){
    for(const dz of [-.55,.55]){
      box('책상 사각 금속 다리',[.045,.64,.045],[dx,.33,1.12+dz],silver,group,.005);
      box('책상 고무 발',[.052,.025,.052],[dx,.014,1.12+dz],black,group,.006);
    }
    box('책상 가로 보강대',[.035,.035,1.1],[dx,.27,1.12],silver,group,.005);
  }
}

const chairs=[];
function chair(x,angle=0){
  const g=new THREE.Group();g.name='검정 메쉬 회전 의자';g.position.set(x,0,-.24);g.rotation.y=angle;scene.add(g);chairs.push(g);
  // Five-star swivel base, cylinder, forked casters.
  rod('의자 중심축',[0,.08,0],[0,.43,0],.028,silver,g);
  rod('가스 실린더',[0,.1,0],[0,.33,0],.041,graphite,g);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,px=Math.sin(a)*.32,pz=Math.cos(a)*.32;
    rod('의자 오발',[0,.12,0],[px,.065,pz],.023,graphite,g);
    const caster=new THREE.Group();caster.position.set(px,.045,pz);caster.rotation.y=a;g.add(caster);
    for(const dx of [-.027,.027]){
      const wheel=mesh(new THREE.CylinderGeometry(.041,.041,.028,16),black,'의자 바퀴',caster);wheel.rotation.z=Math.PI/2;wheel.position.x=dx;
    }
  }
  box('좌판 하부',[.59,.045,.54],[0,.43,-.015],graphite,g,.06);
  box('패브릭 쿠션',[.64,.105,.575],[0,.49,.015],fabric,g,.075);
  tube('등받이 지지대',[[0,.38,-.17],[0,.51,-.31],[0,.76,-.35]],.033,graphite,g);
  // Gently bowed mesh with physically open holes and a tubular perimeter.
  const geo=new THREE.PlaneGeometry(.555,.66,28,28),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const px=pos.getX(i),py=pos.getY(i);pos.setZ(i,.045*(1-(px/.28)**2)+.03*Math.cos(py*4));
  }geo.computeVertexNormals();
  const back=mesh(geo,meshMat,'등받이 메쉬',g);back.position.set(0,1.035,-.355);back.rotation.x=.10;back.castShadow=false;
  function roundedPath(path,w,h,r){
    const x=-w/2,y=-h/2;path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);return path;
  }
  const rim=roundedPath(new THREE.Shape(),.615,.745,.07);
  rim.holes.push(roundedPath(new THREE.Path(),.552,.68,.042));
  const frame=mesh(new THREE.ExtrudeGeometry(rim,{depth:.028,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.007,bevelThickness:.006,curveSegments:8}),graphite,'등받이 둘레 프레임',g);
  frame.position.set(0,1.035,-.377);frame.rotation.x=.10;
  const lumbar=box('허리 받침',[.42,.055,.035],[0,.86,-.39],graphite,g,.025);
  for(const sign of [-1,1]){
    tube('팔걸이 기둥',[[sign*.24,.43,-.17],[sign*.36,.50,-.15],[sign*.36,.69,-.12]],.021,graphite,g);
    box('팔걸이 패드',[.085,.04,.32],[sign*.36,.715,-.02],black,g,.028);
  }
  return g;
}
chair(-1.81,.035);chair(0,0);chair(1.81,-.055);


const shadowTexture=canvasTexture(256,256,(ctx,w,h)=>{
  const gradient=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  gradient.addColorStop(0,'rgba(0,0,0,.42)');gradient.addColorStop(.4,'rgba(0,0,0,.25)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
});
for(const x of [-1.81,0,1.81]){
  const contact=mesh(new THREE.PlaneGeometry(1.25,1.05),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,toneMapped:false}),'의자 바닥 접촉 음영');
  contact.rotation.x=-Math.PI/2;contact.position.set(x,.002,-.24);contact.castShadow=false;
}

// Small scale cues on the table: paper fibres, printed forms and pens.
function formTexture(){
  return canvasTexture(512,724,(ctx,w,h)=>{
    ctx.fillStyle='#f6f4ed';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#727776';ctx.font='600 17px sans-serif';ctx.fillText('INTERVIEW',42,53);
    ctx.fillStyle='#9b9d98';ctx.fillRect(42,72,428,1);
    for(let row=0;row<12;row++){
      const y=112+row*45;ctx.fillStyle='#777c7a';ctx.fillRect(43,y,22+random()*50,2);
      for(let j=0;j<3;j++){ctx.fillStyle='#b4b6ae';ctx.fillRect(43,y+10+j*6,230+random()*170,1);}
    }
    ctx.strokeStyle='#aaa';ctx.lineWidth=.7;ctx.strokeRect(42,655,428,36);
  },true);
}
const formMat=new THREE.MeshStandardMaterial({map:formTexture(),roughness:.92});
for(let i=0;i<3;i++){
  const x=[-1.8,0,1.8][i],g=new THREE.Group();g.name='면접 서류';g.position.set(x,.780,1.02);g.rotation.y=[-.08,.04,-.12][i];scene.add(g);
  box('서류 종이 더미',[.305,.004,.424],[0,0,0],paper,g,.002);
  const form=mesh(new THREE.PlaneGeometry(.297,.42),formMat,'평가 양식',g);form.rotation.x=-Math.PI/2;form.position.y=.003;
  if(i===2){box('노트 표지',[.32,.008,.44],[0,-.007,0],graphite,g,.003);}
  const penColor=new THREE.MeshStandardMaterial({color:i===2?'#cbd83f':'#30383d',metalness:i===2?.15:.7,roughness:.31});
  const p=new THREE.Group();p.position.set(.145,.012,.04);p.rotation.y=-.22;g.add(p);
  rod('펜 몸통',[0,0,-.08],[0,0,.055],.004,penColor,p);
  rod('펜 끝',[0,0,.055],[0,0,.071],.002,silver,p);
  rod('펜 클립',[.003,.004,-.075],[.003,.004,-.038],.001,silver,p);
}
for(const x of [-1.14,1.14]){
  const g=new THREE.Group();g.name='소형 탁상 마이크';g.position.set(x,.79,1.36);g.rotation.y=x<0?.12:-.1;scene.add(g);
  box('마이크 받침',[.055,.012,.072],[0,0,0],black,g,.014);
  rod('마이크 몸체',[0,.012,-.015],[0,.065,-.045],.014,graphite,g);
  const cap=mesh(new THREE.SphereGeometry(.018,16,12),fabric,'마이크 스펀지',g);cap.scale.set(1,1.1,1);cap.position.set(0,.069,-.048);
}

// Physically based illumination. Rectangular sources give broad, believable highlights.
RectAreaLightUniformsLib.init();
scene.add(new THREE.HemisphereLight('#e7f0ff','#b4a087',.50));
const ceilingLight=new THREE.RectAreaLight('#fff5df',2.5,4.6,2.7);
ceilingLight.position.set(0,3.32,1.0);ceilingLight.lookAt(0,.7,.3);scene.add(ceilingLight);
const frontFill=new THREE.RectAreaLight('#f3f6ff',1.5,5.4,2.2);
frontFill.position.set(0,2.2,3.7);frontFill.lookAt(0,1,-.5);scene.add(frontFill);
const windowLights=[];
for(let i=0;i<4;i++){
  const light=new THREE.RectAreaLight('#dcecff',2.4,1.5,2.25);light.position.set(-2.505+i*1.67,2.3,-1.45);light.lookAt(light.position.x,.9,2);scene.add(light);windowLights.push(light);
}
const sun=new THREE.DirectionalLight('#fff3dc',1.6);
sun.position.set(-3,5.5,-.9);sun.target.position.set(1,0,1.7);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;
sun.shadow.camera.near=.1;sun.shadow.camera.far=14;sun.shadow.normalBias=.012;sun.shadow.bias=-.0001;sun.shadow.radius=3;
scene.add(sun,sun.target);
const softKey=new THREE.DirectionalLight('#eef2ff',.8);softKey.position.set(2,4,4);softKey.target.position.set(0,.4,0);softKey.castShadow=true;
softKey.shadow.mapSize.set(2048,2048);softKey.shadow.camera.left=-4;softKey.shadow.camera.right=4;softKey.shadow.camera.top=4;softKey.shadow.camera.bottom=-4;softKey.shadow.camera.far=14;softKey.shadow.normalBias=.009;softKey.shadow.radius=4;scene.add(softKey,softKey.target);
const pmrem=new THREE.PMREMGenerator(renderer);
const envScene=new RoomEnvironment();const envTarget=pmrem.fromScene(envScene,.04);scene.environment=envTarget.texture;scene.environmentIntensity=.23;envScene.dispose();pmrem.dispose();

const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
const aoPass=new SSAOPass(scene,camera,innerWidth,innerHeight,16);
aoPass.kernelRadius=.15;aoPass.minDistance=.001;aoPass.maxDistance=.18;
composer.addPass(aoPass);composer.addPass(new OutputPass());
const fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);
function resize(){
  const width=stage.clientWidth,height=stage.clientHeight;
  camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);composer.setSize(width,height);
  const dpr=renderer.getPixelRatio();fxaa.uniforms.resolution.value.set(1/(width*dpr),1/(height*dpr));
  renderSchedule.invalidate();
}
resize();addEventListener('resize',resize);
let orbitMode=false,frames=0,ready=false,uiHidden=false;
function notice(message){const el=document.querySelector('#notice');el.textContent=message;el.classList.add('visible');clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.classList.remove('visible'),2300);}
function home(){
  orbitMode=false;controls.enabled=false;camera.position.copy(homePosition);controls.target.copy(homeTarget);camera.lookAt(homeTarget);
  renderSchedule.invalidate();
  document.querySelector('#home').classList.add('active');document.querySelector('#orbit').classList.remove('active');
  document.querySelector('#hint').textContent='사진을 참고한 세 면접관 · 둘러보기로 입체 형태를 확인할 수 있어요';
}
document.querySelector('#home').onclick=home;
document.querySelector('#orbit').onclick=()=>{
  orbitMode=true;controls.enabled=true;controls.target.set(0,.9,.1);
  document.querySelector('#orbit').classList.add('active');document.querySelector('#home').classList.remove('active');
  document.querySelector('#hint').textContent='드래그하여 둘러보기 · 휠로 거리 조절 · 지원자 시점으로 돌아가기';
};
document.querySelector('#settings-toggle').onclick=()=>{document.querySelector('#settings').hidden=!document.querySelector('#settings').hidden;};
document.querySelector('#close-settings').onclick=()=>document.querySelector('#settings').hidden=true;
document.querySelector('#exposure').oninput=e=>{renderer.toneMappingExposure=Number(e.target.value);document.querySelector('#exposure-value').textContent=Number(e.target.value).toFixed(2);renderSchedule.invalidate();};
function setBlinds(value){
  const lift=Number(value)/100;
  blinds.forEach(({panel,bar,baseHeight})=>{const height=baseHeight*(1-lift);panel.scale.y=1-lift;panel.position.y=3.49-height/2;bar.position.y=3.49-height;});
  windowLights.forEach(l=>l.intensity=3+lift*4);
  renderer.shadowMap.needsUpdate=true;renderSchedule.invalidate();
}
document.querySelector('#blinds').oninput=e=>{setBlinds(e.target.value);document.querySelector('#blinds-value').textContent=e.target.value+'%';};
document.querySelector('#ao').onchange=e=>{aoPass.enabled=e.target.checked;renderSchedule.invalidate();};
document.querySelector('#quality').onchange=e=>{renderer.setPixelRatio(e.target.checked?Math.min(devicePixelRatio,1.65):1);aoPass.kernelRadius=e.target.checked?.15:.1;resize();};
document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('브라우저의 전체화면 기능을 사용해 주세요.');}};
document.querySelector('#capture').onclick=()=>{
  composer.render();const a=document.createElement('a');a.download='interview-room.png';a.href=renderer.domElement.toDataURL('image/png');a.click();notice('현재 시점의 이미지를 저장했어요.');
};
function toggleUI(hidden){uiHidden=hidden;document.querySelector('header').hidden=hidden;document.querySelector('#toolbar').hidden=hidden;document.querySelector('#hint').hidden=hidden;document.querySelector('#settings').hidden=true;document.querySelector('#show-ui').hidden=!hidden;}
document.querySelector('#hide-ui').onclick=()=>toggleUI(true);document.querySelector('#show-ui').onclick=()=>toggleUI(false);
addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.key==='Escape'){document.querySelector('#settings').hidden=true;home();}if(e.key.toLowerCase()==='h')toggleUI(!uiHidden);});
function animate(){
  requestAnimationFrame(animate);if(document.hidden)return;
  if(orbitMode)controls.update();
  if(!renderSchedule.shouldRender({ready,animated:game.animating}))return;
  composer.render();game.render();frames++;
}
document.addEventListener('visibilitychange',()=>renderSchedule.invalidate());
// Inspection hook for verification, not a product control.
let characters=null,faceEditor=null;
window.__room={scene,camera,renderer,composer,controls,home,setBlinds,failedAssets,get characters(){return characters;},get ready(){return ready;},get frames(){return frames;},get objectCount(){let n=0;scene.traverse(o=>{if(o.isMesh)n++;});return n;}};
manager.onLoad=async()=>{
  try{await renderer.compileAsync(scene,camera);}catch(e){console.warn('Shader preparation:',e);}
  ready=true;document.querySelector('#loading').classList.add('done');
  document.querySelector('#load-detail').textContent='준비 완료';
  if(failedAssets.length)notice('일부 재질을 불러오지 못했어요. 로컬 서버로 실행 중인지 확인해 주세요.');
};
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();notice('3D 연결이 끊겼어요. 새로고침해 주세요.');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{renderer.shadowMap.needsUpdate=true;renderSchedule.invalidate();});
const game=initInterview({renderer,stage,home,openFaces:()=>faceEditor?.open()});
manager.itemStart('면접관 모델');
createInterviewers({scene,manager,anisotropy,onChange:()=>renderSchedule.invalidate()}).then(result=>{
  characters=result;faceEditor=initFaceEditor(result);
  renderer.shadowMap.needsUpdate=true;renderSchedule.invalidate();
  document.querySelector('#faces-toggle').disabled=false;document.querySelector('#game-faces').disabled=false;
}).catch(error=>{
  console.error('면접관 모델 로딩:',error);failedAssets.push('면접관 모델');
  notice('면접관을 불러오지 못했어요. 새로고침해 주세요.');
}).finally(()=>manager.itemEnd('면접관 모델'));
animate();
