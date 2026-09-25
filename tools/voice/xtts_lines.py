"""Narration with XTTS-v2, phrase by phrase.

XTTS is expressive but sometimes keeps babbling after short inputs or mispronounces a word.
So every phrase is generated until Whisper confirms the words, then trimmed right after the last
correct word; phrases are joined with natural pauses (longer after full stops).

stdin: {"lang": "de", "speaker": "Uta Obando", "speed": 1.0, "items": [{"id": "vo1", "text": "...", "ref": "...", "out": "raw/vo1.wav"}]}
"ref" (optional) is the text as a transcript would write it, e.g. digits for spelled-out dates;
it must have the same punctuation structure as "text".
"""
import os, sys, json, re, difflib
os.environ.setdefault("COQUI_TOS_AGREED", "1")
import numpy as np, soundfile as sf, torch
from faster_whisper import WhisperModel

CACHE = os.path.join(os.path.dirname(__file__), "..", "..", ".cache", "models")
PAUSE = {",": 0.22, ";": 0.3, ":": 0.3, "–": 0.28, "—": 0.28, ".": 0.5, "!": 0.5, "?": 0.5, "…": 0.55}


def letters(s):
    return re.sub(r"[^\w]", "", s.lower().replace("-", ""))


def phrases(text):
    """Split at punctuation, keeping the mark to pick the pause length."""
    parts = re.findall(r"[^,;:.!?…–—]+[,;:.!?…–—]*", text)
    return [p.strip() for p in parts if p.strip(" ,;:.!?…–—")]


def verify(whisper, lang, wav, ref):
    """Similarity of the best-matching transcript prefix and where that prefix ends."""
    segs, _ = whisper.transcribe(wav, beam_size=5, word_timestamps=True, language=lang)
    words = [w for s in segs for w in (s.words or [])]
    target, acc, best = letters(ref), "", (0.0, None)
    for i, w in enumerate(words):
        acc += letters(w.word)
        r = difflib.SequenceMatcher(None, target, acc).ratio()
        if r > best[0]:
            best = (r, i)
        if len(acc) > len(target) + 6:
            break
    sim, i = best
    if i is None:
        return 0.0, "", 0, 0
    end = words[i].end
    if i + 1 < len(words):  # stop before the next (babbled) word
        end = min(end + 0.14, words[i + 1].start - 0.02) - 0.14
    return sim, " ".join(w.word.strip() for w in words[: i + 1]), words[0].start, end


def main():
    job = json.load(sys.stdin)
    from TTS.api import TTS
    torch.set_num_threads(os.cpu_count() or 4)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    whisper = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), device="cpu", compute_type="int8", download_root=os.path.join(CACHE, "whisper"))
    lang, speaker, speed = job["lang"], job["speaker"], float(job.get("speed", 1.0))
    report = {}
    for it in job["items"]:
        pieces, tmp, sr = [], it["out"] + ".take.wav", 24000
        phs = phrases(it["text"])
        refs = phrases(it["ref"]) if it.get("ref") else phs
        if len(refs) != len(phs):
            refs = phs
        for pi, ph in enumerate(phs):
            best = None
            for k in range(int(job.get("tries", 8))):
                torch.manual_seed(7 + k * 31)
                tts.tts_to_file(text=ph, speaker=speaker, language=lang, file_path=tmp, temperature=0.6, speed=speed * (1 + 0.04 * (k // 3)), repetition_penalty=6.0)
                ref = refs[pi].strip(" ,;:.!?…–—")
                sim, heard, a, b = verify(whisper, lang, tmp, ref)
                y, sr = sf.read(tmp, dtype="float32")
                seg = y[int(max(0, a - 0.06) * sr): int(min(len(y) / sr, b + 0.14) * sr)]
                print(f"  {it['id']}.{pi} try{k} sim={sim:.3f} | {heard}", file=sys.stderr, flush=True)
                if best is None or sim > best[0]:
                    best = (sim, seg, heard)
                if sim >= 0.97:
                    break
            sim, seg, heard = best
            fade = int(0.012 * sr)
            seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
            pieces.append((seg, PAUSE.get(ph.strip()[-1], 0.18), sim, heard))
        out = []
        for i, (seg, pause, _, _) in enumerate(pieces):
            out.append(seg)
            if i + 1 < len(pieces):
                out.append(np.zeros(int(pause * sr), dtype=np.float32))
        out.append(np.zeros(int(0.3 * sr), dtype=np.float32))
        sf.write(it["out"], np.concatenate(out), sr)
        os.remove(tmp)
        report[it["id"]] = {"phrases": [{"sim": round(p[2], 3), "heard": p[3]} for p in pieces]}
    json.dump(report, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
