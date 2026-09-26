// Video: npm run render -- <slug> [--format 16:9|9:16] [--workers 4] [--range 10-20] [--keep-frames]
//        [--target-mb 18 | --crf 16] [--encode-only]
// Renders every frame with parallel headless Chromium workers and encodes H.264 + the soundtrack
// -> build/_<slug>/<slug>.mp4 (16:9) or <slug>_9x16.mp4. --range renders only those seconds (for checks).
// Size: story.render.targetMB (two-pass, hits the file size) or story.render.crf (quality, default 16).
// --encode-only re-encodes frames kept with --keep-frames (e.g. to try another target size).
import { writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cpus } from 'node:os';
import { loadStory, timeline, serve, browser, openStory, grab, ensureDir, run, args, fmtTag } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run render -- <slug> [--format 16:9|9:16] [--workers N] [--range a-b]'); process.exit(1); }
const { story, voice, p } = loadStory(slug);
const formats = a.format ? [a.format] : story.formats;
const { T } = timeline(story, voice);
const W = +(a.workers || Math.max(1, Math.min(6, Math.floor(cpus().length / 2))));
const R = Object.assign({ crf: 16 }, story.render);
if (a.crf) { R.crf = +a.crf; delete R.targetMB; }
if (a['target-mb']) R.targetMB = +a['target-mb'];
for (const format of formats) {
  const dir = join(p.frames, format.replace(':', 'x')), fps = T.fps, total = Math.round(T.end * fps);
  const range = a.range ? String(a.range).split('-').map(Number) : null;
  if (!range && !a['encode-only']) rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  const frames = []; for (let i = 0; i < total; i++) if (!range || (i / fps >= range[0] && i / fps < range[1])) frames.push(i);
  const srv = await serve(), t0 = Date.now(); let done = 0;
  if (a['encode-only']) frames.length = 0;
  await Promise.all(Array.from({ length: W }, async (_, w) => {
    const b = await browser();
    try {
      const page = await openStory(b, srv.address().port, slug, { format });
      for (let j = w; j < frames.length; j += W) {
        writeFileSync(join(dir, `f${String(frames[j]).padStart(5, '0')}.png`), await grab(page, frames[j] / fps));
        if (++done % 120 === 0) console.log(`  ${format}: ${done}/${frames.length} frames (${((Date.now() - t0) / done).toFixed(0)} ms/frame)`);
      }
    } finally { await b.close(); }
  }));
  srv.close();
  console.log(`${format}: ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (range) { console.log(`frames in ${dir}`); continue; }
  const out = join(p.build, `${slug}${fmtTag(format)}.mp4`), audio = join(p.audio, 'soundtrack.wav');
  const inputs = ['-framerate', String(fps), '-i', join(dir, 'f%05d.png')];
  if (existsSync(audio)) inputs.push('-i', audio); else console.warn('no soundtrack yet (npm run mix) – encoding a silent video');
  encode(inputs, existsSync(audio), out, dir, total / fps);
  if (!a['keep-frames']) rmSync(dir, { recursive: true, force: true });
  console.log('video:', out);
}
function encode(inputs, withAudio, out, dir, dur) {
  const v = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'film', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48'];
  if (!R.targetMB) {
    run('ffmpeg', ['-v', 'error', '-y', ...inputs, ...v, '-crf', String(R.crf), '-movflags', '+faststart',
      ...(withAudio ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), out]);
    return;
  }
  // two-pass ABR: bits for the whole file minus audio and ~2 % container overhead
  const audioK = withAudio ? 192 : 0, kbps = Math.floor((R.targetMB * 8e3 * 0.98) / dur - audioK);
  if (kbps < 500) throw new Error(`targetMB ${R.targetMB} is too small for ${dur.toFixed(1)} s (${kbps} kbit/s video)`);
  const rate = ['-b:v', `${kbps}k`, '-maxrate', `${Math.round(kbps * 2)}k`, '-bufsize', `${kbps * 4}k`], log = ['-passlogfile', join(dir, 'x264pass')];
  console.log(`  two-pass encode: ${kbps} kbit/s video + ${audioK} kbit/s audio for ${R.targetMB} MB`);
  run('ffmpeg', ['-v', 'error', '-y', '-framerate', inputs[1], '-i', inputs[3], ...v, ...rate, ...log, '-pass', '1', '-an', '-f', 'null', '-']);
  run('ffmpeg', ['-v', 'error', '-y', ...inputs, ...v, ...rate, ...log, '-pass', '2', '-movflags', '+faststart',
    ...(withAudio ? ['-c:a', 'aac', '-b:a', `${audioK}k`, '-shortest'] : []), out]);
  for (const f of readdirSync(dir)) if (f.startsWith('x264pass')) rmSync(join(dir, f));
  console.log(`  size: ${(statSync(out).size / 1e6).toFixed(1)} MB`);
}
if (existsSync(p.frames) && !readdirSync(p.frames).length) rmSync(p.frames, { recursive: true });
