import * as THREE from 'three';
import {BURST_MS} from './happiness-burst.js';
const clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// Owns only additive interview-camera movement. Lobby/ending/orbit cameras stay untouched.
export function createCameraDrama({camera,reducedMotion=false}){
 let state={phase:'setup'},owned=false,elapsed=0,last=null,lastPaint=-Infinity,replyAt=-Infinity,level=0,fromLevel=0,levelAt=0;
 const base={position:new THREE.Vector3(),rotation:new THREE.Quaternion(),fov:camera.fov},offset=new THREE.Vector3(),rotation=new THREE.Quaternion(),euler=new THREE.Euler(0,0,0,'YXZ');
 function write(x=0,y=0,z=0,pitch=0,yaw=0,roll=0,fov=base.fov){
  offset.set(x,y,z).applyQuaternion(base.rotation).add(base.position);rotation.copy(base.rotation).multiply(new THREE.Quaternion().setFromEuler(euler.set(pitch,yaw,roll,'YXZ')));
  const changed=camera.position.distanceToSquared(offset)>1e-14||camera.quaternion.angleTo(rotation)>1e-7||Math.abs(camera.fov-fov)>1e-7;
  if(!changed)return false;camera.position.copy(offset);camera.quaternion.copy(rotation);if(Math.abs(camera.fov-fov)>1e-7){camera.fov=fov;camera.updateProjectionMatrix();}camera.updateMatrixWorld();return true;
 }
 function restore(){return owned?write():false;}
 function currentLevel(){return THREE.MathUtils.lerp(fromLevel,level,smooth((elapsed-levelAt)/.8));}
 return{
  setState(next){
   const previous=state;state={...next};
   if(next.phase!=='angry'){this.reset();return;}
   if(previous.phase!=='angry'){
    base.position.copy(camera.position);base.rotation.copy(camera.quaternion);base.fov=camera.fov;owned=true;elapsed=0;last=null;lastPaint=-Infinity;replyAt=-Infinity;level=fromLevel=0;levelAt=0;
   }
   const nextLevel=clamp((Number(next.angryTurns)||0)/4,0,1);
   if(nextLevel!==level){fromLevel=currentLevel();level=nextLevel;replyAt=Math.max(elapsed,BURST_MS/1000);levelAt=replyAt;lastPaint=-Infinity;}
  },
  update(now,{paused=false}={}){
   if(!Number.isFinite(now))return false;const dt=last===null?0:clamp(now-last,0,.05);last=now;
   if(!owned)return false;if(paused||reducedMotion)return restore();elapsed+=dt;
   if(elapsed-lastPaint<1/30)return false;lastPaint=elapsed;
   const a=currentLevel(),t=elapsed,shock=t<1.4?Math.exp(-4.8*t)*smooth(t/.035)*(1-smooth((t-1)/.4)):0;
   const rt=elapsed-replyAt,pulse=rt>=0&&rt<1.1?Math.sin(Math.PI*clamp(rt/.24,0,1))*Math.exp(-rt*1.8):0;
   const shudder=rt>=0&&rt<1.3?Math.sin(rt*33)*Math.exp(-rt*3)*smooth(rt/.025):0;
   return write(shock*.075*Math.sin(t*34)+shudder*.016*a,shock*.042*Math.sin(t*27)-pulse*.015*a,shock*.18-a*.16-pulse*.065*a,
    shock*.018*Math.sin(t*25)-pulse*.017*a,shock*.016*Math.cos(t*31)+shudder*.008*a,shock*.028*Math.sin(t*32)+shudder*.01*a,base.fov+shock*12-a*2.8-pulse*1.5*a);
  },
  suspend(){last=null;return restore();},
  reset(){const changed=restore();owned=false;last=null;elapsed=0;replyAt=-Infinity;level=fromLevel=0;return changed;},
  setReducedMotion(value){reducedMotion=!!value;last=null;lastPaint=-Infinity;return reducedMotion?restore():false;},
 };
}
