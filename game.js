import * as THREE from 'three';
import { phrases,ownAnswers,createFlow,choosePhrase,modelParts,submitModel,startBreak,chooseOwn,hitPhrase,submitOwn,resetFlow } from './flow.js';

export function initInterview({renderer,stage,home,openFaces}){
  const state=createFlow(),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ui=document.createElement('section');ui.id='interview';ui.setAttribute('aria-label','질문 하나로 체험하는 면접');
  ui.innerHTML=`
    <div class="game-top"><span class="question-count">질문 1 / 1</span><div class="game-tools"><button id="game-faces" disabled>얼굴 바꾸기</button><button id="source-open">어구 출처</button><button id="sound-toggle" aria-pressed="true">소리 켜짐</button><button id="room-only">면접실 보기</button></div></div>
    <h1 class="question"><small>면접관의 질문</small>왜 지원하셨나요?</h1>
    <p id="phase-hint" aria-live="polite"></p>
    <div id="model-options"></div>
    <div id="interviewer-line" hidden><small>면접관</small>회사에 어떤 기여를 할 수 있는지도<br>말씀해 주시겠어요?</div>
    <button id="happiness" disabled><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="1.6"/><path d="M9 18c1.5 7 12.5 7 14 0" stroke="currentColor" stroke-width="1.8"/><circle cx="11" cy="12" r="1.5" fill="currentColor"/><circle cx="21" cy="12" r="1.5" fill="currentColor"/></svg><span>행복버튼</span><small>다르게 답하고 싶다면</small></button>
    <section id="answer-panel"><div class="answer-label">선택한 답변</div><div id="answer-parts"></div><div class="answer-actions"><small id="model-note">세 칸에서 어구를 하나씩 골라 답변을 만드세요.</small><button id="model-submit" class="primary-action" disabled>답변하기</button></div></section>
    <section id="rewrite-options" hidden><div class="own-heading"><strong>이제, 하고 싶은 말</strong><small id="remaining">남은 어구 3개</small></div><div id="own-choices"></div><div id="own-writing"><input id="custom-answer" maxlength="140" aria-label="직접 쓸 새 답변" placeholder="직접 하고 싶은 말을 써도 돼요 · 140자"><button id="custom-use">이 말 선택</button></div><p id="armed-line" aria-live="polite"></p><div id="replace-actions" hidden><small>제출하기 전, 다른 말로 골라도 돼요.</small><button id="own-submit" class="primary-action">이 말로 답하기</button></div></section>
    <section id="finish" hidden><div class="finish-content"><small>같은 질문, 내가 고른 답변</small><h2>왜 지원하셨나요?</h2><blockquote id="final-answer"></blockquote><div class="finish-before">처음 골랐던 답변<span id="before-answer"></span></div><button id="replay" class="primary-action">다시 해보기</button></div></section>
    <section id="source-dialog" hidden><div class="source-content"><h2>이 어구들은 어디서 왔나요?</h2><p>앞의 선택지는 수집한 지원동기 예시의 반복 표현을 바탕으로 짧게 편집한 문구예요. 실제 지원자의 발언이나 합격 확률을 뜻하지 않아요.</p><a href="https://news.incruit.com/news/newsview.asp?newsno=436718&ty=" target="_blank" rel="noopener noreferrer">인크루트 · 우리 회사에 지원한 이유</a><a href="https://www.haijob.co.kr/blog/interview-application-motivation-example-acceptance-rate-increase-practice-template-summary/" target="_blank" rel="noopener noreferrer">HAIJOB · 지원동기 예시</a><a href="https://jobready.tistory.com/229" target="_blank" rel="noopener noreferrer">잡패스코치 · 지원동기 답변 구조</a><p>행복버튼 이후의 선택지는 이 체험을 위해 창작했어요. 직접 작성한 답변은 이 화면 안에서만 사용하고 저장·전송하지 않아요.</p><button id="source-close">닫기</button></div></section>
    <div id="crosshair"></div><div id="impact-flash"></div><div class="shot-caption" id="shot-caption"></div><div id="game-message" role="status"></div>`;
  document.body.append(ui);document.body.classList.add('playing');
  const $=id=>ui.querySelector('#'+id),slots=Object.keys(phrases),titles=['계기','경험·역량','마무리'];
  $('game-faces').onclick=()=>openFaces?.();
  let roomOnly=false,soundOn=true,audio=null,hovered=-1;
  const fxScene=new THREE.Scene(),fxCamera=new THREE.PerspectiveCamera(40,16/9,.1,25);fxCamera.position.z=5;
  const targets=[],debris=[],replacements=[];const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const clock=new THREE.Clock();let time=0;
  function message(text){$('game-message').textContent=text;$('game-message').classList.add('visible');clearTimeout(message.timer);message.timer=setTimeout(()=>$('game-message').classList.remove('visible'),2500);}
  function sound(kind){
    if(!soundOn)return;
    try{
      audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();
      const now=audio.currentTime,gain=audio.createGain();gain.connect(audio.destination);
      if(kind==='break'){
        const buffer=audio.createBuffer(1,audio.sampleRate*.28,audio.sampleRate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length)**2;
        const noise=audio.createBufferSource();noise.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='highpass';filter.frequency.value=700;noise.connect(filter);filter.connect(gain);gain.gain.setValueAtTime(.16,now);gain.gain.exponentialRampToValueAtTime(.001,now+.3);noise.start();
        const thud=audio.createOscillator(),g=audio.createGain();thud.frequency.setValueAtTime(120,now);thud.frequency.exponentialRampToValueAtTime(35,now+.15);g.gain.setValueAtTime(.17,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);thud.connect(g);g.connect(audio.destination);thud.start();thud.stop(now+.21);
      }else{
        const oscillator=audio.createOscillator();oscillator.type='sine';oscillator.frequency.setValueAtTime(kind==='happy'?380:620,now);oscillator.frequency.exponentialRampToValueAtTime(kind==='happy'?780:480,now+.09);gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.001,now+.14);oscillator.connect(gain);oscillator.start();oscillator.stop(now+.15);
      }
    }catch{/* Sound must never block the interaction. */}
  }
  slots.forEach((slot,i)=>{
    const group=document.createElement('div');group.className='phrase-group';const label=document.createElement('span');label.textContent=titles[i];group.append(label);
    phrases[slot].forEach((text,index)=>{
      const button=document.createElement('button');button.className='phrase-choice';button.textContent=text;button.dataset.slot=slot;button.dataset.index=index;button.setAttribute('aria-pressed','false');
      button.onclick=()=>{choosePhrase(state,slot,index);sound('select');renderUI();};group.append(button);
    });$('model-options').append(group);
  });
  ownAnswers.forEach(text=>{
    const b=document.createElement('button');b.className='own-choice';b.textContent=text;b.setAttribute('aria-pressed','false');b.onclick=()=>arm(text);$('own-choices').append(b);
  });
  function arm(text){try{chooseOwn(state,text);if(state.phase==='rewrite')refreshReplacements();sound('select');renderUI();}catch(e){message(e.message);}}
  $('custom-use').onclick=()=>arm($('custom-answer').value);
  $('custom-answer').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)arm(e.target.value);});
  function textTexture(text,index,own=false){
    const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');
    ctx.fillStyle=own?'#e8d493':'#142430';ctx.fillRect(0,0,1024,256);ctx.fillStyle=own?'#325044':'#ed5d47';ctx.fillRect(0,0,9,256);ctx.fillRect(0,0,1024,3);
    ctx.fillStyle=own?'#54644b':'#b5c2c7';ctx.font='20px "Apple SD Gothic Neo",sans-serif';ctx.fillText(own?'내가 고른 말':'선택했던 어구 '+(index+1),34,43);
    ctx.font='600 48px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    if(ctx.measureText(text).width>945)ctx.font='600 40px "Apple SD Gothic Neo",sans-serif';
    ctx.fillStyle=own?'#193c36':'#f5eee3';ctx.textAlign='center';ctx.fillText(text,512,150);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
  }
  function ownChunk(index){
    const words=state.own.split(/\s+/);const count=Math.ceil(words.length/3);
    return words.slice(index*count,(index+1)*count).join(' ')||' ';
  }
  function replacement(card){
    const index=card.userData.index;
    const next=new THREE.Mesh(new THREE.PlaneGeometry(1.60,.40),new THREE.MeshBasicMaterial({map:textTexture(ownChunk(index),index,true),side:THREE.DoubleSide,toneMapped:false}));
    next.position.copy(card.userData.base);next.rotation.z=card.rotation.z;next.userData={index,born:time};fxScene.add(next);replacements.push(next);
  }
  function refreshReplacements(){replacements.forEach(m=>{m.material.map.dispose();m.material.map=textTexture(ownChunk(m.userData.index),m.userData.index,true);m.material.needsUpdate=true;});}
  function clearFX(){
    replacements.forEach(m=>{fxScene.remove(m);m.material.map.dispose();m.material.dispose();m.geometry.dispose();});replacements.length=0;
    targets.forEach(t=>{fxScene.remove(t);t.geometry.dispose();t.material.map?.dispose();t.material.dispose();});targets.length=0;
    debris.forEach(d=>{fxScene.remove(d.mesh);d.mesh.geometry.dispose();d.mesh.material.dispose();});debris.length=0;
  }
  function spawnTargets(){
    clearFX();const poses=[[-1.72,.28,-.05,-.07],[.02,-.02,.18,.045],[1.72,.42,-.1,.07]];
    modelParts(state).forEach((text,index)=>{
      const [x,y,z,rz]=poses[index];const card=new THREE.Mesh(new THREE.PlaneGeometry(1.60,.40),new THREE.MeshBasicMaterial({map:textTexture(text,index),side:THREE.DoubleSide,toneMapped:false}));
      card.position.set(x,y,z);card.rotation.z=rz;card.userData={index,base:card.position.clone(),born:time};fxScene.add(card);targets.push(card);
    });
  }
  function shatter(card){
    card.updateMatrixWorld(true);card.visible=false;
    const columns=10,rows=3,w=1.6,h=.4;
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++)for(let half=0;half<2;half++){
      const x0=x/columns,x1=(x+1)/columns,y0=y/rows,y1=(y+1)/rows;
      const uv=half?[[x0,y0],[x1,y1],[x0,y1]]:[[x0,y0],[x1,y0],[x1,y1]];
      const points=uv.map(([u,v])=>new THREE.Vector3((u-.5)*w,(v-.5)*h,0));const center=points.reduce((v,p)=>v.add(p),new THREE.Vector3()).divideScalar(3);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.clone().sub(center).toArray()),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv.flat(),2));geometry.computeVertexNormals();
      const material=new THREE.MeshBasicMaterial({map:card.material.map,side:THREE.DoubleSide,transparent:true,toneMapped:false,depthWrite:false});
      const shard=new THREE.Mesh(geometry,material);shard.position.copy(center).applyMatrix4(card.matrixWorld);shard.quaternion.copy(card.quaternion);fxScene.add(shard);
      debris.push({mesh:shard,born:time,velocity:new THREE.Vector3((x0-.5)*3.5+(Math.random()-.5)*1.3,.9+Math.random()*1.5,Math.random()*1.5+.1),spin:new THREE.Vector3((Math.random()-.5)*10,(Math.random()-.5)*10,(Math.random()-.5)*7)});
    }
  }
  function shoot(index){
    const card=targets.find(t=>t.userData.index===index&&t.visible);
    if(!card)return;
    try{
      if(!hitPhrase(state,index))return;
      shatter(card);replacement(card);sound('break');$('impact-flash').classList.remove('hit');void $('impact-flash').offsetWidth;$('impact-flash').classList.add('hit');
      $('shot-caption').textContent=state.phase==='rewrite'?'이 말로 답하겠습니다.':'내 말로 바꾸기';$('shot-caption').classList.remove('fire');void $('shot-caption').offsetWidth;$('shot-caption').classList.add('fire');
      renderUI();
    }catch(e){message(e.message);}
  }
  function locate(event){
    const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    fxScene.updateMatrixWorld(true);raycaster.setFromCamera(pointer,fxCamera);
    return raycaster.intersectObjects(targets.filter(t=>t.visible),false)[0]?.object;
  }
  stage.addEventListener('pointermove',event=>{
    if(state.phase!=='break'||roomOnly)return;const hit=locate(event);hovered=hit?.userData.index??-1;
    $('crosshair').style.left=event.clientX+'px';$('crosshair').style.top=event.clientY+'px';$('crosshair').classList.toggle('locked',Boolean(hit&&state.own));
  });
  stage.addEventListener('pointerleave',()=>{$('crosshair').style.left='-100px';hovered=-1;});
  stage.addEventListener('pointerdown',event=>{
    if(state.phase!=='break'||roomOnly||event.button!==0)return;
    if(!state.own){message('먼저 아래에서 하고 싶은 답변을 골라 주세요.');return;}
    const card=locate(event);if(card)shoot(card.userData.index);
  });
  // Keyboard fallback: focusable targets correspond one-to-one with the 3D cards.
  const accessibleTargets=document.createElement('div');accessibleTargets.id='accessible-targets';accessibleTargets.className='sr-targets';ui.append(accessibleTargets);
  for(let i=0;i<3;i++){const b=document.createElement('button');b.textContent=`어구 ${i+1} 부수기`;b.onclick=()=>shoot(i);b.dataset.target=i;accessibleTargets.append(b);}
  function renderUI(){
    const {phase}=state,isBreak=phase==='break',isRewrite=phase==='rewrite';
    document.body.classList.toggle('aiming',isBreak&&!roomOnly&&Boolean(state.own));
    ui.classList.toggle('broken-world',['break','rewrite','done'].includes(phase));
    $('model-options').hidden=phase!=='select';$('interviewer-line').hidden=phase!=='submitted';
    $('answer-panel').hidden=!['select','submitted'].includes(phase);$('rewrite-options').hidden=!['break','rewrite'].includes(phase);
    $('happiness').hidden=!['select','submitted'].includes(phase);$('happiness').disabled=phase!=='submitted';
    $('finish').hidden=phase!=='done';accessibleTargets.hidden=!isBreak;
    accessibleTargets.querySelectorAll('button').forEach(b=>{b.disabled=!state.own||state.broken.has(Number(b.dataset.target));});
    $('phase-hint').textContent=phase==='select'?'세 칸에서 어구를 하나씩 골라 답변을 만드세요.':phase==='submitted'?'다르게 답하고 싶다면, 오른쪽 행복버튼을 눌러 보세요.':isBreak?(state.own?'화면의 이전 어구를 겨냥해 클릭하세요. 세 개를 모두 부수면 새 답변이 남아요.':'아래에서 하고 싶은 답변을 고르세요. 직접 써도 돼요.'):isRewrite?'이전 어구를 모두 부쉈어요. 이제 이 말로 답할 수 있어요.':'';
    $('phase-hint').hidden=phase==='done';ui.querySelector('.question').hidden=phase==='done';
    ui.querySelectorAll('.phrase-choice').forEach(b=>{const selected=state.selected[b.dataset.slot]===Number(b.dataset.index);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    $('answer-parts').replaceChildren();modelParts(state).forEach((part,index)=>{const span=document.createElement('span');span.textContent=part||`${titles[index]} 선택`;span.className=part?'old':'empty';$('answer-parts').append(span);});
    $('model-submit').disabled=Object.values(state.selected).some(v=>v===null)||phase!=='select';
    $('model-note').textContent=phase==='submitted'?'내가 고른 답변이 전송됐어요.':'세 칸을 선택하면 답변할 수 있어요.';
    const locked=state.broken.size>0&&isBreak;
    ui.querySelectorAll('.own-choice').forEach(b=>{b.classList.toggle('armed',b.textContent===state.own);b.setAttribute('aria-pressed',String(b.textContent===state.own));b.disabled=locked;});
    $('custom-answer').disabled=locked;$('custom-use').disabled=locked;
    $('remaining').textContent=isRewrite?'새 답변 준비 완료':`남은 어구 ${3-state.broken.size}개`;
    $('armed-line').textContent=state.own?`${isBreak?'선택한 말':'내 답변'}: ${state.own}`:'원하는 말이 없다면 직접 써 주세요.';
    $('replace-actions').hidden=!isRewrite;
    if(phase==='done'){$('final-answer').textContent=state.own;$('before-answer').textContent=modelParts(state).join(' ');}
    ui.dataset.phase=phase;
  }
  $('model-submit').onclick=()=>{try{submitModel(state);sound('select');renderUI();}catch(e){message(e.message);}};
  $('happiness').onclick=()=>{
    if(!startBreak(state))return;home();sound('happy');spawnTargets();renderUI();
  };
  $('own-submit').onclick=()=>{try{submitOwn(state);sound('happy');renderUI();}catch(e){message(e.message);}};
  $('replay').onclick=()=>{clearFX();resetFlow(state);$('custom-answer').value='';home();renderUI();};
  $('source-open').onclick=()=>{$('source-dialog').hidden=false;$('source-close').focus();};$('source-close').onclick=()=>{$('source-dialog').hidden=true;$('source-open').focus();};
  $('sound-toggle').onclick=()=>{soundOn=!soundOn;$('sound-toggle').textContent=soundOn?'소리 켜짐':'소리 꺼짐';$('sound-toggle').setAttribute('aria-pressed',String(soundOn));};
  const backButton=document.createElement('button');backButton.id='back-interview';backButton.textContent='면접으로 돌아가기';document.querySelector('#toolbar').prepend(backButton);
  function showRoom(value){roomOnly=value;ui.hidden=value;document.body.classList.toggle('playing',!value);document.body.classList.toggle('aiming',!value&&state.phase==='break'&&Boolean(state.own));if(!value)home();}
  $('room-only').onclick=()=>showRoom(true);backButton.onclick=()=>showRoom(false);
  addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!$('source-dialog').hidden){$('source-dialog').hidden=true;return;}
    if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
    if(state.phase==='break'&&['1','2','3'].includes(event.key)&&!roomOnly)shoot(Number(event.key)-1);
  });
  renderUI();
  return {
    state,
    get animating(){return !roomOnly&&(['break','rewrite'].includes(state.phase)||debris.length>0);},
    render(){
      const dt=Math.min(clock.getDelta(),.05);time+=dt;if(roomOnly)return;
      const ratio=stage.clientWidth/stage.clientHeight;if(Math.abs(fxCamera.aspect-ratio)>.001){fxCamera.aspect=ratio;fxCamera.updateProjectionMatrix();}
      replacements.forEach(m=>{const progress=reduceMotion?1:Math.min(1,(time-m.userData.born)*5);m.scale.setScalar(.8+.2*progress);});
      if(state.phase==='break')targets.forEach(card=>{
        if(!card.visible)return;
        card.position.y=card.userData.base.y+(reduceMotion?0:Math.sin(time*.9+card.userData.index)*.022);
        card.material.color.setHex(hovered===card.userData.index&&state.own?0xffe1aa:0xffffff);
      });
      for(let i=debris.length-1;i>=0;i--){
        const d=debris[i],age=time-d.born;
        d.mesh.position.addScaledVector(d.velocity,dt);d.velocity.y-=dt*2.8;d.mesh.rotation.x+=d.spin.x*dt;d.mesh.rotation.y+=d.spin.y*dt;d.mesh.rotation.z+=d.spin.z*dt;
        d.mesh.material.opacity=Math.max(0,1-age/1.5);
        if(age>1.5){fxScene.remove(d.mesh);d.mesh.geometry.dispose();d.mesh.material.dispose();debris.splice(i,1);}
      }
      if(['break','rewrite'].includes(state.phase)||debris.length){renderer.autoClear=false;renderer.clearDepth();renderer.render(fxScene,fxCamera);renderer.autoClear=true;}
    }
  };
}
