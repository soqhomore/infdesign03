export const phrases={
  reason:['귀사의 비전에 공감하여','고객 중심의 방향성에 끌려'],
  experience:['제 경험과 역량을 바탕으로','프로젝트에서 쌓은 역량으로'],
  ending:['함께 성장하고 싶습니다.','회사에 기여하고 싶습니다.']
};
export const ownAnswers=[
  '일해서 생활비를 벌고, 제 생활을 꾸려 가고 싶습니다.',
  '제가 잘하는 일을 하면서 그만큼의 대가를 받고 싶습니다.',
  '일도 잘하고 싶고, 퇴근 후 제 시간도 지키고 싶습니다.',
  '좋아하는 일을 오래 할 수 있는 곳을 찾고 있습니다.'
];
export function createFlow(){return {phase:'select',selected:{reason:null,experience:null,ending:null},own:'',broken:new Set()};}
export function choosePhrase(s,slot,index){if(s.phase!=='select')return;if(!phrases[slot]?.[index])throw Error('어구를 확인하세요.');s.selected[slot]=index;}
export function modelParts(s){return Object.keys(phrases).map(slot=>phrases[slot][s.selected[slot]]||'');}
export function submitModel(s){if(s.phase!=='select')return;if(Object.values(s.selected).some(v=>v===null))throw Error('세 칸의 어구를 모두 골라 주세요.');s.phase='submitted';}
export function startBreak(s){if(s.phase!=='submitted')return false;s.phase='break';return true;}
export function chooseOwn(s,text){
  if(!['break','rewrite'].includes(s.phase))return;
  if(s.broken.size&&s.phase==='break')throw Error('어구를 부수는 중에는 답변을 바꿀 수 없어요.');
  text=text.trim();if(!text)throw Error('하고 싶은 답변을 입력해 주세요.');if([...text].length>140)throw Error('답변은 140자 안으로 입력해 주세요.');s.own=text;
}
export function hitPhrase(s,index){if(s.phase!=='break')return false;if(!s.own)throw Error('먼저 새 답변을 골라 주세요.');if(![0,1,2].includes(index)||s.broken.has(index))return false;s.broken.add(index);if(s.broken.size===3)s.phase='rewrite';return true;}
export function submitOwn(s){if(s.phase!=='rewrite')throw Error('아직 모범답안 어구가 남아 있어요.');if(!s.own.trim())throw Error('새 답변을 골라 주세요.');s.phase='done';}
export function resetFlow(s){Object.assign(s,createFlow());}
