'use strict';
// Som gerado na hora: trilha calma, ambiente da cidade e efeitos.

const A = { ctx: null, master: null, music: null, amb: null, fx: null, started: false, nextNote: 0, chord: 0, nodes: {} };
const SCALE = [0, 2, 4, 7, 9]; // pentatônica
const CHORDS = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]];

function audioStart() {
  if (A.started) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  A.ctx = new AC();
  A.master = A.ctx.createGain(); A.master.connect(A.ctx.destination);
  A.music = A.ctx.createGain(); A.music.connect(A.master);
  A.amb = A.ctx.createGain(); A.amb.connect(A.master);
  A.fx = A.ctx.createGain(); A.fx.connect(A.master);
  // eco suave para a música
  const delay = A.ctx.createDelay(); delay.delayTime.value = 0.42;
  const fb = A.ctx.createGain(); fb.gain.value = 0.32;
  const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  delay.connect(fb); fb.connect(lp); lp.connect(delay); delay.connect(A.music);
  A.echo = delay;
  // ruídos de ambiente: chuva, vento/trânsito
  const noiseBuf = A.ctx.createBuffer(1, A.ctx.sampleRate * 2, A.ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.5 + last * 3; }
  const mk = (type, f, q) => {
    const src = A.ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = A.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = A.ctx.createGain(); g.gain.value = 0;
    src.connect(fl); fl.connect(g); g.connect(A.amb); src.start();
    return g;
  };
  A.nodes.rain = mk('highpass', 2500, 0.3);
  A.nodes.city = mk('lowpass', 320, 0.7);
  A.nodes.wind = mk('bandpass', 600, 0.5);
  A.started = true;
  applyVolumes();
}

function applyVolumes() {
  if (!A.started) return;
  A.music.gain.value = G ? G.settings.music * 0.5 : 0.25;
  A.fx.gain.value = G ? G.settings.sfx * 0.6 : 0.4;
  A.amb.gain.value = G ? G.settings.sfx * 0.7 : 0.4;
}

function tone(freq, t, dur, vol, type = 'sine', dest = A.music) {
  const o = A.ctx.createOscillator(), g = A.ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.05, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest);
  if (dest === A.music) g.connect(A.echo);
  o.start(t); o.stop(t + dur + 0.05);
}
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function audioTick() {
  if (!A.started || !G) return;
  const t = A.ctx.currentTime;
  const paused = G.speed === 0;
  // música: acordes longos e notas soltas de marimba
  if (G.settings.music > 0 && t >= A.nextNote) {
    const night = R.na > 0.5;
    const root = night ? 57 : 60;
    if (Math.random() < 0.35 || A.nextNote === 0) {
      A.chord = (A.chord + (Math.random() < 0.7 ? 1 : 2)) % CHORDS.length;
      for (const n of CHORDS[A.chord]) tone(midi(root - 12 + n), t, 5.5, 0.035, 'triangle');
    }
    const n = SCALE[Math.floor(Math.random() * SCALE.length)] + (Math.random() < 0.5 ? 12 : 0);
    tone(midi(root + n), t, 1.6, 0.06, 'sine');
    if (Math.random() < 0.3) tone(midi(root + n + 7), t + 0.25, 1.2, 0.03, 'sine');
    A.nextNote = t + (night ? 1.4 : 0.9) + Math.random() * 1.6;
  }
  // ambiente
  const vis = G.settings.weather ? G.weather : 'sol';
  const raining = vis === 'chuva' || vis === 'tempestade';
  const traffic = Math.min(1, (G.trafficAvg || 0) + G.pop / 20000);
  A.nodes.rain.gain.setTargetAtTime(raining ? (vis === 'tempestade' ? 0.12 : 0.07) : 0, t, 0.8);
  A.nodes.city.gain.setTargetAtTime(paused ? 0.01 : 0.02 + traffic * 0.08 * Math.min(1, 4 / R.cam.s), t, 1);
  A.nodes.wind.gain.setTargetAtTime(0.012, t, 1);
  if (!paused && !raining) {
    if (R.na < 0.3 && Math.random() < 0.012) { // passarinhos
      const f = 2400 + Math.random() * 1600;
      for (let k = 0; k < 3; k++) {
        const o = A.ctx.createOscillator(), g = A.ctx.createGain();
        const s = t + k * 0.11;
        o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * 1.3, s + 0.07);
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.025, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
        o.connect(g); g.connect(A.amb); o.start(s); o.stop(s + 0.1);
      }
    }
    if (R.na > 0.6 && Math.random() < 0.03) { // grilos
      for (let k = 0; k < 4; k++) tone(4200, t + k * 0.05, 0.03, 0.01, 'square', A.amb);
    }
  }
}

function sfx(kind) {
  if (!A.started || !G || G.settings.sfx <= 0) return;
  const t = A.ctx.currentTime;
  switch (kind) {
    case 'place': tone(220, t, 0.12, 0.25, 'triangle', A.fx); tone(330, t + 0.05, 0.15, 0.15, 'triangle', A.fx); break;
    case 'road': tone(160, t, 0.06, 0.12, 'square', A.fx); break;
    case 'zone': tone(520, t, 0.08, 0.08, 'sine', A.fx); break;
    case 'demolish': {
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(A.fx); o.start(t); o.stop(t + 0.35); break;
    }
    case 'error': tone(140, t, 0.18, 0.18, 'square', A.fx); tone(110, t + 0.12, 0.2, 0.15, 'square', A.fx); break;
    case 'coin': tone(988, t, 0.1, 0.15, 'square', A.fx); tone(1319, t + 0.08, 0.25, 0.12, 'square', A.fx); break;
    case 'done': tone(523, t, 0.2, 0.12, 'triangle', A.fx); tone(659, t + 0.1, 0.25, 0.12, 'triangle', A.fx); break;
    case 'level': [523, 659, 784, 1047].forEach((f, k) => tone(f, t + k * 0.1, 0.4, 0.13, 'triangle', A.fx)); break;
    case 'click': tone(800, t, 0.03, 0.06, 'sine', A.fx); break;
  }
}
