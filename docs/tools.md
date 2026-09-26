# Tools (`npm run <tool> -- <slug> [flags]`)

Flags go after the slug. All outputs land in `build/<slug>/`.

| Tool | Flags | Output / purpose | Typical time |
|---|---|---|---|
| `setup` | `--xtts` | Node deps, Piper + voice, `.venv` (Whisper; XTTS), assets | 2–15 min first time |
| `fetch-assets` | `--only samples\|sfx\|fonts`, `--force`, `--jobs N` | `assets/{samples,sfx,fonts}` from pinned sources (sha256-checked) | ~10 min cold, 0 s warm |
| `new` | `--title`, `--frame book\|stage`, `--formats 16:9,9:16` | `stories/<slug>/` from the template | instant |
| `voice` | `--only vo1,vo2` | `voice/<id>.wav`, `voice/voice.json`, report with transcripts | piper s; xtts minutes |
| `cast` | `--gender female\|male`, `--speakers "A,B"`, `--text` | `voice/cast/*.wav` + ranked table | ~40 s per voice |
| `timeline` | – | scene/line table, fit problems (exit 2) | instant |
| `snap` | `--format`, `--sheet`, `[times…]` | `review/snaps*/t*.jpg`, `review/sheet*.jpg` | ~5 s |
| `play` | `--format` | prints a local URL for live preview (Ctrl+C to stop) | – |
| `mix` | `--stems` | `soundtrack.wav/.m4a`, loudness report | ~10–30 s |
| `render` | `--format`, `--workers N`, `--range a-b`, `--keep-frames` | `<slug>.mp4` / `<slug>_9x16.mp4` (H.264 CRF 16 + AAC) | ~1 min per minute of video |
| `sheet` | `--format`, `--every s`, `--from`, `--to` | `review/video_sheet*_N.jpg` from the mp4 | seconds |
| `html` | `--format` | standalone `<slug>.html` (engine, fonts, audio inlined) | seconds |
| `video` | `--revoice`, `--format`, `--force` | full pipeline: voice (if missing) → fit → mix → render → html → sheets | minutes |

Environment: `CHROME_PATH` (browser binary), `CHROME_FLAGS` (replace the GPU flags, e.g. empty for CPU),
`WHISPER_MODEL` (default `large-v3-turbo`).

Internals: all browser work goes through `tools/lib/common.mjs` – a static server rooted at the repo
(`POST /upload/<path>` writes into `build/`) and `openStory()` which loads `engine/page.html?story=<slug>&mode=…`
and fails loudly on any page error.
