# Extending reelsmith

## A new prop
Add a function to `engine/styles/paper/props.js` following the pattern:
```js
VG.kite = (ctx, x, y, s, t, k, id, col = '#e0565f') => VG.pop(ctx, x, y, k, (c) => {
  c.scale(s, s); c.rotate(Math.sin(t * 2) * 0.1);
  VG.piece(c, VG.S('kite', () => VG.G.poly([0, -60, 36, 0, 0, 70, -36, 0])), col, 1.4);
}, id);
```
Rules: cache shapes with a stable `VG.S` key (include sizes in the key when they vary), use
`VG.piece` for anything that casts a shadow, keep randomness seeded. Document it in docs/library.md.

## A hairstyle / outfit
`engine/styles/paper/puppet.js`: add an entry to `HAIR` (`back`, `front`, `extra` shapes, `ears`, `shine`
highlight curve) – head centre is (0, −150), radius ~46. Outfits: extend the body branch in `VG.puppet`
and `VG.OUTFITS`. Check front and waving poses with `npm run snap`.

## A frame
`VG.frames.<name> = (story, T) => ({ layout, init, draw(ctx, t, tq, res), clampCam, toWorld, openView, closedView?, overlay? })`
in `engine/styles/paper/frames/`, add the script to `engine/page.html`, and (if it has sounds) cues in
`audio/mixer.js → frameCues`. Scenes must only depend on `st.L`.

## A visual style
Create `engine/styles/<style>/` and list its scripts under `VG_STYLES` in `engine/page.html` (only the
style of the current story is loaded, so names like `VG.post` may repeat across styles). A style must:
- register `VG.styles.<style> = { init(), fonts: [...] }` (fonts are preloaded before the first frame),
- define at least one frame in `VG.frames` (`fold: false` to skip pop-up folding, `drift: 0` for a static camera),
- define `VG.popK(lt, at, dur)` (used by `st.pop`), `VG.post(ctx, t, W, H, T)` and `VG.subtitles(ctx, t)`
  (caption timing comes from `VG.captions`, engine/captions.js),
- add defaults in `engine/timeline.js → STYLE` (default frame, fps, animFps) and `TURN` (transition length),
- skip or add frame sounds in `audio/mixer.js → frameCues` (non-paper styles place sounds in scenes/score).
Add a template `stories/_template-<style>/` and teach `tools/new.mjs --style` about it. Example: `clean`.

## An instrument or sound
Add recipes to `assets/manifests/samples.json` or `sfx.json` (pinned URL + sha256 + processing), run
`npm run fetch-assets -- --only samples --force`, credit it in `assets/CREDITS.md`. New instruments
also need a level in `audio/mixer.js → INST_DB` (and `PLUCKED` if they decay naturally).

## A voice engine
Add a branch in `tools/voice.mjs` (cloud engines: a module like `tools/voice/elevenlabs.mjs`) that writes `build/_<slug>/voice/raw/<id>.wav` per line; mastering,
Whisper timing and `voice.json` stay shared.
