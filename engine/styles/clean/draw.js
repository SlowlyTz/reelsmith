// Style "clean": lines that draw themselves. Any stroke is a sampled path (SVG path string or
// points) drawn up to progress k with round caps, optional dash, soft shadow and a hint of
// hand-drawn wobble. Shapes: loops (hand circles), arrows, marker strokes, boxes, bursts, ripples.
(function () {
  const VG = window.VG, { clamp, lerp, hash, strSeed } = VG, E = VG.ease;

  // ---------- sampled paths ----------
  const cache = new Map();
  let svgPath = null;
  function sampleSvg(d, step) {
    if (!svgPath) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svg.appendChild(svgPath); }
    svgPath.setAttribute('d', d);
    const len = svgPath.getTotalLength(), n = Math.max(2, Math.ceil(len / step)), pts = [];
    for (let i = 0; i <= n; i++) { const p = svgPath.getPointAtLength((len * i) / n); pts.push([p.x, p.y]); }
    return pts;
  }
  // Catmull-Rom through points → dense polyline
  function sampleSpline(P, step, closed) {
    const pts = [], n = P.length, get = (i) => (closed ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < m; j++) {
        const t = j / m, t2 = t * t, t3 = t2 * t;
        pts.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    pts.push(closed ? P[0] : P[n - 1]);
    return pts;
  }
  // spec: SVG path string, or { pts: [[x,y],…], smooth?: true, closed?: false }; opt.wobble adds a hand-drawn waver
  VG.path = (spec, opt = {}) => {
    const wob = opt.wobble ?? 0, key = (typeof spec === 'string' ? spec : JSON.stringify(spec)) + '|' + wob + '|' + (opt.seed || 0);
    let P = cache.get(key); if (P) return P;
    let pts = typeof spec === 'string' ? sampleSvg(spec, 3) : spec.smooth === false ? spec.pts.map((p) => [...p]) : sampleSpline(spec.pts, 3, !!spec.closed);
    if (spec.smooth === false) {   // straight segments: densify so partial drawing is smooth
      const d = []; for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)); for (let j = 0; j < m; j++) d.push([lerp(a[0], b[0], j / m), lerp(a[1], b[1], j / m)]); }
      d.push(pts[pts.length - 1]); pts = d;
    }
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    if (wob) {   // perpendicular low-frequency waver, zero at both ends
      const s = opt.seed || strSeed(key), L = cum[cum.length - 1];
      pts = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const u = cum[i] / 70, f = Math.sin(Math.PI * Math.min(1, cum[i] / Math.min(40, L / 2), (L - cum[i]) / Math.min(40, L / 2)));
        const n = (Math.sin(u * 1.7 + s % 7) * 0.6 + Math.sin(u * 3.9 + (s >> 3) % 5) * 0.4) * wob * f;
        return [p[0] - (dy / l) * n, p[1] + (dx / l) * n];
      });
    }
    P = { pts, cum, len: cum[cum.length - 1] };
    cache.set(key, P); return P;
  };
  // point + direction at progress k along a path
  VG.pathAt = (P, k) => {
    const d = clamp(k) * P.len, c = P.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
    const a = P.pts[i - 1], b = P.pts[i], f = c[i] > c[i - 1] ? (d - c[i - 1]) / (c[i] - c[i - 1]) : 0;
    return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  };
  function trace(ctx, P, k0, k1) {
    const c = P.cum, d0 = clamp(k0) * P.len, d1 = clamp(k1) * P.len; if (d1 <= d0) return false;
    const s = VG.pathAt(P, k0); ctx.beginPath(); ctx.moveTo(s.x, s.y);
    for (let i = 1; i < P.pts.length; i++) { if (c[i] <= d0) continue; if (c[i] >= d1) break; ctx.lineTo(P.pts[i][0], P.pts[i][1]); }
    const e = VG.pathAt(P, k1); ctx.lineTo(e.x, e.y); return true;
  }

  // draw a path up to progress k (0..1). opt: color (ink), w (8), alpha, dash [on, off], shadow (true),
  // from (tail 0..1, for lines that disappear), cap, wobble (px, default 1.2), seed
  VG.ink = (ctx, spec, k, opt = {}) => {
    if (k <= 0) return null;
    const P = spec.pts && spec.cum ? spec : VG.path(spec, { wobble: opt.wobble ?? 1.2, seed: opt.seed });
    ctx.save();
    ctx.lineCap = opt.cap || 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = opt.w ?? 8;
    ctx.strokeStyle = opt.color || VG.theme.ink; if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (opt.dash) ctx.setLineDash(opt.dash);
    if (trace(ctx, P, opt.from || 0, k)) {
      if (opt.shadow !== false) { ctx.save(); VG.softShadow(ctx, 10, 6); ctx.stroke(); ctx.restore(); }
      else ctx.stroke();
    }
    ctx.restore();
    return P;
  };

  // ---------- shapes ----------
  // hand-drawn circle/ellipse that loops a little past its start (turns ≈ 1.12); opt: color (accent), w, a0, seed
  VG.loop = (ctx, x, y, rx, ry, k, opt = {}) => {
    const turns = opt.turns ?? 1.12, a0 = opt.a0 ?? -2.2, seed = opt.seed ?? 3, pts = [];
    for (let i = 0; i <= 96; i++) {
      const f = i / 96, a = a0 + f * turns * Math.PI * 2, wob = 1 + 0.035 * Math.sin(a * 2 + seed) + 0.05 * f;
      pts.push([x + Math.cos(a) * rx * wob, y + Math.sin(a) * ry * wob]);
    }
    return VG.ink(ctx, { pts }, E.inOutSine(k), { color: opt.color || VG.theme.accent, w: opt.w ?? 9, wobble: 0.6, shadow: opt.shadow ?? false, alpha: opt.alpha });
  };
  // rounded rectangle outline drawing itself clockwise from the top-left
  VG.inkRect = (ctx, x, y, w, h, r, k, opt = {}) => {
    r = Math.min(r, w / 2, h / 2);
    const d = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
    return VG.ink(ctx, d, k, { wobble: 0.5, ...opt });
  };
  // line / arrow from (x1,y1) to (x2,y2); opt.bend curves it (fraction of length, ±), opt.head (true), opt.dash
  VG.arrow = (ctx, x1, y1, x2, y2, k, opt = {}) => {
    const bend = opt.bend || 0, mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1);
    const cx = mx - ((y2 - y1) / L) * bend * L, cy = my + ((x2 - x1) / L) * bend * L;
    const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
    const kk = E.inOutSine(clamp(k / 0.85)), P = VG.ink(ctx, d, kk, { w: opt.w ?? 7, color: opt.color, dash: opt.dash, shadow: opt.shadow, alpha: opt.alpha, wobble: opt.wobble ?? 0.8 });
    if (P && opt.head !== false && k > 0.8) {
      const e = VG.pathAt(P, 0.999), hk = E.outQuint((k - 0.8) / 0.2), hl = (opt.headSize || 26) * hk, sp = 0.5;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = opt.w ?? 7; ctx.strokeStyle = opt.color || VG.theme.ink; if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
      ctx.beginPath();
      ctx.moveTo(e.x - Math.cos(e.ang - sp) * hl, e.y - Math.sin(e.ang - sp) * hl); ctx.lineTo(e.x, e.y);
      ctx.lineTo(e.x - Math.cos(e.ang + sp) * hl, e.y - Math.sin(e.ang + sp) * hl); ctx.stroke(); ctx.restore();
    }
    return P;
  };
  VG.line = (ctx, x1, y1, x2, y2, k, opt = {}) => VG.arrow(ctx, x1, y1, x2, y2, k, { head: false, ...opt });
  // translucent marker stroke across text (strike) or under it (underline)
  VG.strike = (ctx, x1, y, x2, k, opt = {}) => VG.ink(ctx, `M${x1},${y + 4} Q${(x1 + x2) / 2},${y - 5} ${x2},${y - 2}`, E.outQuint(k),
    { color: opt.color || VG.theme.accent, w: opt.w ?? 20, alpha: opt.alpha ?? 0.72, shadow: false, wobble: 0.4 });
  VG.underline = (ctx, x1, y, x2, k, opt = {}) => VG.ink(ctx, `M${x1},${y} Q${(x1 + x2) / 2},${y + 10} ${x2},${y - 3}`, E.outQuint(k),
    { color: opt.color || VG.theme.accent, w: opt.w ?? 10, alpha: opt.alpha ?? 0.9, shadow: false, wobble: 0.4 });
  // highlighter band behind text (draw before the text)
  VG.marker = (ctx, x1, y, x2, k, opt = {}) => VG.ink(ctx, `M${x1},${y} L${x2},${y - 3}`, E.outQuint(k),
    { color: opt.color || VG.theme.highlight, w: opt.w ?? 44, alpha: opt.alpha ?? 0.55, shadow: false, cap: 'butt', wobble: 0.3 });

  // starburst ("pain", "bang"): spring pop, accent fill with ink outline; opt: points (10), inner (0.52), fill, rot
  VG.burst = (ctx, x, y, r, k, opt = {}) => {
    if (k <= 0) return;
    const n = opt.points || 10, inner = opt.inner || 0.52, s = E.spring(k, 0.45);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate((opt.rot || 0) + (1 - E.outQuint(k)) * 0.6);
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * inner : r * (1 + 0.08 * Math.sin(i * 2.1)); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = opt.fill || VG.theme.accent; ctx.fill();
    ctx.lineWidth = opt.w ?? 4; ctx.lineJoin = 'round'; ctx.strokeStyle = opt.color || VG.theme.ink; ctx.stroke();
    ctx.restore();
  };
  // concentric rings; animated = expanding pulses, otherwise static rings that draw in with k
  VG.ripple = (ctx, x, y, r, lt, opt = {}) => {
    const n = opt.n || 3, col = opt.color || VG.theme.accent;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = opt.w ?? 4;
    for (let i = 0; i < n; i++) {
      let rr, a;
      if (opt.animated) { const f = ((lt * (opt.speed || 0.8)) + i / n) % 1; rr = r * (0.2 + f); a = (1 - f) * (opt.alpha ?? 0.8); }
      else { const kk = clamp((lt - i * 0.12) / 0.4); rr = r * ((i + 1) / n) * E.outQuint(kk); a = (opt.alpha ?? 0.8) * (1 - i * 0.22) * kk; }
      if (rr <= 0 || a <= 0) continue;
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };
  // a big single glyph that pops in ("?", "!", "=", "→"); opt: size (120), color (accent)
  VG.mark = (ctx, glyph, x, y, k, opt = {}) => VG.appear(ctx, x, y, k, (c) => VG.text(c, glyph, 0, 0, { size: opt.size || 120, weight: 800, color: opt.color || VG.theme.accent }), 'pop');
  VG.tick = (ctx, x, y, s, k, opt = {}) => VG.ink(ctx, { pts: [[x - s * 0.5, y], [x - s * 0.15, y + s * 0.38], [x + s * 0.55, y - s * 0.45]], smooth: false }, E.outQuint(k), { color: opt.color || '#2e9e5b', w: opt.w ?? s * 0.16, shadow: false });
  VG.cross = (ctx, x, y, s, k, opt = {}) => {
    const col = opt.color || VG.theme.accent, w = opt.w ?? s * 0.16;
    VG.ink(ctx, { pts: [[x - s / 2, y - s / 2], [x + s / 2, y + s / 2]], smooth: false }, clamp(k * 2), { color: col, w, shadow: false });
    VG.ink(ctx, { pts: [[x + s / 2, y - s / 2], [x - s / 2, y + s / 2]], smooth: false }, clamp(k * 2 - 1), { color: col, w, shadow: false });
  };
  VG.dot = (ctx, x, y, r, k, col) => { if (k <= 0) return; ctx.save(); ctx.fillStyle = col || VG.theme.accent; ctx.beginPath(); ctx.arc(x, y, r * E.spring(k), 0, Math.PI * 2); ctx.fill(); ctx.restore(); };
  // heart outline that draws itself, then fills
  VG.heart = (ctx, x, y, s, k, opt = {}) => {
    const d = `M${x},${y + s * 0.42} C${x - s * 0.9},${y - s * 0.1} ${x - s * 0.45},${y - s * 0.75} ${x},${y - s * 0.28} C${x + s * 0.45},${y - s * 0.75} ${x + s * 0.9},${y - s * 0.1} ${x},${y + s * 0.42} Z`;
    const kf = clamp((k - 0.6) / 0.4);
    if (kf > 0) { ctx.save(); ctx.globalAlpha *= kf; ctx.fillStyle = opt.fill || VG.theme.accent; ctx.fill(new Path2D(d)); ctx.restore(); }
    VG.ink(ctx, d, clamp(k / 0.7), { color: opt.color, w: opt.w ?? 6 });
  };
  // any custom illustration: outline draws on (k 0..0.75), fill fades in after; opt: fill, fillAlpha
  VG.shape = (ctx, d, k, opt = {}) => {
    const kf = clamp((k - 0.55) / 0.45);
    if (opt.fill && kf > 0) { ctx.save(); ctx.globalAlpha *= kf * (opt.fillAlpha ?? 1); ctx.fillStyle = opt.fill; ctx.fill(new Path2D(d)); ctx.restore(); }
    return VG.ink(ctx, d, clamp(k / 0.75), opt);
  };
})();
