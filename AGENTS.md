# AGENTS.md – from one prompt to a finished video

This repo turns a short prompt ("a video for X, in which Y happens") into a narrated
**paper-craft stop-motion film**: hand-cut paper pieces with cast shadows, pop-up book pages,
puppets moving on twos, a local neural narrator, a sampled orchestra score and real paper foley.
Everything visual is a pure JavaScript canvas animation. Output lands in `build/<slug>/`.

Read this file completely before starting. Work autonomously; the user wants a finished,
reviewed video, not a draft. Quality bar: professional, warm, cute, handmade.

## 0. Prerequisites (once per machine)

`npm run setup` (add `-- --xtts` for the expressive XTTS voices). It checks Node ≥ 20, ffmpeg,
Chromium, installs Piper, a Python venv (Whisper), and downloads samples/sfx/fonts into `assets/`.
If `assets/samples/manifest.json`, `.tools/piper/piper` or `.venv/bin/python` are missing, run it.

## 1. Understand the prompt

Extract and write down (in your head or a scratch file, not the repo):
- **Who** is it for / about, names, nicknames, looks (hair, clothes), relationships.
- **What happens**: the beats in order; places; the emotional ending.
- **Language** of narration + on-screen text (default German), **length** (default 45–60 s),
  **format** (`16:9`, `9:16` or both; default both), **frame**: `book` (storybook, default) or `stage`.
- Details that must appear verbatim (dates, place names, a final sentence).
Ask the user only if something essential is truly ambiguous; otherwise decide and note it in the final report.

## 2. Create the story

```
npm run new -- <slug> --title "…"      # copies stories/_template → stories/<slug>
```
Files you edit (see the template, it demonstrates every technique):

- `story.json` – title, language, frame, formats, music tempo, voice, cover, **cast**, **scenes** (id + bars), **lines**.
- `scenes.js` – one `VG.scene(id, { bg, fg, light?, camera?, sfx? })` per scene.
- `score.js` – `VG.compose = (M, T) => { … }` music on the bar grid.

### Script (lines)
- 6–9 lines for ~55 s; each line 1–2 short sentences; storyteller rhythm; the last line lands the emotion.
- `text` = what is shown/meant. `tts` = what the voice engine reads (fix pronunciation here, see §3).
  `ref` (optional) = how a transcript would write it (digits for spelled-out dates), same punctuation as `tts`.
- `scene` + `at` (seconds after the scene is open) place a line. Usually `at` 0.1–0.4.

### Scenes & timing
- Waltz 3/4 at 100 BPM → 1 bar = 1.8 s. Every scene is a whole number of `bars`; page turns
  land on downbeats. A scene needs ≈ narration length + 1.5 s (turn + pop-ups + a breath).
- Typical plan: title page (3 bars) · 4–5 story scenes (4–6 bars) · emotional climax (6 bars) · ending.
- `intro.bars` (book closed, cover opens) and `outro.bars` (book closes, sticker `heart`|`star`|null).
- 16:9 book = double spread; the **gutter at x = 0 is a fold – keep faces/text off it**.
  9:16 book = one tall page. Stage = full frame. Always lay out with `st.L.w`/`st.L.h`
  (and `st.L.gutter`) so a scene works in every format you render.

### Cast (puppets)
`cast.<id> = { hair: short|long|bob|ponytail|bun|curly, hairColor, skin, outfit: tshirt-shorts|tshirt-pants|top-skirt|dress, top, bottom, shoes, lashes, glasses }`.
Match the prompt's descriptions (e.g. "brown hair a bit longer than shoulders, simple top" → `long`, `top-skirt`).
Draw with `VG.puppet(ctx, id, pose)`: `walk` (phase: `t*9`), `armL/armR` (deg outward; 140 = raised to wave),
`lookX/lookY`, `headTilt`, `mouth: smile|open|o`, `happyEyes`, `blink: VG.blinkAt(t, seed)`, `blush`, `hideLegs`, `holdR(fn)`, `front(fn)`.

### Scene code rules
- `bg` = printed on the page (sky, far hills). `fg` = pop-ups (`VG.pop`/`st.pop(at)` makes them rise when the page opens and fold when it turns). **Draw every standing thing (incl. puppets) through `VG.pop(…, st.pop(at))`**, otherwise it will not fold away during page turns. `light` = optional overlays.
- Stagger pop-ups 0.05–0.6 s. Use depth (`VG.piece(ctx, path, color, depth)`) for layering: far 1, mid 1.5–2, near 2.5.
- Sync to narration with `st.word('vo2', 'Milo')` (scene-local time of a word) – names pop when spoken,
  magic happens on the verb. Works before the voice exists (estimated), exact afterwards.
- Library (engine/styles/paper/props.js): `sky, skyBlend, range, snowCap, hill, skyline, pine, roundTree, flower, mushroom, cloud, sun, moon, star, twinkle, heart, starField, shootingStar, constellation, heartPoints, fireflies, sparkBurst, glyph, hang, banner, waves, paperBoat, fish, bird, pigeon, houses/house, lampPost, laptop, trail (dotted paths), drawSticker`.
  New shapes: `VG.S(key, () => VG.G.svg('M…') | G.poly([...]) | G.blob([...]) | G.ellipse(...))` (cached, hand-cut edges).
