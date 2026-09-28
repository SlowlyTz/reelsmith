// Style "clean": UI building blocks – mouse pointer with natural eased paths and clicks, desktop
// windows, a clean sheet of paper, cards, typed text, counters, buttons, progress bars.
(function () {
  const VG = window.VG, { clamp, lerp } = VG, E = VG.ease;

  // ---------- pointer ----------
  const ARROW = new Path2D('M0,0 L0,35 L8.5,27 L14.5,41 L20.5,38.5 L14.6,25 L26,25 Z');
  const HAND = new Path2D('M9,16 L9,4.5 C9,1 14,1 14,4.5 L14,14 L14,11 C14,8 19,8 19,11 L19,15 L19,13 C19,10.2 24,10.2 24,13 L24,17 C24,14.4 28.6,14.4 28.6,17.2 L28.6,28 C28.6,36 23,40 17,40 L14,40 C9.5,40 7,37.5 4.5,33.5 L0.8,26.5 C-0.6,24 2.6,21.6 4.6,23.8 L9,28.5 Z');
  // where the pointer is at scene time lt; keys: [[t, x, y, 'click'?], …] – eased, slightly arced moves
  VG.pointerAt = (lt, keys) => {
    let x = keys[0][1], y = keys[0][2], moving = false;
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, x0, y0] = keys[i], [t1, x1, y1] = keys[i + 1];
      if (lt < t0) break;
      if (lt >= t1) { x = x1; y = y1; continue; }
      const u = E.inOut((lt - t0) / (t1 - t0)), d = Math.hypot(x1 - x0, y1 - y0), bow = Math.sin(Math.PI * u) * d * 0.12 * (i % 2 ? -1 : 1);
      x = lerp(x0, x1, u) - ((y1 - y0) / (d || 1)) * bow; y = lerp(y0, y1, u) + ((x1 - x0) / (d || 1)) * bow; moving = true;
      break;
    }
    const clicks = keys.filter((k) => k[3] === 'click').map((k) => k[0]);
    const last = clicks.filter((c) => c <= lt).pop(), since = last == null ? 99 : lt - last;
    return { x, y, moving, since, press: since < 0.18 ? Math.sin((since / 0.18) * Math.PI) : 0 };
  };
  // draw the pointer (arrow or hand) with its click ripple; opt: scale (1.7), kind, color, alpha
  VG.pointer = (ctx, lt, keys, opt = {}) => {
    const p = VG.pointerAt(lt, keys), s = (opt.scale || 1.7) * (1 - 0.14 * p.press);
    const a = opt.alpha ?? clamp((lt - keys[0][0] + 0.25) / 0.25);
    if (a <= 0) return p;
    ctx.save(); ctx.globalAlpha *= a;
    if (p.since < 0.6) {    // click ring
      const f = p.since / 0.6;
      ctx.save(); ctx.strokeStyle = opt.ring || VG.theme.accent; ctx.lineWidth = 5 * (1 - f); ctx.globalAlpha *= 1 - f;
      ctx.beginPath(); ctx.arc(p.x, p.y, 14 + 46 * E.outQuint(f), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.translate(p.x, p.y); ctx.scale(s, s);
    if (opt.kind === 'hand') ctx.translate(-14, -2);
    VG.softShadow(ctx, 8, 3, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = opt.color || '#111'; ctx.fill(opt.kind === 'hand' ? HAND : ARROW);
    ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = '#fff'; ctx.stroke(opt.kind === 'hand' ? HAND : ARROW);
    ctx.restore();
    return p;
  };

  // ---------- containers ----------
  // desktop app window; content(ctx, w, h) is drawn clipped with (0,0) = top-left of the content area
  // opt: title, dark (false), r (26), bar (64), fill
  VG.window = (ctx, x, y, w, h, k, opt = {}, content) => {
    if (k <= 0) return;
    const dark = opt.dark ?? false, r = opt.r ?? 26, bar = opt.bar ?? 64, e = E.outQuint(k), s = 0.94 + 0.06 * E.spring(k, 0.2);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= clamp(k * 2.5);
    ctx.save(); VG.softShadow(ctx, 60, 26, 'rgba(0,0,0,0.28)'); ctx.fillStyle = opt.fill || (dark ? '#1f2127' : '#ffffff'); VG.rrectPath(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.restore();
    ctx.save(); VG.rrectPath(ctx, -w / 2, -h / 2, w, h, r); ctx.clip();
    ctx.fillStyle = dark ? '#2a2d34' : '#f1f1f3'; ctx.fillRect(-w / 2, -h / 2, w, bar);
    ctx.fillStyle = dark ? '#3a3d45' : '#e2e2e6'; ctx.fillRect(-w / 2, -h / 2 + bar - 1.5, w, 1.5);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-w / 2 + 34 + i * 30, -h / 2 + bar / 2, 9.5, 0, Math.PI * 2); ctx.fill(); });
    if (opt.title) VG.text(ctx, opt.title, 0, -h / 2 + bar / 2, { size: 26, weight: 600, font: VG.FONT.ui, color: dark ? '#b8bcc6' : '#6b6f78' });
    if (content) { ctx.save(); ctx.translate(-w / 2, -h / 2 + bar); ctx.globalAlpha *= e; content(ctx, w, h - bar); ctx.restore(); }
    ctx.restore();
    ctx.lineWidth = 1.5; ctx.strokeStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'; VG.rrectPath(ctx, -w / 2, -h / 2, w, h, r); ctx.stroke();
    ctx.restore();
  };
  // a clean sheet of paper; content(ctx, w, h) draws on it with (0,0) = its top-left
  // opt: lines (true), margin (true), rot (-0.02), fill
  VG.sheet = (ctx, x, y, w, h, k, opt = {}, content) => {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y + (1 - E.outQuint(k)) * 90); ctx.rotate(opt.rot ?? -0.02); ctx.globalAlpha *= clamp(k * 2.2);
    ctx.save(); VG.softShadow(ctx, 40, 18, 'rgba(40,30,20,0.25)'); ctx.fillStyle = opt.fill || VG.theme.paper; VG.rrectPath(ctx, -w / 2, -h / 2, w, h, 10); ctx.fill(); ctx.restore();
    if (opt.lines !== false) {
      ctx.save(); ctx.strokeStyle = 'rgba(80,130,200,0.22)'; ctx.lineWidth = 2;
      for (let yy = -h / 2 + 150; yy < h / 2 - 30; yy += 64) { ctx.beginPath(); ctx.moveTo(-w / 2 + 24, yy); ctx.lineTo(w / 2 - 24, yy); ctx.stroke(); }
      if (opt.margin !== false) { ctx.strokeStyle = 'rgba(220,80,70,0.35)'; ctx.beginPath(); ctx.moveTo(-w / 2 + 96, -h / 2 + 20); ctx.lineTo(-w / 2 + 96, h / 2 - 20); ctx.stroke(); }
      ctx.restore();
    }
    if (content) { ctx.save(); ctx.translate(-w / 2, -h / 2); content(ctx, w, h); ctx.restore(); }
    ctx.restore();
  };
  // rounded card with soft shadow; content(ctx, w, h) centred-origin
  VG.card = (ctx, x, y, w, h, k, opt = {}, content) => VG.appear(ctx, x, y, k, (c) => {
    c.save(); VG.softShadow(c, 30, 12); c.fillStyle = opt.fill || VG.theme.card; VG.rrectPath(c, -w / 2, -h / 2, w, h, opt.r ?? 28); c.fill(); c.restore();
    if (opt.stroke) { c.lineWidth = opt.lw || 4; c.strokeStyle = opt.stroke; VG.rrectPath(c, -w / 2, -h / 2, w, h, opt.r ?? 28); c.stroke(); }
    if (content) content(c, w, h);
  }, opt.how || 'up');

  // ---------- text & data ----------
  // text typed character by character with a blinking caret; opt like VG.text (+ caret: true)
  VG.type = (ctx, str, x, y, k, opt = {}) => {
    const n = Math.round(clamp(k) * str.length), shown = str.slice(0, n);
    const o = { font: VG.FONT.ui, weight: 500, size: 40, align: 'left', ...opt };
    VG.text(ctx, shown, x, y, o);
    if (opt.caret !== false && (k < 1 || Math.floor((VG.time || 0) * 2) % 2 === 0)) {
      const w = VG.measure(ctx, shown, o), h = (o.size || 40) * 1.05, cx = o.align === 'center' ? x + w / 2 : x + w;
      ctx.save(); ctx.fillStyle = opt.caretColor || VG.theme.accent; ctx.fillRect(cx + 3, y - h / 2, 4, h); ctx.restore();
    }
  };
  // number counting up to `to`; opt: from (0), decimals (0), prefix, suffix, size (120), color, sep ('.')
  VG.count = (ctx, to, x, y, k, opt = {}) => {
    const v = lerp(opt.from || 0, to, E.outExpo(k)), d = opt.decimals || 0;
    let s = v.toFixed(d); if (opt.sep !== false) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, opt.sep || '.');
    VG.text(ctx, (opt.prefix || '') + s + (opt.suffix || ''), x, y, { size: opt.size || 120, weight: 800, color: opt.color || VG.theme.ink, alpha: clamp(k * 4), align: opt.align });
  };
  // horizontal progress / comparison bar; value 0..1 grows with k
  VG.bar = (ctx, x, y, w, h, value, k, opt = {}) => {
    ctx.save(); ctx.fillStyle = opt.track || VG.theme.soft; VG.rrectPath(ctx, x, y - h / 2, w, h, h / 2); ctx.globalAlpha *= clamp(k * 3); ctx.fill();
    const f = w * value * E.outQuint(k); if (f > 1) { ctx.fillStyle = opt.color || VG.theme.accent; VG.rrectPath(ctx, x, y - h / 2, Math.max(h, f), h, h / 2); ctx.fill(); }
    ctx.restore();
  };
  // pill button that can be pressed (press 0..1); opt: fill (accent), color (#fff), size (38)
  VG.button = (ctx, str, x, y, k, opt = {}) => VG.appear(ctx, x, y, k, (c) => {
    const size = opt.size || 38, w = VG.measure(c, str, { size, weight: 700, font: VG.FONT.ui }) + size * 1.6, h = size * 2, s = 1 - 0.06 * (opt.press || 0);
    c.scale(s, s); c.save(); VG.softShadow(c, 18, 8); c.fillStyle = opt.fill || VG.theme.accent; VG.rrectPath(c, -w / 2, -h / 2, w, h, h / 2); c.fill(); c.restore();
    VG.text(c, str, 0, 2, { size, weight: 700, font: VG.FONT.ui, color: opt.color || '#fff' });
  }, 'pop');
})();
