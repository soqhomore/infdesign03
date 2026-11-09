import {BURST_MS} from '../assets/demo/happiness-burst.js';
// 면접 상태에 맞춘 소리 연출: 정상 면접은 실내 소리, 행복버튼은 분위기 깨짐, 말싸움은 점점 쌓이는 합성 비트.
// 효과음 파일은 Freesound CC0(assets/sfx/CREDITS.md), 비트와 버튼음은 Web Audio로 직접 합성한다.
const files = { room: 'assets/sfx/room-tone.mp3', clock: 'assets/sfx/clock.mp3', page: 'assets/sfx/page-turn.mp3', scratch: 'assets/sfx/record-scratch.mp3', crack: 'assets/sfx/glass-crack.mp3', slam: 'assets/sfx/table-slam.mp3', door: 'assets/sfx/door-close.mp3' };

// 이전 상태와 다음 상태를 비교해 재생할 신호 목록을 만든다. DOM·오디오 없이 시험할 수 있다.
export function transitionCues(prev = {}, next = {}) {
  const was = prev.phase || 'setup', now = next.phase || 'setup', cues = [];
  if (now === 'setup') return was === 'setup' ? cues : ['silence'];
  if (was === 'setup') cues.push('ambience');
  if (was === 'normal' && now === 'normal' && next.normalTurns > (prev.normalTurns || 0)) cues.push('page');
  if (was === 'normal' && now === 'angry') cues.push('rupture', 'beat:1');
  if (now === 'angry' && next.angryTurns > (prev.angryTurns || 0)) cues.push('slam', `beat:${Math.min(next.angryTurns + 1, 4)}`);
  if (now === 'done' && was !== 'done') cues.push(next.angryTurns > (prev.angryTurns || 0) ? 'slam' : null, 'cut', 'door', 'ambience');
  return cues.filter(Boolean);
}

export function presentationPauseDelay(now,burstEnds){return now<burstEnds?0:1600;}
export function shouldSuspendPresentation(detail){return detail?.kind!=='happiness-transition';}

