import {limits,opening,demoLine} from './interview-model.js';
// Published demo transport: one in-memory session per page. Never fetches or persists answers.
export function createBrowserInterview({now=Date.now}={}){
 let session=null;
 const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
 const lookup=id=>{if(!session||session.id!==id||now()-session.touched>limits.ttl){if(session?.id===id)session=null;fail('대화가 만료됐어요. 다시 시작해 주세요.',404);}return session;};
 const view=s=>({id:s.id,mode:'demo',phase:s.phase,line:s.history.at(-1).content,normalTurns:s.normalTurns,angryTurns:s.angryTurns,canBreak:s.phase==='normal'&&s.normalTurns>=2,canReply:s.phase!=='done'&&!(s.phase==='normal'&&s.normalTurns>=limits.normal),history:s.history.map(m=>({...m})),usage:{inputTokens:0,outputTokens:0,requests:0}});
 return{async request(path,{method='GET',data={},signal}={}){
  if(signal?.aborted)throw new DOMException('요청을 멈췄어요.','AbortError');
  if(path==='config'&&method==='GET')return{aiAvailable:false,browserOnly:true,model:null,limits};
  if(path==='sessions'&&method==='POST'){
   if(data.mode!=='demo')fail('공개 체험은 준비된 대사로 진행합니다. AI 면접은 로컬 서버에서 사용할 수 있어요.');
   session={id:crypto.randomUUID(),phase:'normal',normalTurns:0,angryTurns:0,touched:now(),completed:new Map(),history:[{role:'assistant',content:opening}]};return view(session);
  }
  const match=path.match(/^sessions\/([a-f0-9-]{36})(?:\/(turn|break))?$/);if(!match)fail('요청 주소를 찾지 못했어요.',404);
  const [,id,action]=match;
  if(!action&&method==='DELETE'){if(session?.id===id)session=null;return{ended:true};}
  const s=lookup(id);if(!action&&method==='GET')return view(s);
  if(method!=='POST')fail('지원하지 않는 요청이에요.',405);
  if(action==='break'){
   if(s.phase==='angry')return view(s);if(s.phase!=='normal')fail('면접이 끝났어요.');if(s.normalTurns<2)fail('두 번 답한 뒤 사용할 수 있어요.');s.phase='angry';s.touched=now();return view(s);
  }
  if(action!=='turn')fail('요청 주소를 찾지 못했어요.',404);
  const {answer,requestId}=data;
  if(requestId!==undefined&&(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(requestId)))fail('답변 요청 ID를 확인해 주세요.');
  const previous=s.completed.get(requestId);if(previous){if(previous.answer!==answer)fail('같은 요청 ID에 다른 답변을 보낼 수 없어요.',409);return structuredClone(previous.response);}
  if(s.phase==='done')fail('면접이 끝났어요.');if(s.phase==='normal'&&s.normalTurns>=limits.normal)fail('행복버튼을 누르거나 면접을 마쳐 주세요.');
  if(typeof answer!=='string'||!answer.trim())fail('답변을 입력하거나 말해 주세요.');const text=answer.trim();if([...text].length>limits.answer)fail('답변은 600자 안으로 입력해 주세요.');
  const line=demoLine(s,text);s.history.push({role:'user',content:text},{role:'assistant',content:line});if(s.phase==='normal')s.normalTurns++;else s.angryTurns++;
  if(s.angryTurns>=limits.angry)s.phase='done';s.touched=now();const result=view(s);if(requestId)s.completed.set(requestId,{answer,response:structuredClone(result)});return result;
 }};
}
