# Audio: narration, music, mix

## Narration (`npm run voice -- <slug>`)

Pipeline per line: engine → `build/_<slug>/voice/raw/<id>.wav` → mastering (48 kHz, high-pass 75 Hz,
+`warmth` dB at 200 Hz, −1.5 dB at 3.4 kHz, −2.2 dB at 8 kHz, gentle compression, −19 LUFS) →
`voice/<id>.wav` → Whisper word timestamps → `voice/voice.json`
(`dur`, `speechEnd`, `words`, `transcript`, `sim`, `phonemes`).

| Engine | Strengths | Watch out |
|---|---|---|
| `piper` (`de_DE-thorsten-high`) | fast (RTF ~0.15), deterministic, warm male storyteller | prints phonemes – check stress of names/loanwords |
| `xtts` (XTTS-v2 studio speakers) | expressive, female + male voices | babbles after short phrases / garbles words → handled phrase-by-phrase with Whisper verification + trimming; ~10–40 s per phrase on CPU; non-commercial licence |

Pronunciation fixes go into `tts` (keep `text` correct): phonetic spelling (`Emieljo`, `Karschtadt`,
`Läptop`, `Mielo` for a clear long i), numbers and dates as words, commas for pauses.
Verification: `sim` ≥ 0.95 and a transcript that matches; dates/numbers must be exactly right.
For XTTS lines containing numbers set `ref` (e.g. `"Seit dem 14. April 2024."`) so verification compares digits.

Casting (XTTS): `npm run cast -- <slug> [--gender female|male] [--speakers "A,B"]` → table of
`lang_p` (native-sounding), `sim` (intelligible), `f0` (pitch, ~200–230 Hz female, ~100–130 Hz male),
`melody` (semitone spread; higher = more expressive). Good narrators found so far: Uta Obando, Maja Ruoho, Chandra MacFarland (female).

## Music (`score.js`)

```js
VG.compose = (M, T) => {
  const b = (id) => M.sceneBar(id);
  ['F', 'Am', 'Bb', 'C'].forEach((c, i) => { M.harp(b('forest') + i, c); M.pad(b('forest') + i, c, 1, 0.26); });
  M.mel('celesta', b('forest'), [['A5', 1], ['C6', 1], ['F6', 1]], 0.5);
  M.chime(T.lines.vo2.words[3][1], 'A6');       // bell exactly on a spoken word
};
```

| M. | Does |
|---|---|
| `bt(bar, beat)` · `sceneBar(id)` · `outroBar()` · `bars()` | positions on the grid |
| `harp(bar, chord, vel)` | eighth-note arpeggio for one bar |
| `pad(bar, chord, bars, vel, insts)` | sustained strings / choir: `violas`, `cellos`, `violins`, `choir` |
| `pizz(bar, chord, vel)` | pizzicato bass + off-beats (bouncy, playful) |
| `mel(inst, bar, [[note\|null, beats], …], vel, pan, {tail, legato, attack})` | melody |
| `gliss(inst, notes, t, step, vel, dur)` · `scale(root, fromOct, toOct)` | runs (cover opening, reveals) |
| `chime(t, ...notes)` | glockenspiel accents |
| `add(inst, note, t, dur, vel, pan, {attack})` | anything else |
| `sfx(t, file, gain, opts)` | a sound effect at absolute time t (see Sound effects) |

Chords: root + `''`, `m`, `7`, `m7`, `maj7`, `sus4`, `sus2`, `dim`, `add9` (e.g. `Bb`, `F#m`, `Gm7`). Notes: `'C#5'` or MIDI numbers.

Instruments (MIDI range): music_box 60–96 · celesta 60–96 · harp 28–101 · glockenspiel 79–108 ·
violins 55–86 · violas 48–86 · cellos 36–77 · violin_solo 55–96 · violins_pizz 55–86 · cellos_pizz 36–77 ·
flute / flute_nv 60–96 · choir_aahs 48–84 (looped). Outside the range samples get pitch-shifted – stay inside.
Licence: music_box, celesta, choir_aahs are CC BY-SA 3.0; all others CC0.

Moods: fairytale = music box/celesta over harp, 3/4 · playful = pizz + celesta + glockenspiel ·
lyrical = flute over harp + strings · climax = violins melody + full pad + choir · calm outro = pad + music box.

## Mix (`npm run mix -- <slug> [--stems]`)

Buses (dB, override with `story.mix`): music −8 (ducked −5.5 dB under narration), voice 0, sfx −5, ambience −14;
hall reverb on music/sfx, small room on voice; compressor + limiter; ffmpeg loudnorm → −16 LUFS, −1.5 dBTP.
Automatic cues: book open/close, page turns, pop-ups on every scene opening, stage sheet slides, sticker.
`--stems` prints short-term loudness per second for voice/music/fx.

## Sound effects (`assets/sfx/`)

| Category | Files (duration) |
|---|---|
| page turn | page_turn_1 (0.4 s), _2 (0.7), _3 (1.6, full), _4 (0.4) |
| book | book_open (2.5, thump at ~1.8 s), book_open_2 (0.5), book_close (0.5), book_close_2 (0.2) |
| paper | paper_rustle_1 (1.1), _2 (0.9), _3 (1.6, slide), _4 (0.9, flutter) · paper_pop_1 (0.4, snap), _2 (0.5), _3 (0.25, tap), _4 (1.0, swish) · paper_crumple_1 (0.7, dense burst), _2 (1.9, light crackle), _3 (2.8, full ball-up) |
| ambience (30 s) | waves_soft_1/2, forest_ambience_1/2, night_ambience_1/2 (crickets), city_distant_1/2, wind_soft_1 |
| voice | yawn_1 (2.4, big exaggerated male yawn) · yawn_2 (3.3, inhale then loud 'aaah-hm' from ~1.6 s) · yawn_3 (2.6, higher, sustained) · yawn_4 (1.25, short) – vary with `rate` 0.9–1.15 |
| other | typing_soft_1 (6 s, pause at start → `offset: 0.7`), typing_soft_2 (6.4 s) |
| procedural | `synth:boom` (5.5 s deep impact: sub drop + crack + rumble – explosions, big reveals) · `synth:whoosh` (1.2 s, moves L→R) · `synth:riser` (3 s swell peaking at its end – start it 3 s before the hit) · `synth:sub` (3.2 s low drone hit) |

Place sounds per scene (`sfx: [[lt, file, gain, opts]]`, lt relative to the scene opening) or at absolute
times from `score.js`: `M.sfx(t, file, gain, opts)`, e.g. on a spoken word
`M.sfx(T.lines.vo4.words[2][1], 'synth:boom', 1.2)`. Loud one-offs (boom) may go above 1 – the limiter catches peaks.
