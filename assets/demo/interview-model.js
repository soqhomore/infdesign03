// Shared, authored demo dialogue rules. No network or runtime credentials.
export const limits = Object.freeze({ normal: 5, angry: 4, answer: 600, outputTokens: 200, requests: 12, ttl: 20 * 60_000 });
export const opening = '지원한 이유부터 말씀해 주시겠어요?';

export function sClosing(s) { return s.phase === 'angry' ? s.angryTurns === limits.angry - 1 : s.normalTurns === limits.normal - 1; }
export function demoLine(s, text) {
  if (sClosing(s)) return s.phase === 'angry' ? '입장이 다른 건 알겠습니다. 더 이야기해도 같은 말일 것 같으니, 면접은 여기서 마치죠.' : '말씀 잘 들었습니다. 준비한 질문은 여기까지입니다.';
  if (s.phase === 'angry') {
    if (/돈|먹고|생활비|월급|보수/.test(text)) return s.angryTurns === 0
      ? '그럼 저희 회사는 월급만 주면 되는 곳이라는 겁니까?'
      : '대가를 받겠다는 건 알겠습니다. 그 대가에 맞는 일을 요구하는 것도 당연한 것 아닌가요?';
    if (/왜|질문|면접|회사/.test(text)) return '질문이 불편하다고 저한테 따지시는 겁니까? 저희도 같이 일할 사람을 알아야 하지 않겠어요?';
    if (/죄송|이해|차분/.test(text)) return '알겠습니다. 그렇다면 저희에게 바라는 것과 본인이 할 수 있는 일을 분명히 말씀하세요.';
    return ['지금 그 말씀을 면접 자리에서 하시는 겁니까? 무슨 뜻인지 분명히 말씀하세요.', '저도 지원자님 말을 듣고 있습니다. 저희 입장은 들으실 생각이 없습니까?', '그 요구를 저희가 모두 받아들여야 한다는 근거가 뭡니까?', '서로 생각이 다른 건 알겠습니다. 마지막으로 하실 말씀이 있습니까?'][s.angryTurns];
  }
  const candidates=[];
  if (/고객|응대/.test(text)) candidates.push('고객이 원한 것과 회사 방침이 달랐던 적이 있나요? 그때 직접 어떻게 대응하셨나요?');
  if (/성장|비전|기여/.test(text)) candidates.push('말씀하신 방향을 실제 행동으로 옮겼던 경험 하나를 구체적으로 들어주시겠어요?');
  if (/돈|월급|생활비/.test(text)) candidates.push('보수가 중요하다는 점은 알겠습니다. 그 외에 이 일을 선택한 이유도 있나요?');
  const questions=['그 이유가 다른 회사에도 해당할 것 같은데, 저희여야 하는 이유가 있나요?', '그 과정에서 다른 사람이 아닌 본인이 직접 결정한 일은 무엇인가요?', '예상대로 되지 않았을 때는 어떻게 대처하셨나요?', '입사 후 가장 먼저 해보고 싶은 일은 무엇인가요?'];
  candidates.push(...questions.slice(s.normalTurns),...questions.slice(0,s.normalTurns));
  return candidates.find(line=>!s.history.some(m=>m.role==='assistant'&&m.content===line))||questions.at(-1);
}

