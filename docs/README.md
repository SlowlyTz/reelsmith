# reelsmith docs (for agents)

Reference material behind the workflow in [`../AGENTS.md`](../AGENTS.md). Read AGENTS.md first;
open these files when you need exact APIs, defaults or known pitfalls.

| File | Read when you … |
|---|---|
| [architecture.md](architecture.md) | need the big picture: modules, data flow, coordinate & time systems |
| [story-format.md](story-format.md) | write or change `story.json` (every field + default) |
| [scenes.md](scenes.md) | write `scenes.js`: scene API, layout, pop-ups, camera, sync, proven patterns |
| [library.md](library.md) | look for a drawing function, prop, puppet pose or cast option |
| [audio.md](audio.md) | work on narration, music (`score.js`) or the mix / sound effects |
| [tools.md](tools.md) | run a CLI: flags, outputs, runtimes |
| [quality.md](quality.md) | review before delivery: checklist + known failure modes |
| [extending.md](extending.md) | add props, hairstyles, frames, instruments or a new visual style |

Conventions used in these docs: `lt` = seconds since the scene is fully open, `t` = absolute
seconds, `k` = pop-up factor 0..1, units are canvas units (1 unit = 1 px at camera zoom 1).
