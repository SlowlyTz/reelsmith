# Style "clean" – smooth motion-graphics explainers

`"style": "clean"` renders flat, fluid motion graphics instead of paper stop-motion: sketch-note
explainers (a flat surface, ink lines that draw themselves, bold headlines, handwritten notes, one
accent colour) and desktop/UI demos (windows, a mouse pointer that glides and clicks, typed text).
Typical use: TikTok/Reels knowledge videos ("Wusstest du …"), tutorials, product walkthroughs.

Start from the template: `npm run new -- <slug> --style clean [--formats 9:16]` (copies
`stories/_template-clean/`, a 4-scene explainer that shows every technique). Files:
`engine/styles/clean/{clean,draw,ui,grade,scenery,person,post,subtitles}.js`, `frames/{board,desktop}.js`.

## story.json (clean-specific)

```jsonc
{
  "style": "clean",
  "frame": "board",                 // "board" (flat surface, default) | "desktop" (wallpaper + menu bar)
  "theme": "sand",                  // "sand" (beige, ink, orange – sketch-note) | "paper" (white, blue accent) | "night" (dark)
                                    // | "blush" (soft rose, wine-red accent – love stories, gifts)
                                    // or { "base": "sand", "accent": "#e4572e", … } to override single colours
  "fps": 30,                        // default 30; 60 is smoother (renders twice the frames)
  "music": { "bpm": 120, "beatsPerBar": 2 },   // 1-second bars → scenes can be timed to the second
  "voice": { "engine": "qwen", "voice": "wissen-creator", "tempo": 1.08 },
  "subtitles": { "style": "karaoke" },         // see Captions
  "brand": { "name": "sagt ja keiner.", "handle": "@name" },   // optional handwritten channel tag, top-left
  "board": { "transition": "fade", "grain": 0.035, "grid": false },   // fade | slide | cut; dot grid for a notebook look
  "desktop": { "wallpaper": ["#dfe7ff", "#f3dcef"], "menubar": true, "clock": "9:41" },   // frame "desktop" only
  "fadeTo": "#000"                  // colour of the final fade (default: theme background)
}
```

Theme colours (`VG.theme.*`): `bg`, `ink` (lines, headlines), `accent` (marker strokes, key words),
`muted` (handwritten notes), `soft` (tracks, faint lines), `paper` (sheets), `card` (label boxes),
`highlight` (caption word, marker band), `shadow`.

## Scenes

Same API as always (`VG.scene(id, { bg, fg, camera, sfx })`, docs/scenes.md), but:
- **No stop-motion, no pop-up folding.** Everything moves at the output frame rate; scenes crossfade.
- **Progress values:** `st.pop(at, dur = 0.45)` = 0→1 from `at` over `dur` (helpers ease it themselves),
  `st.prog(at, dur = 1)` = linear 0→1 (use for drawing lines, writing, typing), `st.word(line, word)`
  = scene time of a spoken word, `st.since(line, word)` = seconds since it was spoken.
- **Layout:** origin in the centre, `st.L.w × st.L.h` (9:16 = 1080 × 1920). Scale sizes with
  `u = Math.min(w, h) / 1080`. Keep the caption band free (karaoke captions sit at y ≈ +0.245·h in
  9:16) and stay inside the TikTok safe zone (not in the bottom 20 %, right 15 %, top 8 %).
- **Camera** defaults to static (no drift); add `camera: [[lt, x, y, zoom], …]` for push-ins.

## Helper reference

All sizes are canvas units (1080-wide content); `k` = progress 0..1; `opt` fields optional.

### Motion & text (`clean.js`)
| Function | What it does |
|---|---|
| `VG.appear(ctx, x, y, k, fn, how)` | draws `fn(ctx)` at (x,y) appearing: `'pop'` (spring scale), `'up'` (rise + fade), `'left'`/`'right'`, `'fade'` |
| `VG.ghost(ctx, k, fn, to = 0.28)` | fades something back to a faint "ghost" (keep context visible while the story moves on) |
| `VG.headline(ctx, lines, x, y, k, opt)` | big bold headline (string or array of lines), words rise in one after another; `size` (110), `color`, `upper` (true), `align`, `colors[]` per word |
| `VG.text(ctx, str, x, y, opt)` | plain text: `size`, `weight`, `font` (`VG.FONT.head` Montserrat · `.ui` Inter · `.hand` Caveat · `.mono`), `color`, `align`, `alpha`, `maxWidth` |
| `VG.measure(ctx, str, opt)` | text width with the same options |
| `VG.write(ctx, str, x, y, k, opt)` | handwriting that writes itself left → right with a soft pen edge; `size` (40), `color` (muted), `align`, `weight`, `rot` |
| `VG.label(ctx, str, x, y, k, opt)` | rounded label box ("HIRN"): outline draws itself, text fades in; `size` (44), `fill`, `ink`, `upper`, `w`/`h` |
| `VG.softShadow(ctx, blur, dy, col)` | soft drop shadow for the next fill |
| `VG.seq(lt, [[t, v], …])` · `VG.wave(lt, speed, amp)` · `VG.between(lt, a, b)` | step values, oscillation, a 0..1 visibility window |
| `VG.ease.spring / outQuint / outExpo / inOutSine` | extra easings |

