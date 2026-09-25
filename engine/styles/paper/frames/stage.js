// Frame "stage": full-bleed paper dioramas without a book. New scenes arrive as a fresh sheet
// of paper sliding over the old one; the ending shows the sticker (heart / star) over the last scene.
(function () {
  const VG = window.VG, { clamp, ease, win } = VG;
  VG.frames = VG.frames || {};
  VG.frames.stage = (story, T) => {
    const { W, H } = VG.FORMATS[story.format || '16:9'];
    const R = { layout: { w: W, h: H, gutter: false, single: true } };
    R.init = () => {};

    function drawScene(ctx, k, t) {
      const sc = VG.sceneDef(k), st = VG.sceneState(k, t);
      ctx.save();
      ctx.beginPath(); ctx.rect(-W / 2, -H / 2, W, H); ctx.clip();
      ctx.fillStyle = VG.paper('#f4ead3', true); ctx.fillRect(-W / 2, -H / 2, W, H);
      if (sc.bg) sc.bg(ctx, st);
      ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.55; ctx.fillStyle = VG.paper('#808080', true); ctx.fillRect(-W / 2, -H / 2, W, H); ctx.restore();
      if (sc.fg) sc.fg(ctx, st);
      if (sc.light) sc.light(ctx, st);
      ctx.restore();
    }

    R.closedView = null;
    R.openView = { z: 1 };
    R.toWorld = (x, y) => [x, y];
    R.clampCam = (c) => { c.z = Math.max(1, c.z); const xm = W / 2 - W / 2 / c.z, ym = H / 2 - H / 2 / c.z; c.x = clamp(c.x, -xm, xm); c.y = clamp(c.y, -ym, ym); return c; };

    R.draw = (ctx, t, tq) => {
      ctx.fillStyle = '#2a2320'; ctx.fillRect(-W, -H, W * 2, H * 2);
      const k = T.sceneAt(t), sc = T.scenes[k];
      const sliding = k > 0 && t < sc.start + T.turnDur;
      if (!sliding) return drawScene(ctx, k, tq);
      // the old scene stays put, the new sheet slides in from the right with a soft shadow
      drawScene(ctx, k - 1, tq);
      const p = ease.inOut((t - sc.start) / T.turnDur), x = (1 - p) * W * 1.04, rot = (1 - p) * -0.035;
      ctx.save(); ctx.fillStyle = `rgba(20,10,0,${0.25 * p})`; ctx.fillRect(-W / 2, -H / 2, W, H); ctx.restore();
      ctx.save(); ctx.translate(x, 0); ctx.rotate(rot);
      const s = VG.scaleOf(ctx);
      ctx.save(); ctx.shadowColor = 'rgba(20,10,0,0.55)'; ctx.shadowBlur = 40 * s; ctx.shadowOffsetX = -12 * s;
      ctx.fillStyle = '#f4ead3'; ctx.fillRect(-W / 2, -H / 2, W, H); ctx.restore();
      drawScene(ctx, k, tq);
      ctx.restore();
    };
    // sticker over the last scene at the end
    R.overlay = (ctx, t) => {
      const O = T.outro; if (!O.sticker || t < O.closeStart) return;
      ctx.save(); ctx.fillStyle = `rgba(15,8,4,${0.45 * ease.inOut(win(t, O.closeStart, O.closeDur))})`; ctx.fillRect(-W, -H, W * 2, H * 2); ctx.restore();
      VG.drawSticker(ctx, O.sticker, 0, -H * 0.04, VG.time - O.stickerAt, Math.min(W, H) / 1080 * 1.3);
    };
    return R;
  };
})();
