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
  "subtitles": false,                      // true | { "style": "bold" | "words", … } – see "subtitles" below
  "outro": { "bars": 3, "sticker": "heart", "text": "Alles Gute!" },
                                           // sticker: "heart" | "star" | null (default: heart for book, none for stage)
                                           // text: stage only – cut-out letters under the sticker
  "mix": { "music": -8, "voice": 0, "sfx": -5, "amb": -14 },   // bus gains in dB (optional)
  "render": { "targetMB": 18 },            // file size (two-pass) – or { "crf": 16 } for constant quality (default)
  "cast": { "<id>": { … } },               // puppets, see library.md
  "scenes": [ { "id": "wald", "bars": 5 } ],
  "lines":  [ { "id": "vo2", "scene": "wald", "at": 0.2, "text": "…", "tts": "…", "ref": "…", "sub": "…" } ]
}
```

Line fields: `text` = the words (subtitles, meaning) · `tts` = what the voice reads · `ref` = transcript form for
verification (digits) · `sub` = subtitle text if it must differ from `text` (`*word*` = accent colour; `false` = no subtitle).

## subtitles

Timed by the Whisper word timestamps of each line. Display words (`sub`/`text`) are aligned to the spoken
words, so respellings in `tts` ("Mielo", "zweitausend vierundzwanzig") still show as "Milo", "2024".

| style | Look | Use for |
|---|---|---|
| `true` | the whole line on a cream paper strip, words darken as spoken | calm storybooks |
| `bold` | caption chunks (≤ 2 rows; split at punctuation, long phrases split in balance before prepositions/conjunctions), heavy white text with dark outline, spoken word highlighted | explainers, YouTube, 16:9 |
| `words` | one word at a time, popping in on its start on a paper tag (TikTok style) | 9:16 social |

| Option | bold default | words default | Meaning |
|---|---|---|---|
| `y`, `x` | 0.87 (9:16: 0.72), 0.5 | 0.8 (9:16: 0.67), 0.5 | centre, fraction of H / W |
| `size` | 0.056 | 0.09 | font size, fraction of min(W, H) |
| `maxWidth` | 0.8 | 0.8 | fraction of W (long words shrink to fit) |
| `box` | false | true | paper backing (`paperColor`) instead of an outline |
| `color`, `stroke`, `highlight`, `ink`, `accent`, `paperColor` | cream, dark brown, yellow, dark brown, orange, cream | …, yellow tag | text / outline / spoken word / text on paper / `*accent*` / backing |
| `maxWords`, `rows` | 8, 2 | – | chunk size |
| `font`, `weight` | Fredoka 700 | Fredoka 700 | |

TikTok safe zone (9:16): keep subtitles and key content out of the bottom ~20 %, the right ~15 % (UI buttons)
and the top ~8 % → e.g. `{ "style": "words", "y": 0.67, "x": 0.45, "maxWidth": 0.7 }`.
Check word timing with `npm run snap -- <slug> --format 9:16 <word start + 0.05> …`.
In the page, `VG.subtitleWords()` lists every displayed word with its times and
`VG.subtitleChunks(ctx)` the bold caption chunks – handy for checks.

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
