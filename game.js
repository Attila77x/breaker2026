/* =========================================================================
   BREAKER — web remake of the 1993 Turbo Pascal game by Tütyü.
   Game logic is a structural 1:1 port of BREAKER.PAS: the 50x25 text
   screen is kept as the authoritative game state (sscr/gscr), the ball
   moves strictly at 45 degrees on the character grid, and the paddle's
   two 45-degree ends send the ball back where it came from.
   Only the presentation (canvas graphics, WebAudio) is modernised.
   ========================================================================= */
'use strict';

/* ============================== Constants ============================== */

const COLS = 50, ROWS = 25;          // original text playfield
const CW = 20, CH = 24;              // pixels per character cell
const FIELD_W = COLS * CW, FIELD_H = ROWS * CH;

const MAXGHOST = 256;
const NORMAL = 0, GLUE = 1, BIG = 2, MEGASHOOT = 3;     // shoottype

const RANGESTR = ['Beginner', 'Weak', 'Amateur', 'Very Poor', 'Poor', 'Average',
  'Smart', 'Advanced', 'Master', 'Excellent', 'Elite', 'Breaker'];
const BNS = [5, 10, 20, 30, 50, 75, 150, 300];          // level bonus per skill
const DT = 'LGEMXPF';                                    // dropping letters
const JT = [3, 8, 176, 1];                               // surprise morph targets

const CTRL_NAMES = ['Left', 'Right', 'Fire', 'Pause', 'Sound', 'Music',
  'Suicide', 'Next Level', 'Quit'];
const DEFAULT_KEYS = ['ArrowLeft', 'ArrowRight', 'Space', 'KeyP', 'KeyS',
  'KeyM', 'KeyA', 'KeyN', 'Escape'];

// modernised DOS 16-colour palette
const PAL = ['#262a33', '#2c5fd0', '#33bd55', '#22b6bc', '#d2453e', '#c455d2',
  '#c8842e', '#b9bec8', '#5c6373', '#5191ff', '#56e878', '#41e7ee',
  '#ff5f57', '#ff70f1', '#ffd94f', '#f3f6fb'];

const LETTER_INFO = {
  L: { col: '#46e06b', name: 'Life' }, G: { col: '#2fd4c8', name: 'Glue' },
  E: { col: '#4f9bff', name: 'Enlarge' }, X: { col: '#9aa1ad', name: 'Reset' },
  M: { col: '#ff4f47', name: 'MegaShot' }, P: { col: '#ffd84d', name: 'Points' },
  F: { col: '#ff9433', name: 'Fire' }
};

/* ============================== Utilities ============================== */

const rnd = () => Math.random();
const random = n => Math.floor(Math.random() * n);     // Pascal random(n)
const sleep = ms => new Promise(r => setTimeout(r, ms));

function hex2rgb(hx) {
  return [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
}
function rgbStr(r, g, b, a = 1) {
  return `rgba(${Math.round(Math.max(0, Math.min(255, r)))},${Math.round(Math.max(0, Math.min(255, g)))},${Math.round(Math.max(0, Math.min(255, b)))},${a})`;
}
function shade(hx, f) {            // f>0 lighten toward white, f<0 darken
  const [r, g, b] = hex2rgb(hx);
  if (f >= 0) return rgbStr(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  return rgbStr(r * (1 + f), g * (1 + f), b * (1 + f));
}
function mix(h1, h2, t) {
  const a = hex2rgb(h1), b = hex2rgb(h2);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ========================== Screen grid (sajat) ========================= */
/* Faithful stand-in for DOS text video memory, x:1..50 y:1..25, 2 layers. */

const gridCh = new Uint8Array((ROWS + 1) * (COLS + 1));
const gridCol = new Uint8Array((ROWS + 1) * (COLS + 1));

function sscr(y, x, z, m) {
  if (x < 1 || x > COLS || y < 1 || y > ROWS) return;
  if (z === 1) gridCh[y * (COLS + 1) + x] = m; else gridCol[y * (COLS + 1) + x] = m;
}
function gscr(y, x, z) {
  if (x < 1 || x > COLS || y < 1 || y > ROWS) return 219;   // outside = wall
  return z === 1 ? gridCh[y * (COLS + 1) + x] : gridCol[y * (COLS + 1) + x];
}
function fillline(x, y, j, n, m) { for (let i = 0; i < n; i++) sscr(y, x + i, j, m); }

function clearGridAll() { gridCh.fill(32); gridCol.fill(7); }
function drawBorder() {
  // rectangle(1,1,50,25) with the bottom row cleared, like startlevel does
  for (let x = 1; x <= COLS; x++) { sscr(1, x, 1, 205); }
  for (let y = 1; y <= ROWS; y++) { sscr(y, 1, 1, 186); sscr(y, COLS, 1, 186); }
  fillline(2, 25, 1, 48, 32);
}

/* ============================== Input ================================== */

const held = new Set();        // key[] - currently held (raw, instant)
const pressedK = new Set();    // kp[] - unconsumed presses
let menuQueue = [];            // typematic-style queue for menus
let menuKeyWaiter = null;
let captureWaiter = null;      // for key redefinition

function hitkey(code) { const h = pressedK.has(code); pressedK.delete(code); return h; }
function resetkeys() { pressedK.clear(); menuQueue.length = 0; }

const GAME_PREVENT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

window.addEventListener('keydown', e => {
  audioBoot();
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (GAME_PREVENT.has(e.code)) e.preventDefault();
  if (captureWaiter) {
    if (!e.repeat) { const w = captureWaiter; captureWaiter = null; w(e.code); }
    e.preventDefault(); return;
  }
  if (!e.repeat) { held.add(e.code); pressedK.add(e.code); }
  menuQueue.push(e.code);
  if (menuQueue.length > 64) menuQueue.shift();
  if (menuKeyWaiter) { const w = menuKeyWaiter; menuKeyWaiter = null; w(menuQueue.shift()); }
});
window.addEventListener('keyup', e => held.delete(e.code));
window.addEventListener('blur', () => held.clear());

function nextMenuKey() {
  if (menuQueue.length) return Promise.resolve(menuQueue.shift());
  return new Promise(r => { menuKeyWaiter = r; });
}
async function anyKeyWait() { menuQueue.length = 0; await nextMenuKey(); resetkeys(); }

function keyDisplay(code) {
  if (!code) return '?';
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '')
    .replace('ControlLeft', 'LCtrl').replace('ControlRight', 'RCtrl')
    .replace('ShiftLeft', 'LShift').replace('ShiftRight', 'RShift')
    .replace('Escape', 'Esc');
}

/* ============================== Audio ================================== */

let AC = null, masterGain = null, sfxGain = null, musGain = null, musDelay = null;
let sd = true;                      // sound effects on
let musicok = false;                // music audible
let musicInstalled = false;         // musicon/musicoff state
let musPos = 0, musNextT = 0, musVoice = null;

function audioBoot() {
  musicSync();          // user gesture: retry mp3 playback blocked by autoplay policy
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = AC.createGain(); masterGain.gain.value = 0.55; masterGain.connect(AC.destination);
    sfxGain = AC.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(masterGain);
    musGain = AC.createGain(); musGain.gain.value = 0.4; musGain.connect(masterGain);
    musDelay = AC.createDelay(0.5); musDelay.delayTime.value = 0.165;
    const fb = AC.createGain(); fb.gain.value = 0.22;
    const wet = AC.createGain(); wet.gain.value = 0.3;
    musGain.connect(musDelay); musDelay.connect(fb); fb.connect(musDelay);
    musDelay.connect(wet); wet.connect(masterGain);
    musNextT = AC.currentTime + 0.1;
    setInterval(musicScheduler, 25);
  } catch (e) { /* no audio */ }
}
document.addEventListener('pointerdown', audioBoot);

// snd(freq, durMs) - warm wooden mallet "blip" to match the marimba soundtrack.
// Same call signature & frequencies as the original PC-speaker beeps, so all
// game logic is untouched; only the timbre changes. A struck-bar voice = sine
// fundamental + soft inharmonic overtone (~4x, like a real marimba bar) with a
// fast attack and an exponential mallet decay. durMs nudges the decay length so
// the short game beeps stay short and the longer cues ring a touch more.
function snd(freq, durMs, atMs = 0) {
  if (!AC || !sd || freq <= 0) return;
  // marimba bars get woolly and dull at the very top; fold extreme beeps down
  // an octave or two so they read as wooden taps rather than ice-pick pings.
  let f = freq;
  while (f > 1400) f *= 0.5;
  const t0 = AC.currentTime + atMs / 1000;
  const decay = Math.min(0.5, 0.07 + durMs / 1000 * 1.4);

  const o1 = AC.createOscillator(); o1.type = 'sine'; o1.frequency.value = f;
  const o2 = AC.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 3.95;
  const o2g = AC.createGain(); o2g.gain.value = 0.18;        // quiet overtone
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.value = Math.min(7000, f * 6 + 800);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.32, t0 + 0.003);     // mallet strike
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);   // wooden decay
  o1.connect(lp); o2.connect(o2g); o2g.connect(lp); lp.connect(g); g.connect(sfxGain);
  o1.start(t0); o2.start(t0); o1.stop(t0 + decay + 0.05); o2.stop(t0 + decay + 0.05);
}
// soft pitch glide for the level-clear / "next level" flourish
function sweep(f1, f2, durMs, type = 'triangle', vol = 0.24) {
  if (!AC || !sd) return;
  const t0 = AC.currentTime, t1 = t0 + durMs / 1000;
  const o = AC.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(Math.max(20, Math.min(1400, f1)), t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, Math.min(1400, f2)), t1);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.04);
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  o.connect(lp); lp.connect(g); g.connect(sfxGain);
  o.start(t0); o.stop(t1 + 0.08);
}
// losing a life: a low wooden tumble down the bars instead of a harsh buzz
function sfxDeath() {
  if (!AC || !sd) return;
  const notes = [330, 294, 262, 247, 220, 196, 165, 147];   // descending run
  notes.forEach((f, i) => snd(f, 18, i * 55));
  const t0 = AC.currentTime + notes.length * 0.055;
  const len = Math.floor(AC.sampleRate * 0.22), buf = AC.createBuffer(1, len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource(); src.buffer = buf;
  const g = AC.createGain(); g.gain.value = 0.10;            // gentle wooden thud
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
  src.connect(lp); lp.connect(g); g.connect(sfxGain); src.start(t0);
}

// ---- music: marimba-swing cover of the original tune ("In the Mood"),
//      music.mp3; the chip-synth sequencer below stays as automatic fallback ----
let musicEl = null, musicMp3Ok = true;
function ensureMusicEl() {
  if (musicEl || !musicMp3Ok) return;
  musicEl = new Audio('music.mp3');
  musicEl.loop = true;
  musicEl.preload = 'auto';
  musicEl.addEventListener('error', () => { musicMp3Ok = false; musicEl = null; });
}
function musicSync() {
  ensureMusicEl();
  if (!musicEl) return;                  // mp3 missing -> synth fallback handles it
  if (musicInstalled) {
    musicEl.volume = musicok ? 0.5 : 0;  // muted but still advancing, like the original
    if (musicEl.paused) musicEl.play().catch(() => { });
  } else if (!musicEl.paused) {
    musicEl.pause();
  }
}

// ---- synth fallback sequencer: one entry per 18.2065 Hz tick, like residentmusic ----
const MUS_STEP = 1 / 18.2065;
function musicOn() {
  if (!musicInstalled) {
    musicInstalled = true; musPos = 0;
    ensureMusicEl();
    if (musicEl) { try { musicEl.currentTime = 0; } catch (e) { } }
  }
  musicSync();
}
function musicOff() {
  musicInstalled = false;
  musicStopVoice(AC ? AC.currentTime : 0);
  musicSync();
}
function musicStopVoice(t) {
  if (musVoice) {
    try {
      musVoice.g.gain.cancelScheduledValues(t);
      musVoice.g.gain.setValueAtTime(musVoice.g.gain.value || 0.0001, t);
      musVoice.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      musVoice.o1.stop(t + 0.06); musVoice.o2.stop(t + 0.06);
    } catch (e) { }
    musVoice = null;
  }
}
function musicStartVoice(freq, t) {
  musicStopVoice(t);
  const o1 = AC.createOscillator(), o2 = AC.createOscillator();
  o1.type = 'square'; o2.type = 'triangle';
  o1.frequency.value = freq; o2.frequency.value = freq; o2.detune.value = 6;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2100;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
  o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(musGain);
  o1.start(t); o2.start(t);
  musVoice = { o1, o2, g, freq };
}
function musicScheduler() {
  if (!AC) return;
  if (musicMp3Ok) { ensureMusicEl(); if (musicEl) return; }   // mp3 cover active
  if (musNextT < AC.currentTime - 0.25) musNextT = AC.currentTime + 0.02;
  while (musNextT < AC.currentTime + 0.15) {
    if (musicInstalled) {
      const v = window.BREAKER_MUSIC[musPos];
      if (!musicok || v === 0) musicStopVoice(musNextT);
      else if (!musVoice || musVoice.freq !== v) musicStartVoice(v, musNextT);
      musPos = (musPos + 1) % window.BREAKER_MUSIC.length;
    }
    musNextT += MUS_STEP;
  }
}

/* ===================== Persistent data (cfg + topten) =================== */

let skill = 5, pl = 1, sln = 200, gs = 100, entlife = false;
let kt = DEFAULT_KEYS.slice();      // left,right,fire,pause,sound,music,suicide,next,exit
let tp = [];                        // top ten

function saveoptions() {
  localStorage.setItem('breaker.cfg', JSON.stringify({
    skill, players: pl, prmode: entlife, sd, ms: musicok, gs, sln, k: kt
  }));
  snd(1000, 10);
}
function loadoptions(useSaved) {
  const raw = localStorage.getItem('breaker.cfg');
  if (raw && useSaved) {
    try {
      const o = JSON.parse(raw);
      skill = o.skill; pl = o.players; entlife = o.prmode; sd = o.sd;
      musicok = o.ms; gs = o.gs; sln = o.sln;
      if (Array.isArray(o.k) && o.k.length === 9) kt = o.k;
      return;
    } catch (e) { }
  }
  skill = 5; pl = 1; sln = 200; entlife = false; sd = true; musicok = false;
  gs = Math.floor(sln / 2); kt = DEFAULT_KEYS.slice();
  musicSync();
}
function createbs(force) {
  const raw = localStorage.getItem('breaker.hsc');
  if (!raw || force) {
    tp = [];
    for (let i = 1; i <= 10; i++) tp.push({ name: 'No Name', score: 11 - i, range: 1 });
    localStorage.setItem('breaker.hsc', JSON.stringify(tp));
  } else {
    try { tp = JSON.parse(raw); } catch (e) { createbs(true); }
  }
}
function savebs() { localStorage.setItem('breaker.hsc', JSON.stringify(tp)); }

/* =========================== Game state (globals) ====================== */

let levels = [], lvn = 0;                    // available map numbers
let player = 1, level = 0, loadlevel = 0, db = 0;
let demo = false, pki = false, exitdos = false, normquit = true;
let onestr = 'XYZ';
const delayArr = [0, 0, 0, 0, 0], nextrange = [0, 0, 0, 0, 0],
  life = [0, 0, 0, 0, 0], score = [0, 0, 0, 0, 0], rangeArr = [0, 0, 0, 0, 0];

// playgame-scope state
let ur = 3, ux = 2, lx = 5, ly = 24, ix = 1, iy = -1, vux = 2, vlx = 5, vly = 24;
let nextlevel = false, normexit = true, gameover = false, shsize = 7;
let g = [];                                  // ghosts
let b = { kx: 0, ky: 0, x: 2, y: 2, bm: 0, exist: false, normal: false };
let d = { x: 0, y: 0, t: 'L', exist: false, up1: 32, up2: 7 };
let s = NORMAL;
let f = { x: 0, y: 0, can: false, exist: false };
let m = { x: 0, y: 0, exist: false };
let inPlay = false;                          // renderer: draw paddle/ball?
let holding = false;                         // ball glued / pre-launch

for (let i = 0; i < MAXGHOST; i++) g.push({ x: 0, y: 0, exist: false });

/* ------- render interpolation bookkeeping (visual only) ------- */
const ballAnim = { px: 5, py: 24, t: 0, dur: 75 };
const padAnim = { px: 2, t: 0, dur: 25 };
const bombAnim = { px: 0, py: 0, t: 0 };
const dropAnim = { py: 0, t: 0 };
const ghostAnim = new Map();                 // index -> {px,py,t}
let trail = [];                              // ball trail
let particles = [];
let shakeT = 0;

function ballMoved(fromX, fromY, dur) {
  ballAnim.px = fromX; ballAnim.py = fromY; ballAnim.t = performance.now(); ballAnim.dur = dur;
}
function padMoved(from, dur) { padAnim.px = from; padAnim.t = performance.now(); padAnim.dur = dur; }

function spawnShards(cx, cy, colHex, n = 10) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x: cx, y: cy, vx: (rnd() - 0.5) * 260, vy: -rnd() * 200 - 30,
      life: 0.45 + rnd() * 0.35, age: 0, col: colHex, sz: 2 + rnd() * 3.5, grav: 600
    });
  }
}
function explodeBall() {
  const p = cellCenter(lx, ly);
  for (let i = 0; i < 42; i++) {
    const a = rnd() * Math.PI * 2, v = 60 + rnd() * 280;
    particles.push({
      x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.5 + rnd() * 0.5, age: 0, col: i % 3 ? '#ffd070' : '#ff6a4f', sz: 1.5 + rnd() * 3, grav: 240
    });
  }
  shakeT = performance.now();
}
function cellCenter(cx, cy) { return { x: (cx - 0.5) * CW, y: (cy - 0.5) * CH }; }

