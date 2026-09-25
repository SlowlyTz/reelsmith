// Fit check: npm run timeline -- <slug>
// Prints scene timing and whether every narration line ends before its scene turns the page.
import { loadStory, timeline, args } from './lib/common.mjs';

const slug = args()._[0];
if (!slug) { console.error('usage: npm run timeline -- <slug>'); process.exit(1); }
const { story, voice } = loadStory(slug);
const { T, check } = timeline(story, voice);
const r = check(T);
console.log(`${story.title} – ${story.frame || 'book'}, ${T.bpm} BPM, bar ${T.bar.toFixed(2)}s, total ${T.end.toFixed(2)}s`);
console.table(r.table);
const missing = (story.lines || []).filter((l) => !voice[l.id]).map((l) => l.id);
if (missing.length) console.log(`no voice yet for: ${missing.join(', ')} (npm run voice -- ${slug})`);
if (r.problems.length) { console.log('\nPROBLEMS:\n- ' + r.problems.join('\n- ')); process.exitCode = 2; }
else console.log('\nall lines fit.');
