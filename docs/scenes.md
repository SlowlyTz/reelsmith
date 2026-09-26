# Writing scenes (`scenes.js`)

```js
(function () {
  const VG = window.VG, { lerp, ease, win } = VG;
  VG.scene('forest', {
    bg(ctx, st) { … },          // printed layer: sky, far hills, page text – never folds
    fg(ctx, st) { … },          // pop-ups, puppets, props, magic
    light(ctx, st) { … },       // optional: overlays after fg (tints, glows)
    camera: [[0, -120, 40, 1.1], [3.5, 0, 60, 1.22]],       // [lt, x, y, zoom] in content coords
    sfx: [[-0.8, 'forest_ambience_1.wav', 0.5, { bus: 'amb', dur: 9, fadeIn: 1, fadeOut: 1.5 }]],
  });
})();
```

## `st` – scene state

| Member | Meaning |
|---|---|
| `st.lt` | seconds since the scene is fully open (negative during the transition in) |
| `st.t` | absolute time (quantised to animFps) |
| `st.L` | `{ w, h, gutter, single }` content size; `gutter` = 16:9 book (fold at x = 0) |
| `st.pop(at, dur = 0.42)` | pop-up factor (0 → overshoot → 1) starting `at` s after opening, × `st.fold` |
| `st.fold` | 1 while visible, → 0 while the scene transitions out |
| `st.word(line, w)` | scene-local time the word starts (`w` = text prefix, case-insensitive, or index); `st.word(id, w, true)` = end |
| `st.since(line, w)` | `st.lt - st.word(line, w)` |
| `st.line(id)` | `{ start, end }` of a narration line (scene-local) |
| `st.dur` | seconds from opening to the scene's end |

Word times come from Whisper after `npm run voice`; before that they are estimated from the text.

## Layout by format

Content origin is the centre; x right, y down. Use fractions of `st.L.w/h`, scale characters with
`s = Math.min(w, h) / 900` (book) or `/ 1080` (stage). Typical anchors:
- ground line `h * 0.3` (book) – puppets stand with feet on it
- 16:9 book: left page centre `-w/4`, right page centre `w/4`; never put faces or text within ±60 of x = 0
- 9:16: one tall column – stack elements vertically, leave the lower 25 % free when subtitles are on

## Pop-ups & depth

- `VG.pop(ctx, x, baseY, k, (c) => draw(c), id)` anchors a piece at its base and scales it up from the page.
  Everything standing must go through it (or through helpers taking `k`), or it won't fold on transitions.
- Stagger: background 0.05–0.2, mid 0.2–0.4, characters 0.25–0.5, details 0.4–0.7.
- Depth (shadow size) in `VG.piece(ctx, path, color, depth)`: far 1, mid 1.5–2, near 2.5.
- `id` seeds stop-motion jitter; give moving/standing pieces stable ids.

## Proven patterns

**Walk in, stop on the name, wave**
```js
const tName = st.word('vo2', 'Lina'), x = lerp(-w * 0.42, -w * 0.14, ease.inOut(win(t, 0.3, tName - 0.1)));
const walking = t > 0.3 && t < tName + 0.2, wave = win(t, tName + 0.3, 0.2) * (1 - win(t, tName + 2.2, 0.3));
VG.pop(ctx, x, ground, st.pop(0.25), (c) => VG.puppet(c, 'lina', { walk: walking ? t * 9 : null, armR: 8 + wave * (140 + Math.sin(t * 14) * 16), mouth: wave > 0.5 ? 'open' : 'smile' }), 'lina');
VG.banner(ctx, x, ground + 90, 'Lina', VG.popK(t, tName, 0.45) * st.fold, 'bn');
```

**Day → night**: `const n = VG.smooth(win(t, 1, 5))`; `VG.skyBlend(…, day, night, n)` in bg; at the end of fg
multiply-tint (`VG.mix('#ffffff', '#5d67a8', n * 0.6)` with `globalCompositeOperation = 'multiply'`), then draw
light sources (moon, windows, lamps, `VG.starField`, `VG.constellation`) after the tint.

**Things travelling along a path**: `const tr = VG.trail('key', [x0, y0, x1, y1, …]); tr.dots(ctx, s); const [x, y] = tr.at(s)`.

**Magic reveal**: glyphs/sparks fly (`VG.glyph`, `VG.sparkBurst`) and turn into pop-ups; add a `M.chime` at the same time.

**Title / message**: `VG.cutoutText(ctx, 'HAPPY', 0, -h * 0.2, 150 * s, { t, k0: 0.2, fold: st.fold })`,
lists on `VG.paperNote(ctx, x, y, w, h, ['…', '…'], { k: st.pop(0.3) })`.

## Camera

Keys per scene are merged into one camera path; transitions interpolate between scenes. The frame clamps:
book → stays inside the book (a sliver of cover may show), stage → zoom ≥ 1 inside the frame.
Wide establishing (1.0–1.1) → follow (1.2–1.4) → close-up on the key moment (1.4–1.6) → pull back before the turn.

## Sound in scenes

`sfx: [[lt, file, gain, opts]]`, opts: `pan` (-1..1), `rate`, `dur`, `offset`, `bus: 'amb'`, `fadeIn`, `fadeOut`.
Negative `lt` starts ambience before the scene opens. Catalogue: docs/audio.md.
