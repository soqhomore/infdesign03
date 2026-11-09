import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlow, choosePhrase, submitModel, startBreak, chooseOwn, hitPhrase, submitOwn, resetFlow } from './flow.js';

test('행복버튼은 모범 답변을 완성해 제출한 뒤 사용할 수 있다',()=>{
  const s=createFlow();
  assert.equal(startBreak(s),false);
  assert.throws(()=>submitModel(s),/세/);
  choosePhrase(s,'reason',0);choosePhrase(s,'experience',1);choosePhrase(s,'ending',0);
  assert.equal(s.phase,'select');submitModel(s);assert.equal(s.phase,'submitted');
});
test('선택한 새 답변으로 세 어구를 부수고 제출한다',()=>{
  const s=createFlow();
  for(const slot of ['reason','experience','ending'])choosePhrase(s,slot,0);
  submitModel(s);assert.equal(startBreak(s),true);
  assert.throws(()=>hitPhrase(s,0),/답변/);
  chooseOwn(s,'월세를 내고 싶습니다.');
  hitPhrase(s,0);assert.equal(s.broken.size,1);
  assert.throws(()=>chooseOwn(s,'다른 말'),/부수는/);
  hitPhrase(s,0);assert.equal(s.broken.size,1);
  hitPhrase(s,2);assert.throws(()=>submitOwn(s),/남아/);
  hitPhrase(s,1);assert.equal(s.phase,'rewrite');
  chooseOwn(s,'제 말을 그대로 전하고 싶습니다.');submitOwn(s);
  assert.equal(s.phase,'done');assert.equal(s.own,'제 말을 그대로 전하고 싶습니다.');
  resetFlow(s);assert.equal(s.phase,'select');assert.equal(s.own,'');assert.equal(s.broken.size,0);
});
test('새 답변은 빈 문장과 과도하게 긴 문장을 허용하지 않는다',()=>{
  const s=createFlow();s.phase='break';
  assert.throws(()=>chooseOwn(s,'  '),/입력/);
  assert.throws(()=>chooseOwn(s,'가'.repeat(141)),/140/);
});
