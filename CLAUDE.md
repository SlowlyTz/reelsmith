@AGENTS.md

## Claude Code specifics
- New video from a prompt: use the `/make-video` skill (`.claude/skills/make-video`).
- You cannot hear audio: verify narration via the Whisper transcripts from `npm run voice`, and the mix via `npm run mix -- <slug> --stems`.
- Look at review images with the Read tool (`build/<slug>/review/*.jpg`) – visual checks are mandatory.
