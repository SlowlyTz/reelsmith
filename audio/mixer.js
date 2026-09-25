// Offline mix (Web Audio API): score + narration + sound effects + ambience -> float WAV.
// Frame events (page turns, pop-ups, cover, sticker) get their sounds automatically;
// scenes add their own via `sfx: [[lt, file, gain, {pan, rate, dur, offset, bus, fadeIn, fadeOut}], ...]`.
(function () {
  const VG = window.VG, SR = 48000;
  const INST_DB = { music_box: -1, celesta: -3, harp: -4, glockenspiel: -7, violins: -5, violas: -8, cellos: -7, violin_solo: -8,
    violins_pizz: -5, cellos_pizz: -4, flute: -5, flute_nv: -6, choir_aahs: -11 };
  const PLUCKED = new Set(['music_box', 'celesta', 'harp', 'glockenspiel', 'violins_pizz', 'cellos_pizz']);
  const db = (x) => Math.pow(10, x / 20);
  const jitter = (i) => { let h = Math.imul(i + 1, 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return ((h >>> 0) / 4294967296) - 0.5; };

  async function load(ctx, url) { const r = await fetch(url); if (!r.ok) throw new Error('missing ' + url); return ctx.decodeAudioData(await r.arrayBuffer()); }
  function impulse(ctx, secs, decay, pre, bright) {
    const n = Math.floor(secs * SR), b = ctx.createBuffer(2, n, SR);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0, seed = c * 7919 + 13;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
      for (let i = 0; i < n; i++) {
        const t = i / SR; if (t < pre) { d[i] = 0; continue; }
        lp += (rnd() - lp) * (bright * Math.exp(-(t - pre) * 2.2) + 0.08);
        d[i] = lp * Math.exp(-(t - pre) * decay) * (t - pre < 0.004 ? (t - pre) / 0.004 : 1);
      }
      for (const [tt, g] of [[0.013, 0.5], [0.021, 0.35], [0.033, 0.28], [0.047, 0.2]]) { const i = Math.floor((pre + tt + c * 0.003) * SR); if (i < n) d[i] += g * (c ? -1 : 1); }
    }
    return b;
  }

  // cues produced by the frame itself
  function frameCues(T) {
    const c = [], add = (t, file, gain, o = {}) => c.push([t, file, gain, o]);
    const turns = ['page_turn_3.wav', 'page_turn_2.wav', 'page_turn_1.wav'];
    if (T.frame === 'book') {
      add(T.intro.openStart - 0.55, 'book_open.wav', 0.8, { pan: 0.2 });
      T.scenes.slice(1).forEach((s, i) => { add(s.start + 0.02, turns[i % turns.length], 0.95, { pan: 0.15 }); add(s.start - 0.02, 'paper_pop_4.wav', 0.28, { pan: -0.1 }); });
      add(T.outro.closeStart, 'paper_rustle_1.wav', 0.35, { pan: -0.3 });
      add(T.outro.closeStart + T.outro.closeDur * 0.9, 'book_close.wav', 0.95, { pan: 0.15 });
    } else {
      T.scenes.slice(1).forEach((s) => add(s.start, 'paper_rustle_3.wav', 0.45, { pan: 0.3 }));
    }
    T.scenes.forEach((s) => { add(s.openAt + 0.06, 'paper_pop_1.wav', 0.4, { pan: -0.25 }); add(s.openAt + 0.3, 'paper_pop_3.wav', 0.3, { pan: 0.3 }); add(s.openAt + 0.5, 'paper_pop_2.wav', 0.22); });
    if (T.outro.sticker) { add(T.outro.stickerAt, 'paper_pop_1.wav', 0.7); add(T.outro.stickerAt + 0.05, 'paper_pop_2.wav', 0.3); }
    return c;
  }

  // opts: { samples, sfx, voice (dir url), upload (name) }
  VG.renderMix = async function (o) {
    const T = VG.T, LEN = T.end + 1.2;
    const ctx = new OfflineAudioContext(2, Math.ceil(LEN * SR), SR);
    const man = await (await fetch(o.samples + 'manifest.json')).json();
    const G = Object.assign({ music: -8, voice: 0, sfx: -5, amb: -14 }, VG.story.mix || {}), mute = o.mute || {};

    // ---------- buses ----------
    const master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 2.5; comp.attack.value = 0.008; comp.release.value = 0.25; comp.knee.value = 8;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1; lim.knee.value = 0;
    master.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
    const hall = ctx.createConvolver(); hall.buffer = impulse(ctx, 3.6, 1.9, 0.025, 0.35);
    const hallOut = ctx.createGain(); hallOut.gain.value = 0.55; hall.connect(hallOut); hallOut.connect(master);
    const room = ctx.createConvolver(); room.buffer = impulse(ctx, 0.9, 6.5, 0.008, 0.6);
    const roomOut = ctx.createGain(); roomOut.gain.value = 0.5; room.connect(roomOut); roomOut.connect(master);
    const bus = (dbv, off, sends) => { const g = ctx.createGain(); g.gain.value = off ? 0 : db(dbv); for (const [node, amt] of sends) { const s = ctx.createGain(); s.gain.value = amt; g.connect(s); s.connect(node); } return g; };

    const music = bus(G.music, mute.music, []);
    const duck = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 45;
    music.connect(hp); hp.connect(duck); duck.connect(master);
    const ms = ctx.createGain(); ms.gain.value = 0.42; duck.connect(ms); ms.connect(hall);
    const voice = bus(G.voice, mute.voice, [[room, 0.22], [hall, 0.07]]); voice.connect(master);
    const sfx = bus(G.sfx, mute.sfx, [[hall, 0.12]]); sfx.connect(master);
    const amb = bus(G.amb, mute.amb, []); amb.connect(master);

    // ---------- score ----------
    const M = VG.scoreDSL(T);
    if (VG.compose) VG.compose(M, T);
    const pick = (inst, midi, vel) => {
      if (!man[inst]) throw new Error('unknown instrument ' + inst);
      let best = null, bd = 1e9; const wantF = vel >= 0.58;
      for (const s of man[inst].samples) { const d = Math.abs(s.midi - midi) * 10 + (s.midi > midi ? 1 : 0) + ((s.vel === 'f') !== wantF ? 25 : 0); if (d < bd) { bd = d; best = s; } }
      return best;
    };
    const cache = new Map(), need = new Set(M.events.map((e) => pick(e.inst, e.midi, e.vel).file));
    await Promise.all([...need].map(async (f) => cache.set(f, await load(ctx, o.samples + f))));
    const instBus = {};
    M.events.forEach((e, i) => {
      const s = pick(e.inst, e.midi, e.vel), buf = cache.get(s.file), plucked = PLUCKED.has(e.inst);
      const src = ctx.createBufferSource(); src.buffer = buf;
      src.playbackRate.value = Math.pow(2, (e.midi - s.midi + (s.tune || 0) / 100) / 12);
      if (!plucked && s.loopStart && e.dur > buf.duration - 0.3) { src.loop = true; src.loopStart = s.loopStart / SR; src.loopEnd = s.loopEnd / SR; }
      const vel = e.vel * Math.min(db(-22 - s.rmsDb), db(-4 - s.peakDb)) * (1 + jitter(i) * 0.12);
      const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, e.pan || 0));
      const t0 = Math.max(0, e.t + jitter(i * 3) * 0.012), atk = e.attack ?? (plucked ? 0.004 : 0.2), rel = plucked ? 0.5 : 0.7, end = Math.max(t0 + atk, t0 + e.dur);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vel, t0 + atk); g.gain.setValueAtTime(vel, end); g.gain.setTargetAtTime(0, end, rel / 3);
      if (!instBus[e.inst]) { const b = ctx.createGain(); b.gain.value = db(INST_DB[e.inst] ?? -6); b.connect(music); instBus[e.inst] = b; }
      src.connect(g); g.connect(p); p.connect(instBus[e.inst]); src.start(t0); src.stop(end + rel * 2.5);
    });

    // ---------- narration + ducking ----------
    duck.gain.setValueAtTime(1, 0);
    for (const l of Object.values(T.lines)) {
      let b; try { b = await load(ctx, `${o.voice}${l.id}.wav`); } catch { console.warn('no voice for', l.id); continue; }
      const s = ctx.createBufferSource(); s.buffer = b; s.connect(voice); s.start(l.start);
      duck.gain.setTargetAtTime(db(-5.5), l.start - 0.35, 0.12);
      duck.gain.setTargetAtTime(1, l.speechEnd + 0.15, 0.35);
    }

    // ---------- sound effects ----------
    const bufs = {};
    const play = async (t, file, gain = 1, op = {}) => {
      const b = (bufs[file] = bufs[file] || await load(ctx, o.sfx + file)), s = ctx.createBufferSource(); s.buffer = b;
      if (op.rate) s.playbackRate.value = op.rate;
      const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = op.pan || 0;
      const off = op.offset || 0, dur = Math.min(op.dur || Infinity, (b.duration - off) / (op.rate || 1)), t0 = Math.max(0, t);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + (op.fadeIn || 0.004));
      g.gain.setValueAtTime(gain, t0 + Math.max(0.01, dur - (op.fadeOut || 0.02))); g.gain.linearRampToValueAtTime(0, t0 + dur);
      s.connect(g); g.connect(p); p.connect(op.bus === 'amb' ? amb : sfx); s.start(t0, off, dur * (op.rate || 1));
    };
    const cues = frameCues(T);
    T.scenes.forEach((s) => (VG.defs[s.id]?.sfx || []).forEach(([lt, file, gain, op]) => cues.push([s.openAt + lt, file, gain, op || {}])));
    for (const c of cues) await play(...c);

    const out = await ctx.startRendering();
    const ch = [out.getChannelData(0), out.getChannelData(1)], n = ch[0].length;
    const buf = new ArrayBuffer(44 + n * 8), v = new DataView(buf);
    const w = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 8, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 2, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 8, true); v.setUint16(32, 8, true); v.setUint16(34, 32, true); w(36, 'data'); v.setUint32(40, n * 8, true);
    for (let i = 0, off = 44; i < n; i++, off += 8) { v.setFloat32(off, ch[0][i], true); v.setFloat32(off + 4, ch[1][i], true); }
    await fetch('/upload/' + o.upload, { method: 'POST', body: buf });
    return n / SR;
  };
})();