export function initInterviewSound({ button = document.getElementById('sfx') } = {}) {
  let ctx = null, master, music, ambienceBus, buffers = {}, loading = null, enabled = true, paused = false;
  let ambience = [], ambienceLevel = 0, speaking = false, suspendTimer = null;
  let beatLevel = 0, beatTimer = null, nextStep = 0, step = 0, state = { phase: 'setup' };
  let burstEnds=0,beatStartTimer=null;const burstNodes=new Set();
  function cancelBurst(){for(const node of burstNodes)try{node.stop();}catch{}burstNodes.clear();burstEnds=0;clearTimeout(beatStartTimer);beatStartTimer=null;}
  const BPM = 132, STEP = 60 / BPM / 4;

  function unlock() {
    if (!ctx) {
      try { ctx = new AudioContext(); } catch { return null; }
      // 책상·화음·비트가 겹쳐도 0dBFS를 넘어 찢어지지 않게 마지막에 리미터를 둔다.
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.15; limiter.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(limiter);
      music = ctx.createGain(); music.gain.value = 0.55; music.connect(master);
      ambienceBus = ctx.createGain(); ambienceBus.gain.value = 0; ambienceBus.connect(master);
      loading = Promise.all(Object.entries(files).map(async ([key, url]) => {
        try { buffers[key] = await ctx.decodeAudioData(await (await fetch('/' + url)).arrayBuffer()); } catch { /* 파일이 없으면 그 소리만 건너뛴다 */ }
      }));
    }
    // Safari는 사용자 조작 안에서 한 번 깨워야 이후 resume이 허용된다. 일시정지 중이면 깨운 뒤 다시 재운다.
    if (ctx.state === 'suspended') ctx.resume().then(() => { if (paused || document.hidden) ctx.suspend(); }, () => {});
    return loading;
  }
  const musicLevel = () => speaking ? 0.22 : 0.55;
  const ambienceTarget = () => ambienceLevel * (speaking && state.phase === 'normal' ? 0.45 : 1);
  const ramp = (param, value, time = 0.25) => { const t = ctx.currentTime; param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); param.linearRampToValueAtTime(value, t + time); };

  function play(key, { gain = 1, rate = 1, at = 0, bus = master } = {}) {
    const buffer = buffers[key]; if (!buffer) return null;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffer; src.playbackRate.value = rate; g.gain.value = gain;
    src.connect(g).connect(bus); src.start(ctx.currentTime + at); return src;
  }
  function startAmbience() {
    if (!ambience.length) {
      for (const [key, gain] of [['room', 4], ['clock', 0.18]]) { const src = play(key, { gain, bus: ambienceBus }); if (src) { src.loop = true; ambience.push(src); } }
    }
    ambienceLevel = 1; if (!paused) ramp(ambienceBus.gain, ambienceTarget(), 1.5);
  }
  function stopAmbience(time = 0.08) { ambienceLevel = 0; ramp(ambienceBus.gain, 0, time); }

  // 장난감 버튼 같은 밝은 "뿅": 진지한 면접실과 어긋나는 첫 소리.
  function pop() {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1560, t + 0.09);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.2);return o;
  }
  // 금관 악기처럼 짧게 치는 화음. 면접관이 반박할 때 책상 소리와 겹친다.
  function stab(t = ctx.currentTime, gain = 0.16) {
    for (const f of [220, 261.6, 329.6]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.3);
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(lp).connect(g).connect(music); o.start(t); o.stop(t + 0.4);
    }
  }

  // 대사 저격 총소리: 날카로운 파열 + 몸통 잡음 + 낮은 쿵 + 유리 꼬리를 압축기로 묶어 크게 낸다.
  // 음악 통로(면접관 음성 중 작아짐)가 아니라 바로 master로 보내고, 순간 음악을 눌러 타격을 돋보이게 한다.
  let gunBus = null;
  function gunshot() {
    const t = ctx.currentTime, pitch = 0.9 + Math.random() * 0.2;
    if (!gunBus) {
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 4; comp.attack.value = 0.001; comp.release.value = 0.12;
      const drive = ctx.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; curve[i] = Math.tanh(x * 2.5); } drive.curve = curve;
      gunBus = ctx.createGain(); gunBus.gain.value = 2.6; gunBus.connect(drive).connect(comp).connect(master);
    }
    const burst = (type, freq, q, gain, length) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuffer(); s.playbackRate.value = pitch; f.type = type; f.frequency.value = freq * pitch; f.Q.value = q; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + length); s.connect(f).connect(g).connect(gunBus); s.start(t); s.stop(t + length + 0.02); };
    burst('highpass', 2500, 0.7, 1.0, 0.03);   // 파열음
    burst('bandpass', 900, 0.8, 0.9, 0.3);    // 몸통
    burst('lowpass', 400, 0.7, 0.8, 0.6);     // 공간 울림
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(160 * pitch, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g).connect(gunBus); o.start(t); o.stop(t + 0.32);
    play('crack', { gain: 0.45, rate: 1.6 * pitch, at: 0.02 });
    const level = musicLevel(); music.gain.cancelScheduledValues(t); music.gain.setValueAtTime(level * 0.12, t); music.gain.linearRampToValueAtTime(level, t + 0.5);
  }

  // 합성 드럼 한 음씩. 단계가 올라갈수록 악기를 더한다.
  let noise = null;
  function noiseBuffer() { if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noise; }
  function kick(t) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g).connect(music); o.start(t); o.stop(t + 0.32); }
  function hat(t, gain = 0.12) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuffer(); f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(f).connect(g).connect(music); s.start(t); s.stop(t + 0.06); }
  function clap(t) { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuffer(); f.type = 'bandpass'; f.frequency.value = 1500; g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); s.connect(f).connect(g).connect(music); s.start(t); s.stop(t + 0.2); }
  const bassLine = [55, 0, 55, 65.4, 0, 55, 73.4, 0, 55, 0, 55, 82.4, 0, 73.4, 65.4, 0];
  function bass(t, f) { const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 420; g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.8); o.connect(lp).connect(g).connect(music); o.start(t); o.stop(t + STEP * 2); }

  function scheduleStep(i, t) {
    const s = i % 16;
    if (s % 4 === 0) kick(t);
    if (s % 4 === 2) hat(t);
    if (beatLevel >= 2 && bassLine[s]) bass(t, bassLine[s]);
    if (beatLevel >= 3 && (s === 4 || s === 12)) clap(t);
    if (beatLevel >= 4) { if (s % 2 === 1) hat(t, 0.07); if (s === 0 && Math.floor(i / 16) % 2 === 0) stab(t, 0.09); }
  }
  function startBeat(level) {
    beatLevel = level;
    if (beatTimer) return;
    step = 0; nextStep = ctx.currentTime + 0.05; if (!paused) ramp(music.gain, musicLevel(), 0.05);
    beatTimer = setInterval(() => { while (nextStep < ctx.currentTime + 0.12) { scheduleStep(step++, nextStep); nextStep += STEP; } }, 25);
  }
  function stopBeat() { clearInterval(beatTimer); beatTimer = null; beatLevel = 0; }

  function transitionWhoosh(){
    const t=ctx.currentTime,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),pan=ctx.createStereoPanner?.();
    src.buffer=noiseBuffer();src.loop=true;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(180,t);filter.frequency.exponentialRampToValueAtTime(2400,t+.38);filter.frequency.exponentialRampToValueAtTime(420,t+1.05);
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.28,t+.25);gain.gain.exponentialRampToValueAtTime(.0001,t+1.2);
    src.connect(filter).connect(gain);if(pan){gain.connect(pan).connect(master);pan.pan.setValueAtTime(-1,t);pan.pan.linearRampToValueAtTime(1,t+1.1);}else gain.connect(master);src.start(t);src.stop(t+1.25);return src;
  }

  async function cue(name) {
    const [kind, arg] = name.split(':');
    if (kind === 'ambience') startAmbience();
    else if (kind === 'page') play('page', { gain: 0.55, at: 0.15 });
    else if (kind === 'rupture') { cancelBurst();burstEnds=ctx.currentTime+BURST_MS/1000;for(const node of [transitionWhoosh(),pop(),play('scratch',{gain:.45,at:.12}),play('crack',{gain:.85,at:.3})])if(node)burstNodes.add(node);stopAmbience(.15); }
    else if (kind === 'beat') { const level = Number(arg); if (beatTimer) beatLevel = level; else {clearTimeout(beatStartTimer);const at=ctx.currentTime+(BURST_MS-180)/1000;const begin=()=>{if(state.phase!=='angry')return;if(paused||document.hidden||ctx.currentTime<at){beatStartTimer=setTimeout(begin,40);return;}beatStartTimer=null;startBeat(level);};beatStartTimer=setTimeout(begin,BURST_MS-180);} }
    else if (kind === 'slam') { play('slam', { gain: 0.7 }); stab(); }
    else if (kind === 'cut') {cancelBurst();stopBeat();}
    else if (kind === 'door') { if (!window.__interviewJourney) play('door', { gain: 0.55, at: 0.4 }); } // 여정 화면은 퇴장 문소리를 따로 낸다
    else if (kind === 'shot') gunshot();
    else if (kind === 'silence') { cancelBurst();stopBeat(); stopAmbience(0.4); }
  }

  // 대사 저격 명중(game.js)
  document.addEventListener('interview:shot', async () => { if (!ctx) return; await loading; cue('shot'); });
  document.addEventListener('interview:state', async event => {
    const next = event.detail, cues = transitionCues(state, next); state = { ...next };
    if (!cues.length || !ctx) return;
    await loading; for (const name of cues) cue(name);
  });
  // 면접 시작 버튼 같은 첫 사용자 조작에서 오디오를 깨운다(브라우저 자동 재생 제한).
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, unlock, { capture: true });

  // 면접관이 말하는 동안 음악과 실내 소리를 낮춘다.
  // body class는 자주 바뀌므로 speaking이 실제로 바뀔 때만 반응한다(총소리 순간 덕킹을 덮어쓰지 않게).
  new MutationObserver(() => {
    const now = document.body.classList.contains('speaking');
    if (now === speaking) return; speaking = now; if (!ctx || paused) return;
    ramp(music.gain, musicLevel(), 0.2); ramp(ambienceBus.gain, ambienceTarget(), 0.3);
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  // 일시정지는 음악·실내 소리만 먼저 내리고, 책상·총소리 같은 단발 효과음 꼬리가 끝난 뒤 오디오를 재운다.
  const suspend = () => {
    paused = true; if (!ctx) return; clearTimeout(suspendTimer);
    ramp(music.gain, 0, 0.3); ramp(ambienceBus.gain, 0, 0.3);
    const delay=presentationPauseDelay(ctx.currentTime,burstEnds);if(delay===0)ctx.suspend();else suspendTimer=setTimeout(()=>paused&&ctx.suspend(),delay);
  };
  const resume = () => {
    paused = false; if (!ctx) return; clearTimeout(suspendTimer);
    if (!document.hidden) ctx.resume();
    ramp(music.gain, musicLevel(), 0.3); ramp(ambienceBus.gain, ambienceTarget(), 0.6);
  };
  document.addEventListener('interview:pause', event=>{if(shouldSuspendPresentation(event.detail))suspend();});
  document.addEventListener('interview:resume', resume);
  document.addEventListener('visibilitychange', () => document.hidden ? ctx?.suspend() : !paused && ctx?.resume());

  if (button) button.onclick = () => {
    enabled = !enabled; button.textContent = enabled ? '효과음 켜짐' : '효과음 꺼짐'; button.setAttribute('aria-pressed', String(enabled));
    if (ctx) ramp(master.gain, enabled ? 0.9 : 0, 0.15);
  };
  return { get enabled() { return enabled; }, cue };
}

if (typeof document !== 'undefined' && document.getElementById('local-ui')) initInterviewSound();