/* ===================== Virtual clock (original wait()) ================== */

let vclock = 0;
const waiters = [];
function syncClock() { vclock = performance.now(); }
function gameWait(ms) {
  vclock += ms;
  if (performance.now() >= vclock) return Promise.resolve();
  return new Promise(res => waiters.push({ t: vclock, res }));
}

/* ============================ Overlay UI =============================== */

const overlaysEl = () => document.getElementById('overlays');
function pushOverlay(html, cls = '') {
  const el = document.createElement('div');
  el.className = 'overlay ' + cls;
  el.innerHTML = html;
  overlaysEl().appendChild(el);
  return el;
}
function popOverlay(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

async function confirmYN(text) {       // original sure() style Y/N box
  menuQueue.length = 0; pressedK.clear();
  const el = pushOverlay(`<div class="box qbox"><p>${text}</p><p class="dim">Y / N</p></div>`);
  snd(2000, 5);
  let ans;
  for (;;) {
    const k = await nextMenuKey();
    if (k === 'KeyY') { ans = true; break; }
    if (k === 'KeyN' || k === 'Escape') { ans = false; break; }
  }
  popOverlay(el); resetkeys();
  return ans;
}
async function msgAnyKey(html) {
  const el = pushOverlay(`<div class="box">${html}<p class="dim blink">Press any key</p></div>`);
  await anyKeyWait();
  popOverlay(el);
}

/* ============================== Renderer =============================== */

let cv, ctx, bgCanvas, frameCanvas;
const spriteCache = new Map();

function initRender() {
  cv = document.getElementById('field');
  cv.width = FIELD_W; cv.height = FIELD_H;
  ctx = cv.getContext('2d');
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = FIELD_W; bgCanvas.height = FIELD_H;
  const b2 = bgCanvas.getContext('2d');
  const gr = b2.createLinearGradient(0, 0, 0, FIELD_H);
  gr.addColorStop(0, '#0a0d18'); gr.addColorStop(0.6, '#0d1322'); gr.addColorStop(1, '#070910');
  b2.fillStyle = gr; b2.fillRect(0, 0, FIELD_W, FIELD_H);
  for (let i = 0; i < 90; i++) {
    b2.fillStyle = `rgba(${180 + random(75)},${190 + random(60)},255,${0.04 + rnd() * 0.16})`;
    const r = rnd() < 0.85 ? 1 : 1.6;
    b2.beginPath(); b2.arc(rnd() * FIELD_W, rnd() * FIELD_H, r, 0, 7); b2.fill();
  }
  const vg = b2.createRadialGradient(FIELD_W / 2, FIELD_H / 2, FIELD_H / 3, FIELD_W / 2, FIELD_H / 2, FIELD_H);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  b2.fillStyle = vg; b2.fillRect(0, 0, FIELD_W, FIELD_H);

  frameCanvas = document.createElement('canvas');
  frameCanvas.width = FIELD_W; frameCanvas.height = FIELD_H;
  drawFrame(frameCanvas.getContext('2d'));
  requestAnimationFrame(renderLoop);
}

function metalGrad(c2, x0, y0, x1, y1, base) {
  const gr = c2.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, shade(base, 0.45)); gr.addColorStop(0.35, base);
  gr.addColorStop(0.5, shade(base, -0.18)); gr.addColorStop(0.62, shade(base, 0.08));
  gr.addColorStop(1, shade(base, -0.42));
  return gr;
}

