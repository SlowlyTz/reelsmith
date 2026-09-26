# 🎬 reelsmith

**One prompt → a paper-craft stop-motion video.**
Stories · greetings · invitations · explainers · promos · social clips.
Local & offline: JS canvas animation, neural voice, sampled orchestra. No API keys.

```
/make-video A 9:16 birthday greeting for Tom: paper confetti, his name in cut-out letters …
```
→ `build/<slug>/<slug>.mp4` (16:9) · `<slug>_9x16.mp4` (9:16) · `<slug>.html`

---

## ⚡ Quickstart

```bash
npm run setup                  # once (add -- --xtts for expressive voices)
npm run new -- my-film         # creates stories/my-film/
npm run video -- my-film       # voice → music → render → build/my-film/
```

## 🧰 Commands

| Command | Does |
|---|---|
| `npm run new -- <slug>` | new story from template |
| `npm run voice -- <slug>` | narration + pronunciation check |
| `npm run cast -- <slug>` | compare XTTS voices |
| `npm run timeline -- <slug>` | does the text fit the scenes? |
| `npm run snap -- <slug> --sheet` | still images to review |
| `npm run play -- <slug>` | live preview in the browser |
| `npm run video -- <slug>` | everything → finished files |

## 📋 Needs

Node ≥ 20 · ffmpeg · Chromium/Chrome · Linux or macOS

## 📁 Where things are

| Path | What |
|---|---|
| `stories/<slug>/` | your film: `story.json`, `scenes.js`, `score.js` |
| `build/<slug>/` | output videos, html, soundtrack, review images |
| `engine/` · `audio/` · `tools/` | the machine |
| `docs/` | how it works (written for agents) |
| `AGENTS.md` | the step-by-step workflow for an AI agent |

## ⚖️ Licences

Code: no licence chosen yet. Assets: CC0 + OFL, except celesta / music box / choir samples (CC BY-SA 3.0)
and XTTS voices (non-commercial). Details: [`assets/CREDITS.md`](assets/CREDITS.md).
