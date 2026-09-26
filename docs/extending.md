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
Create `engine/styles/<style>/` implementing the same surface the stories use (`VG.piece`, `VG.print`,
`VG.pop`, props, `VG.puppet`, frames, `VG.post`), register it in `engine/page.html`, and extend the
check in `VG.start` (`engine/runtime.js`). Stories select it with `"style": "<style>"`; keep the prop
names identical so stories stay portable between styles.

## An instrument or sound
Add recipes to `assets/manifests/samples.json` or `sfx.json` (pinned URL + sha256 + processing), run
`npm run fetch-assets -- --only samples --force`, credit it in `assets/CREDITS.md`. New instruments
also need a level in `audio/mixer.js → INST_DB` (and `PLUCKED` if they decay naturally).

## A voice engine
Add a branch in `tools/voice.mjs` that writes `build/_<slug>/voice/raw/<id>.wav` per line; mastering,
Whisper timing and `voice.json` stay shared.
