import {JOURNEY_DATA} from './journey-data.js';
import {wishForRecord,returnWish} from './journey-model.js';
import {LIFE_CHOICES} from './life-data.js';
import {createLifeScene} from './life-ending.js';
import {createVestibule} from './vestibule.js';
import {BURST_MS} from './happiness-burst.js';
import {entryTransition} from './entry-flow.js';
import {createEntrySound} from './entry-sound.js';
export function initJourney({renderer,invalidate,onPause,environment,renderSet,canPresent=()=>true,home,camera}){
 const $=id=>document.getElementById(id),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let mode='before',wish=null,state={phase:'setup'},set=createVestibule(),time=0,last=null,enterResolve=null,pending=false,auto=!reduced(),menuOpen=false,wideTime=0,creditPosition=0,lastSetPaint=-Infinity;
 let closingElapsed=0,closingDuration=0;
 const root=document.createElement('section');root.id='journey';root.innerHTML=`<section id="before"><p class="journey-kicker">면접 대기 중</p><h1>왜 일하고 싶어요?</h1><div id="wish-cloud" aria-label="사람들이 남긴 다양한 취업 이유"></div><div id="wish-edit" hidden><p id="wish-source" hidden></p><blockquote id="wish-original" hidden></blockquote><textarea id="wish-text" maxlength="600" rows="3" readonly aria-label="내가 남길 말"></textarea><div class="wish-tools"><button id="wish-modify">내 말로 바꾸기</button><button id="wish-mic">말로 바꾸기</button><a id="wish-link" target="_blank" rel="noopener noreferrer">출처</a><button id="wish-back">다른 말 보기</button></div><small id="wish-voice-note" class="wish-voice-note" hidden>음성 인식은 브라우저 서비스로 전송될 수 있어요.</small><p id="wish-error" role="status"></p><button id="wish-confirm" disabled>이 말을 남기기</button><p id="journey-mode-note"></p></div><div id="journey-start" hidden></div><button id="before-archive">모든 말 보기</button></section><div id="door-invitation" hidden><p id="entry-caption" role="status" aria-live="polite"></p><button id="open-interview-door" hidden>들어가기</button></div><section id="journey-life" hidden><h2 id="journey-life-line" tabindex="-1"></h2><button id="life-continue">계속</button></section><section id="journey-credits" hidden><div class="credit-controls"><button id="credits-play">일시정지</button><button id="credits-archive">모든 말 다시 보기</button><button id="journey-reset">처음으로</button></div><div id="credits-scroll" tabindex="0" aria-label="사람들이 남긴 말. 직접 스크롤하거나 문장을 선택해 멈춰 읽을 수 있어요."><h2>사람들이 남긴 말</h2><div id="credits-rows"></div><p class="credit-tail">수집한 공개 발언의 일부 발췌<br>생활 장면과 끝 대사는 창작입니다.</p></div></section><div id="journey-transition" aria-hidden="true"></div>`;document.body.append(root);
 const archive=document.createElement('dialog');archive.id='journey-archive';archive.setAttribute('aria-labelledby','archive-title');archive.innerHTML='<button id="archive-close">닫기</button><h2 id="archive-title">모든 말 다시 보기</h2><div id="archive-explainer"><p class="archive-relation">면접에서 추천되는 말과,<br>사람들이 일하고 싶은 여러 이유.</p><details class="archive-method"><summary>이 자료에 관하여</summary><p>수집한 발췌 자료입니다. A는 면접 가이드 추천 예시, B는 다른 사람들이 남긴 공개 발언입니다. 동일인의 겉말·속마음을 비교한 자료가 아닙니다. 면접관 대사·생활 장면·끝 대사는 창작입니다. 목적표집이며 사람 수나 전체 취준생의 비율을 뜻하지 않습니다.</p></details></div><div id="archive-content"></div>';document.body.append(archive);
 const pause=document.createElement('button');pause.id='journey-pause';pause.textContent='일시정지';pause.hidden=true;document.body.append(pause);
 const menu=document.createElement('dialog');menu.id='journey-menu';menu.setAttribute('aria-label','면접 일시정지');const options=document.createElement('details');options.innerHTML='<summary>연결·장면 설정</summary><div id="entry-options"><label for="wish-scene">마지막 생활 장면</label><select id="wish-scene"></select></div>';menu.append(options);const resume=document.createElement('button');resume.textContent='계속하기';menu.append(resume);document.body.append(menu);
 for(const id of ['sound','voice-test','voice-status','sfx','local-faces','local-room','end','history-panel'])if($(id))menu.append($(id));
 for(const sel of ['.start-actions','.setup-details','#setup-note']){const el=document.querySelector(sel);if(el)$('entry-options').append(el);}
 $('start-ai').textContent='들어가기';$('start-demo').textContent='로컬 대사로 들어가기';
 for(const c of LIFE_CHOICES){const o=document.createElement('option');o.value=c.id;o.textContent=c.title;$('wish-scene').append(o);}
 let config=window.__interviewConfig||null,selectedRecord=null;
 const entrySound=createEntrySound({effects:()=>$('sfx')?.getAttribute?.('aria-pressed')!=='false',voice:()=>$('sound')?.getAttribute?.('aria-pressed')!=='false'});
 function configure(value){config=value&&!value.error?value:null;$('wish-confirm').disabled=!config;$('journey-mode-note').textContent=config?(config.aiAvailable?'면접에서 보낸 답변은 AI 서비스로 전송됩니다.':'미리 준비된 대사로 진행됩니다.'): (value?.error||'연결을 확인하고 있어요.');}
 configure(config);
 $('wish-confirm').onclick=()=>{if(config)(config.aiAvailable?$('start-ai'):$('start-demo')).click();};
 $('wish-modify').onclick=()=>{stopMic();$('wish-text').readOnly=false;$('wish-text').focus();};
 $('wish-back').onclick=()=>{stopMic();$('wish-edit').hidden=true;document.body.classList.remove('wish-selected');};
 $('wish-link').onclick=e=>{e.preventDefault();if(selectedRecord)showArchive(selectedRecord);};
 $('open-interview-door').onclick=()=>{if(mode!=='called')return;entrySound.stopCall();entrySound.breath();change('enter');foley('door');foley('walk');};
 let foleyContext=null;
 function foley(kind){if(document.hidden||$('sfx')?.getAttribute?.('aria-pressed')==='false')return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;foleyContext??=new Audio();foleyContext.resume();const ctx=foleyContext;for(const delay of (kind==='walk'?[0,.48]:[0])){const length=kind==='chair'?.32:kind==='door'?.16:.12,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*(1-i/samples.length);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=kind==='door'?1400:kind==='chair'?650:180;gain.gain.value=kind==='door'?.11:.22;source.connect(filter).connect(gain).connect(ctx.destination);source.start(ctx.currentTime+delay);}}catch{/* Audio unavailable: continue the visual journey. */}}
 const emit=(value,detail)=>{if(onPause(value||!!detail?.conversationPaused)!==false)document.dispatchEvent(new CustomEvent(value?'interview:pause':'interview:resume',{detail}));};
 const resumePresentation=()=>emit(false,wideTime>0?{conversationPaused:true}:undefined);
 function change(next){mode=next;time=0;document.body.dataset.journey=next;document.body.classList.toggle('journey-running',next==='interview');$('before').hidden=next!=='before';$('journey-life').hidden=next!=='life';$('journey-credits').hidden=next!=='credits';pause.hidden=next==='credits';$('door-invitation').hidden=!['settling','waiting','called'].includes(next);$('open-interview-door').hidden=next!=='called';root.classList.toggle('pass-through',next==='interview'||next==='seating');dispatchEvent(new Event('resize'));invalidate();}
 function replace(next){set?.dispose();set=next;if(set){set.scene.environment=environment||null;set.shadowDirty=true;}if(renderer.shadowMap)renderer.shadowMap.needsUpdate=true;invalidate();}
 function select(r){stopMic();entrySound.unlock();selectedRecord=r;document.body.classList.add('wish-selected');$('wish-text').readOnly=true;wish=wishForRecord({...r,original_excerpt:r.quote});$('wish-edit').hidden=false;$('wish-text').value=wish.text;$('wish-original').textContent=r.quote;$('wish-source').textContent=`${r.platform} · ${r.date.slice(0,10)} · 원문 일부 발췌`;$('wish-link').href=r.url;$('wish-scene').value=wish.sceneId;$('wish-error').textContent='';for(const b of $('wish-cloud').children)b.setAttribute('aria-pressed',String(b.dataset.record===r.id));}
 const direct=JOURNEY_DATA.b.filter(r=>r.role==='direct_motivation');
 for(const [i,r]of direct.entries()){const b=document.createElement('button');b.type='button';b.dataset.record=r.id;b.className='wish-block';b.style.setProperty('--drift-delay',`${-i*.8}s`);b.textContent=r.quote;b.setAttribute('aria-pressed','false');b.onclick=()=>select(r);$('wish-cloud').append(b);}
 function appendRecord(parent,r,credit=false){const article=document.createElement('article'),q=document.createElement(credit?'button':'blockquote'),meta=document.createElement('a'),note=document.createElement('small');q.textContent=r.quote||'（수집 문구 없음）';meta.textContent=`${r.platform} · ${r.date.slice(0,10)} · ${r.id}`;meta.href=r.url;meta.target='_blank';meta.rel='noopener noreferrer';note.textContent='조사 메모: '+r.note;article.append(q,meta);if(!credit){const tags=document.createElement('small');tags.className='archive-topics';tags.textContent=r.role==='guide'?(/^M/.test(r.id)?'지원동기':/^R/.test(r.id)?'퇴사·이직 이유':'단점 질문'):(r.categories||[]).join(' · ');article.append(tags);if(r.note)article.append(note);}else q.onclick=()=>{setAuto(false);showArchive(r);};parent.append(article);}
 for(const r of direct)appendRecord($('credits-rows'),r,true);
 function setAuto(value){auto=value&&!reduced();creditPosition=$('credits-scroll').scrollTop;$('credits-play').textContent=auto?'일시정지':'재생';}
 function showArchive(record){stopMic();foleyContext?.suspend();setAuto(false);$('archive-content').replaceChildren();$('archive-title').textContent=record?'공개 발언':'모든 말 다시 보기';$('archive-explainer').hidden=!!record;if(record)appendRecord($('archive-content'),record);else for(const [title,rows,kind]of [['A · 면접 가이드가 추천한 말',JOURNEY_DATA.a,'guide'],['B · 사람들이 일하고 싶은 이유',direct,'reasons'],['그 주변의 사정',JOURNEY_DATA.b.filter(r=>r.role==='context'),'context']]){const section=document.createElement('section'),h=document.createElement('h3');section.className='archive-group';section.dataset.kind=kind;h.textContent=title;section.append(h);for(const r of rows)appendRecord(section,r);$('archive-content').append(section);}archive.showModal();entrySound.pause();if(mode==='before')emit(true);}
 archive.addEventListener('close',()=>{entrySound.resume();foleyContext?.resume();last=null;});$('archive-close').onclick=()=>archive.close();for(const id of ['before-archive','credits-archive'])$(id).onclick=()=>showArchive();
 const scroll=$('credits-scroll');for(const name of ['wheel','touchstart','focusin','keydown'])scroll.addEventListener(name,()=>setAuto(false),{passive:true});$('credits-play').onclick=()=>setAuto(!auto);
 function credits(){change('credits');scroll.scrollTop=0;scroll.focus();setAuto(!reduced());}
 $('life-continue').onclick=credits;
 function reset(){if(enterResolve){enterResolve(false);enterResolve=null;}wish=null;pending=false;wideTime=0;document.body.classList.remove('journey-wide');dispatchEvent(new Event('resize'));$('wish-text').value='';$('wish-edit').hidden=true;for(const b of $('wish-cloud').children)b.setAttribute('aria-pressed','false');replace(createVestibule());document.body.classList.remove('wish-selected');entrySound.stop();change('before');home();emit(true);$('again').click();}
 $('journey-reset').onclick=reset;
 function finish(){if(!pending||!canPresent()||menu.open||archive.open||closingElapsed<closingDuration||(document.body.classList.contains?.('speaking')&&closingElapsed<12))return;pending=false;change('exit');emit(true);foley('chair');}
 function closeMenu(){menu.close();}
 pause.onclick=()=>{stopMic();menuOpen=true;menu.showModal();foleyContext?.suspend();entrySound.pause();emit(true);};resume.onclick=closeMenu;
 menu.addEventListener('close',()=>{menuOpen=false;if(canPresent()){entrySound.resume();foleyContext?.resume();}last=null;if(pending){closingElapsed=0;finish();}if(mode==='interview')resumePresentation();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode!=='credits'&&!menu.open&&!archive.open&&canPresent()){e.preventDefault();pause.click();}});
 for(const id of ['local-faces','local-room','end'])$(id)?.addEventListener('click',()=>{menuOpen=false;menu.close();});
 let mic=null;function stopMic(){const previous=mic;mic=null;previous?.abort();entrySound.resume();$('wish-mic').textContent='말로 바꾸기';}
 $('wish-text').addEventListener('input',()=>{if(mic)stopMic();});
 $('wish-mic').onclick=()=>{if(mic){stopMic();return;}const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){$('wish-error').textContent='이 브라우저에서는 입력으로 바꿔 주세요.';return;}entrySound.pause();$('wish-voice-note').hidden=false;$('wish-text').readOnly=false;mic=new Recognition();mic.lang='ko-KR';mic.continuous=false;mic.interimResults=false;const currentMic=mic;mic.onresult=e=>{if(mic!==currentMic||mode!=='before')return;$('wish-text').value=e.results[0][0].transcript.slice(0,600);};mic.onerror=()=>{if(mic!==currentMic)return;$('wish-error').textContent='음성을 인식하지 못했어요. 입력으로 바꿀 수 있습니다.';};mic.onend=()=>{if(mic!==currentMic)return;mic=null;entrySound.resume();$('wish-mic').textContent='말로 바꾸기';};try{mic.start();$('wish-mic').textContent='말하기 멈추기';}catch{stopMic();}};
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopMic();foleyContext?.suspend();entrySound.pause();}else if(!menu.open&&!archive.open&&canPresent()){foleyContext?.resume();entrySound.resume();}last=null;});
 set.scene.environment=environment||null;change('before');emit(true);
 const api={
  configure,
  get active(){return mode!=='interview'||menuOpen||archive.open||wideTime>0;},get cameraPaused(){return mode!=='interview'||menuOpen||archive.open||!canPresent();},get exclusive(){return !!set;},
  async enter(){if(!wish||!$('wish-text').value.trim()){$('wish-error').textContent='마음에 가까운 말을 고르고 내 바람을 남겨 주세요.';return false;}wish={...wish,text:$('wish-text').value.trim(),sceneId:$('wish-scene').value};stopMic();entrySound.unlock();$('entry-caption').textContent='';change('settling');return new Promise(resolve=>{enterResolve=resolve;});},
  enterFailed(message='입장에 실패했어요. 다시 시도해 주세요.'){replace(createVestibule());entrySound.stop();change('before');$('wish-error').textContent=message;emit(true);},
  setState(next){const prev=state;state={...next};if(next.phase==='setup'&&prev.phase!=='setup'&&mode!=='before'){wish=null;wideTime=0;document.body.classList.remove('journey-wide');dispatchEvent(new Event('resize'));$('recall-wish')?.remove();$('wish-edit').hidden=true;replace(createVestibule());document.body.classList.remove('wish-selected');entrySound.stop();change('before');emit(true);}if(next.phase==='angry'&&prev.phase==='normal'){document.body.classList.add('journey-wide');wideTime=BURST_MS/1000;emit(true,{kind:'happiness-transition'});const answer=$('answer'),existing=answer.value;answer.value=returnWish(existing,wish?.text||'');answer.dispatchEvent(new Event('input',{bubbles:true}));if(existing.trim()&&wish){const b=document.createElement('button');b.id='recall-wish';b.textContent=wish.text;b.onclick=()=>{answer.value=wish.text;answer.dispatchEvent(new Event('input',{bubbles:true}));b.remove();answer.focus();};$('answer-form').append(b);}}
   if(next.phase==='done'&&prev.phase!=='done'){pending=true;closingElapsed=0;const replied=(next.normalTurns||0)>(prev.normalTurns||0)||(next.angryTurns||0)>(prev.angryTurns||0);closingDuration=replied?Math.min(9,Math.max(3,[...($('line')?.textContent||'')].length*.075)):0;queueMicrotask(finish);}if(next.phase==='setup')pending=false;invalidate();},
  pause(){stopMic();entrySound.pause();foleyContext?.suspend();last=null;},
  resume(){entrySound.resume();foleyContext?.resume();if(pending){closingElapsed=0;finish();}if(mode==='interview'&&!menu.open&&!archive.open)resumePresentation();},
  update(now,{paused=false}={}){const dt=last===null?0:Math.min(.05,Math.max(0,now-last));last=now;if(set?.scene.userData.needsRender){set.scene.userData.needsRender=false;invalidate();}if(paused||menu.open||archive.open||!canPresent()){entrySound.pause();return false;}time+=dt;if(mode==='before')entrySound.tick(dt);
   if(pending&&mode==='interview'){closingElapsed+=dt;finish();}
   if(wideTime>0){wideTime=Math.max(0,wideTime-dt);if(!wideTime){dispatchEvent(new Event('resize'));emit(false);}}
   entrySound.sync();
   if(['settling','waiting','called','enter','seating'].includes(mode)){
    if(mode==='enter')set.update(reduced()?1:Math.min(1,time/3));
    const wasEntering=mode==='enter',next=entryTransition(mode,time,{reduced:reduced()}),transitioning=next!==mode;
    if(next!==mode){
     if(next==='waiting')entrySound.breath();
     if(next==='called'){$('entry-caption').textContent='다음 지원자분, 들어오세요.';entrySound.call();}
     if(next==='seating'){replace(null);entrySound.stop();foley('door');foley('chair');}
     change(next);
     if(next==='called')$('open-interview-door').focus();
     if(next==='interview'){emit(false);enterResolve?.(true);enterResolve=null;}
    }
    return wasEntering||transitioning;
   }
   if(mode==='exit'){if(camera&&!reduced())camera.position.z+=dt*.45;if(time>.65){replace(createVestibule());change('exit-door');foley('walk');foley('door');}return true;}
   if(mode==='exit-door'){set.update(reduced()?0:Math.max(0,1-time));if(time>2){replace(createLifeScene(wish?.sceneId||'steady'));change('life');set.update(now,reduced(),0);$('journey-life-line').style.setProperty('--life-line-opacity','0');$('journey-life-line').textContent=LIFE_CHOICES.find(c=>c.id===(wish?.sceneId||'steady')).line;$('journey-life-line').focus();}return true;}
   if(mode==='life'){const repaint=now-lastSetPaint>=1/30;if(repaint)lastSetPaint=now;$('journey-life-line').style.setProperty('--life-line-opacity',String(reduced()?1:Math.min(1,Math.max(0,(time-4.2)/1.5))*Math.min(1,Math.max(0,(14-time)/2))));if(repaint)set.update(now,reduced(),time);if(time>=14)credits();return !reduced()&&repaint;}
   if(mode==='credits'&&auto){creditPosition+=dt*24;scroll.scrollTop=creditPosition;if(scroll.scrollTop>=scroll.scrollHeight-scroll.clientHeight-1)setAuto(false);return false;}
   // 문밖 장면은 멈춰 있으니 다시 그리지 않는다(장면 교체·창 크기 변경 때만 invalidate).
   return false;
  },
  render(){if(!set)return;const rect=renderer.domElement.getBoundingClientRect();set.camera.aspect=rect.width/rect.height;set.camera.updateProjectionMatrix();const saved=renderer.autoClear;renderer.autoClear=true;if(set.shadowDirty&&renderer.shadowMap){renderer.shadowMap.needsUpdate=true;set.shadowDirty=false;}try{if(renderSet)renderSet(set.scene,set.camera);else renderer.render(set.scene,set.camera);}finally{renderer.autoClear=saved;}}
 };window.__interviewJourney=api;return api;
}
