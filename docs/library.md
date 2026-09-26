# Library reference (paper style)

Conventions: `k` = pop factor (pass `st.pop(at)`), `id` = jitter seed, `t` = scene time, colours are hex.
All functions draw at the current transform in content coordinates.

## Shapes & drawing primitives (`engine/styles/paper/paper.js`)

| Function | Notes |
|---|---|
| `VG.S(key, fn, amp = 1.1)` | cached hand-cut `Path2D`; `fn` returns points from `VG.G`; `amp` = edge wobble (0.3 for crisp objects) |
| `VG.G.ellipse(cx, cy, rx, ry, a0?, a1?)` · `rrect(x, y, w, h, r)` · `poly([x,y,…])` · `svg('M…')` · `blob([ctrl pts])` · `crescent(R, dx, dy, r)` · `heart(cx, cy, r)` · `star(r1, r2, n)` | point generators |
| `VG.revPts(pts)` | reverse a point list – inner list of a compound shape = hole |
| `VG.piece(ctx, path, color, depth = 1, opt)` | paper-textured fill + cast shadow + light cut edge. opt: `alpha`, `edge:false`, `flat`, `soft`, `shadow` |
| `VG.print(ctx, path, color, alpha)` | flat ink on the page (no shadow) – for `bg` |
| `VG.glow(ctx, path, color, blur, alpha)` · `VG.glowDot(ctx, x, y, r, color, alpha)` | additive light |
| `VG.pop(ctx, x, y, k, fn, id)` · `VG.popK(t, at, dur)` | pop-up mechanics |
| `VG.jit(id, amp)` · `VG.applyJit(ctx, id, amp)` | stop-motion placement jitter (changes on twos) |
| `VG.paper(color, soft)` | the paper pattern itself (use as fillStyle) |
| `VG.text(ctx, str, x, y, font, color, opt)` | opt: `align`, `alpha`, `shadow`, `stroke`, `strokeW`, `spacing`, `paper` |
| `VG.revealLine(ctx, [[word, at], …], t, x, y, font, color)` | words fading in one by one |

## Scenery & props (`props.js`)

| Group | Functions |
|---|---|
| sky | `sky(ctx, x0, x1, y0, y1, stops)`, `skyBlend(…, a, b, k)`, `sun(ctx, x, y, r, t, k, col, rays)`, `moon(ctx, x, y, r, k, id, col, glow)`, `cloud(ctx, x, y, s, k, id, col)` |
| stars | `star(ctx, x, y, s, col, depth)`, `twinkle(ctx, x, y, s, t, i, k)`, `starField(ctx, key, [x, y, w, h], n, t, t0, span, fold)`, `shootingStar(ctx, t, t0, from, to)`, `constellation(ctx, pts, t, tPop, tLine, fold)`, `heartPoints(cx, cy, size, n)` |
| land | `range(key, [[x, y] peaks], base)` → path, `snowCap(key, x, y, w)`, `hill(key, [x, y, …], base)` → path, `skyline(key, x0, x1, base, seed, hmin, hmax)` → path |
| plants | `pine(ctx, x, y, h, col, k, id)`, `roundTree(…)`, `flower(ctx, x, y, col, k, id)`, `mushroom(ctx, x, y, s, k, id, t)` |
| water | `waves(ctx, key, t, x0, x1, [tops], [colors], k(i), between(i))`, `paperBoat(ctx, t, inner(c), sail)`, `fish(ctx, x, y, rot, col)` |
| animals | `bird(ctx, x, y, t, s)`, `pigeon(ctx, x, y, t, flying, id)` |
| city | `houses(x0, x1, base, seed)` → list, `house(ctx, b, lit, key, tint)`, `lampPost(ctx, x, base, h, on, k, id)` |
| magic | `fireflies(ctx, key, rect, n, t, k)`, `sparkBurst(ctx, x, y, p, n, radius)`, `glyph(ctx, ch, x, y, size, alpha, col)`, `drawSticker(ctx, 'heart'\|'star', x, y, lt, scale)` |
| objects | `laptop(ctx, open, glow, sticker)`, `heart(ctx, x, y, r, col, depth)`, `hang(ctx, x, topY, len, k, t, fn, id)` |
| text | `cutoutText(ctx, str, x, y, size, {t, k0, stagger, fold, colors, font, id})`, `paperNote(ctx, x, y, w, h, lines, {k, size, font, color, tape, rot})`, `banner(ctx, x, y, text, k, id, {width, color, font})` |
| paths | `trail(key, [x, y, …])` → `{ at(s), total, dots(ctx, upTo, col) }` |

Fonts available: `"IM Fell English"` (+ italic), `"IM Fell English SC"`, `"Berkshire Swash"`, `UnifrakturMaguntia`,
`Caveat` (400–700), `"JetBrains Mono"`, `Fredoka` (300–700). Colour helpers: `VG.mix`, `VG.shade`, `VG.rgba`, `VG.ramp`.

## Puppets (`puppet.js`)

Cast entry (`story.json → cast.<id>`):

| Field | Values (default) |
|---|---|
| `hair` | `short` · `long` (past shoulders) · `bob` · `ponytail` · `bun` · `curly` (`short`) |
| `hairColor`, `skin` | hex (`#5b3820`, `#f4caa6`) |
| `outfit` | `tshirt-shorts` · `tshirt-pants` · `top-skirt` · `dress` (`tshirt-shorts`) |
| `top`, `bottom`, `shoes` | hex |
| `lashes`, `glasses` | bool |

`VG.puppet(ctx, id | config, pose)` – about 205 units tall at scale 1, feet at the origin.

| Pose field | Meaning |
|---|---|
| `x, y, scale, flip, rot` | placement |
| `walk` | phase in radians (`t * 9` = normal walk); overrides legs/arms swing |
| `armL, armR` | degrees outward from hanging (8 = rest, 40 = holding hands sideways, 110 = up/out, 140 = waving high) |
| `legL, legR, legLen` | leg angles; shorter legs for sitting on a ledge |
| `headTilt`, `lookX`, `lookY` | head roll (deg), eye direction (±5) |
| `mouth` | `smile` · `open` · `o` |
| `happyEyes`, `blink`, `blush` (0..1), `brow` | expression; `blink: VG.blinkAt(t, seed)` |
| `hideLegs` | e.g. sitting in a boat |
| `holdL/holdR(ctx)`, `front(ctx)` | draw props in a hand / in front of the body (e.g. `VG.laptop`) |
| `id` | extra jitter seed when the same cast member appears twice |

Two puppets holding hands: stand ~140 × scale apart, inner arms 40–45°.
