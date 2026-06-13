/* Builds breaker-web/maps.js as a 1..100 campaign ordered by difficulty.
   - Keeps all 51 original hand-made maps (read from ../BREAKER/BREAKER.<n>).
   - Generates new easy + hard levels to fill out to 100, including the new
     multiball-dropper brick (code 5).
   - Scores every level by difficulty, sorts ascending, renumbers 1..100. */
'use strict';
const fs = require('fs');
const path = require('path');

const ORIG_DIR = 'D:\\project\\arcanoid\\BREAKER';
const OUT = path.join(__dirname, '..', 'maps.js');
const ORIG_NUMS = [1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,18,19,21,22,23,24,25,26,27,
  28,29,30,31,32,33,34,35,36,37,38,39,41,42,43,44,45,46,49,52,53,54,55,56,64,74,76];

// brick type codes
const NORMAL=176, TWO=177, THREE=178, UNBREAK=219, TARGET=4, BOMB=30, GHOST=1,
  SHOT=8, SHOTP=24, SURPRISE=15, POINTS=3, MULTIBALL=5;

const COLS = [4,8,12,16,20,24,28,32,36,40,44];   // 11 columns, 4 wide
const attrFor = {                                 // sensible colour attrs
  [TARGET]: 14|(4<<4), [BOMB]: 15|(1<<4), [GHOST]: 15|(5<<4), [SHOT]: 15|(2<<4),
  [SHOTP]: 15|(2<<4), [SURPRISE]: 15|(6<<4), [POINTS]: 15|(4<<4), [MULTIBALL]: 0,
  [UNBREAK]: 8
};
const FG = [11,10,14,9,13,12,15];                 // bright tier colours

// ---- seeded RNG (mulberry32) for reproducibility ----
let seed = 0x9e3779b9;
function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = n => Math.floor(rnd() * n);
const pick = a => a[ri(a.length)];

function brick(col, y, type, attr) {
  if (attr === undefined) attr = (type === NORMAL || type === TWO || type === THREE) ? pick(FG) : (attrFor[type] || 7);
  return [COLS[col], y, type, attr];
}

// ---- read an original binary map ----
function readOrig(n) {
  const b = fs.readFileSync(path.join(ORIG_DIR, 'BREAKER.' + n));
  const out = [];
  for (let i = 0; i + 3 < b.length; i += 4) out.push([b[i], b[i+1], b[i+2], b[i+3]]);
  return out;
}

// ---- difficulty score ----
function difficulty(map) {
  let s = 0;
  for (const [, , t] of map) {
    if (t === NORMAL) s += 1;
    else if (t === TWO) s += 2.4;
    else if (t === THREE) s += 4.2;
    else if (t === UNBREAK) s += 1.6;
    else if (t === BOMB) s += 4.5;
    else if (t === GHOST) s += 5.5;
    else if (t === SHOT || t === SHOTP) s -= 1.2;
    else if (t === MULTIBALL) s -= 2.5;
    else if (t === TARGET) s += 0.4;
    else if (t === SURPRISE) s += 0.8;
    else if (t === POINTS) s += 0.4;
    else s += 1;
  }
  // density: breakable bricks present (more to clear = harder)
  const breakable = map.filter(([, , t]) => ![BOMB, UNBREAK, SHOTP].includes(t)).length;
  return s + breakable * 0.6;
}

// ============================ generators ============================

function genEasy(idx) {           // idx 0..N : gentle, mostly normal bricks
  const m = [];
  const rows = 2 + Math.floor(idx / 6);          // 2..~6 rows
  const y0 = 3 + ri(2);
  const pat = idx % 5;
  const sprinkle = (col, y) => {                 // occasional friendly brick
    const r = rnd();
    if (r < 0.05) return brick(col, y, MULTIBALL);
    if (r < 0.12) return brick(col, y, SHOT);
    if (r < 0.18) return brick(col, y, POINTS);
    return null;
  };
  for (let r = 0; r < rows; r++) {
    const y = y0 + r;
    const fg = FG[(r + idx) % FG.length];
    for (let c = 0; c < COLS.length; c++) {
      let place = false;
      if (pat === 0) place = true;                                 // full rows
      else if (pat === 1) place = (c + r) % 2 === 0;               // checker
      else if (pat === 2) place = c >= r && c < COLS.length - r;   // pyramid
      else if (pat === 3) place = c < 3 || c >= COLS.length - 3;   // two blocks
      else place = c % 2 === 0;                                    // combs
      if (!place) continue;
      const sp = sprinkle(c, y);
      if (sp) { m.push(sp); continue; }
      const type = (idx > 13 && r === 0) ? TWO : NORMAL;
      m.push(brick(c, y, type, fg));
    }
  }
  if (!m.some(([, , t]) => ![BOMB, UNBREAK, SHOTP].includes(t))) m.push(brick(5, y0, NORMAL));
  return m;
}

