// Builds the absolute timeline of a story from story.json (+ measured voice timings).
// Shared by the browser runtime, the audio mixer and the Node tools (UMD).
//
// Musical grid: every scene lasts a whole number of bars, so page turns land on downbeats.
// A scene "starts" when the transition into it starts; its content is fully open at `openAt`
// and scene-local time `lt` counts from there.
(function (root) {
  const TURN = { book: 1.05, stage: 1.0 }, OPEN_FRAC = 0.8;

  function build(story, voice = {}) {
    const bpm = story.music?.bpm ?? 100, beats = story.music?.beatsPerBar ?? 3;
    const beat = 60 / bpm, bar = beat * beats;
    const frame = story.frame || 'book', turnDur = TURN[frame];
    const introBars = story.intro?.bars ?? (frame === 'book' ? 1 : 0);
    const outroBars = story.outro?.bars ?? 3;
    const T = { bpm, beat, bar, frame, turnDur, fps: story.fps || 24, animFps: story.animFps || 12, scenes: [], lines: {} };

    let t = introBars * bar;
    T.intro = { start: 0, end: t, openStart: t, openDur: frame === 'book' ? 1.25 : 0.9 };
    story.scenes.forEach((s, i) => {
      const start = t, dur = s.bars * bar;
      const trans = i === 0 ? T.intro.openDur : turnDur;
      T.scenes.push({ id: s.id, index: i, start, end: start + dur, transDur: trans, openAt: start + trans * OPEN_FRAC, exitAt: start + dur });
      t += dur;
    });
    const outroStart = t, closeDur = frame === 'book' ? 1.25 : 0.9;
    T.outro = { start: outroStart, closeStart: outroStart, closeDur,
      sticker: story.outro?.sticker ?? 'heart',
      stickerAt: outroStart + Math.ceil((closeDur + 0.4) / bar) * bar,
      fadeDur: 1.4, end: outroStart + outroBars * bar };
    T.outro.fadeStart = T.outro.end - T.outro.fadeDur - 0.1;
    T.end = T.outro.end;
    T.duration = T.end;

    // narration: `at` = seconds after the scene is open
    const byId = Object.fromEntries(T.scenes.map((s) => [s.id, s]));
    for (const l of story.lines || []) {
      const sc = byId[l.scene]; if (!sc) throw new Error(`line ${l.id}: unknown scene ${l.scene}`);
      const v = voice[l.id] || {};
      const start = sc.openAt + (l.at ?? 0.1);
      T.lines[l.id] = { id: l.id, scene: l.scene, start, dur: v.dur ?? 0, speechEnd: start + (v.speechEnd ?? v.dur ?? 0),
        words: (v.words || []).map(([w, a, b]) => [w, start + a, start + b]) };
    }
    T.sceneAt = (time) => { let k = 0; while (k + 1 < T.scenes.length && time >= T.scenes[k + 1].start) k++; return k; };
    return T;
  }

  // Human-readable fit report: does every line fit into its scene before the next transition?
  function check(T) {
    const out = [], bad = [];
    for (const s of T.scenes) {
      const lines = Object.values(T.lines).filter((l) => l.scene === s.id);
      const lastEnd = Math.max(s.openAt, ...lines.map((l) => l.speechEnd));
      const slack = s.exitAt - lastEnd;
      out.push({ scene: s.id, start: +s.start.toFixed(2), open: +s.openAt.toFixed(2), exit: +s.exitAt.toFixed(2), lines: lines.map((l) => `${l.id} ${l.start.toFixed(2)}-${l.speechEnd.toFixed(2)}`).join(', '), slack: +slack.toFixed(2) });
      if (slack < 0.25) bad.push(`${s.id}: narration ends ${(-slack + 0.25).toFixed(2)}s too late – add a bar or shorten/speed up the line`);
    }
    return { table: out, problems: bad, duration: T.end };
  }

  const api = { build, check };
  if (typeof module !== 'undefined') module.exports = api;
  else (root.VG = root.VG || {}).timeline = api;
})(typeof window !== 'undefined' ? window : globalThis);
