// Quiet, light music bed (120 BPM, 1-second bars) + UI / pen / marker sounds synced to the words
// and to the drawing moments in scenes.js (same timing formulas).
VG.compose = (M, T) => {
  const L = (id) => T.lines[id];
  const W = (id, w) => {
    const l = L(id);
    if (typeof w === 'number') return (w < 0 ? l.words[l.words.length + w] : l.words[w])?.[1] ?? l.start;
    const x = l.words.find((v) => v[0].toLowerCase().replace(/[^\p{L}\p{N}]/gu, '').startsWith(w));
    return x ? x[1] : l.start;
  };
  const O = (id) => T.scenes.find((s) => s.id === id).openAt;   // scene opening (absolute)
  const S = (t, file, gain, o) => M.sfx(t, file, gain, o);

  // ---------- music: soft harp + pizzicato pulse, a celesta motif now and then ----------
  const bars = M.bars(), prog = ['F', 'Dm', 'Bb', 'C'];
  for (let b = 0; b < bars; b++) {
    const c = prog[Math.floor(b / 2) % 4];
    M.harp(b, c, 0.22);
    if (b % 2 === 0) M.pad(b, c, 2, 0.1, ['violas']);
    if (b >= 4 && b < bars - 1) M.pizz(b, c, 0.18);
  }
  const motif = [['A5', 0.5], ['C6', 0.5], ['F6', 1], [null, 1], ['E6', 0.5], ['D6', 0.5], ['C6', 1]];
  [0, 16, 32].forEach((b) => { if (b < bars - 2) M.mel('celesta', b, motif, 0.17, 0.2); });
  M.chime(T.outro.start - 0.1, 'F6', 'A6');
  M.pad(bars - 1, 'F', 1, 0.14, ['violas']);

  // ---------- 1. hook ----------
  const o1 = O('hook');
  for (let i = 0; i < 6; i++) S(o1 + i * 0.07 + 0.05, 'ui_tick.wav', 0.22, { pan: -0.4 + i * 0.16 });
  const tAbs = W('vo1', 'absichtlich'), tDur = W('vo1', 'durcheinander'), tWar = W('vo1', 'warum');
  S(tAbs + 0.35, 'marker_line.wav', 0.45, { dur: 0.45, fadeOut: 0.1 });
  for (let i = 0; i < 6; i++) S(tDur - 0.05 + i * 0.075 + 0.1, i % 2 ? 'ui_click_1.wav' : 'ui_click_2.wav', 0.32, { pan: -0.4 + i * 0.16 });
  S(tDur + 0.45, 'pen_write_1.wav', 0.3, { dur: 0.7, fadeOut: 0.15 });
  S(tWar - 0.1, 'marker_line.wav', 0.45, { dur: 0.4, fadeOut: 0.1 });
  S(tWar, 'ui_question.wav', 0.45);

  // ---------- 2. type bars ----------
  const tSch = W('vo2', 'schreibmaschinen'), tBuch = W('vo2', 'buchstaben'), tMet = W('vo2', 'metallhebel');
  S(tSch - 0.05, 'marker_line.wav', 0.4, { dur: 0.6, fadeOut: 0.15 });
  S(tSch + 0.2, 'ui_drop.wav', 0.3);
  for (let i = 0; i < 11; i++) S(tBuch - 0.3 + i * 0.07, 'ui_tick.wav', 0.16, { pan: -0.6 + i * 0.12, rate: 0.9 + (i % 3) * 0.08 });
  S(tMet - 0.05 + 0.26, 'mouse_click.wav', 0.8, { rate: 0.75 });        // the lever strikes the platen
  S(tMet - 0.1, 'ui_pluck_1.wav', 0.45);
  S(tMet + 0.15, 'marker_line.wav', 0.3, { dur: 0.45, fadeOut: 0.1 });
  S(tMet + 0.5, 'pen_write_2.wav', 0.28, { dur: 0.8, fadeOut: 0.15 });
  const tBen = W('vo3', 'benachbarte'), tSchn = W('vo3', 'schnell'), tVer = W('vo3', 'verhakten'), tHeb = W('vo3', -1);
  S(tBen + 0.1, 'pen_write_1.wav', 0.3, { dur: 0.6, fadeOut: 0.15, offset: 0.8 });
  S(tBen + 0.25, 'ui_tick.wav', 0.3); S(tBen + 0.35, 'ui_tick.wav', 0.3);
  S(tSchn - 0.15, 'synth:whoosh', 0.28);
  S(tSchn + 0.2, 'mouse_click.wav', 0.7, { rate: 0.75, pan: -0.2 }); S(tSchn + 0.29, 'mouse_click.wav', 0.7, { rate: 0.7, pan: 0.2 });
  S(tVer + 0.05, 'ui_error.wav', 0.5);
  S(tVer + 0.35, 'ui_pop.wav', 0.4);
  S(tHeb, 'pen_write_2.wav', 0.28, { dur: 0.8, fadeOut: 0.15, offset: 1 });

  // ---------- 3. Sholes on the sheet ----------
  const o3 = O('sholes');
  S(o3 - 0.35, 'paper_rustle_3.wav', 0.35);
  const tErk = W('vo4', 'erklärung'), tChr = W('vo4', 'christopher'), tSor = W('vo4', 'sortierte'), tHau = W('vo4', 'häufige'), tAus = W('vo4', 'auseinander');
  S(tErk - 0.25, 'ui_pluck_2.wav', 0.4);
  S(tErk - 0.2, 'pen_write_2.wav', 0.2, { dur: 0.7, fadeOut: 0.15 });
  S(tChr - 0.05, 'pen_write_1.wav', 0.38, { dur: 1.5, fadeOut: 0.15 });
  S(tChr + 0.9, 'marker_line.wav', 0.25, { dur: 0.4, fadeOut: 0.1 });
  S(tSor - 0.05, 'pen_write_2.wav', 0.38, { dur: 0.95, fadeOut: 0.15 });
  S(tHau - 0.05, 'pen_write_1.wav', 0.38, { dur: 0.75, fadeOut: 0.15, offset: 1.2 });
  S(tHau + 0.6, 'ui_pop.wav', 0.35); S(tHau + 0.7, 'ui_pop.wav', 0.3, { rate: 1.12 });
  S(tAus - 0.15, 'synth:whoosh', 0.22);
  S(tAus + 0.4, 'pen_write_2.wav', 0.38, { dur: 0.75, fadeOut: 0.15, offset: 0.6 });

  // ---------- 4. keys: QWERTY circled, Y ↔ Z, frequency bars ----------
  const o4 = O('tasten');
  for (let i = 0; i < 6; i++) S(o4 - 0.3 + i * 0.06, 'ui_tick.wav', 0.2, { pan: -0.4 + i * 0.16 });
  const tVer5 = W('vo5', 'vermutlich'), tQy = W('vo5', 3), tUns = W('vo5', 'uns'),
    tDeu = W('vo5', 'deutschen'), tHae = W('vo5', 'häufiger'), tY = W('vo5', -1);
  const tQz = W('vo5', 8);
  S(tVer5, 'pen_write_1.wav', 0.25, { dur: 0.6, fadeOut: 0.15 });
  S(tQy - 0.15, 'marker_circle.wav', 0.6);
  S(tUns - 0.05, 'pen_write_2.wav', 0.25, { dur: 0.5, fadeOut: 0.1 });
  S(tQz - 0.3, 'synth:whoosh', 0.3);
  S(tQz + 0.3, 'ui_pop.wav', 0.45);
  S(tDeu + 0.4, 'ui_pluck_1.wav', 0.4);
  S(tDeu + 0.55, 'ui_switch.wav', 0.3);
  S(tHae - 0.05, 'ui_pop.wav', 0.35);
  S(tHae + 0.2, 'ui_pluck_2.wav', 0.35);
  S(tY - 0.1, 'pen_write_1.wav', 0.25, { dur: 0.5, fadeOut: 0.1, offset: 0.5 });

  // ---------- 5. desktop: click, type, menu, keep ----------
  const o5 = O('heute');
  const tNic = W('vo6', 'nichts'), tLay = W('vo6', 'layout'), tGew = W('vo6', 'gewohnheit');
  const tClick1 = tNic - 0.75, tType = tClick1 + 0.15, tMenu = tLay - 0.1, tKeep = tGew - 0.05;
  S(o5 - 0.3, 'ui_open.wav', 0.45);
  S(tClick1 - 0.05, 'mouse_click.wav', 0.85);
  S(tType + 0.05, 'typing_soft_1.wav', 0.5, { offset: 0.7, dur: 1.35, fadeOut: 0.15 });
  S(tType + 1.45, 'ui_confirm.wav', 0.3);
  S(tMenu, 'mouse_click.wav', 0.85);
  S(tMenu + 0.05, 'ui_switch.wav', 0.3);
  S(tKeep, 'mouse_click.wav', 0.85);
  S(tKeep + 0.08, 'ui_confirm.wav', 0.35);
  S(tGew - 0.05, 'pen_write_2.wav', 0.3, { dur: 0.8, fadeOut: 0.15 });
  S(tGew + 0.7, 'marker_line.wav', 0.35, { dur: 0.4, fadeOut: 0.1 });

  // ---------- 6. question ----------
  const o6 = O('frage');
  for (let i = 0; i < 6; i++) S(o6 - 0.3 + i * 0.06, 'ui_tick.wav', 0.18, { pan: -0.4 + i * 0.16 });
  const tZeh = W('vo7', 3), tSchr = W('vo7', 'schreib'), tKom = W('vo7', 'kommentare');
  S(tZeh, 'ui_pop.wav', 0.5, { pan: -0.3 });
  S(tZeh + 0.45, 'pen_write_1.wav', 0.28, { dur: 0.8, fadeOut: 0.15, offset: 0.4 });
  S(tZeh + 0.5, 'ui_question.wav', 0.35);
  S(tSchr - 0.1, 'ui_pop.wav', 0.4);
  S(tSchr + 0.35, 'typing_soft_2.wav', 0.4, { dur: 0.8, fadeOut: 0.1, offset: 0.3 });
  S(tKom, 'marker_line.wav', 0.35, { dur: 0.6, fadeOut: 0.1 });
};
