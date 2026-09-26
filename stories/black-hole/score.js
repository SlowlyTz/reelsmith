// Music of "How a Black Hole Is Born": slow space ambience in D minor at 64 BPM.
// The story grid uses one-beat bars (scene lengths fit the narration tightly); the harmony here
// moves in 4-beat chords placed by time. Wonder (celesta over harp + low strings) → build with
// choir and a riser → BOOM at the supernova → eerie low hush for the black hole → light-ray
// whooshes → resolve to D major on the title.
VG.compose = (M, T) => {
  const sc = (id) => T.scenes.find((s) => s.id === id), L = T.lines, BT = T.beat, CH = 4 * BT;
  const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const word = (id, pre, nth = 0) => { let c = 0; for (const w of L[id].words) if (norm(w[0]).startsWith(pre) && c++ === nth) return w[1]; return L[id].start + 1; };
  const drone = (note, t, dur, vel, pan = 0) => M.add('cellos', note, t, dur, vel, pan, { attack: 1.4 });
  // sustained chord from t for dur seconds (cellos / violas / violins / choir)
  const pad = (t, name, dur, vel, insts = ['cellos', 'violas']) => {
    const c = VG.chord(name), d = dur + 0.3;
    if (insts.includes('cellos')) M.add('cellos', c[0] + 12, t, d, vel, -0.3, { attack: 0.5 });
    if (insts.includes('violas')) { M.add('violas', c[2] + 12, t, d, vel * 0.8, 0.1, { attack: 0.5 }); M.add('violas', c[3] + 12, t, d, vel * 0.75, 0.2, { attack: 0.5 }); }
    if (insts.includes('violins')) M.add('violins', c[4] + 12, t, d, vel * 0.7, 0.3, { attack: 0.6 });
    if (insts.includes('choir')) { M.add('choir_aahs', c[3] + 12, t, d + 0.1, vel * 0.6, -0.15, { attack: 0.8 }); M.add('choir_aahs', c[4] + 12, t, d + 0.1, vel * 0.55, 0.15, { attack: 0.8 }); }
  };
  // flowing harp arpeggio in eighths from t for dur seconds
  const arp = (t, name, dur, vel = 0.24) => {
    const c = VG.chord(name), pat = [0, 2, 3, 4, 5, 4, 3, 2], n = Math.floor(dur / (BT / 2) + 1e-6);
    for (let i = 0; i < n; i++) M.add('harp', c[pat[i % 8]] + 12, t + (i * BT) / 2, 2.6, vel * (i % 8 ? 0.85 : 1.1), i % 2 ? 0.25 : -0.2);
  };
  // melody: notes [[name|null, beats]] from t
  const mel = (inst, t, notes, vel, pan = 0.2, tail = 1.5) => { let b = 0; for (const [n, d] of notes) { if (n) M.add(inst, n, t + b * BT, d * BT + tail, vel * (0.92 + 0.08 * Math.sin(b * 7)), pan); b += d; } };

  // ---------------------------------------------------------------- 1. the star: wonder
  ['Dm', 'Bbmaj7', 'F', 'Csus4'].forEach((c, i) => { pad(i * CH, c, CH, 0.22 + i * 0.02, ['cellos', 'violas', 'choir']); arp(i * CH, c, CH, 0.24); });
  drone('D2', 0, CH * 2 + 0.5, 0.3);
  mel('celesta', 0, [[null, 1], ['A5', 1], ['D6', 1], ['E6', 1]], 0.34);
  mel('celesta', CH, [['F6', 3], ['E6', 1]], 0.32);
  mel('celesta', CH * 2, [['C6', 2], ['A5', 2]], 0.3);
  mel('celesta', CH * 3, [['G5', 2], ['C6', 1], ['D6', 1]], 0.3, 0.2, 1.8);
  M.chime(word('vo2', 'fusing'), 'A6');
  M.chime(word('vo3', 'fusion'), 'D7');
  M.chime(word('vo3', 'gravity'), 'F6');
  M.sfx(0.05, 'synth:sub', 0.3);

  // ---------------------------------------------------------------- 2. supergiant → collapse → supernova
  const t2 = sc('giant').start, tCol = word('vo5', 'collapses'), tEx = L.vo6.start - 0.35;
  ['Gm', 'Eb', 'Bb', 'A7', 'Dm'].forEach((c, i) => {
    const t0 = t2 + i * CH; if (t0 > tEx - 0.3) return;
    const dur = Math.min(CH, tEx - t0 - 0.05), v = 0.24 + i * 0.05;
    pad(t0, c, dur, v, ['cellos', 'violas'].concat(i >= 1 ? ['violins'] : [], i >= 2 ? ['choir'] : []));
    if (i < 3) arp(t0, c, dur, 0.22 + i * 0.03);
  });
  // the swell: a rising harp run, then a low pulse on every beat as gravity takes over
  M.gliss('harp', [38, 41, 45, 50, 53, 57, 62, 65], word('vo4', 'swells') - 0.1, 0.12, 0.3, 3);
  for (let t = word('vo5', 'gravity') - 0.05, i = 0; t < tEx - 0.3; t += BT, i++) M.add('cellos', 'D2', t, BT * 0.9, 0.3 + i * 0.025, -0.2, { attack: 0.05 });
  M.sfx(tCol - 0.1, 'synth:whoosh', 0.4, { rate: 0.8 });
  M.sfx(tEx - 3, 'synth:riser', 0.7);
  // SUPERNOVA: deep boom + sub, then an awed choir chord over the drifting confetti
  M.sfx(tEx, 'synth:boom', 1.4);
  M.sfx(tEx + 0.02, 'synth:sub', 0.7);
  const endG = sc('giant').exitAt;
  M.add('choir_aahs', 'D4', tEx + 0.9, endG - tEx - 0.2, 0.45, -0.2, { attack: 1.5 });
  M.add('choir_aahs', 'A4', tEx + 1.0, endG - tEx - 0.3, 0.4, 0.2, { attack: 1.5 });
  M.add('violins', 'F5', tEx + 1.2, endG - tEx - 0.4, 0.3, 0.3, { attack: 1.8 });
  M.add('violins', 'E6', tEx + 1.6, endG - tEx - 0.8, 0.1, -0.3, { attack: 2 });
  for (let i = 0; i < 9; i++) M.add('glockenspiel', ['A6', 'D7', 'F6', 'E7', 'C7', 'A6', 'G6', 'D7', 'F7'][i], tEx + 0.6 + i * 0.37 + (i % 3) * 0.06, 2.4, 0.14 - i * 0.008, i % 2 ? 0.55 : -0.55);
  drone('D2', tEx + 0.4, endG - tEx + 0.2, 0.4);
  M.add('violas', 'A3', tEx + 1.0, endG - tEx - 0.3, 0.26, -0.1, { attack: 1.5 });

  // ---------------------------------------------------------------- 3. the black hole: eerie hush
  const h3 = sc('hole'), t3 = h3.start, d3 = h3.exitAt - h3.start, cb = word('vo7', 'black');
  drone('D2', t3, d3 + 0.4, 0.4, -0.1);
  M.add('violas', 'D4', t3, d3, 0.22, 0.25, { attack: 1.5 });
  M.add('violas', 'Eb4', t3 + d3 * 0.3, d3 * 0.7, 0.12, -0.25, { attack: 2 });        // the rub: an uneasy minor second
  M.add('choir_aahs', 'F4', t3, cb - t3 + 0.3, 0.18, 0.1, { attack: 1.8 });
  M.add('choir_aahs', 'D4', cb, h3.exitAt - cb, 0.2, -0.1, { attack: 1.2 });
  M.add('choir_aahs', 'Ab4', cb + 0.3, h3.exitAt - cb - 0.3, 0.14, 0.2, { attack: 1.6 });
  // a low harp thud on every squeeze of the core
  [['crushed', 0, 'D2'], ['smaller', 0, 'C2'], ['smaller', 1, 'Bb1'], ['into', 0, 'A1']].forEach(([w, n, note]) => M.add('harp', note, word('vo7', w, n) - 0.05, 2.5, 0.55, 0));
  M.sfx(cb - 0.05, 'synth:sub', 0.7);
  M.sfx(cb - 0.1, 'synth:whoosh', 0.3, { rate: 0.6 });
  // the disk: slow celesta sparkles circling
  const tg = word('vo8', 'gas');
  ['D6', 'A5', 'F6', 'E6', 'D6', 'A6', 'G6', 'F6'].forEach((n, i) => M.add('celesta', n, tg + i * 0.5, 1.8, 0.22 - i * 0.012, Math.sin(i * 1.3) * 0.6));

  // ---------------------------------------------------------------- 4. event horizon
  const h4 = sc('horizon'), t4 = h4.start, d4 = h4.exitAt - h4.start;
  pad(t4, 'Bbmaj7', d4 * 0.45, 0.2, ['cellos', 'violas', 'choir']);
  pad(t4 + d4 * 0.45, 'A', d4 * 0.55, 0.22, ['cellos', 'violas', 'violins', 'choir']);
  drone('A2', t4, d4, 0.22);
  mel('celesta', t4, [[null, 1], ['D6', 1], ['F6', 1], ['A6', 1]], 0.26, 0.3, 1.4);
  mel('celesta', t4 + d4 * 0.45, [['G6', 2], ['E6', 1], ['C#6', 1]], 0.26, 0.3, 1.6);
  // one whoosh per light ray (they travel left → right); the swallowed one is cut off
  const rayStart = { a: word('vo9', 'past') - 0.5, b: word('vo9', 'nothing') - 0.4, c: word('vo9', 'light') - 1.25 };
  M.sfx(rayStart.a + 0.35, 'synth:whoosh', 0.28);
  M.sfx(rayStart.b + 0.35, 'synth:whoosh', 0.3);
  M.sfx(rayStart.c + 0.35, 'synth:whoosh', 0.34, { dur: 0.75, fadeOut: 0.12 });

  // ---------------------------------------------------------------- 5. darkest from brightest → resolve
  const t5 = sc('end').start, tBright = word('vo10', 'brightest'), tTitle = word('vo10', 'born') - 0.15, tRes = L.vo10.speechEnd + 0.1;
  pad(t5, 'Bbmaj7', tRes - t5 - 1.2, 0.22, ['cellos', 'violas', 'choir']);
  arp(t5, 'Bbmaj7', tRes - t5 - 1.2, 0.2);
  pad(tRes - 1.2, 'A', 1.2, 0.22, ['cellos', 'violas', 'choir']);
  M.chime(tBright, 'A6', 'E7');
  // title: harp glissando + chimes; D major resolves under it and rings out to the fade
  M.gliss('harp', M.scale('D', 3, 5, [0, 2, 4, 7, 9]), tTitle - 0.2, 0.07, 0.3, 3.5);
  M.chime(tTitle + 0.25, 'D7', 'F#7', 'A7');
  pad(tRes, 'D', T.end - tRes + 0.5, 0.28, ['cellos', 'violas', 'violins', 'choir']);
  M.add('celesta', 'F#6', tRes, 3, 0.3, 0.2); M.add('celesta', 'A6', tRes + BT, 3, 0.28, -0.2); M.add('celesta', 'D7', tRes + BT * 2, 3.5, 0.26, 0.1);
  drone('D2', tRes - 1.2, T.end - tRes + 1.2, 0.28);
};
