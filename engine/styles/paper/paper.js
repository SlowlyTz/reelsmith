// Paper style, part 1: paper grain, hand-cut shapes, cut-out pieces with cast shadows,
// pop-up mechanics and stop-motion jitter.
(function () {
  const VG = window.VG, { clamp, lerp, ease, win, rng, hash, strSeed } = VG;

  // ---------- paper grain (tileable) ----------
  function makeGrain(S, seed, strength = 1) {
    const c = VG.mk(S, S), g = c.getContext('2d');
    const img = g.createImageData(S, S), d = img.data, R = rng(seed);
    const oct = [[4, 0.30], [8, 0.26], [16, 0.2], [32, 0.14], [64, 0.1], [128, 0.08]];
    const grids = oct.map(([n]) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = R() * 2 - 1; return a; });
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let v = 0;
      for (let k = 0; k < oct.length; k++) {
        const n = oct[k][0], a = grids[k];
        const fx = (x / S) * n, fy = (y / S) * n, ix = Math.floor(fx), iy = Math.floor(fy);
        let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        const x0 = ix % n, y0 = iy % n, x1 = (ix + 1) % n, y1 = (iy + 1) % n;
        const v0 = lerp(a[y0 * n + x0], a[y0 * n + x1], tx), v1 = lerp(a[y1 * n + x0], a[y1 * n + x1], tx);
        v += lerp(v0, v1, ty) * oct[k][1];
      }
      v += (R() * 2 - 1) * 0.16;
      const gray = clamp(128 + v * 30 * strength, 0, 255);
      const i = (y * S + x) * 4; d[i] = d[i + 1] = d[i + 2] = gray; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // fibres, drawn with wrap-around so the tile stays seamless
    g.lineCap = 'round';
    for (let i = 0; i < 520; i++) {
      const x = R() * S, y = R() * S, a = R() * Math.PI * 2, L = 6 + R() * 26, bend = (R() - 0.5) * 10;
      g.strokeStyle = R() < 0.55 ? `rgba(255,255,255,${0.10 * strength})` : `rgba(0,0,0,${0.07 * strength})`;
      g.lineWidth = 0.5 + R() * 0.9;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        g.beginPath(); g.moveTo(x + ox, y + oy);
        g.quadraticCurveTo(x + ox + Math.cos(a) * L / 2 - Math.sin(a) * bend, y + oy + Math.sin(a) * L / 2 + Math.cos(a) * bend,
          x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L);
        g.stroke();
      }
    }
    return c;
  }

  let GRAIN = null, GRAIN_SOFT = null;
  const paperCache = new Map();
  VG.initPaper = () => { GRAIN = makeGrain(512, 7, 1.0); GRAIN_SOFT = makeGrain(512, 11, 0.55); VG.GRAIN = GRAIN; };
  // CanvasPattern of a colour with paper grain baked in; patterns follow the current transform,
  // so the texture sticks to the piece it is drawn on.
  VG.paper = (color, soft = false) => {
    const key = color + (soft ? 's' : '');
    let p = paperCache.get(key);
    if (p) return p;
    const c = VG.mk(512, 512), g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'overlay';
    g.drawImage(soft ? GRAIN_SOFT : GRAIN, 0, 0);
    g.globalAlpha = 0.5; g.drawImage(soft ? GRAIN_SOFT : GRAIN, 0, 0);
    p = g.createPattern(c, 'repeat');
    paperCache.set(key, p);
    return p;
  };

  // ---------- shapes: point lists -> hand-cut Path2D ----------
  const shapeCache = new Map();
  let svgPath = null;
  function svgPts(d, step = 3) {
    if (!svgPath) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.position = 'absolute'; svg.style.width = '0'; svg.style.height = '0';
      document.body.appendChild(svg);
      svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svg.appendChild(svgPath);
    }
    svgPath.setAttribute('d', d);
    const L = svgPath.getTotalLength(), n = Math.max(8, Math.ceil(L / step)), pts = [];
    for (let i = 0; i < n; i++) { const p = svgPath.getPointAtLength((i / n) * L); pts.push(p.x, p.y); }
    return pts;
  }
  function resample(pts, step = 3) {
    const out = [], n = pts.length / 2;
    for (let i = 0; i < n; i++) {
      const x0 = pts[i * 2], y0 = pts[i * 2 + 1], j = (i + 1) % n, x1 = pts[j * 2], y1 = pts[j * 2 + 1];
      const L = Math.hypot(x1 - x0, y1 - y0), k = Math.max(1, Math.ceil(L / step));
      for (let s = 0; s < k; s++) out.push(lerp(x0, x1, s / k), lerp(y0, y1, s / k));
    }
    return out;
  }
  // displace along the normals with low-frequency noise: the look of scissors
  function wobble(pts, amp, seed) {
    if (!amp) return pts;
    const n = pts.length / 2, R = rng(seed), out = new Array(pts.length);
    const f1 = 0.04 + R() * 0.03, f2 = 0.11 + R() * 0.06, p1 = R() * 6.28, p2 = R() * 6.28;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const a = (i - 1 + n) % n, b = (i + 1) % n;
      const tx = pts[b * 2] - pts[a * 2], ty = pts[b * 2 + 1] - pts[a * 2 + 1], tl = Math.hypot(tx, ty) || 1;
      if (i > 0) s += Math.hypot(pts[i * 2] - pts[i * 2 - 2], pts[i * 2 + 1] - pts[i * 2 - 1]);
      const o = amp * (0.62 * Math.sin(s * f1 + p1) + 0.38 * Math.sin(s * f2 + p2)) + amp * 0.25 * (R() - 0.5);
      out[i * 2] = pts[i * 2] + (ty / tl) * o; out[i * 2 + 1] = pts[i * 2 + 1] - (tx / tl) * o;
    }
    return out;
  }
  function toPath(pts, p = new Path2D()) {
    p.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
    p.closePath(); return p;
  }
  // point generators (flat [x, y, x, y, ...] lists)
  const G = {
    ellipse(cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2) { const n = Math.max(24, Math.ceil((Math.max(rx, ry) * Math.abs(a1 - a0)) / 3)); const p = [];
      for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); } return p; },
    rrect(x, y, w, h, r = 0) { r = Math.min(r, w / 2, h / 2); if (!r) return resample([x, y, x + w, y, x + w, y + h, x, y + h]);
      const d = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
      return svgPts(d); },
    poly(list) { return resample(list); },
    svg(d, step) { return svgPts(d, step); },
    // closed smooth curve through control points (Catmull-Rom)
    blob(cp, seg = 8) { const n = cp.length / 2, p = [];
      for (let i = 0; i < n; i++) {
        const P = (k) => [cp[((k + n) % n) * 2], cp[((k + n) % n) * 2 + 1]];
        const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
        for (let s = 0; s < seg; s++) { const t = s / seg, t2 = t * t, t3 = t2 * t;
          p.push(0.5 * (2 * x1 + (-x0 + x2) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (-x0 + 3 * x1 - 3 * x2 + x3) * t3),
            0.5 * (2 * y1 + (-y0 + y2) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (-y0 + 3 * y1 - 3 * y2 + y3) * t3)); }
      } return resample(p, 3); },
    // crescent = disc R minus disc r offset by (dx, dy)
    crescent(R, dx, dy, r) { const out = [], n = 160;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R; if (Math.hypot(x - dx, y - dy) > r) out.push([x, y, a]); }
      let gap = 0; for (let i = 1; i < out.length; i++) if (out[i][2] - out[i - 1][2] > 0.1) gap = i;
      const outer = out.slice(gap).concat(out.slice(0, gap));
      const inner = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = dx + Math.cos(a) * r, y = dy + Math.sin(a) * r; if (Math.hypot(x, y) < R) inner.push([x, y, a]); }
      let g2 = 0; for (let i = 1; i < inner.length; i++) if (inner[i][2] - inner[i - 1][2] > 0.1) g2 = i;
      const inn = inner.slice(g2).concat(inner.slice(0, g2)).reverse();
      return outer.concat(inn).flatMap((p) => [p[0], p[1]]); },
    heart(cx, cy, r) { const p = [];
      for (let i = 0; i < 90; i++) { const t = (i / 90) * Math.PI * 2;
        p.push(cx + r * 0.0625 * 16 * Math.pow(Math.sin(t), 3), cy - r * 0.0625 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))); }
      return p; },
    star(r1, r2, n = 5) { const p = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? r2 : r1; p.push(Math.cos(a) * r, Math.sin(a) * r); } return resample(p); },
  };
  VG.G = G;
  VG.revPts = (p) => { const o = []; for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1]); return o; };
  // Cached hand-cut shape. fn() returns a point list, or a list of lists for compound shapes
  // (reverse inner lists with VG.revPts to cut holes).
  VG.S = (key, fn, amp = 1.1) => {
    let p = shapeCache.get(key);
    if (p) return p;
    const r = fn(), seed = strSeed(key), lists = Array.isArray(r[0]) ? r : [r];
    p = new Path2D();
    lists.forEach((l, i) => toPath(wobble(resample(l, 3), amp, seed + i * 31), p));
    shapeCache.set(key, p);
    return p;
  };

  // ---------- stop-motion jitter ----------
  // Every photographed frame the animator re-places the pieces: tiny offsets that change on twos.
  VG.jit = (id, amp = 1) => { const f = VG.frame, s = typeof id === 'string' ? strSeed(id) : id;
    return { x: (hash(s, f, 1) - 0.5) * 1.3 * amp, y: (hash(s, f, 2) - 0.5) * 1.3 * amp, r: (hash(s, f, 3) - 0.5) * 0.006 * amp }; };
  VG.applyJit = (ctx, id, amp = 1) => { if (!amp) return; const j = VG.jit(id, amp); ctx.translate(j.x, j.y); ctx.rotate(j.r); };

  // ---------- drawing cut paper ----------
  // depth: how far a piece floats above what lies behind it (size of the cast shadow)
  VG.light = { dx: 0.55, dy: 1.0, col: 'rgba(52,32,18,0.34)' };
  VG.piece = (ctx, path, color, depth = 1, opt = {}) => {
    const s = VG.scaleOf(ctx);
    ctx.save();
    if (depth > 0) {
      ctx.shadowColor = opt.shadow || VG.light.col;
      ctx.shadowBlur = (2.5 + depth * 4.5) * s;
      ctx.shadowOffsetX = depth * 2.6 * s * VG.light.dx;
      ctx.shadowOffsetY = depth * 2.6 * s * VG.light.dy;
    }
    ctx.fillStyle = opt.flat ? color : VG.paper(color, opt.soft);
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    ctx.fill(path);
    ctx.restore();
    if (opt.edge !== false) {
      ctx.save();
      ctx.strokeStyle = opt.edgeCol || 'rgba(255,248,235,0.30)';
      ctx.lineWidth = opt.edgeW || 1.1;
      if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
      ctx.stroke(path);
      ctx.restore();
    }
  };
  // ink printed onto the page: no shadow
  VG.print = (ctx, path, color, alpha = 1) => { ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = VG.paper(color, true); ctx.fill(path); ctx.restore(); };
  VG.glow = (ctx, path, color, blur, alpha = 1, fill = null) => {
    const s = VG.scaleOf(ctx);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha;
    ctx.shadowColor = color; ctx.shadowBlur = blur * s; ctx.fillStyle = fill || color;
    ctx.fill(path); ctx.restore();
  };
  VG.glowDot = (ctx, x, y, r, color, alpha = 1) => {
    if (alpha <= 0.002 || r <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(0.25, VG.rgbaStr(color, 0.55)); g.addColorStop(1, VG.rgbaStr(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };

  // ---------- pop-ups ----------
  // k: 0 (folded flat) .. 1 (standing); easeOutBack gives the springy card overshoot.
  VG.popK = (t, at, dur = 0.42) => (t < at ? 0 : ease.back(win(t, at, dur), 2.4));
  // draws fn with its base anchored at (x, y), rising from the page like a hinged card
  VG.pop = (ctx, x, y, k, fn, id) => {
    if (k <= 0.001) return;
    ctx.save(); ctx.translate(x, y);
    if (id) VG.applyJit(ctx, id, 0.6);
    ctx.transform(1, 0, (1 - Math.min(1, k)) * 0.25, 1, 0, 0);
    ctx.scale(1, k);
    fn(ctx); ctx.restore();
  };

  // ---------- text ----------
  VG.text = (ctx, str, x, y, font, color, opt = {}) => {
    ctx.save(); ctx.font = font; ctx.textAlign = opt.align || 'center'; ctx.textBaseline = opt.base || 'alphabetic';
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (opt.shadow) { const s = VG.scaleOf(ctx); ctx.shadowColor = opt.shadow; ctx.shadowBlur = (opt.blur || 4) * s; ctx.shadowOffsetX = 1.5 * s; ctx.shadowOffsetY = 2.5 * s; }
    if (opt.spacing) ctx.letterSpacing = opt.spacing + 'px';
    if (opt.stroke) { ctx.lineWidth = opt.strokeW || 4; ctx.strokeStyle = opt.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = opt.paper ? VG.paper(color, true) : color;
    ctx.fillText(str, x, y); ctx.restore();
  };
  // words that appear one after another (e.g. synced to narration); words: [[text, appearTime], ...]
  VG.revealLine = (ctx, words, t, x, y, font, color, opt = {}) => {
    ctx.save(); ctx.font = font; ctx.textAlign = 'left';
    const sp = ctx.measureText(' ').width, total = words.reduce((a, w) => a + ctx.measureText(w[0]).width, 0) + sp * (words.length - 1);
    let cx = opt.align === 'left' ? x : x - total / 2;
    for (const [w, at] of words) {
      const a = win(t, at, opt.fade || 0.2);
      if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = VG.paper(color, true); ctx.fillText(w, cx, y); }
      cx += ctx.measureText(w).width + sp;
    }
    ctx.restore();
  };
})();
