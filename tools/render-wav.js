// Renders the original BREAKER musicdata to a WAV file, with the exact
// original timing (one entry per 18.2065 Hz tick), as a clean reference
// recording for making covers (e.g. uploading to Suno's Cover feature).

const fs = require('fs');
const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'music.js'));
const M = global.window.BREAKER_MUSIC;

const SR = 44100;
const TICK = 1 / 18.2065;
const LOOPS = 2;                       // two passes so the cover model hears the loop
const total = Math.ceil(M.length * LOOPS * TICK * SR) + SR;
const buf = new Float32Array(total);

// soft square-ish voice (a few odd harmonics) with a tiny attack/release
function note(freq, t0, t1) {
  const a0 = Math.floor(t0 * SR), a1 = Math.min(total, Math.floor(t1 * SR));
  const atk = 0.004 * SR, rel = 0.012 * SR;
  for (let i = a0; i < a1; i++) {
    const t = i / SR;
    let v = 0;
    for (const [h, g] of [[1, 1], [3, 0.28], [5, 0.12]]) {
      v += g * Math.sin(2 * Math.PI * freq * h * t);
    }
    let env = 0.28;
    if (i - a0 < atk) env *= (i - a0) / atk;
    if (a1 - i < rel) env *= (a1 - i) / rel;
    buf[i] += v * env;
  }
}

// merge consecutive equal entries into sustained notes (like the original driver)
let t = 0;
for (let loop = 0; loop < LOOPS; loop++) {
  let i = 0;
  while (i < M.length) {
    const v = M[i];
    let n = 1;
    while (i + n < M.length && M[i + n] === v) n++;
    if (v > 0) note(v, t, t + n * TICK - 0.005);
    t += n * TICK;
    i += n;
  }
}

// normalize + 16-bit PCM WAV
let peak = 0;
for (const v of buf) peak = Math.max(peak, Math.abs(v));
const pcm = Buffer.alloc(total * 2);
for (let i = 0; i < total; i++) {
  pcm.writeInt16LE(Math.round((buf[i] / peak) * 0.85 * 32767), i * 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28);
hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
const out = path.join(__dirname, 'breaker-theme.wav');
fs.writeFileSync(out, Buffer.concat([hdr, pcm]));
console.log('wrote', out, (36 + pcm.length) / 1e6, 'MB,', (total / SR).toFixed(1), 'seconds');
