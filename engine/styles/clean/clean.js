// Style "clean": flat, smooth motion graphics – sketch-note explainers, desktop/UI demos.
// Fluid animation at the output frame rate (no stop-motion), crisp ink lines that draw themselves,
// bold typography, a single accent colour, soft shadows. Everything is laid out in content
// coordinates (origin centre, st.L.w × st.L.h) and animated with progress values k ∈ [0, 1]
// (st.pop(at) = eased-in appearance, st.prog(at, dur) = linear progress).
(function () {
  const VG = window.VG, { clamp, lerp, win } = VG;

  // ---------- theme ----------
  // colours used by every helper; story.theme = "sand" | "paper" | "night" or { ...overrides }
  const THEMES = {
    sand: { bg: '#d3c7b3', ink: '#1f1b18', accent: '#d35d36', muted: '#7c7064', soft: '#bfb29c', paper: '#f6f1e7', card: '#ddd2c0', highlight: '#f5ee1f', shadow: 'rgba(70,52,30,0.28)' },
    paper: { bg: '#f7f5f0', ink: '#16181d', accent: '#2f6bff', muted: '#6b7280', soft: '#d9d6cf', paper: '#ffffff', card: '#ffffff', highlight: '#ffd400', shadow: 'rgba(20,24,40,0.16)' },
    night: { bg: '#15171c', ink: '#f2f1ee', accent: '#ff6b4a', muted: '#9097a3', soft: '#3a3e47', paper: '#22252c', card: '#23262e', highlight: '#ffe14a', shadow: 'rgba(0,0,0,0.5)' },
  };
  VG.theme = { ...THEMES.sand };
  VG.THEMES = THEMES;

  // fonts (loaded by engine/page.html before the first frame)
  VG.FONT = { head: 'Montserrat', ui: 'Inter', hand: 'Caveat', mono: '"JetBrains Mono"' };
  const font = (weight, px, fam = VG.FONT.head) => `${weight} ${Math.round(px)}px ${fam}`;
  VG.font = font;

  VG.styles = VG.styles || {};
  VG.styles.clean = {
    init: () => {
      const th = VG.story.theme;
      VG.theme = { ...THEMES.sand, ...(typeof th === 'string' ? THEMES[th] || {} : { ...(THEMES[th?.base] || {}), ...(th || {}) }) };
      VG.frame = 0;
    },
    fonts: ['800 20px Montserrat', '700 20px Montserrat', '600 20px Montserrat', '500 20px Inter', '600 20px Inter', '700 20px Caveat', '500 20px Caveat', '500 20px "JetBrains Mono"'],
  };

  // ---------- motion ----------
  // st.pop(at, dur) → linear 0..1 over dur (default 0.45 s); helpers apply their own easing
  VG.popK = (lt, at = 0, dur = 0.45) => clamp((lt - at) / dur, 0, 1);
  const E = VG.ease;
  E.outQuint = (t) => 1 - Math.pow(1 - clamp(t), 5);
  E.outExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)));
  E.inOutSine = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
  // damped spring 0 → 1 (overshoots slightly, settles) – for pops and scale-ins
  E.spring = (t, bounce = 0.35) => { t = clamp(t); if (t >= 1) return 1; const w = 9, z = 1 - bounce; return 1 - Math.exp(-z * w * t) * Math.cos(w * Math.sqrt(1 - z * z) * t * 1.35); };

  // draw fn(ctx) appearing at (x, y) with progress k: 'pop' (spring scale), 'up' (rise + fade), 'fade', 'left'/'right'
  VG.appear = (ctx, x, y, k, fn, how = 'pop') => {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y);
    const a = clamp(k * 2.2);
    if (how === 'pop') { const s = E.spring(k); ctx.scale(s, s); ctx.globalAlpha *= a; }
    else if (how === 'up') { ctx.translate(0, (1 - E.outQuint(k)) * 36); ctx.globalAlpha *= E.outQuint(k); }
    else if (how === 'left' || how === 'right') { ctx.translate((1 - E.outQuint(k)) * (how === 'left' ? -60 : 60), 0); ctx.globalAlpha *= E.outQuint(k); }
    else ctx.globalAlpha *= E.inOutSine(k);
    fn(ctx); ctx.restore();
  };
  // fade something back to a "ghost" (reference look: old elements stay faintly visible)
  VG.ghost = (ctx, k, fn, to = 0.28) => { ctx.save(); ctx.globalAlpha *= lerp(1, to, E.inOutSine(k)); fn(ctx); ctx.restore(); };

  // soft drop shadow for the next fill/stroke (content scale aware)
  VG.softShadow = (ctx, blur = 18, dy = 8, col = VG.theme.shadow) => {
    const s = VG.scaleOf ? VG.scaleOf(ctx) : 1;
    ctx.shadowColor = col; ctx.shadowBlur = blur * s; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = dy * s;
  };
  VG.scaleOf = (ctx) => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b); };

  // ---------- text ----------
  // plain text; opt: size, weight, font, color, align, base, alpha, spacing, maxWidth
  VG.text = (ctx, str, x, y, opt = {}) => {
    ctx.save();
    ctx.font = font(opt.weight || 700, opt.size || 48, opt.font || VG.FONT.head);
    ctx.textAlign = opt.align || 'center'; ctx.textBaseline = opt.base || 'middle';
    if (opt.spacing) ctx.letterSpacing = opt.spacing + 'px';
    if (opt.alpha != null) ctx.globalAlpha *= opt.alpha;
    if (opt.shadow) VG.softShadow(ctx, 10, 4);
    ctx.fillStyle = opt.color || VG.theme.ink;
    const mw = opt.maxWidth; if (mw) { const w = ctx.measureText(str).width; if (w > mw) { ctx.translate(x, y); ctx.scale(mw / w, 1); ctx.fillText(str, 0, 0); ctx.restore(); return; } }
    ctx.fillText(str, x, y); ctx.restore();
  };
  VG.measure = (ctx, str, opt = {}) => { ctx.save(); ctx.font = font(opt.weight || 700, opt.size || 48, opt.font || VG.FONT.head); if (opt.spacing) ctx.letterSpacing = opt.spacing + 'px'; const w = ctx.measureText(str).width; ctx.restore(); return w; };

  // big bold headline, one or more lines; words rise in one after another over k
  // opt: size (110), color, lh (1.02), weight (800), upper (true), stagger (0.12 of k per word)
  VG.headline = (ctx, lines, x, y, k, opt = {}) => {
    if (k <= 0) return;
    const L = (Array.isArray(lines) ? lines : [lines]).map((l) => (opt.upper === false ? l : l.toUpperCase()));
    const size = opt.size || 110, lh = size * (opt.lh || 1.02), words = L.map((l) => l.split(' '));
    const n = words.flat().length, st = Math.min(opt.stagger ?? 0.12, 0.6 / Math.max(1, n - 1));
    let i = 0;
    ctx.save(); ctx.font = font(opt.weight || 800, size); ctx.textBaseline = 'middle';
    const sp = ctx.measureText(' ').width;
    words.forEach((ws, r) => {
      const widths = ws.map((w) => ctx.measureText(w).width), total = widths.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
      let cx = x - (opt.align === 'left' ? 0 : opt.align === 'right' ? total : total / 2);
      const cy = y + (r - (L.length - 1) / 2) * lh;
      ws.forEach((w, j) => {
        const kk = clamp((k - i * st) / Math.max(0.2, 1 - (n - 1) * st)); i++;
        if (kk > 0) {
          ctx.save(); ctx.globalAlpha *= E.outQuint(kk); ctx.translate(0, (1 - E.outQuint(kk)) * size * 0.35);
          ctx.fillStyle = (opt.colors && opt.colors[i - 1]) || opt.color || VG.theme.ink; ctx.textAlign = 'left'; ctx.fillText(w, cx, cy); ctx.restore();
        }
        cx += widths[j] + sp;
      });
    });
    ctx.restore();
  };

  // handwriting that writes itself left → right (glyph by glyph with a soft pen edge)
  // opt: size (40), color (muted), font (hand), weight (600), align, rot (radians)
  VG.write = (ctx, str, x, y, k, opt = {}) => {
    if (k <= 0) return;
    ctx.save(); ctx.translate(x, y); if (opt.rot) ctx.rotate(opt.rot);
    ctx.font = font(opt.weight || 600, opt.size || 40, opt.font || VG.FONT.hand);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const w = ctx.measureText(str).width, x0 = opt.align === 'left' ? 0 : opt.align === 'right' ? -w : -w / 2;
    const size = opt.size || 40, edge = size * 0.6, reveal = E.inOutSine(k) * (w + edge);
    ctx.fillStyle = opt.color || VG.theme.muted;
    if (reveal >= w + edge - 0.5) { ctx.fillText(str, x0, 0); ctx.restore(); return; }
    // hard-clip up to the pen, then a soft edge via a gradient mask on a small offscreen strip
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - size, -size, reveal - edge + size, size * 2); ctx.clip(); ctx.fillText(str, x0, 0); ctx.restore();
    const g = ctx.createLinearGradient(x0 + reveal - edge, 0, x0 + reveal, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + reveal - edge, -size, edge, size * 2); ctx.clip();
    const c = opt.color || VG.theme.muted; g.addColorStop(0, c); g.addColorStop(1, VG.rgba(c, 0));
    ctx.fillStyle = g; ctx.fillText(str, x0, 0); ctx.restore();
    ctx.restore();
  };

  // text in a rounded label box ("HIRN", "KIEFER"); the box outline draws itself, then the text fades in
  // opt: size (44), pad, fill (card), ink, weight (800), upper (true), r (radius), w/h (fixed box)
  VG.label = (ctx, str, x, y, k, opt = {}) => {
    if (k <= 0) return;
    const t = opt.upper === false ? str : str.toUpperCase(), size = opt.size || 44, ink = opt.ink || VG.theme.ink;
    const tw = VG.measure(ctx, t, { size, weight: opt.weight || 800 }), pad = opt.pad ?? size * 0.55;
    const w = opt.w || tw + pad * 2, h = opt.h || size * 1.7, r = opt.r ?? size * 0.3, lw = opt.lw || Math.max(3, size * 0.1);
    ctx.save(); ctx.translate(x, y);
    const kb = clamp(k / 0.65), kt = clamp((k - 0.4) / 0.6);
    ctx.globalAlpha *= clamp(k * 3);
    ctx.save(); VG.softShadow(ctx, 16, 7); ctx.fillStyle = opt.fill || VG.theme.card; ctx.globalAlpha *= E.outQuint(kb);
    VG.rrectPath(ctx, -w / 2, -h / 2, w, h, r); ctx.fill(); ctx.restore();
    VG.inkRect(ctx, -w / 2, -h / 2, w, h, r, kb, { color: ink, w: lw, shadow: false });
    if (kt > 0) VG.text(ctx, t, 0, size * 0.04, { size, weight: opt.weight || 800, color: opt.color || ink, alpha: E.outQuint(kt) });
    ctx.restore();
  };
  VG.rrectPath = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

  // quick deterministic helpers for scenes
  VG.seq = (lt, keys) => { let v = keys[0][1]; for (const [t, val] of keys) if (lt >= t) v = val; return v; };   // step value by time
  VG.wave = (lt, speed = 1, amp = 1, phase = 0) => Math.sin((lt * speed + phase) * Math.PI * 2) * amp;
  VG.between = (lt, a, b, fade = 0.25) => win(lt, a, fade) * (1 - win(lt, b - fade, fade));                    // 0..1 visible window
})();
