---
name: make-video
description: Create a complete paper-craft stop-motion video in this repo from a single prompt – stories, greetings, invitations, explainers, promos, recaps, social clips – including narration or on-screen text, music, render and review. Use when the user asks for a new video, film, clip, animation or gift video, e.g. "/make-video Geburtstagsgruß für Tom als 9:16-Clip, …".
---

# make-video

The arguments describe whom/what the video is for and what should happen. Produce the finished,
reviewed video in `build/_<slug>/` autonomously, following **AGENTS.md**:

1. Read `AGENTS.md`, `docs/README.md` and the template in `stories/_template/`.
2. Ensure setup (`assets/samples/manifest.json`, `.tools/piper/piper`, `.venv/bin/python`; else `npm run setup`, with `-- --xtts` for an expressive or female voice).
3. Decide frame (book vs stage), formats, narration/subtitles, language, length, music mood, ending (AGENTS.md §1). Pick a short kebab-case slug.
4. `npm run new -- <slug> …`, then write `story.json`, `scenes.js`, `score.js` (docs/scenes.md, docs/library.md, docs/audio.md).
5. Narration: `npm run voice -- <slug>`; fix every low-`sim` line with `--only`.
6. `npm run timeline -- <slug>` until everything fits; `npm run snap -- <slug> --sheet` per format and look at every sheet; iterate.
7. `npm run video -- <slug>`; review `build/_<slug>/review/video_sheet*` against docs/quality.md; fix and re-render.
8. Report decisions, scene list, voice, duration, output paths and what you could not verify (listening).
