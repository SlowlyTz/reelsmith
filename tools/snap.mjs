// Still frames for review: npm run snap -- <slug> [--format 9:16] [--sheet] 3.5 12 20 …
// Without times: one still per scene (middle of each scene) + intro/outro. --sheet tiles them.
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadStory, timeline, serve, browser, openStory, grab, ensureDir, args, run, fmtTag } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run snap -- <slug> [--format 16:9|9:16] [--sheet] [times…]'); process.exit(1); }
const { story, voice, p } = loadStory(slug);
const format = a.format || story.formats[0];
const { T } = timeline(story, voice);
let times = a._.slice(1).map(Number);
if (!times.length) times = [0.5, T.intro.openStart + T.intro.openDur * 0.5, ...T.scenes.flatMap((s) => [s.openAt + 0.8, (s.openAt + s.exitAt) / 2, s.exitAt - 0.3]), T.outro.stickerAt + 1];
const dir = join(p.review, 'snaps' + fmtTag(format));
if (!a._.slice(1).length) rmSync(dir, { recursive: true, force: true });
ensureDir(dir);
const srv = await serve(), b = await browser();
try {
  const page = await openStory(b, srv.address().port, slug, { format });
  const files = [];
  for (const t of times) {
    const f = join(dir, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    writeFileSync(f, await grab(page, t, 'image/jpeg', 0.9)); files.push(f);
    console.log(f);
  }
  if (a.sheet) {
    const out = join(p.review, `sheet${fmtTag(format)}.jpg`), portrait = format === '9:16';
    const cols = portrait ? 6 : 4, scale = portrait ? '270:480' : '480:270', rows = Math.ceil(files.length / cols);
    run('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', join(dir, '*.jpg'), '-vf', `scale=${scale},tile=${cols}x${rows}`, '-frames:v', '1', out]);
    console.log('sheet:', out);
  }
} finally { await b.close(); srv.close(); }
