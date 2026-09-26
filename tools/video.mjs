// Everything in one go: npm run video -- <slug> [--revoice] [--format 16:9] [--force]
// voice (if missing) -> fit check -> soundtrack -> video per format -> players (html + web/) -> contact sheets.
// Everything lands in build/_<slug>/.
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, loadStory, timeline, args, fmtTag, buildDir } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run video -- <slug> [--revoice] [--format 16:9|9:16] [--force]'); process.exit(1); }
const step = (tool, ...rest) => { console.log(`\n=== ${tool} ${rest.join(' ')}`); execFileSync('node', [join(ROOT, 'tools', tool + '.mjs'), slug, ...rest], { stdio: 'inherit' }); };

let { story, voice } = loadStory(slug);
if (a.revoice || (story.lines || []).some((l) => !voice[l.id])) { step('voice'); ({ story, voice } = loadStory(slug)); }
const { T, check } = timeline(story, voice), r = check(T);
if (r.problems.length && !a.force) { console.error('\nnarration does not fit:\n- ' + r.problems.join('\n- ') + '\nfix story.json (bars / line timing) or pass --force'); process.exit(2); }
step('mix');
const formats = a.format ? [a.format] : story.formats;
for (const f of formats) { step('render', '--format', f); step('html', '--format', f); step('sheet', '--format', f); }
const dir = `build/${buildDir(slug)}`;
console.log(`\nDONE – everything is in ${dir}/ (${T.end.toFixed(1)} s):`);
for (const f of formats) console.log(`  ${dir}/${slug}${fmtTag(f)}.mp4   ${dir}/${slug}${fmtTag(f)}.html`);
console.log(`  ${dir}/web/  ${dir}/audio/  ${dir}/voice/  ${dir}/review/`);
