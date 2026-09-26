# Asset credits

The audio samples, sound effects and fonts used by this project are **not stored in the
repository**. `node tools/fetch-assets.mjs` downloads them from the original public sources
listed below and processes them the same way every time. The recipes (exact URLs,
checksums, cut points and processing settings) are in `assets/manifests/*.json`.

## Ready-made attribution

Put this line in video descriptions, end credits or release notes:

> Orchestral samples: VSCO 2 Community Edition by Versilian Studios (CC0). Celesta, music box
> and choir: Musyng Kite soundfont via midi-js-soundfonts (CC BY-SA 3.0). Sound effects:
> Freesound.org contributors LilMati, davidbain, partheeban, envirOmaniac2, mateusboga,
> tcrocker68, BenjaminNelan, Tomoyo Ichijouji, eyesonlegs, Jofae, Eneasz, newagesoup,
> totalcult, Coral_Island_Studios, SamsterBirdies, Alex_hears_things, bajko, BurghRecords,
> sengjinn, hdfreema, danner, Sotiris_Laskaris, khenshom, Areti18 and felix.blume, and
> Kenney.nl (CC0). Fonts: IM Fell English by Igino Marini, Berkshire Swash by Astigmatic,
> UnifrakturMaguntia by j. 'mach' wust, Caveat by Impallari Type, JetBrains Mono by JetBrains,
> Fredoka by Milena Brandão and Hafontia (SIL Open Font License 1.1).

## Instrument samples (`assets/samples/`)

All notes are converted to 48 kHz, 16-bit WAV and keep the channel count of the source.
Silence at the start is trimmed (threshold -50 dBFS, 2 ms kept before the onset).
The tail is cut where it falls below -72 dBFS. Notes are capped at 8 s with a 1.5 s
fade-out; notes that are not capped get a 30 ms fade-out instead.
`manifest.json` lists every file with its MIDI note, velocity layer, optional `tune`
(cents to add on playback) and loop points.

### Versilian Studios: VSCO 2 Community Edition (v1.1.0)

- Source: https://github.com/sgossner/VSCO-2-CE. WAVs come from commit `4403009` of the
  `master` branch. Note and velocity mapping comes from the `.sfz` files on the `SFZ` branch.
- Homepage: http://vis.versilstudios.net/vsco-community.html
- Recorded by Sam Gossner and Simon Dalzell. Samples cut by Elan Hickler / Soundemote.
- License: **CC0 1.0 Universal** (public domain dedication). The authors ask for credit to
  "Versilian Studios / Sam Gossner" and/or "Ivy Audio / Simon Dalzell" where it applies,
  with a link to the VSCO: CE homepage. They also ask that the samples not be sold on their own.

| Folder | VSCO source folder | sfz |
|---|---|---|
| harp | Strings/Harp | Harp.sfz |
| glockenspiel | Percussion/Glock | Glockenspiel.sfz (note numbers are the sounding pitch, one octave above the sfz keys; `tune` measured spectrally) |
| violins | Strings/Violin Section/susVib | ViolinEnsSusVib.sfz |
| violas | Strings/Viola Section/susvib | ViolaEnsSusVib.sfz |
| cellos | Strings/Cello Section/susvib | CelloEnsSusVib.sfz |
| violin_solo | Strings/Solo Violin/Arco Vib | SViolinVib.sfz |
| violins_pizz | Strings/Violin Section/Pizz | ViolinEnsPizz.sfz |
| cellos_pizz | Strings/Cello Section/pizzT | CelloEnsPizz.sfz |
| flute | Woodwinds/Flute/susvib | FluteSusVib.sfz |
| flute_nv | Woodwinds/Flute/susNV | FluteSusNV.sfz |

### Musyng Kite soundfont (via gleitz/midi-js-soundfonts)

- Source: https://github.com/gleitz/midi-js-soundfonts: per-note MP3s rendered in advance
  (`MusyngKite/<instrument>-mp3/<Note>.mp3`), fetched from commit `044fab8` of the `gh-pages`
  branch. These are the same files that are served at https://gleitz.github.io/midi-js-soundfonts/.
