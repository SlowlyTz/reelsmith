# Video generation: orchestrate, never render yourself

This rule overrides "use the `/make-video` skill" in CLAUDE.md for the main agent. Whenever a video
generation is requested (a prompt, `/make-video …`, "make N videos …"), you are the
**orchestrator**. Every video is produced by its own `video-maker` subagent
(`.claude/agents/video-maker.md`). This applies even to a single video. Never run the make-video
workflow in the main chat.

## Before spawning

1. **One video = one subagent.** Split the request into individual videos.
2. **Ask first if needed.** If something essential is ambiguous (AGENTS.md §1, e.g. a missing
   date), ask in the chat before spawning. Subagents cannot ask the user.
3. **Unique slugs.** Pick a short kebab-case slug per video. It must be unique: not in `stories/`,
   not in `build/`, not used by a running subagent.
4. **Setup runs once, here.** Check `assets/samples/manifest.json`, `.tools/piper/piper` and
   `.venv/bin/python`. If anything is missing, run `npm run setup` yourself before spawning. Add
   `-- --xtts` if a video needs a female or expressive voice. Never run setup while subagents are
   running.

## Spawning

- **At most 3 at once.** Never more than 3 `video-maker` subagents at the same time.
  - Queue further videos and tell the user which ones are waiting.
  - Start the next one when a subagent finishes.
- **Render workers**, depending on how many subagents run at once (8 CPU cores):
  - 1 subagent: default
  - 2 subagents: `--workers 3`
  - 3 subagents: `--workers 2`
- **Parallel start.** Start videos that begin together in a single message, so they run in parallel.
- **Agent tool call:**
  - Use `subagent_type: "video-maker"`.
  - **Pass no `model` parameter**, because it would override the agent's model.
  - **Pass no `isolation`.** A worktree lacks `.venv`, `.tools` and `.cache`.
- **Prompt:** the user's request for this video verbatim, plus the slug and the workers.

## Verify model and effort right after the start (mandatory)

1. If the Agent call itself fails (model unavailable, rejected, error), start nothing else for that
   video.
2. Otherwise, for every started subagent, run:
   `python3 .claude/scripts/subagent-model.py <output_file or agentId from the Agent result>`
   (defaults: `--model claude-opus-5-5 --effort medium`). Prefer background spawns: a
   foreground Agent call only returns once the subagent is done, which is too late for this
   check.
   Never Read, cat or tail that output file itself; it is the full transcript.
3. On exit 0, write exactly this in the chat:
   **"Opus 5.5 medium thinking arbeitet nun an <slug> Video"**
4. On exit 1 or 2, or if the Agent call failed:
   - Stop that subagent immediately (TaskStop) if it is running.
   - Report what the script printed (the actual model and effort) or the error.
   - Ask in the chat which subagent model and effort to use for this video.
   - Offer no preset options and pick no fallback yourself.
   - Wait for the answer before starting that video again.

## While subagents run and after they finish

- **Hands off their files.** Do not edit files in their `stories/<slug>/` or `build/_<slug>/`.
  Do not change `engine/`, `audio/` or `tools/` while any subagent runs.
- **Report each finished video.** Use the subagent's report: paths, duration, decisions, open points.
  - Check the first line `Modell: …`.
  - Check the mp4s with `ffprobe`.
  - Send a subagent back if its report is incomplete or the video is missing.
- **Never commit after a video generation.** Neither you nor the subagents commit `stories/<slug>/`
  or anything else. This overrides the general "commit on your own" instruction for video work.
  Commit only when the user explicitly asks for it.
