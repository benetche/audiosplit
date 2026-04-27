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

## Running with Docker (alternative to venv)

If installing the Python engine in a local venv is failing on your machine (PyTorch, `audio-separator`, and `onnxruntime` can be tricky depending on Python/OS combinations), you can run only the Python backend inside Docker while keeping Electron on the host.

### Requirements

- Docker Desktop (Windows/macOS) or Docker Engine + the `docker compose` plugin (Linux).
- For GPU mode: an NVIDIA GPU + the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html). On Windows that means Docker Desktop with the WSL2 backend and GPU compute enabled.

### One-time setup (CPU)

```bash
# Folders used as volume mounts
mkdir -p inputs music output

# Build the engine image (3-8 min on first run)
docker compose --profile cpu build

# Start the engine container as a long-lived daemon
docker compose --profile cpu up -d engine-cpu
```

### Wire Electron to the container

The Electron app reads `PYTHON_EXECUTABLE` to locate Python. Point it at the wrapper script for your OS — the wrapper forwards every call to `docker exec` and translates host paths to container paths transparently (project root and your home directory are both mounted).

**Linux / macOS / WSL:**

```bash
export PYTHON_EXECUTABLE="$PWD/scripts/python-docker.sh"
npm run dev
```

**Windows (PowerShell):**

```powershell
$env:PYTHON_EXECUTABLE = "$PWD\scripts\python-docker.cmd"
npm run dev
```

**Windows (cmd):**

```cmd
set PYTHON_EXECUTABLE=%CD%\scripts\python-docker.cmd
npm run dev
```

The wrapper will auto-start the container if it isn't running. You can pick audio files from anywhere under your home directory (`Downloads`, `Music`, `Desktop`, OneDrive, etc.); paths outside the home or project root are not visible to the container.

#### Shortcut scripts

To avoid setting `PYTHON_EXECUTABLE` every session, the repo ships with launcher scripts that wire it up and start the dev server in one go:

```bash
# Linux / macOS / WSL
./dev-docker.sh

# Windows (PowerShell)
.\dev-docker.ps1
```

Set `AUDIOSPLIT_DOCKER_PROFILE=gpu` before running the launcher to use the GPU profile.

### GPU mode

```bash
docker compose --profile gpu build
docker compose --profile gpu up -d engine-gpu

# Tell the wrapper to target the GPU profile/service
export AUDIOSPLIT_DOCKER_PROFILE=gpu   # PowerShell: $env:AUDIOSPLIT_DOCKER_PROFILE = "gpu"

export PYTHON_EXECUTABLE="$PWD/scripts/python-docker.sh"   # or the .cmd on Windows
npm run dev
```

### Running the engine via CLI (no UI)

Handy for sanity-checks without launching Electron. Drop an audio file into `./inputs/` first:

```bash
docker compose exec engine-cpu python engine/separator_core.py \
  --input /app/inputs/song.mp3 \
  --output-dir /app/output/song \
  --job-id test \
  --device cpu
```

### Caveats

- The first separation downloads ~1.5–2 GB of Demucs model weights into a named volume (`audiosplit-models`) and reuses it on subsequent runs.
- Cancellation from the UI may not propagate cleanly into the container; if a separation looks stuck, `docker compose restart engine-cpu`.
- After editing `docker-compose.yml` (e.g., adding mounts), recreate the container with `docker compose --profile cpu up -d --force-recreate engine-cpu` so the new config takes effect.
- If `PYTHON_EXECUTABLE` is unset, Electron falls back to `.venv` and then `python3` from `PATH` — Docker is fully opt-in and does not affect existing venv setups.

## Feature Guide (Quick)

- **Audio separation job:** choose an audio file and run stem separation.
- **Model-backed output:** default Demucs 6-stem output in `output/`.
- **Unified playback mixer:** single play/pause timeline for all stems.
- **Per-channel mute:** mute/unmute vocals, drums, bass, guitars, and others.
- **Device modes:** automatic, CPU, CUDA, and Apple Silicon mode (when available).
- **YouTube downloader:** download audio from a YouTube video in MP3/WAV/FLAC/M4A, with an option to automatically import it into the stem separation flow.

### YouTube downloader

The "YouTube download" panel uses the Python sidecar with [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and the system FFmpeg to download and convert the audio.

Requirements:

- `yt-dlp` installed in the venv (already listed in `engine/requirements.txt`). Reinstall when updating: `pip install -r engine/requirements.txt`.
- FFmpeg on the PATH (same requirement as the separation flow).

Usage:

1. Paste the video URL (supports `youtube.com/watch?v=...`, `youtu.be/...`, and `music.youtube.com/...`).
2. Pick the output format: MP3, WAV, FLAC, or M4A.
3. Select the destination folder (via the "Choose..." button). Default: `~/Music/AudioSplit`.
4. Check "Automatically import into stem separation" to have the downloaded file immediately ready for the "Separate" button.
5. Click "Download". Progress is shown in the panel's bar, and detailed messages go to the "Logs" section.

Note: the four offered formats match exactly those accepted by the separator, so auto-import works regardless of the format you pick.

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
