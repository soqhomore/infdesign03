import test from 'node:test';
import assert from 'node:assert/strict';
import { createInterviewService } from './interview-service.js';

const apiReply=text=>new Response(JSON.stringify({status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text}]}],usage:{input_tokens:100,output_tokens:20}}),{status:200});

test('두 번 답한 뒤 버튼을 누르고 다음 말부터 발끈한다',async()=>{
 const s=createInterviewService();let v=s.create({mode:'demo'});
 assert.equal(v.phase,'normal');assert.equal(v.canBreak,false);
 assert.throws(()=>s.break(v.id),/두 번/);
 v=await s.turn(v.id,'회사 비전에 공감했습니다.');
 assert.equal(v.normalTurns,1);assert.equal(v.canBreak,false);
 v=await s.turn(v.id,'고객 응대를 했습니다.');assert.equal(v.canBreak,true);
 const previous=v.line;v=s.break(v.id);assert.equal(v.phase,'angry');assert.equal(v.line,previous);
 v=await s.turn(v.id,'먹고살려고 왔죠.');assert.match(v.line,/월급|보수/);assert.equal(v.angryTurns,1);
 v=await s.turn(v.id,'당연히 돈을 받아야죠.');assert.equal(v.angryTurns,2);
 for(let i=0;i<2;i++)v=await s.turn(v.id,'제 말도 들어주세요.');
 assert.equal(v.phase,'done');await assert.rejects(s.turn(v.id,'다시'),/끝/);
 s.end(v.id);assert.throws(()=>s.get(v.id),/만료/);
});

test('빈 입력과 600자 초과는 이력이나 호출량을 늘리지 않는다',async()=>{
 let calls=0;const s=createInterviewService({apiKey:'test-key',fetchImpl:async()=>{calls++;return apiReply('구체적인 경험은요?');}});
 const {id}=s.create({mode:'ai'});await assert.rejects(s.turn(id,'  '),/답변/);
 await assert.rejects(s.turn(id,'가'.repeat(601)),/600/);assert.equal(calls,0);assert.equal(s.get(id).normalTurns,0);
});

test('AI 실패는 이력을 되돌리고 재시도는 같은 턴에 응답한다',async()=>{
 let calls=0;const requests=[];const s=createInterviewService({apiKey:'hidden-key',fetchImpl:async(url,init)=>{requests.push(JSON.parse(init.body));return ++calls===1?new Response('bad',{status:429}):apiReply('그 경험에서 직접 하신 일은 무엇인가요?');}});
 const {id}=s.create({mode:'ai'});await assert.rejects(s.turn(id,'첫 답변'),/잠시/);
 assert.equal(s.get(id).normalTurns,0);assert.equal(s.get(id).history.length,1);
 const v=await s.turn(id,'첫 답변');assert.equal(v.normalTurns,1);assert.equal(v.history.length,3);
 assert.equal(requests[1].store,false);assert.equal(requests[1].input.length,2);assert.equal(requests[1].max_output_tokens,200);
 assert(!JSON.stringify(v).includes('hidden-key'));
});

test('중복 전송은 거부하고 서버가 발끈 프롬프트를 결정한다',async()=>{
 let resolve;const requests=[];const s=createInterviewService({apiKey:'key',fetchImpl:async(url,init)=>{requests.push(JSON.parse(init.body));if(requests.length===1)await new Promise(r=>resolve=r);return apiReply('그 말씀에 책임질 수 있습니까?');}});
 const {id}=s.create({mode:'ai'});const first=s.turn(id,'첫 답변');
 await assert.rejects(s.turn(id,'중복'),/답변 중/);resolve();await first;
 await s.turn(id,'둘째 답변');s.break(id);await s.turn(id,'먹고살려고요');
 assert.match(requests.at(-1).instructions,/발끈/);assert.equal(s.get(id).normalTurns,2);
});

test('AI 키 부재와 알 수 없는 모드는 로컬 대사로 조용히 대체하지 않는다',()=>{
 const s=createInterviewService();assert.throws(()=>s.create({mode:'ai'}),/키/);assert.throws(()=>s.create({mode:'whatever'}),/모드/);
 assert.equal(s.create({mode:'demo'}).mode,'demo');
});

test('불완전한 모델 출력은 성공으로 저장하지 않는다',async()=>{
 const s=createInterviewService({apiKey:'key',fetchImpl:async()=>new Response(JSON.stringify({status:'incomplete',output:[]}))});
 const {id}=s.create({mode:'ai'});await assert.rejects(s.turn(id,'안녕하세요'),/완성/);assert.equal(s.get(id).normalTurns,0);
});

test('실패 재시도를 포함해 세션당 AI 호출을 제한한다',async()=>{
 let calls=0;const s=createInterviewService({apiKey:'key',fetchImpl:async()=>{calls++;return new Response('bad',{status:429});}});
 const {id}=s.create({mode:'ai'});for(let i=0;i<12;i++)await assert.rejects(s.turn(id,'다시 보내기'));
 await assert.rejects(s.turn(id,'다시 보내기'),/호출 한도/);assert.equal(calls,12);
});
test('정상 면접은 5회에서 멈추고 행복버튼이나 종료를 기다린다',async()=>{
 const s=createInterviewService();let v=s.create({mode:'demo'});
 for(let i=0;i<5;i++)v=await s.turn(v.id,'저는 그 일을 했습니다.');
 assert.equal(v.canReply,false);assert.equal(v.canBreak,true);await assert.rejects(s.turn(v.id,'더 답변'),/행복버튼/);
 assert.equal(s.break(v.id).phase,'angry');
});
test('로컬 대사도 같은 키워드 답변에 같은 꼬리질문을 반복하지 않는다',async()=>{
 const s=createInterviewService();try{
  let v=s.create({mode:'demo'});const lines=[];
  for(let i=0;i<5;i++){v=await s.turn(v.id,'성장하고 회사 비전에 기여하고 싶어요.');lines.push(v.line);}
  assert.equal(new Set(lines).size,lines.length);
 }finally{s.dispose();}
});
test('시간이 지나면 대화 이력이 만료된다',()=>{
 let time=0;const s=createInterviewService({now:()=>time});const {id}=s.create({mode:'demo'});
 time=21*60_000;assert.throws(()=>s.get(id),/만료/);
});

test('서버 성공 후 응답이 유실되어도 같은 요청 ID는 중복 호출·저장하지 않는다',async()=>{
 let calls=0;const s=createInterviewService({apiKey:'key',fetchImpl:async()=>{calls++;return apiReply('직접 한 일은요?');}});
 const {id}=s.create({mode:'ai'});const v=await s.turn(id,'같은 답변','turn-one');
 const retry=await s.turn(id,'같은 답변','turn-one');assert.deepEqual(retry,v);assert.equal(calls,1);assert.equal(s.get(id).normalTurns,1);
 await assert.rejects(s.turn(id,'다른 답변','turn-one'),/다른 답변/);
 await s.turn(id,'같은 답변','turn-two');assert.equal(calls,2);
});
