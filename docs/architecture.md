# Architecture

## Data flow

```
stories/<slug>/story.json ─┐
build/_<slug>/voice/voice.json ─┼─► engine/timeline.js ──► T (absolute timeline)
                               │
stories/<slug>/scenes.js ──────┼─► engine/runtime.js ──► frame (book | stage) ──► post ──► canvas
stories/<slug>/score.js ───────┴─► audio/dsl.js ──► audio/mixer.js (OfflineAudioContext) ──► soundtrack.wav
```

Everything visual runs in a browser page: `engine/page.html?story=<slug>`. The Node tools
(`tools/*.mjs`) open that page in headless Chromium to take stills, render frames or mix audio.
`tools/html.mjs` inlines the same page into one standalone file.

## Modules

| File | Role |
|---|---|
| `engine/core.js` | `VG` namespace: math, easing, `rng/hash/strSeed`, colours, `VG.FORMATS` |
| `engine/timeline.js` | UMD; `build(story, voice)` → `T`, `check(T)` → fit report. Used by browser and Node (via `vm`) |
| `engine/runtime.js` | `VG.scene()`, `VG.start()`, scene state (`st`), camera keyframes, `VG.render(ctx, t)` |
| `engine/styles/paper/paper.js` | grain textures, hand-cut shapes (`VG.S`, `VG.G`), `VG.piece`, pop-ups, jitter, text |
| `engine/styles/paper/puppet.js` | jointed puppets configured by `story.cast` |
| `engine/styles/paper/props.js` | scenery & prop library, sticker |
| `engine/styles/paper/frames/book.js` | storybook: table, cover, page stacks, curled page turns, camera limits |
| `engine/styles/paper/frames/stage.js` | full-bleed paper stage, sliding-sheet transitions |
| `engine/styles/paper/post.js` | lamp grade, vignette, exposure flicker, film grain, fades |
| `engine/page.html` + `page.css` | loads everything; modes `play`, `render`, `mix`, `still`; `tools/html.mjs` turns it into the standalone file and the `web/` folder |
| `audio/dsl.js` | score language (`VG.scoreDSL(T)`, `VG.chord`, `VG.note`) |
| `audio/mixer.js` | offline mix: samples, narration + ducking, sfx, reverb, master |
| `tools/lib/common.mjs` | paths, story loading, static server (+ `/upload/`), Chromium launch, frame grab |

## Timeline model (`T`)

- Grid: `bar = beatsPerBar × 60 / bpm` (default 3/4 at 100 BPM → 1.8 s).
- `T.intro`: closed book (`intro.bars`), cover opens at `intro.openStart` for `openDur` (1.25 s book, 0.9 s stage).
- `T.scenes[k]`: `start` (transition into the scene begins), `openAt = start + 0.8 × transition`,
  `exitAt = start + bars × bar`. Scene k+1 starts exactly at scene k's `exitAt` → turns land on downbeats.
- `T.lines[id]`: `start = scene.openAt + line.at`, `speechEnd`, `words: [[word, tStart, tEnd], …]` (absolute).
- `T.outro`: `closeStart`, `closeDur`, `stickerAt` (next bar after closing), `fadeStart`, `end`.
- `T.sceneAt(t)` → index of the scene visible at t.

## Time & determinism

- Output 24 fps (`fps`). Puppets, pop-ups and jitter use time quantised to `animFps` (12) = "on twos";
  the camera and page turns use exact time → smooth moves, stop-motion characters.
- `VG.frame` = quantised frame index (drives jitter and flicker). `VG.time` = quantised time.
- Never use `Math.random()`: frames are rendered in parallel, out of order. Use `VG.rng(seed)`, `VG.hash(a,b,c)`.

## Coordinate systems

- **Screen**: `VG.W × VG.H` (1920×1080 or 1080×1920).
- **World**: camera space; `VG.camera(t)` → `{x, y, z}` centre + zoom; the frame clamps it.
- **Content** (what scenes draw in): origin at the centre of the content area, `st.L.w × st.L.h`:
  - book 16:9 → 1680 × 960 double spread, gutter (fold) at x = 0 (`st.L.gutter = true`)
  - book 9:16 → 940 × 1680 single page
  - stage → full frame (1920 × 1080 or 1080 × 1920)
- y grows downwards. Puppets stand with their feet at their origin.

## Rendering a frame (`VG.render`)

1. quantise time, compute camera, set world transform
2. `frame.draw(ctx, t, tq, res)` – table/cover/pages or stage; during page turns both spreads are
   rendered offscreen and mapped onto a curled 3D page (64 perspective strips)
3. per scene: paper fill → `bg` → grain overlay → gutter shading (book) → `fg` → `light`
4. `frame.overlay` (stage sticker + outro text), optional subtitles (screen space), then `VG.post`

## Performance

Headless Chromium with ANGLE/GL gives ~80–200 ms per 1080p frame; `tools/render.mjs` runs
N browsers in parallel (default ½ CPU cores, max 6). Shapes are cached by key in `VG.S`; the
page warms caches by rendering every 2.3 s once before `VG.ready`.
