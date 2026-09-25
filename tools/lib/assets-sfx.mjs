// Sound effects: Freesound previews / Kenney pack -> assets/sfx/<name>.wav (48 kHz / 16-bit)
// plus manifest.json. Recipe: assets/manifests/sfx.json.
//
// Per sound: decode, highpass (DC / rumble), cut [start, start + duration), linear fades,
// peak-normalise to `peakDb` (after the fades), write with deterministic dither.
//
// Recipe: `defaults` (highpassHz, fadeInMs, fadeOutMs, peakDb) apply unless a sound overrides
// them. Each sound has `start` / `duration` in seconds, `channels`, and `source` {page, url,
// sha256, zipEntry?}; category/author/license/original_title/notes go to the manifest as-is.
import fs from 'node:fs';
import path from 'node:path';
import {decode, peak, writeWav} from './assets-audio.mjs';
import {mapPool} from './assets-download.mjs';
import {extractZipEntry} from './assets-zip.mjs';

// A source may end slightly before start + duration (decoder padding); pad up to this much.
const MAX_PAD_S = 0.005;

/** Download jobs: {url, dest, sha256}, one per distinct source file. */
export function sfxDownloads(recipe, cacheDir) {
  const seen = new Map();
  for (const s of recipe.sounds) seen.set(s.source.url, {url: s.source.url, dest: archivePath(s, cacheDir), sha256: s.source.sha256});
  return [...seen.values()];
}

/** Processed files, relative to the output directory (manifest.json comes on top). */
export function sfxFiles(recipe) {
  return recipe.sounds.map((s) => s.file);
}

/** Process every sound (at most `limit` in flight) and write the manifest. */
export async function buildSfx(recipe, {cacheDir, outDir, limit, onDone}) {
  const sr = recipe.sampleRate;
  fs.mkdirSync(outDir, {recursive: true});
  await mapPool(recipe.sounds, limit, async (s) => {
    const o = {...recipe.defaults, ...s};
    const out = await cut(rawPath(s, cacheDir), o, sr);
    fade(out, Math.round(o.fadeInMs / 1000 * sr), Math.round(o.fadeOutMs / 1000 * sr));
    const gain = 10 ** (o.peakDb / 20) / (peak(out) || 1);
    for (const c of out) for (let i = 0; i < c.length; i++) c[i] *= gain;
    writeWav(path.join(outDir, s.file), out, sr, s.file);
    onDone?.(s.file);
  });
  const manifest = recipe.sounds.map((s) => ({
    file: s.file,
    category: s.category,
    duration_s: +(Math.round(s.duration * sr) / sr).toFixed(3),
    source_url: s.source.page,
    license: s.license,
    author: s.author,
    original_title: s.original_title,
    channels: s.channels,
    notes: s.notes,
  }));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

// Cache path of the downloaded file (the archive itself for zip sources).
function archivePath(s, cacheDir) {
  return path.join(cacheDir, 'sfx', path.basename(new URL(s.source.url).pathname));
}

// Path of the decodable audio file, extracting it from its archive on first use.
function rawPath(s, cacheDir) {
  const archive = archivePath(s, cacheDir);
  if (!s.source.zipEntry) return archive;
  const file = path.join(`${archive}.d`, s.source.zipEntry);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, extractZipEntry(archive, s.source.zipEntry));
  }
  return file;
}

// Decode the excerpt. The highpass runs on the whole stream before atrim so the filter
// has settled at the cut point.
async function cut(file, o, sr) {
  const start = Math.round(o.start * sr), n = Math.round(o.duration * sr);
  const filters = [
    ...o.highpassHz.map((f) => `highpass=f=${f}`),
    `atrim=start_sample=${start}:end_sample=${start + n}`,
  ];
  const chans = await decode(file, {sampleRate: sr, channels: o.channels, filters});
  const missing = n - chans[0].length;
  if (missing > MAX_PAD_S * sr) throw new Error(`${file}: source ends ${(missing / sr).toFixed(3)} s before the excerpt`);
  return chans.map((c) => {
    const a = new Float32Array(n);
    a.set(c.subarray(0, n));
    return a;
  });
}

// Linear fade-in over `a` samples and fade-out over the last `b` samples.
function fade(chans, a, b) {
  for (const c of chans) {
    const n = c.length;
    for (let i = 0; i < a && i < n; i++) c[i] *= i / a;
    for (let i = 0; i < b && i < n; i++) c[n - 1 - i] *= i / b;
  }
}
