// Light music bed + sounds synced to spoken words (docs/audio.md). Keep music quiet under fast narration.
VG.compose = (M, T) => {
  const W = (id, w) => { const l = T.lines[id], x = l.words.find((v) => v[0].toLowerCase().replace(/[^\p{L}]/gu, '').startsWith(w)); return x ? x[1] : l.start; };
  const bars = M.bars(), prog = ['F', 'Dm', 'Bb', 'C'];
  for (let b = 0; b < bars; b++) { const c = prog[Math.floor(b / 2) % 4]; M.harp(b, c, 0.3); if (b % 2 === 0) M.pad(b, c, 2, 0.16, ['violas']); }
  M.mel('celesta', 0, [['A5', 1], ['C6', 1], ['F6', 2]], 0.28);
  // sounds on words and drawing moments
  M.sfx(0.1, 'ui_pop.wav', 0.5);
  M.sfx(W('vo1', 'zufall') - 0.2, 'marker_line.wav', 0.55, { dur: 0.5 });
  M.sfx(W('vo1', 'zufall') + 0.2, 'pen_write_1.wav', 0.35, { dur: 1.2, fadeOut: 0.2 });
  M.sfx(W('vo2', 'gehirn'), 'ui_pluck_1.wav', 0.6);
  M.sfx(W('vo2', 'kühlt'), 'synth:whoosh', 0.35);
  M.sfx(W('vo2', 'ventilator'), 'marker_circle.wav', 0.6);
  M.sfx(W('vo3', 'steckt'), 'pen_write_2.wav', 0.35, { dur: 2.6, fadeOut: 0.3 });
  M.sfx(W('vo3', 'nachmacht'), 'marker_circle.wav', 0.55);
  M.sfx(W('vo3', 'nachmacht') + 0.6, 'ui_confirm.wav', 0.35);
};