function genHard(idx) {           // idx 0..N : dense, armoured, hazards
  const m = [];
  const rows = Math.min(13, 7 + Math.floor(idx / 3));
  const y0 = 2;
  const pat = idx % 5;
  const bombs = Math.min(4, 1 + Math.floor(idx / 5));
  const ghosts = idx > 8 ? Math.min(3, Math.floor((idx - 8) / 5) + 1) : 0;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r;
    const fg = FG[(r + idx) % FG.length];
    for (let c = 0; c < COLS.length; c++) {
      let type = NORMAL, place = true;
      if (pat === 0) { type = r < 2 ? THREE : r < 4 ? TWO : NORMAL; }
      else if (pat === 1) {                       // fortress: side pillars unbreakable
        if (c === 0 || c === COLS.length - 1) type = UNBREAK;
        else type = (r % 2 === 0) ? TWO : NORMAL;
      } else if (pat === 2) {                      // armoured checker
        place = (c + r) % 2 === 0; type = (c % 3 === 0) ? THREE : TWO;
      } else if (pat === 3) {                      // columns, gaps every 3rd
        place = c % 3 !== 1; type = r < 3 ? TWO : NORMAL;
      } else {                                     // diamond of three-hit
        const mid = (COLS.length - 1) / 2;
        place = Math.abs(c - mid) + Math.abs(r - rows / 2) <= rows / 2;
        type = THREE;
      }
      if (!place) continue;
      m.push(brick(c, y, type, fg));
    }
  }
  // hazards near the top
  for (let k = 0; k < bombs; k++) m.push(brick(2 + ri(COLS.length - 4), y0 + ri(2), BOMB));
  for (let k = 0; k < ghosts; k++) m.push(brick(1 + ri(COLS.length - 2), y0 + 1 + ri(3), GHOST));
  // a multiball reward + a shot brick to keep it fair
  if (idx % 2 === 0) m.push(brick(3 + ri(5), y0 + rows - 1, MULTIBALL));
  m.push(brick(ri(COLS.length), y0 + rows - 1, SHOT));
  // dedupe by cell (later wins): keep one brick per (x,y)
  const seen = new Map();
  for (const bk of m) seen.set(bk[0] + ',' + bk[1], bk);
  return [...seen.values()];
}

// ============================ assemble ============================

const all = [];
for (const n of ORIG_NUMS) all.push({ src: 'orig#' + n, map: readOrig(n) });
for (let i = 0; i < 25; i++) all.push({ src: 'easy#' + i, map: genEasy(i) });
for (let i = 0; i < 24; i++) all.push({ src: 'hard#' + i, map: genHard(i) });

if (all.length !== 100) throw new Error('expected 100 levels, got ' + all.length);
all.sort((a, b) => difficulty(a.map) - difficulty(b.map));

// emit maps.js
let out = '// BREAKER level set — 100-level campaign ordered by difficulty (1..100).\n';
out += '// Originals (hand-made 1993 maps) are preserved; easy/hard fillers generated.\n';
out += '// Each brick record: [x, y, type, colorAttr] — identical to the Pascal bricktype.\n';
out += 'const BREAKER_MAPS = {\n';
all.forEach((lvl, i) => {
  const recs = lvl.map.map(r => '[' + r.join(',') + ']').join(',');
  out += `  ${i + 1}: [${recs}], // ${lvl.src}  diff=${difficulty(lvl.map).toFixed(0)}\n`;
});
out += '};\n';
out += 'const BREAKER_MAP_NUMBERS = [' + Array.from({ length: 100 }, (_, i) => i + 1).join(',') + '];\n';
out += 'window.BREAKER_MAPS = BREAKER_MAPS;\n';
out += 'window.BREAKER_MAP_NUMBERS = BREAKER_MAP_NUMBERS;\n';
fs.writeFileSync(OUT, out);

// report
const ds = all.map(l => difficulty(l.map));
console.log('wrote', OUT);
console.log('100 levels. difficulty min/median/max =',
  ds[0].toFixed(1), '/', ds[50].toFixed(1), '/', ds[99].toFixed(1));
console.log('multiball bricks total:', all.reduce((s, l) => s + l.map.filter(r => r[2] === MULTIBALL).length, 0));
