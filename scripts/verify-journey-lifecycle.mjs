// Node DOM/Audio/Recognition stand-ins; does not validate real device playback.
import assert from 'node:assert/strict';
import {initJourney} from '../assets/demo/journey.js';
import {initConversationStage} from '../local/stage.js';
function fixture(){
 const ids={},listeners={},events=[],audio=[],recognitions=[],pauses=[];let now=0;
 class El{constructor(){this.children=[];this.listeners={};this.hidden=false;this.value='';this.style={setProperty(){}};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.scrollTop=0;this.scrollHeight=2000;this.clientHeight=500;}set innerHTML(s){for(const m of s.matchAll(/id="([^"]+)"/g))ids[m[1]]=new El();}set id(v){ids[v]=this;}append(...v){this.children.push(...v);}prepend(...v){this.children.unshift(...v);}replaceChildren(...v){this.children=v;}setAttribute(){}getAttribute(){return null;}addEventListener(k,f){(this.listeners[k]??=[]).push(f);}dispatchEvent(e){this['on'+e.type]?.(e);for(const f of this.listeners[e.type]||[])f(e);}click(){this.onclick?.({preventDefault(){}});for(const f of this.listeners.click||[])f({});}focus(){}remove(){}showModal(){this.open=true;}close(){if(!this.open)return;this.open=false;this.dispatchEvent({type:'close'});}}
 for(const id of ['sound','sfx','local-faces','local-room','end','history-panel','start-ai','start-demo','again','answer','answer-form','local-ui','toolbar','line'])ids[id]=new El();
 globalThis.document={body:new El(),getElementById:id=>ids[id],createElement:()=>new El(),querySelector:()=>new El(),addEventListener(k,f){(listeners[k]??=[]).push(f)},dispatchEvent(e){events.push(e);for(const f of listeners[e.type]||[])f(e)}};
 globalThis.matchMedia=()=>({matches:false,addEventListener(){}});globalThis.dispatchEvent=()=>{};globalThis.addEventListener=()=>{};globalThis.innerWidth=1200;globalThis.CustomEvent=class{constructor(type,{detail}={}){this.type=type;this.detail=detail;}};
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){}});const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){return this;},start(){},stop(){}});
 class Audio{constructor(){this.state='running';this.sampleRate=100;this.currentTime=0;audio.push(this);}resume(){this.state='running';}suspend(){this.state='suspended';}createGain(){return node();}createBufferSource(){return node();}createBiquadFilter(){return node();}createBuffer(c,n){return {getChannelData:()=>new Float32Array(n)};}}
 globalThis.window={AudioContext:Audio,SpeechRecognition:class{constructor(){this.aborts=0;recognitions.push(this);}start(){}abort(){this.aborts++;}}};
 const options={renderer:{domElement:{getBoundingClientRect:()=>({width:1000,height:600})}},stage:new El(),invalidate(){},home(){},openFaces(){},onPause(value){pauses.push(value);}};
 return{ids,events,audio,recognitions,pauses,options,tick(api,seconds){for(let i=0;i<Math.ceil(seconds*40);i++){now+=.025;api.update(now);}}};
}
{
 const f=fixture(),api=initJourney(f.options),{ids,recognitions}=f;ids['wish-cloud'].children[0].click();
 const attempt=(action,expected)=>{ids['wish-mic'].click();const old=recognitions.at(-1);action();const text=ids['wish-text'].value;assert.equal(old.aborts,1);old.onresult({results:[[{transcript:'LATE OVERWRITE'}]]});assert.equal(ids['wish-text'].value,text);if(expected)assert.equal(text,expected);};
 attempt(()=>ids['journey-pause'].click());ids['journey-menu'].close();
 attempt(()=>ids['before-archive'].click());ids['journey-archive'].close();
 attempt(()=>ids['wish-back'].click());ids['wish-cloud'].children[0].click();
 attempt(()=>ids['wish-cloud'].children[1].click());
 attempt(()=>ids['wish-modify'].click());
 attempt(()=>{ids['wish-text'].value='MANUAL TEXT';ids['wish-text'].dispatchEvent({type:'input'});},'MANUAL TEXT');
 console.log('PASS waiting microphone aborts on pause/archive/back/select/modify/input and rejects late results');
 const entered=api.enter();f.tick(api,3);ids['open-interview-door'].click();f.tick(api,4.4);assert.equal(await entered,true);api.setState({phase:'normal'});api.setState({phase:'angry'});f.tick(api,.25);ids['journey-pause'].click();ids['journey-menu'].close();assert.equal(api.active,true);assert.equal(f.pauses.at(-1),true);assert.equal(f.events.at(-1).type,'interview:resume');assert.equal(f.events.at(-1).detail.conversationPaused,true);f.tick(api,1.5);assert.equal(api.active,false);assert.equal(f.pauses.at(-1),false);assert.equal(f.events.at(-1).detail,undefined);
 console.log('PASS menu close resumes burst while preserving conversation/shooting lock until wideTime completes');
}
{
 const f=fixture(),stage=initConversationStage(f.options);f.ids['wish-cloud'].children[0].click();assert.equal(f.audio[0].state,'running');f.ids['wish-mic'].click();f.ids['local-room'].click();stage.update(1,{paused:false});assert.equal(f.audio[0].state,'suspended');assert.equal(f.recognitions.at(-1).aborts,1);f.ids['return-conversation'].click();assert.equal(f.audio[0].state,'running');f.ids['wish-mic'].click();f.ids['local-faces'].click();assert.equal(f.audio[0].state,'suspended');assert.equal(f.recognitions.at(-1).aborts,1);stage.resume();assert.equal(f.audio[0].state,'running');
 console.log('PASS room/face entry suspends Journey ambient and aborts microphone, return resumes ambient');
}
