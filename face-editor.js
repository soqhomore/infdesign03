import {validatePhoto,validateDimensions,paintFace} from './face-photo.js';

export function initFaceEditor(characters){
 const dialog=document.createElement('dialog');dialog.id='face-editor';dialog.setAttribute('aria-labelledby','face-title');
 dialog.innerHTML=`<form method="dialog" class="face-top"><h2 id="face-title">얼굴 바꾸기</h2><button aria-label="얼굴 설정 닫기">×</button></form>
 <div class="face-layout"><section><label for="face-person">면접관</label><select id="face-person"></select>
 <label class="photo-pick">사진 고르기<input id="face-file" type="file" accept="image/jpeg,image/png,image/webp"></label>
 <p id="face-instruction">정면 사진을 고른 뒤 사진의 왼쪽 눈, 오른쪽 눈을 차례로 찍어 주세요.</p>
 <canvas id="face-source" width="640" height="440" aria-label="사진에서 양쪽 눈 위치 선택"></canvas>
 <div class="face-eye-inputs"><button type="button" id="face-eyes-reset">눈 다시 찍기</button><span id="face-eye-count" role="status"></span></div>
 <details><summary>눈 위치 숫자로 입력</summary><div id="face-coordinates"></div></details>
 </section><section><p class="face-preview-title">얼굴에 적용할 영역</p><canvas id="face-preview" width="1024" height="1024" aria-label="얼굴 사진 정렬 미리보기"></canvas>
 <div id="face-adjustments"></div><p id="face-status" role="status" aria-live="polite"></p>
 <div class="face-actions"><button type="button" id="face-restore">원래 얼굴</button><button type="button" id="face-apply" disabled>적용</button></div>
 <small>사진은 이 브라우저에서만 처리해요. 새로고침하면 원래 얼굴로 돌아갑니다. 정면 외형을 교체하며 두상·머리카락은 유지됩니다.</small></section></div>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id),select=$('face-person'),source=$('face-source'),preview=$('face-preview'),status=$('face-status'),apply=$('face-apply');
 characters.names.forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;select.append(o);});
 const specs=[['x','가로',-220,220,0],['y','세로',-220,220,0],['zoom','크기',.65,1.5,1],['rotation','기울기',-25,25,0]],adjust={};
 for(const [key,label,min,max,value] of specs){adjust[key]=value;const row=document.createElement('label');row.textContent=label;const input=document.createElement('input');Object.assign(input,{type:'range',min,max,step:key==='zoom'?.01:1,value,id:'face-'+key});input.addEventListener('input',()=>{adjust[key]=Number(input.value);drawPreview();});row.append(input);$('face-adjustments').append(row);}
 let image=null,eyes=[],generation=0,fit=null,returnFocus=null;
 const coordinateInputs=[];
 for(let i=0;i<2;i++)for(const axis of ['x','y']){const label=document.createElement('label');label.textContent=(i?'오른쪽 눈':'왼쪽 눈')+' '+axis;const input=document.createElement('input');input.type='number';input.min=0;input.step=1;input.setAttribute('aria-label',label.textContent);input.addEventListener('input',()=>{if(!image)return;const values=coordinateInputs.map(n=>Number(n.value));if(coordinateInputs.some(n=>n.value==='')||values.some((v,j)=>!Number.isFinite(v)||v<0||v>(j%2?image.height:image.width)))return;eyes=[{x:values[0],y:values[1]},{x:values[2],y:values[3]}];drawSource();drawPreview();});label.append(input);$('face-coordinates').append(label);coordinateInputs.push(input);}
 function clearImage(){image?.close?.();image=null;eyes=[];fit=null;$('face-file').value='';source.getContext('2d').clearRect(0,0,source.width,source.height);preview.getContext('2d').clearRect(0,0,preview.width,preview.height);apply.disabled=true;$('face-eye-count').textContent='';coordinateInputs.forEach(n=>n.value='');}
 function resetAdjust(){for(const [key,,,,value] of specs){adjust[key]=value;$('face-'+key).value=value;}}
 function drawSource(){
  if(!image)return;const ctx=source.getContext('2d'),scale=Math.min(source.width/image.width,source.height/image.height),w=image.width*scale,h=image.height*scale;
  fit={scale,x:(source.width-w)/2,y:(source.height-h)/2};ctx.clearRect(0,0,source.width,source.height);ctx.drawImage(image,fit.x,fit.y,w,h);
  eyes.forEach((p,i)=>{const x=fit.x+p.x*scale,y=fit.y+p.y*scale;ctx.strokeStyle='#ffe39a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.moveTo(x-14,y);ctx.lineTo(x+14,y);ctx.moveTo(x,y-14);ctx.lineTo(x,y+14);ctx.stroke();ctx.fillStyle='#ffe39a';ctx.font='14px sans-serif';ctx.fillText(String(i+1),x+12,y-10);});
  $('face-eye-count').textContent=`${eyes.length} / 2`;
 }
 function drawPreview(){
  apply.disabled=true;if(!image||eyes.length!==2)return;
  try{paintFace(preview,image,eyes,adjust);apply.disabled=false;status.textContent='위치를 맞춘 뒤 적용해 주세요.';}catch(e){status.textContent=e.message;}
 }
 source.addEventListener('click',e=>{
  if(!fit||eyes.length===2)return;const r=source.getBoundingClientRect(),x=((e.clientX-r.left)*source.width/r.width-fit.x)/fit.scale,y=((e.clientY-r.top)*source.height/r.height-fit.y)/fit.scale;
  if(x<0||y<0||x>image.width||y>image.height)return;eyes.push({x,y});coordinateInputs[(eyes.length-1)*2].value=Math.round(x);coordinateInputs[(eyes.length-1)*2+1].value=Math.round(y);drawSource();drawPreview();
 });
 $('face-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;const ticket=++generation;apply.disabled=true;
  try{
   validatePhoto(file);status.textContent='사진을 읽고 있어요.';
   const next=await createImageBitmap(file,{imageOrientation:'from-image'});
   if(ticket!==generation){next.close();return;}
   try{validateDimensions(next.width,next.height);}catch(error){next.close();throw error;}
   clearImage();image=next;resetAdjust();status.textContent='사진의 왼쪽 눈 → 오른쪽 눈을 찍어 주세요.';drawSource();
  }catch(error){if(ticket===generation){drawPreview();status.textContent=error.message||'사진을 읽지 못했어요.';}}
 });
 $('face-eyes-reset').onclick=()=>{eyes=[];coordinateInputs.forEach(n=>n.value='');apply.disabled=true;preview.getContext('2d').clearRect(0,0,1024,1024);drawSource();status.textContent='양쪽 눈을 다시 찍어 주세요.';};
 select.onchange=()=>{generation++;clearImage();resetAdjust();status.textContent='선택한 면접관의 사진을 골라 주세요.';};
 apply.onclick=()=>{if(apply.disabled)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;canvas.getContext('2d').drawImage(preview,0,0);characters.replace(Number(select.value),canvas);status.textContent='적용했어요. 닫으면 입체 얼굴을 확인할 수 있어요.';};
 $('face-restore').onclick=()=>{generation++;characters.restore(Number(select.value));clearImage();resetAdjust();status.textContent='원래 얼굴로 복원했어요.';};
 dialog.addEventListener('close',()=>{generation++;clearImage();returnFocus?.focus();});
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 const open=()=>{returnFocus=document.activeElement;status.textContent='';dialog.showModal();};
 document.querySelector('#faces-toggle').onclick=open;
 return {open};
}
