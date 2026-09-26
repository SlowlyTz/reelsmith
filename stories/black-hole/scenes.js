// How a Black Hole Is Born – a paper diorama of space.
// Content coordinates: stage = full frame, origin in the centre, y down (st.L.w × st.L.h).
// Everything here is local to this video: paper star, supergiant, confetti supernova,
// accretion disk, bending light rays, labels. Deterministic (VG.rng / VG.hash only).
(function () {
  const VG = window.VG, { lerp, ease, win, clamp } = VG;
  const TAU = Math.PI * 2, H = VG.hash;
  const SHD = 'rgba(0,0,14,0.62)';            // cast shadow on dark paper
  const INK = '#271d38';

  // ------------------------------------------------------------------ timing helpers
  // scene-local time of the nth word of a line that starts with `pre` (works before voice exists)
  const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  function W(id, pre, nth = 0, end = false) {
    const T = VG.T, l = T.lines[id], sc = T.scenes.find((s) => s.id === l.scene);
    let c = 0;
    for (const wd of l.words) if (norm(wd[0]).startsWith(pre.toLowerCase()) && c++ === nth) return wd[end ? 2 : 1] - sc.openAt;
    const text = VG.story.lines.find((x) => x.id === id).text.toLowerCase();
    let pos = -1; for (let i = 0; i <= nth; i++) pos = text.indexOf(pre.toLowerCase(), pos + 1);
    return l.start - sc.openAt + Math.max(0, pos) / 14 + (end ? 0.4 : 0);
  }
  const lineEnd = (id) => { const T = VG.T, l = T.lines[id], sc = T.scenes.find((s) => s.id === l.scene); return (l.speechEnd > l.start ? l.speechEnd : l.start + 3) - sc.openAt; };
  // the supernova goes off in the breath before "and the star explodes"
  const tExp = () => { const T = VG.T, l = T.lines.vo6, sc = T.scenes.find((s) => s.id === l.scene); return l.start - sc.openAt - 0.35; };
  const sceneDur = (id) => { const T = VG.T, s = T.scenes.find((x) => x.id === id); return s.exitAt - s.openAt; };
  const bump = (t, a, up, hold, down) => win(t, a, up) * (1 - win(t, a + up + hold, down));

  // camera shake inside the diorama (on twos, like a bumped table)
  function shake(st, t0, amp, dur) {
    const u = st.lt - t0; if (u < 0 || u > dur) return [0, 0];
    const d = Math.pow(1 - u / dur, 2.2) * amp, f = VG.frame;
    return [(H(f, 11) - 0.5) * 2 * d, (H(f, 12) - 0.5) * 2 * d];
  }

  // gravitational lens (point mass): pushes background points outwards around (lx, ly)
  function lens(x, y, L) {
    if (!L || L.E <= 0) return [x, y];
    const dx = x - L.x, dy = y - L.y, d = Math.hypot(dx, dy) || 1e-3, d2 = (d + Math.sqrt(d * d + 4 * L.E * L.E)) / 2;
    return [L.x + (dx * d2) / d, L.y + (dy * d2) / d];
  }

  // ------------------------------------------------------------------ backdrop
  const NEB = {
    a: [[-0.34, -0.3, 0.36, 0.22, '#6b3f93', 0.34], [0.3, 0.26, 0.4, 0.2, '#2f6d93', 0.3], [0.36, -0.34, 0.26, 0.16, '#a8457e', 0.24], [-0.3, 0.32, 0.3, 0.14, '#35509e', 0.26], [0.02, -0.02, 0.5, 0.32, '#3a2d74', 0.2]],
    b: [[-0.3, -0.26, 0.4, 0.2, '#8a3a5e', 0.32], [0.34, 0.2, 0.38, 0.22, '#5b3f9a', 0.3], [0.3, -0.36, 0.3, 0.14, '#2f6d93', 0.24], [-0.36, 0.3, 0.3, 0.16, '#6b3f93', 0.26], [0.0, 0.0, 0.52, 0.34, '#35295f', 0.22]],
    c: [[-0.36, -0.3, 0.34, 0.2, '#2f5d8a', 0.3], [0.34, 0.3, 0.34, 0.2, '#5b3f9a', 0.28], [0.38, -0.32, 0.26, 0.14, '#8a3a5e', 0.22], [-0.34, 0.34, 0.3, 0.14, '#2c4a7e', 0.26]],
  };
  function nebShape(key, rx, ry, seed) {
    return VG.S(key, () => { const R = VG.rng(seed), cp = []; const n = 11;
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R() * 0.3, f = 0.62 + R() * 0.46; cp.push(Math.cos(a) * rx * f, Math.sin(a) * ry * f); }
      return VG.G.blob(cp, 10); }, 3.2);
  }
  function backdrop(ctx, st, o = {}) {
    const { w, h } = st.L, t = st.lt, [sx, sy] = o.shake || [0, 0];
    ctx.save(); ctx.translate(sx * 0.5, sy * 0.5);
    const g = ctx.createRadialGradient(o.gx ?? 0, o.gy ?? -h * 0.08, 30, 0, 0, w * 0.78);
    g.addColorStop(0, o.core || '#2b2560'); g.addColorStop(0.45, '#181b44'); g.addColorStop(1, '#090b22');
    ctx.fillStyle = g; ctx.fillRect(-w, -h, w * 2, h * 2);
    // tissue-paper nebula: translucent torn layers, drifting slowly (far layer)
    const neb = NEB[o.neb || 'a'], drift = -t * 3;
    neb.forEach(([fx, fy, frx, fry, col, a], i) => {
      ctx.save(); ctx.translate(fx * w + drift * (1 + i * 0.3), fy * h);
      VG.piece(ctx, nebShape(`neb${o.neb || 'a'}${i}`, frx * w, fry * h, 40 + i * 7), col, 0.7, { alpha: a, shadow: 'rgba(0,0,10,0.4)', edgeCol: 'rgba(255,235,255,0.22)' });
      ctx.save(); ctx.scale(0.62, 0.55); ctx.rotate(0.4);
      VG.piece(ctx, nebShape(`nebi${o.neb || 'a'}${i}`, frx * w, fry * h, 90 + i * 5), VG.shade(col, 0.18), 0.5, { alpha: a * 0.8, shadow: 'rgba(0,0,10,0.3)', edgeCol: 'rgba(255,235,255,0.18)' });
      ctx.restore(); ctx.restore();
    });
    // printed pin-prick stars (bent by a lens if there is a black hole)
    const R = VG.rng(o.seed || 3);
    ctx.save();
    for (let i = 0; i < 300; i++) {
      let x = (R() - 0.5) * w * 1.08 + drift * 0.6, y = (R() - 0.5) * h * 1.08; const r = 0.8 + R() * R() * 2.6, a = 0.3 + R() * 0.6, tw = 0.75 + 0.25 * Math.sin(t * 2.2 + i);
      [x, y] = lens(x, y, o.lens);
      ctx.fillStyle = i % 7 ? `rgba(255,246,225,${a * tw})` : `rgba(190,215,255,${a * tw})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore(); ctx.restore();
  }

  // cut-paper stars in front of the backdrop (mid layer, parallax drift)
  function paperStars(ctx, st, key, n, t0, o = {}) {
    const { w, h } = st.L, t = st.lt, R = VG.rng(VG.strSeed(key)), cols = ['#fff3c4', '#ffe08a', '#d6e6ff', '#ffd6e4', '#fff9ea'];
    const [sx, sy] = o.shake || [0, 0];
    for (let i = 0; i < n; i++) {
      let x = (R() - 0.5) * w * 1.02 - t * 7 + sx * 0.8, y = (R() - 0.55) * h * 0.98 + sy * 0.8; const s = 0.22 + R() * R() * 0.5, at = t0 + R() * 0.7, kind = R() < 0.4, ph = R() * 6;
      [x, y] = lens(x, y, o.lens);
      if (o.avoid && Math.hypot(x - o.avoid[0], y - o.avoid[1]) < o.avoid[2]) continue;
      const k = st.pop(at, 0.35); if (k <= 0) continue;
      const tw = 0.8 + 0.2 * Math.sin(t * 3 + ph);
      VG.glowDot(ctx, x, y, 34 * s * 1.6, 'rgba(255,236,190,1)', 0.45 * k * tw);
      ctx.save(); ctx.translate(x, y); VG.applyJit(ctx, key + i, 0.6); ctx.rotate(ph); ctx.scale(k * s * tw, k * s * tw);
      VG.piece(ctx, kind ? VG.S('spark4', () => VG.G.star(30, 8, 4), 0.4) : VG.S('star5', () => VG.G.star(26, 11), 0.5), cols[i % cols.length], 0.6, { shadow: SHD });
      ctx.restore();
    }
  }

  // hanging paper star on a thread from the top edge of the diorama
  function hangStar(ctx, st, x, len, s, at, id, col = '#ffe08a') {
    const k = st.pop(at, 0.5); if (k <= 0) return;
    const top = -st.L.h / 2 - 4, t = st.lt, sw = Math.sin(t * 1.4 + x * 0.01) * 0.05 * k;
    ctx.save(); ctx.translate(x, top); ctx.rotate(sw);
    ctx.strokeStyle = 'rgba(230,220,200,0.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len * k); ctx.stroke();
    ctx.translate(0, len * k + 24 * s); VG.applyJit(ctx, id, 0.5);
    VG.glowDot(ctx, 0, 0, 70 * s, 'rgba(255,220,150,1)', 0.35 * k);
    ctx.rotate(Math.sin(t * 0.9 + x) * 0.25); ctx.scale(k * s, k * s);
    VG.piece(ctx, VG.S('star5', () => VG.G.star(26, 11), 0.5), col, 1.6, { shadow: SHD });
    ctx.restore();
  }

  // dark paper asteroid standing in the foreground (near layer)
  function rock(ctx, st, x, y, s, at, id, flip = 1) {
    VG.pop(ctx, x, y, st.pop(at, 0.5), (c) => {
      c.scale(s * flip, s);
      const body = VG.S('rock' + id, () => { const R = VG.rng(VG.strSeed(id)), cp = []; for (let i = 0; i < 12; i++) { const a = Math.PI + (i / 11) * Math.PI, f = 0.7 + R() * 0.4; cp.push(Math.cos(a) * 160 * f, Math.sin(a) * 120 * f + 20); } cp.push(170, 40, -170, 40); return VG.G.poly(cp); }, 2.2);
      VG.piece(c, body, '#3a3358', 2.6, { shadow: SHD });
      c.save(); c.clip(body); c.translate(-8, -8); c.globalAlpha = 0.7; VG.piece(c, body, '#6a5d8e', 0, { edge: false }); c.restore();
      c.save(); c.clip(body); c.translate(10, 10); VG.piece(c, body, '#3a3358', 0, { edge: false }); c.restore();
      // craters
      for (const [cx, cy, r] of [[-60, -40, 22], [30, -70, 14], [70, -20, 18], [-10, -10, 10]]) {
        c.save(); c.translate(cx, cy); VG.piece(c, VG.S('crater' + r, () => VG.G.ellipse(0, 0, r, r * 0.7), 0.8), '#282240', 0.3, { shadow: 'rgba(0,0,0,0)', edgeCol: 'rgba(255,220,190,0.3)' }); c.restore();
      }
    }, id);
  }

  // small ringed planet (mid layer)
  function planet(ctx, st, x, y, r, at, id, col = '#d98b5f', ring = '#f2d6a2') {
    const k = st.pop(at, 0.5); if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); VG.applyJit(ctx, id, 0.6); ctx.scale(k, k); ctx.rotate(-0.35);
    ctx.save(); ctx.scale(r / 100, r / 100);
    VG.piece(ctx, VG.S('ringBack', () => [...VG.G.ellipse(0, 0, 200, 46, Math.PI, TAU), ...VG.revPts(VG.G.ellipse(0, 0, 140, 28, Math.PI, TAU))], 0.6), VG.shade(ring, -0.15), 1, { shadow: SHD });
    const disc = VG.S('planet', () => VG.G.ellipse(0, 0, 100, 100), 1);
    VG.piece(ctx, disc, col, 1.4, { shadow: SHD });
    ctx.save(); ctx.clip(disc);
    for (const [yy, hh, cc] of [[-55, 18, 0.18], [-10, 26, -0.12], [40, 16, 0.12]]) VG.piece(ctx, VG.S('band' + yy, () => VG.G.rrect(-110, yy, 220, hh, 6), 1.6), VG.shade(col, cc), 0.4, { shadow: 'rgba(0,0,0,0.25)' });
    ctx.fillStyle = 'rgba(10,6,30,0.35)'; ctx.beginPath(); ctx.arc(40, 40, 110, 0, TAU); ctx.fill();
    ctx.restore();
    VG.piece(ctx, VG.S('ringFront', () => [...VG.G.ellipse(0, 0, 200, 46, 0, Math.PI), ...VG.revPts(VG.G.ellipse(0, 0, 140, 28, 0, Math.PI))], 0.6), ring, 1.2, { shadow: SHD });
    ctx.restore(); ctx.restore();
  }

  // ------------------------------------------------------------------ labels
  function tag(ctx, x, y, text, k, id, o = {}) {
    if (k <= 0.001) return;
    const size = o.size || 44, font = `700 ${size}px Fredoka`;
    ctx.save(); ctx.font = font; ctx.letterSpacing = '3px'; const tw = ctx.measureText(text).width; ctx.restore();
    const pw = Math.round(tw + size * 1.35), ph = Math.round(size * 1.5);
    if (o.to) { // thread to what the label names
      ctx.save(); ctx.globalAlpha = Math.min(1, k); ctx.strokeStyle = 'rgba(245,235,215,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(o.to[0], o.to[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#f5ebd7'; ctx.beginPath(); ctx.arc(o.to[0], o.to[1], 5, 0, TAU); ctx.fill(); ctx.restore();
    }
    VG.pop(ctx, x, y + ph / 2, k, (c) => {
      c.translate(0, -ph / 2); c.rotate(o.rot ?? -0.035);
      VG.piece(c, VG.S(`tag${pw}x${ph}`, () => VG.G.rrect(-pw / 2, -ph / 2, pw, ph, 9), 0.8), o.bg || '#fbf3df', 1.8, { shadow: SHD });
      c.save(); c.globalAlpha = 0.9; VG.piece(c, VG.S(`tagS${pw}x${ph}`, () => VG.G.rrect(-pw / 2 + 7, -ph / 2 + 7, 11, ph - 14, 3), 0.5), o.col || '#e8632f', 0.3, { edge: false, shadow: 'rgba(0,0,0,0.2)' }); c.restore();
      VG.text(c, text, 8, 2, font, o.ink || INK, { base: 'middle', spacing: 3 });
    }, id);
  }

  // ------------------------------------------------------------------ arrows (forces)
  const ARROW = () => VG.S('arrow', () => VG.G.poly([0, -10, 52, -10, 52, -27, 90, 0, 52, 27, 52, 10, 0, 10]), 0.7);
  // n arrows around (x, y): dir +1 = pointing outward from r0, -1 = pointing inward with the tip at r0
  function arrowRing(ctx, x, y, n, r0, s, dir, col, kf, id, rot0 = 0) {
    for (let i = 0; i < n; i++) {
      const k = kf(i); if (k <= 0.001) continue;
      const a = rot0 + (i / n) * TAU;
      ctx.save(); ctx.translate(x + Math.cos(a) * r0, y + Math.sin(a) * r0); ctx.rotate(a + (dir < 0 ? Math.PI : 0));
      VG.applyJit(ctx, id + i, 0.7);
      if (dir < 0) ctx.translate(-90 * s * k, 0);
      ctx.scale(s * k, s * Math.min(1, k));
      VG.piece(ctx, ARROW(), col, 1.6, { shadow: SHD, edgeCol: 'rgba(255,255,255,0.55)', edgeW: 1.6 });
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ the star
  const disc = () => VG.S('sdisc', () => VG.G.ellipse(0, 0, 100, 100), 1.5);
  const lumpy = (v) => VG.S('slump' + v, () => { const R = VG.rng(71 + v * 13), cp = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, f = 0.93 + R() * 0.12; cp.push(Math.cos(a) * 100 * f, Math.sin(a) * 100 * f); } return VG.G.blob(cp, 8); }, 2.2);
  // heat 1 = yellow-white main-sequence star, 0 = red supergiant; ls = layer scales [outer, mid, inner, core]
  function starBody(ctx, x, y, R, t, o = {}) {
    const heat = o.heat ?? 1, k = o.k ?? 1, ls = o.ls || [1, 1, 1, 1], boil = o.boil ?? (1 - heat);
    if (k <= 0.001 || R < 0.5) return;
    const pal = (hot, cool) => VG.mix(cool, hot, heat);
    const cFl = pal('#f7a63c', '#c7362a'), cOut = pal('#f59a33', '#b83229'), cMid = pal('#fbbf49', '#d8452f'), cIn = pal('#ffdf78', '#ec6a3d'), cCore = pal('#fff5cf', '#ffa665');
    const glow = o.glow ?? 1;
    VG.glowDot(ctx, x, y, R * 2.7 * k * ls[0], VG.rgba(pal('#ffbf5a', '#ff5436'), 1), 0.55 * glow);
    VG.glowDot(ctx, x, y, R * 1.5 * k * ls[0], VG.rgba(pal('#ffe7a8', '#ff8a52'), 1), 0.35 * glow);
    ctx.save(); ctx.translate(x, y); VG.applyJit(ctx, o.id || 'star', 0.5);
    const sc = (k * R) / 100; ctx.scale(sc, sc);
    // flame corona: paper tongues around the rim, re-cut every few frames
    const rot = t * 0.08, nf = 20;
    ctx.save(); ctx.scale(ls[0], ls[0]);
    for (let i = 0; i < nf; i++) {
      const a = rot + (i / nf) * TAU, L = 0.75 + 0.5 * H(i, VG.frame >> 1, 5) * (0.6 + 0.4 * glow);
      ctx.save(); ctx.rotate(a); ctx.translate(90, 0); ctx.scale(L * (1 + boil * 0.3), 1 + boil * 0.25);
      VG.piece(ctx, VG.S('flame' + (i % 3), () => VG.G.poly(i % 3 === 0 ? [0, -14, 36, -2, 30, 4, 0, 14] : i % 3 === 1 ? [0, -12, 28, 0, 0, 12] : [0, -15, 22, -6, 40, 2, 18, 6, 0, 15])), i % 2 ? cFl : VG.shade(cFl, 0.12), 0.9, { shadow: SHD });
      ctx.restore();
    }
    ctx.save(); ctx.rotate(-rot * 1.3); VG.piece(ctx, VG.S('srim', () => VG.G.star(107, 95, 24), 1.4), VG.shade(cOut, 0.08), 1.2, { shadow: SHD }); ctx.restore();
    VG.piece(ctx, boil > 0.35 ? lumpy(VG.frame % 3) : disc(), cOut, 1.5, { shadow: SHD });
    ctx.restore();
    // surface layers, each a smaller hand-cut disc (lit from the upper left)
    const layer = (s, off, col, key, depth) => { ctx.save(); ctx.translate(off, off); ctx.scale(s, s); VG.piece(ctx, boil > 0.35 ? lumpy((VG.frame + key) % 3) : VG.S('sl' + key, () => VG.G.ellipse(0, 0, 100, 100), 1.8), col, depth, { shadow: 'rgba(90,20,0,0.35)' }); ctx.restore(); };
    layer(0.8 * ls[1], -4, cMid, 1, 1);
    // granules / convection cells
    ctx.save(); ctx.scale(ls[1], ls[1]); ctx.rotate(t * 0.05);
    const cells = boil > 0.35 ? 9 : 6;
    for (let i = 0; i < cells; i++) { const a = (i / cells) * TAU + 0.4, rr = 50 + (i % 3) * 8; ctx.save(); ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr); ctx.rotate(a);
      VG.piece(ctx, VG.S('cell' + (i % 3), () => VG.G.blob([-16, 0, -6, -9, 12, -7, 17, 2, 4, 9, -10, 7], 6), 1.2), VG.shade(cMid, boil > 0.35 ? -0.18 : 0.1), 0.4, { alpha: 0.5, shadow: 'rgba(90,20,0,0.25)' }); ctx.restore(); }
    ctx.restore();
    layer(0.56 * ls[2], -7, cIn, 2, 0.9);
    layer(0.3 * ls[3], -9, cCore, 3, 0.7);
    ctx.restore();
    VG.glowDot(ctx, x - 9 * sc, y - 9 * sc, R * 0.45 * k * ls[3], 'rgba(255,250,225,1)', 0.35 * glow * heat + 0.1);
  }

  // fusion window: a round cut in the star showing atoms smashing together in the core
  function fusionCore(ctx, x, y, r, t, k) {
    if (k <= 0.001) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const hole = VG.S('fwin', () => VG.G.ellipse(0, 0, 100, 100), 1.2);
    ctx.save(); ctx.scale(r / 100, r / 100);
    VG.piece(ctx, VG.S('fwinRim', () => VG.G.ellipse(0, 0, 112, 112), 1.4), '#fff1c7', 1.2, { shadow: 'rgba(80,20,0,0.45)' });
    VG.piece(ctx, hole, '#8c2c16', 0, { edge: false });
    ctx.save(); ctx.clip(hole);
    // inner shadow of the cut
    const g = ctx.createRadialGradient(0, 0, 40, 0, 0, 104); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,5,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(-110, -110, 220, 220);
    // atoms: pairs fly together and fuse with a flash, cycle every 1.2 s
    for (let p = 0; p < 3; p++) {
      const per = 1.2, ph = t / per + p / 3, cyc = Math.floor(ph), u = ph - cyc, a = H(cyc, p, 3) * TAU, cx = (H(cyc, p, 4) - 0.5) * 60, cy = (H(cyc, p, 5) - 0.5) * 60;
      const d = 70 * (1 - ease.in(clamp(u / 0.55)));
      if (u < 0.55) for (const sgn of [-1, 1]) {
        const ax = cx + Math.cos(a) * d * sgn, ay = cy + Math.sin(a) * d * sgn;
        ctx.save(); ctx.translate(ax, ay); VG.piece(ctx, VG.S('atom', () => VG.G.ellipse(0, 0, 17, 17), 0.6), sgn > 0 ? '#fff4dc' : '#ffd0a0', 0.8, { shadow: 'rgba(40,5,0,0.5)' });
        ctx.fillStyle = 'rgba(160,60,20,0.5)'; ctx.beginPath(); ctx.arc(-4, -4, 4, 0, TAU); ctx.moveTo(9, 4); ctx.arc(5, 4, 4, 0, TAU); ctx.fill(); ctx.restore();
      } else {
        const f = (u - 0.55) / 0.45;
        VG.glowDot(ctx, cx, cy, 40 + 70 * f, 'rgba(255,245,200,1)', 1 - f);
        VG.sparkBurst(ctx, cx, cy, f * 0.95, 8, 70, 'rgba(255,240,190,1)');
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1 - f * 0.3, 1 - f * 0.3); VG.piece(ctx, VG.S('atom2', () => VG.G.ellipse(0, 0, 22, 22), 0.6), '#fffbe8', 0.8, { shadow: 'rgba(40,5,0,0.5)' }); ctx.restore();
      }
    }
    ctx.restore(); ctx.restore(); ctx.restore();
  }

  // ------------------------------------------------------------------ supernova pieces
  const CONF_COL = ['#fff4d6', '#ffd166', '#ff9f43', '#ff6b6b', '#f78fb3', '#7fd6ff', '#b8a1ff', '#ffffff', '#ffe08a'];
  const CONF_SHAPE = [
    () => VG.G.poly([-10, -8, 11, -2, -4, 10]), () => VG.G.rrect(-8, -8, 16, 16, 1), () => VG.G.rrect(-17, -4, 34, 8, 1),
    () => VG.G.ellipse(0, 0, 8, 8), () => VG.G.star(13, 5.5, 5), () => VG.G.poly([-16, -4, -8, -8, 0, -4, 8, -8, 16, -4, 16, 4, 8, 0, 0, 4, -8, 0, -16, 4]),
  ];
  const cshape = (i) => VG.S('conf' + i, CONF_SHAPE[i], 0.4);
  // u = seconds since the explosion, slow = extra drift time multiplier
  function confetti(ctx, x, y, u, n, seed, o = {}) {
    if (u < 0) return;
    const fade = o.fade ?? 1;
    for (let i = 0; i < n; i++) {
      const a = H(seed, i, 1) * TAU, v = 260 + 1150 * Math.pow(H(seed, i, 2), 1.4), kd = 1.3 + H(seed, i, 3) * 1.1;
      const d = (v * (1 - Math.exp(-kd * u))) / kd + u * 9, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.9;
      const sz = (0.7 + H(seed, i, 4) * 1.1) * (o.scale || 1), spin = (H(seed, i, 5) - 0.5) * 7, flip = 3 + H(seed, i, 6) * 7;
      ctx.save(); ctx.translate(px, py); ctx.rotate(H(seed, i, 7) * TAU + u * spin); ctx.scale(sz * Math.cos(u * flip + i), sz);
      VG.piece(ctx, cshape(i % CONF_SHAPE.length), CONF_COL[i % CONF_COL.length], 0.9, { alpha: fade, shadow: SHD, edge: false });
      ctx.restore();
    }
  }
  // a torn paper strip along an arc (local coords, centre 0,0); taper = pointy ends
  function strip(ctx, r, wd, a0, a1, col, seed, o = {}) {
    const n = Math.max(5, Math.ceil((Math.abs(a1 - a0) * r) / 9)), p = new Path2D(), jag = o.jag ?? 1.6, ta = o.from ?? a0, tb = o.to ?? a1;
    const wAt = (a) => { const u = clamp((a - ta) / (tb - ta || 1)); return o.taper === false ? 1 : Math.pow(Math.sin(Math.PI * u), 0.45); };
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = r + (wd / 2) * wAt(a) + (H(seed, i, 1) - 0.5) * jag * 2; const X = Math.cos(a) * rr, Y = Math.sin(a) * rr; i ? p.lineTo(X, Y) : p.moveTo(X, Y); }
    for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n), rr = r - (wd / 2) * wAt(a) + (H(seed, i, 2) - 0.5) * jag * 2; p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    p.closePath();
    VG.piece(ctx, p, col, o.depth ?? 0.9, { alpha: o.alpha, shadow: o.shadow || SHD, edgeCol: o.edgeCol, edge: o.edge });
  }
  function shockRing(ctx, x, y, r, wd, alpha, seed, col) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 16; i++) { const a0 = (i / 16) * TAU + H(seed, i, 1) * 0.2, span = TAU / 16 * (0.55 + H(seed, i, 2) * 0.4);
      strip(ctx, r * (0.96 + H(seed, i, 3) * 0.08), wd * (0.6 + H(seed, i, 4) * 0.6), a0, a0 + span, i % 3 ? col : '#ffffff', seed * 31 + i, { alpha, jag: 3 }); }
    ctx.restore();
  }

  // ------------------------------------------------------------------ black hole & disk
  // disk strips in a tilted plane; back = upper half (behind the hole), drawn in two passes
  function diskStrips(ctx, x, y, Rh, t, o) {
    const n = o.n || 38, tilt = o.tilt ?? 0.3, rin = Rh * 1.25, rout = Rh * (o.out || 3.1), span = rout - rin;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.12); ctx.scale(1, tilt);
    for (let i = 0; i < n; i++) {
      const k = o.k(i); if (k <= 0.001) continue;
      const u0 = H(i, 7, 1), fall = o.fall ?? 0.06, ph = (u0 - t * fall * (0.6 + H(i, 7, 2) * 0.8)) % 1, u = ph < 0 ? ph + 1 : ph;
      const r = rin + span * u, ang = (H(i, 7, 3) * TAU + t * (o.spin ?? 1.1) * Math.pow(Rh * 1.6 / r, 1.5));
      const len = (0.5 + H(i, 7, 4) * 1.1) * (0.6 + 0.5 * (1 - u)), wd = (5 + H(i, 7, 5) * 13) * (0.8 + u * 0.5) / Math.max(0.35, tilt) * 0.55;
      const hot = o.hot ?? 1, col = VG.ramp(['#fffbe8', '#ffe39a', '#ffb454', '#f07a3a', '#c9472e', '#8e3350'], clamp(u * 0.85 + (1 - hot) * 0.3 + H(i, 7, 6) * 0.15));
      const edgeFade = Math.min(1, u / 0.12) * Math.min(1, (1 - u) / 0.15);
      // split the arc into halves behind / in front of the hole
      let s = ang; const e = ang + len;
      while (s < e - 1e-4) {
        const nb = (Math.floor(s / Math.PI) + 1) * Math.PI, ee = Math.min(e, nb), back = Math.sin((s + ee) / 2) < 0;
        if (back === o.back) strip(ctx, r, wd * k, s, ee, col, i * 13 + 5, { alpha: k * edgeFade * (o.alpha ?? 1), from: ang, to: e, depth: 0.8, jag: 1 });
        s = ee;
      }
    }
    ctx.restore();
  }
  // lensed image of the far side of the disk: a bright arc hugging the top of the shadow
  function halo(ctx, x, y, Rh, t, k, o = {}) {
    if (k <= 0.001) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.12);
    for (let i = 0; i < 12; i++) {
      const r = Rh * (1.1 + H(i, 9, 1) * 0.28), a0 = Math.PI * (1.02 + H(i, 9, 2) * 0.5) + Math.sin(t * 0.7 + i) * 0.05, len = 0.5 + H(i, 9, 3) * 0.9;
      strip(ctx, r, (4 + H(i, 9, 4) * 7) * k, a0, Math.min(a0 + len, Math.PI * 1.98), VG.ramp(['#fff6d8', '#ffcf73', '#f59642'], H(i, 9, 5)), i * 7 + 3, { alpha: k * 0.95, depth: 0.6, jag: 0.8 });
      if (i % 2) strip(ctx, r * 0.98, (3 + H(i, 9, 6) * 4) * k, Math.PI * 0.1 + H(i, 9, 7) * 1.4, Math.PI * 0.1 + H(i, 9, 7) * 1.4 + len * 0.5, '#ffcf73', i * 11 + 1, { alpha: k * 0.6, depth: 0.5, jag: 0.8 });
    }
    ctx.restore();
  }
  // confetti debris spiralling into the hole; back = pieces on the far side (drawn before the hole)
  function debris(ctx, x, y, Rh, t, tg, n, back, fold, tilt = 0.3) {
    if (t < tg) return;
    for (let i = 0; i < n; i++) {
      const u0 = ((t - tg) * 0.16 + H(i, 21)) % 1, rr = Rh * (3.4 - 2.3 * u0), a = H(i, 22) * TAU + (t - tg) * 1.3 * Math.pow(Rh * 1.8 / rr, 1.5);
      if ((Math.sin(a) < 0) !== back) continue;
      const fade = clamp(Math.min(u0 / 0.1, (rr / Rh - 1.12) / 0.35)) * win(t, tg, 0.6) * fold; if (fade <= 0) continue;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * tilt, sc = 0.9 * (0.45 + 0.55 * (1 - u0));
      ctx.save(); ctx.translate(px, py); ctx.rotate(a * 2 + i); ctx.scale(sc * Math.cos(t * 4 + i), sc);
      VG.piece(ctx, cshape(i % CONF_SHAPE.length), CONF_COL[i % CONF_COL.length], 0.8, { alpha: fade, shadow: SHD, edge: false }); ctx.restore();
    }
  }
  function holeDisc(ctx, x, y, Rh, t, k, o = {}) {
    if (k <= 0.001 || Rh < 0.5) return;
    const R = Rh * k;
    VG.glowDot(ctx, x, y, R * 1.9, 'rgba(255,170,80,1)', 0.45 * (o.glow ?? 1));
    // photon ring
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,196,110,0.9)'; ctx.lineWidth = Math.max(1.5, R * 0.05);
    ctx.shadowColor = 'rgba(255,160,70,1)'; ctx.shadowBlur = 18 * VG.scaleOf(ctx); ctx.beginPath(); ctx.arc(x, y, R * 1.035, 0, TAU); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(x, y); VG.applyJit(ctx, o.id || 'hole', 0.4); ctx.scale(R / 100, R / 100);
    VG.piece(ctx, VG.S('hole', () => VG.G.ellipse(0, 0, 100, 100), 1.0), '#060409', 2.4, { shadow: 'rgba(0,0,0,0.85)', edgeCol: 'rgba(255,190,120,0.55)', edgeW: 1.8 });
    ctx.restore();
  }
  // crumpled paper ball (the dying core): faceted polygon with light and dark facets
  function crumpleBall(ctx, x, y, r, t, k, v) {
    if (k <= 0.001 || r < 0.5) return;
    VG.glowDot(ctx, x, y, r * 3.2, 'rgba(170,210,255,1)', 0.7 * k);
    ctx.save(); ctx.translate(x, y); VG.applyJit(ctx, 'ball', 0.8); ctx.scale(k * r / 100, k * r / 100); ctx.rotate(v * 0.9);
    const R = VG.rng(200 + v), n = 11, pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R() * 0.3, f = 0.78 + R() * 0.28; pts.push([Math.cos(a) * 100 * f, Math.sin(a) * 100 * f]); }
    const outline = VG.S('ball' + v, () => pts.flat(), 0.6);
    VG.piece(ctx, outline, '#e9f2ff', 1.6, { shadow: 'rgba(0,0,20,0.6)' });
    for (let i = 0; i < n; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n], cx = (R() - 0.5) * 30, cy = (R() - 0.5) * 30;
      ctx.fillStyle = `rgba(${R() < 0.5 ? '60,80,140' : '255,255,255'},${0.12 + R() * 0.25})`; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80,100,160,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke(); }
    ctx.restore();
  }

  // ------------------------------------------------------------------ light rays
  const RAYS = {};
  function rayPath(key, b, G, Rh) {
    if (RAYS[key]) return RAYS[key];
    let x = -1250, y = -b, vx = 1, vy = 0; const pts = [[x, y]], len = [0]; let absorbed = false; const ds = 4;
    for (let i = 0; i < 1600; i++) {
      const r2 = x * x + y * y, r = Math.sqrt(r2); if (r < Rh * 0.72) { absorbed = true; break; }
      const a = (G / r2) * ds; vx -= (x / r) * a; vy -= (y / r) * a; const m = Math.hypot(vx, vy); vx /= m; vy /= m; x += vx * ds; y += vy * ds;
      pts.push([x, y]); len.push(len[len.length - 1] + ds);
      if (x > 1400 || Math.abs(y) > 1000) break;
    }
    return (RAYS[key] = { pts, len, total: len[len.length - 1], absorbed });
  }
  // a paper light ray: a strip of fixed length travelling along the path, arrow head at the tip
  function lightRay(ctx, cx, cy, P, head, L, k, Rh) {
    if (k <= 0.001 || head <= 0) return;
    const ds = 4, i1 = Math.min(P.pts.length - 1, Math.floor(head / ds)), i0 = Math.max(0, Math.floor((head - L) / ds));
    if (i1 - i0 < 2) return;
    ctx.save(); ctx.translate(cx, cy);
    const s = VG.scaleOf(ctx);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = new Path2D(); path.moveTo(P.pts[i0][0], P.pts[i0][1]); for (let i = i0 + 1; i <= i1; i++) path.lineTo(P.pts[i][0], P.pts[i][1] + Math.sin(i * 0.7) * 0.6);
    VG.glowDot(ctx, P.pts[i1][0], P.pts[i1][1], 60, 'rgba(255,240,170,1)', 0.5 * k);
    ctx.save(); ctx.shadowColor = SHD; ctx.shadowBlur = 8 * s; ctx.shadowOffsetX = 3 * s; ctx.shadowOffsetY = 5 * s;
    ctx.strokeStyle = VG.paper('#ffe27a'); ctx.lineWidth = 16 * k; ctx.stroke(path); ctx.restore();
    ctx.strokeStyle = VG.paper('#fffbe6', true); ctx.lineWidth = 5 * k; ctx.stroke(path);
    const [hx, hy] = P.pts[i1], [px, py] = P.pts[Math.max(0, i1 - 3)], a = Math.atan2(hy - py, hx - px);
    const nearH = Rh ? clamp((Math.hypot(hx, hy) - Rh * 0.72) / (Rh * 0.6)) : 1;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.scale(k * nearH, k * nearH);
    VG.piece(ctx, VG.S('rayHead', () => VG.G.poly([-14, -24, 26, 0, -14, 24, -4, 0]), 0.5), '#ffe27a', 1.4, { shadow: SHD });
    ctx.restore(); ctx.restore();
  }

  // ------------------------------------------------------------------ shared foreground
  function frameDecor(ctx, st, o = {}) {
    const { w, h } = st.L;
    if (o.rocks !== false) {
      rock(ctx, st, -w * 0.45, h * 0.53, 1.7, 0.12, 'rockL');
      rock(ctx, st, w * 0.46, h * 0.54, 1.4, 0.2, 'rockR', -1);
    }
  }

  // headline in cut-out letters, several colour runs: parts = [[text, colour], …]
  function titleLine(ctx, parts, x, y, size, t, k0) {
    ctx.save(); ctx.font = `700 ${size}px "Fredoka"`;
    const wOf = (str) => [...str].reduce((a, c) => a + ctx.measureText(c).width + size * 0.06, 0), ws = parts.map(([p]) => wOf(p));
    ctx.restore();
    const total = ws.reduce((a, b) => a + b, 0); let cx = x - total / 2, n = 0;
    parts.forEach(([p, col], i) => { VG.cutoutText(ctx, p, cx, y, size, { t, k0: k0 + n * 0.035, stagger: 0.035, id: 'title' + n, colors: [col], align: 'left' }); cx += ws[i]; n += p.length; });
  }

  // ================================================================== 1. the star
  const S1 = { x: 0, y: -50, R: 215 };
  VG.scene('star', {
    bg(ctx, st) { backdrop(ctx, st, { neb: 'a', seed: 3 }); },
    fg(ctx, st) {
      const { w, h } = st.L, t = st.lt, P = st.pop;
      paperStars(ctx, st, 's1stars', 46, -0.7);
      planet(ctx, st, -w * 0.37, -h * 0.28, 58, 0.1, 'planet1');
      planet(ctx, st, w * 0.4, h * 0.05, 26, 0.3, 'planet2', '#6f8fd0', '#d8e4ff');
      hangStar(ctx, st, -w * 0.18, h * 0.08, 0.9, 0.15, 'hs1');
      hangStar(ctx, st, w * 0.22, h * 0.14, 0.7, 0.3, 'hs2', '#fff3c4');
      hangStar(ctx, st, w * 0.33, h * 0.05, 1.1, 0.45, 'hs3');
      // the star breathes: fusion out vs. gravity in
      const tPush = W('vo3', 'pushes'), tPull = W('vo3', 'pulls'), tBal = W('vo3', 'balance');
      const tug = Math.sin(t * 2.4) * win(t, tPull, 0.5), dies = bump(t, W('vo1', 'dies'), 0.15, 0.3, 0.6);
      const R = S1.R * (1 + 0.018 * tug);
      starBody(ctx, S1.x, S1.y, R, t, { k: P(-0.75, 0.55), glow: 1 - dies * 0.55, id: 'star1' });
      fusionCore(ctx, S1.x - 6, S1.y - 6, 88, t, VG.popK(t, W('vo2', 'fusing') - 0.25, 0.4) * st.fold * (1 - win(t, tPull + 1.5, 0.6) * 0.0));
      // forces
      const kOut = (i) => VG.popK(t, tPush - 0.05 + i * 0.05, 0.35) * st.fold, kIn = (i) => VG.popK(t, tPull - 0.05 + i * 0.05, 0.35) * st.fold;
      const settle = win(t, tBal - 0.2, 0.6);
      arrowRing(ctx, S1.x, S1.y, 8, R * 0.66 + 8 * tug, 1.25, 1, '#ff7b2e', kOut, 'fo', Math.PI / 8);
      arrowRing(ctx, S1.x, S1.y, 8, R + 58 + 8 * tug - 6 * settle, 1.25, -1, '#5fb4f0', kIn, 'gi', Math.PI / 8);
      const aF = Math.PI / 8 - Math.PI / 4 * 1, aG = Math.PI / 8 + Math.PI * 0.75;
      tag(ctx, w * 0.3, -h * 0.34, 'FUSION', VG.popK(t, W('vo3', 'fusion'), 0.4) * st.fold, 'tagF', { col: '#ff7b2e', to: [S1.x + Math.cos(aF) * (R * 0.66 + 62), S1.y + Math.sin(aF) * (R * 0.66 + 62)], rot: 0.03 });
      tag(ctx, -w * 0.31, h * 0.2, 'GRAVITY', VG.popK(t, W('vo3', 'gravity'), 0.4) * st.fold, 'tagG', { col: '#5fb4f0', to: [S1.x + Math.cos(aG) * (R + 118), S1.y + Math.sin(aG) * (R + 118)] });
      frameDecor(ctx, st);
    },
    get camera() {
      const f = W('vo2', 'fusing'), c = W('vo2', 'core'), p = W('vo3', 'fusion');
      return [[-0.8, 0, -50, 1.34], [2.3, 0, -50, 1.16], [f - 0.3, 0, -45, 1.2], [c + 0.5, -6, -56, 1.5], [p - 0.25, -6, -56, 1.46], [p + 1.1, 0, -30, 1.02], [sceneDur('star'), 0, -30, 1.0]];
    },
    get sfx() {
      const out = [[W('vo2', 'fusing') - 0.2, 'paper_pop_2.wav', 0.5, { pan: 0 }]];
      for (let i = 0; i < 8; i += 2) out.push([W('vo3', 'pushes') + i * 0.05, 'paper_pop_3.wav', 0.35, { pan: -0.5 + i * 0.14 }]);
      out.push([W('vo3', 'pushes') - 0.05, 'paper_rustle_2.wav', 0.4, { pan: 0.2 }]);
      out.push([W('vo3', 'pulls') - 0.05, 'paper_rustle_4.wav', 0.45, { pan: -0.2 }]);
      for (let i = 1; i < 8; i += 2) out.push([W('vo3', 'pulls') + i * 0.05, 'paper_pop_3.wav', 0.3, { pan: 0.5 - i * 0.14 }]);
      out.push([W('vo3', 'fusion'), 'paper_pop_1.wav', 0.4, { pan: 0.4 }], [W('vo3', 'gravity'), 'paper_pop_1.wav', 0.4, { pan: -0.4 }]);
      return out;
    },
  });

  // ================================================================== 2. supergiant → collapse → supernova
  VG.scene('giant', {
    bg(ctx, st) { backdrop(ctx, st, { neb: 'b', seed: 5, shake: shake(st, tExp(), 26, 1.6) }); },
    fg(ctx, st) {
      const { w, h } = st.L, t = st.lt, P = st.pop;
      const tSw = W('vo4', 'swells'), tGone = W('vo5', 'gone'), tWins = W('vo5', 'wins'), tCol = W('vo5', 'collapses'), tEx = tExp();
      const [sx, sy] = shake(st, tEx, 26, 1.6);
      ctx.save(); ctx.translate(sx, sy);
      paperStars(ctx, st, 's2stars', 44, -0.7, { shake: [sx * 0.3, sy * 0.3] });
      hangStar(ctx, st, -w * 0.3, h * 0.1, 0.8, 0.2, 'hs4', '#fff3c4');
      hangStar(ctx, st, w * 0.36, h * 0.07, 1.0, 0.35, 'hs5');
      // swell into a red supergiant
      const g = ease.inOut(win(t, tSw - 0.15, 2.8)), cx = 0, cy = lerp(-50, -80, g);
      const Rg = lerp(215, 345, g) * (1 + 0.012 * Math.sin(t * 1.7));
      // collapse: core first, outer layers fall after it
      const u = t - tCol, cIn = ease.in(win(u, 0, 0.32)), cMid = ease.in(win(u, 0.06, 0.38)), cOut = ease.in(win(u, 0.12, 0.42));
      const ls = [1 - cOut * 0.97, 1 - cMid * 0.98, 1 - cIn * 0.99, 1 - cIn * 0.99];
      const trem = t > tCol - 1.2 && t < tCol ? (H(VG.frame, 3) - 0.5) * 6 * win(t, tCol - 1.2, 1) : 0;
      const dim = win(t, tGone, 0.8) * 0.45;
      if (t < tEx) {
        starBody(ctx, cx + trem, cy, Rg, t, { k: P(-0.75, 0.5), heat: 1 - g, ls, glow: 1 - dim + cIn * 0.5, id: 'star2' });
        // gravity wins: big blue arrows squeeze the star
        const kG = (i) => VG.popK(t, tWins - 0.1 + i * 0.04, 0.3) * (1 - win(u, 0.35, 0.15));
        const rIn = Rg * ls[0] + 40 + 10 * Math.sin(t * 9) * (1 - win(u, 0, 0.1));
        arrowRing(ctx, cx, cy, 10, rIn, 1.45, -1, '#5fb4f0', kG, 'gw', 0.1);
        // the naked core glows white-hot for a heartbeat
        const kc = win(u, 0.3, 0.15);
        if (kc > 0) {
          // the naked core gathers itself: pulses faster and brighter, loose paper is sucked in
          const ramp = win(t, tCol + 0.4, Math.max(0.3, tEx - tCol - 0.4)), f = 1 + (0.15 + 0.3 * ramp) * Math.sin(t * (20 + 40 * ramp));
          VG.glowDot(ctx, cx, cy, (120 + 160 * ramp) * f, 'rgba(200,225,255,1)', 0.9 * kc); VG.glowDot(ctx, cx, cy, 34 + 20 * ramp, 'rgba(255,255,255,1)', kc);
          for (let i = 0; i < 26; i++) { const ph = (H(i, 31) + (t - tCol) * 0.9) % 1, rr = 620 * (1 - ph) * (1 - ph) + 20, a = H(i, 32) * TAU + ph * 2.5;
            ctx.save(); ctx.translate(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); ctx.rotate(a + t * 5); ctx.scale(1.3 * (1 - ph * 0.7), 1.3 * (1 - ph * 0.7));
            VG.piece(ctx, cshape(i % CONF_SHAPE.length), ['#ff8f5a', '#ffd166', '#e0453a', '#fff4d6'][i % 4], 0.8, { alpha: kc * Math.min(1, ph * 5), shadow: SHD, edge: false }); ctx.restore(); }
          ctx.save(); ctx.translate(cx + (H(VG.frame, 8) - 0.5) * 6 * ramp, cy); ctx.scale((0.16 + 0.05 * ramp) * kc, (0.16 + 0.05 * ramp) * kc); VG.piece(ctx, disc(), '#f2f7ff', 1, { shadow: SHD }); ctx.restore(); }
      }
      // SUPERNOVA
      const e = t - tEx;
      if (e >= 0) {
        VG.glowDot(ctx, cx, cy, 950 * ease.out(win(e, 0, 0.35)), 'rgba(255,214,160,1)', 0.9 * (1 - win(e, 0.1, 1.6)));
        VG.glowDot(ctx, cx, cy, 420, 'rgba(170,215,255,1)', 0.7 * (1 - win(e, 0.4, 4.5)));
        // layered paper starbursts punching outwards
        [['#fff7e0', 1.0, 0], ['#ffd166', 0.8, 0.03], ['#ff8f5a', 0.62, 0.06], ['#f78fb3', 0.46, 0.09]].forEach(([col, sz, dl], j) => {
          const g2 = ease.out(win(e, dl, 0.45)), fa = 1 - win(e, 0.5 + j * 0.1, 1.1); if (g2 <= 0 || fa <= 0) return;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(j * 0.3 + e * 0.2 * (j % 2 ? -1 : 1)); ctx.scale(g2 * sz * 7.5, g2 * sz * 7.5);
          VG.piece(ctx, VG.S('burst' + j, () => { const R = VG.rng(90 + j), p = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, rr = i % 2 ? 44 + R() * 10 : 78 + R() * 34; p.push(Math.cos(a) * rr, Math.sin(a) * rr); } return VG.G.poly(p); }, 0.8), col, 1.6, { alpha: fa, shadow: SHD });
          ctx.restore();
        });
        // paper spikes shooting out
        const sp = ease.out(win(e, 0, 0.3)) * (1 - win(e, 0.5, 0.8));
        if (sp > 0) for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU + H(i, 4) * 0.2, L = (280 + 520 * H(i, 5)) * sp;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.scale(L / 100, 1 + H(i, 6)); VG.piece(ctx, VG.S('spike', () => VG.G.poly([0, -9, 100, 0, 0, 9]), 0.4), i % 2 ? '#fff6d8' : '#ffd37a', 1, { shadow: SHD }); ctx.restore(); }
        shockRing(ctx, cx, cy, 40 + 1250 * (1 - Math.exp(-1.6 * e)), 46 * (1 - win(e, 0, 2.5)) + 10, 1 - win(e, 1.2, 1.8), 17, '#bfe6ff');
        shockRing(ctx, cx, cy, 20 + 700 * (1 - Math.exp(-1.9 * e)), 30, 1 - win(e, 0.8, 2.2), 23, '#ff9fb8');
        confetti(ctx, cx, cy, e, 280, 7, { scale: 1.55 });
        if (e < 1.2) { VG.glowDot(ctx, cx, cy, 160 * (1 - e / 1.2), 'rgba(255,255,255,1)', 1); }
      }
      tag(ctx, w * 0.33, -h * 0.36, 'RED SUPERGIANT', VG.popK(t, W('vo4', 'red'), 0.4) * (1 - win(t, tCol - 0.3, 0.3)) * st.fold, 'tagRG', { col: '#e0453a', to: [cx + Rg * 0.62, cy - Rg * 0.62] });
      frameDecor(ctx, st);
      ctx.restore();
      VG.cutoutText(ctx, 'SUPERNOVA!', 0, -h * 0.34, 112, { t, k0: W('vo6', 'supernova') - 0.1, stagger: 0.045, fold: st.fold, id: 'sn', colors: ['#ffd166', '#ff9f43', '#ff6b6b', '#f78fb3', '#7fd6ff', '#b8a1ff'] });
    },
    light(ctx, st) {
      const { w, h } = st.L, e = st.lt - (tExp());
      if (e < 0) return;
      const f = 0.92 * (1 - win(e, 0.06, 0.45)) + 0.25 * (1 - win(e, 0.5, 1.2)) * win(e, 0.45, 0.01);
      if (f > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,244,220,${f})`; ctx.fillRect(-w, -h, w * 2, h * 2); ctx.restore(); }
    },
    get camera() {
      const sw = W('vo4', 'swells'), col = W('vo5', 'collapses'), ex = tExp(), d = sceneDur('giant');
      return [[0, 0, -40, 1.14], [sw - 0.2, 0, -45, 1.14], [sw + 2.8, 0, -70, 1.0], [col - 0.1, 0, -75, 1.02], [col + 0.55, 0, -80, 1.42], [ex, 0, -80, 1.46], [ex + 0.35, 0, -70, 1.22], [ex + 2.2, 0, -40, 1.0], [d, 0, -40, 1.04]];
    },
    get sfx() {
      const sw = W('vo4', 'swells'), col = W('vo5', 'collapses'), ex = tExp();
      return [
        [sw - 0.1, 'paper_rustle_3.wav', 0.55, { pan: 0 }], [sw + 1.2, 'paper_rustle_1.wav', 0.4, { pan: 0.3 }],
        [W('vo4', 'red'), 'paper_pop_1.wav', 0.4, { pan: 0.4 }],
        [W('vo5', 'wins') - 0.1, 'paper_rustle_4.wav', 0.5, { pan: -0.2 }],
        [col - 0.02, 'paper_crumple_1.wav', 0.85, { pan: 0 }],
        [ex, 'paper_crumple_2.wav', 0.5, { pan: 0, rate: 0.8 }],
        [ex + 0.05, 'paper_rustle_4.wav', 0.6, { pan: -0.4 }], [ex + 0.15, 'paper_rustle_2.wav', 0.5, { pan: 0.4 }],
        [ex + 0.3, 'paper_pop_4.wav', 0.5, { pan: 0.2 }],
        [W('vo6', 'supernova') - 0.1, 'paper_pop_2.wav', 0.35, { pan: 0 }],
      ];
    },
  });

  // ================================================================== 3. the black hole forms
  const S3 = { x: 0, y: -40, Rh: 118 };
  const crushSteps = () => [W('vo7', 'crushed'), W('vo7', 'smaller', 0), W('vo7', 'smaller', 1), W('vo7', 'into'), W('vo7', 'black')];
  VG.scene('hole', {
    bg(ctx, st) {
      const t = st.lt, kb = ease.out(win(t, W('vo7', 'black') - 0.05, 1.6));
      backdrop(ctx, st, { neb: 'b', seed: 5, core: '#241f52', lens: { x: S3.x, y: S3.y, E: 150 * kb } });
    },
    fg(ctx, st) {
      const { w, h } = st.L, t = st.lt, P = st.pop, { x, y, Rh } = S3;
      const [c1, c2, c3, cu, cb] = crushSteps(), kb = ease.out(win(t, cb - 0.05, 1.6)), L = { x, y, E: 150 * kb };
      paperStars(ctx, st, 's3stars', 40, -0.7, { lens: L, avoid: [x, y, Rh * kb * 1.1] });
      // supernova remnant: torn translucent shell + drifting confetti
      const rem = 470 + t * 14;
      ctx.save(); ctx.globalAlpha = 0.9;
      for (let i = 0; i < 3; i++) shockRing(ctx, x, y, rem * (0.86 + i * 0.1), 34 - i * 8, 0.42 - i * 0.08, 41 + i, ['#ff9fb8', '#7fd6ff', '#b8a1ff'][i]);
      ctx.restore();
      confetti(ctx, x, y, 3.2 + t * 0.35, 150, 7, { fade: 0.9, scale: 1.4 });
      // the core is crushed smaller and smaller (a crumpled paper ball)
      const steps = [62, 46, 33, 21, 5];
      let r = 62, v = 0;
      [c1, c2, c3, cu].forEach((tc, i) => { const kk = ease.back(win(t, tc - 0.05, 0.25), 1.6); if (kk > 0) { r = lerp(steps[i], steps[i + 1], kk); v = i + 1; } });
      const kCore = P(-0.7, 0.4) * (1 - win(t, cb, 0.25));
      // inward arrows pulse with every squeeze
      const pulse = Math.max(...[c1, c2, c3, cu].map((tc) => bump(t, tc - 0.25, 0.12, 0.2, 0.3)));
      arrowRing(ctx, x, y, 6, r + 26 + 30 * (1 - pulse), 0.8, -1, '#5fb4f0', () => pulse * kCore, 'cr', 0.3);
      crumpleBall(ctx, x, y, r, t, kCore, v);
      // the black hole opens out of the point
      const kh = VG.popK(t, cb - 0.05, 0.7) * st.fold;
      const kd = (i) => VG.popK(t, W('vo8', 'gas') - 0.3 + H(i, 3) * 1.4, 0.8) * st.fold;
      const hot = 0.6 + 0.4 * win(t, W('vo8', 'glowing'), 1);
      diskStrips(ctx, x, y, Rh, t, { k: kd, back: true, hot, spin: 1.2, fall: 0.07 });
      halo(ctx, x, y, Rh, t, kd(0) * kh);
      const tg = W('vo8', 'spiral') - 0.4;
      debris(ctx, x, y, Rh, t, tg, 20, true, st.fold);
      holeDisc(ctx, x, y, Rh, t, kh, { glow: 0.6 + 0.6 * win(t, W('vo8', 'glowing'), 1) });
      diskStrips(ctx, x, y, Rh, t, { k: kd, back: false, hot, spin: 1.2, fall: 0.07 });
      debris(ctx, x, y, Rh, t, tg, 20, false, st.fold);
      rock(ctx, st, -w * 0.45, h * 0.53, 1.5, 0.15, 'rockL3');
      tag(ctx, w * 0.25, -h * 0.31, 'BLACK HOLE', VG.popK(t, cb + 0.2, 0.4) * st.fold, 'tagBH', { col: '#8a5cd0', to: [x + Rh * 0.72, y - Rh * 0.72] });
    },
    get camera() {
      const [c1, , , , cb] = crushSteps(), g = W('vo8', 'gas'), d = sceneDur('hole');
      return [[0, 0, -40, 1.02], [c1 - 0.3, 0, -40, 1.12], [cb - 0.2, 0, -40, 1.4], [cb + 0.9, 0, -40, 1.16], [g + 0.3, 0, -40, 1.06], [d, 0, -40, 1.24]];
    },
    get sfx() {
      const [c1, c2, c3, cu, cb] = crushSteps();
      return [
        [c1 - 0.08, 'paper_crumple_1.wav', 0.7, { pan: -0.1, dur: 0.6, fadeOut: 0.15 }],
        [c2 - 0.08, 'paper_crumple_2.wav', 0.7, { pan: 0.1, dur: 0.6, fadeOut: 0.15 }],
        [c3 - 0.08, 'paper_crumple_1.wav', 0.75, { pan: 0, dur: 0.6, rate: 1.15, fadeOut: 0.15 }],
        [cu - 0.08, 'paper_crumple_2.wav', 0.6, { pan: 0, dur: 0.5, rate: 1.3, fadeOut: 0.15 }],
        [cb - 0.1, 'paper_pop_4.wav', 0.45, { pan: 0 }],
        [cb + 0.2, 'paper_pop_1.wav', 0.35, { pan: 0.4 }],
        [W('vo8', 'gas') - 0.3, 'paper_rustle_3.wav', 0.45, { pan: -0.3 }],
        [W('vo8', 'spiral'), 'paper_rustle_4.wav', 0.35, { pan: 0.3 }],
      ];
    },
  });

  // ================================================================== 4. the event horizon
  const S4 = { x: 60, y: -50, Rh: 132 };
  const rayTimes = () => { const d = sceneDur('horizon'); return { a: W('vo9', 'past') - 0.5, b: W('vo9', 'nothing') - 0.4, c: W('vo9', 'light') - 1.25, d }; };
  VG.scene('horizon', {
    bg(ctx, st) { backdrop(ctx, st, { neb: 'c', seed: 9, core: '#221c4c', gx: S4.x, gy: S4.y, lens: { x: S4.x, y: S4.y, E: 140 } }); },
    fg(ctx, st) {
      const { w, h } = st.L, t = st.lt, P = st.pop, { x, y, Rh } = S4, L = { x, y, E: 140 };
      paperStars(ctx, st, 's4stars', 36, -0.7, { lens: L, avoid: [x, y, Rh * 1.15] });
      const kd = (i) => P(-0.6 + H(i, 3) * 0.5, 0.5);
      ctx.save(); for (let i = 0; i < 2; i++) shockRing(ctx, x, y, 620 + i * 90 + t * 10, 26 - i * 6, 0.22 - i * 0.05, 51 + i, ['#7fd6ff', '#ff9fb8'][i]); ctx.restore();
      diskStrips(ctx, x, y, Rh, t, { k: kd, back: true, spin: 1.1, fall: 0.05, tilt: 0.22, alpha: 0.8, n: 34, out: 3.3 });
      debris(ctx, x, y, Rh, t, -3, 12, true, st.fold, 0.22);
      halo(ctx, x, y, Rh, t, P(-0.4, 0.5));
      // light rays: one bends a little, one bends a lot, one crosses the horizon and is gone
      const RT = rayTimes(), v = 820, G = 75;
      const ra = rayPath('ra', 430, G, Rh), rb = rayPath('rb', -250, G, Rh), rc = rayPath('rc', 150, G, Rh);
      lightRay(ctx, x, y, ra, (t - RT.a) * v, 480, st.fold, 0);
      lightRay(ctx, x, y, rb, (t - RT.b) * v, 520, st.fold, 0);
      lightRay(ctx, x, y, rc, Math.min((t - RT.c) * v, rc.total + 470), 460, st.fold, Rh);
      const tGone = RT.c + rc.total / v;
      holeDisc(ctx, x, y, Rh, t, P(-0.7, 0.5), { glow: 0.8 + 0.8 * bump(t, tGone - 0.1, 0.1, 0.1, 0.8) });
      diskStrips(ctx, x, y, Rh, t, { k: kd, back: false, spin: 1.1, fall: 0.05, tilt: 0.22, alpha: 0.8, n: 34, out: 3.3 });
      debris(ctx, x, y, Rh, t, -3, 12, false, st.fold, 0.22);
      // the event horizon: a dashed line cut around the shadow
      const kr = win(t, W('vo9', 'event') - 0.1, 0.9) * st.fold;
      if (kr > 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2 + t * 0.15); ctx.strokeStyle = VG.paper('#fbf3df', true); ctx.lineWidth = 5; ctx.setLineDash([16, 12]); ctx.lineCap = 'round';
        ctx.shadowColor = SHD; ctx.shadowBlur = 6 * VG.scaleOf(ctx); ctx.shadowOffsetY = 3 * VG.scaleOf(ctx);
        ctx.beginPath(); ctx.arc(0, 0, Rh * 1.08, 0, TAU * kr); ctx.stroke(); ctx.restore(); }
      tag(ctx, x - w * 0.19, y - h * 0.29, 'EVENT HORIZON', VG.popK(t, W('vo9', 'event') + 0.1, 0.4) * st.fold, 'tagEH', { col: '#f2c14e', to: [x - Rh * 0.8, y - Rh * 0.8], rot: 0.03 });
    },
    get camera() {
      const RT = rayTimes();
      return [[0, 30, -40, 1.06], [RT.a + 0.4, 20, -40, 1.02], [RT.c + 0.6, 40, -40, 1.12], [RT.d, 60, -40, 1.3]];
    },
    get sfx() {
      const RT = rayTimes(), rc = rayPath('rc', 150, 75, S4.Rh);
      return [
        [W('vo9', 'event'), 'paper_pop_1.wav', 0.4, { pan: 0.4 }],
        [RT.a + 0.3, 'paper_pop_4.wav', 0.3, { pan: -0.6 }],
        [RT.b + 0.3, 'paper_pop_4.wav', 0.3, { pan: -0.6 }],
        [RT.c + 0.3, 'paper_pop_4.wav', 0.3, { pan: -0.6 }],
        [RT.c + rc.total / 820 - 0.1, 'paper_pop_3.wav', 0.4, { pan: 0.1, rate: 0.7 }],
      ];
    },
  });

  // ================================================================== 5. darkest from brightest + title
  VG.scene('end', {
    bg(ctx, st) { const { w } = st.L; backdrop(ctx, st, { neb: 'a', seed: 12, lens: { x: w * 0.24, y: -20, E: 90 } }); },
    fg(ctx, st) {
      const { w, h } = st.L, t = st.lt, P = st.pop;
      const hx = w * 0.24, hy = -20, sx = -w * 0.25, sy = -20, Rh = 82;
      paperStars(ctx, st, 's5stars', 40, -0.7, { lens: { x: hx, y: hy, E: 90 }, avoid: [hx, hy, Rh * 1.15] });
      hangStar(ctx, st, -w * 0.43, h * 0.1, 0.8, 0.25, 'hs6', '#fff3c4');
      hangStar(ctx, st, w * 0.44, h * 0.14, 0.7, 0.4, 'hs7');
      const tDark = W('vo10', 'darkest'), tBright = W('vo10', 'brightest');
      // the brightest: a young star again
      const flare = bump(t, tBright - 0.1, 0.25, 0.8, 1.2);
      starBody(ctx, sx, sy, 150 * (1 + 0.06 * flare), t, { k: P(-0.6, 0.5), glow: 1 + flare * 0.6, id: 'star5' });
      // the darkest: the black hole with its disk
      const hi = bump(t, tDark - 0.1, 0.2, 0.8, 1);
      const kd = (i) => P(-0.5 + H(i, 3) * 0.6, 0.5);
      diskStrips(ctx, hx, hy, Rh, t, { k: kd, back: true, spin: 1.2, fall: 0.06, n: 32 });
      halo(ctx, hx, hy, Rh, t, P(-0.3, 0.5));
      holeDisc(ctx, hx, hy, Rh * (1 + 0.05 * hi), t, P(-0.6, 0.5), { glow: 1 + hi });
      diskStrips(ctx, hx, hy, Rh, t, { k: kd, back: false, spin: 1.2, fall: 0.06, n: 32 });
      // dotted golden thread: born from the star
      const tr = VG.trail('bhTrail2', [sx + 170, sy - 50, -w * 0.02, -h * 0.14, hx - 150, hy - 60]);
      const kt = win(t, W('vo10', 'born') - 0.2, 1.4) * st.fold;
      if (kt > 0) { tr.dots(ctx, tr.total * kt, '#f2c14e', 22); const [ax, ay] = tr.at(tr.total * kt); VG.glowDot(ctx, ax, ay, 40, 'rgba(255,220,140,1)', 0.8 * (1 - win(t, W('vo10', 'born') + 1.2, 0.4))); }
      frameDecor(ctx, st);
      // title card
      const tt = W('vo10', 'born') - 0.15, ty = -h * 0.355;
      const kc = VG.popK(t, tt, 0.5);
      if (kc > 0) VG.pop(ctx, 0, ty + 70, kc, (c) => { c.translate(0, -70); c.rotate(-0.012);
        VG.piece(c, VG.S('titleCard', () => VG.G.rrect(-560, -62, 1120, 124, 10), 0.9), '#fbf3df', 2.2, { shadow: SHD });
        c.save(); c.globalAlpha = 0.75; for (const [tx, r] of [[-520, -0.5], [520, 0.5]]) { c.save(); c.translate(tx, -58); c.rotate(r); VG.piece(c, VG.S('tape', () => VG.G.rrect(-44, -13, 88, 26, 1)), '#9fc3e8', 0.3, { edge: false }); c.restore(); } c.restore();
      }, 'titleCard');
      titleLine(ctx, [['How a ', '#271d38'], ['black hole', '#c0462c'], [' is born', '#271d38']], 0, ty, 80, t, tt + 0.2);
    },
    get camera() { const d = sceneDur('end'); return [[0, 0, 10, 1.1], [W('vo10', 'born') - 0.2, 0, 0, 1.04], [lineEnd('vo10') + 0.3, 0, 0, 1.0], [d + 3, 0, 0, 1.02]]; },
    get sfx() {
      const tt = W('vo10', 'born') - 0.15;
      return [[W('vo10', 'born') - 0.2, 'paper_rustle_2.wav', 0.3, { pan: 0 }], [tt, 'paper_pop_1.wav', 0.5, { pan: 0 }], [tt + 0.3, 'paper_rustle_1.wav', 0.3, { pan: 0.2 }]];
    },
  });
})();
