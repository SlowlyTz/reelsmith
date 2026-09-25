// Screen-space finishing for the paper look: warm lamp grade, vignette, per-frame exposure
// flicker (every "photo" is slightly different), film grain and fades from/to black.
(function () {
  const VG = window.VG, { win } = VG;
  let FILM = null;
  VG.post = (ctx, t, W, H, T) => {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const lg = ctx.createRadialGradient(W * 0.42, H * 0.3, 80, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    lg.addColorStop(0, 'rgba(255,214,150,0.55)'); lg.addColorStop(1, 'rgba(60,30,10,0.5)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.62);
    vg.addColorStop(0, 'rgba(10,4,0,0)'); vg.addColorStop(1, 'rgba(10,4,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const fl = (VG.hash(VG.frame, 77) - 0.5) * 0.035;
    ctx.fillStyle = fl > 0 ? `rgba(255,240,220,${fl})` : `rgba(0,0,0,${-fl})`; ctx.fillRect(0, 0, W, H);
    if (!FILM) FILM = ctx.createPattern(VG.GRAIN, 'repeat');
    const gi = Math.floor(t * 24);
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16;
    ctx.translate((VG.hash(gi, 1) * 512) | 0, (VG.hash(gi, 2) * 512) | 0);
    ctx.fillStyle = FILM; ctx.fillRect(-512, -512, W + 1024, H + 1024);
    ctx.restore();
    const f = Math.max(1 - win(t, 0, 0.9), win(t, T.outro.fadeStart, T.outro.fadeDur));
    if (f > 0) { ctx.fillStyle = `rgba(0,0,0,${f})`; ctx.fillRect(0, 0, W, H); }
  };
})();
