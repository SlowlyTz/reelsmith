# video-gen

Narrated **paper-craft stop-motion videos from a single prompt** – rendered as a pure JavaScript
canvas animation, voiced by a local neural TTS, scored with a sampled orchestra and finished with
real paper foley. No cloud APIs, no API keys.

```
/make-video Ein Video für meine Oma zum 80. Geburtstag: ein Märchen über ihr Leben am Meer …
```
→ `build/<slug>/<slug>.mp4` (16:9), `build/<slug>/<slug>_9x16.mp4` (9:16) and a standalone `.html`.

## What you get

- **Look**: cut paper with grain and hand-cut edges, real cast shadows, pop-up pages that rise and fold,
  jointed paper puppets (configurable hair, outfits, colours) animated on twos, exposure flicker and film grain.
- **Frames**: a storybook on a craft table (cover opens, 3D curled page turns, book closes with a sticker)
  or a full-bleed paper stage. 16:9 double spreads or 9:16 tall pages.
- **Voice**: [Piper](https://github.com/rhasspy/piper) (e.g. `de_DE-thorsten-high`) or
  [XTTS-v2](https://huggingface.co/coqui/XTTS-v2) studio voices, verified word by word with Whisper;
  scenes sync to spoken words.
- **Music**: a small score language over orchestral samples (harp, celesta, music box, strings,
  pizzicato, flute, glockenspiel, choir) on a bar grid that lines up with every page turn.

## Requirements

Node.js ≥ 20, ffmpeg (with libx264), Chromium or Chrome, curl, ~2 GB disk (~6 GB with XTTS).
Linux or macOS. A GPU is used through Chromium when available (fast), otherwise CPU.

## Setup

```bash
npm run setup                # Node deps, Piper + voice, Python venv (Whisper), samples/sfx/fonts
npm run setup -- --xtts      # additionally XTTS-v2 (expressive voices; non-commercial licence)
```

## Workflow

Let an agent do it (Claude Code: `/make-video <prompt>`, others: follow [AGENTS.md](AGENTS.md)), or by hand:

```bash
npm run new -- oma-80 --title "Omas Meer"    # stories/oma-80/{story.json,scenes.js,score.js}
npm run voice -- oma-80                       # narration + word timings + pronunciation check
npm run timeline -- oma-80                    # does every line fit its scene?
npm run snap -- oma-80 --sheet                # stills of all scenes → build/oma-80/review/
npm run play -- oma-80                        # live preview in the browser
npm run video -- oma-80                       # mix + render all formats + html + review sheets
```

Other tools: `npm run cast` (compare XTTS voices), `npm run mix -- <slug> --stems`,
`npm run render -- <slug> --format 9:16 --range 10-20`, `npm run sheet`, `npm run html`, `npm run fetch-assets`.

## Layout

```
engine/             core, timeline, runtime, page.html (player/renderer)
  styles/paper/     paper look: textures & pieces, puppets, props, frames (book, stage), post
audio/              score DSL + offline mixer (Web Audio)
stories/_template/  starting point for every new video
tools/              node CLIs, voice/*.py (XTTS, Whisper, casting), setup.sh, fetch-assets
assets/manifests/   where samples, sfx and fonts come from (downloaded by fetch-assets)
build/<slug>/       outputs: mp4, html, soundtrack, voice, review sheets (git-ignored)
```

Styles are pluggable: the paper style lives in `engine/styles/paper/`; new styles can implement the
same drawing API and be selected with `"style"` in `story.json`.

## Licences of third-party material

Instrument samples: VSCO-2-CE (CC0), Musyng Kite soundfont (CC BY-SA 3.0).
Sound effects: Freesound / Kenney (CC0). Fonts: SIL Open Font License.
Piper voice Thorsten (CC0). XTTS-v2: Coqui Public Model License (non-commercial).
Videos that use the celesta, music box or choir samples (CC BY-SA 3.0) may have to carry CC BY-SA terms;
for anything beyond personal use, score with the CC0 instruments only.
Details and attribution line: [assets/CREDITS.md](assets/CREDITS.md).
