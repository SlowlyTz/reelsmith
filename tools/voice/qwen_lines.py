"""Narration with Qwen3-TTS (Apache-2.0), cloning one reference voice for every line.

Each line is generated up to `tries` times (different seeds); Whisper transcribes every take and
the one closest to the script wins (stops early at sim >= 0.97). Runs in .tools/qwen/venv.

stdin: {"lang": "de", "ref_audio": "assets/voices/x.wav", "ref_text": "...", "tries": 4,
        "temperature": 0.6, "model": "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "items": [{"id": "vo1", "text": "...", "ref": "...", "out": "raw/vo1.wav"}]}
"ref" (optional) is the text as a transcript would write it (digits for spelled-out numbers).
stdout: {"vo1": {"sim": 0.98, "take": 2, "transcript": "..."}}
"""
import os, sys, json, re, difflib, time
import numpy as np, soundfile as sf, torch

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.environ.setdefault("HF_HOME", os.path.join(ROOT, ".cache", "models", "hf"))
from qwen_tts import Qwen3TTSModel
from faster_whisper import WhisperModel

LANG = {"de": "German", "en": "English", "fr": "French", "es": "Spanish", "it": "Italian", "pt": "Portuguese",
        "ru": "Russian", "ja": "Japanese", "ko": "Korean", "zh": "Chinese"}


def letters(s):
    return re.sub(r"[^\w]", "", s.lower().replace("-", ""))


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def main():
    job = json.load(sys.stdin)
    lang = LANG.get(job.get("lang", "de"), "German")
    torch.set_num_threads(os.cpu_count() or 8)
    t0 = time.time()
    model = Qwen3TTSModel.from_pretrained(job.get("model", "Qwen/Qwen3-TTS-12Hz-1.7B-Base"), device_map="cpu", dtype=torch.float32)
    prompt = model.create_voice_clone_prompt(ref_audio=job["ref_audio"], ref_text=job["ref_text"], x_vector_only_mode=False)
    whisper = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), device="cpu", compute_type="int8",
                           download_root=os.path.join(ROOT, ".cache", "models", "whisper"))
    log(f"qwen: models ready in {time.time() - t0:.0f}s")
    temp, tries, out = float(job.get("temperature", 0.6)), int(job.get("tries", 4)), {}
    for it in job["items"]:
        target, best = letters(it.get("ref") or it["text"]), None
        for k in range(tries):
            torch.manual_seed(1000 + 17 * k)
            t = time.time()
            wavs, sr = model.generate_voice_clone(text=it["text"], language=lang, voice_clone_prompt=prompt,
                                                  temperature=temp, subtalker_temperature=temp)
            wav = np.asarray(wavs[0], dtype=np.float32)
            tmp = it["out"] + f".take{k}.wav"
            sf.write(tmp, wav, sr)
            segs, _ = whisper.transcribe(tmp, beam_size=5, language=job.get("lang", "de"))
            heard = " ".join(s.text.strip() for s in segs)
            sim = difflib.SequenceMatcher(None, target, letters(heard)).ratio()
            log(f"  {it['id']} take{k} sim={sim:.3f} ({len(wav) / sr:.1f}s audio in {time.time() - t:.0f}s) | {heard}")
            if best is None or sim > best[0]:
                best = (sim, k, heard, tmp)
            if sim >= 0.97:
                break
        os.replace(best[3], it["out"])
        for k in range(tries):
            f = it["out"] + f".take{k}.wav"
            if os.path.exists(f):
                os.remove(f)
        out[it["id"]] = {"sim": round(best[0], 3), "take": best[1], "transcript": best[2]}
    print(json.dumps(out))


if __name__ == "__main__":
    main()
