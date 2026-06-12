// Decodes the original BREAKER musicdata into readable notation.
// Structure discovered in the data: entries come in groups of 3 ticks
// (18.2 Hz each): tick 0 = bass note, ticks 1-2 = melody note (0 = rest).
// One group = one eighth note. 576 entries = 192 eighths = 24 bars of 4/4
// = two 12-bar blues choruses.

const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'music.js'));
const M = global.window.BREAKER_MUSIC;

const NAMES = {
  131: 'C3', 138: 'C#3', 146: 'D3', 156: 'Eb3', 165: 'E3', 175: 'F3', 185: 'F#3',
  196: 'G3', 208: 'G#3', 220: 'A3', 233: 'Bb3', 247: 'B3',
  262: 'C4', 277: 'C#4', 294: 'D4', 311: 'Eb4', 330: 'E4', 349: 'F4', 370: 'F#4',
  392: 'G4', 415: 'G#4', 440: 'A4', 466: 'Bb4', 494: 'B4',
  523: 'C5', 554: 'C#5', 587: 'D5', 622: 'Eb5', 659: 'E5', 698: 'F5', 740: 'F#5',
  784: 'G5', 831: 'G#5', 880: 'A5', 932: 'Bb5'
};
// ABC pitch spelling (K:C, accidentals explicit)
const ABC = {
  'C3': 'C,', 'D3': 'D,', 'Eb3': '_E,', 'E3': 'E,', 'F3': 'F,', 'F#3': '^F,',
  'G3': 'G,', 'A3': 'A,', 'Bb3': '_B,', 'B3': 'B,',
  'C4': 'C', 'D4': 'D', 'Eb4': '_E', 'E4': 'E', 'F4': 'F', 'F#4': '^F',
  'G4': 'G', 'A4': 'A', 'Bb4': '_B', 'B4': 'B',
  'C5': 'c', 'D5': 'd', 'Eb5': '_e', 'E5': 'e', 'F5': 'f', 'F#5': '^f',
  'G5': 'g', 'A5': 'a'
};

if (M.length % 3 !== 0) throw new Error('not divisible by 3');

const groups = [];
for (let i = 0; i < M.length; i += 3) {
  const bass = M[i], m1 = M[i + 1], m2 = M[i + 2];
  let mel, dur; // dur: 'full' (2 ticks), 'short' (1 tick + rest), 'rest'
  if (m1 === 0 && m2 === 0) { mel = 0; dur = 'rest'; }
  else if (m1 === 0) { mel = m2; dur = 'late'; }       // shouldn't happen, flag it
  else if (m2 === 0) { mel = m1; dur = 'short'; }
  else if (m1 === m2) { mel = m1; dur = 'full'; }
  else { mel = m1; dur = 'SPLIT:' + m1 + '/' + m2; }   // two different notes, flag
  groups.push({ bass, mel, dur });
}

// sanity: report any odd groups
const odd = groups.filter(g => g.dur === 'late' || String(g.dur).startsWith('SPLIT'));
console.log(`${groups.length} groups (${groups.length / 8} bars). Irregular groups: ${odd.length}`);
odd.forEach((g, i) => console.log('  odd:', JSON.stringify(g)));

const nm = f => f === 0 ? '·' : (NAMES[f] || ('?' + f));

// ---- text transcription, one bar (8 groups) per line ----
let txt = '';
for (let bar = 0; bar < groups.length / 8; bar++) {
  const gs = groups.slice(bar * 8, bar * 8 + 8);
  const mel = gs.map(g => (nm(g.mel) + (g.dur === 'short' ? '*' : '')).padEnd(5)).join(' ');
  const bas = gs.map(g => nm(g.bass).padEnd(5)).join(' ');
  txt += `bar ${String(bar + 1).padStart(2)} | melody: ${mel}\n       |  bass:  ${bas}\n`;
}

// ---- ABC notation, two voices ----
const abcMel = [], abcBass = [];
for (let bar = 0; bar < groups.length / 8; bar++) {
  const gs = groups.slice(bar * 8, bar * 8 + 8);
  let mline = '', bline = '';
  for (const g of gs) {
    if (g.mel === 0) mline += 'z';
    else mline += ABC[nm(g.mel)] || '?';
    if (g.dur === 'short') mline = mline; // staccato marked below
    mline += ' ';
    bline += (g.bass === 0 ? 'z' : (ABC[nm(g.bass)] || '?')) + ' ';
  }
  abcMel.push(mline.trim());
  abcBass.push(bline.trim());
}
let abc = `X:1
T:BREAKER theme (1993) - transcribed from TC.PAS musicdata
C:as coded by Tatyo for PC speaker
M:4/4
L:1/8
Q:1/4=180
%%MIDI program 12 % marimba
K:C
%%score (Mel) (Bass)
`;
for (let bar = 0; bar < abcMel.length; bar++) {
  abc += `% --- bar ${bar + 1} ---\n`;
  abc += `[V:Mel] ${abcMel[bar]} |\n`;
  abc += `[V:Bass clef=bass] ${abcBass[bar]} |\n`;
}

require('fs').writeFileSync(path.join(__dirname, 'transcription.txt'), txt);
require('fs').writeFileSync(path.join(__dirname, 'breaker-theme.abc'), abc);
console.log('\n' + txt);