function drawFrame(c2) {
  const base = '#39414f';
  // top bar (row 1), left & right columns
  c2.fillStyle = metalGrad(c2, 0, 0, 0, CH, base); c2.fillRect(0, 0, FIELD_W, CH);
  c2.fillStyle = metalGrad(c2, 0, 0, CW, 0, base); c2.fillRect(0, 0, CW, FIELD_H);
  c2.fillStyle = metalGrad(c2, FIELD_W - CW, 0, FIELD_W, 0, base); c2.fillRect(FIELD_W - CW, 0, CW, FIELD_H);
  c2.strokeStyle = 'rgba(150,200,255,0.35)'; c2.lineWidth = 1;
  c2.strokeRect(CW - 0.5, CH - 0.5, FIELD_W - 2 * CW + 1, FIELD_H - CH + 2);
  // screws
  c2.fillStyle = '#202632';
  for (const [sx, sy] of [[CW / 2, CH / 2], [FIELD_W - CW / 2, CH / 2],
  [CW / 2, FIELD_H - CH / 2], [FIELD_W - CW / 2, FIELD_H - CH / 2],
  [FIELD_W / 2, CH / 2]]) {
    c2.beginPath(); c2.arc(sx, sy, 4, 0, 7); c2.fill();
    c2.strokeStyle = 'rgba(255,255,255,0.25)';
    c2.beginPath(); c2.moveTo(sx - 3, sy); c2.lineTo(sx + 3, sy); c2.stroke();
  }
  // bottom danger fade
  const dg = c2.createLinearGradient(0, FIELD_H - 10, 0, FIELD_H);
  dg.addColorStop(0, 'rgba(255,60,40,0)'); dg.addColorStop(1, 'rgba(255,60,40,0.45)');
  c2.fillStyle = dg; c2.fillRect(CW, FIELD_H - 10, FIELD_W - 2 * CW, 10);
}

const BRICKY = new Set([1, 3, 4, 8, 15, 24, 30, 176, 177, 178, 219]);

function brickBaseColor(ch, attr) {
  const fg = attr & 15, bg = (attr >> 4) & 7;
  if (ch === 176 || ch === 177 || ch === 178) {
    const t = ch === 176 ? 0.42 : ch === 177 ? 0.66 : 0.9;   // shade density: fg over bg
    return mix(PAL[bg], PAL[fg], t);
  }
  if (ch === 219) return fg === 0 ? '#3c4350' : PAL[fg];
  // glyph bricks: plate = background colour, icon = foreground
  return bg === 0 ? '#343b49' : PAL[bg];
}

function roundRect(c2, x, y, w, h, r) {
  c2.beginPath();
  c2.moveTo(x + r, y); c2.arcTo(x + w, y, x + w, y + h, r);
  c2.arcTo(x + w, y + h, x, y + h, r); c2.arcTo(x, y + h, x, y, r);
  c2.arcTo(x, y, x + w, y, r); c2.closePath();
}

function getBrickSprite(ch, attr) {
  const key = ch + '_' + attr;
  let sp = spriteCache.get(key);
  if (sp) return sp;
  const w = CW * 4, h = CH;
  sp = document.createElement('canvas'); sp.width = w; sp.height = h;
  const c2 = sp.getContext('2d');
  const base = brickBaseColor(ch, attr);
  const fg = PAL[attr & 15];
  const bx = 1, by = 1, bw = w - 2, bh = h - 3;

  // body with metallic two-tone gradient
  roundRect(c2, bx, by, bw, bh, 5);
  c2.fillStyle = metalGrad(c2, 0, by, 0, by + bh, base);
  c2.fill();
  // glossy diagonal sweep
  c2.save(); roundRect(c2, bx, by, bw, bh, 5); c2.clip();
  const gl = c2.createLinearGradient(0, 0, w * 0.7, h);
  gl.addColorStop(0, 'rgba(255,255,255,0.30)'); gl.addColorStop(0.45, 'rgba(255,255,255,0.05)');
  gl.addColorStop(0.55, 'rgba(255,255,255,0)');
  c2.fillStyle = gl; c2.fillRect(bx, by, bw, bh * 0.55);
  if (ch === 219) {   // brushed steel lines + hazard feel
    c2.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let i = -h; i < w; i += 7) {
      c2.beginPath(); c2.moveTo(i, h); c2.lineTo(i + h, 0); c2.stroke();
    }
  }
  c2.restore();
  // bevel strokes
  roundRect(c2, bx + 0.5, by + 0.5, bw - 1, bh - 1, 4.5);
  c2.strokeStyle = 'rgba(255,255,255,0.35)'; c2.lineWidth = 1; c2.stroke();
  roundRect(c2, bx + 1.5, by + 1.5, bw - 3, bh - 3, 4);
  c2.strokeStyle = 'rgba(0,0,0,0.35)'; c2.stroke();

  const rivet = (rx, ry) => {
    c2.fillStyle = 'rgba(0,0,0,0.35)'; c2.beginPath(); c2.arc(rx, ry + 0.7, 2.4, 0, 7); c2.fill();
    const rg = c2.createRadialGradient(rx - 0.7, ry - 0.7, 0.3, rx, ry, 2.4);
    rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, shade(base, -0.1));
    c2.fillStyle = rg; c2.beginPath(); c2.arc(rx, ry, 2.2, 0, 7); c2.fill();
  };
  if (ch === 177) { rivet(8, h / 2 - 1); rivet(w - 8, h / 2 - 1); }
  if (ch === 178) {
    rivet(8, 6); rivet(w - 8, 6); rivet(8, h - 8); rivet(w - 8, h - 8);
    c2.fillStyle = 'rgba(0,0,0,0.18)'; c2.fillRect(bx + 4, h / 2 - 2.5, bw - 8, 4);
    c2.fillStyle = 'rgba(255,255,255,0.12)'; c2.fillRect(bx + 4, h / 2 - 2.5, bw - 8, 1.4);
  }
  if (ch === 219) { rivet(7, 6); rivet(w - 7, 6); rivet(7, h - 8); rivet(w - 7, h - 8); }

  // icons for special bricks
  const cx = w / 2, cy = (h - 1) / 2;
  c2.save();
  c2.shadowColor = fg; c2.shadowBlur = 7;
  c2.strokeStyle = fg; c2.fillStyle = fg; c2.lineWidth = 2;
  switch (ch) {
    case 4:   // target brick — bullseye
      c2.beginPath(); c2.arc(cx, cy, 7.2, 0, 7); c2.stroke();
      c2.beginPath(); c2.arc(cx, cy, 3, 0, 7); c2.fill();
      break;
    case 3:   // points — heart
      c2.beginPath();
      c2.moveTo(cx, cy + 6);
      c2.bezierCurveTo(cx - 9, cy - 1, cx - 5.5, cy - 7.5, cx, cy - 2.5);
      c2.bezierCurveTo(cx + 5.5, cy - 7.5, cx + 9, cy - 1, cx, cy + 6);
      c2.fill();
      break;
    case 15:  // surprise — ?
      c2.font = 'bold 15px Verdana,system-ui'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
      c2.fillText('?', cx, cy + 1);
      break;
    case 8:   // gives shot (breakable) — bullet up
      c2.beginPath(); c2.moveTo(cx, cy - 7); c2.lineTo(cx + 4.5, cy); c2.lineTo(cx + 2, cy);
      c2.lineTo(cx + 2, cy + 6); c2.lineTo(cx - 2, cy + 6); c2.lineTo(cx - 2, cy);
      c2.lineTo(cx - 4.5, cy); c2.closePath(); c2.fill();
      break;
    case 24:  // permanent shot dispenser — double chevron up
      c2.beginPath(); c2.moveTo(cx - 6, cy + 5); c2.lineTo(cx, cy - 1); c2.lineTo(cx + 6, cy + 5); c2.stroke();
      c2.beginPath(); c2.moveTo(cx - 6, cy - 1); c2.lineTo(cx, cy - 7); c2.lineTo(cx + 6, cy - 1); c2.stroke();
      break;
    case 30:  // bomb dropper
      c2.beginPath(); c2.arc(cx, cy + 1.5, 5.5, 0, 7); c2.fill();
      c2.lineWidth = 1.6;
      c2.beginPath(); c2.moveTo(cx + 2.5, cy - 3); c2.quadraticCurveTo(cx + 5, cy - 8, cx + 8, cy - 6.5); c2.stroke();
      c2.fillStyle = '#ffd84d'; c2.shadowColor = '#ffd84d';
      c2.beginPath(); c2.arc(cx + 8.3, cy - 6.5, 1.7, 0, 7); c2.fill();
      break;
    case 1:   // ghost spawner — face
      c2.beginPath(); c2.arc(cx, cy, 7, 0, 7); c2.stroke();
      c2.shadowBlur = 0;
      c2.beginPath(); c2.arc(cx - 2.6, cy - 2, 1.3, 0, 7); c2.fill();
      c2.beginPath(); c2.arc(cx + 2.6, cy - 2, 1.3, 0, 7); c2.fill();
      c2.lineWidth = 1.4;
      c2.beginPath(); c2.arc(cx, cy + 1.2, 3.6, 0.25 * Math.PI, 0.75 * Math.PI); c2.stroke();
      break;
  }
  c2.restore();
  spriteCache.set(key, sp);
  return sp;
}

