// Paper style, part 2: a library of reusable cut-paper scenery and props.
// All functions draw in content coordinates; `k` is a pop-up factor (0 = folded, 1 = standing),
// `id` seeds the stop-motion jitter, `t` is scene-local time in seconds.
(function () {
  const VG = window.VG, { S, G, piece, clamp, lerp, win } = VG;

  // ---------- skies & landscape ----------
  VG.sky = (ctx, x0, x1, y0, y1, stops) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  // stepped sky gradient crossfade, e.g. sunset -> night
  VG.skyBlend = (ctx, x0, x1, y0, y1, a, b, k) => { VG.sky(ctx, x0, x1, y0, y1, a); if (k > 0) { ctx.save(); ctx.globalAlpha = k; VG.sky(ctx, x0, x1, y0, y1, b); ctx.restore(); } };
  // triangular paper mountain range; peaks [[x, y], ...], valleys generated between them
  VG.range = (key, peaks, base, amp = 1.2) => S(key, () => {
    const p = [peaks[0][0] - 80, base];
    for (let i = 0; i < peaks.length; i++) {
      const [x, y] = peaks[i]; p.push(x, y);
      if (i < peaks.length - 1) { const [nx, ny] = peaks[i + 1]; p.push((x + nx) / 2, Math.max(y, ny) + Math.abs(nx - x) * 0.35); }
    }
    p.push(peaks[peaks.length - 1][0] + 80, base);
    return G.poly(p);
  }, amp);
  VG.snowCap = (key, x, y, w) => S(key, () => G.poly([x - w, y + w * 0.9, x - w * 0.45, y + w * 0.62, x - w * 0.15, y + w * 0.95, x + w * 0.2, y + w * 0.6, x + w * 0.55, y + w * 0.92, x + w * 0.62, y + w * 0.62, x, y]), 0.6);
  // rolling hill band: top edge through control points, filled down to `base`
  VG.hill = (key, pts, base) => S(key, () => G.blob([pts[0], base, ...pts, pts[pts.length - 2], base], 10), 1.2);
  // blocky city silhouette between x0..x1 standing on `base`
  VG.skyline = (key, x0, x1, base, seed = 1, hmin = 60, hmax = 230, wmin = 40, wmax = 110) => S(key, () => {
    const p = [x0, base + 200], R = VG.rng(seed);
    for (let x = x0; x < x1;) { const w = wmin + R() * (wmax - wmin), h = hmin + R() * (hmax - hmin); p.push(x, base - h, Math.min(x1, x + w), base - h); x += w; }
    p.push(x1, base + 200); return G.poly(p);
  }, 0.5);

  // ---------- plants ----------
  VG.pine = (ctx, x, y, h, col, k, id) => VG.pop(ctx, x, y, k, (c) => {
    piece(c, S('pineTrunk', () => G.rrect(-6, -24, 12, 26, 2)), '#6b4a34', 0.8);
    const tier = S('pineTier', () => G.poly([-44, 0, 0, -64, 44, 0]), 0.8);
    for (let i = 0; i < 3; i++) { c.save(); c.translate(0, -18 - i * 34); c.scale(1 - i * 0.2, 1); c.scale(h / 120, h / 120); piece(c, tier, VG.shade(col, i * 0.06), 1); c.restore(); }
  }, id);
  VG.roundTree = (ctx, x, y, h, col, k, id) => VG.pop(ctx, x, y, k, (c) => {
    c.save(); c.scale(h / 150, h / 150);
    piece(c, S('rtTrunk', () => G.poly([-9, 0, -6, -70, 6, -70, 9, 0])), '#6a4a36', 0.8);
    piece(c, S('rtCrown', () => G.blob([0, -150, 42, -132, 56, -95, 40, -60, 0, -52, -40, -60, -56, -95, -42, -132])), col, 1.2);
    c.globalAlpha = 0.35; piece(c, S('rtHi', () => G.blob([-10, -138, 16, -130, 20, -110, 0, -100, -24, -112])), VG.shade(col, 0.25), 0, { edge: false });
    c.restore();
  }, id);
  VG.flower = (ctx, x, y, col, k, id) => VG.pop(ctx, x, y, k, (c) => {
    c.strokeStyle = '#4f7a4a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke();
    for (let j = 0; j < 5; j++) { c.save(); c.translate(0, -38); c.rotate((j * Math.PI * 2) / 5); piece(c, S('petal', () => G.ellipse(0, -8, 5, 8)), col, 0.5); c.restore(); }
    piece(c, S('flowerC', () => G.ellipse(0, -38, 4, 4)), '#e7a33a', 0.3);
  }, id);
  VG.mushroom = (ctx, x, y, s, k, id, t) => VG.pop(ctx, x, y, k, (c) => {
    c.scale(s, s);
    piece(c, S('mStem', () => G.svg('M -9,0 C -11,-20 -8,-34 -6,-40 L 6,-40 C 8,-34 11,-20 9,0 Z')), '#f3e7d2', 0.8);
    piece(c, S('mCap', () => G.svg('M -34,-36 C -32,-66 32,-66 34,-36 Q 0,-30 -34,-36 Z')), '#d9534f', 1);
    c.fillStyle = VG.paper('#fbf2e6', true);
    for (const [dx, dy, r] of [[-16, -48, 5], [4, -56, 6], [20, -44, 4], [-4, -42, 3]]) { c.beginPath(); c.arc(dx, dy, r, 0, 7); c.fill(); }
    VG.glowDot(c, 0, -46, 60, 'rgba(255,150,120,1)', 0.25 + 0.1 * Math.sin(t * 3 + x));
  }, id);

  // ---------- sky objects ----------
  VG.cloud = (ctx, x, y, s, k, id, col = '#fbf7ef') => VG.pop(ctx, x, y, k, (c) => {
    c.scale(s, s);
    piece(c, S('cloud', () => G.blob([-70, 0, -64, -22, -38, -34, -14, -56, 18, -52, 36, -32, 62, -30, 76, -8, 66, 4])), col, 1.3);
  }, id);
  VG.sun = (ctx, x, y, r, t, k, col = '#f6c64a', rays = true) => VG.pop(ctx, x, y + r, k, (c) => {
    c.translate(0, -r);
    if (rays) {
      const ray = S('sunRay', () => G.poly([-9, 0, 0, -30, 9, 0]), 0.5), rot = Math.floor(t * 3) * 0.05;
      for (let i = 0; i < 12; i++) { c.save(); c.rotate(rot + (i * Math.PI) / 6); c.translate(0, -r - 4); piece(c, ray, '#f4ab3c', 0.7); c.restore(); }
    }
    c.save(); c.scale(r / 60, r / 60); piece(c, S('sunDisc', () => G.ellipse(0, 0, 60, 60)), col, 1.2); c.restore();
  });
  VG.moon = (ctx, x, y, r, k, id, col = '#f6e2a0', glow = 0.3) => {
    if (k <= 0) return;
    if (glow) VG.glowDot(ctx, x, y, r * 2.6, 'rgba(255,240,190,1)', glow * Math.min(1, k));
    VG.pop(ctx, x, y + r, k, (c) => { c.translate(0, -r); c.rotate(-0.3); c.scale(r / 60, r / 60); piece(c, S('moon', () => G.crescent(60, 26, -17, 52), 0.6), col, 1.2); }, id);
  };
  VG.star = (ctx, x, y, s, col = '#fbe7a6', depth = 0.4) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); piece(ctx, S('star5', () => G.star(26, 11), 0.5), col, depth); ctx.restore(); };
  VG.twinkle = (ctx, x, y, s, t, i, k = 1) => { const tw = 0.75 + 0.25 * Math.sin(t * 5 + i * 1.9); VG.glowDot(ctx, x, y, 44 * s, 'rgba(255,240,200,1)', 0.6 * k * tw); VG.star(ctx, x, y, 0.42 * s * k * tw); };
  VG.heart = (ctx, x, y, r, col = '#d8414e', depth = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(r / 10, r / 10); piece(ctx, S('heart', () => G.heart(0, 0, 10), 0.35), col, depth); ctx.restore(); };
  // a star field that pops in star by star between t0 and t0+span
  VG.starField = (ctx, key, rect, n, t, t0, span, fold = 1) => {
    const R = VG.rng(VG.strSeed(key));
    for (let i = 0; i < n; i++) {
      const x = rect[0] + R() * rect[2], y = rect[1] + R() * rect[3], s = 0.4 + R() * 0.6, at = t0 + R() * span;
      const k = VG.popK(t, at, 0.3) * fold; if (k > 0) VG.twinkle(ctx, x, y, s, t, i, k);
    }
  };
  VG.shootingStar = (ctx, t, t0, from, to, dur = 0.6) => {
    const p = win(t, t0, dur); if (p <= 0 || p >= 1) return;
    const x = lerp(from[0], to[0], p), y = lerp(from[1], to[1], p), dx = (to[0] - from[0]) * 0.3, dy = (to[1] - from[1]) * 0.3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(x - dx, y - dy, x, y); g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(1, 'rgba(255,245,220,0.9)');
    ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
    VG.glowDot(ctx, x, y, 20, 'rgba(255,250,230,1)', 1 - p);
  };
  // stars that form a shape (e.g. heart constellation) and get joined by a dotted gold thread
  VG.constellation = (ctx, pts, t, tPop, tLine, fold = 1) => {
    pts.forEach(([x, y], i) => { const k = VG.popK(t, tPop + i * 0.07, 0.3) * fold; if (k > 0) { VG.glowDot(ctx, x, y, 30, 'rgba(255,230,170,1)', 0.7 * k); VG.star(ctx, x, y, 0.5 * k, '#ffe9a8'); } });
    const line = win(t, tLine, 1.2) * fold; if (line <= 0) return;
    ctx.save(); ctx.strokeStyle = 'rgba(255,225,150,0.9)'; ctx.lineWidth = 2.4; ctx.shadowColor = 'rgba(255,210,120,1)'; ctx.shadowBlur = 10 * VG.scaleOf(ctx);
    ctx.setLineDash([2, 8]); ctx.lineCap = 'round';
    const segs = pts.length * line; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= Math.ceil(segs); i++) { const a = pts[(i - 1) % pts.length], b = pts[i % pts.length], f = Math.min(1, segs - (i - 1)); ctx.lineTo(lerp(a[0], b[0], f), lerp(a[1], b[1], f)); }
    ctx.stroke(); ctx.restore();
  };
  VG.heartPoints = (cx, cy, size, n = 10) => { const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 1e-4;
    o.push([cx + 16 * Math.pow(Math.sin(a), 3) * size / 16, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * size / 16]); } return o; };

  // ---------- end sticker (heart / star) that pops with a sparkle and a little heartbeat ----------
  VG.drawSticker = (ctx, kind, x, y, lt, scale = 1) => {
    const k = VG.popK(lt, 0, 0.5); if (k <= 0) return;
    VG.sparkBurst(ctx, x, y, win(lt, 0.05, 1.3), 14, 150 * scale);
    VG.glowDot(ctx, x, y, 190 * scale, kind === 'heart' ? 'rgba(255,120,120,1)' : 'rgba(255,220,140,1)', 0.35 * k);
    const beat = 1 + 0.06 * Math.max(0, Math.sin((lt - 0.8) * 5.2)) * win(lt, 0.8, 0.1);
    ctx.save(); ctx.translate(x, y + 50 * scale); VG.applyJit(ctx, 'sticker', 0.8); ctx.scale(k * beat * scale, k * beat * scale); ctx.translate(0, -50);
    if (kind === 'heart') {
      VG.heart(ctx, 0, 0, 68, '#d8414e', 2.5);
      ctx.strokeStyle = 'rgba(120,20,30,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, 60); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(-30, -28, 16, 10, -0.6, 0, 7); ctx.fill();
    } else VG.star(ctx, 0, 0, 3.2, '#f2c14e', 2.5);
    ctx.restore();
  };

  // ---------- magic & particles ----------
  VG.fireflies = (ctx, key, rect, n, t, k = 1, col = 'rgba(255,228,140,1)', r = 11) => {
    if (k <= 0) return; const R = VG.rng(VG.strSeed(key));
    for (let i = 0; i < n; i++) { const bx = rect[0] + R() * rect[2], by = rect[1] + R() * rect[3], ph = R() * 6;
      VG.glowDot(ctx, bx + Math.sin(t * 1.3 + ph) * 30, by + Math.cos(t * 1.1 + ph * 1.3) * 22, r, col, (0.55 + 0.45 * Math.sin(t * 5 + ph * 2)) * Math.min(1, k)); }
  };
  VG.sparkBurst = (ctx, x, y, p, n = 12, radius = 150, col = 'rgba(255,225,150,1)') => {
    if (p <= 0 || p >= 1) return;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3, r = 30 + p * radius; VG.glowDot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 14 * (1 - p) + 3, col, 1 - p); }
  };
  // glowing monospace glyph (code magic, runes, letters)
  VG.glyph = (ctx, ch, x, y, size, alpha, col = '#7fe8ff') => {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.font = `700 ${size}px "JetBrains Mono"`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = col; ctx.shadowBlur = size * 0.6 * VG.scaleOf(ctx); ctx.fillStyle = col; ctx.fillText(ch, x, y);
    ctx.shadowBlur = 0; ctx.fillStyle = '#f2fdff'; ctx.fillText(ch, x, y);
    ctx.restore();
  };
  // hanging decoration on a thread from topY, swinging gently
  VG.hang = (ctx, x, topY, len, k, t, fn, id, phase = 0) => {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, topY); ctx.rotate(Math.sin(t * 1.6 + phase) * 0.05 * k);
    ctx.strokeStyle = 'rgba(90,70,50,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len * k); ctx.stroke();
    ctx.translate(0, len * k); ctx.scale(k, k); VG.applyJit(ctx, id, 0.5); fn(ctx); ctx.restore();
  };

  // ---------- labels ----------
  VG.banner = (ctx, x, y, text, k, id, opt = {}) => VG.pop(ctx, x, y + 30, k, (c) => {
    c.translate(0, -30);
    const w = opt.width || 208, col = opt.color || '#c24b4f';
    const tail = S('bnTail', () => G.poly([-20, -20, 34, -20, 34, 20, -20, 20, -2, 0]));
    c.save(); c.translate(-w / 2 - 14, 10); piece(c, tail, col, 1); c.restore();
    c.save(); c.translate(w / 2 + 14, 10); c.scale(-1, 1); piece(c, tail, col, 1); c.restore();
    piece(c, S('bnBody' + w, () => G.rrect(-w / 2, -28, w, 56, 4)), '#fbf1dc', 1.4);
    c.strokeStyle = VG.rgba(col, 0.7); c.lineWidth = 2; c.setLineDash([5, 4]); c.strokeRect(-w / 2 + 8, -21, w - 16, 42); c.setLineDash([]);
    VG.text(c, text, 0, 14, opt.font || '44px "Berkshire Swash"', opt.ink || '#8e2f36');
  }, id);

  // ---------- paper typography ----------
  // Headline made of individually cut paper letters that pop in one after another.
  // opt: { font, colors: [..], k0 (appear time), stagger, fold, t, id, depth, align }
  VG.cutoutText = (ctx, str, x, y, size, opt = {}) => {
    const font = opt.font || `700 ${size}px "Fredoka"`, cols = opt.colors || ['#e0565f', '#f2c14e', '#3d8fb0', '#6aa84f', '#b875d1'];
    const t = opt.t ?? VG.time, fold = opt.fold ?? 1, s = VG.scaleOf(ctx);
    ctx.save(); ctx.font = font;
    const widths = [...str].map((c) => ctx.measureText(c).width + size * 0.06), total = widths.reduce((a, b) => a + b, 0);
    let cx = opt.align === 'left' ? x : x - total / 2;
    [...str].forEach((ch, i) => {
      const w = widths[i], k = VG.popK(t, (opt.k0 ?? 0) + i * (opt.stagger ?? 0.05), 0.35) * fold;
      if (ch !== ' ' && k > 0) {
        const id = (opt.id || str) + i, j = VG.jit(id, 1.2), rot = (VG.hash(VG.strSeed(id), 9) - 0.5) * 0.16;
        ctx.save(); ctx.translate(cx + w / 2 + j.x, y + j.y); ctx.rotate(rot + j.r * 3); ctx.scale(k, k);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = VG.light.col; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 2.5 * s; ctx.shadowOffsetY = 4.5 * s;
        ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = VG.paper('#fbf6ea', true); ctx.strokeText(ch, 0, 0);
        ctx.shadowColor = 'transparent'; ctx.fillStyle = VG.paper(cols[i % cols.length]); ctx.fillText(ch, 0, 0);
        ctx.restore();
      }
      cx += w;
    });
    ctx.restore();
  };
  // Paper note with washi tape and (multi-line) handwritten or printed text.
  VG.paperNote = (ctx, x, y, w, h, lines, opt = {}) => VG.pop(ctx, x, y + h / 2, opt.k ?? 1, (c) => {
    c.translate(0, -h / 2); c.rotate(opt.rot ?? -0.03);
    VG.piece(c, S(`note${w}x${h}`, () => G.rrect(-w / 2, -h / 2, w, h, 6)), opt.color || '#fbf3df', 1.4);
    c.save(); c.globalAlpha = 0.72;
    for (const [tx, ty, r] of [[-w / 2 + 10, -h / 2 + 4, -0.6], [w / 2 - 10, h / 2 - 4, -0.6]]) { c.save(); c.translate(tx, ty); c.rotate(r); VG.piece(c, S('tape', () => G.rrect(-44, -13, 88, 26, 1)), opt.tape || '#e9a3a8', 0.3, { edge: false }); c.restore(); }
    c.restore();
    const size = opt.size || 44, lh = size * 1.2, y0 = -((lines.length - 1) * lh) / 2 + size * 0.35;
    lines.forEach((l, i) => VG.text(c, l, 0, y0 + i * lh, opt.font || `600 ${size}px Caveat`, opt.ink || '#3b2a1c'));
  }, opt.id || 'note' + w);

  // ---------- water ----------
  // layered paper waves; `between(i)` is called before layer i is drawn (to tuck boats between waves)
  VG.waves = (ctx, key, t, x0, x1, tops, colors, k = (i) => 1, between = null) => {
    tops.forEach((y, i) => {
      if (between) between(i);
      const path = S(key + i, () => { const p = [], per = 92, amp = 15;
        for (let x = x0 - 60; x <= x1 + 60; x += 6) { const u = ((x - x0 + i * 37 + 6000) % per) / per; p.push(x, -amp * Math.sin(u * Math.PI) ** 0.8); }
        p.push(x1 + 60, 900, x0 - 60, 900); return p; }, 0.7);
      const sx = Math.sin(t * 1.9 + i * 1.3) * 16, sy = Math.sin(t * 2.3 + i) * 4;
      VG.pop(ctx, sx, y + sy, k(i), (c) => {
        c.save(); c.translate(0, -5); piece(c, path, '#f7fbff', 0.6, { edge: false }); c.restore();
        piece(c, path, colors[i % colors.length], 1.4);
      }, key + i);
    });
    if (between) between(tops.length);
  };
  VG.paperBoat = (ctx, t, inner, sail = '#e0565f') => {
    const hull = S('boatHull', () => G.poly([-128, -44, 128, -44, 84, 12, -84, 12]), 0.6);
    piece(ctx, S('boatPeak', () => G.poly([-44, -44, 22, -150, 88, -44]), 0.6), '#f3ecdd', 1.4);
    ctx.strokeStyle = 'rgba(120,100,70,0.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(22, -150); ctx.lineTo(22, -44); ctx.stroke();
    ctx.strokeStyle = '#7a5b3e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(22, -148); ctx.lineTo(22, -196); ctx.stroke();
    ctx.save(); ctx.translate(22, -196); ctx.scale(1 + 0.12 * Math.sin(t * 9), 1); piece(ctx, S('flag', () => G.poly([0, 0, 40, 9, 0, 20])), sail, 0.6); ctx.restore();
    if (inner) inner(ctx);
    piece(ctx, hull, '#fbf7ee', 1.6);
    ctx.fillStyle = 'rgba(160,140,110,0.18)'; ctx.beginPath(); ctx.moveTo(-128, -44); ctx.lineTo(-84, 12); ctx.lineTo(-40, -44); ctx.fill();
    ctx.beginPath(); ctx.moveTo(128, -44); ctx.lineTo(84, 12); ctx.lineTo(40, -44); ctx.fill();
  };
  VG.fish = (ctx, x, y, rot, col = '#f2994a') => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    piece(ctx, S('fish', () => G.svg('M -26,0 C -14,-14 12,-14 22,0 C 12,14 -14,14 -26,0 Z')), col, 1);
    piece(ctx, S('fishTail', () => G.poly([-22, 0, -40, -12, -38, 12])), VG.shade(col, -0.1), 0.6);
    ctx.fillStyle = '#2a1b14'; ctx.beginPath(); ctx.arc(12, -3, 2.4, 0, 7); ctx.fill(); ctx.restore();
  };

  // ---------- animals ----------
  VG.bird = (ctx, x, y, t, s = 1, col = '#fbfaf5') => { // seagull silhouette, flapping
    const fl = Math.sin(t * 11) * 0.5;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    for (const d of [-1, 1]) { ctx.save(); ctx.scale(d, 1); ctx.rotate(-fl); piece(ctx, S('gullW', () => G.svg('M 0,0 C 10,-14 26,-16 40,-6 C 28,-8 16,-4 0,4 Z')), col, 0.7); ctx.restore(); }
    ctx.restore();
  };
  VG.pigeon = (ctx, x, y, t, flying = 0, id = 'pig') => {
    ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); VG.applyJit(ctx, id, 0.7);
    piece(ctx, S('pigBody', () => G.svg('M -26,-8 C -20,-26 12,-28 22,-14 L 36,-6 C 20,0 0,4 -26,-8 Z')), '#8f93a3', 1);
    piece(ctx, S('pigHead', () => G.ellipse(20, -24, 10, 9)), '#7a7f92', 0.8);
    ctx.fillStyle = '#e8a33a'; ctx.beginPath(); ctx.moveTo(29, -24); ctx.lineTo(36, -21); ctx.lineTo(29, -19); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(22, -26, 1.8, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(-2, -16); ctx.rotate(-0.3 + (flying ? Math.sin(t * 24) * 0.8 : 0)); piece(ctx, S('pigWing', () => G.svg('M 0,0 C -12,-18 -30,-16 -38,-2 C -24,-4 -12,2 0,0 Z')), '#a6aab8', 0.7); ctx.restore();
    ctx.restore();
  };

  // ---------- city ----------
  // deterministic row of houses between x0..x1 standing on `base`
  VG.houses = (x0, x1, base, seed, cols = ['#d49a82', '#c58a86', '#e0b08e', '#b88a9c', '#cf9f7a', '#c9967f'], hmin = 170, hmax = 400) => {
    const R = VG.rng(seed), out = []; let x = x0;
    while (x < x1) { const w = 90 + R() * 70, h = hmin + R() * (hmax - hmin); out.push({ x, w: Math.min(w, x1 - x), h, base, c: cols[(R() * cols.length) | 0], roof: R() < 0.5 ? 'gable' : 'flat', seed: (R() * 1e6) | 0 }); x += w - 6; }
    return out;
  };
  VG.house = (ctx, b, lit, key, tint = null) => {
    const top = b.base - b.h;
    const body = S(key, () => b.roof === 'gable' ? G.poly([b.x, b.base, b.x, top + 30, b.x + b.w / 2, top - 26, b.x + b.w, top + 30, b.x + b.w, b.base]) : G.poly([b.x, b.base, b.x, top, b.x + b.w, top, b.x + b.w, b.base]));
    piece(ctx, body, tint ? VG.mix(b.c, tint[0], tint[1]) : b.c, 1.8);
    const R = VG.rng(b.seed);
    for (let wy = top + 50; wy < b.base - 40; wy += 46) for (let wx = b.x + 16; wx < b.x + b.w - 26; wx += 30) {
      ctx.fillStyle = R() < lit ? '#ffe3a1' : 'rgba(80,60,90,0.55)'; ctx.fillRect(wx, wy, 14, 20);
    }
  };
  VG.lampPost = (ctx, x, base, h, on, k, id) => {
    VG.pop(ctx, x, base, k, (c) => {
      piece(c, S('pole' + h, () => G.rrect(-6, -h, 12, h, 4)), '#56535f', 1.5);
      piece(c, S('lampArm', () => G.poly([0, 0, -70, 0, -70, 10, 0, 10])), '#56535f', 1);
      c.save(); c.translate(0, -h); piece(c, S('lampArm', () => G.poly([0, 0, -70, 0, -70, 10, 0, 10])), '#56535f', 1);
      piece(c, S('lampHead', () => G.poly([-100, 10, -40, 10, -52, 30, -88, 30])), '#46434f', 1); c.restore();
    }, id);
    if (on > 0 && k > 0.5) {
      VG.glowDot(ctx, x - 70, base - h + 26, 70, 'rgba(255,225,160,1)', 0.9 * on);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16 * on;
      const cg = ctx.createLinearGradient(0, base - h + 30, 0, base); cg.addColorStop(0, 'rgba(255,220,150,1)'); cg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(x - 92, base - h + 30); ctx.lineTo(x - 48, base - h + 30); ctx.lineTo(x + 120, base + 40); ctx.lineTo(x - 340, base + 40); ctx.fill(); ctx.restore();
    }
  };

  // ---------- small props ----------
  // laptop seen from behind (lid towards the viewer) with a glowing screen
  VG.laptop = (ctx, open, glow, sticker = '</>') => {
    ctx.save();
    if (glow > 0) VG.glowDot(ctx, 0, -38, 70, 'rgba(120,230,255,1)', 0.55 * glow);
    piece(ctx, S('lapBase', () => G.rrect(-33, -3, 66, 7, 3)), '#aeb4bd', 0.6);
    ctx.save(); ctx.scale(1, Math.max(0.05, open));
    piece(ctx, S('lapLid', () => G.rrect(-30, -40, 60, 40, 4)), '#c9ced6', 0.8);
    ctx.font = 'bold 15px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#2f8f8b'; ctx.fillText(sticker, -6, -15);
    VG.heart(ctx, 16, -26, 5, '#e05a64', 0.2);
    ctx.restore(); ctx.restore();
  };

  // ---------- paths ----------
  // smooth path through control points, measured for "travel along" + dotted reveal
  VG.trail = (key, cps) => {
    VG._trails = VG._trails || {};
    if (VG._trails[key]) return VG._trails[key];
    const cp = []; for (let i = 0; i < cps.length; i += 2) cp.push([cps[i], cps[i + 1]]);
    const pts = [];
    for (let i = 0; i < cp.length - 1; i++) {
      const p0 = cp[Math.max(0, i - 1)], p1 = cp[i], p2 = cp[i + 1], p3 = cp[Math.min(cp.length - 1, i + 2)];
      for (let s = 0; s < 20; s++) { const u = s / 20, u2 = u * u, u3 = u2 * u;
        pts.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); }
    }
    pts.push(cp[cp.length - 1]);
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tr = { pts, len, total: len[len.length - 1],
      at(s) { let i = 1; while (i < len.length - 1 && len[i] < s) i++; const a = pts[i - 1], b = pts[i], u = (s - len[i - 1]) / (len[i] - len[i - 1] || 1); return [lerp(a[0], b[0], clamp(u)), lerp(a[1], b[1], clamp(u))]; },
      dots(ctx, upTo, col = '#c8303e', gap = 19) {
        ctx.save(); ctx.fillStyle = col; ctx.shadowColor = 'rgba(60,10,10,0.35)'; ctx.shadowBlur = 3 * VG.scaleOf(ctx); ctx.shadowOffsetY = 2 * VG.scaleOf(ctx);
        for (let d = 0; d < upTo - 14; d += gap) { const [x, y] = this.at(d); ctx.beginPath(); ctx.ellipse(x, y, 5, 4, 0, 0, 7); ctx.fill(); }
        ctx.restore(); } };
    VG._trails[key] = tr; return tr;
  };
})();
