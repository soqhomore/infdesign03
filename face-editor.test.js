import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import * as photo from './face-photo.js';

async function setup(){
 const elements={},applied=[],restored=[],pending=[];let dialogs=[];
 const ctx={clearRect(){},setTransform(){},drawImage(){},fillRect(){},beginPath(){},arc(){},moveTo(){},lineTo(){},stroke(){},fillText(){},createRadialGradient(){return {addColorStop(){}};}};
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.disabled=false;this.width=1024;this.height=1024;}
  set id(v){this._id=v;elements[v]=this;}get id(){return this._id;}
  set innerHTML(html){for(const match of html.matchAll(/id="([^"]+)"/g)){const e=new Element();e.id=match[1];}elements['face-apply'].disabled=true;}
  querySelector(selector){return elements[selector.slice(1)];}
  setAttribute(){}append(...els){this.children.push(...els);}addEventListener(k,fn){this.listeners[k]=fn;}
  getContext(){return ctx;}getBoundingClientRect(){return {left:0,top:0,width:640,height:440};}focus(){}showModal(){this.open=true;}
 }
 const body=new Element('body'),toggle=new Element('button');toggle.id='faces-toggle';
 const document={body,activeElement:toggle,createElement(tag){const e=new Element(tag);if(tag==='dialog')dialogs.push(e);return e;},querySelector:s=>elements[s.slice(1)]};
 const code=(await fs.readFile('face-editor.js','utf8')).replace(/^import .*\n/,'').replace('export function','function');
 const sandbox={...photo,document,createImageBitmap:()=>new Promise(resolve=>pending.push(resolve))};
 vm.runInNewContext(code+'\nglobalThis.start=initFaceEditor;',sandbox);
 const editor=sandbox.start({names:['왼쪽','가운데','오른쪽'],replace:(i,c)=>applied.push({i,c}),restore:i=>restored.push(i)});
 elements['face-person'].value='0';
 const file={type:'image/png',size:1000};
 const pick=()=>elements['face-file'].listeners.change({target:{files:[file]}});
 const image=()=>({width:640,height:440,closed:false,close(){this.closed=true;}});
 return {e:elements,applied,restored,pending,editor,dialog:dialogs[0],pick,image};
}

test('사진을 읽으면 위치·크기·기울기 조절이 중립값으로 시작한다',async()=>{
 const s=await setup(),read=s.pick();s.pending.shift()(s.image());await read;
 for(const [key,value] of Object.entries({x:0,y:0,zoom:1,rotation:0}))assert.equal(Number(s.e['face-'+key].value),value,key);
});
test('사진 읽기 중 면접관 변경 또는 닫기는 늦게 도착한 사진을 폐기한다',async()=>{
 const s=await setup();let read=s.pick(),image=s.image();s.e['face-person'].value='2';s.e['face-person'].onchange();s.pending.shift()(image);await read;
 assert.equal(image.closed,true);assert.equal(s.e['face-apply'].disabled,true);assert.equal(s.applied.length,0);
 read=s.pick();image=s.image();s.dialog.listeners.close();s.pending.shift()(image);await read;assert.equal(image.closed,true);
});
test('눈 정렬 뒤 선택한 자리만 적용하고 복원하며 잘못된 파일은 기존 얼굴을 유지한다',async()=>{
 const s=await setup();s.e['face-person'].value='1';const read=s.pick();s.pending.shift()(s.image());await read;
 const inputs=s.e['face-coordinates'].children.map(label=>label.children[0]);[200,180,400,180].forEach((v,i)=>inputs[i].value=String(v));inputs[3].listeners.input();
 assert.equal(s.e['face-apply'].disabled,false);s.e['face-apply'].onclick();assert.deepEqual(s.applied.map(v=>v.i),[1]);
 await s.e['face-file'].listeners.change({target:{files:[{type:'image/svg+xml',size:100}]}});assert.match(s.e['face-status'].textContent,/JPG/);assert.equal(s.applied.length,1);
 s.e['face-restore'].onclick();assert.deepEqual(s.restored,[1]);assert.equal(s.e['face-apply'].disabled,true);
});
