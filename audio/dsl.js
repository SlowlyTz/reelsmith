// A small score language on top of the story timeline. A story's score.js defines
//   VG.compose = (M, T) => { ... }
// and uses M to place notes on the musical grid (bars/beats of the timeline).
(function () {
  const VG = (window.VG = window.VG || {});
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // 'F#4' -> 66
  const note = (s) => { if (typeof s === 'number') return s; const m = /^([A-G])([b#]?)(-?\d)$/.exec(s); if (!m) throw new Error('bad note ' + s);
    return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
  // chord name -> six-note voicing low..high: root, fifth, root, third|sus, fifth|seventh, root
  const QUAL = { '': [4, 7], m: [3, 7], '7': [4, 10], m7: [3, 10], maj7: [4, 11], sus4: [5, 7], sus2: [2, 7], dim: [3, 6], add9: [4, 14] };
  function chord(name) {
    const m = /^([A-G])([b#]?)(.*)$/.exec(name); if (!m || !(m[3] in QUAL)) throw new Error('bad chord ' + name);
    let r = 36 + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); if (r > 44) r -= 12; // bass A1..G#2
    const [a, b] = QUAL[m[3]];
    return [r, r + 7, r + 12, r + 12 + a, r + 12 + b, r + 24];
  }
  VG.note = note; VG.chord = chord;

  VG.scoreDSL = (T) => {
    const ev = [];
    const M = {
      events: ev, bar: T.bar, beat: T.beat,
      // absolute time of bar (+ beat) counted from 0
      bt: (bar, beat = 0) => bar * T.bar + beat * T.beat,
      // first bar index of a scene / of the outro
      sceneBar: (id) => Math.round(T.scenes.find((s) => s.id === id).start / T.bar),
      outroBar: () => Math.round(T.outro.start / T.bar),
      bars: () => Math.round(T.end / T.bar),
      add(inst, n, t, dur, vel = 0.6, pan = 0, o = {}) { ev.push(Object.assign({ inst, midi: note(n), t, dur, vel, pan }, o)); },
      // melody: notes [[name|null, beats], ...] starting at bar
      mel(inst, bar, notes, vel = 0.6, pan = 0, o = {}) {
        let b = 0; for (const [n, d] of notes) { if (n) M.add(inst, n, M.bt(bar, b), d * T.beat * (o.legato || 1) + (o.tail || 0), vel * (0.92 + 0.08 * Math.sin(b * 7 + bar)), pan, o); b += d; }
      },
      // flowing harp arpeggio filling one bar (eighths)
      harp(bar, name, vel = 0.45) {
        const c = chord(name), per = T.beat / 2, n = Math.round(T.bar / per), pat = [0, 2, 3, 4, 5, 4, 3, 2];
        for (let i = 0; i < n; i++) M.add('harp', c[pat[i % pat.length]] + 12, M.bt(bar) + i * per, 2.6, vel * (i ? 0.85 : 1.1), i % 2 ? 0.25 : -0.2);
      },
      // sustained chord for `bars` bars; insts from violas, cellos, violins, choir
      pad(bar, name, bars = 1, vel = 0.3, insts = ['violas', 'cellos']) {
        const c = chord(name), t = M.bt(bar), d = bars * T.bar + 0.3;
        if (insts.includes('cellos')) M.add('cellos', c[0] + 12, t, d, vel, -0.3, { attack: 0.35 });
        if (insts.includes('violas')) { M.add('violas', c[2] + 12, t, d, vel * 0.8, 0.1, { attack: 0.4 }); M.add('violas', c[3] + 12, t, d, vel * 0.75, 0.2, { attack: 0.4 }); }
        if (insts.includes('violins')) M.add('violins', c[4] + 12, t, d, vel * 0.7, 0.3, { attack: 0.5 });
        if (insts.includes('choir')) { M.add('choir_aahs', c[3] + 12, t, d + 0.1, vel * 0.6, -0.15, { attack: 0.6 }); M.add('choir_aahs', c[4] + 12, t, d + 0.1, vel * 0.55, 0.15, { attack: 0.6 }); }
      },
      // playful oom-pah-pah with pizzicato (for 3/4; 4/4 gets oom-pah-oom-pah)
      pizz(bar, name, vel = 0.6) {
        const c = chord(name); M.add('cellos_pizz', c[0] + 12, M.bt(bar), 1.2, vel, -0.25);
        for (let b = 1; b < Math.round(T.bar / T.beat); b++) { M.add('violins_pizz', c[3] + 12, M.bt(bar, b), 0.8, vel * 0.8, 0.25); M.add('violins_pizz', c[4] + 12, M.bt(bar, b), 0.8, vel * 0.7, 0.3); }
      },
      // fast run of notes, e.g. a harp glissando when a cover opens
      gliss(inst, notes, t, step = 0.062, vel = 0.35, dur = 2.6) { notes.forEach((n, i) => M.add(inst, n, t + i * step, dur, vel + i * 0.01, -0.4 + (i / notes.length) * 0.8)); },
      // single bell accents, e.g. synced to a pop-up: M.chime(t, 'C7', 'F6')
      chime(t, ...notes) { notes.forEach((n, i) => M.add('glockenspiel', n, t + i * 0.09, 2.5, 0.32, -0.2 + i * 0.15)); },
      // F-major scale helper for glissandi: scale('F', 3, 6) -> notes from F3 up to F6
      scale(root = 'F', from = 3, to = 6, steps = [0, 2, 4, 5, 7, 9, 11]) { const r = PC[root[0]] + (root[1] === 'b' ? -1 : root[1] === '#' ? 1 : 0), out = [];
        for (let o = from; o <= to; o++) for (const s of steps) { const n = 12 * (o + 1) + r + s; if (n <= 12 * (to + 1) + r) out.push(n); } return out; },
    };
    return M;
  };
})();
