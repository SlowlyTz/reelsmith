// Style "clean": colour grading per scene – grey/dark worlds that come alive.
// A scene may return a grade from `grade(st)`; the frame then draws bg + fg into a layer and
// composites it with a filter:
//   grade: (st) => ({ sat: 0..1+, light: -1..1, contrast: 0..2,
//                     reveal: { x, y, r, soft: 0.35, sat: 1, light: 0 } })
// sat 0 = black & white, 1 = untouched; light = brightness offset (−0.3 = darker);
// reveal = a soft-edged circle (content coordinates) inside which the scene shows its own colour –
// grow r from 0 to beyond the screen diagonal to let colour spread out from a point.
// Paint a full background in the scene's bg when grading (the theme background is not graded).
(function () {
  const VG = window.VG, { clamp } = VG;
  const layers = [];
  const layer = (i, W, H) => {
    let c = layers[i];
    if (!c || c.width !== W || c.height !== H) c = layers[i] = VG.mk(W, H);
    const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.clearRect(0, 0, W, H);
    return c;
  };
  const filter = (sat = 1, light = 0, contrast = 1) => {
    const f = [];
    if (sat !== 1) f.push(`saturate(${Math.max(0, sat).toFixed(3)})`);
    if (light) f.push(`brightness(${Math.max(0, 1 + light).toFixed(3)})`);
    if (contrast !== 1) f.push(`contrast(${Math.max(0, contrast).toFixed(3)})`);
    return f.length ? f.join(' ') : 'none';
  };

  // the identity grade needs no layer
  VG.gradeIsPlain = (g) => !g || ((g.sat ?? 1) === 1 && !g.light && (g.contrast ?? 1) === 1 && !g.reveal);

  // draw(ctx) into a layer with the current transform, then composite it graded onto ctx
  VG.graded = (ctx, g, draw) => {
    if (VG.gradeIsPlain(g)) return draw(ctx);
    const W = ctx.canvas.width, H = ctx.canvas.height, m = ctx.getTransform();
    const base = layer(0, W, H), b = base.getContext('2d');
    b.setTransform(m); draw(b);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = filter(g.sat ?? 1, g.light || 0, g.contrast ?? 1); ctx.drawImage(base, 0, 0); ctx.filter = 'none';
    const R = g.reveal;
    if (R && R.r > 0) {
      const p = m.transformPoint(new DOMPoint(R.x || 0, R.y || 0)), r = R.r * Math.hypot(m.a, m.b), soft = clamp(R.soft ?? 0.35, 0.01, 1);
      const top = layer(1, W, H), c = top.getContext('2d');
      c.filter = filter(R.sat ?? 1, R.light || 0, R.contrast ?? 1); c.drawImage(base, 0, 0); c.filter = 'none';
      const gr = c.createRadialGradient(p.x, p.y, r * (1 - soft), p.x, p.y, r);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalCompositeOperation = 'destination-in'; c.fillStyle = gr; c.fillRect(0, 0, W, H);
      ctx.drawImage(top, 0, 0);
    }
    ctx.restore();
  };
  // radius that covers the whole surface from (x, y) – for a reveal that ends full screen
  VG.coverRadius = (L, x = 0, y = 0) => Math.hypot(L.w / 2 + Math.abs(x), L.h / 2 + Math.abs(y)) * 1.05;
})();
