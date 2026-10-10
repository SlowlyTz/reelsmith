// Style "clean": scenery and mood – backgrounds, soft light, clouds, rain, drifting particles,
// a heartbeat (ECG) line, hearts built from two lines, flowers that bloom and meadows that spread.
// All deterministic (VG.hash), all in content coordinates; k = progress 0..1, lt = scene time.
(function () {
  const VG = window.VG, { clamp, lerp, hash } = VG, E = VG.ease, TAU = Math.PI * 2;

  // ---------- backgrounds & light ----------
  // full-surface vertical gradient: stops = ['#top', '#bottom'] or more colours
  VG.backdrop = (ctx, L, stops) => {
    const g = ctx.createLinearGradient(0, -L.h / 2, 0, L.h / 2);
    stops.forEach((c, i) => g.addColorStop(i / Math.max(1, stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(-L.w, -L.h, L.w * 2, L.h * 2);
  };
  // soft radial light (warm glow behind a person, a lamp, the sun)
  VG.glow = (ctx, x, y, r, color, a = 0.6) => {
    if (a <= 0 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, VG.rgbaStr(color, a)); g.addColorStop(0.45, VG.rgbaStr(color, a * 0.45)); g.addColorStop(1, VG.rgbaStr(color, 0));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };

  // ---------- weather ----------
  // flat cloud (overlapping circles on a flat base); opt: color, alpha, seed, k (pop in)
  VG.cloud = (ctx, x, y, s, opt = {}) => {
    const k = opt.k ?? 1; if (k <= 0) return;
    const seed = opt.seed ?? 1, puffs = [[-0.55, 0.05, 0.32], [-0.22, -0.18, 0.42], [0.18, -0.24, 0.48], [0.55, -0.02, 0.34], [0.05, 0.08, 0.36]];
    ctx.save(); ctx.translate(x, y); const sc = E.outQuint(k); ctx.scale(sc, sc);
    ctx.globalAlpha *= (opt.alpha ?? 1) * clamp(k * 2); ctx.fillStyle = opt.color || VG.theme.paper;
    ctx.beginPath();
    for (const [i, [px, py, pr]] of puffs.entries()) { const j = 1 + 0.12 * (hash(seed, i) - 0.5); ctx.moveTo(px * s + pr * s * j, py * s); ctx.arc(px * s, py * s, pr * s * j, 0, TAU); }
    ctx.rect(-0.62 * s, 0, 1.24 * s, 0.22 * s); ctx.fill();
    ctx.restore();
  };
  // rain streaks across the surface; opt: n (90), color, alpha (0.35), speed (1900 u/s), angle (0.12), len (60), w (3), area {x,y,w,h}
  VG.rain = (ctx, L, lt, opt = {}) => {
    const n = opt.n ?? 90, sp = opt.speed ?? 1900, ang = opt.angle ?? 0.12, len = opt.len ?? 60, A = opt.area || { x: -L.w / 2, y: -L.h / 2, w: L.w, h: L.h };
    ctx.save(); ctx.strokeStyle = opt.color || VG.theme.muted; ctx.lineWidth = opt.w ?? 3; ctx.lineCap = 'round';
    ctx.globalAlpha *= opt.alpha ?? 0.35; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = A.x + hash(i, 11) * A.w, v = sp * (0.75 + 0.5 * hash(i, 12)), y = A.y + (((hash(i, 13) * A.h + lt * v) % A.h) + A.h) % A.h;
      const x = x0 - (y - A.y) * ang, l = len * (0.6 + 0.8 * hash(i, 14));
      ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(ang) * l, y - Math.cos(ang) * l);
    }
    ctx.stroke(); ctx.restore();
  };

  // ---------- particles ----------
  // drifting particles: kind 'heart' | 'petal' | 'dot' | 'spark'; opt: n (24), colors, size (22), rise (true = float up),
  // speed (60 u/s), sway (40), alpha, area {x,y,w,h}, seed, k (fade in 0..1)
  VG.drift = (ctx, L, lt, opt = {}) => {
    const n = opt.n ?? 24, cols = opt.colors || [VG.theme.accent], size = opt.size ?? 22, sp = opt.speed ?? 60, sway = opt.sway ?? 40;
    const A = opt.area || { x: -L.w / 2, y: -L.h / 2, w: L.w, h: L.h }, seed = opt.seed ?? 7, k = opt.k ?? 1, kind = opt.kind || 'petal';
    if (k <= 0) return;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const h = (j) => hash(seed, i, j), v = sp * (0.6 + 0.8 * h(1)), span = A.h + size * 4;
      let y = ((h(2) * span + lt * v) % span) - size * 2; y = opt.rise === false ? A.y + y : A.y + A.h - y;
      const x = A.x + h(3) * A.w + Math.sin(lt * (0.6 + h(4)) + h(5) * TAU) * sway, s = size * (0.6 + 0.8 * h(6)), rot = lt * (h(7) - 0.5) * 2 + h(8) * TAU;
      ctx.globalAlpha = (opt.alpha ?? 0.85) * clamp(k * n - i * 0.6) * (0.55 + 0.45 * h(9));
      ctx.fillStyle = cols[Math.floor(h(10) * cols.length)];
      ctx.save(); ctx.translate(x, y); ctx.rotate(kind === 'heart' ? Math.sin(rot) * 0.3 : rot);
      if (kind === 'heart') ctx.fill(heartP(s));
      else if (kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fill(); }
      else if (kind === 'spark') { ctx.beginPath(); for (let j = 0; j < 8; j++) { const r = j % 2 ? s * 0.14 : s * 0.5, a = (j / 8) * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); }
      else { ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.26, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  };
  const heartCache = new Map();
  function heartP(s) {
    const key = Math.round(s * 4); let p = heartCache.get(key); if (p) return p;
    p = new Path2D(VG.heartPath(0, 0, s)); heartCache.set(key, p); return p;
  }

  // ---------- hearts from lines ----------
  // SVG path of a heart centred on (x, y), size s (≈ width); side 'left' / 'right' = one half drawn from the
  // bottom tip up to the top notch (two lines meeting = one heart), 'both' = closed outline
  VG.heartPath = (x, y, s, side = 'both') => {
    const tip = [x, y + s * 0.42], notch = [x, y - s * 0.26];
    const L = `C${x - s * 0.18},${y + s * 0.26} ${x - s * 0.62},${y + s * 0.04} ${x - s * 0.56},${y - s * 0.2} C${x - s * 0.5},${y - s * 0.5} ${x - s * 0.1},${y - s * 0.52} ${notch[0]},${notch[1]}`;
    const R = `C${x + s * 0.18},${y + s * 0.26} ${x + s * 0.62},${y + s * 0.04} ${x + s * 0.56},${y - s * 0.2} C${x + s * 0.5},${y - s * 0.5} ${x + s * 0.1},${y - s * 0.52} ${notch[0]},${notch[1]}`;
    if (side === 'left') return `M${tip[0]},${tip[1]} ${L}`;
    if (side === 'right') return `M${tip[0]},${tip[1]} ${R}`;
    return `M${notch[0]},${notch[1]} C${x + s * 0.1},${y - s * 0.52} ${x + s * 0.5},${y - s * 0.5} ${x + s * 0.56},${y - s * 0.2} C${x + s * 0.62},${y + s * 0.04} ${x + s * 0.18},${y + s * 0.26} ${tip[0]},${tip[1]} ${L} Z`;
  };

  // ---------- heartbeat line ----------
  // ECG trace from x1 to x2 at baseline y, drawn up to k (0..1). Beats repeat every `period` units starting at
  // `offset` (scroll it with lt for a monitor); amp 0 = flat line (lifeless), 1 = full beat (h units high).
  // opt: amp (1), h (150), period (360), width (0.42 of period), offset (0), color, w (7), glow (0), fade (0 = solid,
  // 0..1 = tail fades out behind the head), head (true = glowing dot at the tip). Returns the head point.
  const beat = (u) => {   // one P-QRS-T complex over u ∈ [0, 1], up = positive
    const g = (c, w) => Math.exp(-((u - c) * (u - c)) / (2 * w * w));
    return 0.12 * g(0.14, 0.045) - 0.16 * g(0.36, 0.022) + 1.0 * g(0.42, 0.024) - 0.34 * g(0.49, 0.024) + 0.2 * g(0.74, 0.07);
  };
  VG.ecg = (ctx, x1, x2, y, k, opt = {}) => {
    if (k <= 0) return null;
    const amp = opt.amp ?? 1, h = opt.h ?? 150, per = opt.period ?? 360, bw = per * (opt.width ?? 0.42), off = opt.offset ?? 0;
    const xe = lerp(x1, x2, clamp(k)), step = 3, pts = [];
    for (let x = x1; x < xe; x += step) pts.push([x, yAt(x)]);
    pts.push([xe, yAt(xe)]);
    function yAt(x) {
      if (!amp) return y;
      const p = ((x - x1 - off) % per + per) % per, u = p / bw;
      return u < 1 ? y - beat(u) * h * amp : y;
    }
    const col = opt.color || VG.theme.accent;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = opt.w ?? 7;
    if (opt.fade) {
      const g = ctx.createLinearGradient(x1, 0, xe, 0);
      g.addColorStop(0, VG.rgbaStr(col, 1 - clamp(opt.fade))); g.addColorStop(1, VG.rgbaStr(col, 1)); ctx.strokeStyle = g;
    } else ctx.strokeStyle = col;
    if (opt.glow) { ctx.shadowColor = col; ctx.shadowBlur = opt.glow * VG.scaleOf(ctx); }
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
    const hp = pts[pts.length - 1];
    if (opt.head !== false && k < 1) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hp[0], hp[1], (opt.w ?? 7) * 1.3, 0, TAU); ctx.fill(); }
    ctx.restore();
    return { x: hp[0], y: hp[1] };
  };

  // ---------- flowers ----------
  // A flower growing from the ground point (x, y): the stem draws itself, leaves pop, the bud opens.
  // k phases: stem 0–0.45, leaves 0.3–0.65, petals 0.5–1. size = flower head diameter.
  // opt: petals (6), kind 'round' | 'pointed' | 'heart' | 'tulip', color, center, stem (length, default 1.5·size; 0 = head only at (x, y)),
  // stemColor, leaves (2), sway (radians, e.g. VG.wave(lt, 0.3, 0.05)), rot, outline (ink colour or false), seed
  VG.flower = (ctx, x, y, size, k, opt = {}) => {
    if (k <= 0) return;
    const col = opt.color || VG.theme.accent, stemL = opt.stem ?? size * 1.5, seed = opt.seed ?? 1, sway = opt.sway || 0;
    const stemCol = opt.stemColor || '#5f8a5a', lean = (hash(seed, 1) - 0.5) * 0.25 + sway;
    const hx = x + Math.sin(lean) * stemL, hy = y - Math.cos(lean) * stemL;
    ctx.save();
    if (stemL > 0) {
      const ks = E.inOutSine(clamp(k / 0.45)), cx = x + Math.sin(lean * 0.4) * stemL * 0.5 + (hash(seed, 2) - 0.5) * size * 0.3, cy = y - stemL * 0.5;
      quadTo(ctx, x, y, cx, cy, hx, hy, ks, stemCol, Math.max(3, size * 0.07));   // uncached: the stem sways every frame
      const nl = opt.leaves ?? 2;
      for (let i = 0; i < nl; i++) {
        const kl = E.spring(clamp((k - 0.3 - i * 0.08) / 0.3), 0.3); if (kl <= 0) continue;
        const f = 0.35 + 0.22 * i, lx = lerp(x, hx, f), ly = lerp(y, hy, f), side = i % 2 ? 1 : -1;
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(side * 0.9 + lean); ctx.scale(kl, kl);
        ctx.fillStyle = stemCol; ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * size * 0.28, -size * 0.12, side * size * 0.5, 0); ctx.quadraticCurveTo(side * size * 0.24, size * 0.12, 0, 0); ctx.fill();
        ctx.restore();
      }
    }
    const kp = clamp((k - 0.5) / 0.5); if (kp <= 0 && stemL > 0) { ctx.restore(); return; }
    const kk = stemL > 0 ? kp : clamp(k), open = E.spring(kk, 0.3), n = opt.petals ?? 6, r = size / 2, kind = opt.kind || 'round';
    ctx.translate(stemL > 0 ? hx : x, stemL > 0 ? hy : y); ctx.rotate((opt.rot ?? hash(seed, 3) * TAU) + (1 - E.outQuint(kk)) * -0.8 + sway * 0.5);
    const ink = opt.outline === undefined ? false : opt.outline;
    if (kind === 'tulip') {
      ctx.scale(open, open); ctx.rotate(-(opt.rot ?? hash(seed, 3) * TAU));
      const p = new Path2D(`M0,${r * 0.55} C${-r * 0.9},${r * 0.4} ${-r * 0.8},${-r * 0.5} ${-r * 0.55},${-r * 0.75} L${-r * 0.25},${-r * 0.35} L0,${-r * 0.8} L${r * 0.25},${-r * 0.35} L${r * 0.55},${-r * 0.75} C${r * 0.8},${-r * 0.5} ${r * 0.9},${r * 0.4} 0,${r * 0.55} Z`);
      ctx.fillStyle = col; ctx.fill(p); if (ink) { ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, size * 0.04); ctx.stroke(p); }
      ctx.restore(); return;
    }
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate((i / n) * TAU); ctx.scale(open, open);
      const len = r * (0.92 + 0.12 * hash(seed, 10 + i)), wd = r * (kind === 'pointed' ? 0.3 : 0.42) * (6 / Math.max(4, n)) ** 0.5;
      const p = new Path2D();
      if (kind === 'pointed') { p.moveTo(0, 0); p.quadraticCurveTo(wd, -len * 0.5, 0, -len); p.quadraticCurveTo(-wd, -len * 0.5, 0, 0); }
      else if (kind === 'heart') { p.moveTo(0, 0); p.bezierCurveTo(wd * 1.4, -len * 0.35, wd * 1.1, -len * 1.05, 0, -len * 0.82); p.bezierCurveTo(-wd * 1.1, -len * 1.05, -wd * 1.4, -len * 0.35, 0, 0); }
      else { p.moveTo(0, 0); p.bezierCurveTo(wd * 1.3, -len * 0.3, wd * 1.1, -len, 0, -len); p.bezierCurveTo(-wd * 1.1, -len, -wd * 1.3, -len * 0.3, 0, 0); }
      ctx.fillStyle = i % 2 && opt.color2 ? opt.color2 : col; ctx.fill(p);
      if (ink) { ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, size * 0.035); ctx.stroke(p); }
      ctx.restore();
    }
    const cr = r * 0.26 * E.spring(clamp(kk * 1.3), 0.4);
    if (cr > 0) { ctx.fillStyle = opt.center || '#f2c75c'; ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  // partial quadratic curve (0..k), stroked directly – for shapes that change every frame
  function quadTo(ctx, x0, y0, cx, cy, x1, y1, k, col, w) {
    if (k <= 0) return;
    const n = 24, m = Math.max(1, Math.ceil(n * clamp(k)));
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i <= m; i++) { const t = Math.min(k, i / n), u = 1 - t; ctx.lineTo(u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1); }
    ctx.stroke(); ctx.restore();
  }

  // A row of flowers along the ground y between x1 and x2 that blooms outward from `from` (x) as k goes 0 → 1.
  // opt: n (14), from (x of the origin, default centre), size ([60, 120]), colors, centers, kinds, stem ([0.9, 1.9] × size),
  // grass (true), grassColor, sway (lt for a gentle breeze), seed
  VG.meadow = (ctx, x1, x2, y, k, opt = {}) => {
    if (k <= 0) return;
    const n = opt.n ?? 14, seed = opt.seed ?? 3, from = opt.from ?? (x1 + x2) / 2, span = Math.max(Math.abs(from - x1), Math.abs(x2 - from)) || 1;
    const [s0, s1] = opt.size || [60, 120], [t0, t1] = opt.stem || [0.9, 1.9], cols = opt.colors || [VG.theme.accent];
    const kinds = opt.kinds || ['round', 'pointed', 'round', 'tulip'], centers = opt.centers || ['#f2c75c'];
    const items = [];
    for (let i = 0; i < n; i++) {
      const h = (j) => hash(seed, i, j), x = lerp(x1, x2, (i + 0.15 + h(1) * 0.7) / n), s = lerp(s0, s1, h(2));
      items.push({ i, x, yy: y + (h(3) - 0.5) * s * 0.35, s, delay: (Math.abs(x - from) / span) * 0.55 + h(4) * 0.08, h });
    }
    if (opt.grass !== false) {   // grass blades first, spreading with the same wave
      ctx.save(); ctx.strokeStyle = opt.grassColor || '#6f9a63'; ctx.lineCap = 'round'; ctx.lineWidth = 5;
      const m = Math.round(n * 3.2);
      for (let i = 0; i < m; i++) {
        const gx = lerp(x1, x2, (i + hash(seed, 900 + i)) / m), kg = E.outQuint(clamp((k - (Math.abs(gx - from) / span) * 0.5) / 0.25));
        if (kg <= 0) continue;
        const gh = (30 + 50 * hash(seed, 950 + i)) * kg, bend = (hash(seed, 990 + i) - 0.5) * 24 + (opt.sway != null ? VG.wave(opt.sway, 0.35, 5, i * 0.13) : 0);
        ctx.beginPath(); ctx.moveTo(gx, y + 6); ctx.quadraticCurveTo(gx + bend * 0.3, y - gh * 0.5, gx + bend, y - gh); ctx.stroke();
      }
      ctx.restore();
    }
    items.sort((a, b) => a.yy - b.yy).forEach(({ i, x, yy, s, delay, h }) => {
      const kf = clamp((k - delay) / 0.45);
      VG.flower(ctx, x, yy, s, kf, { seed: seed * 100 + i, color: cols[Math.floor(h(5) * cols.length)], center: centers[Math.floor(h(6) * centers.length)],
        kind: kinds[Math.floor(h(7) * kinds.length)], petals: 5 + Math.floor(h(8) * 3), stem: s * lerp(t0, t1, h(9)),
        sway: opt.sway != null ? VG.wave(opt.sway, 0.3, 0.05, h(10)) : 0, outline: opt.outline });
    });
  };
})();
