import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import * as photo from './face-photo.js';

async function setup(){
 const elements={},applied=[],restored=[],pending=[],styles=['basic','basic','basic'];let dialogs=[];
 const ctx={clearRect(){},setTransform(){},drawImage(){},fillRect(){},beginPath(){},arc(){},moveTo(){},lineTo(){},stroke(){},fillText(){},createRadialGradient(){return {addColorStop(){}};}};
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.disabled=false;this.width=1024;this.height=1024;}
  set id(v){this._id=v;elements[v]=this;}get id(){return this._id;}
  set innerHTML(html){for(const match of html.matchAll(/id="([^"]+)"/g)){const e=new Element();e.id=match[1];}elements['face-apply'].disabled=true;}
  querySelector(selector){return elements[selector.slice(1)];}
  setAttribute(){}append(...els){this.children.push(...els);}addEventListener(k,fn){this.listeners[k]=fn;}
  // Track one feathered pixel through Canvas source-over / destination-in.
  getContext(){return this.ctx??={...ctx,alpha:0,clearRect(){this.alpha=0;},drawImage(image){const a=image.alpha??1;this.alpha=a+this.alpha*(1-a);},fillRect(){if(this.globalCompositeOperation==='destination-in')this.alpha*=.5;}};}
  get alpha(){return this.ctx?.alpha??0;}getBoundingClientRect(){return {left:0,top:0,width:640,height:440};}focus(){}showModal(){this.open=true;}
 }
 const body=new Element('body'),toggle=new Element('button');toggle.id='faces-toggle';
 const document={body,activeElement:toggle,createElement(tag){const e=new Element(tag);if(tag==='dialog')dialogs.push(e);return e;},querySelector:s=>elements[s.slice(1)]};
 const code=(await fs.readFile('face-editor.js','utf8')).replace(/^import .*\n/,'').replace('export function','function');
 const sandbox={...photo,document,createImageBitmap:()=>new Promise(resolve=>pending.push(resolve))};
 vm.runInNewContext(code+'\nglobalThis.start=initFaceEditor;',sandbox);
 const editor=sandbox.start({names:['왼쪽','가운데','오른쪽'],getStyle:i=>styles[i],hasPhoto:i=>applied.some(p=>p.i===i),getPhoto:i=>applied.findLast(p=>p.i===i)?.c,setStyle:(i,value)=>styles[i]=value,replace:(i,c)=>{applied.push({i,c});styles[i]='photo';},restore:i=>{restored.push(i);styles[i]='basic';}});
 elements['face-person'].value='0';
 const file={type:'image/png',size:1000};
 const pick=()=>elements['face-file'].listeners.change({target:{files:[file]}});
 const image=()=>({width:640,height:440,closed:false,close(){this.closed=true;}});
 return {e:elements,applied,restored,pending,styles,editor,dialog:dialogs[0],pick,image};
}

test('사진을 읽으면 눈 지정 없이 전체 비율로 바로 적용할 수 있다',async()=>{
 const s=await setup(),read=s.pick();s.pending.shift()(s.image());await read;
 assert.equal(s.e['face-apply'].disabled,false);assert.equal(s.e['face-apply-all'].disabled,false);assert.equal(s.e['face-preview'].width,640);assert.equal(s.e['face-preview'].height,440);assert.equal(s.e['face-coordinates'],undefined);
 s.e['face-apply'].onclick();assert.deepEqual(s.applied.map(p=>p.i),[0]);s.e['face-apply-all'].onclick();assert.deepEqual(s.applied.slice(1).map(p=>p.i),[0,1,2]);assert.notEqual(s.applied[1].c,s.applied[2].c);
});
test('면접관 변경·닫기·가면 전환 뒤 늦게 읽힌 사진은 적용하지 않는다',async()=>{
 const s=await setup();for(const action of [()=>s.e['face-person'].onchange(),()=>s.dialog.listeners.close(),()=>s.e['face-style-capybara'].onclick()]){const read=s.pick(),image=s.image();action();s.pending.shift()(image);await read;assert.equal(image.closed,true);assert.equal(s.e['face-apply'].disabled,true);assert.equal(s.e['face-apply-all'].disabled,true);}assert.equal(s.applied.length,0);
});
test('사진 반복 적용·선택 복원·잘못된 파일 처리를 유지한다',async()=>{
 const s=await setup(),read=s.pick();s.pending.shift()(s.image());await read;s.e['face-apply'].onclick();s.e['face-apply'].onclick();assert.equal(s.applied[0].c.alpha,s.applied[1].c.alpha);await s.e['face-file'].listeners.change({target:{files:[{type:'image/svg+xml',size:100}]}});assert.match(s.e['face-status'].textContent,/JPG/);s.e['face-restore'].onclick();assert.deepEqual(s.restored,[0]);assert.equal(s.e['face-apply-all'].disabled,true);
});
