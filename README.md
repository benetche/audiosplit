# AudioSplit

AudioSplit is a desktop app to split songs into stems using AI models, with a modern Electron + React UI and a Python sidecar engine.

Current default model: `htdemucs_6s.yaml` (Demucs 6 stems), generating channels such as vocals, drums, bass, guitar, piano, and other.

## Why AudioSplit

- Fast desktop workflow for stem separation.
- Single transport mixer with per-channel mute.
- Python sidecar isolation for AI dependencies.
- Works with CPU and can leverage GPU when available.

## Technologies

- Electron (main process, preload, IPC)
- React + TypeScript + Vite
- Tailwind CSS
- Zustand (state management)
- Python 3.10+ (`audio-separator`, PyTorch, ONNX Runtime for `.onnx` models)

## Quick Start

### 1) Clone and install Node dependencies

```bash
git clone <your-fork-or-repo-url>
cd AudioSplit
npm install
```

### 2) Setup Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r engine/requirements.txt
```

The Electron app automatically tries `.venv/bin/python` (Linux/macOS) or `.venv\Scripts\python.exe` (Windows).  
Fallback is `python3` from your system.

### 3) Install FFmpeg (system dependency)

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install -y ffmpeg

# Fedora
sudo dnf install ffmpeg

# macOS (Homebrew)
brew install ffmpeg
```

Check with:

```bash
ffmpeg -version
```

### 4) Environment variables

AudioSplit currently uses a small set of optional environment variables:

- `PYTHON_EXECUTABLE`: force a specific Python interpreter path.
- `VITE_DEV_SERVER_URL`: used by Electron in development mode (set by `npm run dev` flow).

Example:

```bash
export PYTHON_EXECUTABLE=/absolute/path/to/python
npm run dev
```

## Running Locally

```bash
npm run dev
```

Build production artifacts:

```bash
npm run build
```

## Feature Guide (Quick)

- **Audio separation job:** choose an audio file and run stem separation.
- **Model-backed output:** default Demucs 6-stem output in `output/`.
- **Unified playback mixer:** single play/pause timeline for all stems.
- **Per-channel mute:** mute/unmute vocals, drums, bass, guitars, and others.
- **Device modes:** automatic, CPU, CUDA, and Apple Silicon mode (when available).
- **YouTube downloader:** download audio from a YouTube video in MP3/WAV/FLAC/M4A with optional automatic import into the stem separation flow.

### YouTube downloader

The "YouTube Download" panel uses the Python sidecar with [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and system FFmpeg to download and convert audio.

Requirements:

- `yt-dlp` installed in the virtual environment (already included in `engine/requirements.txt`). Reinstall when updating with `pip install -r engine/requirements.txt`.
- FFmpeg available on `PATH` (same requirement as the separation flow).

Usage:

1. Paste the video URL (supports `youtube.com/watch?v=...`, `youtu.be/...`, and `music.youtube.com/...`).
2. Select the output format: MP3, WAV, FLAC, or M4A.
3. Choose the destination folder using the "Choose..." button. The default is `~/Music/AudioSplit`.
4. Enable "Automatically import for stem separation" if you want the downloaded file to be ready for the "Separate" action.
5. Click "Download". Progress appears in the panel progress bar, and detailed messages are shown in "Logs".

Note: all four available formats are exactly the formats accepted by the separator, so auto-import works for any selected option.

## Open-source Collaboration

- Contribution guide: see `CONTRIBUTING.md`
- Issue templates: see `.github/ISSUE_TEMPLATE/`
- Pull request template: see `.github/pull_request_template.md`

## Recommended License

This project recommends **MIT** (and includes `LICENSE` as MIT) because:

- It is simple and widely adopted.
- It is friendly for community contributions and commercial use.
- It keeps maintenance overhead low while preserving attribution.

If your distribution strategy requires explicit patent grants, consider Apache 2.0.

## Security and First Public Push Checklist

Before the first public push, review:

- `.env`, `.env.*`, local secret files, service account JSON keys.
- Hard-coded API keys, bearer tokens, OAuth secrets, Firebase credentials.
- Private hostnames/IPs (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `*.internal`).
- User data dumps, test fixtures with personal data, and debug logs.
- Local binary/model caches not needed in git history.

Current ignore rules already cover `.env`, `.venv`, logs, and `engine/models/*`.  
See `CONTRIBUTING.md` for a broader security review routine.

## Suggested Folder Organization

Current structure is simple, but for long-term open-source growth we recommend:

- `electron/` - desktop runtime entrypoints, protocol, IPC
- `src/` - React UI and state
- `engine/` - Python sidecar and model handling
- `scripts/` - build and automation scripts
- `.github/` - templates and CI workflows
- `docs/` - architecture notes, troubleshooting, roadmap
- `tests/` - front-end/unit/integration tests

## Roadmap for Contributors

- Add automated tests for separation flow and mixer behavior.
- Add CI checks (lint/typecheck/build) for pull requests.
- Improve model selection UX and performance profiling tools.