- `camera: [[lt, x, y, zoom], …]` per scene (content coordinates). Follow the action, push in on key moments
  (1.3–1.6), pull back for reveals. The frame clamps the camera to the book/stage.
- `sfx: [[lt, 'file.wav', gain, { bus: 'amb', dur, fadeIn, fadeOut, pan, rate, offset }], …]` – files in `assets/sfx/`
  (see its manifest.json: page turns, paper rustles/pops, waves, forest, night, city, typing, wind).
  Page turns, pop-ups, cover and sticker sounds are added automatically.
- Night scenes: multiply-tint everything, then draw light sources (moon, windows, lamps, stars) after the tint.

### Music (score.js)
`M.harp(bar, chord)`, `M.pad(bar, chord, bars, vel, ['violas','cellos','violins','choir'])`,
`M.pizz(bar, chord)`, `M.mel(inst, bar, [[note, beats], …])`, `M.gliss`, `M.chime(t, notes…)`, `M.add(…)`;
`M.sceneBar(id)`, `M.outroBar()`, `T.lines[id].words` for syncing accents. Instruments: music_box, celesta, harp,
glockenspiel, violins, violas, cellos, violin_solo, violins_pizz, cellos_pizz, flute, flute_nv, choir_aahs.
One mood per scene (playful pizzicato, lyrical flute, magical celesta, warm full strings at the climax),
glockenspiel on on-screen magic, a final chord + chime on the sticker.

## 3. Voice

```
npm run voice -- <slug>              # all lines;  --only vo3,vo5 to redo some
```
- Engines: `piper` (fast, reliable; `de_DE-thorsten-high` = warm male storyteller) or
  `xtts` (expressive; female/male studio voices; needs `setup -- --xtts`). For XTTS pick a voice with
  `npm run cast -- <slug> --gender female` and set `"voice": {"engine":"xtts","speaker":"…"}`.
- **Check the report.** `sim < 0.9` or a wrong transcript = mispronounced/garbled → fix `tts` and redo with `--only`.
  Piper prints phonemes: check names and loanwords (stress: `ˈ` before the stressed syllable).
  Tricks: phonetic spelling (`Emieljo`, `Karschtadt`, `Läptop`, `Mielo`), numbers as words, commas for pauses.
  Watch dates/numbers in the transcript (a wrong year must never ship).
- `lengthScale` (piper, 1.05–1.2) / `speed` (xtts) control pacing.

## 4. Fit, look, listen (iterate)

```
npm run timeline -- <slug>           # every line must fit; fix bars/at until "all lines fit"
npm run snap -- <slug> --sheet [--format 9:16]      # stills of every scene → build/<slug>/review/sheet*.jpg
npm run snap -- <slug> 12.5 13 13.5  # specific moments
npm run mix -- <slug> --stems        # soundtrack + per-second loudness of voice/music/fx
```
**Look at every sheet/still yourself** (Read the jpg). Check: faces/text not on the gutter or cut by the frame,
characters readable (not tiny), pop-ups present, nothing floating/misplaced, night/day continuity, on-screen text
spelled correctly and in the right language, camera shows what the narration talks about.
Audio: voice ~10–14 LU above music in the stems; integrated ≈ -16 LUFS.

## 5. Render & deliver

```
npm run video -- <slug>              # voice (if missing) → fit check → mix → render all formats → html → sheets
npm run render -- <slug> --range 20-26 --keep-frames   # quick partial check of a tricky moment
npm run sheet -- <slug> [--format 9:16] [--every 0.5 --from 20 --to 30]
```
Rendering uses the GPU through headless Chromium (~0.1–0.2 s/frame, 24 fps). Review the video sheets
(`build/<slug>/review/video_sheet*`) for motion/continuity, fix, re-render. Deliverables:
`build/<slug>/<slug>.mp4`, `<slug>_9x16.mp4`, `<slug>.html` (standalone, double-click to play), `soundtrack.wav`.

Final report to the user: what the video shows (scene list), voice used, duration, file paths,
anything you could not verify (you cannot listen – say that pronunciation was checked via transcripts).

## Conventions

- Engine code is style-agnostic in `engine/*.js`; everything paper-specific lives in `engine/styles/paper/`.
  A future style is a new folder implementing the same API (`VG.piece`, props, frames, post) + `story.style`.
- Deterministic rendering: no `Math.random()` – use `VG.rng(seed)`, `VG.hash`, `VG.strSeed`.
- Puppets and pop-ups animate on twos (`animFps` 12); the camera moves at 24 fps.
- Don't commit `build/`, `assets/{samples,sfx,fonts}`, `.cache/`, `.tools/`, `.venv/` (see .gitignore).
- Licences: samples (VSCO-2-CE CC0, Musyng Kite CC BY-SA 3.0), sfx CC0, fonts OFL, Piper voice CC0,
  XTTS-v2 Coqui Public Model License (non-commercial). Credits: `assets/CREDITS.md`.
