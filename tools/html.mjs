// Players: npm run html -- <slug> [--format 9:16]
//  • build/_<slug>/<slug>[_9x16].html – one self-contained file (engine, story, fonts, audio inlined), double-click to play
//  • build/_<slug>/web/               – the same player as separate files for hosting or editing:
//      index.html, css/page.css, js/engine/…, js/audio/…, js/story/{story-data,scenes,score}.js, fonts/, audio/soundtrack.m4a
//    (serve it with any static web server; add ?format=9:16 to the URL for the portrait version)
import { readFileSync, writeFileSync, existsSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, loadStory, args, fmtTag, ensureDir } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run html -- <slug> [--format 9:16]'); process.exit(1); }
const { story, voice, p } = loadStory(slug);
const format = a.format || story.formats[0];
const audio = join(p.audio, 'soundtrack.m4a');
if (!existsSync(audio)) { console.error(`mix first: npm run mix -- ${slug}`); process.exit(1); }
const eng = join(ROOT, 'engine'), page = readFileSync(join(eng, 'page.html'), 'utf8'), css = readFileSync(join(eng, 'page.css'), 'utf8');
const storyFiles = ['scenes.js', 'score.js'].filter((f) => existsSync(join(p.story, f)));
const engineScripts = [...page.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const b64 = (f) => readFileSync(f).toString('base64');
const data = (fmt, audioSrc) => `window.STORY = ${JSON.stringify({ ...story, format: fmt })};\nwindow.VOICE = ${JSON.stringify(voice)};\nwindow.AUDIO_SRC = ${JSON.stringify(audioSrc)};\n`;

// ---------- standalone single file ----------
let html = page.replace('<link rel="stylesheet" href="page.css">',
  `<style>\n${css.replace(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g, (_, f) => `url(data:font/ttf;base64,${b64(join(ROOT, 'assets', 'fonts', f))})`)}</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${readFileSync(join(eng, f), 'utf8')}\n</script>`);
html = html.replace('<!--STORY-->', `<script>${data(format, `data:audio/mp4;base64,${b64(audio)}`)}</script>\n` +
  storyFiles.map((f) => `<script>\n${readFileSync(join(p.story, f), 'utf8')}\n</script>`).join('\n') + '\n<!--STORY-->');
const single = join(p.build, `${slug}${fmtTag(format)}.html`);
writeFileSync(single, html);
console.log(`${single} (${(html.length / 1e6).toFixed(1)} MB)`);

// ---------- web folder with separate html / css / js / fonts / audio ----------
rmSync(p.web, { recursive: true, force: true });
const put = (rel, content) => { const f = join(p.web, rel); ensureDir(dirname(f)); writeFileSync(f, content); };
put('css/page.css', css.replace(/url\("\.\.\/assets\/fonts\//g, 'url("../fonts/'));
cpSync(join(ROOT, 'assets', 'fonts'), join(p.web, 'fonts'), { recursive: true });
ensureDir(join(p.web, 'audio')); cpSync(audio, join(p.web, 'audio', 'soundtrack.m4a'));
for (const f of engineScripts) put(join('js', f.startsWith('../') ? f.slice(3) : join('engine', f)), readFileSync(join(eng, f)));
put('js/story/story-data.js', `// story settings and measured narration timings of "${story.title}"\n${data(story.formats[0], 'audio/soundtrack.m4a')}` +
  `if (new URLSearchParams(location.search).get('format')) window.STORY.format = new URLSearchParams(location.search).get('format');\n`);
for (const f of storyFiles) put(join('js', 'story', f), readFileSync(join(p.story, f)));
let index = page.replace('href="page.css"', 'href="css/page.css"')
  .replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script src="js/${f.startsWith('../') ? f.slice(3) : 'engine/' + f}"></script>`)
  .replace('<!--STORY-->', ['story-data.js', ...storyFiles].map((f) => `<script src="js/story/${f}"></script>`).join('\n') + '\n<!--STORY-->');
put('index.html', index);
console.log(`${p.web}/index.html (+ css, js, fonts, audio)`);