function drawGhost(c2, px, py, t, idx) {
  const bobY = Math.sin(t / 260 + idx * 1.7) * 2;
  const x = px, y = py + bobY;
  const w = CW - 5, h = CH - 8;
  c2.save();
  c2.shadowColor = '#b9a9ff'; c2.shadowBlur = 8;
  const gr = c2.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  gr.addColorStop(0, '#f4efff'); gr.addColorStop(1, '#9d8fd6');
  c2.fillStyle = gr;
  c2.beginPath();
  c2.moveTo(x - w / 2, y + h / 2);
  c2.lineTo(x - w / 2, y - h / 6);
  c2.arc(x, y - h / 6, w / 2, Math.PI, 0);
  c2.lineTo(x + w / 2, y + h / 2);
  const wave = w / 3;
  for (let i = 0; i < 3; i++) {
    c2.quadraticCurveTo(x + w / 2 - wave * (i + 0.5), y + h / 2 + (i % 2 ? 3 : -3), x + w / 2 - wave * (i + 1), y + h / 2);
  }
  c2.closePath(); c2.fill();
  c2.shadowBlur = 0;
  c2.fillStyle = '#272040';
  c2.beginPath(); c2.arc(x - 3.4, y - 3 + bobY * 0.2, 1.8, 0, 7); c2.fill();
  c2.beginPath(); c2.arc(x + 3.4, y - 3 + bobY * 0.2, 1.8, 0, 7); c2.fill();
  c2.restore();
}

function lerpPos(animX, animY, curX, curY, t0, dur) {
  const k = Math.min(1, (performance.now() - t0) / Math.max(1, dur));
  return { x: animX + (curX - animX) * k, y: animY + (curY - animY) * k };
}

function renderLoop(now) {
  // resolve virtual-clock waiters
  if (vclock < now - 250) vclock = now - 250;
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (waiters[i].t <= now) { const w = waiters.splice(i, 1)[0]; w.res(); }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, FIELD_W, FIELD_H);
  ctx.drawImage(bgCanvas, 0, 0);
  const shAge = now - shakeT;
  if (shAge < 280) {
    const a = (1 - shAge / 280) * 5;
    ctx.translate((rnd() - 0.5) * a, (rnd() - 0.5) * a);
  }

  // ---- bricks & static cells (rows 2..24, cols 2..49) ----
  for (let y = 2; y <= 24; y++) {
    let x = 2;
    while (x <= 49) {
      const ch = gridCh[y * (COLS + 1) + x];
      if (BRICKY.has(ch)) {
        const attr = gridCol[y * (COLS + 1) + x];
        let run = 1;
        while (run < 4 && x + run <= 49 &&
          gridCh[y * (COLS + 1) + x + run] === ch && gridCol[y * (COLS + 1) + x + run] === attr) run++;
        const sp = getBrickSprite(ch, attr);
        const px = (x - 1) * CW, py = (y - 1) * CH;
        if (run === 4) ctx.drawImage(sp, px, py);
        else ctx.drawImage(sp, 0, 0, run * CW, CH, px, py, run * CW, CH);
        if (attr & 128) {     // blink attribute -> pulsing glow
          ctx.save();
          ctx.globalAlpha = 0.25 + 0.25 * Math.sin(now / 160);
          ctx.fillStyle = PAL[attr & 15];
          roundRect(ctx, px + 1, py + 1, run * CW - 2, CH - 3, 5); ctx.fill();
          ctx.restore();
        }
        if (ch === 4) {       // target brick pulse
          ctx.save();
          ctx.globalAlpha = 0.18 + 0.18 * Math.sin(now / 220);
          ctx.fillStyle = '#ffffff';
          roundRect(ctx, px + 1, py + 1, run * CW - 2, CH - 3, 5); ctx.fill();
          ctx.restore();
        }
        x += run;
      } else x++;
    }
  }

  ctx.drawImage(frameCanvas, 0, 0);

  if (inPlay) {
    // ---- paddle ----
    const pk = Math.min(1, (now - padAnim.t) / Math.max(1, padAnim.dur));
    const puX = (padAnim.px + (ux - padAnim.px) * pk - 1) * CW;
    drawPaddle(ctx, puX, (ROWS - 1) * CH, shsize * CW, now);

    // ---- dropping letter ----
    if (d.exist) {
      const dk = Math.min(1, (now - dropAnim.t) / Math.max(1, 3 * delayArr[player]));
      const dy = (dropAnim.py + (d.y - dropAnim.py) * dk - 0.5) * CH;
      drawLetter(ctx, (d.x - 0.5) * CW, dy, d.t, now);
    }

    // ---- bomb ----
    if (b.exist && gscr(b.y, b.x, 1) === 31) {
      const bk = Math.min(1, (now - bombAnim.t) / Math.max(1, 3 * delayArr[player]));
      const bx = (bombAnim.px + (b.x - bombAnim.px) * bk - 0.5) * CW;
      const by = (bombAnim.py + (b.y - bombAnim.py) * bk - 0.5) * CH;
      drawBomb(ctx, bx, by, now);
    }

    // ---- bullet ----
    if (f.exist) {
      const p = cellCenter(f.x, f.y);
      ctx.save();
      ctx.shadowColor = '#ffe9a0'; ctx.shadowBlur = 10;
      const gr = ctx.createLinearGradient(0, p.y - 8, 0, p.y + 8);
      gr.addColorStop(0, '#fffbe8'); gr.addColorStop(1, '#ffb13d');
      ctx.fillStyle = gr;
      roundRect(ctx, p.x - 2.2, p.y - 8, 4.4, 16, 2.2); ctx.fill();
      ctx.restore();
    }

    // ---- megashot ----
    if (m.exist) {
      const p = cellCenter(m.x, m.y);
      ctx.save();
      const r = 8 + Math.sin(now / 50) * 1.5;
      ctx.shadowColor = '#ff5340'; ctx.shadowBlur = 18;
      const gr = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
      gr.addColorStop(0, '#fff3d0'); gr.addColorStop(0.5, '#ff9340'); gr.addColorStop(1, '#e02e1f');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      ctx.restore();
    }

    // ---- ghosts ----
    for (let i = 0; i < MAXGHOST; i++) {
      const gh = g[i];
      if (!gh.exist) { ghostAnim.delete(i); continue; }
      let an = ghostAnim.get(i);
      if (!an) { an = { px: gh.x, py: gh.y, cx: gh.x, cy: gh.y, t: now }; ghostAnim.set(i, an); }
      if (an.cx !== gh.x || an.cy !== gh.y) { an.px = an.cx; an.py = an.cy; an.cx = gh.x; an.cy = gh.y; an.t = now; }
      const gk = Math.min(1, (now - an.t) / Math.max(1, 3 * delayArr[player]));
      drawGhost(ctx, ((an.px + (gh.x - an.px) * gk) - 0.5) * CW, ((an.py + (gh.y - an.py) * gk) - 0.5) * CH, now, i);
    }

    // ---- ball + trail ----
    if (!gameover || holding) {
      const bp = lerpPos(ballAnim.px, ballAnim.py, lx, ly, ballAnim.t, ballAnim.dur);
      const px = (bp.x - 0.5) * CW, py = (bp.y - 0.5) * CH;
      trail.push({ x: px, y: py, t: now });
      while (trail.length && now - trail[0].t > 230) trail.shift();
      for (const tr of trail) {
        const a = 1 - (now - tr.t) / 230;
        ctx.fillStyle = `rgba(140,190,255,${a * a * 0.3})`;
        ctx.beginPath(); ctx.arc(tr.x, tr.y, 7 * a, 0, 7); ctx.fill();
      }
      ctx.save();
      ctx.shadowColor = '#9cc8ff'; ctx.shadowBlur = 14;
      const gr = ctx.createRadialGradient(px - 2.5, py - 3, 1, px, py, 8);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#dceaff'); gr.addColorStop(1, '#7fa8e8');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(px, py, 7.4, 0, 7); ctx.fill();
      ctx.restore();
    } else trail.length = 0;
  } else { trail.length = 0; ghostAnim.clear(); }

  // ---- particles ----
  if (particles.length) {
    const dt = 1 / 60;
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = 1 - p.age / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
    }
    ctx.restore();
  }

  updateHUD();
  requestAnimationFrame(renderLoop);
}

function drawPaddle(c2, px, py, w, now) {
  // Original shape ▄█▀▀▀█▄ : thin top deck, 45° slopes descending to low end pads.
  const yT = py + 4, yB = py + CH - 3, hDeck = 8, pad = CW * 0.55, slope = yB - yT - 2;
  c2.save();
  c2.shadowColor = '#52c8ff'; c2.shadowBlur = 12;
  c2.beginPath();
  c2.moveTo(px, yB);                       // left pad bottom-left
  c2.lineTo(px, yB - 6);
  c2.lineTo(px + pad, yB - 6);
  c2.lineTo(px + pad + slope, yT);         // 45° rise
  c2.lineTo(px + w - pad - slope, yT);     // deck
  c2.lineTo(px + w - pad, yB - 6);         // 45° fall
  c2.lineTo(px + w, yB - 6);
  c2.lineTo(px + w, yB);
  c2.closePath();
  const gr = c2.createLinearGradient(0, yT, 0, yB);
  gr.addColorStop(0, '#eaf8ff'); gr.addColorStop(0.35, '#7fc4e8');
  gr.addColorStop(0.55, '#3a7fa6'); gr.addColorStop(1, '#16344a');
  c2.fillStyle = gr; c2.fill();
  c2.shadowBlur = 0;
  c2.strokeStyle = 'rgba(190,240,255,0.9)'; c2.lineWidth = 1.6;
  c2.beginPath();
  c2.moveTo(px + 1, yB - 6);
  c2.lineTo(px + pad, yB - 6);
  c2.lineTo(px + pad + slope, yT);
  c2.lineTo(px + w - pad - slope, yT);
  c2.lineTo(px + w - pad, yB - 6);
  c2.lineTo(px + w - 1, yB - 6);
  c2.stroke();
  if (s === MEGASHOOT) {     // armed megashot core (original drew char 234 mid-paddle)
    const cx = px + w / 2;
    c2.shadowColor = '#ff5340'; c2.shadowBlur = 12;
    const rg = c2.createRadialGradient(cx, yT + 4, 0.5, cx, yT + 4, 6);
    rg.addColorStop(0, '#fff0c8'); rg.addColorStop(1, '#e02e1f');
    c2.fillStyle = rg;
    c2.beginPath(); c2.arc(cx, yT + 4, 5 + Math.sin(now / 90), 0, 7); c2.fill();
  }
  c2.restore();
}

