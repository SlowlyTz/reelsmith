# Tools (`npm run <tool> -- <slug> [flags]`)

Flags go after the slug. All outputs of a video land in its own folder `build/_<slug>/` (layout: AGENTS.md → Build output).

| Tool | Flags | Output / purpose | Typical time |
|---|---|---|---|
| `setup` | `--xtts` | Node deps, Qwen3-TTS (`.tools/qwen/venv`, models on first use), Piper + voice, `.venv` (Whisper; XTTS), assets | 2–15 min first time |
| `fetch-assets` | `--only samples\|sfx\|fonts`, `--force`, `--jobs N` | `assets/{samples,sfx,fonts}` from pinned sources (sha256-checked) | ~10 min cold, 0 s warm |
| `new` | `--title`, `--style paper\|clean`, `--frame book\|stage\|board\|desktop`, `--formats 16:9,9:16`, `--private` | `stories/<slug>/` from `_template` (paper) or `_template-clean`; `--private` → `private/stories/<slug>/` (gitignored, for personal videos) | instant |
| `voice` | `--only vo1,vo2` | `voice/<id>.wav`, `voice/voice.json`, report with transcripts | piper s; xtts minutes |
| `cast` | `--engine elevenlabs`, `--gender female\|male`, `--speakers "A,B"`, `--text` | `voice/cast/*.wav` + table (XTTS ranked; elevenlabs: samples for the user to pick) | ~40 s per voice (xtts), ~2 s (elevenlabs) |
| `timeline` | – | scene/line table, fit problems (exit 2) | instant |
| `snap` | `--format`, `--sheet`, `[times…]` | `review/snaps*/t*.jpg`, `review/sheet*.jpg` | ~5 s |
| `play` | `--format` | prints a local URL for live preview (Ctrl+C to stop) | – |
| `mix` | `--stems` | `audio/soundtrack.wav/.m4a` (+ `audio/stems/`), loudness report | ~10–30 s |
| `render` | `--format`, `--workers N`, `--range a-b`, `--keep-frames`, `--target-mb N`, `--crf N`, `--encode-only` | `<slug>.mp4` / `<slug>_9x16.mp4` (H.264 + AAC; CRF 16, or two-pass to `story.render.targetMB`) | ~1 min per minute of video |
| `sheet` | `--format`, `--every s`, `--from`, `--to` | `review/video_sheet*_N.jpg` from the mp4 | seconds |
| `html` | `--format` | standalone `<slug>.html` (everything inlined) + `web/` (index.html, css/, js/, fonts/, audio/) | seconds |
| `video` | `--revoice`, `--format`, `--force`, `--workers`, `--target-mb`, `--crf` | full pipeline: voice (if missing) → fit → mix → render → html → sheets | minutes |

Environment: `ELEVENLABS_API_KEY` (read from `.env` in the repo root, gitignored), `CHROME_PATH` (browser binary), `CHROME_FLAGS` (replace the GPU flags, e.g. empty for CPU),
`WHISPER_MODEL` (default `large-v3-turbo`).

Internals: all browser work goes through `tools/lib/common.mjs`: `paths(slug)` / `buildDir(slug)` define the
per-video folder, `storyRel(slug)` finds the story (`private/stories/<slug>` wins over `stories/<slug>`), a static server is rooted at the repo (`POST /upload/<path>` writes into `build/`), and
`openStory()` loads `engine/page.html?story=<slug>&mode=…` and fails loudly on any page error.
