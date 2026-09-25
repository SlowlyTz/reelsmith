"""Transcribe narration clips with word timestamps and compare them with the intended text.

stdin:  {"lang": "de", "items": [{"id": "vo1", "wav": "...", "ref": "Es war einmal"}]}
stdout: {"vo1": {"transcript": "...", "sim": 0.98, "lang_p": 0.99, "words": [[word, start, end], ...]}}
"""
import sys, json, os, re, difflib
from faster_whisper import WhisperModel

MODEL = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
CACHE = os.path.join(os.path.dirname(__file__), "..", "..", ".cache", "models", "whisper")


def letters(s):
    return re.sub(r"[^\w]", "", s.lower().replace("-", ""))


def main():
    job = json.load(sys.stdin)
    model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4, download_root=CACHE)
    out = {}
    for it in job["items"]:
        segs, info = model.transcribe(it["wav"], beam_size=5, word_timestamps=True, language=job.get("lang"))
        segs = list(segs)
        words = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in (s.words or [])]
        text = " ".join(s.text.strip() for s in segs)
        sim = difflib.SequenceMatcher(None, letters(it.get("ref", "")), letters(text)).ratio() if it.get("ref") else None
        out[it["id"]] = {"transcript": text, "sim": round(sim, 3) if sim is not None else None, "lang_p": round(info.language_probability, 3), "words": words}
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
