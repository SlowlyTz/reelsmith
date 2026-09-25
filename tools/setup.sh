#!/usr/bin/env bash
# One-time setup: npm run setup [-- --xtts]
#   Node deps, Piper (TTS) + default voice, Python venv with Whisper (word timings / checks),
#   optional XTTS-v2 (expressive voices, Coqui Public Model License = non-commercial), assets.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd); XTTS=0
for arg in "$@"; do [[ "$arg" == "--xtts" ]] && XTTS=1; done
say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null || { echo "missing: $1 ($2)"; exit 1; }; }

say "checking system tools"
need node "Node.js >= 20"; need ffmpeg "ffmpeg with libx264"; need ffprobe "ffmpeg"; need curl "curl"
CHROME=${CHROME_PATH:-}
for c in /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome-stable /usr/bin/google-chrome \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
  [[ -z "$CHROME" && -x "$c" ]] && CHROME=$c
done
[[ -n "$CHROME" ]] || { echo "missing: Chromium/Chrome (or set CHROME_PATH)"; exit 1; }

say "node packages"
npm install --no-audit --no-fund

say "piper (local neural TTS)"
if [[ ! -x .tools/piper/piper ]]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) P=piper_linux_x86_64.tar.gz ;; Linux-aarch64) P=piper_linux_aarch64.tar.gz ;;
    Darwin-x86_64) P=piper_macos_x64.tar.gz ;; Darwin-arm64) P=piper_macos_aarch64.tar.gz ;;
    *) echo "no piper build for this platform"; exit 1 ;;
  esac
  mkdir -p .tools && curl -fsSL "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/$P" | tar xz -C .tools
fi
mkdir -p .cache/models/piper
for f in de_DE-thorsten-high.onnx de_DE-thorsten-high.onnx.json; do
  [[ -f .cache/models/piper/$f ]] || curl -fsSL -o ".cache/models/piper/$f" "https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/high/$f"
done

say "python venv (whisper word timings$([[ $XTTS == 1 ]] && echo ', XTTS-v2'))"
export UV_CACHE_DIR="$ROOT/.cache/uv" UV_PYTHON_INSTALL_DIR="$ROOT/.tools/python"
UV=$(command -v uv || true)
if [[ -z "$UV" ]]; then
  [[ -x .tools/uv/uv ]] || curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$ROOT/.tools/uv" UV_NO_MODIFY_PATH=1 sh
  UV="$ROOT/.tools/uv/uv"
fi
[[ -d .venv ]] || "$UV" venv -q -p 3.11 .venv
"$UV" pip install -q -p .venv/bin/python faster-whisper librosa soundfile numpy
if [[ $XTTS == 1 ]]; then
  echo "XTTS-v2 is licensed under the Coqui Public Model License (non-commercial use)."
  if [[ "$(uname -s)" == Linux ]]; then TORCH=("torch==2.5.1+cpu" "torchaudio==2.5.1+cpu"); else TORCH=("torch==2.5.1" "torchaudio==2.5.1"); fi
  "$UV" pip install -q -p .venv/bin/python --index-strategy unsafe-best-match --extra-index-url https://download.pytorch.org/whl/cpu \
    "${TORCH[@]}" coqui-tts "transformers>=4.56,<5"
fi

say "assets (instrument samples, sound effects, fonts)"
node tools/fetch-assets.mjs

say "done – try: npm run new -- my-story"
