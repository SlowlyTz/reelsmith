---
name: make-video
description: Create a complete narrated paper-craft stop-motion video (story, voice, animation, music, render) in this repo from a single prompt. Use when the user asks for a new video, film, clip, animated story or gift video, e.g. "/make-video Ein Video für Oma zum 80. Geburtstag, in dem …".
---

# make-video

The user's prompt (the arguments) describes whom the video is for and what should happen in it.
Produce the finished video in `build/<slug>/` autonomously, following **AGENTS.md** exactly:

1. Read `AGENTS.md` and the template story in `stories/_template/` (story.json, scenes.js, score.js).
2. Make sure setup is done (`assets/samples/manifest.json`, `.tools/piper/piper`, `.venv/bin/python` exist; otherwise `npm run setup`, with `-- --xtts` if an expressive or female voice is wanted).
3. Derive concept, beats, cast looks, language, formats and length from the prompt (defaults: German, 45–60 s, 16:9 + 9:16, book frame). Choose a short kebab-case slug.
4. `npm run new -- <slug> --title "…"`, then write `story.json` (cast, scenes with bars, lines), `scenes.js` (one `VG.scene` per scene, laid out with `st.L`, synced with `st.word`), `score.js`.
5. Voice: `npm run voice -- <slug>`; fix every low-`sim` line (spelling in `tts`) with `--only`. For XTTS run `npm run cast` first.
6. `npm run timeline -- <slug>` until all lines fit; `npm run snap -- <slug> --sheet` for each format and **look at the sheets**; fix and repeat until every scene looks right.
7. `npm run video -- <slug>`; review `build/<slug>/review/video_sheet*`; fix anything off and re-render.
8. Report: scene list, voice, duration, output paths, and what could not be verified by you (listening).

Never ship: wrong names/dates in voice or text, faces on the book gutter, cut-off characters, empty pages, English on-screen text in a German video.
