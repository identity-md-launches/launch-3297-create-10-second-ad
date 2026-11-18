// Original chiptune soundtrack + sound effects for the 10 s ad.
// Usage: node src/synth.mjs out.wav   (44.1 kHz, 16-bit, stereo)
import fs from 'node:fs';

const SR = 44100, DUR = 10, N = SR * DUR;
const mix = new Float32Array(N);
const STEP = 0.1; // one sixteenth at 150 BPM
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function osc(type, ph, duty = 0.5) {
  const p = ph - Math.floor(ph);
  switch (type) {
    case 'square': return p < duty ? 1 : -1;
    case 'tri': return 4 * Math.abs(p - 0.5) - 1;
    case 'saw': return 2 * p - 1;
    default: return Math.sin(2 * Math.PI * p);
  }
}
function tone(start, dur, f0, type, vol, o = {}) {
  const f1 = o.f1 ?? f0, att = o.att ?? 0.005, rel = o.rel ?? 0.03, dec = o.dec ?? 0, vib = o.vib ?? 0, duty = o.duty ?? 0.5;
  const s = Math.floor(start * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && s + i < N; i++) {
    const t = i / SR, k = t / dur;
    const f = f0 + (f1 - f0) * k;
    ph += (f * (1 + vib * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.15))) / SR;
    const env = Math.min(1, t / att) * Math.min(1, (dur - t) / rel) * Math.exp(-dec * t);
    mix[s + i] += osc(type, ph, duty) * vol * env;
  }
}
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
function noise(start, dur, vol, dec, o = {}) {
  const s = Math.floor(start * SR), n = Math.floor(dur * SR);
  let prev = 0, lp = 0;
  for (let i = 0; i < n && s + i < N; i++) {
    const t = i / SR, x = rnd();
    let y = x;
    if (o.hp) { y = x - prev; prev = x; }
    if (o.lp) { const c = typeof o.lp === 'function' ? o.lp(t / dur) : o.lp; lp += (x - lp) * c; y = lp; }
    const env = o.swell ? Math.sin(Math.PI * Math.min(1, t / dur)) ** 2 : Math.exp(-dec * t);
    mix[s + i] += y * vol * env * Math.min(1, (dur - t) / 0.01);
  }
}
const kick = (t) => tone(t, 0.16, 150, 'sine', 0.55, { f1: 42, dec: 18, rel: 0.02 });
const snare = (t) => { noise(t, 0.14, 0.22, 22, { hp: true }); tone(t, 0.08, 220, 'tri', 0.15, { dec: 30 }); };
const hat = (t) => noise(t, 0.04, 0.07, 80, { hp: true });

function seq(notes, base, type, vol, o = {}) {
  for (const [st, len, m] of notes) tone(base + st * STEP, len * STEP * 0.95, hz(m), type, vol, o);
}

// ----- Scene 1 (0.0-2.5 s): driving race theme in C -----
seq([72, 76, 79, 84, 83, 79, 76, 79, 74, 77, 81, 86, 84].map((m, i) => [i * 2, 2, m]), 0, 'square', 0.13, { duty: 0.25 });
for (let i = 0; i < 25; i += 2) {
  const root = i < 8 ? 36 : i < 16 ? 41 : 43;
  tone(i * STEP, STEP * 1.8, hz(root + ((i / 2) % 2 ? 12 : 0)), 'tri', 0.3);
}
tone(0, 2.5, 70, 'saw', 0.06, { f1: 115, att: 0.2, rel: 0.2 }); // engine rev
tone(0, 2.5, 140, 'square', 0.025, { f1: 230, att: 0.2, rel: 0.2, duty: 0.3 });
for (const ct of [0.7, 1.5, 2.1]) { // coin pickups: quick sparkle arpeggio
  [84, 88, 91, 96].forEach((m, k) => tone(ct + k * 0.035, 0.12, hz(m), 'tri', 0.12, { dec: 12 }));
}

