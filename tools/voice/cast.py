"""Voice casting for XTTS-v2: speak one sentence with many built-in speakers and measure them.

Metrics per speaker: Whisper language confidence + text similarity (does it sound like correct
native speech?), median pitch (Hz) and melody range (semitone std-dev: higher = more expressive).
stdin: {"lang": "de", "text": "...", "speakers": [...], "outdir": "..."}
"""
import os, sys, json, re, difflib
os.environ.setdefault("COQUI_TOS_AGREED", "1")
import numpy as np, librosa, torch
from faster_whisper import WhisperModel

CACHE = os.path.join(os.path.dirname(__file__), "..", "..", ".cache", "models")


def letters(s):
    return re.sub(r"[^\w]", "", s.lower())


def main():
    job = json.load(sys.stdin)
    from TTS.api import TTS
    torch.set_num_threads(os.cpu_count() or 4)
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    whisper = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), device="cpu", compute_type="int8", download_root=os.path.join(CACHE, "whisper"))
    os.makedirs(job["outdir"], exist_ok=True)
    rows = []
    for s in job["speakers"]:
        f = os.path.join(job["outdir"], s.replace(" ", "_") + ".wav")
        torch.manual_seed(1)
        tts.tts_to_file(text=job["text"], speaker=s, language=job["lang"], file_path=f, temperature=0.65, speed=1.0)
        segs, info = whisper.transcribe(f, beam_size=5)
        text = " ".join(x.text.strip() for x in segs)
        y, sr = librosa.load(f, sr=16000)
        f0, _, _ = librosa.pyin(y, fmin=70, fmax=500, sr=sr, frame_length=1024)
        f0 = f0[~np.isnan(f0)]
        mel = float(np.std(12 * np.log2(f0 / np.median(f0)))) if len(f0) else 0
        row = {"speaker": s, "file": f, "lang": info.language, "lang_p": round(info.language_probability, 3),
               "sim": round(difflib.SequenceMatcher(None, letters(job["text"]), letters(text)).ratio(), 3),
               "f0": round(float(np.median(f0))) if len(f0) else 0, "melody": round(mel, 2), "heard": text}
        rows.append(row)
        print(f"{s:22} {row['lang']}:{row['lang_p']:.2f} sim={row['sim']:.2f} f0={row['f0']:3d}Hz melody={row['melody']:.2f} | {text[:60]}", file=sys.stderr, flush=True)
    json.dump(rows, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
