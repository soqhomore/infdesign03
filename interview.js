const $ = id => document.getElementById(id);
let session = null, busy = false, generation = 0, request = null;
let soundOn = true, recognition = null, micEpoch = 0;
let pendingTurn = null;
const synth = window.speechSynthesis;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function error(text = '') { $('error').textContent = text; }
function stopSpeech() { synth?.cancel(); document.body.classList.remove('speaking'); }
function stopMic() {
  micEpoch++; const previous = recognition; recognition = null;
  previous?.abort(); document.body.classList.remove('listening');
  $('mic').setAttribute('aria-pressed', 'false'); $('mic').setAttribute('aria-label', '말하기 시작'); $('mic-label').textContent = '말하기';
}
function speak(text) {
  stopSpeech();
  if (!soundOn || !synth) return;
  const voices = synth.getVoices().filter(v => /^ko/i.test(v.lang));
  if (!voices.length) { $('status').textContent = '기기에 한국어 목소리가 없어요. 화면으로 계속할 수 있습니다.'; return; }
  const token = generation; const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR'; utterance.voice = voices.find(v => v.localService) || voices[0];
  utterance.rate = session?.phase === 'angry' ? 1.08 : .97;
  utterance.onstart = () => { if (token === generation) document.body.classList.add('speaking'); };
  utterance.onend = utterance.onerror = () => { if (token === generation) document.body.classList.remove('speaking'); };
  synth.speak(utterance);
}
async function api(path, { method = 'GET', data, signal } = {}) {
  const res = await fetch('/api/interview/' + path, { method, signal, headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  let value;
  try { value = await res.json(); } catch { throw Error('서버를 다시 실행하고 연결해 주세요.'); }
  if (!res.ok) throw Error(value.error || '연결하지 못했어요. 다시 시도해 주세요.');
  return value;
}
function controls() {
  const count = [...$('answer').value.trim()].length;
  $('count').textContent = `${count} / 600`;
  $('send').disabled = busy || !session?.canReply || !count || count > 600;
  $('answer').disabled = busy || !session?.canReply;
  $('mic').disabled = busy || !session?.canReply;
  $('happiness').disabled = busy || !session?.canBreak;
  $('end').disabled = busy;
}
function render() {
  if (!session) return;
  document.body.classList.toggle('angry', session.phase === 'angry' || (session.phase === 'done' && session.angryTurns > 0));
  $('line').textContent = session.line;
  $('connection').textContent = session.mode === 'ai' ? 'AI 연결' : '로컬 대사 시험';
  $('mode-label').textContent = session.mode === 'ai' ? 'AI 생성 대사 · 기기 음성' : '미리 작성한 대사 · AI 미사용';
  $('happiness').hidden = session.phase !== 'normal';
  $('answer-form').hidden = session.phase === 'done'; $('finished').hidden = session.phase !== 'done';
  $('end').hidden = session.phase === 'done';
  $('status').textContent = session.phase === 'angry' ? '하고 싶은 말로 답하세요.' : session.phase === 'done' ? '' : !session.canReply ? '행복버튼을 누르거나 면접을 마칠 수 있어요.' : '';
  $('history').replaceChildren(...session.history.map(m => {
    const li = document.createElement('li'), who = document.createElement('small'), content = document.createElement('span');
    who.textContent = m.role === 'assistant' ? '면접관' : '나'; content.textContent = m.content; li.append(who, content); return li;
  }));
  $('usage').textContent = session.mode === 'ai' ? `AI 요청 ${session.usage.requests}회 · 입력 ${session.usage.inputTokens} / 출력 ${session.usage.outputTokens} 토큰` : '로컬 규칙으로 대사를 선택합니다. 모델 품질을 시험하는 모드는 아니에요.';
  controls();
}
async function start(mode) {
  if (busy) return;
  const token = ++generation; stopSpeech(); stopMic(); error(); busy = true;
  $('start-ai').disabled = $('start-demo').disabled = true;
  try {
    request = new AbortController();
    const next = await api('sessions', { method: 'POST', data: { mode }, signal: request.signal });
    if (token !== generation) return;
    session = next; busy = false; pendingTurn = null;
    $('setup').hidden = true; $('conversation').hidden = false; $('answer').value = ''; $('history-panel').open = false;
    render(); $('line').focus(); speak(session.line);
  } catch (e) { if (token === generation) { busy = false; error(e.message); await configure(); } }
}
$('start-ai').onclick = () => start('ai'); $('start-demo').onclick = () => start('demo');
$('answer').oninput = () => {
  if (recognition) { stopMic(); $('status').textContent = '답변을 고친 뒤 보내 주세요.'; }
  controls();
};
$('answer').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!$('send').disabled) $('answer-form').requestSubmit(); } });
$('answer-form').onsubmit = async e => {
  e.preventDefault(); if (busy || $('send').disabled || !session) return;
  stopMic(); stopSpeech(); error(); busy = true; controls();
  $('status').textContent = session.mode === 'ai' ? '면접관이 답하고 있어요…' : '대사를 준비하고 있어요…';
  const token = generation, text = $('answer').value.trim(); request = new AbortController();
  if (!pendingTurn || pendingTurn.text !== text) pendingTurn = { text, id: crypto.randomUUID() };
  try {
    const next = await api(`sessions/${session.id}/turn`, { method: 'POST', data: { answer: text, requestId: pendingTurn.id }, signal: request.signal });
    if (token !== generation) return;
    session = next; busy = false; pendingTurn = null; $('answer').value = ''; render(); speak(session.line);
    if (session.canReply) $('answer').focus();
  } catch (e) { if (token === generation) { busy = false; render(); error(e.name === 'AbortError' ? '요청을 멈췄어요. 답변은 남아 있어요.' : e.message); } }
};
$('happiness').onclick = async () => {
  if (busy || !session?.canBreak) return;
  stopSpeech(); stopMic(); error(); busy = true; controls(); const token = generation;
  try {
    request = new AbortController();
    const next = await api(`sessions/${session.id}/break`, { method: 'POST', data: {}, signal: request.signal });
    if (token !== generation) return;
    session = next; busy = false; render(); $('answer').focus();
  } catch (e) { if (token === generation) { busy = false; render(); error(e.message); } }
};
$('sound').onclick = () => {
  soundOn = !soundOn; $('sound').textContent = soundOn ? '음성 켜짐' : '음성 꺼짐'; $('sound').setAttribute('aria-pressed', String(soundOn));
  if (!soundOn) stopSpeech(); else if (session) speak(session.line);
};
$('mic').onclick = () => {
  if (recognition) { stopMic(); controls(); $('status').textContent = '확인한 뒤 답하기를 눌러 주세요.'; return; }
  if (!Recognition) { error('이 브라우저는 말하기를 지원하지 않아요. 입력으로 답하거나 Chrome에서 열어 주세요.'); $('answer').focus(); return; }
  stopSpeech(); error(); const token = generation, epoch = ++micEpoch, before = $('answer').value.trim();
  const mic = new Recognition(); recognition = mic; mic.lang = 'ko-KR'; mic.continuous = true; mic.interimResults = true;
  const active = () => token === generation && epoch === micEpoch && recognition === mic;
  mic.onresult = event => {
    if (!active()) return;
    const heard = Array.from(event.results).map(r => r[0].transcript).join(' ');
    $('answer').value = [before, heard].filter(Boolean).join(' '); controls();
  };
  mic.onerror = event => {
    if (!active()) return;
    stopMic(); controls(); error(event.error === 'not-allowed' ? '마이크 권한을 허용하거나 입력으로 답해 주세요.' : '말을 인식하지 못했어요. 다시 말하거나 입력해 주세요.');
  };
  mic.onend = () => { if (active()) { stopMic(); controls(); $('status').textContent = '확인한 뒤 답하기를 눌러 주세요.'; } };
  try {
    mic.start(); document.body.classList.add('listening'); $('mic').setAttribute('aria-pressed', 'true'); $('mic').setAttribute('aria-label', '말하기 마치기'); $('mic-label').textContent = '말하기 마치기'; $('status').textContent = '듣고 있어요. 마치면 마이크를 다시 눌러 주세요.';
  } catch { stopMic(); error('마이크를 시작하지 못했어요. 입력으로 계속할 수 있어요.'); }
};
async function end({ reset = false } = {}) {
  const old = session; ++generation; request?.abort(); stopSpeech(); stopMic(); session = null; busy = false; pendingTurn = null; error();
  if (old) api(`sessions/${old.id}`, { method: 'DELETE' }).catch(() => {});
  if (reset) { $('conversation').hidden = true; $('setup').hidden = false; $('answer').value = ''; document.body.classList.remove('angry'); $('connection').textContent = '대화 시험'; $('mode-label').textContent = '대화 시제품'; await configure(); }
  else { session = { ...old, phase: 'done', canReply: false, canBreak: false }; render(); }
}
$('end').onclick = () => end(); $('again').onclick = () => end({ reset: true });
addEventListener('pagehide', () => { stopMic(); stopSpeech(); if (session) fetch(`/api/interview/sessions/${session.id}`, { method: 'DELETE', keepalive: true }).catch(() => {}); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { stopMic(); stopSpeech(); } });
async function configure() {
  try {
    const config = await api('config'); $('start-ai').disabled = !config.aiAvailable; $('start-demo').disabled = false;
    $('setup-note').textContent = config.aiAvailable ? '말하거나 입력해서 답할 수 있어요. AI 면접의 답변은 OpenAI로 전송됩니다.' : 'AI 키가 아직 없어요. 로컬 대사로 흐름을 먼저 시험할 수 있습니다.';
  } catch { $('setup-note').textContent = '서버에 연결하지 못했어요. npm start로 서버를 실행한 뒤 다시 열어 주세요.'; }
}
configure();