function drawLetter(c2, px, py, t, now) {
  const info = LETTER_INFO[t] || { col: '#fff' };
  const sway = Math.sin(now / 200) * 1.5;
  c2.save();
  c2.translate(px + sway, py);
  c2.shadowColor = info.col; c2.shadowBlur = 10;
  const gr = c2.createLinearGradient(0, -10, 0, 10);
  gr.addColorStop(0, shade(info.col, 0.45)); gr.addColorStop(0.5, info.col); gr.addColorStop(1, shade(info.col, -0.4));
  c2.fillStyle = gr;
  roundRect(c2, -8, -10.5, 16, 21, 7); c2.fill();
  c2.shadowBlur = 0;
  c2.strokeStyle = 'rgba(255,255,255,0.55)'; c2.lineWidth = 1;
  roundRect(c2, -7.5, -10, 15, 20, 6.5); c2.stroke();
  c2.fillStyle = '#10131c';
  c2.font = 'bold 13px Verdana,system-ui'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
  c2.fillText(t, 0, 1);
  c2.restore();
}

function drawBomb(c2, px, py, now) {
  c2.save();
  c2.shadowColor = '#ff7340'; c2.shadowBlur = 8;
  const gr = c2.createRadialGradient(px - 2, py - 2, 1, px, py, 7);
  gr.addColorStop(0, '#6a7180'); gr.addColorStop(0.4, '#2a2f3a'); gr.addColorStop(1, '#0c0e14');
  c2.fillStyle = gr;
  c2.beginPath(); c2.arc(px, py + 1, 6.5, 0, 7); c2.fill();
  c2.strokeStyle = '#8e96a5'; c2.lineWidth = 1.4;
  c2.beginPath(); c2.moveTo(px + 2, py - 4); c2.quadraticCurveTo(px + 4, py - 9, px + 7, py - 8); c2.stroke();
  const sp = 1.5 + Math.sin(now / 60) * 1;
  c2.fillStyle = '#ffd84d'; c2.shadowColor = '#ffd84d'; c2.shadowBlur = 10;
  c2.beginPath(); c2.arc(px + 7.2, py - 8, sp, 0, 7); c2.fill();
  c2.restore();
}

/* ============================== HUD ==================================== */

