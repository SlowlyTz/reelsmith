// Instrument samples: raw VSCO / Musyng Kite notes -> assets/samples/<inst>/<midi>_<vel>.wav
// (48 kHz / 16-bit, source channel count) plus manifest.json. Recipe: assets/manifests/samples.json.
//
// Per note: trim leading silence (onset threshold with a short pre-roll), drop the dead tail,
// cap the length with a long fade (or apply a short safety fade), and for sustained notes
// without a release (choir) find a loop and bake a crossfade into its end.
//
// Recipe: `defaults` holds the trim/fade settings, which an instrument may override
// (`endFadeMs`, `autoLoop`). Instruments list notes as {midi, vel, tune?, src}, where `src`
// is the file name under the instrument's `baseUrl` (pinned commit). `listOrig` copies `src`
// into the manifest as `orig`; source/license/description are passed through unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {decode, levels, writeWav} from './assets-audio.mjs';
import {mapPool} from './assets-download.mjs';

const dB = (db) => 10 ** (db / 20);

/** Download jobs for every note in the recipe: {url, dest}. */
export function sampleDownloads(recipe, cacheDir) {
  return notes(recipe).map((n) => ({url: n.url, dest: path.join(cacheDir, n.cached)}));
}

/** Processed files, relative to the output directory (manifest.json comes on top). */
export function sampleFiles(recipe) {
  return notes(recipe).map((n) => n.file);
}

/**
 * Process all notes (at most `limit` decodes in flight) and write the manifest.
 * `onDone` is called after each note.
 */
export async function buildSamples(recipe, {cacheDir, outDir, limit, onDone}) {
  const sr = recipe.sampleRate;
  const list = notes(recipe);
  const entries = await mapPool(list, limit, async (n) => {
    const opts = {...recipe.defaults, ...n.inst};
    const chans = await decode(path.join(cacheDir, n.cached), {sampleRate: sr});
    const {out, len} = trimAndFade(chans, sr, opts);
    const e = {file: n.file, midi: n.midi, vel: n.vel};
    if (n.tune) e.tune = n.tune;
    if (opts.autoLoop) {
      const {fromS, endMarginS, crossfadeMs} = opts.autoLoop;
      const loop = findLoop(out, sr, fromS, len / sr - endMarginS);
      if (loop) {
        bakeCrossfade(out, loop.start, loop.end, Math.round((crossfadeMs / 1000) * sr));
        e.loopStart = loop.start;
        e.loopEnd = loop.end;
      }
    }
    const dest = path.join(outDir, n.file);
    fs.mkdirSync(path.dirname(dest), {recursive: true});
    writeWav(dest, out, sr, n.file);
    Object.assign(e, {duration: +(len / sr).toFixed(3), ...levels(out)});
    if (n.inst.listOrig) e.orig = n.src;
    onDone?.(n.file);
    return {inst: n.instName, e};
  });

  const manifest = {};
  for (const [name, inst] of Object.entries(recipe.instruments)) {
    const samples = entries.filter((x) => x.inst === name).map((x) => x.e);
    samples.sort((a, b) => a.midi - b.midi || (a.vel < b.vel ? 1 : -1)); // p before f
    manifest[name] = {samples, source: inst.source, license: inst.license, description: inst.description};
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
}

// Flatten the recipe into one record per note.
function notes(recipe) {
  return Object.entries(recipe.instruments).flatMap(([instName, inst]) =>
    inst.samples.map((s) => ({
      ...s,
      inst,
      instName,
      url: inst.baseUrl + encodeURIComponent(s.src),
      file: `${instName}/${s.midi}_${s.vel}.wav`,
      cached: path.join('samples', instName, s.src),
    })),
  );
}

// Trim onset/tail, cap at maxSeconds and fade out (cosine). Returns trimmed copies.
function trimAndFade(chans, sr, o) {
  const n = chans[0].length;
  const amp = (i) => {
    let m = 0;
    for (const c of chans) m = Math.max(m, Math.abs(c[i]));
    return m;
  };
  const onsetThr = dB(o.onsetDb), tailThr = dB(o.tailDb), cap = o.maxSeconds * sr;
  let on = 0;
  while (on < n && amp(on) < onsetThr) on++;
  const start = Math.max(0, on - Math.round((o.preRollMs / 1000) * sr));
  let end = n;
  while (end > start && amp(end - 1) < tailThr) end--;
  const capped = end - start > cap;
  const len = Math.min(end - start, cap);
  const out = chans.map((c) => c.slice(start, start + len));
  // Long fade when the note was cut short, otherwise a short safety fade against clicks.
  const fadeMs = capped ? o.capFadeMs : o.endFadeMs;
  const fl = Math.min(len, Math.round((fadeMs / 1000) * sr));
  for (const c of out) for (let i = 0; i < fl; i++) c[len - fl + i] *= Math.cos((i / fl) * (Math.PI / 2));
  return {out, len};
}

// Pick a loop [start, end) by matching the waveform around rising zero crossings:
// ends lie in the last 0.7 s before `toS`, starts in the 1 s after `fromS`, loops >= 0.8 s.
// Cost is the squared difference of a +-8 ms window, normalised by the energy at the end.
function findLoop(chans, sr, fromS, toS) {
  const n = chans[0].length, W = 384;
  const risingZeros = (a, b) => {
    const m = chans[0], r = [];
    for (let i = Math.max(a, W + 1); i < Math.min(b, n - W); i++) if (m[i - 1] < 0 && m[i] >= 0) r.push(i);
    return r;
  };
  const ends = risingZeros(Math.floor((toS - 0.7) * sr), Math.floor(toS * sr));
  const starts = risingZeros(Math.floor(fromS * sr), Math.floor((fromS + 1.0) * sr));
  let best = {cost: 1e9};
  for (const e of ends) {
    let energy = 0;
    for (const c of chans) for (let k = -W; k < W; k++) energy += c[e + k] ** 2;
    for (const s of starts) {
      if (e - s < 0.8 * sr) continue;
      let d = 0;
      for (const c of chans) {
        for (let k = -W; k < W; k++) d += (c[s + k] - c[e + k]) ** 2;
        if (d / energy > best.cost) break; // early out, already worse
      }
      const cost = d / (energy || 1e-12);
      if (cost < best.cost) best = {cost, start: s, end: e};
    }
  }
  return best.start ? best : null;
}

// Equal-power crossfade of [end-X, end) with [start-X, start), so jumping end -> start is seamless.
function bakeCrossfade(chans, start, end, X) {
  X = Math.min(X, start);
  for (const c of chans) {
    for (let i = 0; i < X; i++) {
      const t = (i / X) * (Math.PI / 2);
      c[end - X + i] = c[end - X + i] * Math.cos(t) + c[start - X + i] * Math.sin(t);
    }
  }
}
