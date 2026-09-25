// Video: npm run render -- <slug> [--format 16:9|9:16] [--workers 4] [--range 10-20] [--keep-frames]
// Renders every frame with parallel headless Chromium workers and encodes H.264 + the soundtrack
// -> build/<slug>/<slug>.mp4 (16:9) or <slug>_9x16.mp4. --range renders only those seconds (for checks).
import { writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { cpus } from 'node:os';
import { loadStory, timeline, serve, browser, openStory, grab, ensureDir, run, args, fmtTag } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run render -- <slug> [--format 16:9|9:16] [--workers N] [--range a-b]'); process.exit(1); }
const { story, voice, p } = loadStory(slug);
const formats = a.format ? [a.format] : story.formats;
const { T } = timeline(story, voice);
const W = +(a.workers || Math.max(1, Math.min(6, Math.floor(cpus().length / 2))));
for (const format of formats) {
  const dir = join(p.frames, format.replace(':', 'x')), fps = T.fps, total = Math.round(T.end * fps);
  const range = a.range ? String(a.range).split('-').map(Number) : null;
  if (!range) rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  const frames = []; for (let i = 0; i < total; i++) if (!range || (i / fps >= range[0] && i / fps < range[1])) frames.push(i);
  const srv = await serve(), t0 = Date.now(); let done = 0;
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
  const out = join(p.build, `${slug}${fmtTag(format)}.mp4`), audio = join(p.build, 'soundtrack.wav');
  const inputs = ['-framerate', String(fps), '-i', join(dir, 'f%05d.png')];
  if (existsSync(audio)) inputs.push('-i', audio); else console.warn('no soundtrack yet (npm run mix) – encoding a silent video');
  run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'film', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart', ...(existsSync(audio) ? ['-c:a', 'aac', '-b:a', '256k', '-shortest'] : []), out]);
  if (!a['keep-frames']) rmSync(dir, { recursive: true, force: true });
  console.log('video:', out);
}
