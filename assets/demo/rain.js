import * as THREE from 'three';
// One batch of outdoor streaks and one procedural glass pane, clipped to the window.
export function createWindowRain({x=-2,y=1.85,z=-2.43,width=1.28,height=1.85,count=180}={}){
 const group=new THREE.Group();group.name='창밖의 비와 유리창 물방울';const seeds=Array.from({length:count},(_,i)=>({x:((i*73)%count)/count,y:((i*47)%count)/count,speed:.55+(i%7)*.08}));
 const points=new Float32Array(count*6),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));const material=new THREE.LineBasicMaterial({color:'#aabfc7',transparent:true,opacity:.28,depthWrite:false});group.add(new THREE.LineSegments(geometry,material));
 const glassGeometry=new THREE.PlaneGeometry(width,height),glassMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;
 void main(){vec2 p=vUv*vec2(19.,24.);float row=floor(p.x);p.y+=time*(.16+fract(sin(row*12.7)*437.1)*.15);vec2 cell=fract(p)-.5;float d=length(cell*vec2(1.6,.65));float ring=smoothstep(.10,.14,d)-smoothstep(.15,.19,d);float bead=1.-smoothstep(.02,.12,d);gl_FragColor=vec4(.57,.65,.68,ring*.14+bead*.08);}`});const glass=new THREE.Mesh(glassGeometry,glassMaterial);glass.position.set(x,y,z+.008);group.add(glass);
 function update(t=0){for(let i=0;i<count;i++){const seed=seeds[i],fall=((seed.y-t*seed.speed)%1+1)%1,px=x+(seed.x-.5)*width,py=y+(fall-.5)*height,stroke=Math.min(.075,(fall*height));points.set([px,py,z,Math.max(x-width/2,px-.013),py-stroke,z],i*6);}geometry.attributes.position.needsUpdate=true;glassMaterial.uniforms.time.value=t;}
 update();return{group,update,dispose(){geometry.dispose();material.dispose();glassGeometry.dispose();glassMaterial.dispose();}};
}
