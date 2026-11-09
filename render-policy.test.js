import test from 'node:test';
import assert from 'node:assert/strict';

test('정지 화면은 한 번만 그리고 변경 때 다시 그린다',async()=>{
 const {createRenderSchedule}=await import('./render-policy.js');const s=createRenderSchedule();
 assert.equal(s.shouldRender({ready:true}),true);assert.equal(s.shouldRender({ready:true}),false);
 s.invalidate();assert.equal(s.shouldRender({ready:true}),true);assert.equal(s.shouldRender({ready:true}),false);
});
test('파괴 애니메이션 동안 계속 그리고 종료 후 마지막 잔상을 지운다',async()=>{
 const {createRenderSchedule}=await import('./render-policy.js');const s=createRenderSchedule();
 s.shouldRender({ready:true});for(let i=0;i<3;i++)assert.equal(s.shouldRender({ready:true,animated:true}),true);
 assert.equal(s.shouldRender({ready:true,animated:false}),true);assert.equal(s.shouldRender({ready:true,animated:false}),false);
});
test('로딩·숨김 중 그리지 않으며 보류한 변경을 복귀 때 반영한다',async()=>{
 const {createRenderSchedule}=await import('./render-policy.js');const s=createRenderSchedule();
 assert.equal(s.shouldRender({ready:false}),false);assert.equal(s.shouldRender({ready:true,hidden:true}),false);
 assert.equal(s.shouldRender({ready:true}),true);s.invalidate();assert.equal(s.shouldRender({ready:true,hidden:true}),false);assert.equal(s.shouldRender({ready:true}),true);
});