### Lines & shapes (`draw.js`) – every line draws itself up to `k`
| Function | What it does |
|---|---|
| `VG.ink(ctx, path, k, opt)` | any path: SVG string (`'M0,0 C…'`) or `{ pts: [[x,y],…], smooth, closed }`; `color`, `w` (8), `dash: [on, off]`, `shadow` (true), `from` (erase the tail), `wobble` (hand-drawn waver, 1.2) |
| `VG.shape(ctx, svgPath, k, opt)` | custom illustration: outline draws on, then `fill` fades in |
| `VG.arrow(ctx, x1, y1, x2, y2, k, opt)` | arrow (head appears at the end); `bend` (±0.3 curves it), `dash`, `headSize`, `head: false` |
| `VG.line(…)` | the same without a head |
| `VG.loop(ctx, x, y, rx, ry, k, opt)` | hand-drawn circle that loops past its start – circling a word or object; `color` (accent), `w`, `turns` (1.12) |
| `VG.inkRect(ctx, x, y, w, h, r, k, opt)` | rounded rectangle outline |
| `VG.strike(ctx, x1, y, x2, k)` · `VG.underline(…)` · `VG.marker(…)` | marker stroke through, under or behind text |
| `VG.burst(ctx, x, y, r, k, opt)` | starburst ("pain", "bang") with a spring pop |
| `VG.ripple(ctx, x, y, r, lt, opt)` | concentric rings (`animated: true` = pulsing) |
| `VG.mark(ctx, '?', x, y, k, opt)` | a big glyph that pops in (? ! = →) |
| `VG.tick` · `VG.cross` · `VG.dot` · `VG.heart` | check mark, X, dot, heart |
| `VG.path(spec)` · `VG.pathAt(P, k)` | sampled path and the point/angle at progress k (to move things along a line) |

### UI (`ui.js`)
| Function | What it does |
|---|---|
| `VG.pointer(ctx, lt, keys, opt)` | mouse pointer gliding along `keys = [[t, x, y, 'click'?], …]` (eased, slightly arced), with click ring; `kind: 'hand'`, `scale` (1.7) |
| `VG.pointerAt(lt, keys)` | `{ x, y, since, press }` – e.g. to press a button when the pointer clicks |
| `VG.window(ctx, x, y, w, h, k, opt, content)` | macOS-style app window; `content(ctx, w, h)` draws inside (origin top-left); `title`, `dark` |
| `VG.sheet(ctx, x, y, w, h, k, opt, content)` | clean sheet of paper (ruled, margin line) to write on; `lines`, `margin`, `rot` |
| `VG.card(ctx, x, y, w, h, k, opt, content)` | rounded card with shadow |
| `VG.type(ctx, str, x, y, k, opt)` | typed text with blinking caret |
| `VG.count(ctx, to, x, y, k, opt)` | number counting up (`from`, `decimals`, `prefix`, `suffix`) |
| `VG.bar(ctx, x, y, w, h, value, k, opt)` | progress / comparison bar |
| `VG.button(ctx, str, x, y, k, opt)` | pill button (`press` 0..1) |
| `VG.rrectPath(ctx, x, y, w, h, r)` | rounded-rect path for your own fills |

### Colour grade (`grade.js`) – grey worlds that come alive
A scene may add `grade: (st) => ({ … })`; bg + fg are then drawn into a layer and composited with a filter.
| Field | Meaning |
|---|---|
| `sat` | saturation: 0 = black & white, 1 = untouched (animate it: `1 - st.prog(2, 3)` drains the colour) |
| `light` | brightness offset (−0.3 = darker, gloomier) · `contrast` (1) |
| `reveal: { x, y, r, soft, sat, light }` | soft circle (content coords) in which the scene keeps its own colour – grow `r` up to `VG.coverRadius(st.L, x, y)` to let colour spread from a point (a person, a touch, a heart) |

Paint a full background in the graded scene's `bg` (the theme background underneath is not graded).
Cost: one extra layer per graded frame (~5 ms); identity grades are skipped.

