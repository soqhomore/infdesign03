const $ = id => document.getElementById(id);
let session = null, busy = false, generation = 0, request = null;
let soundOn = true, recognition = null, micEpoch = 0, speechEpoch = 0;
let pendingTurn = null;
let presentationPaused = false;
let pendingSpeech = null, activeSpeech = null, speechCleanup = () => {}, lastVoiceWarning = '';
const synth = window.speechSynthesis;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function error(text = '') { $('error').textContent = text; }
function publishState(impact=null){
  document.dispatchEvent(new CustomEvent('interview:state',{detail:{phase:session?.phase||'setup',normalTurns:session?.normalTurns||0,angryTurns:session?.angryTurns||0,mode:session?.mode||null,canBreak:Boolean(session?.canBreak),...(impact?{impact}:{})}}));
}
function stopSpeech(clearPending = true) {
  speechEpoch++; speechCleanup(); speechCleanup = () => {}; activeSpeech = null;
  if (clearPending) pendingSpeech = null;
  synth?.cancel(); document.body.classList.remove('speaking');
}
function voiceMessage(text, warning = false) {
  const output = $('voice-status'); if (output) output.textContent = text;
  if (warning) { $('status').textContent = text; lastVoiceWarning = text; }
  else if (lastVoiceWarning) {
    if ($('status').textContent === lastVoiceWarning) $('status').textContent = '';
    lastVoiceWarning = '';
  }
}
function stopMic() {
  micEpoch++; const previous = recognition; recognition = null;
  previous?.abort(); document.body.classList.remove('listening');
  $('mic').setAttribute('aria-pressed', 'false'); $('mic').setAttribute('aria-label', '말하기 시작'); $('mic-label').textContent = '말하기';
}
// Natural voices first. macOS lists novelty voices (Eddy, Grandma…) before Yuna, so "first local voice" sounded robotic.
const novelty = /^(Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
function voiceRank(v) {
  if (/yuna/i.test(v.name) && /premium|enhanced|프리미엄|고품질|향상/i.test(v.name)) return 0;
  if (/google/i.test(v.name)) return 1;
  if (/yuna|sora|heami|injoon|sunhi/i.test(v.name)) return 2;
  return novelty.test(v.name || '') ? 4 : 3;
}
const pickVoice = voices => [...voices].sort((a, b) => voiceRank(a) - voiceRank(b))[0];
function speak(text, retry = true, attempt = 0, preview = false) {
  stopSpeech(!preview);
  if (!soundOn) return;
  if (!synth) { voiceMessage('이 브라우저는 음성 읽기를 지원하지 않아요.', true); return; }
  if (!preview && (presentationPaused || document.hidden)) { pendingSpeech = { text, generation }; return; }
  activeSpeech = { text, preview };
  const voices = synth.getVoices().filter(v => /^ko/i.test(v.lang));
  if (!voices.length && retry && synth.addEventListener) {
    // Ignore intermediate empty lists; Chrome may emit voiceschanged more than once.
    const token = generation, epoch = speechEpoch;
    const ready = () => { if (synth.getVoices().some(v => /^ko/i.test(v.lang))) again(); };
    const again = () => { if (token === generation && epoch === speechEpoch) speak(text, false, attempt, preview); };
    const timer = setTimeout(again, 3000);
    speechCleanup = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', ready); };
    synth.addEventListener('voiceschanged', ready); voiceMessage('한국어 목소리를 불러오고 있어요…'); return;
  }
  if (!voices.length) { activeSpeech = null; voiceMessage('한국어 목소리를 불러오지 못했어요. 기기의 한국어 음성을 확인한 뒤 목소리 시험을 눌러 주세요.', true); return; }
  const token = generation, epoch = speechEpoch; const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR'; utterance.voice = pickVoice(voices); let started = false;
  utterance.rate = session?.phase === 'angry' ? 1.08 : .97;
  const current = () => token === generation && epoch === speechEpoch;
  const finish = () => { if (!current()) return; speechCleanup(); speechEpoch++; activeSpeech = null; document.body.classList.remove('speaking'); };
  // Retain the utterance until completion, including browsers that don't keep a strong JS reference.
  activeSpeech.utterance = utterance;
  utterance.onstart = () => { if (!current()) return; started = true; speechCleanup(); document.body.classList.add('speaking'); voiceMessage(`${utterance.voice.name || '한국어 음성'} · 재생 중`); };
  utterance.onend = () => { if (!current()) return; finish(); voiceMessage(`${utterance.voice.name || '한국어 음성'} · 재생 완료`); };
  utterance.onerror = event => {
    if (!current()) return; finish();
    const reason = event.error === 'not-allowed' ? '브라우저가 음성 재생을 차단했어요.' : event.error === 'network' ? '음성 서비스에 연결하지 못했어요.' : '기기의 음성을 재생하지 못했어요.';
    voiceMessage(`${reason} 일시정지 설정에서 목소리 시험을 눌러 주세요.`, true);
  };
  if (synth.paused) synth.resume();
  const timer = setTimeout(() => {
    if (!started && current() && activeSpeech) {
      if (attempt === 0) speak(text, false, 1, preview);
      else { finish(); synth.cancel(); voiceMessage('음성 재생이 시작되지 않았어요. 일시정지 설정에서 목소리 시험을 눌러 주세요.', true); }
    }
  }, 3000);
  speechCleanup = () => clearTimeout(timer);
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
  $('end').disabled = busy || !session;
}
function render(impact=null) {
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
  publishState(impact);
}
async function start(mode) {
  if (busy) return;
  const token = ++generation; stopSpeech(); stopMic(); error(); busy = true;
  $('start-ai').disabled = $('start-demo').disabled = true;
  try {
    if(window.__interviewJourney && !await window.__interviewJourney.enter()){busy=false;await configure();return;}
    request = new AbortController();
    const next = await api('sessions', { method: 'POST', data: { mode }, signal: request.signal });
    if (token !== generation) return;
    session = next; busy = false; pendingTurn = null;
    $('setup').hidden = true; $('conversation').hidden = false; $('answer').value = ''; $('history-panel').open = false;
    render(); $('line').focus(); speak(session.line);
  } catch (e) { if (token === generation) { busy = false; window.__interviewJourney?.enterFailed(e.message); error(e.message); await configure(); } }
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
  const rect=$('happiness').getBoundingClientRect?.();
  const impact=rect?.width>0&&rect?.height>0?{x:rect.left+rect.width/2,y:rect.top+rect.height/2,size:rect.width}:null;
  stopSpeech(); stopMic(); error(); busy = true; controls(); const token = generation;
  try {
    request = new AbortController();
    const next = await api(`sessions/${session.id}/break`, { method: 'POST', data: {}, signal: request.signal });
    if (token !== generation) return;
    session = next; busy = false; render(impact); $('answer').focus();
  } catch (e) { if (token === generation) { busy = false; render(); error(e.message); } }
};
$('sound').onclick = () => {
  soundOn = !soundOn; $('sound').textContent = soundOn ? '음성 켜짐' : '음성 꺼짐'; $('sound').setAttribute('aria-pressed', String(soundOn));
  if (!soundOn) stopSpeech(); else if (session) speak(session.line);
};
const voiceTest = $('voice-test');
if (voiceTest) voiceTest.onclick = () => {
  soundOn = true; $('sound').textContent = '음성 켜짐'; $('sound').setAttribute('aria-pressed', 'true');
  speak('안녕하세요. 지금부터 면접을 시작하겠습니다.', true, 0, true);
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
  const old = session; if(!old&&!reset)return; ++generation; request?.abort(); stopSpeech(); stopMic(); session = null; busy = false; pendingTurn = null; error();
  if (old) api(`sessions/${old.id}`, { method: 'DELETE' }).catch(() => {});
  if (reset) { $('conversation').hidden = true; $('setup').hidden = false; $('answer').value = ''; document.body.classList.remove('angry'); $('connection').textContent = '대화 시험'; $('mode-label').textContent = '대화 시제품'; publishState(); await configure(); }
  else { session = { ...old, phase: 'done', canReply: false, canBreak: false }; render(); }
}
$('end').onclick = () => end(); $('again').onclick = () => end({ reset: true });
addEventListener('pagehide', () => { stopMic(); stopSpeech(); if (session) fetch(`/api/interview/sessions/${session.id}`, { method: 'DELETE', keepalive: true }).catch(() => {}); });
function pauseSpeech() {
  if (activeSpeech && !activeSpeech.preview) pendingSpeech = { text: activeSpeech.text, generation };
  stopMic(); stopSpeech(false);
}
function resumeSpeech() {
  if (activeSpeech?.preview) stopSpeech(false);
  if (presentationPaused || document.hidden) return;
  const pending = pendingSpeech; pendingSpeech = null;
  if (pending?.generation === generation && session && !busy) speak(pending.text);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseSpeech(); else resumeSpeech(); });
document.addEventListener('interview:pause',()=>{presentationPaused=true;pauseSpeech();controls();});
document.addEventListener('interview:resume',event=>{presentationPaused=!!event.detail?.conversationPaused;if(!presentationPaused)resumeSpeech();});
async function configure() {
  try {
    const config = await api('config'); window.__interviewConfig=config; window.__interviewJourney?.configure?.(config); $('start-ai').disabled = !config.aiAvailable; $('start-demo').disabled = false;
    $('setup-note').textContent = config.aiAvailable ? '말하거나 입력해서 답할 수 있어요. AI 면접의 답변은 OpenAI로 전송됩니다.' : 'AI 키가 아직 없어요. 로컬 대사로 흐름을 먼저 시험할 수 있습니다.';
  } catch { const message='서버에 연결하지 못했어요. 서버를 실행한 뒤 다시 시도해 주세요.';window.__interviewConfig={error:message};window.__interviewJourney?.configure?.(window.__interviewConfig);$('setup-note').textContent=message; }
}
configure();
