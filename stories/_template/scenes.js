// Scene choreography of this story. Coordinates: content space, origin in the centre,
// st.L.w × st.L.h (16:9 book: 1680×960 double spread with the gutter at x=0;
// 9:16 book: one 940×1680 page; stage: the full frame). Always lay out relative to st.L.
// st.lt = seconds since the scene is open, st.pop(at) = pop-up factor, st.word(line, word) = when a word is spoken.
(function () {
  const VG = window.VG, { lerp, ease, win } = VG;
  const INK = '#3b2a1c', SEPIA = '#8a6440';

  // ------------------------------------------------------------------ 1. title page
  VG.scene('anfang', {
    bg(ctx, st) {
      const { w, h, gutter } = st.L, cx = gutter ? w / 4 : 0, pw = gutter ? w / 2 : w;
      if (gutter) { // left half is the inside of the cover: patterned endpaper
        ctx.fillStyle = VG.paper('#35606a', true); ctx.fillRect(-w / 2, -h / 2, w / 2, h);
        ctx.save(); ctx.globalAlpha = 0.28;
        for (let r = 0; r < h / 64; r++) for (let c = 0; c < w / 2 / 68; c++) VG.star(ctx, -w / 2 + 20 + c * 68 + (r % 2) * 34, -h / 2 + 30 + r * 64, 0.42, '#f0d9a0', 0);
        ctx.restore();
      }
      ctx.save(); ctx.strokeStyle = VG.rgba(SEPIA, 0.75); ctx.lineWidth = 2.2;
      ctx.strokeRect(cx - pw / 2 + 70, -h / 2 + 60, pw - 140, h - 120); ctx.restore();
      // "Es war einmal …" appears with the narrator, letter by letter
      const v = st.lt - st.line('vo1').start, text = 'Es war einmal …';
      ctx.save(); ctx.font = 'italic 88px "IM Fell English"'; ctx.textAlign = 'left';
      let x = cx - ctx.measureText(text).width / 2;
      for (let i = 0; i < text.length; i++) {
        const a = win(v, i * 0.065, 0.12);
        if (a > 0) { ctx.globalAlpha = a; ctx.fillStyle = VG.paper(i === 0 ? '#a8323a' : INK, true); ctx.fillText(text[i], x, 20); }
        x += ctx.measureText(text[i]).width;
      }
      ctx.restore();
      const kd = win(v, 1.0, 0.4);
      if (kd > 0) VG.text(ctx, VG.story.book?.cover?.subtitle || '', cx, 110, '32px "IM Fell English SC"', SEPIA, { alpha: kd, spacing: 3 });
    },
    fg(ctx, st) {
      const { w, h, gutter } = st.L, cx = gutter ? w / 4 : 0, top = -h / 2, t = st.lt;
      VG.hang(ctx, cx, top, h * 0.18, st.pop(0.1, 0.5), t, (c) => VG.moon(c, 0, 58, 60, 1, 'moon1', '#f3d27a', 0), 'moon1', 0);
      VG.hang(ctx, cx - 180, top, h * 0.12, st.pop(0.35, 0.5), t, (c) => VG.star(c, 0, 26, 1, '#f2c14e', 1.2), 'st1', 1);
      VG.hang(ctx, cx + 200, top, h * 0.1, st.pop(0.55, 0.5), t, (c) => VG.star(c, 0, 26, 0.8, '#f6d88a', 1.2), 'st2', 2);
    },
    camera: [[0, 0, 0, 1.04], [2.5, 60, 0, 1.08]],
  });

  // ------------------------------------------------------------------ 2. the forest
  VG.scene('wald', {
    bg(ctx, st) {
      const { w, h } = st.L;
      VG.sky(ctx, -w / 2, w / 2, -h / 2, h * 0.3, ['#8ebfd9', '#cfe6ee', '#f5ead0']);
      VG.print(ctx, VG.range('waldFar' + w, [[-w * 0.5, -h * 0.02], [-w * 0.3, -h * 0.12], [-w * 0.08, -h * 0.03], [w * 0.15, -h * 0.14], [w * 0.38, -h * 0.04], [w * 0.52, -h * 0.1]], h), '#aab4d6', 0.9);
    },
    fg(ctx, st) {
      const { w, h } = st.L, P = st.pop, t = st.lt, ground = h * 0.3, s = Math.min(w, h) / 900;
      VG.sun(ctx, -w * 0.36, -h * 0.34, 58, t, P(0.05));
      VG.cloud(ctx, -w * 0.1 + t * 6, -h * 0.33, 0.9, P(0.15), 'c1');
      VG.cloud(ctx, w * 0.3 + t * 4, -h * 0.26, 0.7, P(0.25), 'c2');
      VG.pop(ctx, 0, h / 2, P(0.1), (c) => { c.translate(0, -h / 2); VG.piece(c, VG.hill('waldHill' + w, [-w * 0.6, ground - 30, -w * 0.2, ground - 60, w * 0.15, ground - 30, w * 0.6, ground - 55], h / 2 + 10), '#7aab76', 2); }, 'hill');
      const trees = [[-0.44, 'p', 190], [-0.3, 'r', 170], [-0.12, 'p', 150], [0.14, 'r', 200], [0.3, 'p', 170], [0.44, 'r', 150]];
      trees.forEach(([fx, kind, th], i) => (kind === 'p' ? VG.pine : VG.roundTree)(ctx, w * fx, ground - 30, th * s, i % 2 ? '#4c8a6c' : '#3c6e57', P(0.2 + i * 0.06), 'tree' + i));
      for (let i = 0; i < 7; i++) VG.flower(ctx, -w * 0.42 + i * w * 0.13, ground + 70 + (i % 2) * 30, ['#f28b9a', '#f6c453', '#fbf4ea', '#c79be0'][i % 4], P(0.5 + i * 0.05), 'fl' + i);
      VG.fireflies(ctx, 'waldFF', [-w * 0.45, -h * 0.2, w * 0.9, h * 0.35], 12, t, P(0.6));
      // Lina walks in and stops when her name is spoken
      const tName = st.word('vo2', 'Lina'), walkEnd = tName + 0.2;
      const stopX = st.L.gutter ? -w * 0.14 : 0, x = lerp(-w * 0.42, stopX, ease.inOut(win(t, 0.3, walkEnd - 0.3))), walking = t > 0.3 && t < walkEnd;
      const wave = win(t, tName + 0.3, 0.2) * (1 - win(t, tName + 2.2, 0.3));
      VG.pop(ctx, x, ground + 30, P(0.25), (c) => VG.puppet(c, 'lina', { scale: 1.1 * s, walk: walking ? t * 9 : null, lookX: walking ? 4 : 0,
        armR: 8 + wave * (140 + Math.sin(t * 14) * 16), mouth: wave > 0.5 ? 'open' : 'smile', blink: VG.blinkAt(t, 3) }), 'lina');
      VG.banner(ctx, stopX, ground + 120, 'Lina', VG.popK(t, tName, 0.45) * st.fold, 'bn');
    },
    camera: [[0, -120, 40, 1.1], [3.5, 0, 60, 1.22], [7.5, 40, 40, 1.12]],
    sfx: [[-0.8, 'forest_ambience_1.wav', 0.5, { bus: 'amb', dur: 9, fadeIn: 1, fadeOut: 1.5 }]],
  });

  // ------------------------------------------------------------------ 3. the night sky
  const night = (st) => VG.smooth(win(st.lt, 0.5, 3.5));
  VG.scene('nacht', {
    bg(ctx, st) {
      const { w, h } = st.L;
      VG.skyBlend(ctx, -w / 2, w / 2, -h / 2, h * 0.3, ['#7b6aa6', '#d9879c', '#f6b27f', '#fdd79e'], ['#141b43', '#26306a', '#4b4a86', '#8a6a93'], night(st));
    },
    fg(ctx, st) {
      const { w, h } = st.L, P = st.pop, t = st.lt, n = night(st), ground = h * 0.3, s = Math.min(w, h) / 900;
      VG.pop(ctx, 0, ground + 60, P(0.1), (c) => VG.piece(c, VG.skyline('nachtSky' + w, -w / 2 - 10, w / 2 + 10, 0, 42, 60, h * 0.2), VG.mix('#8f7aa0', '#2c2f5a', n * 0.8), 1.4), 'sky');
      VG.pop(ctx, 0, h / 2, P(0.15), (c) => { c.translate(0, -h / 2); VG.piece(c, VG.hill('nachtHill' + w, [-w * 0.6, ground + 40, 0, ground + 20, w * 0.6, ground + 45], h / 2 + 10), VG.mix('#7aab76', '#34506a', n), 2); }, 'hill');
      VG.pop(ctx, st.L.gutter ? -w * 0.18 : 0, ground + 70, P(0.25), (c) => VG.puppet(c, 'lina', { scale: 1.1 * s, lookY: -4.5 * win(t, 1, 0.5), headTilt: 3, happyEyes: t > st.word('vo3', 'leuchtete'), blink: VG.blinkAt(t, 9) }), 'lina');
      if (n > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = VG.mix('#ffffff', '#5d67a8', n * 0.55); ctx.fillRect(-w, -h, w * 2, h * 2); ctx.restore(); }
      VG.moon(ctx, -w * 0.3, -h * 0.3, 55, VG.popK(t, 1.2, 0.5) * st.fold, 'moon');
      VG.starField(ctx, 'nachtStars', [-w * 0.48, -h * 0.47, w * 0.96, h * 0.55], 24, t, st.word('vo3', 'Sterne'), 2.2, st.fold);
      VG.shootingStar(ctx, t, st.word('vo3', 'Himmel'), [-w * 0.2, -h * 0.42], [w * 0.25, -h * 0.3]);
      VG.constellation(ctx, VG.heartPoints(w * 0.18, -h * 0.28, Math.min(w, h) * 0.12), t, st.word('vo3', 'leuchtete'), st.word('vo3', 'leuchtete') + 0.4, st.fold);
    },
    camera: [[0, 0, 40, 1.08], [6, 0, -20, 1.18]],
    sfx: [[1.5, 'night_ambience_1.wav', 0.45, { bus: 'amb', dur: 8, fadeIn: 2, fadeOut: 1.5 }]],
  });
})();