const hudCache = {};
function setHud(id, val) {
  if (hudCache[id] === val) return;
  hudCache[id] = val;
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function updateHUD() {
  setHud('h-level', inPlay ? String(level || '-') : '-');
  setHud('h-player', String(player));
  setHud('h-score', String(score[player] || 0));
  setHud('h-bricks', inPlay ? String(Math.max(0, db)) : '-');
  setHud('h-lives', entlife ? '∞' : String(life[player] || 0));
  setHud('h-range', RANGESTR[(rangeArr[player] || 1) - 1]);
  setHud('h-shoot', f.can ? 'Yes' : 'No');
  setHud('h-sound', sd ? 'On' : 'Off');
  setHud('h-music', musicok ? 'On' : 'Off');
  const dm = document.getElementById('demobadge');
  if (dm) dm.style.display = (demo && inPlay) ? 'block' : 'none';
}

/* ====================== Game logic (ported procs) ======================= */

function clearthing(x, y) { sscr(y, x, 1, 32); sscr(y, x, 2, 7); }
function clearletter() { if (d.exist) { sscr(d.y, d.x, 1, d.up1); sscr(d.y, d.x, 2, d.up2); } }
function viewletter() { if (d.exist) { sscr(d.y, d.x, 1, d.t.charCodeAt(0)); sscr(d.y, d.x, 2, 14); } }

function writescore() {        // keeps the original side-effect!
  if (db < 0) db = 0;
  if (db === 0) gameover = true;
}

async function declives() {
  if (!gameover) {
    if (!entlife) life[player]--;
    gameover = true;
    explodeBall();
    sfxDeath();
    await sleep(620);
    clearthing(lx, ly);
    syncClock();
  }
}

function nextbomb() {
  if (b.normal) {
    b.bm++; if (b.bm > 3) b.bm = 0;
    if (gscr(b.y, b.x, 1) !== 30) { b.x = b.kx + b.bm; b.y = b.ky; bombAnim.px = b.x; bombAnim.py = b.y; bombAnim.t = performance.now(); }
  } else b.exist = false;
}

function viewshoot() {
  if (ux < vux) sscr(25, ux + shsize, 1, 32);
  else if (ux > vux) sscr(25, ux - 1, 1, 32);
  sscr(25, ux, 1, 220); sscr(25, ux + 1, 1, 219);
  for (let x = ux + 2; x <= ux + shsize - 3; x++) sscr(25, x, 1, 223);
  sscr(25, ux + shsize - 2, 1, 219); sscr(25, ux + shsize - 1, 1, 220);
  if (s === MEGASHOOT) sscr(25, ux + Math.floor(shsize / 2), 1, 234);
  fillline(ux, 25, 2, shsize, 7);
}

function searchbrick(y, mx) {
  let i = 2, k = 0;
  const target = gscr(y, mx, 1);
  while (k === 0) {
    if (gscr(y, i, 1) === target) { if (i > mx - 4) k = i; else i += 4; }
    else i++;
    if (i > 49 && k === 0) return mx;     // safety net (original relied on guards)
  }
  return k;
}

function fillbrick(x, y, t, c) {
  if (t === 32) {   // visual: shattering brick
    const oldCol = gridCol[y * (COLS + 1) + x], oldCh = gridCh[y * (COLS + 1) + x];
    if (oldCh !== 32 && BRICKY.has(oldCh)) {
      const cc = cellCenter(x + 2, y);
      spawnShards(cc.x, cc.y, brickBaseColor(oldCh, oldCol), 12);
    }
  }
  for (let i = 0; i <= 3; i++) {
    sscr(y, x + i, 1, t); sscr(y, x + i, 2, c);
    if (d.exist && y === d.y && x + i === d.x) { d.up1 = t; d.up2 = c; }
  }
}

function startletter(tx, ty) {
  d.x = tx + random(4); d.y = ty;
  d.t = DT[random(DT.length)];
  d.exist = true; d.up1 = 32; d.up2 = 7;
  sscr(d.y, d.x, 1, d.t.charCodeAt(0)); sscr(d.y, d.x, 2, 14);
  dropAnim.py = d.y; dropAnim.t = performance.now();
}
function letterAt(x, y) { return d.exist && x === d.x && y === d.y; }

function brick(ty, tx) {
  const tt = gscr(ty, tx, 1);
  if (tt === 2) return;
  tx = searchbrick(ty, tx);
  switch (tt) {
    case 4:
      if (!gameover) { score[player] += 10; db = 0; fillbrick(tx, ty, 32, 7); }
      break;
    case 176:
      fillbrick(tx, ty, 32, 7);
      score[player] += 1; db--;
      if (!d.exist && rnd() < 0.1) startletter(tx, ty);
      break;
    case 15: {
      const r = random(20);
      if (r <= 3) {
        fillbrick(tx, ty, JT[random(JT.length)], gscr(ty, tx, 2));
      } else {
        if (d.exist) fillbrick(tx, ty, JT[random(JT.length)], gscr(ty, tx, 2));
        else { db--; fillbrick(tx, ty, 32, 7); startletter(tx, ty); }
      }
      break;
    }
    case 177:
      fillbrick(tx, ty, 176, gscr(ty, tx, 2)); score[player] += 1; break;
    case 178:
      fillbrick(tx, ty, 177, gscr(ty, tx, 2)); score[player] += 2; break;
    case 24: case 8:
      if (tt === 8) { fillbrick(tx, ty, 32, 7); db--; score[player]++; }
      if (s !== MEGASHOOT) f.can = true;
      break;
    case 30:
      if (b.exist && (tx !== b.kx || ty !== b.ky)) {
        if (gscr(b.y, b.x, 1) === 31) clearthing(b.x, b.y);
        b.exist = false;
      }
      if (!b.exist) {
        b.kx = tx; b.ky = ty; b.y = ty; b.x = tx; b.bm = 0; b.exist = true; b.normal = true;
        bombAnim.px = b.x; bombAnim.py = b.y; bombAnim.t = performance.now();
      }
      break;
    case 3:
      score[player] += Math.trunc(rnd() * 10) + 5;
      fillbrick(tx, ty, 32, 7); db--;
      break;
    case 1: {
      let j = 0; db--;
      for (let i = 0; i < MAXGHOST; i++) {
        const gh = g[i];
        if (!gh.exist) {
          gh.x = tx + j; gh.y = ty; gh.exist = true;
          sscr(ty, tx + j, 2, 7);
          j++;
          if (j === 4) break;
        }
      }
      fillbrick(tx, ty, 2, 7);
      break;
    }
  }
  writescore();
}

function isbrick(x, y) {
  const ch = gscr(y, x, 1);
  return !(ch === 7 || ch === 9 || ch === 31 || ch === 32 || ch === 234);
}

/* ------------------------------ ball ---------------------------------- */

function balltest() {
  clearletter();
  if (isbrick(lx, ly)) {
    brick(ly, lx);
    ix = -ix; iy = -iy;
    lx += ix; ly += iy;
  }
  if (lx > 5 && isbrick(lx - 1, ly)) { brick(ly, lx - 1); ix = 1; }
  if (lx < 46 && isbrick(lx + 1, ly)) { brick(ly, lx + 1); ix = -1; }
  if (ly > 2 && isbrick(lx, ly - 1)) { brick(ly - 1, lx); iy = 1; }
  if (iy === 1 && isbrick(lx, ly + 1)) { brick(ly + 1, lx); iy = -1; }
  viewletter();
}

async function breakertest() {
  if (ly > 23) {
    if ((ix === 1 && (lx === ux - 1 || lx === ux)) ||
      (ix === -1 && (lx === ux + shsize || lx === ux + shsize - 1))) {
      ix = -ix; iy = -1;          // 45° end: straight back where it came from
    }
    if (lx > ux && lx < ux + shsize - 1) iy = -1;
    if (s === GLUE && ((lx >= ux + 1 && lx <= ux + shsize - 2) ||
      (lx === ux && ix === 1) || (lx === shsize - 1 && ix === -1))) {
      ur = lx - ux;
      if (f.exist) { f.exist = false; clearthing(f.x, f.y); }
      await movetostart();
      if (ur < 3) ix = -1; else if (ur > 3) ix = 1; else ix = 1 - Math.trunc(rnd() * 2) * 2;
    }
  }
}

async function alltest() {
  if (ly + iy > 24) await breakertest();
  if (lx === 2) ix = 1;
  if (lx === 49) ix = -1;
  if (ly === 2) iy = 1;
  lx += ix; ly += iy;
  if (ly > 24) {
    sscr(vly, vlx, 1, 32); sscr(vly, vlx, 2, 7);
    await declives();
  } else if (ly < 22) balltest();
  if (lx === 2) ix = 1;
  if (lx === 49) ix = -1;
  if (ly === 2) iy = 1;
}

async function moveball() {
  vlx = lx; vly = ly;
  const vix = ix, viy = iy;
  await alltest();
  sscr(vly, vlx, 1, 32); sscr(vly, vlx, 2, 7);
  if (!gameover) {
    sscr(ly, lx, 1, 9); sscr(ly, lx, 2, 15);
    ballMoved(vlx, vly, 3 * delayArr[player]);
  }
  if (ix !== vix || iy !== viy) { snd(800, 2); snd(1000, 2, 2); }
}

function moveb(i) {        // ball pushed by bullet (-1) or bomb (+1)
  const t = gscr(ly + i, lx, 1);
  if (!(t === 31 || t === 7) && ly > 2 && ly < 25) {
    clearthing(lx, ly);
    if (gscr(ly + i, lx, 1) !== 32) {
      clearletter();
      brick(ly + i, lx);
      viewletter();
      snd(800, 3);
    } else {
      iy = i; ly += i;
      snd(2000, 3);
      ballMoved(lx, ly - i, 3 * delayArr[player]);
    }
    sscr(ly, lx, 1, 9); sscr(ly, lx, 2, 15);
  }
  if (i === -1) f.exist = false;
}

/* -------------------------- bullet / mega / bomb ----------------------- */

function bangtest() {
  if (b.exist && f.exist && f.x === b.x && f.y === b.y) {
    snd(2000, 5);
    clearthing(f.x, f.y);
    nextbomb();
    f.exist = false;
  }
}

function moveshoot() {
  clearthing(f.x, f.y);
  f.y--;
  bangtest();
  if (gscr(f.y, f.x, 1) === 9) moveb(-1);
  if (gscr(f.y, f.x, 1) === 2) {
    for (let i = 0; i < MAXGHOST; i++) {
      const gh = g[i];
      if (gh.exist && f.x === gh.x && f.y === gh.y) {
        gh.exist = false; f.exist = false;
        sscr(gh.y, gh.x, 1, 32);
        snd(2000, 3);
        score[player]++;
        writescore();
      }
    }
  }
  if (isbrick(f.x, f.y) && !letterAt(f.x, f.y)) {
    clearletter();
    brick(f.y, f.x);
    viewletter();
    snd(3000, 2);
    f.exist = false;
  }
  if (f.y === 1) f.exist = false;
  if (f.exist) { sscr(f.y, f.x, 1, 7); sscr(f.y, f.x, 2, 15); }
}

function movemegashoot() {
  clearthing(m.x, m.y);
  m.y--;
  clearletter();
  const gsv = gscr(m.y, m.x, 1);
  switch (gsv) {
    case 31:
      if (gscr(b.y, b.x, 1) === 31) { clearthing(b.x, b.y); b.exist = false; }
      break;
    case 9: moveb(-1); break;
    case 2:
      for (let i = 0; i < MAXGHOST; i++) {
        const gh = g[i];
        if (gh.exist && m.x === gh.x && m.y === gh.y) {
          gh.exist = false;
          snd(2000, 3);
          score[player]++;
          writescore();
        }
      }
      break;
    case 1: case 3: case 4: case 8: case 15: case 24: case 30:
    case 176: case 177: case 178: case 219: {
      snd(2000, 5);
      switch (gsv) {
        case 4: case 176: case 3: case 8: case 24:
          brick(m.y, m.x); break;
        case 177: case 178: case 1: case 15:
          db--; break;
        case 30:
          if (b.exist && b.ky === m.y && searchbrick(m.y, m.x) === b.kx) b.normal = false;
          break;
      }
      if (gscr(m.y, m.x, 1) !== 32) fillbrick(searchbrick(m.y, m.x), m.y, 32, 7);
      writescore();
      break;
    }
  }
  if (m.y === 1) m.exist = false;
  if (m.exist) { sscr(m.y, m.x, 1, 234); sscr(m.y, m.x, 2, 12); }
  viewletter();
}

async function movebomb() {
  if (gscr(b.y, b.x, 1) === 31) clearthing(b.x, b.y);
  b.y++;
  bombAnim.px = b.x; bombAnim.py = b.y - 1; bombAnim.t = performance.now();
  if (b.y === 25 && b.x < ux + shsize && b.x >= ux) {
    sscr(b.y, b.x, 1, 31); sscr(b.y, b.x, 2, 7);
    await declives();
    clearthing(lx, ly);
  }
  const gsv = gscr(b.y, b.x, 1);
  switch (gsv) {
    case 9:
      nextbomb(); moveb(1); break;
    case 2:
      for (let i = 0; i < MAXGHOST; i++) {
        const gh = g[i];
        if (gh.exist && b.x === gh.x && b.y === gh.y) {
          gh.exist = false;
          nextbomb();
          sscr(gh.y, gh.x, 1, 32);
          snd(2000, 3);
          score[player]++;
          writescore();
        }
      }
      break;
    case 234:
      b.exist = false; snd(2000, 5); break;
  }
  bangtest();
  if (b.y < 22 && isbrick(b.x, b.y)) {
    clearletter();
    brick(b.y, b.x);
    viewletter();
    snd(5000, 2);
    nextbomb();
  }
  if (b.y === 25) nextbomb();
  if (b.exist && gscr(b.y, b.x, 1) === 32) { sscr(b.y, b.x, 1, 31); sscr(b.y, b.x, 2, 7); }
}

/* ----------------------------- letter drop ----------------------------- */

function droppingthing() {
  clearletter();
  d.y++;
  dropAnim.py = d.y - 1; dropAnim.t = performance.now();
  if (d.y === 25 && d.x >= ux && d.x < ux + shsize) {
    d.exist = false;
    const olds = s;
    switch (d.t) {
      case 'L':
        life[player]++;
        snd(500, 5); snd(1000, 8, 5);
        s = NORMAL; break;
      case 'G':
        if (s !== GLUE) { snd(1000, 5); snd(4000, 3, 5); s = GLUE; }
        break;
      case 'E':
        if (s === BIG) snd(800, 5); else s = BIG;
        break;
      case 'X':
        snd(300, 5); s = NORMAL; break;
      case 'M':
        snd(3000, 8);
        s = MEGASHOOT; f.can = false;
        if (f.exist) { clearthing(f.x, f.y); f.exist = false; }
        break;
      case 'F':
        s = NORMAL; f.can = true; snd(2400, 3); break;
      case 'P':
        score[player] += random(60) + 40;
        writescore();
        s = NORMAL;
        snd(2000, 3); snd(1000, 4, 3); snd(3000, 2, 7);
        break;
    }
    const cc = cellCenter(d.x, 24);
    spawnShards(cc.x, cc.y, (LETTER_INFO[d.t] || { col: '#fff' }).col, 14);
    if (s === BIG && olds !== BIG) {
      for (let i = 2; i <= 7; i++) snd(d.x * 100, 2, i * 4);
      shsize = 9;
      if (ux > 2) ux--;
      if (ux + shsize > 50) { ux = 50 - shsize; vux = ux; }
      fillline(2, 25, 1, 48, 32);
      viewshoot();
    }
    if (s !== BIG && olds === BIG) {
      shsize = 7;
      ux++;
      fillline(2, 25, 1, 48, 32);
      viewshoot();
    }
  } else if (d.y === 26) {
    d.exist = false;
    snd(400, 5); snd(200, 5, 5);
  } else {
    d.up1 = gscr(d.y, d.x, 1);
    d.up2 = gscr(d.y, d.x, 2);
    if ([2, 7, 31, 9, 234].includes(d.up1)) { d.up1 = 32; d.up2 = 7; }
    viewletter();
  }
}

/* ------------------------------- ghosts -------------------------------- */

function moveghost() {
  for (let i = 0; i < MAXGHOST; i++) {
    const gh = g[i];
    if (!gh.exist) continue;
    const vx = gh.x, vy = gh.y;
    const xnear = () => { if (gh.x < lx) gh.x++; if (gh.x > lx) gh.x--; };
    const ynear = () => { if (gh.y < ly && ly < 23) gh.y++; if (gh.y > ly) gh.y--; };
    const r = random(4 + Math.floor((rangeArr[player] - 1) / 2));
    switch (r) {
      case 0: gh.x++; break;
      case 1: gh.x--; break;
      case 2: if (gh.y < 23) gh.y++; break;
      case 3: gh.y--; break;
      default:
        if (random(2) === 0) {
          ynear(); if (vx === gh.x && vy === gh.y) xnear();
        } else {
          xnear(); if (vx === gh.x && vy === gh.y) ynear();
        }
    }
    if (gscr(gh.y, gh.x, 1) === 32) {
      sscr(vy, vx, 1, 32);
      sscr(gh.y, gh.x, 1, 2);
    } else { gh.x = vx; gh.y = vy; }
    if (!b.exist && gh.y < 19 && rnd() < rangeArr[player] / 200) {
      b.exist = true; b.bm = 0;
      b.x = gh.x; b.y = gh.y; b.kx = gh.x; b.ky = gh.y;
      b.normal = false;
      bombAnim.px = b.x; bombAnim.py = b.y; bombAnim.t = performance.now();
    }
  }
}

function lookatscore() {
  if (nextrange[player] <= score[player]) {
    if (rangeArr[player] < 12) rangeArr[player]++;
    nextrange[player] = Math.trunc((nextrange[player] + 250) * 1.15);
    if (rangeArr[player] > 2) {
      const nd = (9 - Math.floor((rangeArr[player] + 1) / 2)) * 5;
      if (nd < delayArr[player]) delayArr[player] = nd;
    }
  }
}

/* ----------------------------- control --------------------------------- */

function negmusic() { musicok = !musicok; musicSync(); }
function negsound() { sd = !sd; }

async function keybtest() {
  if (hitkey(kt[6])) await declives();                       // suicide
  if (held.has('ControlLeft') && held.has('KeyQ')) {         // Ctrl+Q
    for (let p = 1; p <= pl; p++) life[p] = 0;
    normquit = false; exitdos = true; gameover = true;
  }
  if (hitkey(kt[8])) {                                       // quit
    const yes = await confirmYN('Do you really wish to quit ?');
    if (yes) {
      for (let p = 1; p <= pl; p++) life[p] = 0;
      gameover = true; normexit = false;
    }
    resetkeys(); syncClock();
  }
  if (hitkey(kt[3])) {                                       // pause
    const el = pushOverlay('<div class="box"><h3>Game Paused</h3><p class="dim blink">Press any key to continue</p></div>');
    await anyKeyWait();
    popOverlay(el); syncClock();
  }
  if (hitkey(kt[5])) negmusic();
  if (hitkey(kt[4])) negsound();
  if (demo) {
    if (f.can && !f.exist && rnd() < 0.5) {
      f.exist = true; f.x = ux + Math.floor(shsize / 2); f.y = 24;
    } else if (s === MEGASHOOT && !m.exist) {
      m.x = ux + Math.floor(shsize / 2); m.exist = true; m.y = 24; s = NORMAL;
    }
  } else {
    if (hitkey(kt[2]) || held.has(kt[2])) {
      if (f.can && !f.exist) {
        f.exist = true; f.x = ux + Math.floor(shsize / 2); f.y = 24;
      } else if (s === MEGASHOOT && !m.exist) {
        m.exist = true; m.x = ux + Math.floor(shsize / 2); m.y = 24; s = NORMAL;
      }
    }
  }
  if (held.has(kt[7])) nextlevel = true;                     // next level (practice)
}

function movebreaker() {
  vux = ux;
  if (demo) {
    if (b.exist && b.y > 16 && b.x > ux - 2 && b.x < ux + shsize + 1 &&
      (ly < 23 || iy === -1)) {
      if (b.x + 7 < 49 && ux < 43 && b.x < ux + Math.floor(shsize / 2)) ux++;
      else if (ux > 2 && b.x > shsize + 1) ux--;
      else ux++;
    } else {
      if (ux < 50 - shsize && ux + 1 < lx) ux++;
      if (ux > 2 && ux + shsize - 2 > lx) ux--;
    }
  } else {
    if (held.has(kt[0]) || hitkey(kt[0])) { if (ux > 2) ux--; }
    if (held.has(kt[1]) || hitkey(kt[1])) { if (ux < 50 - shsize) ux++; }
  }
  if (ux !== vux) padMoved(vux, delayArr[player]);
  viewshoot();
}

/* ------------------------------ main loop ------------------------------ */

async function moveall(ballMode) {
  await keybtest();
  if (nextlevel && entlife) { gameover = true; db = 0; pki = true; }
  if (life[player] > 0 && !gameover) {
    for (let i = 1; i <= 3; i++) {
      if (!gameover) {
        if (f.exist && ballMode === 1) moveshoot();
        movebreaker();
        if (ballMode === 0) {
          lx = ux + ur;
          sscr(24, vux + ur, 1, 32); sscr(24, vux + ur, 2, 7);
          sscr(24, lx, 1, 9); sscr(24, lx, 2, 15);
          ballMoved(vux + ur, 24, delayArr[player]);
        }
      }
      await gameWait(delayArr[player]);
    }
    if (m.exist && ballMode === 1) movemegashoot();
    if (!gameover) {
      if (d.exist) droppingthing();
      if (b.exist) await movebomb();
    }
    if (!gameover && ballMode === 1) await moveball();
    moveghost();
    lookatscore();
  } else {
    await gameWait(Math.max(10, delayArr[player] * 3));
  }
}

async function movetostart() {
  ly = 24;
  holding = true;
  const fire = f.can; f.can = false;
  const olds = s;
  do {
    await moveall(0);
  } while (!((nextlevel && entlife) || hitkey(kt[2]) || gameover || demo ||
    (olds === GLUE && s !== GLUE)));
  f.can = fire;
  clearthing(lx, ly);
  holding = false;
}

async function startlevel() {
  clearGridAll();
  drawBorder();
  let fileNo = onestr === 'XYZ' ? levels[loadlevel - 1] : loadlevel;
  const map = window.BREAKER_MAPS[fileNo] || [];
  db = 0;
  for (const [x, y, t, c] of map) {
    fillline(x, y, 1, 4, t);
    fillline(x, y, 2, 4, c);
    if (!(t === 30 || t === 219 || t === 24)) db++;
  }
  if (pl > 1) {
    const el = pushOverlay(`<div class="box"><h3>Player ${player}</h3></div>`);
    await sleep(1000);
    popOverlay(el);
  }
  for (let i = 0; i < MAXGHOST; i++) g[i].exist = false;
  particles.length = 0;
  syncClock();
}

function endtest() {
  if (db < 1) gameover = true;
  if (gameover) {
    if (gscr(b.y, b.x, 1) === 31) clearthing(b.x, b.y);
    if (f.exist) clearthing(f.x, f.y);
    clearletter();
    if (m.exist) clearthing(m.x, m.y);
    fillline(2, 25, 1, 48, 32);
  }
}

async function endlevel() {
  if (db !== 0) {
    const el = pushOverlay(`<div class="box gob"><h2 id="gotext">GAME OVER</h2><p>Player ${player}</p></div>`);
    const tEl = el.querySelector('#gotext');
    for (let i = 10; i >= 1; i--) {
      tEl.style.visibility = (i % 2) ? 'hidden' : 'visible';
      snd(i * 50, 20); snd(i * 30, 20, 20);
      await sleep(90);
    }
    tEl.style.visibility = 'visible';
    await sleep(2000);
    popOverlay(el);
  } else {
    if (!pki) {
      const bonus = BNS[skill - 1];
      const el = pushOverlay(`<div class="box"><h3>Bonus ${bonus} Pts</h3><p class="big" id="bcount">${bonus}</p></div>`);
      const cEl = el.querySelector('#bcount');
      await sleep(300);
      let i = bonus;
      menuQueue.length = 0;
      let skipKey = false;
      const kchk = () => { if (menuQueue.length) { skipKey = true; menuQueue.length = 0; } };
      do {
        score[player]++;
        lookatscore();
        cEl.textContent = String(i - 1);
        snd(1900, 1);
        await sleep(Math.max(8, Math.floor(900 / bonus)));
        i--;
        kchk();
      } while (i > 0 && !skipKey);
      if (skipKey) {
        score[player] += i;
        lookatscore();
        cEl.textContent = '0';
        resetkeys();
      }
      await sleep(200);
      cEl.textContent = 'Next Level';
      sweep(3000, 2200, 250);
      await sleep(1000);
      popOverlay(el);
    } else {
      const el = pushOverlay('<div class="box"><h3>Next Level</h3></div>');
      sweep(3000, 2200, 250);
      await sleep(1000);
      popOverlay(el);
    }
  }
}

async function playgame() {
  musicOn();
  ux = 2; f.can = false;
  await startlevel();
  inPlay = true;
  do {
    b.exist = false; d.exist = false; f.exist = false; m.exist = false;
    nextlevel = false; gameover = false; pki = false; s = NORMAL;
    f.can = false; shsize = 7; ur = Math.floor(shsize / 2); normexit = true;
    lx = 5; iy = -1; ix = 1 - Math.trunc(rnd() * 2) * 2;
    syncClock();
    await movetostart();
    // Original stopped the music here because the PC speaker couldn't play music
    // and SFX at once. On separate WebAudio chains they mix fine, so the
    // soundtrack keeps playing through active play (user request).
    do {
      await moveall(1);
      endtest();
    } while (!gameover);
  } while (!(life[player] === 0 || db === 0 || !normquit));
  inPlay = false;
  if (normquit && normexit) await endlevel();
  musicOn();
}

/* ------------------------- high scores / topten ------------------------- */

function toptenHTML() {
  let rows = '';
  for (let i = 0; i < 10; i++) {
    rows += `<tr><td class="rank">${i + 1}.</td><td>${escapeHtml(tp[i].name)}</td>` +
      `<td class="num">${tp[i].score}</td><td class="rng">${RANGESTR[tp[i].range - 1]}</td></tr>`;
  }
  return `<table class="topten">${rows}</table>`;
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function bestscore() {
  const numstr = ['One', 'Two', 'Three', 'Four'];
  for (let i = 0; i < 10; i++) {
    if (score[player] > tp[i].score && !entlife) {
      const what = i === 0 ? 'best' : 'high';
      snd(300, 50); snd(600, 50, 60); snd(900, 50, 120);
      const el = pushOverlay(
        `<div class="box hs"><h3>Congratulations Player ${numstr[player - 1]} !</h3>
         <p>You have achieved a <b>${what} score</b>: ${score[player]}</p>
         <p>Enter your name:</p>
         <input id="hsname" maxlength="10" autocomplete="off" spellcheck="false">
         <p class="dim">Enter = OK &nbsp;&middot;&nbsp; Esc = skip</p></div>`);
      const inp = el.querySelector('#hsname');
      inp.focus();
      const name = await new Promise(res => {
        inp.addEventListener('keydown', e => {
          e.stopPropagation();
          if (e.key === 'Enter') res(inp.value.trim() || 'No Name');
          if (e.key === 'Escape') res(null);
        });
      });
      popOverlay(el);
      if (name !== null) {
        tp.splice(i, 0, { name, score: score[player], range: rangeArr[player] });
        tp.length = 10;
        savebs();
      }
      resetkeys();
      return;
    }
  }
}

/* ============================ Menus ===================================== */

function controlsHTML() {
  let rows = '';
  for (let i = 0; i < 9; i++) {
    rows += `<tr><td>${CTRL_NAMES[i]}</td><td class="key">${keyDisplay(kt[i])}</td></tr>`;
  }
  rows += `<tr><td>Exit to DOS</td><td class="key">Ctrl+Q</td></tr>`;
  return `<table class="ctrls">${rows}</table>`;
}

function buildMenu(el, items, startIdx, handlers) {
  let idx = startIdx;
  const lis = items.map((label, i) => {
    const li = document.createElement('div');
    li.className = 'mi';
    li.innerHTML = label;
    li.addEventListener('mouseenter', () => { idx = i; refresh(); });
    li.addEventListener('click', () => handlers.enter(i));
    el.appendChild(li);
    return li;
  });
  function refresh() {
    lis.forEach((li, i) => li.classList.toggle('sel', i === idx));
  }
  refresh();
  return {
    get idx() { return idx; },
    set idx(v) { idx = v; refresh(); },
    setLabel(i, html) { lis[i].innerHTML = html; },
    refresh
  };
}

async function mainMenu() {
  resetkeys();
  const el = pushOverlay(`
    <div class="menuscreen">
      <div class="logo">BREAKER</div>
      <div class="subtitle">Program by Tátyó &middot; 1993 &middot; web edition 2026</div>
      <div class="menucols">
        <div class="mlist" id="mlist"></div>
        <div class="mside">
          <h4>[ Control ]</h4>${controlsHTML()}
        </div>
        <div class="mside">
          <h4>[ Top Ten ]</h4>${toptenHTML()}
        </div>
      </div>
      <div class="hint">&uarr;&darr; select &nbsp;&middot;&nbsp; Enter &nbsp;&middot;&nbsp; M music</div>
    </div>`, 'full');
  const items = ['Start Game', 'Exit to DOS', 'Demo Mode', 'Game Options', 'Reset High Scores'];
  let resolve;
  const done = new Promise(r => { resolve = r; });
  const list = buildMenu(el.querySelector('#mlist'), items, 0, { enter: i => resolve(i) });
  demo = false;
  (async () => {
    for (;;) {
      const k = await Promise.race([nextMenuKey(), done.then(() => '__done')]);
      if (k === '__done') return;
      if (k === 'ArrowDown') list.idx = (list.idx + 1) % items.length;
      else if (k === 'ArrowUp') list.idx = (list.idx + 4) % items.length;
      else if (k === 'Enter' || k === 'Space') resolve(list.idx);
      else if (k === kt[5]) negmusic();
    }
  })();
  const choice = await done;
  popOverlay(el);
  resetkeys();
  switch (choice) {
    case 0: break;                               // start game
    case 1: exitdos = true; break;
    case 2: demo = true; break;
    case 3: await optionsMenu(); return mainMenu();
    case 4: {
      const yes = await confirmYN('Are you sure you want to clear high scores ?');
      snd(70, 60);
      if (yes) createbs(true);
      return mainMenu();
    }
  }
  for (let i = 1; i <= pl; i++) delayArr[i] = (10 - skill) * 5;
  resetkeys();
}

async function promptNumber(title, lo, hi, cur) {
  const el = pushOverlay(
    `<div class="box"><h3>${title}</h3>
     <input id="numin" maxlength="3" value="${cur}" autocomplete="off">
     <p class="dim">${lo}&ndash;${hi} &middot; Enter = OK</p></div>`);
  const inp = el.querySelector('#numin');
  inp.focus(); inp.select();
  const val = await new Promise(res => {
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const v = parseInt(inp.value, 10);
        if (v >= lo && v <= hi) res(v);
      }
      if (e.key === 'Escape') res(cur);
    });
  });
  popOverlay(el);
  resetkeys();
  return val;
}

