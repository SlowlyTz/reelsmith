// Contact sheet of a rendered video: npm run sheet -- <slug> [--format 9:16] [--every 1.25] [--from 10 --to 20]
// One tile every N seconds -> build/<slug>/review/video_sheet*.jpg (look at it: framing, clipping, continuity).
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { loadStory, ensureDir, run, args, fmtTag } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run sheet -- <slug> [--format 9:16] [--every 1.25] [--from s --to s]'); process.exit(1); }
const { story, p } = loadStory(slug);
const format = a.format || story.formats[0], portrait = format === '9:16';
const video = join(p.build, `${slug}${fmtTag(format)}.mp4`);
if (!existsSync(video)) { console.error(`render first: npm run render -- ${slug} --format ${format}`); process.exit(1); }
const every = +(a.every || 1.25), cols = portrait ? 8 : 6, rows = portrait ? 3 : 4;
ensureDir(p.review);
const out = join(p.review, `video_sheet${fmtTag(format)}_%d.jpg`);
run('ffmpeg', ['-v', 'error', '-y', ...(a.from ? ['-ss', String(a.from)] : []), ...(a.to ? ['-to', String(a.to)] : []), '-i', video,
  '-vf', `fps=${1 / every},scale=${portrait ? '240:426' : '320:180'},tile=${cols}x${rows}`, out]);
console.log('sheets:', out.replace('%d', '*'));
