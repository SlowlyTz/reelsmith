// Soundtrack: npm run mix -- <slug> [--stems]
// Renders score + narration + sfx offline in Chromium, masters to -16 LUFS -> build/<slug>/soundtrack.{wav,m4a}.
// --stems additionally writes music/voice/fx stems and prints per-second loudness for balance checks.
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadStory, timeline, serve, browser, openStory, run, args } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run mix -- <slug> [--stems]'); process.exit(1); }
const { story, voice, p } = loadStory(slug);
const { T } = timeline(story, voice);
const srv = await serve(), b = await browser({ gpu: false });
try {
  const page = await openStory(b, srv.address().port, slug, { mode: 'mix' });
  const render = (upload, mute = {}) => page.evaluate((o) => VG.renderMix(o), { samples: '/assets/samples/', sfx: '/assets/sfx/', voice: `/build/${slug}/voice/`, upload: `${slug}/${upload}`, mute });
  const t0 = Date.now();
  const len = await render('mix_raw.wav');
  console.log(`rendered ${len.toFixed(1)}s of audio in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (a.stems) for (const [n, m] of [['stem_music.wav', { voice: 1, sfx: 1, amb: 1 }], ['stem_voice.wav', { music: 1, sfx: 1, amb: 1 }], ['stem_fx.wav', { music: 1, voice: 1 }]]) await render(n, m);
} finally { await b.close(); srv.close(); }

run('ffmpeg', ['-v', 'error', '-y', '-i', join(p.build, 'mix_raw.wav'), '-af', `loudnorm=I=-16:TP=-1.5:LRA=11:linear=true,afade=t=out:st=${(T.end - 0.5).toFixed(2)}:d=1.3`,
  '-ar', '48000', '-c:a', 'pcm_s24le', join(p.build, 'soundtrack.wav')]);
run('ffmpeg', ['-v', 'error', '-y', '-i', join(p.build, 'soundtrack.wav'), '-c:a', 'aac', '-b:a', '256k', join(p.build, 'soundtrack.m4a')]);
const r = spawnSync('ffmpeg', ['-hide_banner', '-i', join(p.build, 'soundtrack.wav'), '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
const I = /I:\s+(-?[\d.]+) LUFS/.exec(r.stderr.split('Summary')[1] || '')?.[1];
console.log(`soundtrack: ${join(p.build, 'soundtrack.wav')}  integrated ${I} LUFS`);
if (a.stems) for (const s of ['stem_voice', 'stem_music', 'stem_fx']) console.log(s.padEnd(11), shortTerm(join(p.build, s + '.wav')));

// short-term loudness per second, e.g. "5:-14 6:-13 …" (voice should sit ~10-14 LU above music)
function shortTerm(f) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128=metadata=1,ametadata=print:key=lavfi.r128.S', '-f', 'null', '-'], { encoding: 'utf8' });
  const out = {}; let t = 0;
  for (const line of r.stderr.split('\n')) { const m = /pts_time:([\d.]+)/.exec(line); if (m) t = +m[1]; const s = /r128\.S=(-?[\d.]+)/.exec(line); if (s && !(Math.floor(t) in out)) out[Math.floor(t)] = Math.round(+s[1]); }
  return Object.entries(out).filter(([, v]) => v > -70).map(([k, v]) => `${k}:${v}`).join(' ');
}
