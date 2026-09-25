// Start a new story from the template: npm run new -- <slug> [--title "…"] [--frame book|stage] [--formats 16:9,9:16]
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, args } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.error('usage: npm run new -- <slug> (lowercase, digits, dashes)'); process.exit(1); }
const dst = join(ROOT, 'stories', slug);
if (existsSync(dst)) { console.error(`stories/${slug} already exists`); process.exit(1); }
cpSync(join(ROOT, 'stories', '_template'), dst, { recursive: true });
const f = join(dst, 'story.json'), s = JSON.parse(readFileSync(f, 'utf8'));
s.slug = slug;
if (a.title) { s.title = a.title; s.book.cover.title = a.title; }
if (a.frame) s.frame = a.frame;
if (a.formats) s.formats = String(a.formats).split(',');
writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
console.log(`created stories/${slug}/ (story.json, scenes.js, score.js) – edit them, then: npm run voice -- ${slug}`);
