# Quality checklist

Run through this before delivering. Look at the images yourself (`build/_<slug>/review/*.jpg`).

## Content
- [ ] Names, dates, places exactly as in the prompt – in narration transcripts **and** on-screen text.
- [ ] All on-screen text in the video's language, spelled correctly, readable at phone size.
- [ ] Characters match the described looks (hair length/colour, clothes).
- [ ] The story/message is clear without sound (for muted social playback: subtitles or text).

## Picture
- [ ] Every scene has content when it opens (no empty pages, pop-ups actually rise).
- [ ] Faces/text are not on the 16:9 book gutter and not cut by the frame edge.
- [ ] Characters are big enough to read expressions (camera pushes in on key moments).
- [ ] Nothing floats: puppets stand on ground lines, boats in waves, props on surfaces.
- [ ] Standing things fold away on transitions (drawn via `VG.pop`).
- [ ] Continuity: day/night, positions and props consistent across cuts; both formats checked.
- [ ] Camera shows what the narration talks about at that moment.

## Sound
- [ ] `voice` report: every line `sim` ≥ 0.95, transcript correct.
- [ ] `timeline`: all lines fit; no narration overlaps a transition's first beat.
- [ ] `mix --stems`: voice ~10–14 LU above music; integrated ≈ −16 LUFS; ambiences subtle.
- [ ] Music accents land on on-screen events (chimes on magic, final chord on the sticker).

## Known failure modes
| Symptom | Cause → fix |
|---|---|
| puppet visible during a page turn | drawn without `VG.pop` → wrap it |
| element split by a vertical crease | placed on the gutter → move off x = 0 |
| XTTS line contains extra syllables | babble after short phrase → rerun `voice --only`; check `sim` |
| wrong year/number in transcript | TTS read digits oddly → write numbers as words in `tts`, set `ref` |
| name stressed wrong (Piper) | check phonemes; respell in `tts` (e.g. `Emieljo`) |
| scene pops before narration | increase the scene's `at`/pop delays or sync with `st.word` |
| camera shows the table/cover | frame clamps, but zoom < 1.05 on a 16:9 book shows edges – raise zoom |
| `page error` from a tool | JS error in scenes.js/score.js – message says where |
