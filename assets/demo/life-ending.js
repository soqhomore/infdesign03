import { LIFE_CHOICES } from './life-data.js';

import {createRainBedroom} from './rain-bedroom.js';
export function createLifeScene(id){return createRainBedroom(id);}

export function initLifeEnding({renderer,invalidate,onPause=()=>{},canPresent=()=>true}){
 let state={phase:'setup'},afterBreak=false,selected=null,set=null,preview=false,active=false,previousFocus=null,lastFrame=-Infinity,pending=false;
 const canvasLabel=renderer.domElement.getAttribute?.('aria-label')||'실시간으로 렌더링되는 3D 면접실';
 const dialog=document.createElement('dialog');dialog.id='life-dialog';dialog.setAttribute('aria-labelledby','life-title');
 dialog.innerHTML=`<div class="life-picker"><button class="life-close" aria-label="닫기">×</button><p class="life-eyebrow">끝 장면 데모</p><h2 id="life-title">어느 장면으로 갈까요?</h2><div class="life-choices"></div><details class="life-sources"><summary>수집 자료와 대사 구분</summary><p>선택 제목·3D 장면·끝 대사는 이 데모를 위한 창작입니다. 아래는 그 바탕이 된 공개 발언의 일부입니다. 발언자가 실제로 이 장면을 살았다는 뜻은 아닙니다.</p><p>이번 수집: 취업 이유 직접 발언 10건 · 8개 URL. 맥락 자료 7건은 별도입니다. 목적표집으로, 사람 수·전체 취준생의 비율·공감 순위를 뜻하지 않습니다.</p><div class="life-source-list"></div></details></div><section class="life-last" hidden aria-label="선택한 생활의 한 장면"><h2 id="life-last-line" tabindex="-1"></h2><nav><button class="life-other">다른 장면</button><button class="life-return">면접으로</button></nav></section>`;
 document.body.append(dialog);
 const picker=dialog.querySelector('.life-picker'),last=dialog.querySelector('.life-last'),line=dialog.querySelector('#life-last-line');
 const opener=document.createElement('button');opener.id='life-preview';opener.type='button';opener.textContent='끝 장면 데모';document.querySelector('.start-actions').append(opener);
 const choose=document.createElement('button');choose.id='life-choose';choose.type='button';choose.textContent='끝 장면 고르기';choose.hidden=true;document.getElementById('local-ui').append(choose);
 const emit=paused=>{if(onPause(paused)!==false)document.dispatchEvent(new CustomEvent(paused?'interview:pause':'interview:resume'));};
 function clear(){set?.dispose();set=null;renderer.domElement.setAttribute?.('aria-label',canvasLabel);document.body.classList.remove('life-ending');}
 function showPicker(isPreview=false){preview=isPreview;clear();picker.hidden=false;last.hidden=true;dialog.classList.remove('showing-ending');dialog.setAttribute('aria-labelledby','life-title');
  if(!active){previousFocus=document.activeElement;active=true;dialog.showModal();emit(true);}invalidate();
 }
 function showEnding(choice){selected=choice.id;clear();set=createLifeScene(choice.id);renderer.domElement.setAttribute?.('aria-label',choice.title+' — 3D 생활 장면');picker.hidden=true;last.hidden=false;line.textContent=choice.line;dialog.classList.add('showing-ending');dialog.setAttribute('aria-labelledby','life-last-line');document.body.classList.add('life-ending');
  if(!active){previousFocus=document.activeElement;active=true;dialog.showModal();emit(true);}line.focus();invalidate();
 }
 function close(){dialog.close();}
 function presentPending(){if(!pending||state.phase!=='done'||!canPresent())return;pending=false;const choice=LIFE_CHOICES.find(c=>c.id===selected);if(choice)showEnding(choice);else showPicker(false);}
 dialog.addEventListener('close',()=>{active=false;clear();emit(false);invalidate();const focus=state.phase==='done'?document.getElementById('again'):previousFocus;if(focus?.isConnected&&!focus.hidden)focus.focus();});
 dialog.querySelector('.life-close').onclick=close;dialog.querySelector('.life-return').onclick=close;dialog.querySelector('.life-other').onclick=()=>showPicker(preview);
 opener.onclick=()=>showPicker(true);choose.onclick=()=>showPicker(false);
 for(const choice of LIFE_CHOICES){
  const button=document.createElement('button');button.type='button';button.dataset.life=choice.id;button.textContent=choice.title;button.onclick=()=>{selected=choice.id;choose.textContent=choice.title+' · 바꾸기';if(preview||state.phase==='done')showEnding(choice);else close();};dialog.querySelector('.life-choices').append(button);
  const item=document.createElement('p'),quote=document.createElement('q'),link=document.createElement('a'),note=document.createElement('small');quote.textContent=choice.source.quote;link.textContent=`${choice.source.platform} · ${choice.source.date} · ${choice.source.id}`;link.href=choice.source.url;link.target='_blank';link.rel='noopener noreferrer';note.textContent=choice.source.note||'개별 공개 발언의 일부 발췌';item.append(quote,link,note);dialog.querySelector('.life-source-list').append(item);
 }
 return {
  get active(){return active;},get exclusive(){return !!set;},
  setState(next){const prev=state;state={...next};if(next.phase==='angry')afterBreak=true;
   if(next.phase==='setup'&&prev.phase!=='setup'){afterBreak=false;selected=null;pending=false;choose.textContent='끝 장면 고르기';if(active)close();}
   choose.hidden=!afterBreak||!['angry','done'].includes(next.phase);
   if(next.phase==='done'&&prev.phase!=='done'&&afterBreak){pending=true;queueMicrotask(presentPending);}
  },
  resume:presentPending,
  update(now,{paused=false}={}){if(!set||paused||now-lastFrame<1/24)return false;lastFrame=now;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;set.update(now,reduced);return !reduced;},
  render(){if(!set)return;const rect=renderer.domElement.getBoundingClientRect();set.camera.aspect=rect.width/rect.height;set.camera.updateProjectionMatrix();const saved=renderer.autoClear;renderer.autoClear=true;renderer.render(set.scene,set.camera);renderer.autoClear=saved;},
 };
}
