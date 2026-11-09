import {validatePhoto,validateDimensions,paintWholePhoto} from './face-photo.js';

export function initFaceEditor(characters,{onClose=()=>{}}={}){
 const dialog=document.createElement('dialog');dialog.id='face-editor';dialog.setAttribute('aria-labelledby','face-title');
 dialog.innerHTML=`<form method="dialog" class="face-top"><h2 id="face-title">면접관 바꾸기</h2><button aria-label="얼굴 설정 닫기">×</button></form>
 <label class="face-person-label" for="face-person">면접관<select id="face-person"></select></label>
 <fieldset class="face-styles"><legend>얼굴</legend><button type="button" id="face-style-basic" aria-pressed="true">기본 가면</button><button type="button" id="face-style-capybara" aria-pressed="false">카피바라</button><button type="button" id="face-style-photo" aria-pressed="false">내 사진</button></fieldset>
 <p id="face-mode-note"></p><p id="face-status" role="status" aria-live="polite"></p>
 <section id="face-photo-panel" hidden><label class="photo-pick">사진 고르기<input id="face-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p id="face-instruction">사진 전체를 자르지 않고 네모난 판으로 얼굴 앞에 붙입니다.</p><canvas id="face-preview" width="1024" height="1024" aria-label="얼굴 앞에 붙일 사진 전체 미리보기"></canvas><div class="face-actions"><button type="button" id="face-apply" disabled>이 면접관에게 적용</button><button type="button" id="face-apply-all" disabled>세 명에게 일괄 적용</button></div><small>사진은 이 브라우저에서만 처리하며 새로고침하면 사라집니다.</small></section><div class="face-reset"><button type="button" id="face-restore">기본 가면으로 초기화</button></div>`;
 document.body.append(dialog);
 const $=id=>dialog.querySelector('#'+id),select=$('face-person'),preview=$('face-preview'),status=$('face-status');let generation=0,returnFocus=null,hasPreview=false;
 characters.names.forEach((name,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name;select.append(o);});select.value='1';
 function buttons(){for(const id of ['face-apply','face-apply-all'])$(id).disabled=!hasPreview;}
 function clear(){hasPreview=false;$('face-file').value='';preview.getContext('2d').clearRect(0,0,preview.width,preview.height);buttons();}
 function showMode(mode){for(const name of ['basic','capybara','photo'])$('face-style-'+name).setAttribute('aria-pressed',String(mode===name));$('face-photo-panel').hidden=mode!=='photo';$('face-mode-note').textContent=mode==='photo'?'눈 위치를 맞출 필요 없이 사진 전체를 그대로 붙여요.':mode==='capybara'?'카피바라 입체 마스크예요.':'무표정한 회백색 가면이에요.';const previous=mode==='photo'?characters.getPhoto?.(Number(select.value)):null;if(previous){paintWholePhoto(preview,previous);hasPreview=true;buttons();}}
 for(const mode of ['basic','capybara','photo'])$('face-style-'+mode).onclick=()=>{generation++;clear();if(mode!=='photo'||characters.hasPhoto(Number(select.value)))characters.setStyle(Number(select.value),mode);showMode(mode);status.textContent='';};
 $('face-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const ticket=++generation;hasPreview=false;buttons();try{validatePhoto(file);status.textContent='사진을 읽고 있어요.';const image=await createImageBitmap(file,{imageOrientation:'from-image'});try{if(ticket!==generation)return;validateDimensions(image.width,image.height);paintWholePhoto(preview,image);hasPreview=true;buttons();status.textContent='사진 전체를 붙일 준비가 됐어요.';}finally{image.close();}}catch(error){if(ticket===generation){status.textContent=error.message||'사진을 읽지 못했어요.';}}});
 function apply(all){if(!hasPreview)return;for(const i of all?characters.names.map((_,i)=>i):[Number(select.value)]){const canvas=document.createElement('canvas');canvas.width=preview.width;canvas.height=preview.height;canvas.getContext('2d').drawImage(preview,0,0);characters.replace(i,canvas);}showMode('photo');status.textContent=all?'세 면접관에게 같은 사진을 적용했어요.':'선택한 면접관에게 적용했어요.';}
 $('face-apply').onclick=()=>apply(false);$('face-apply-all').onclick=()=>apply(true);
 select.onchange=()=>{generation++;clear();showMode(characters.getStyle(Number(select.value)));status.textContent='';};
 $('face-restore').onclick=()=>{generation++;characters.restore(Number(select.value));clear();showMode('basic');status.textContent='기본 가면으로 돌아갔어요.';};
 dialog.addEventListener('close',()=>{generation++;clear();onClose();returnFocus?.focus();});dialog.addEventListener('keydown',e=>e.stopPropagation());
 const open=()=>{returnFocus=document.activeElement;status.textContent='';showMode(characters.getStyle(Number(select.value)));dialog.showModal();};document.querySelector('#faces-toggle').onclick=open;return{open,get isOpen(){return dialog.open;}};
}