async function redefineKeys(list) {
  const el = pushOverlay(
    `<div class="box rdk"><h3>Redefine Keys</h3>
     <p class="dim">Press a key for each control.<br>Avoid Ctrl / browser-reserved keys.</p>
     <p class="big" id="rdkname"></p></div>`);
  snd(100, 300);
  const nameEl = el.querySelector('#rdkname');
  const nk = kt.slice();
  for (let i = 0; i < 9; i++) {
    nameEl.textContent = CTRL_NAMES[i] + ' ?';
    let ok = false, code = '';
    while (!ok) {
      code = await new Promise(r => { captureWaiter = r; });
      ok = true;
      for (let c = 0; c < i; c++) if (nk[c] === code) ok = false;
    }
    nk[i] = code;
    snd(3000, 10);
  }
  kt = nk;
  popOverlay(el);
  resetkeys();
}

async function optionsMenu() {
  resetkeys();
  const el = pushOverlay(`
    <div class="menuscreen">
      <div class="logo small">OPTIONS</div>
      <div class="menucols">
        <div class="mlist wide" id="olist"></div>
        <div class="mside">
          <h4>[ Control ]</h4><div id="octrl">${controlsHTML()}</div>
        </div>
      </div>
      <div class="hint">&larr;&rarr; change &nbsp;&middot;&nbsp; Enter activate &nbsp;&middot;&nbsp; Esc back</div>
    </div>`, 'full');

  const labels = () => [
    `Skill Level <span class="val">${skill}</span>`,
    `Players <span class="val">${pl}</span>`,
    `Practice Mode <span class="val">${entlife ? 'Yes' : 'No'}</span>`,
    `Music <span class="val">${musicok ? 'On' : 'Off'}</span>`,
    `Sound <span class="val">${sd ? 'On' : 'Off'}</span>`,
    `Group Size <span class="val">${gs}</span>`,
    `Max. Level <span class="val">${sln}</span>`,
    `Redefine Keys`,
    `Save Options`,
    `Set Defaults`,
    `Main Menu`
  ];
  let resolve;
  const done = new Promise(r => { resolve = r; });
  if (gs > sln) gs = sln;
  const list = buildMenu(el.querySelector('#olist'), labels(), 0, { enter: i => act(i, 'Enter') });
  const refreshLabels = () => { labels().forEach((l, i) => list.setLabel(i, l)); list.refresh(); };
  const refreshCtrl = () => { el.querySelector('#octrl').innerHTML = controlsHTML(); };

  async function act(i, k) {
    const left = k === 'ArrowLeft', right = k === 'ArrowRight', enter = k === 'Enter' || k === 'Space';
    switch (i) {
      case 0:
        if (left) { skill--; if (skill === 0) skill = 8; } else { skill++; if (skill === 9) skill = 1; }
        break;
      case 1:
        if (left) { pl--; if (pl === 0) pl = 4; } else { pl++; if (pl === 5) pl = 1; }
        break;
      case 2: entlife = !entlife; break;
      case 3: negmusic(); break;
      case 4: sd = !sd; break;
      case 5:
        if (left) { gs--; if (gs === 0) gs = sln; }
        else if (right) { gs++; if (gs > sln) gs = 1; }
        else if (enter) { snd(500, 5); gs = await promptNumber('Group Size', 1, sln, gs); snd(2000, 5); }
        break;
      case 6:
        if (left) { sln--; if (sln === 0) sln = 999; }
        else if (right) { sln++; if (sln > 999) sln = 1; }
        else if (enter) { snd(500, 5); sln = await promptNumber('Max. Level', 1, 999, sln); snd(2000, 5); }
        if (gs > sln) gs = sln;
        break;
      case 7:
        if (enter && await confirmYN('Are you sure you want to do it ?')) {
          await redefineKeys(null); refreshCtrl();
        }
        break;
      case 8:
        if (enter && await confirmYN('Are you sure you want to do it ?')) saveoptions();
        break;
      case 9:
        if (enter && await confirmYN('Are you sure you want to do it ?')) {
          loadoptions(false); refreshCtrl();
        }
        break;
      case 10:
        if (enter) resolve();
        return;
    }
    refreshLabels();
  }

  (async () => {
    for (;;) {
      const k = await Promise.race([nextMenuKey(), done.then(() => '__done')]);
      if (k === '__done') return;
      if (k === 'ArrowDown') list.idx = (list.idx + 1) % 11;
      else if (k === 'ArrowUp') list.idx = (list.idx + 10) % 11;
      else if (k === 'Escape') resolve();
      else if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'Enter' || k === 'Space') await act(list.idx, k);
    }
  })();
  await done;
  popOverlay(el);
  resetkeys();
}

