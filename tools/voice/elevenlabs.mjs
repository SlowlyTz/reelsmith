// ElevenLabs text-to-speech (cloud). Key: ELEVENLABS_API_KEY in .env (gitignored) or the shell.
// Every take is cached in .cache/elevenlabs/ by (voice, model, settings, text, neighbours, seed), so
// re-running `npm run voice` costs no credits; set a line's "take": 1, 2, … for a different take.
// Free plan: ~10k credits/month (multilingual v2 ≈ 1 credit per character) and only the
// premade voices ("category": "premade") via the API – Voice Library voices need a paid plan.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT, ensureDir, loadEnv } from '../lib/common.mjs';

const API = 'https://api.elevenlabs.io/v1';
export const DEFAULTS = { model: 'eleven_multilingual_v2', stability: 0.5, similarity: 0.75, style: 0.15, speed: 1.0, speakerBoost: true };
// premade voices that sound calm and soft in German (for casting; see `npm run cast -- <slug> --engine elevenlabs`)
export const CALM = ['Will', 'Brian', 'Eric', 'Roger', 'George', 'River', 'Chris', 'Lily', 'Sarah', 'Matilda'];

function key() {
  loadEnv();
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('ELEVENLABS_API_KEY missing – put it into .env in the repo root (see .env)');
  return k;
}
async function api(path, opt = {}) {
  const r = await fetch(API + path, { ...opt, headers: { 'xi-api-key': key(), ...(opt.body ? { 'content-type': 'application/json' } : {}), ...opt.headers } });
  if (!r.ok) {
    let msg = await r.text(); try { const d = JSON.parse(msg).detail; msg = d?.message || d?.status || JSON.stringify(d); } catch {}
    const e = new Error(`ElevenLabs ${r.status}: ${msg}`); e.status = r.status; e.body = msg; throw e;
  }
  return r;
}

export async function voices() {
  return (await (await api('/voices')).json()).voices.map((v) => ({ id: v.voice_id, name: v.name.split(' - ')[0].trim(), full: v.name,
    category: v.category, gender: v.labels?.gender, accent: v.labels?.accent, age: v.labels?.age, desc: v.labels?.descriptive, preview: v.preview_url }));
}
// voice id, or a name ("Will", "Will - Relaxed Optimist") looked up in the account's voices
export async function resolveVoice(name) {
  if (/^[A-Za-z0-9]{20}$/.test(name)) return { id: name, name };
  const all = await voices(), n = name.toLowerCase();
  const v = all.find((x) => x.name.toLowerCase() === n || x.full.toLowerCase() === n) || all.find((x) => x.full.toLowerCase().startsWith(n));
  if (!v) throw new Error(`unknown ElevenLabs voice "${name}" – available: ${all.map((x) => `${x.name} (${x.category})`).join(', ')}`);
  if (v.category !== 'premade') console.warn(`  note: "${v.full}" is a ${v.category} voice – the free plan can only use premade voices via the API`);
  return v;
}
export async function credits() {
  const d = await (await api('/user/subscription')).json();
  return { tier: d.tier, used: d.character_count, limit: d.character_limit };
}

// one take → mp3 file (cached). job: { voiceId, text, prev, next, take, lang, V }
async function tts({ voiceId, text, prev, next, take = 0, lang, V }) {
  const body = {
    text, model_id: V.model,
    voice_settings: { stability: V.stability, similarity_boost: V.similarity, style: V.style, speed: V.speed, use_speaker_boost: V.speakerBoost },
    seed: (parseInt(createHash('sha1').update(text).digest('hex').slice(0, 7), 16) + take * 7919) % 4294967295,
    ...(V.context !== false && prev ? { previous_text: prev } : {}), ...(V.context !== false && next ? { next_text: next } : {}),
    ...(/^eleven_(multilingual_v2|monolingual)/.test(V.model) ? {} : { language_code: lang }),
  };
  const id = createHash('sha1').update(JSON.stringify([voiceId, body])).digest('hex').slice(0, 16);
  const f = join(ensureDir(join(ROOT, '.cache', 'elevenlabs')), `${id}.mp3`);
  if (existsSync(f)) return { f, cached: true };
  const send = (b) => api(`/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify(b) });
  let r;
  try { r = await send(body); }
  catch (e) {   // a model without language_code support: retry without it
    if (e.status !== 400 || !body.language_code || !/language/i.test(e.body)) throw e;
    delete body.language_code; r = await send(body);
  }
  writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  return { f, cached: false };
}

// generate every line into raw/<id>.wav (44.1 kHz mono); returns characters sent (0 when cached)
export async function elevenlabsLines({ voice, lang, lines, all, raw }) {
  const V = { ...DEFAULTS, ...voice }, v = await resolveVoice(V.voice || 'Will');
  console.log(`elevenlabs: ${v.full || v.name} · ${V.model} · stability ${V.stability} · style ${V.style} · speed ${V.speed}`);
  let sent = 0;
  for (const l of lines) {
    const i = all.findIndex((x) => x.id === l.id), say = (x) => x && (x.tts || x.text).replace(/…/g, '');
    const text = say(l), { f, cached } = await tts({ voiceId: v.id, text, prev: say(all[i - 1]), next: say(all[i + 1]), take: l.take || 0, lang, V });
    if (!cached) sent += text.length;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-ac', '1', '-ar', '44100', join(raw, `${l.id}.wav`)]);
    console.log(`elevenlabs ${l.id}${l.take ? ` (take ${l.take})` : ''}: ${cached ? 'cached' : `${text.length} chars`}`);
  }
  return sent;
}

// casting: one sentence with several voices → <outdir>/<name>.wav
export async function elevenlabsCast({ names, text, lang, voice = {}, outdir }) {
  const V = { ...DEFAULTS, ...voice }, all = await voices(), out = [];
  const pick = names?.length ? names.map((n) => all.find((v) => v.name.toLowerCase() === n.toLowerCase()) || { name: n, missing: true })
    : all.filter((v) => v.category === 'premade' && CALM.includes(v.name));
  for (const v of pick) {
    if (v.missing) { console.warn(`  unknown voice ${v.name}`); continue; }
    const { f } = await tts({ voiceId: v.id, text, lang, V });
    const wav = join(outdir, `${v.name.toLowerCase()}.wav`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-ac', '1', '-ar', '44100', wav]);
    out.push({ voice: v.name, category: v.category, gender: v.gender, accent: v.accent, age: v.age, desc: v.desc, file: wav });
  }
  return out;
}

// quick check without a story: node tools/voice/elevenlabs.mjs [--voices]
if (process.argv[1] && process.argv[1].endsWith('elevenlabs.mjs')) {
  const c = await credits();
  console.log(`plan ${c.tier}: ${c.used}/${c.limit} credits used this period`);
  if (process.argv.includes('--voices')) console.table((await voices()).map(({ name, category, gender, accent, age, desc }) => ({ name, category, gender, accent, age, desc })));
}
