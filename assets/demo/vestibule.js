import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createSetMaterials} from './set-materials.js';
export function createVestibule(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#40494a');scene.fog=new THREE.Fog('#40494a',7,19);
 const camera=new THREE.PerspectiveCamera(49,1,.1,30);camera.position.set(-.15,1.17,4.2);camera.lookAt(.45,1.22,0);
 const surfaces=createSetMaterials(()=>{scene.userData.needsRender=true;}),materials=[],geometries=[];function box(w,h,d,c,x,y,z,parent=scene){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(.012,w*.12,h*.12,d*.12)),m=new THREE.MeshStandardMaterial({color:c,roughness:.82});geometries.push(g);materials.push(m);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;if(c==='#959e99')o.material=surfaces.plaster;else if(c==='#68716c')o.material=surfaces.floor;else if(c==='#bdc2b8'||c==='#687573')o.material=surfaces.metal;parent.add(o);return o;}
 scene.add(new THREE.HemisphereLight('#e5edf0','#38403b',1.7));const ceiling=new THREE.SpotLight('#edf2ef',35,12,1.05,.75,2);ceiling.target.position.set(.5,0,1);ceiling.castShadow=true;ceiling.shadow.mapSize.set(1024,1024);ceiling.shadow.normalBias=.012;ceiling.shadow.bias=-.0002;scene.add(ceiling.target);ceiling.position.set(0,2.75,2);scene.add(ceiling);scene.environmentIntensity=.16;const spill=new THREE.PointLight('#e6efec',10,7);spill.position.set(.65,1.65,-.75);scene.add(spill);
 box(10,.12,12,'#68716c',0,-.06,2);const leftWall=box(4.286,3,.16,'#959e99',-2.125,1.5,0);leftWall.name='출입구 왼쪽 벽';const rightWall=box(4.05,3,.16,'#959e99',3.307,1.5,0);rightWall.name='출입구 오른쪽 벽';const topWall=box(1.264,.733,.16,'#959e99',.65,2.6335,0);topWall.name='출입구 윗벽';
 const leftJamb=box(.1,2.173,.2,'#555e5b',.07,1.0865,.02);leftJamb.name='왼쪽 문틀';const rightJamb=box(.1,2.173,.2,'#555e5b',1.23,1.0865,.02);rightJamb.name='오른쪽 문틀';const header=box(1.26,.09,.2,'#555e5b',.65,2.22,.02);header.name='위쪽 문틀';
 const hinge=new THREE.Group();hinge.position.set(.12,0,.08);scene.add(hinge);const door=box(1.04,2.12,.065,'#505a58',.53,1.1,0,hinge);door.name='철문';const steel=new THREE.MeshStandardMaterial({color:'#596663',metalness:.58,roughness:.52,bumpMap:surfaces.floor.bumpMap,bumpScale:.0008});materials.push(steel);door.material=steel;box(.15,.035,.095,'#bdc2b8',.9,1.02,.1,hinge);box(.012,.06,.025,'#656f6c',.85,1.0,.07,hinge);
 const threshold=box(1.056,.025,.24,'#bdc2b8',.65,.015,.02);threshold.name='단일 문턱';box(.035,.22,.012,'#bdc2b8',.85,1.0,.04,hinge);
 for(const y of [.3,1.1,1.93])box(.025,.09,.04,'#bdc2b8',0,y,.04,hinge);

 box(.29,.12,.012,'#bdc2b8',.53,1.85,.0405,hinge);
 // Empty chairs, skirting, a fluorescent strip and a small clock.
 for(const x of [-2.3,-1.55,2.1]){box(.55,.10,.5,'#394747',x,.43,.65);box(.55,.5,.055,'#394747',x,.73,.43);for(const dx of [-.22,.22])for(const z of [.46,.86])box(.025,.42,.025,'#687573',x+dx,.21,z);}
 const leftTrim=box(4.98,.09,.04,'#606b67',-2.5,.06,.12);leftTrim.name='왼쪽 걸레받이';const rightTrim=box(3.75,.09,.04,'#606b67',3.125,.06,.12);rightTrim.name='오른쪽 걸레받이';box(1.8,.025,.16,'#e5ece5',.2,2.83,1.6);box(.27,.27,.055,'#d5d9ce',-1.25,2.12,.14);box(.012,.09,.015,'#465454',-1.25,2.16,.18);box(.08,.012,.015,'#465454',-1.21,2.12,.18);
 // Only diffuse light beyond the doorway. The actual interview room is rendered after the crossing.
 for(const [i,z] of [-.65,-1.4,-2.35].entries()){
  const geometry=new THREE.PlaneGeometry(1.08+i*.38,2.12+i*.22),material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{color:{value:new THREE.Color('#dce8e3')},alpha:{value:.055-i*.01}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 color;uniform float alpha;void main(){vec2 p=abs(vUv-.5)*2.;float soft=(1.-smoothstep(.5,1.,p.x))*(1.-smoothstep(.65,1.,p.y));gl_FragColor=vec4(color,alpha*soft);}' });
  geometries.push(geometry);materials.push(material);const glow=new THREE.Mesh(geometry,material);glow.position.set(.65,1.1,z);glow.userData.skipAO=true;glow.name=i===0?'문 안쪽 확산광':'깊이 방향 빛안개';scene.add(glow);
 }
 // Far radiance has no visible card boundary through the opening; near air stays translucent.
 const radianceGeometry=new THREE.PlaneGeometry(7,6),radianceMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{color:{value:new THREE.Vector3(1.4,1.45,1.37)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform vec3 color;void main(){vec2 p=abs(vUv-.5)*2.;float soft=(1.-smoothstep(.65,1.,p.x))*(1.-smoothstep(.7,1.,p.y));gl_FragColor=vec4(color,.98*soft);}'});
 geometries.push(radianceGeometry);materials.push(radianceMaterial);const radiance=new THREE.Mesh(radianceGeometry,radianceMaterial);radiance.position.set(.65,1.6,-4.5);radiance.userData.skipAO=true;radiance.name='문 너머 먼 확산광';scene.add(radiance);
 let lastProgress=-1;const result={scene,camera,shadowDirty:true,update(progress=0){if(progress!==lastProgress){result.shadowDirty=true;lastProgress=progress;}hinge.rotation.y=-Math.min(1,progress*2)*1.35;camera.position.set(-.15+progress*.8,1.17+Math.min(1,progress*3)*.38,4.2-progress*4.55);camera.lookAt(.65,1.35,-2.3);},dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();surfaces.dispose();for(const light of [ceiling])light.shadow.dispose();}};return result;
}
