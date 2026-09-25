// Audio I/O shared by the sample and sfx pipelines: ffmpeg decode to planar float,
// 16-bit WAV writer with deterministic TPDF dither, and peak/RMS level stats.
import {execFile} from 'node:child_process';
import fs from 'node:fs';
import {promisify} from 'node:util';

const run = promisify(execFile);
const MAX_BUFFER = 1 << 30;

/** Channel count of the first audio stream. */
export async function probeChannels(file) {
  const {stdout} = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', file,
  ]);
  return parseInt(stdout.trim(), 10);
}

/**
 * Decode `file` to one Float32Array per channel at `sampleRate` (soxr resampler).
 * `filters` is an ffmpeg audio filter chain applied after resampling; `channels`
 * defaults to the source channel count.
 */
export async function decode(file, {sampleRate, channels, filters = []} = {}) {
  const ch = channels ?? (await probeChannels(file));
  const af = [`aresample=${sampleRate}:resampler=soxr:precision=28`, ...filters].join(',');
  const {stdout} = await run(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-af', af, '-ac', String(ch), '-f', 'f32le', '-'],
    {encoding: 'buffer', maxBuffer: MAX_BUFFER},
  );
  const x = new Float32Array(stdout.buffer, stdout.byteOffset, stdout.length / 4);
  const n = x.length / ch;
  return Array.from({length: ch}, (_, c) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = x[i * ch + c];
    return a;
  });
}

/** Peak and RMS over all channels in dBFS, rounded to 0.1 dB (manifest format). */
export function levels(chans) {
  let peak = 0, sum = 0, n = 0;
  for (const c of chans) {
    for (const v of c) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sum += v * v;
      n++;
    }
  }
  return {
    peakDb: +(20 * Math.log10(peak || 1e-9)).toFixed(1),
    rmsDb: +(10 * Math.log10(sum / n || 1e-18)).toFixed(1),
  };
}

/** Largest absolute sample value over all channels. */
export function peak(chans) {
  let m = 0;
  for (const c of chans) for (const v of c) if (Math.abs(v) > m) m = Math.abs(v);
  return m;
}

/**
 * Write 16-bit PCM WAV. TPDF dither uses a PRNG seeded from `seed` (e.g. the output
 * name), so re-running the pipeline produces byte-identical files.
 */
export function writeWav(file, chans, sampleRate, seed = file) {
  const ch = chans.length, n = chans[0].length, bytes = n * ch * 2;
  const b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + bytes, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(ch, 22);
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate * ch * 2, 28);
  b.writeUInt16LE(ch * 2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(bytes, 40);
  const rand = mulberry32(hashString(seed));
  let p = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.round(chans[c][i] * 32767 + rand() - rand());
      b.writeInt16LE(v > 32767 ? 32767 : v < -32768 ? -32768 : v, p);
      p += 2;
    }
  }
  fs.writeFileSync(file, b);
}

// FNV-1a, enough to derive a per-file dither seed.
function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
