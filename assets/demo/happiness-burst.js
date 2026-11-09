export const BURST_MS=1450;
export const BURST_LINES=['으아아아악!!!!!','에라 모르겠다!!'];
export function isHappinessBreak(previous,next){return previous?.phase==='normal'&&next?.phase==='angry';}
export function initHappinessBurst({random=Math.random}={}){
 const layer=document.createElement('div');layer.id='happiness-burst';layer.setAttribute('aria-hidden','true');layer.hidden=true;
 const word=document.createElement('span');word.className='happiness-burst-word';layer.append(word);document.body.append(layer);
 let animation=null,generation=0,current={phase:'setup'},running=false,manuallyPaused=false;
 function clear(){generation++;animation?.cancel();animation=null;layer.hidden=true;running=false;}
 function play(){clear();word.textContent=BURST_LINES[Math.min(BURST_LINES.length-1,Math.floor(random()*BURST_LINES.length))];layer.hidden=false;running=true;const ticket=generation,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frames=reduced?[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}]:[
   {transform:'translateX(-115vw) rotate(-9deg) scale(.82)',opacity:1},
   {transform:'translateX(-3vw) rotate(-4deg) scale(1.07)',opacity:1,offset:.27},
   {transform:'translateX(3vw) rotate(-3deg) scale(1)',opacity:1,offset:.61},
   {transform:'translateX(115vw) rotate(7deg) scale(.88)',opacity:0}];
  animation=word.animate(frames,{duration:BURST_MS,easing:'cubic-bezier(.2,.65,.3,1)',fill:'both'});
  animation.onfinish=()=>{if(ticket!==generation)return;clear();};if(document.hidden||manuallyPaused)animation.pause();
 }
 document.addEventListener('interview:pause',e=>{if(e.detail?.kind==='happiness-transition')return;manuallyPaused=true;animation?.pause();});
 document.addEventListener('interview:resume',()=>{manuallyPaused=false;if(!document.hidden)animation?.play();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)animation?.pause();else if(!manuallyPaused)animation?.play();});
 return{setState(next){if(next.phase==='setup'||next.phase==='done')clear();else if(isHappinessBreak(current,next))play();current={...next};},get running(){return running;}};
}
