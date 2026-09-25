// Standalone player: npm run html -- <slug> [--format 9:16]
// Inlines engine, story, voice timings, fonts and the soundtrack into one HTML file that plays
// the animation in any browser (double-click, no server) -> build/<slug>/<slug>[_9x16].html
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadStory, args, fmtTag } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run html -- <slug> [--format 9:16]'); process.exit(1); }
const { story, voice, p } = loadStory(slug);
const format = a.format || story.formats[0];
const audio = join(p.build, 'soundtrack.m4a');
if (!existsSync(audio)) { console.error(`mix first: npm run mix -- ${slug}`); process.exit(1); }
const eng = join(ROOT, 'engine');
let html = readFileSync(join(eng, 'page.html'), 'utf8');
const b64 = (f) => readFileSync(f).toString('base64');
html = html.replace(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g, (_, f) => `url(data:font/ttf;base64,${b64(join(ROOT, 'assets', 'fonts', f))})`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${readFileSync(join(eng, f), 'utf8')}\n</script>`);
const data = `<script>window.STORY = ${JSON.stringify({ ...story, format })};\nwindow.VOICE = ${JSON.stringify(voice)};\nwindow.AUDIO_SRC = "data:audio/mp4;base64,${b64(audio)}";</script>\n` +
  ['scenes.js', 'score.js'].filter((f) => existsSync(join(p.story, f))).map((f) => `<script>\n${readFileSync(join(p.story, f), 'utf8')}\n</script>`).join('\n');
html = html.replace('<!--STORY-->', data + '\n<!--STORY-->');
const out = join(p.build, `${slug}${fmtTag(format)}.html`);
writeFileSync(out, html);
console.log(`${out} (${(html.length / 1e6).toFixed(1)} MB)`);
