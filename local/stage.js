export function stageMood(state={}){
 if(state.phase==='setup'||!state.phase)return 'idle';
 if(state.phase==='done')return 'finished';
 return state.angryTurns>0?'offended':'listening';
}

export function stageAnger(state={}){
 if(state.phase==='setup'||!state.phase)return 0;
 return Math.min(1,Math.max(0,Number(state.angryTurns)||0)/4);
}

export function initConversationStage({home,openFaces,invalidate,onMood=()=>{},renderer,stage,camera,environment,renderSet,reducedMotion=false,isFaceEditorOpen=()=>false}){
 let state={phase:'setup',normalTurns:0,angryTurns:0},characters=null,base=null,roomOnly=false,afterBreak=false;
 const shooting=renderer&&stage?initDialogueShooting({renderer,stage,invalidate}):null;
 const blocked=()=>roomOnly||isFaceEditorOpen();
 const cameraDrama=camera?createCameraDrama({camera,reducedMotion}):null;
 document.body.classList.toggle('camera-drama',!!cameraDrama);
 const life=renderer&&stage?initJourney({renderer,camera,home,invalidate,environment,renderSet,canPresent:()=>!blocked(),onPause(value){shooting?.setPaused(value||blocked());return value||!blocked();}}):null;
 const burst=renderer&&stage?initHappinessBurst():null;
 const ui=document.getElementById('local-ui');
 const back=document.createElement('button');back.id='return-conversation';back.textContent='면접으로 돌아가기';document.getElementById('toolbar').prepend(back);
 const flash=document.createElement('div');flash.className='local-rupture';flash.setAttribute('aria-hidden','true');document.body.append(flash);
 function apply(){
  cameraDrama?.setState(state);
  const mood=stageMood(state),offended=mood==='offended',anger=stageAnger(state);onMood(mood,anger);
  if(state.phase==='setup')afterBreak=false;else if(state.phase==='angry')afterBreak=true;
  document.body.classList.toggle('dialogue-original',afterBreak);
  shooting?.setState({...state,afterBreak,line:document.getElementById('line')?.textContent||''});
  burst?.setState(state);life?.setState({...state,afterBreak});if(life?.active)shooting?.setPaused(true);
  document.body.style?.setProperty('--anger-level',String(anger));
  if(state.phase==='setup'){document.body.classList.toggle('happiness-impact',false);flash.classList.remove('fire');}
  document.body.classList.toggle('interview-broken',state.phase==='angry'||state.angryTurns>0);
  if(characters&&base){
   characters.setMood?.(mood);
   characters.setAnger?.(anger);
   // The live controller composes gaze, idle gestures and the offended pose.
   // Keep the old transform fallback for integrations without that controller.
   if(!characters.update){const head=characters.people[1].headRoot;head.position.copy(base.position);head.rotation.copy(base.rotation);if(offended){head.position.z+=.025;head.rotation.x-=.045;}}
  }
  invalidate();
 }
 function resume(){if(!blocked())life?.resume();shooting?.setPaused(blocked()||life?.active);if(!blocked()&&!life?.active)document.dispatchEvent(new CustomEvent('interview:resume'));}
 function showRoom(value){if(renderer?.shadowMap)renderer.shadowMap.needsUpdate=true;roomOnly=value;shooting?.setPaused(value);document.body.classList.toggle('room-mode',value);ui.inert=value;if(value){cameraDrama?.suspend();life?.pause();document.dispatchEvent(new CustomEvent('interview:pause'));}else{home();resume();}invalidate();}
 document.getElementById('local-room').onclick=()=>showRoom(true);back.onclick=()=>showRoom(false);
 document.getElementById('local-faces').onclick=()=>{cameraDrama?.suspend();life?.pause();shooting?.setPaused(true);document.dispatchEvent(new CustomEvent('interview:pause'));openFaces();};
 document.addEventListener('interview:state',event=>{
  const next=event.detail;
  if(state.phase==='normal'&&next.phase==='angry'){
   document.body.classList.toggle('happiness-impact',false);flash.classList.remove('fire');
   const button=document.getElementById('happiness'),rect=button?.getBoundingClientRect?.();
   const impact=next.impact||(rect?.width>0?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,size:rect.width}:null);
   if(impact&&Number.isFinite(impact.x)&&Number.isFinite(impact.y)){flash.style?.setProperty('--impact-x',`${impact.x}px`);flash.style?.setProperty('--impact-y',`${impact.y}px`);flash.style?.setProperty('--impact-size',`${Math.max(24,Math.min(160,impact.size||90))}px`);}
   void flash.offsetWidth;flash.classList.add('fire');document.body.classList.toggle('happiness-impact',true);
  }
  state={...next};apply();
 });
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&roomOnly)showRoom(false);});
 return {
  get state(){return {...state};},get animating(){return false;},get exclusive(){return !roomOnly&&!!life?.exclusive;},get presentationPaused(){return !!life?.active;},render(){if(!roomOnly&&life?.exclusive)life.render();else shooting?.render();},update(now,options={}){if(roomOnly)return false;const moved=cameraDrama?.update(now,{paused:options.paused||life?.cameraPaused})||false;if(life?.exclusive)return life.update(now,options)||moved;if(life?.active){life.update(now,options);return moved;}life?.update(now,options);return shooting?.update(now,options)||moved;},resume,
  setReducedMotion(value){if(cameraDrama?.setReducedMotion(value))invalidate();},
  setCharacters(value){characters=value;const head=value.people[1].headRoot;base={position:head.position.clone(),rotation:head.rotation.clone()};apply();},
 };
}
import {initDialogueShooting} from '../game.js';
import {initJourney} from '../assets/demo/journey.js';


import {initHappinessBurst} from '../assets/demo/happiness-burst.js';
import {createCameraDrama} from '../assets/demo/camera-drama.js';
