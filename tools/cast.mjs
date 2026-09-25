// Voice casting (XTTS): npm run cast -- <slug> [--gender female|male] [--speakers "A,B"] [--text "…"]
// Speaks one sentence with many built-in XTTS voices and ranks them. Pick by: lang_p≈1 and sim≈1
// (clean native speech), pitch fitting the role, higher melody = more expressive storytelling.
// Then set story.voice = { "engine": "xtts", "speaker": "<name>" }.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, PY, loadStory, ensureDir, args } from './lib/common.mjs';

const FEMALE = ['Claribel Dervla', 'Daisy Studious', 'Gracie Wise', 'Tammie Ema', 'Alison Dietlinde', 'Ana Florence', 'Annmarie Nele', 'Asya Anara', 'Brenda Stern', 'Gitta Nikolina',
  'Henriette Usha', 'Sofia Hellen', 'Tammy Grit', 'Tanja Adelina', 'Vjollca Johnnie', 'Nova Hogarth', 'Maja Ruoho', 'Uta Obando', 'Lidiya Szekeres', 'Chandra MacFarland',
  'Szofi Granger', 'Camilla Holmström', 'Lilya Stainthorpe', 'Zofija Kendrick', 'Narelle Moon', 'Barbora MacLean', 'Alexandra Hisakawa', 'Alma María', 'Rosemary Okafor'];
const MALE = ['Andrew Chipper', 'Badr Odhiambo', 'Dionisio Schuyler', 'Royston Min', 'Viktor Eka', 'Abrahan Mack', 'Adde Michal', 'Baldur Sanjin', 'Craig Gutsy', 'Damien Black',
  'Gilberto Mathias', 'Ilkin Urbano', 'Kazuhiko Atallah', 'Ludvig Milivoj', 'Suad Qasim', 'Torcull Diarmuid', 'Viktor Menelaos', 'Zacharie Aimilios', 'Ige Behringer', 'Filip Traverse',
  'Damjan Chapman', 'Wulf Carlevaro', 'Aaron Dreschner', 'Kumar Dahl', 'Eugenio Mataracı', 'Ferran Simen', 'Xavier Hayasaka', 'Luis Moray', 'Marcos Rudaski'];

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run cast -- <slug> [--gender female|male] [--speakers "A,B"] [--text "…"]'); process.exit(1); }
const { story, p } = loadStory(slug);
const speakers = a.speakers ? String(a.speakers).split(',').map((s) => s.trim()) : a.gender === 'male' ? MALE : FEMALE;
const text = a.text || story.lines.slice(0, 2).map((l) => (l.tts || l.text).replace(/…/g, '')).join(' ');
const outdir = ensureDir(join(p.voice, 'cast'));
console.log(`casting ${speakers.length} voices (~40 s each on CPU) with: "${text}"`);
const r = spawnSync(PY, [join(ROOT, 'tools', 'voice', 'cast.py')], { input: JSON.stringify({ lang: story.lang || 'de', text, speakers, outdir }), encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, TTS_HOME: join(ROOT, '.cache', 'models', 'tts') }, maxBuffer: 1 << 26 });
if (r.status !== 0) process.exit(1);
const rows = JSON.parse(r.stdout).sort((x, y) => y.sim - x.sim || y.lang_p - x.lang_p || y.melody - x.melody);
writeFileSync(join(outdir, 'cast.json'), JSON.stringify(rows, null, 1));
console.table(rows.map(({ speaker, lang_p, sim, f0, melody }) => ({ speaker, lang_p, sim, f0, melody })));
console.log(`samples + cast.json in ${outdir}`);
