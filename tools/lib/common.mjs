// Shared helpers for the Node tools: paths, story loading, timeline, static server, browser.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import vm from 'node:vm';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PY = join(ROOT, '.venv', 'bin', 'python');

// Every video gets its own folder build/_<slug>/ holding everything: videos, players, web export,
// audio, narration and review images.
export const buildDir = (slug) => `_${slug}`;
export function paths(slug) {
  const build = join(ROOT, 'build', buildDir(slug));
  return { story: join(ROOT, 'stories', slug), build, audio: join(build, 'audio'), voice: join(build, 'voice'),
    review: join(build, 'review'), web: join(build, 'web'), frames: join(build, 'frames') };
}
export const fmtTag = (format) => (format === '9:16' ? '_9x16' : '');

export function loadStory(slug) {
  const p = paths(slug), f = join(p.story, 'story.json');
  if (!existsSync(f)) throw new Error(`no story "${slug}" (expected ${f}); create one with: npm run new -- ${slug}`);
  if (slug.startsWith('_') && !process.env.REELSMITH_DEV) throw new Error(`"${slug}" is a template – create a story from it: npm run new -- <slug>`);
  const story = JSON.parse(readFileSync(f, 'utf8'));
  story.slug = story.slug || slug;
  story.formats = story.formats || [story.format || '16:9'];
  const vf = join(p.voice, 'voice.json');
  const voice = existsSync(vf) ? JSON.parse(readFileSync(vf, 'utf8')) : {};
  return { story, voice, p };
}

// engine/timeline.js is a browser script (UMD); evaluate it in a sandbox for Node
let TL = null;
export function timeline(story, voice) {
  if (!TL) { const box = {}; box.globalThis = box; vm.runInNewContext(readFileSync(join(ROOT, 'engine', 'timeline.js'), 'utf8'), box); TL = box.VG.timeline; }
  return { T: TL.build(story, voice), check: TL.check };
}

export function ensureDir(d) { mkdirSync(d, { recursive: true }); return d; }
export const duration = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
export const run = (cmd, args, opt = {}) => execFileSync(cmd, args, { stdio: opt.quiet ? 'pipe' : 'inherit', ...opt });

// static file server rooted at the repo; POST /upload/<path> writes into build/
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ttf': 'font/ttf', '.css': 'text/css' };
export function serve() {
  return new Promise((ok) => {
    const s = http.createServer((req, rsp) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      if (req.method === 'POST' && url.startsWith('/upload/')) {
        const chunks = []; req.on('data', (c) => chunks.push(c));
        req.on('end', () => { const f = join(ROOT, 'build', url.slice(8)); ensureDir(dirname(f)); writeFileSync(f, Buffer.concat(chunks)); rsp.end('ok'); });
        return;
      }
      const f = join(ROOT, url);
      if (!f.startsWith(ROOT) || !existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); rsp.end(readFileSync(f));
    }).listen(0, '127.0.0.1', () => ok(s));
  });
}

// Chromium with GPU canvas if available (override with CHROME_PATH / CHROME_FLAGS)
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const c of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']) if (existsSync(c)) return c;
  throw new Error('No Chromium/Chrome found – install one or set CHROME_PATH');
}
export async function browser({ gpu = true } = {}) {
  const puppeteer = (await import('puppeteer-core')).default;
  const flags = process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(' ')
    : gpu ? ['--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : [];
  return puppeteer.launch({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', ...flags], protocolTimeout: 600000 });
}
// open engine/page.html for a story and wait until it is ready; throws on page errors
export async function openStory(b, port, slug, { format, mode = 'render' } = {}) {
  const page = await b.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); else if (m.type() === 'warn') console.warn('  page:', m.text()); });
  const q = new URLSearchParams({ story: slug, mode }); if (format) q.set('format', format);
  await page.goto(`http://127.0.0.1:${port}/engine/page.html?${q}`);
  await page.waitForFunction('window.VG_ERROR || (window.VG && window.VG.ready)', { timeout: 300000 });
  const err = await page.evaluate(() => window.VG_ERROR);
  if (err || errs.length) throw new Error('page error:\n' + (err || errs.join('\n')));
  const { W, H } = await page.evaluate(() => ({ W: window.VG.W, H: window.VG.H }));
  await page.setViewport({ width: W, height: H });
  return page;
}
// grab the canvas as an image buffer
export async function grab(page, t, type = 'image/png', quality) {
  const b64 = await page.evaluate((t, type, q) => { const c = document.getElementById('c'); VG.render(c.getContext('2d'), t); return c.toDataURL(type, q).split(',')[1]; }, t, type, quality);
  return Buffer.from(b64, 'base64');
}
export function args(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); o[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true); } else o._.push(a); }
  return o;
}
