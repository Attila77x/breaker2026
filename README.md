# BREAKER — web edition

**▶ Play: https://attila77x.github.io/breaker**

A modernised (graphics & audio only) remake of the 1993 Turbo Pascal game
**BREAKER** by Tátyó (original source archived in [`original/`](original/)). The
game logic is a structural 1:1 port of the original: the 50×25 DOS text screen
is kept as the authoritative game state, the ball moves strictly at 45° on the
character grid, and the paddle's two 45°-slanted ends send the ball straight
back where it came from — exactly like the original.

## Run it locally

Serve the folder with any static web server and open it in a browser, e.g.:

```
python -m http.server 8741
# then open http://localhost:8741
```

(Opening `index.html` directly from disk also works in most browsers.)

`index.html?level=N` plays only level *N* — the original `/P:N` parameter.

## What is preserved from 1993

- All **51 original maps**, byte-converted from the `BREAKER.<n>` files
  (`maps.js` is generated from them; bricks are `[x, y, type, colorAttr]`
  records identical to the Pascal `bricktype`).
- **Ball physics**: 45°-only movement on the character grid; brick, wall and
  paddle collision logic ported line by line (including original quirks).
- **Paddle**: 7 cells wide (9 when Enlarged), thin deck with 45° ends
  (original glyphs `▄█▀▀▀█▄`); edge cells reflect the ball back along its
  incoming path; moves 3 cells per ball step with instant raw-key input
  (held state, no OS key-repeat delay).
- **Brick types**: normal ░, 2-hit ▒, 3-hit ▓, surprise ☼, target ♦ (ends the
  level), points ♥, shot-giver ◘ (breakable) and ↑ (permanent), bomb dropper
  ▲ (bombs respawn cycling across the brick), ghost brick ☺ (releases 4
  homing ghosts), indestructible █.
- **Letter drops** `L G E X M P F` — Life, Glue, Enlarge, reset, MegaShot
  (pierces everything incl. indestructible bricks), Points, Fire.
- **Difficulty**: skill 1–8 sets the step delay `(10-skill)*5 ms`; the Range
  ladder (Beginner → Breaker) accelerates the game exactly per the original
  formula; level bonus 5…300 points by skill.
- **Game flow**: 1–4 alternating players, 8 starting lives (+1 every 5
  levels), practice mode (infinite lives, `N` skips level), group-based random
  level order (Group Size / Max. Level options), demo-mode AI, top ten with
  name + range, redefinable keys, options saved (localStorage replaces
  `BREAKER.CFG` / `BREAKER.HSC`).
- **Music**: a warm marimba-swing cover (`music.mp3`) of the original theme,
  looping through menus and gameplay (`M` toggles). The original 576-step
  PC-speaker sequence from `TC.PAS` is preserved in `music.js` and used as an
  automatic fallback (driven at the original 18.2 Hz tick) if the mp3 is
  missing. Sound effects are warm wooden-mallet tones matching the marimba.
  `tools/` holds the score transcription (`.abc` / `.txt`) and the scripts that
  decode the original note data.

## Controls (defaults, redefinable in Options)

Left/Right arrows — move · Space — fire/launch · P — pause · S — sound ·
M — music · A — suicide · N — next level (practice mode) · Esc — quit ·
Ctrl+Q — exit game

## Not yet ported

- The level editor (`BREAKED.PAS`).

## Files

- `index.html`, `style.css` — page shell, HUD panel, menus
- `game.js` — engine: ported game logic + canvas renderer + WebAudio
- `maps.js` — generated from the original binary map files
- `music.js` — the original music data, transcribed from `TC.PAS`
