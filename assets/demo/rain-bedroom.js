import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSetMaterials} from './set-materials.js';
import {createDuvetGeometry} from './bedding.js';
import {momentProgress} from './life-moment.js';
export function createRainBedroom(id='ott'){
 const scene=new THREE.Scene();scene.name='하루 끝, 내가 바라던 작은 생활';scene.background=new THREE.Color('#6b736a');scene.fog=new THREE.Fog('#8a8d7a',5,13);
 const camera=new THREE.PerspectiveCamera(45,1,.1,25);camera.position.set(-.15,1.65,3.8);camera.lookAt(0,.85,-.65);
 const surfaces=createSetMaterials(()=>{scene.userData.needsRender=true;}),mats=new Map();function material(color,extra={}){const key=color+JSON.stringify(extra);if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,...extra}));return mats.get(key);}
 function mesh(g,c,x,y,z,extra){const o=new THREE.Mesh(g,material(c,extra));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(c==='#776349'||c==='#3d443e'||c==='#4d544b')o.material=surfaces.wood;else if(c==='#4d4b41'||c==='#43453e'||c==='#393c37')o.material=surfaces.plaster;else if(c==='#828775')o.material=surfaces.fabric;scene.add(o);return o;}
 const box=(w,h,d,c,x,y,z,extra)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.009,w*.12,h*.12,d*.12)),c,x,y,z,extra);
 const ball=(r,c,x,y,z)=>mesh(new THREE.SphereGeometry(r,20,14),c,x,y,z);
 const cyl=(r,h,c,x,y,z)=>mesh(new THREE.CylinderGeometry(r,r,h,32),c,x,y,z);
 scene.add(new THREE.HemisphereLight('#d5ddcb','#83715a',.65));
 const deskLight=new THREE.SpotLight('#e8dfc6',14,5,.95,.7,2);deskLight.target.position.set(-1.0,.6,-.65);deskLight.castShadow=true;deskLight.shadow.mapSize.set(1024,1024);deskLight.shadow.normalBias=.008;deskLight.shadow.bias=-.0001;scene.add(deskLight.target);scene.environmentIntensity=.07;deskLight.position.set(-1.6,1.34,-1.1);scene.add(deskLight);
 const windowLight=new THREE.RectAreaLight('#fff3d7',2.1,1.35,1.5);windowLight.position.set(-1.25,1.6,-1.69);windowLight.lookAt(-.8,.5,1);scene.add(windowLight);
 const restLight=new THREE.PointLight('#e5bb85',.35,3,2);restLight.position.set(.15,.9,.1);scene.add(restLight);
 const sunlight=new THREE.DirectionalLight('#fff0cc',2.2);sunlight.name='창으로 들어오는 햇빛';sunlight.position.set(-1.5,2.4,-1.5);sunlight.target.position.set(.9,0,.8);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);Object.assign(sunlight.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.05,far:8});sunlight.shadow.camera.updateProjectionMatrix();sunlight.shadow.normalBias=.008;sunlight.shadow.bias=-.0001;scene.add(sunlight,sunlight.target);
 const sunPatchMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:new THREE.Color('#ffe8b0')}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 color;void main(){vec2 p=abs(vUv-.5)*2.;float edge=(1.-smoothstep(.8,1.,p.x))*(1.-smoothstep(.87,1.,p.y));float frame=smoothstep(.014,.04,abs(vUv.x-.5));gl_FragColor=vec4(color,.18*edge*frame);}'});
 const sunPatch=new THREE.Mesh(new THREE.PlaneGeometry(1.35,2.7),sunPatchMaterial);sunPatch.name='바닥에 비친 창빛';sunPatch.position.set(.1,-.008,.75);sunPatch.rotation.set(-Math.PI/2,0,-.65);sunPatch.userData.skipAO=true;scene.add(sunPatch);
 const screenLight=new THREE.PointLight('#b3cbd5',.7,1.8,2);screenLight.position.set(-.85,1.05,-.7);scene.add(screenLight);
 box(6,.1,7,'#403b32',0,-.06,0);box(6,3.5,.1,'#4d4b41',0,1.7,-1.91);box(.1,3.5,7,'#43453e',-2.13,1.7,.5);box(.1,3.5,7,'#393c37',2.13,1.7,.5);
 // Recessed dark window, sill, and curtains catching only the desk light.
 box(1.55,1.78,.09,'#6c6e65',-1.25,1.65,-1.8);box(1.36,1.57,.04,'#bfcfc9',-1.25,1.65,-1.74,{emissive:'#d7e0c9',emissiveIntensity:.35});box(.035,1.57,.05,'#727b72',-1.25,1.65,-1.70);box(1.65,.06,.3,'#7c7e6c',-1.25,.78,-1.67);
 for(const side of [-1,1])for(let i=0;i<6;i++){const curtain=box(.075,2.1,.07,'#5c5c4f',-1.25+side*(.78+i*.035),1.56,-1.60+(i%2)*.025);curtain.rotation.z=side*.008;}
 const skyMaterial=new THREE.ShaderMaterial({depthWrite:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;void main(){vec3 sky=mix(vec3(.80,.79,.64),vec3(.49,.67,.71),smoothstep(0.,1.,vUv.y));float glow=exp(-length((vUv-vec2(.28,.62))*vec2(2.4,1.5))*2.5);sky=mix(sky,vec3(.98,.88,.66),glow*.7);float city=step(vUv.y,.07+.025*floor(mod(vUv.x*13.,3.)));sky=mix(sky,vec3(.47,.55,.52),city*.48);gl_FragColor=vec4(sky,1.);}`});
 const sky=new THREE.Mesh(new THREE.PlaneGeometry(1.32,1.53),skyMaterial);sky.name='창밖의 맑은 하늘';sky.position.set(-1.25,1.65,-1.715);sky.userData.skipAO=true;scene.add(sky);
 // Thin skirting and real feet anchor furniture to the floor rather than leaving gaps.
 box(4.18,.065,.025,'#77796a',0,.022,-1.84);box(.025,.065,5.9,'#77796a',2.065,.022,1.1);

 // Desk and a plain lamp: most of the room stays unlit.
 box(1.8,.065,.88,'#776349',-1.05,.73,-1);for(const x of [-1.82,-.28])for(const z of [-1.34,-.66])box(.035,.7,.035,'#353b36',x,.35,z);
 cyl(.14,.025,'#686e61',-1.69,.78,-1.22);box(.025,.45,.025,'#7a7e70',-1.69,1.02,-1.22);const shade=mesh(new THREE.ConeGeometry(.17,.24,32,1,true),'#858978',-1.62,1.31,-1.19);shade.rotation.z=.28;ball(.025,'#fff0cc',-1.62,1.23,-1.19).material=material('#fff0cc',{emissive:'#e8dcc0',emissiveIntensity:1});
 box(.72,.035,.46,'#282f31',-.85,.79,-.88);
 const screenHinge=new THREE.Group();screenHinge.position.set(-.85,.795,-1.08);screenHinge.rotation.x=-.1;scene.add(screenHinge);
 const lid=box(.72,.45,.025,'#242c2e',0,0,0);screenHinge.add(lid);lid.position.set(0,.225,0);
 const screen=box(.65,.37,.012,'#a3bdc8',0,0,0,{emissive:'#95acba',emissiveIntensity:.6});screenHinge.add(screen);screen.position.set(0,.225,.024);screen.castShadow=false;
 const screenRows=[];for(let i=0;i<5;i++){const row=box(.25+(i%2)*.13,.008,.005,'#607c8e',0,0,0);screenHinge.add(row);row.position.set(-.08,.345-i*.045,.034);screenRows.push(row);}
 const notebook=box(.38,.035,.48,'#aba58a',-.35,.79,-.88);notebook.rotation.y=-.18;const pen=box(.015,.015,.3,'#4b5750',-.35,.82,-.88);if(id==='food'||id==='gift'){notebook.visible=false;pen.visible=false;}
 for(let i=0;i<4;i++){const book=box(.48,.025,.38,['#595d4f','#74725e','#494e46','#686756'][i],-1.54,.79+i*.03,-.6);book.rotation.y=i*.08;}
 cyl(.085,.14,'#827e68',-1.14,.84,-.57);cyl(.072,.005,'#393226',-1.14,.913,-.57);
 box(.55,.07,.5,'#454b43',-.85,.4,-.08);box(.55,.48,.045,'#424b45',-.85,.67,.12);for(const x of [-1.07,-.63])for(const z of [-.27,.11])box(.025,.4,.025,'#363d39',x,.2,z);
 // One padded cloth surface wraps a rounded mattress; no intersecting side planes.
 const rug=box(1.85,.008,2.65,'#aaa68e',.90,-.005,.02);rug.name='침대 아래 낮은 직물 러그';rug.material=material('#aaa68e',{roughness:1,bumpMap:surfaces.fabric.bumpMap,bumpScale:.0006});rug.castShadow=false;
 for(const x of [.43,1.47])for(const z of [-1.15,.59]){const leg=box(.065,.09,.065,'#393e35',x,.025,z);leg.name='침대 받침 다리';}
 box(1.3,.24,2.15,'#3d443e',.95,.15,-.28);
 const mattress=mesh(new RoundedBoxGeometry(1.27,.17,2.1,4,.06),'#c4c0ac',.95,.36,-.28);mattress.name='둥근 모서리 매트리스';
 box(1.35,.72,.06,'#4d544b',.95,.48,-1.38);
 const linen=material('#c7c2b0',{bumpMap:surfaces.fabric.bumpMap,bumpScale:.0014,roughness:1}),pillowLinen=material('#d4cebb',{bumpMap:surfaces.fabric.bumpMap,bumpScale:.0012,roughness:1});
 for(const [index,x]of [.64,1.25].entries()){
  const g=new RoundedBoxGeometry(.55,.13,.4,4,.06),p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+.012*Math.exp(-(p.getX(i)**2/.04+p.getZ(i)**2/.02))*n.getY(i));g.computeVertexNormals();
  const pillow=mesh(g,'#d4cebb',x,.51,-1.05+index*.035);pillow.material=pillowLinen;pillow.rotation.y=index?-.09:.035;
  const points=[[-.215,0,-.197],[.215,0,-.197],[.272,0,-.14],[.272,0,.14],[.215,0,.197],[-.215,0,.197],[-.272,0,.14],[-.272,0,-.14]].map(p=>new THREE.Vector3(...p));
  const seam=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true,'centripetal'),64,.0009,3,true),material('#aca792',{roughness:1}));seam.name='베개 가장자리 봉제선';pillow.add(seam);
 }
 const duvet=mesh(createDuvetGeometry(),'#c7c2b0',.95,0,0);duvet.material=linen;duvet.name='부드러운 입체 이불';
 for(let i=0;i<7;i++){const photo=box(.13,.15,.007,i%2?'#5a5a4b':'#666959',.25+(i%3)*.16,1.15+Math.floor(i/3)*.17,-1.846);photo.rotation.z=(i%3-1)*.08;}
 // Separate book pages/covers, a keyboard deck and small practical objects.
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){const key=box(.058,.005,.038,'#323c3f',-1.1+col*.071,.812,-1.02+row*.055);key.castShadow=false;}
 box(.2,.002,.11,'#69716f',-.85,.812,-.71);
 const phone=box(.075,.008,.15,'#242e31',-1.3,.8,-1.26);phone.rotation.y=.2;
 const props=new THREE.Group();props.name='내가 누리는 작은 일';scene.add(props);scene.userData.wish=id;
 let foodLid=null,callScreen=null,movie=null;
 if(id==='food'){
  const tray=box(.36,.02,.24,'#a69d7e',-.36,.7725,-.75);props.add(tray);for(const x of [-.534,-.186])props.add(box(.012,.07,.24,'#a69d7e',x,.8075,-.75));for(const z of [-.864,-.636])props.add(box(.36,.07,.012,'#a69d7e',-.36,.8075,z));
  for(let i=0;i<3;i++){const dumpling=ball(.045,'#c6b88d',-.46+i*.09,.812,-.75);dumpling.scale.set(1,.65,.8);props.add(dumpling);}
  foodLid=new THREE.Group();foodLid.position.set(-.36,.855,-.87);props.add(foodLid);const cover=box(.37,.018,.25,'#bdb59c',0,0,0);foodLid.add(cover);cover.position.set(0,0,.125);
  for(const x of [-.59,-.56]){const stick=box(.009,.009,.26,'#8c7251',x,.796,-.75);props.add(stick);}
 }
 if(id==='gift'){
  props.add(box(.33,.1,.24,'#85725e',-.35,.83,-.99));props.add(box(.23,.035,.15,'#4c392b',-.35,.9,-.99));
  callScreen=box(.066,.002,.135,'#243d40',-1.3,.805,-1.26,{emissive:'#79a59b',emissiveIntensity:0});callScreen.rotation.y=.2;callScreen.name='전화하며 안부 묻기';props.add(callScreen);
 }
 if(id==='steady'){
  const key=mesh(new THREE.TorusGeometry(.025,.007,8,20),'#99916c',-.36,.824,-.74);key.rotation.x=Math.PI/2;props.add(key);props.add(box(.012,.01,.08,'#99916c',-.36,.824,-.69));
 }
 if(id==='career'){props.add(box(.12,.018,.08,'#888b76',-.3,.8,-.43));}
 if(id==='ott'){
  movie=new THREE.ShaderMaterial({uniforms:{progress:{value:0},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float progress;uniform float time;void main(){vec3 sky=mix(vec3(.08,.18,.22),vec3(.46,.55,.50),vUv.y);float hill=.25+.06*sin(vUv.x*7.+time*.1);vec3 c=mix(vec3(.07,.17,.13),sky,smoothstep(hill-.01,hill+.01,vUv.y));float sun=1.-smoothstep(.09,.1,length(vUv-vec2(.72,.68)));c=mix(c,vec3(.75,.62,.35),sun);gl_FragColor=vec4(mix(vec3(.025),c,progress),1.);}`});screen.material=movie;for(const row of screenRows)row.visible=false;screen.name='보고 싶던 한 편';
 }
 let elapsed=0,last=null,lastProgress=-1;
 return{scene,camera,shadowDirty:true,update(now,reduced=false,lifeTime){const dt=last===null?0:Math.min(.05,Math.max(0,now-last));last=now;if(!reduced)elapsed+=dt;
 const progress=momentProgress(lifeTime??elapsed,reduced);scene.userData.momentProgress=progress;
 deskLight.color.setRGB(1,.84,.61);deskLight.intensity=8+2*progress;restLight.intensity=.35+.65*progress;
 if(movie){movie.uniforms.progress.value=progress;movie.uniforms.time.value=elapsed;}
 if(foodLid)foodLid.rotation.x=-progress*1.7;
 if(callScreen)callScreen.material.emissiveIntensity=progress*.45;
 if(id==='career'){screen.material.emissiveIntensity=.6+progress*.18;for(let i=0;i<screenRows.length;i++)screenRows[i].scale.x=1+progress*(i%2?.18:.32);}
 if(id==='steady'){screenHinge.rotation.x=-.1+progress*1.55;screenLight.intensity=.7*(1-progress);}
 if(progress!==lastProgress){this.shadowDirty=true;lastProgress=progress;}
},dispose(){const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});for(const g of geometries)g.dispose();for(const m of materials)if(![surfaces.wood,surfaces.plaster,surfaces.floor,surfaces.fabric,surfaces.metal].includes(m))m.dispose();for(const m of mats.values())if(!materials.has(m))m.dispose();surfaces.dispose();deskLight.shadow.dispose();sunlight.shadow.dispose();}};
}
