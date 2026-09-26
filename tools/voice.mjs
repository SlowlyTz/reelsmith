// Narration: npm run voice -- <slug> [--only vo2,vo3]
// Generates every line of story.json with Piper or XTTS (story.voice.engine), masters it and
// measures word timings with Whisper -> build/_<slug>/voice/<id>.wav + voice.json.
// Always read the report: a low "sim" means the transcript differs from the text (mispronounced
// or garbled word) – fix the line's "tts" spelling and regenerate just that line with --only.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { ROOT, PY, loadStory, ensureDir, duration, args } from './lib/common.mjs';

const a = args(), slug = a._[0];
if (!slug) { console.error('usage: npm run voice -- <slug> [--only vo1,vo2]'); process.exit(1); }
const { story, voice: old, p } = loadStory(slug);
const V = Object.assign({ engine: 'piper', model: 'de_DE-thorsten-high', lengthScale: 1.12, noiseScale: 0.62, noiseW: 0.85, sentenceSilence: 0.45, speed: 1.0, warmth: 2 }, story.voice);
const lang = story.lang || 'de';
const only = a.only ? String(a.only).split(',') : null;
const lines = (story.lines || []).filter((l) => !only || only.includes(l.id));
const raw = ensureDir(join(p.voice, 'raw'));
const hasPy = existsSync(PY);

// ---------- generate raw takes ----------
const phonemes = {};
if (V.engine === 'piper') {
  const bin = join(ROOT, '.tools', 'piper', 'piper');
  if (!existsSync(bin)) throw new Error('Piper missing – run: npm run setup');
  const model = await piperModel(V.model);
  for (const l of lines) {
    const out = join(raw, `${l.id}.wav`);
    const r = spawnSync(bin, ['--model', model, '--length_scale', String(V.lengthScale), '--noise_scale', String(V.noiseScale), '--noise_w', String(V.noiseW),
      '--sentence_silence', String(V.sentenceSilence), '--debug', '--output_file', out], { input: l.tts || l.text, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`piper failed for ${l.id}: ${r.stderr.slice(-400)}`);
    phonemes[l.id] = [...r.stderr.matchAll(/phoneme\(s\) to ids: (.*)$/gm)].map((m) => m[1].trim()).join(' | ');
    console.log(`piper ${l.id}: ${phonemes[l.id]}`);
  }
} else if (V.engine === 'xtts') {
  if (!hasPy) throw new Error('Python venv missing – run: npm run setup -- --xtts');
  const job = { lang, speaker: V.speaker || 'Uta Obando', speed: V.speed, tries: V.tries || 8,
    items: lines.map((l) => ({ id: l.id, text: l.tts || l.text, ref: l.ref, out: join(raw, `${l.id}.wav`) })) };
  const r = spawnSync(PY, [join(ROOT, 'tools', 'voice', 'xtts_lines.py')], { input: JSON.stringify(job), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], env: { ...process.env, TTS_HOME: join(ROOT, '.cache', 'models', 'tts') }, maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('xtts failed');
} else throw new Error(`unknown voice engine ${V.engine} (piper | xtts)`);

// ---------- master: EQ, gentle compression, loudness ----------
for (const l of lines) {
  const af = `aresample=48000:resampler=soxr,highpass=f=75,equalizer=f=200:t=q:w=0.9:g=${V.warmth},equalizer=f=3400:t=q:w=1.4:g=-1.5,` +
    'equalizer=f=8000:t=q:w=1.5:g=-2.2,acompressor=threshold=-22dB:ratio=2.2:attack=10:release=150:makeup=2,loudnorm=I=-19:TP=-3:LRA=7';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', join(raw, `${l.id}.wav`), '-af', af, '-ar', '48000', '-ac', '1', join(p.voice, `${l.id}.wav`)]);
}

// ---------- measure: words (Whisper) or at least the end of speech ----------
let heard = {};
if (hasPy) {
  const job = { lang, items: lines.map((l) => ({ id: l.id, wav: join(p.voice, `${l.id}.wav`), ref: (l.ref || l.tts || l.text).replace(/[…]/g, '') })) };
  const r = spawnSync(PY, [join(ROOT, 'tools', 'voice', 'whisper_words.py')], { input: JSON.stringify(job), encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'], maxBuffer: 1 << 26 });
  if (r.status === 0) heard = JSON.parse(r.stdout); else console.warn('whisper failed – continuing without word timings');
} else console.warn('no Python venv: skipping Whisper (no word timings, no pronunciation check). Run npm run setup.');

const voice = only ? old : {};
for (const l of lines) {
  const f = join(p.voice, `${l.id}.wav`), dur = duration(f), h = heard[l.id];
  const speechEnd = h?.words?.length ? h.words[h.words.length - 1][2] + 0.1 : speechEndBySilence(f, dur);
  voice[l.id] = { engine: V.engine, text: l.tts || l.text, dur: +dur.toFixed(3), speechEnd: +speechEnd.toFixed(3), words: h?.words || [],
    transcript: h?.transcript, sim: h?.sim, phonemes: phonemes[l.id] };
}
writeFileSync(join(p.voice, 'voice.json'), JSON.stringify(voice, null, 1));

console.log('\nline  speech   sim   transcript');
for (const l of lines) { const v = voice[l.id]; console.log(`${l.id.padEnd(5)} ${v.speechEnd.toFixed(2).padStart(5)}s  ${v.sim != null ? v.sim.toFixed(2) : ' -  '}  ${v.transcript ?? ''}${v.sim != null && v.sim < 0.9 ? '   <-- CHECK' : ''}`); }
console.log(`\nwrote ${join(p.voice, 'voice.json')} – next: npm run timeline -- ${slug}`);

function speechEndBySilence(f, dur) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-40dB:d=0.25', '-f', 'null', '-'], { encoding: 'utf8' });
  const starts = [...r.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const last = starts.filter((s) => s > 0.2).pop();
  return last && last > dur - 1.5 ? last : dur;
}

// download a Piper voice by name, e.g. de_DE-thorsten-high
async function piperModel(name) {
  const dir = ensureDir(join(ROOT, '.cache', 'models', 'piper')), f = join(dir, `${name}.onnx`);
  if (existsSync(f) && existsSync(f + '.json')) return f;
  const [code, speaker, quality] = name.split('-'), base = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${code.split('_')[0]}/${code}/${speaker}/${quality}/${name}.onnx`;
  for (const [url, out] of [[base, f], [base + '.json', f + '.json']]) {
    console.log('downloading', url);
    const r = await fetch(url); if (!r.ok) throw new Error(`cannot download ${url} (${r.status})`);
    writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  }
  return f;
}
