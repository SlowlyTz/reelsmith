# AGENTS.md – from one prompt to a finished paper video

reelsmith turns a prompt ("a video for X, in which Y happens") into a **paper-craft stop-motion
video of any kind**: stories and fairytales, birthday/anniversary greetings, invitations,
explainers, product or brand clips, trip recaps, social posts. Hand-cut paper pieces with cast
shadows, pop-ups, puppets moving on twos, paper typography, optional narration, sampled music and
real paper foley – all rendered as a pure JavaScript canvas animation into `build/_<slug>/`.

Work autonomously: the user wants a finished, reviewed video, not a draft.
Quality bar: professional and handmade, in the tone the prompt asks for (cute, festive, calm, punchy …).
Exact APIs and defaults: [`docs/`](docs/README.md).

## 0. Prerequisites (once per machine)

`npm run setup` (add `-- --xtts` for expressive/female XTTS voices). If `assets/samples/manifest.json`,
`.tools/piper/piper` or `.venv/bin/python` are missing, run it.

## 1. Understand the prompt → decide

Extract: **purpose & audience**, **who** appears (names, looks: hair, clothes), **what happens** (beats in order),
places, the ending, details that must appear verbatim (names, dates, addresses, a slogan).
Then decide (defaults in brackets) and note the decisions for the final report:

| Decision | Options |
|---|---|
| frame | `book` = storybook on a table (stories, fairytales, sentimental gifts) · `stage` = full-bleed paper diorama (greetings, invitations, explainers, promos, social) |
| formats | `16:9`, `9:16` or both [both] – 9:16 for social/phone, 16:9 for TV/YouTube |
| narration | yes (storytelling, explaining) or no (music + on-screen text) [yes for stories] |
| subtitles | narrated social/muted viewing: `{ "style": "words" }` (9:16, word by word) · `{ "style": "bold" }` (16:9 captions) · `true` (storybook strip) |
| file size | `"render": { "targetMB": N }` when there is a size limit (e.g. GitHub ≤ 20 MB, TikTok) |
| language | of voice and all on-screen text [German] |
| length | [45–60 s]; social cuts 15–30 s |
| music | mood + meter: fairytale waltz 3/4 ~100 BPM · upbeat 4/4 110–124 BPM (pizzicato, glockenspiel) · calm 4/4 70–85 BPM (harp, strings) |
| ending | book closes + sticker (`heart`/`star`) · stage: sticker and/or `outro.text` ("Alles Gute!", a date, a call to action) |

Ask the user only if something essential is truly ambiguous (e.g. a missing date for an invitation).

## 2. Create the project

```
npm run new -- <slug> --title "…" [--frame stage] [--formats 9:16]
```
Edit `stories/<slug>/`:
- `story.json` – settings, `cast`, `scenes` (id + bars), `lines` → [docs/story-format.md](docs/story-format.md)
- `scenes.js` – one `VG.scene(id, { bg, fg, light?, camera?, sfx? })` per scene → [docs/scenes.md](docs/scenes.md)
- `score.js` – `VG.compose = (M, T) => { … }` → [docs/audio.md](docs/audio.md)

The template is a small storybook; replace its content completely – it only demonstrates the techniques.

### Script
- Narrated: 1–2 short sentences per line, ~6–9 lines per minute. The last line lands the point/emotion.
- Not narrated: `lines: []`; carry the message with on-screen text (`VG.cutoutText`, `VG.paperNote`, `VG.banner`).
- `text` = meaning / subtitles, `tts` = what the voice reads (pronunciation fixes), `ref` = transcript form (digits).

### Timing
- Every scene is a whole number of `bars` (bar = beatsPerBar × 60/bpm); transitions land on downbeats.
- Narrated scene ≈ narration + 1.5 s. Text-only scene: give the eye ~1 s per 3 words + 1 s.
- Book: `intro.bars` (closed book) + cover opening; stage: starts on the first scene.

### Visual rules (details in docs/scenes.md)
- Lay out relative to `st.L.w`/`st.L.h` so every format works; in the 16:9 book keep faces/text off the gutter (x = 0).
- Draw every standing thing through `VG.pop(…, st.pop(at))` – it rises in, and folds away on transitions.
- Sync to narration with `st.word('vo2', 'Tom')`: names/objects pop when spoken.
- Camera per scene `[[lt, x, y, zoom], …]`: follow action, push in (1.3–1.6) on key moments.
- Characters: `cast` + `VG.puppet` (docs/library.md). Match the prompt's descriptions exactly.

## 3. Voice (skip when there is no narration)

`npm run voice -- <slug>` (`--only vo3,vo5` to redo lines). Piper = reliable warm male storyteller;
XTTS = expressive, female and male voices (`npm run cast -- <slug> --gender female` to choose).
**Read the report**: `sim < 0.9` or a wrong transcript = fix `tts` spelling and redo. Check names,
loanwords and every number/date in the transcript. Details: [docs/audio.md](docs/audio.md).

## 4. Iterate: fit, look, balance

```
npm run timeline -- <slug>                       # all lines must fit
npm run snap -- <slug> --sheet [--format 9:16]   # stills → build/_<slug>/review/ – LOOK at them
npm run mix -- <slug> --stems                    # voice ~10–14 LU above music, ≈ -16 LUFS
```

## 5. Render, review, deliver

```
npm run video -- <slug>        # mix → render all formats → html → review sheets
```
Review `build/_<slug>/review/video_sheet*` with [docs/quality.md](docs/quality.md); fix and re-render.
Deliver `build/_<slug>/<slug>.mp4`, `<slug>_9x16.mp4`, `<slug>.html`. Report: what the video shows,
decisions from step 1, voice, duration, paths, and what you could not verify (you cannot listen).

## Build output (mandatory)

Every video gets exactly one folder **`build/_<slug>/`** – an underscore plus a short name that fits the
video (the kebab-case slug, e.g. `build/_oma-80/`). Everything belonging to that video goes there and
nowhere else; the tools already write this layout, never move files out of it:

```
build/_<slug>/
  <slug>.mp4 · <slug>_9x16.mp4       finished videos
  <slug>.html · <slug>_9x16.html     standalone players (double-click)
  web/                               player as separate files: index.html, css/, js/ (engine + this video's scenes/score/data), fonts/, audio/
  audio/                             soundtrack.wav/.m4a, mix_raw.wav, stems/
  voice/                             narration per line, voice.json, raw takes, casting samples
  review/                            stills and contact sheets
```
Templates (`stories/_template`) are never rendered into `build/`.

## Conventions

- Style-agnostic engine in `engine/*.js`; the paper look in `engine/styles/paper/` (future styles: [docs/extending.md](docs/extending.md)).
- Deterministic: never `Math.random()` – use `VG.rng(seed)`, `VG.hash`.
- Don't commit `build/`, downloaded `assets/*` folders, `.cache/`, `.tools/`, `.venv/`.
- Licences: `assets/CREDITS.md` (CC BY-SA samples: celesta, music_box, choir_aahs; XTTS non-commercial).
