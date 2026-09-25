// Music of this story. M places notes on the bar grid of the timeline (see audio/dsl.js).
// Chords per scene, a melody instrument per mood, bell accents synced to on-screen magic.
VG.compose = (M, T) => {
  const b = (id) => M.sceneBar(id), line = (id) => T.lines[id];

  // intro + title page: music box alone, harp glissando while the cover opens
  M.pad(0, 'F', b('wald'), 0.26);
  M.mel('music_box', 0, [['C5', 1], ['F5', 1], ['A5', 1]], 0.6, 0, { tail: 1.4 });
  M.mel('music_box', 1, [['G5', 2], ['F5', 1]], 0.6, 0, { tail: 1.4 });
  M.mel('music_box', 2, [['E5', 1], ['F5', 1], ['G5', 1]], 0.55, 0, { tail: 1.4 });
  M.gliss('harp', M.scale('F', 3, 5), T.intro.openStart + 0.05);

  // the forest: harp arpeggios, celesta theme, a sparkle when the name is spoken
  ['F', 'Am', 'Bb', 'C', 'F'].forEach((c, i) => { M.harp(b('wald') + i, c); M.pad(b('wald') + i, c, 1, 0.26); });
  M.mel('celesta', b('wald'), [['A5', 1], ['C6', 1], ['F6', 1]], 0.5, 0.2, { tail: 1 });
  M.mel('celesta', b('wald') + 1, [['E6', 2], ['C6', 1]], 0.5, 0.2, { tail: 1 });
  M.mel('celesta', b('wald') + 2, [['D6', 1], ['F6', 1], ['A6', 1]], 0.5, 0.2, { tail: 1 });
  M.mel('celesta', b('wald') + 3, [['G6', 3]], 0.5, 0.2, { tail: 1.2 });
  const lina = line('vo2').words.find(([w]) => /^lina/i.test(w));
  if (lina) M.chime(lina[1], 'A6');

  // the night: strings + choir, glockenspiel twinkles as the stars appear
  ['Dm', 'Bb', 'F', 'C', 'F'].forEach((c, i) => { M.harp(b('nacht') + i, c, 0.4); M.pad(b('nacht') + i, c, 1, 0.32, ['violas', 'cellos', 'violins'].concat(i > 1 ? ['choir'] : [])); });
  M.mel('flute', b('nacht') + 1, [['F5', 2], ['D5', 1]], 0.5, -0.1);
  M.mel('flute', b('nacht') + 2, [['C5', 1], ['A4', 1], ['C5', 1]], 0.5, -0.1);
  M.mel('flute', b('nacht') + 3, [['E5', 2], ['G5', 1]], 0.52, -0.1);
  for (let i = 0; i < 7; i++) M.add('glockenspiel', ['F6', 'A6', 'C7', 'D7'][i % 4], M.bt(b('nacht') + 1) + i * 0.3, 2, 0.18, i % 2 ? 0.5 : -0.5);

  // ending: warm chord when the book closes, chime on the sticker
  const o = M.outroBar();
  M.pad(o, 'F', 3, 0.3, ['violas', 'cellos', 'violins', 'choir']);
  M.mel('music_box', o, [['F5', 3]], 0.55, 0, { tail: 1.5 });
  M.gliss('harp', M.scale('F', 3, 6), T.outro.stickerAt, 0.055, 0.36, 3.4);
  M.chime(T.outro.stickerAt, 'F6', 'C7');
};
