// Scenes of a clean-style explainer (docs/style-clean.md). Content coordinates: origin in the centre,
// st.L.w × st.L.h (9:16: 1080×1920). Lay out with fractions of w/h and scale sizes with u.
// Keep the caption band free (9:16: around y = +0.245·h) and stay inside the TikTok safe zone.
// Timing: st.pop(at) = appearance progress, st.prog(at, dur) = linear progress, st.word(line, word) = when a word is spoken.
(function () {
  const VG = window.VG;
  const U = (st) => Math.min(st.L.w, st.L.h) / 1080;

  // 1. hook: big headline, then an underline and a handwritten note when the narration gets there
  VG.scene('hook', {
    fg(ctx, st) {
      const { h } = st.L, u = U(st), th = VG.theme, y = -0.16 * h;
      VG.headline(ctx, ['Gähnen', 'steckt an'], 0, y, st.pop(0.05, 0.8), { size: 150 * u });
      const w2 = VG.measure(ctx, 'STECKT AN', { size: 150 * u, weight: 800 });
      VG.underline(ctx, -w2 / 2, y + 150 * u, w2 / 2, st.prog(st.word('vo1', 'Zufall') - 0.2, 0.4), { w: 12 * u });
      VG.appear(ctx, 0, y + 280 * u, st.pop(st.word('vo1', 'kein')), (c) => VG.text(c, 'kein zufall', 0, 0, { size: 56 * u, weight: 700, color: th.accent }), 'up');
      VG.write(ctx, 'sondern ein reflex in deinem kopf', 0, y + 360 * u, st.prog(st.word('vo1', 'Zufall') + 0.2, 1.2), { size: 44 * u });
    },
  });

  // 2. diagram: label boxes, a curve that draws itself, cool-air arrows, a loop on the key word
  VG.scene('hirn', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), th = VG.theme, cy = -0.12 * h;
      VG.label(ctx, 'Gehirn', 0, cy, st.pop(st.word('vo2', 'Gehirn')), { size: 70 * u });
      [-1, 0, 1].forEach((i) => VG.arrow(ctx, -0.42 * w, cy + i * 90 * u, -0.17 * w, cy + i * 50 * u, st.prog(st.word('vo2', 'kühlt') + i * 0.12, 0.5),
        { color: '#4a90c2', w: 8 * u, bend: 0.12 * i, headSize: 24 * u }));
      VG.write(ctx, 'kühle luft', -0.3 * w, cy + 190 * u, st.prog(st.word('vo2', 'kühlt'), 0.7), { size: 44 * u, color: '#4a90c2' });
      VG.loop(ctx, 0, cy, 250 * u, 105 * u, st.prog(st.word('vo2', 'Ventilator'), 0.7), { w: 9 * u });
      VG.appear(ctx, 0, cy + 260 * u, st.pop(st.word('vo2', 'Ventilator')), (c) => VG.text(c, 'wie ein ventilator', 0, 0, { size: 52 * u, weight: 700, color: th.accent }), 'up');
      VG.ripple(ctx, 0.3 * w, cy - 170 * u, 60 * u, st.since('vo2', 'Forscher'), { n: 3 });
      VG.mark(ctx, '?', 0.3 * w, cy - 170 * u, st.pop(st.word('vo2', 'vermuten')), { size: 110 * u });
    },
  });

  // 3. a sheet of paper that gets written on
  VG.scene('notiz', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), sw = Math.min(0.78 * w, 840 * u), sh = 0.5 * h;
      VG.sheet(ctx, 0, -0.12 * h, sw, sh, st.pop(0, 0.6), {}, (c) => {
        const x = 130 * u, ink = '#23407a';
        VG.write(c, 'Gähnen = ansteckend', x, 125 * u, st.prog(st.word('vo3', 'steckt'), 0.9), { size: 62 * u, align: 'left', color: ink, weight: 700 });
        VG.write(c, '→ dein gehirn macht', x, 253 * u, st.prog(st.word('vo3', 'Gehirn'), 0.9), { size: 56 * u, align: 'left', color: ink });
        VG.write(c, 'andere unbewusst nach', x, 381 * u, st.prog(st.word('vo3', 'unbewusst'), 1.0), { size: 56 * u, align: 'left', color: ink });
        const tw = VG.measure(c, 'andere unbewusst nach', { size: 56 * u, weight: 600, font: VG.FONT.hand });   // circle the written line
        VG.loop(c, x + tw / 2, 381 * u, tw / 2 + 36 * u, 58 * u, st.prog(st.word('vo3', 'nachmacht'), 0.6), { w: 8 * u });
        VG.tick(c, sw - 120 * u, 125 * u, 70 * u, st.prog(st.word('vo3', 'nachmacht') + 0.6, 0.4));
      });
    },
  });

  // 4. a desktop window with a search, typed text and a pointer that clicks
  const CLICKS = [[0.2, 0.45, 0.42], [1.6, 0.05, -0.155, 'click'], [3.3, 0.02, -0.02, 'click'], [4.3, 0.18, 0.08]];
  VG.scene('suche', {
    fg(ctx, st) {
      const { w, h } = st.L, u = U(st), ww = Math.min(0.84 * w, 920 * u), wh = 0.4 * h;
      const keys = CLICKS.map(([t, x, y, c]) => [t, x * w, y * h, c]);
      VG.window(ctx, 0, -0.12 * h, ww, wh, st.pop(0, 0.6), { title: 'Suche' }, (c, cw) => {
        c.save(); c.fillStyle = '#f1f2f5'; VG.rrectPath(c, 50 * u, 60 * u, cw - 100 * u, 92 * u, 46 * u); c.fill(); c.restore();
        VG.type(c, 'Spiegelneuronen', 95 * u, 106 * u, st.prog(st.word('vo4', 'Spiegelneuronen') - 0.2, 1.0), { size: 44 * u, color: '#1d1d1f' });
        VG.button(c, 'Suchen', cw / 2, 250 * u, st.pop(0.8), { size: 36 * u, press: VG.pointerAt(st.lt, keys).since < 0.2 && st.lt > 3 ? 1 : 0 });
        [0.85, 0.6, 0.35].forEach((v, i) => VG.bar(c, 70 * u, 370 * u + i * 62 * u, cw - 140 * u, 24 * u, v, st.prog(3.5 + i * 0.15, 0.6)));
      });
      VG.pointer(ctx, st.lt, keys, { scale: 1.7 * u });
    },
    // scene sounds: [lt, file, gain, opts] – lt relative to the scene opening
    sfx: [[0.05, 'ui_open.wav', 0.5], [1.6, 'mouse_click.wav', 0.9], [3.3, 'mouse_click.wav', 0.9], [3.5, 'ui_pop.wav', 0.4]],
  });
})();
