# story.json reference

```jsonc
{
  "title": "Lina und die Sterne",          // shown on the cover and the player
  "slug": "lina",                          // optional, defaults to the folder name
  "lang": "de",                            // narration language (Piper model / XTTS / Whisper)
  "style": "paper",                        // visual style (only "paper" for now)
  "frame": "book",                         // "book" (storybook on a table) | "stage" (full-bleed diorama: greetings, promos, social …)
  "formats": ["16:9", "9:16"],             // rendered formats; first one is the default for tools
  "fps": 24,                               // output frame rate
  "animFps": 12,                           // stop-motion rate for puppets/pop-ups
  "music": { "bpm": 100, "beatsPerBar": 3, "key": "F" },
  "voice": { … },                          // see below
  "book": {                                // frame "book" only
    "cover": { "title": "…", "subtitle": "…", "color": "#2d4d66", "emblem": "moon", "endpaper": "#35606a" },
    "props": true                          // scissors, thread, pencil, confetti on the table
  },
  "intro": { "bars": 1 },                  // closed book before the cover opens (stage: default 0)
  "subtitles": false,                      // narration as paper-strip subtitles, word by word
  "outro": { "bars": 3, "sticker": "heart", "text": "Alles Gute!" },
                                           // sticker: "heart" | "star" | null (default: heart for book, none for stage)
                                           // text: stage only – cut-out letters under the sticker
  "mix": { "music": -8, "voice": 0, "sfx": -5, "amb": -14 },   // bus gains in dB (optional)
  "cast": { "<id>": { … } },               // puppets, see library.md
  "scenes": [ { "id": "wald", "bars": 5 } ],
  "lines":  [ { "id": "vo2", "scene": "wald", "at": 0.2, "text": "…", "tts": "…", "ref": "…" } ]
}
```

## voice

| Field | Default | Notes |
|---|---|---|
| `engine` | `piper` | `piper` or `xtts` |
| `model` | `de_DE-thorsten-high` | Piper voice name; downloaded on first use from rhasspy/piper-voices |
| `lengthScale` | 1.12 | Piper pace (higher = slower; 1.05–1.2 for storytelling) |
| `noiseScale`, `noiseW` | 0.62, 0.85 | Piper variation |
| `sentenceSilence` | 0.45 | Piper pause between sentences (s) |
| `speaker` | `Uta Obando` | XTTS built-in speaker (see `npm run cast`) |
| `speed` | 1.0 | XTTS pace |
| `tries` | 8 | XTTS takes per phrase until Whisper confirms it |
| `warmth` | 2 | low-mid EQ boost in dB during mastering |

## scenes

`{ "id": "…", "bars": n }` – order = playback order. The `id` must match a `VG.scene(id, …)` in
`scenes.js`. Duration = `bars × bar`. Rule of thumb: narration length + ~1.5 s → round up to bars.

## lines

| Field | Meaning |
|---|---|
| `id` | unique, e.g. `vo1` … (file `build/_<slug>/voice/<id>.wav`) |
| `scene` | scene the line belongs to |
| `at` | seconds after the scene is open (default 0.1) |
| `text` | intended wording (on-screen / documentation) |
| `tts` | what the engine reads – phonetic fixes go here |
| `ref` | optional: how a transcript writes it (digits), same punctuation as `tts`; used by XTTS verification |

## cover.emblem

`moon` (night skyline + moon medallion) · `heart` · `star` · `none`. The end sticker appears in the medallion.
