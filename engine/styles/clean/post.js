// Style "clean": screen-space finish – quick fade in from the background colour, fade out at the
// end, optional channel branding (story.brand = { name: 'sagt ja keiner.', handle: '@name' }).
(function () {
  const VG = window.VG, { clamp, win } = VG;
  VG.post = (ctx, t, W, H, T) => {
    const b = VG.story.brand;
    if (b) {   // handwritten channel name, top-left inside the TikTok safe zone
      const s = Math.min(W, H) / 1080, x = W * 0.075, y = H * (H > W ? 0.1 : 0.08);
      ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      if (b.name) { ctx.font = `600 ${Math.round(46 * s)}px ${VG.FONT.hand}`; ctx.fillStyle = VG.rgba(VG.theme.muted, 0.9); ctx.fillText(b.name, x, y); }
      if (b.handle) { ctx.font = `700 ${Math.round(36 * s)}px ${VG.FONT.hand}`; ctx.fillStyle = VG.theme.accent; ctx.fillText(b.handle, x, y + 46 * s); }
      ctx.restore();
    }
    const fin = 1 - clamp(t / 0.18), fout = win(t, T.outro.fadeStart, T.outro.fadeDur);
    const a = Math.max(fin, fout);
    if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = VG.story.fadeTo || VG.theme.bg; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  };
})();
