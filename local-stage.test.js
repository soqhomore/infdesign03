import test from 'node:test';
import assert from 'node:assert/strict';

test('행복버튼만 눌렀을 때는 듣고 있다가 다음 답변 뒤부터 발끈한다',async()=>{
 const {stageMood}=await import('./local/stage.js');
 assert.equal(stageMood({phase:'normal',normalTurns:2,angryTurns:0}),'listening');
 assert.equal(stageMood({phase:'angry',normalTurns:2,angryTurns:0}),'listening');
 assert.equal(stageMood({phase:'angry',angryTurns:1}),'offended');
 assert.equal(stageMood({phase:'done',angryTurns:4}),'finished');
 assert.equal(stageMood({phase:'setup'}),'idle');
});

test('장면 자세·공간 보기·얼굴 설정은 같은 면접 상태를 보존한다',async()=>{
 const {initConversationStage}=await import('./local/stage.js');
 const originalDocument=globalThis.document,originalEvent=globalThis.CustomEvent;
 const listeners={},ids={},classes=new Set();let pauses=0,homes=0,faces=0;
 class Element{constructor(){this.children=[];this.classList={remove(){},add(){}};}append(o){this.children.push(o);}prepend(o){this.children.unshift(o);}setAttribute(){}}
 for(const id of ['local-ui','toolbar','local-room','local-faces'])ids[id]=new Element();
 class V{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}clone(){return new V(this.x,this.y,this.z);}copy(v){Object.assign(this,{x:v.x,y:v.y,z:v.z});}}
 const head={position:new V(0,1.115,.3),rotation:new V()};
 globalThis.CustomEvent=class{constructor(type,{detail}={}){Object.assign(this,{type,detail});}};
 globalThis.document={getElementById:id=>ids[id],createElement:()=>new Element(),body:{append(){},classList:{toggle(k,on){on?classes.add(k):classes.delete(k);}}},addEventListener(type,fn){(listeners[type]??=[]).push(fn);},dispatchEvent(e){if(e.type==='interview:pause')pauses++;for(const fn of listeners[e.type]||[])fn(e);}};
 const dispatch=detail=>document.dispatchEvent(new CustomEvent('interview:state',{detail}));
 try{
  const stage=initConversationStage({home(){homes++;},openFaces(){faces++;},invalidate(){}});
  stage.setCharacters({people:[null,{headRoot:head}]});
  dispatch({phase:'normal',normalTurns:2,angryTurns:0});dispatch({phase:'angry',normalTurns:2,angryTurns:0});assert.equal(head.position.z,.3);
  dispatch({phase:'angry',normalTurns:2,angryTurns:1});assert.ok(head.position.z>.3);
  ids['local-room'].onclick();assert.equal(ids['local-ui'].inert,true);ids.toolbar.children[0].onclick();assert.equal(ids['local-ui'].inert,false);assert.equal(homes,1);
  ids['local-faces'].onclick();assert.equal(faces,1);assert.equal(pauses,2);assert.equal(stage.state.angryTurns,1);stage.resume();
  dispatch({phase:'setup',angryTurns:0});assert.equal(head.position.z,.3);assert.equal(head.rotation.x,0);
 }finally{globalThis.document=originalDocument;globalThis.CustomEvent=originalEvent;}
});