- Original soundfont: Musyng Kite (http://www.synthfont.com/SoundFonts/Musyng.sfpack)
- License: **Creative Commons Attribution-ShareAlike 3.0**
  (https://creativecommons.org/licenses/by-sa/3.0/). Attribution is required, and adapted
  versions must be shared under the same license.
- Used for: `celesta`, `music_box`, `choir_aahs`.
- `choir_aahs` has loop points that were detected automatically, plus a 150 ms equal-power
  crossfade written into the audio at each loop end. Both are our changes and do not come
  from the soundfont.

## Sound effects (`assets/sfx/`)

All sounds are **CC0 1.0 Universal** (public domain dedication). No attribution is required,
but credit is given here anyway. The Freesound sounds use the public HQ preview MP3 from
each sound page, which can be downloaded without logging in. The Kenney sound is
`Audio/bookClose.ogg` from the RPG Audio pack zip.

Processing, with the exact settings for each file in `assets/manifests/sfx.json`:
- 20 Hz highpass to remove DC; `night_ambience_2` also gets a 120 Hz highpass to remove rumble.
- The excerpt is cut at a fixed start and duration.
- Linear fades: 5 ms in and 20 ms out for one-shots, 20 ms / 250 ms for typing,
  1 s / 1.5 s for ambiences.
- Peak-normalized to -3 dBFS, then saved as 48 kHz, 16-bit WAV.

| File | Original title | Author | Source |
|---|---|---|---|
| page_turn_1.wav | Page Turn 01 | LilMati | https://freesound.org/s/397548/ |
| page_turn_2.wav | Page Turn 02 | LilMati | https://freesound.org/s/397549/ |
| page_turn_3.wav | Page Turn | davidbain | https://freesound.org/s/136778/ |
| page_turn_4.wav | turnPage.mp3 | partheeban | https://freesound.org/s/457767/ |
| book_open.wav | Book_open.mp3 | envirOmaniac2 | https://freesound.org/s/393844/ |
| book_open_2.wav | Opening a book | mateusboga | https://freesound.org/s/614081/ |
| book_close.wav | Book_Closing.wav | tcrocker68 | https://freesound.org/s/235588/ |
| book_close_2.wav | RPG Audio pack: bookClose.ogg | Kenney (kenney.nl) | https://kenney.nl/assets/rpg-audio |
| paper_rustle_1.wav | Paper Rustle | BenjaminNelan | https://freesound.org/s/353125/ |
| paper_rustle_2.wav | PageRustle | Tomoyo Ichijouji | https://freesound.org/s/211246/ |
| paper_rustle_3.wav | PaperSlide.wav | eyesonlegs | https://freesound.org/s/464302/ |
| paper_rustle_4.wav | Paper Crinkle | Jofae | https://freesound.org/s/371897/ |
| paper_pop_1.wav | folder snapped shut.wav | Eneasz | https://freesound.org/s/178056/ |
| paper_pop_2.wav | open-cardboard-box-compartment.wav | newagesoup | https://freesound.org/s/364740/ |
| paper_pop_3.wav | Box 02.wav | totalcult | https://freesound.org/s/388647/ |
| paper_pop_4.wav | 14 Cardboard Flap.mp3 | Coral_Island_Studios | https://freesound.org/s/459439/ |
| paper_crumple_1.wav | Paper Crumpling | Ezcah | https://freesound.org/s/248178/ |
| paper_crumple_2.wav | Crumpling Paper | OwlStorm | https://freesound.org/s/151231/ |
| paper_crumple_3.wav | Paper Crumpling | Ezcah | https://freesound.org/s/248178/ |
| waves_soft_1.wav | Calm ocean waves | SamsterBirdies | https://freesound.org/s/578524/ |
| waves_soft_2.wav | Gentle small waves lapping on shore.wav | Alex_hears_things | https://freesound.org/s/352356/ |
| forest_ambience_1.wav | sfx_amb_forest_spring_afternoon-01.wav | bajko | https://freesound.org/s/385280/ |
| forest_ambience_2.wav | Birds In Spring (Scotland) | BurghRecords | https://freesound.org/s/463903/ |
| night_ambience_1.wav | AMBIENCE NIGHT FIELD CRICKET 01.wav | sengjinn | https://freesound.org/s/175020/ |
| night_ambience_2.wav | Night Crickets Back Porch.aiff | hdfreema | https://freesound.org/s/333221/ |
| city_distant_1.wav | Ambience_Berlin_Rooftop.wav | danner | https://freesound.org/s/426894/ |
| city_distant_2.wav | City Terrace Night 3 | Sotiris_Laskaris | https://freesound.org/s/567695/ |
| typing_soft_1.wav | Computer keyboard typing and keystrokes - Apple MacBook Pro 2018 | khenshom | https://freesound.org/s/565645/ |
| typing_soft_2.wav | Keyboard | Areti18 | https://freesound.org/s/394945/ |
| wind_soft_1.wav | Wind blowing in the bush on the top of Kitt Peak mountain. (USA, Arizona) | felix.blume | https://freesound.org/s/135193/ |

## Fonts (`assets/fonts/`)

The fonts are copied unchanged from the Google Fonts repository
(https://github.com/google/fonts, commit `23e54b5`, `ofl/` directory). All are licensed under the
**SIL Open Font License 1.1** (https://openfontlicense.org). Each font's full license text is
`OFL.txt` in the font's folder in that repository.

| File | Family | Designer | Copyright |
|---|---|---|---|
| IMFeENrm28P.ttf | IM Fell English Roman | Igino Marini | Copyright (c) 2010, Igino Marini |
| IMFeENit28P.ttf | IM Fell English Italic | Igino Marini | Copyright (c) 2010, Igino Marini |
| IMFeENsc28P.ttf | IM Fell English SC | Igino Marini | Copyright (c) 2010, Igino Marini |
| BerkshireSwash-Regular.ttf | Berkshire Swash | Astigmatic | Copyright (c) 2012 Brian J. Bonislawsky DBA Astigmatic (AOETI), Reserved Font Name "Berkshire Swash" |
| UnifrakturMaguntia-Book.ttf | UnifrakturMaguntia | j. 'mach' wust | Copyright (c) 2010 j. 'mach' wust, Reserved Font Name UnifrakturMaguntia; (c) 2009 Peter Wiegel |
| Caveat[wght].ttf | Caveat (variable) | Impallari Type | Copyright 2014 The Caveat Project Authors |
| JetBrainsMono[wght].ttf | JetBrains Mono (variable) | JetBrains, Philipp Nurullin, Konstantin Bulenkov | Copyright 2020 The JetBrains Mono Project Authors |
| Fredoka[wdth,wght].ttf | Fredoka (variable) | Milena Brandão, Hafontia | Copyright 2016 The Fredoka Project Authors |