/* =============================== Flow =================================== */

function searchlevel() {
  levels = window.BREAKER_MAP_NUMBERS.filter(n => n <= sln);
  lvn = levels.length;
}

const vl = new Array(1000).fill(-1);
function ll() {
  let n = gs;
  if (Math.floor(lvn / gs) * gs < level) n = lvn % gs;
  let lv = level - 1;
  const ld = Math.floor(lv / gs) * gs;
  const lm = lv % gs;
  let ok;
  do {
    ok = true;
    lv = random(n);
    vl[lm] = n;
    for (let i = 0; i <= lm; i++) if (vl[i] === lv) ok = false;
  } while (!ok);
  vl[lm] = lv;
  return ld + lv + 1;
}

async function game() {
  exitdos = false;
  searchlevel();
  createbs(false);
  do {
    await mainMenu();
    if (!exitdos) {
      for (let p = 1; p <= pl; p++) {
        score[p] = 0; life[p] = 8; nextrange[p] = 200; rangeArr[p] = 1;
      }
      level = 0;
      let go;
      do {
        normquit = true;
        level++;
        loadlevel = ll();
        for (player = 1; player <= pl; player++) {
          if (life[player] > 0) await playgame();
          if (level % 5 === 0 && life[player] > 0) life[player]++;
        }
        go = true;
        for (let p = 1; p <= pl; p++) if (life[p] > 0) go = false;
        if (level === lvn) level = 0;
      } while (!go);
      if (normquit && !demo) {
        for (player = 1; player <= pl; player++) await bestscore();
      }
      player = 1;
    }
  } while (!exitdos);
}

async function onlyonelevel() {
  const n = parseInt(onestr, 10);
  if (!window.BREAKER_MAPS[n]) {
    await msgAnyKey(`<h3>Can't open the file: BREAKER.${escapeHtml(onestr)}</h3>`);
    onestr = 'XYZ';
    return game();
  }
  exitdos = false;
  createbs(false);
  do {
    await mainMenu();
    if (!exitdos) {
      for (let p = 1; p <= pl; p++) {
        life[p] = 8; nextrange[p] = 200; rangeArr[p] = 1; score[p] = 0;
      }
      level = 1;
      loadlevel = n;
      let alive;
      do {
        normquit = true;
        for (player = 1; player <= pl; player++) {
          if (life[player] > 0) await playgame();
        }
        alive = false;
        for (let p = 1; p <= pl; p++) if (life[p] > 0) alive = true;
      } while (alive && normquit);
      player = 1;
    }
  } while (!exitdos);
}

async function goodbye() {
  musicOff();
  pushOverlay(`
    <div class="menuscreen">
      <div class="logo">BREAKER</div>
      <p style="text-align:center">Thank you for playing!</p>
      <p style="text-align:center"><button onclick="location.reload()">Restart</button></p>
    </div>`, 'full');
}

function fitToWindow() {
  const wrap = document.getElementById('gamewrap');
  const w = wrap.offsetWidth, h = wrap.offsetHeight;
  const sc = Math.min(1.25, (window.innerWidth - 20) / w, (window.innerHeight - 20) / h);
  wrap.style.transform = `scale(${sc})`;
}
window.addEventListener('resize', fitToWindow);

async function main() {
  initRender();
  fitToWindow();
  loadoptions(true);
  createbs(false);
  musicOn();
  const params = new URLSearchParams(location.search);
  if (params.has('level')) onestr = params.get('level');
  if (onestr === 'XYZ') await game();
  else await onlyonelevel();
  await goodbye();
}

window.addEventListener('DOMContentLoaded', main);
