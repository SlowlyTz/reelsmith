// Style "clean", frame "board": a flat full-bleed surface in the theme colour (sketch-note look).
// Scenes change with a quick crossfade (default), a horizontal slide or a hard cut:
// story.board = { transition: 'fade' | 'slide' | 'cut', grain: 0.035, grid: false }.
// VG.cleanFrame is shared with the "desktop" frame, which only swaps the background.
(function () {
  const VG = window.VG, { clamp, ease } = VG;
  VG.frames = VG.frames || {};

  function grainTile(alpha) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), img = g.createImageData(256, 256), rnd = VG.rng(99);
    for (let i = 0; i < img.data.length; i += 4) { const v = rnd() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255 * alpha; }
    g.putImageData(img, 0, 0); return c;
  }

  VG.cleanFrame = (story, T, drawBg, opt = {}) => {
    const { W, H } = VG.FORMATS[story.format || '16:9'];
    const B = { transition: 'fade', grain: 0.035, ...opt, ...(story.board || {}) };
    const R = { layout: { w: W, h: H, gutter: false, single: true }, fold: false, drift: 0 };
    let grain = null;
    R.init = () => { grain = B.grain ? grainTile(B.grain) : null; };
    R.closedView = null; R.openView = { z: 1 };
    R.toWorld = (x, y) => [x, y];
    R.clampCam = (c) => { c.z = Math.max(1, c.z); const xm = W / 2 - W / 2 / c.z, ym = H / 2 - H / 2 / c.z; c.x = clamp(c.x, -xm, xm); c.y = clamp(c.y, -ym, ym); return c; };

    function drawScene(ctx, k, t) {
      const sc = VG.sceneDef(k), st = VG.sceneState(k, t);
      VG.graded(ctx, sc.grade ? sc.grade(st) : null, (c) => {   // grade.js: optional per-scene colour grade
        if (sc.bg) sc.bg(c, st);
        if (sc.fg) sc.fg(c, st);
      });
    }
    R.draw = (ctx, t) => {
      drawBg(ctx, W, H, B);
      if (grain) { ctx.save(); ctx.globalCompositeOperation = VG.theme.bg && parseInt(VG.theme.bg.slice(1, 3), 16) < 80 ? 'screen' : 'multiply'; ctx.fillStyle = ctx.createPattern(grain, 'repeat'); ctx.fillRect(-W, -H, W * 2, H * 2); ctx.restore(); }
      const k = T.sceneAt(t), sc = T.scenes[k], p = k > 0 ? clamp((t - sc.start) / T.turnDur) : 1;
      if (p >= 1 || B.transition === 'cut') return drawScene(ctx, k, t);
      if (B.transition === 'slide') {
        const e = ease.inOut(p);
        ctx.save(); ctx.translate(-e * W, 0); drawScene(ctx, k - 1, t); ctx.restore();
        ctx.save(); ctx.translate((1 - e) * W, 0); drawScene(ctx, k, t); ctx.restore();
        return;
      }
      ctx.save(); ctx.globalAlpha = 1 - ease.out(Math.min(1, p * 1.6)); drawScene(ctx, k - 1, t); ctx.restore();
      drawScene(ctx, k, t);
    };
    return R;
  };

  VG.frames.board = (story, T) => VG.cleanFrame(story, T, (ctx, W, H, B) => {
    ctx.fillStyle = VG.theme.bg; ctx.fillRect(-W, -H, W * 2, H * 2);
    if (B.grid) {   // faint dot grid (whiteboard / notebook look)
      ctx.save(); ctx.fillStyle = VG.rgba(VG.theme.ink, 0.09);
      for (let y = -H / 2 + 30; y < H / 2; y += 54) for (let x = -W / 2 + 30; x < W / 2; x += 54) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  });
})();
