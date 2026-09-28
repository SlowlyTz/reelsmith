// Start a new story from a template: npm run new -- <slug> [--title "…"] [--style paper|clean] [--frame book|stage|board|desktop] [--formats 16:9,9:16]
// --style clean copies stories/_template-clean (explainer), otherwise stories/_template (paper storybook).
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, args } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.error('usage: npm run new -- <slug> (lowercase, digits, dashes)'); process.exit(1); }
const dst = join(ROOT, 'stories', slug);
if (existsSync(dst)) { console.error(`stories/${slug} already exists`); process.exit(1); }
const tpl = a.style === 'clean' ? '_template-clean' : '_template';
if (a.style && !['paper', 'clean'].includes(a.style)) { console.error('--style must be paper or clean'); process.exit(1); }
cpSync(join(ROOT, 'stories', tpl), dst, { recursive: true });
const f = join(dst, 'story.json'), s = JSON.parse(readFileSync(f, 'utf8'));
s.slug = slug;
if (a.title) { s.title = a.title; if (s.book?.cover) s.book.cover.title = a.title; }
if (a.frame) s.frame = a.frame;
if (a.formats) s.formats = String(a.formats).split(',');
writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
console.log(`created stories/${slug}/ (story.json, scenes.js, score.js) – edit them, then: npm run voice -- ${slug}`);