// ----- Scene 2 (2.5-5.0 s): bouncy jungle theme in F -----
seq([77, 81, 84, 81, 79, 83, 86, 83, 81, 84, 89, 84, 89].map((m, i) => [i * 2, 2, m]), 2.5, 'square', 0.12, { duty: 0.125 });
for (let i = 0; i < 25; i += 2) {
  const root = i < 8 ? 41 : i < 16 ? 43 : 36;
  tone(2.5 + i * STEP, STEP * 1.2, hz(root + ((i / 2) % 2 ? 7 : 0)), 'tri', 0.3);
}
for (let k = 0; k < 4; k++) tone(2.5 + k * 0.625 + 0.02, 0.14, 280, 'sine', 0.22, { f1: 760, rel: 0.04 }); // jumps
for (const bt of [0.42, 0.84, 1.26, 1.68, 2.1]) [88, 93].forEach((m, k) => tone(2.5 + bt + k * 0.05, 0.1, hz(m), 'square', 0.07, { duty: 0.25, dec: 15 }));

// drums for scenes 1 & 2
for (let st = 0; st < 50; st++) {
  const t = st * STEP;
  if (st % 4 === 0) kick(t);
  if (st % 8 === 4) snare(t);
  hat(t);
}

// ----- Scene 3 (5.0-7.5 s): mysterious time-bend in A minor -----
seq([[0, 4, 69], [4, 4, 72], [8, 4, 76], [12, 4, 74], [16, 4, 71], [20, 5, 69]], 5.0, 'sine', 0.2, { vib: 0.012, att: 0.04, rel: 0.08 });
seq([[0, 4, 81], [4, 4, 84], [8, 4, 88], [12, 4, 86], [16, 4, 83], [20, 5, 81]], 5.0, 'tri', 0.05, { vib: 0.012, att: 0.04 });
for (let st = 0; st < 25; st++) {
  const arp = st < 12 ? [57, 60, 64, 69] : [56, 59, 64, 68];
  tone(5.0 + st * STEP, STEP * 0.9, hz(arp[st % 4]), 'tri', 0.12, { dec: 6 });
}
tone(5.0, 2.5, hz(33), 'tri', 0.22, { att: 0.3, rel: 0.3 });
tone(5.0, 2.4, 900, 'sine', 0.03, { f1: 200, vib: 0.05 }); // rewinding swoop
noise(6.2, 1.3, 0.18, 0, { swell: true, lp: (k) => 0.02 + 0.5 * k }); // reverse-cymbal riser

// ----- Scene 4 (7.5-10 s): title fanfare in C -----
kick(7.5); noise(7.5, 0.9, 0.25, 4, { hp: true });
[67, 72, 76, 79].forEach((m, k) => tone(7.5 + k * 0.1, 0.1, hz(m), 'square', 0.14, { duty: 0.25 }));
kick(7.9); noise(7.9, 1.5, 0.22, 2.5, { hp: true });
tone(7.9, 2.1, hz(84), 'square', 0.13, { duty: 0.25, vib: 0.01, rel: 0.6 });
for (const m of [60, 64, 67]) tone(7.9, 2.1, hz(m), 'square', 0.06, { duty: 0.5, rel: 0.6 });
tone(7.9, 2.1, hz(36), 'tri', 0.3, { rel: 0.6 });
for (let st = 0; st < 8; st++) { const t = 8.4 + st * 0.1; hat(t); if (st % 4 === 0) kick(t); }
for (const ct of [8.85, 9.25]) [91, 96].forEach((m, k) => tone(ct + k * 0.05, 0.15, hz(m), 'tri', 0.1, { dec: 10 }));

// whooshes on the cuts
for (const ct of [2.4, 4.9]) noise(ct, 0.3, 0.2, 0, { swell: true, lp: 0.15 });

// ----- master: soft limit, stereo echo, fades -----
let peak = 0;
for (let i = 0; i < N; i++) { mix[i] = Math.tanh(mix[i] * 1.2); peak = Math.max(peak, Math.abs(mix[i])); }
const gain = 0.89 / peak, delay = Math.floor(0.012 * SR), echo = Math.floor(0.18 * SR);
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.05) * Math.min(1, (DUR - t) / 0.35);
  const l = (mix[i] + 0.25 * (i >= echo ? mix[i - echo] : 0)) * gain * 0.85 * fade;
  const r = ((i >= delay ? mix[i - delay] : 0) + 0.25 * (i >= echo + delay ? mix[i - echo - delay] : 0)) * gain * 0.85 * fade;
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'audio.wav', out);