### Scenery & mood (`scenery.js`)
| Function | What it does |
|---|---|
| `VG.backdrop(ctx, L, ['#top', '#bottom'])` | full-surface vertical gradient (sky, mood) |
| `VG.glow(ctx, x, y, r, color, a)` | soft radial light behind someone / a lamp / the sun |
| `VG.cloud(ctx, x, y, s, opt)` | flat cloud; `color`, `alpha`, `seed`, `k` (pop in) |
| `VG.rain(ctx, L, lt, opt)` | rain streaks; `n`, `speed`, `angle`, `len`, `color`, `alpha`, `area` |
| `VG.drift(ctx, L, lt, opt)` | floating particles `kind: 'heart' \| 'petal' \| 'dot' \| 'spark'`; `n`, `colors`, `size`, `rise` (false = fall), `speed`, `sway`, `k` (fade in), `area` |
| `VG.ecg(ctx, x1, x2, y, k, opt)` | heartbeat line drawn up to `k`; `amp` 0 = flat line (lifeless) → 1 = full beats, `h`, `period`, `offset` (scroll with `lt * 220` for a live monitor), `glow`, `fade` (tail), `head`; returns the tip point |
| `VG.heartPath(x, y, s, side)` | SVG path of a heart; `'left'`/`'right'` = one half from the bottom tip up – two `VG.ink` lines in two colours meet as one heart |
| `VG.flower(ctx, x, y, size, k, opt)` | flower growing from the ground point: stem draws, leaves pop, petals spring open; `kind: 'round' \| 'pointed' \| 'heart' \| 'tulip'`, `petals`, `color`, `color2`, `center`, `stem` (0 = head only), `sway`, `outline` |
| `VG.meadow(ctx, x1, x2, y, k, opt)` | a row of flowers + grass blooming outward from `from` (x) as k → 1; `n`, `colors`, `kinds`, `size: [min, max]`, `sway: lt` (breeze), `seed` |

### People (`person.js`)
`VG.person(ctx, x, y, h, k, opt)` – flat minimalist figure standing at (x, y) (between the feet), `h` units tall,
springing in with `k`. Returns `{ head, hand, top }` (points for speech bubbles, hearts, lines).
| opt | Values |
|---|---|
| look | `skin`, `hair: 'short' \| 'long' \| 'bun' \| 'curly' \| 'none'`, `hairColor`, `shirt`, `pants`, `shoes`, `ink` (outline colour, `false` = none), `facing` (1 / −1) |
| face | `face: 'smile' \| 'happy' (eyes closed, big smile) \| 'neutral' \| 'sad' \| 'closed'`, `blush` 0..1 |
| motion | `lt` (idle breathing), `walk` (phase, e.g. `st.lt * 1.8`; omit to stand), `wave` 0..1, `reach` 0..1 (front arm out), `phone` 0..1 (hand at the ear), `headset` (true – calls, gaming), `lean` |

Poses blend: animate `wave`/`reach`/`phone` with `st.prog(…)` or `VG.between(…)`. Keep figures ≥ 360 units tall in 9:16 so faces read on a phone.

## Captions

`"subtitles": { "style": "karaoke" }` (default for clean): chunks of ≤ 3 words in heavy uppercase
white with a black outline; the word being spoken turns yellow. Other styles: `"words"` (one word at
a time) and `"lines"` (calm sentence-case captions, ≤ 2 rows, for 16:9). Options: `y`, `x`, `size`,
`maxWidth`, `maxWords`, `rows`, `upper`, `color`, `stroke`, `highlight`, `accent`. `*word*` in a line's
`sub` is drawn in the accent colour.

## Sound

No automatic frame sounds – place them where things happen, synced to words in `score.js`
(`M.sfx(W('vo2', 'gehirn'), 'ui_pluck_1.wav', 0.6)`) or per scene (`sfx: [[lt, file, gain, opts]]`).
Clean sounds: `mouse_click`, `pen_write_1/2` (use `dur` to match the writing), `marker_circle`,
`marker_line`, `ui_click_1/2`, `ui_tick`, `ui_pop`, `ui_pluck_1/2`, `ui_drop`, `ui_open`, `ui_close`,
`ui_confirm`, `ui_glass`, `ui_switch`, `ui_question`, `ui_error`, plus `synth:whoosh` / `synth:riser`.
Keep the music bed quiet (`mix.music` ≈ −12) under fast narration.

## Proven patterns
- **Pacing like a knowledge TikTok:** speech starts at ≈ 0.1 s, a new visual element every 1–3 s,
  scenes of 4–7 s, 1-second bars. Earlier elements may `VG.ghost` instead of disappearing.
- **Sync everything to words:** things appear on the word that names them (`st.pop(st.word(…))`),
  lines draw while the sentence explains them (`st.prog(st.word(…), dur)`).
- **One accent colour** for what matters (marker strokes, key words, bursts); ink for structure,
  `muted` handwriting for asides.
- **Diagrams:** label boxes + a line that draws between them + an annotation in handwriting.
- **Grey → colour (love stories, before/after):** grey scenes with `grade: { sat: 0, light: -0.25 }`, rain, a flat
  `VG.ecg` line (`amp: 0`), a person with `face: 'sad'`; the turning point is a `reveal` growing from the person who
  brings the colour, the ECG starts beating (`amp` 0 → 1), then `VG.meadow` blooms outward from them and `VG.drift`
  hearts rise. Theme `blush`; two lines in two colours meeting as one heart (`VG.heartPath(…, 'left'/'right')`).
- **Desktop moments:** window pops in, pointer glides to the field, text types, pointer clicks the
  button (`mouse_click` sound on the click time), results grow in.
