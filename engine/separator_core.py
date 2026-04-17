#!/usr/bin/env python3
"""
AudioSplit Python sidecar.

Expected stdout messages are JSON lines consumed by Electron.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import sys
import traceback
from pathlib import Path
from typing import Any, Literal

DeviceMode = Literal["auto", "cuda", "cpu", "mps"]


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=True), flush=True)


def apply_device_env(mode: DeviceMode) -> None:
    """
    Deve rodar ANTES de importar torch/audio_separator.
    - cpu: esconde GPUs para PyTorch e ONNX Runtime.
    - cuda: expõe GPU (default índice 0 se nada estiver definido).
    - auto: não altera o ambiente herdado do processo pai (Electron).
    - mps: apenas macOS; não força CUDA no Linux.
    """
    if mode == "cpu":
        os.environ["CUDA_VISIBLE_DEVICES"] = ""
        return
    if mode == "cuda":
        cur = os.environ.get("CUDA_VISIBLE_DEVICES", "").strip()
        if cur == "":
            os.environ["CUDA_VISIBLE_DEVICES"] = "0"
        return
    if mode == "mps" and platform.system().lower() != "darwin":
        emit({"type": "status", "message": "Modo mps ignorado (use apenas no macOS); usando auto."})
    # auto / mps(darwin): não mexer aqui


def detect_device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if platform.system().lower() == "darwin" and getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


def emit_runtime_diagnostics() -> None:
    """Ajuda a entender por que ONNX pode ficar em CPU mesmo com torch+cuXXX."""
    try:
        import torch

        emit(
            {
                "type": "status",
                "message": f"PyTorch CUDA disponivel: {torch.cuda.is_available()}"
                + (f" (device {torch.cuda.get_device_name(0)})" if torch.cuda.is_available() else ""),
            }
        )
    except Exception as exc:
        emit({"type": "status", "message": f"PyTorch: nao foi possivel inspecionar ({exc})"})

    try:
        import onnxruntime as ort

        emit({"type": "status", "message": f"ONNX Runtime providers: {ort.get_available_providers()}"})
    except Exception as exc:
        emit({"type": "status", "message": f"ONNX Runtime: nao foi possivel inspecionar ({exc})"})


def ensure_audio_separator() -> None:
    try:
        import audio_separator  # noqa: F401
    except ImportError:
        emit(
            {
                "type": "error",
                "message": (
                    "Pacote 'audio-separator' nao instalado neste Python. "
                    "Crie a venv na raiz do projeto e instale: "
                    "python3 -m venv .venv && .venv/bin/pip install -r engine/requirements.txt"
                ),
            }
        )
        sys.exit(1)


def ensure_ffmpeg() -> None:
    """audio-separator chama `ffmpeg -version` na inicialização; precisa estar no PATH do sistema."""
    if shutil.which("ffmpeg"):
        return
    emit(
        {
            "type": "error",
            "message": (
                "FFmpeg nao encontrado no PATH. Instale o pacote de sistema (nao e pip). "
                "Exemplos: Ubuntu/Debian: sudo apt install ffmpeg | Fedora: sudo dnf install ffmpeg | macOS: brew install ffmpeg"
            ),
        }
    )
    sys.exit(1)


def default_model_dir() -> Path:
    """Pasta persistente para pesos baixados pelo audio-separator (não usar None: quebra o __init__)."""
    d = Path(__file__).resolve().parent / "models"
    d.mkdir(parents=True, exist_ok=True)
    return d


def run_separator(input_path: str, output_dir: str, device: str, device_mode: DeviceMode) -> list[str]:
    from audio_separator.separator import Separator

    model_dir = default_model_dir()
    separator = Separator(
        model_file_dir=str(model_dir),
        output_dir=output_dir,
        output_format="WAV",
        output_single_stem=None,
    )

    onnx_ep = getattr(separator, "onnx_execution_provider", None)
    torch_dev = getattr(separator, "torch_device", None)
    emit({"type": "status", "message": f"Inferencia ativa: torch={torch_dev}, onnx_providers={onnx_ep}"})

    # Demucs usa PyTorch; ONNX so entra em modelos MDX (.onnx). Nao falhar cuda por ONNX em CPU aqui.
    model_name = "htdemucs_6s.yaml"
    if (
        model_name.lower().endswith(".onnx")
        and device_mode == "cuda"
        and isinstance(onnx_ep, list)
        and onnx_ep == ["CPUExecutionProvider"]
    ):
        raise RuntimeError(
            "GPU solicitada, mas ONNX Runtime so expoe CPUExecutionProvider. "
            "Instale driver NVIDIA; remova o pacote 'onnxruntime' se existir (pip uninstall onnxruntime) "
            "e mantenha apenas onnxruntime-gpu; verifique: python -c \"import onnxruntime as ort; print(ort.get_available_providers())\""
        )
    emit(
        {
            "type": "status",
            "message": f"Loading model {model_name} (Demucs 6 stems: vocais, bateria, baixo, guitarra, piano, outros)",
            "device": device,
        }
    )
    separator.load_model(model_filename=model_name)

    emit({"type": "progress", "message": "Running separation", "progress": 35, "device": device})
    output_files = separator.separate(input_path)

    stems: list[str] = []
    if isinstance(output_files, list):
        stems = [str(Path(item)) for item in output_files]
    emit({"type": "progress", "message": "Post-processing stems", "progress": 90, "device": device, "stems": stems})
    return stems


def is_gpu_oom(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "cuda out of memory" in msg or "cudnn_status_alloc_failed" in msg or "out of memory" in msg


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AudioSplit separator engine")
    parser.add_argument("--input", required=True, dest="input_path")
    parser.add_argument("--output-dir", required=True, dest="output_dir")
    parser.add_argument("--job-id", required=True, dest="job_id")
    parser.add_argument(
        "--device",
        choices=["auto", "cuda", "cpu", "mps"],
        default="auto",
        help="auto: detectar; cuda: usar GPU NVIDIA; cpu: forcar CPU; mps: Apple Silicon (macOS)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    apply_device_env(args.device)

    input_path = args.input_path
    output_dir = args.output_dir
    job_id = args.job_id
    device_mode: DeviceMode = args.device

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    emit({"type": "status", "message": f"Engine started (device mode: {device_mode})", "jobId": job_id})

    ensure_audio_separator()
    ensure_ffmpeg()

    emit_runtime_diagnostics()

    device = detect_device()
    emit({"type": "status", "message": f"Detected device: {device}", "jobId": job_id, "device": device})

    if device_mode == "cuda" and device != "cuda":
        emit(
            {
                "type": "error",
                "message": (
                    "Modo cuda solicitado, mas PyTorch nao ve GPU (torch.cuda.is_available() == False). "
                    "Verifique driver NVIDIA, nvidia-smi, e se o PyTorch na venv e build CUDA (ex.: pip install torch --index-url https://download.pytorch.org/whl/cu124)."
                ),
            }
        )
        return 1

    if device_mode == "mps" and device != "mps":
        emit(
            {
                "type": "error",
                "message": "Modo mps (Apple Silicon) solicitado, mas MPS nao esta disponivel neste sistema.",
            }
        )
        return 1

    try:
        stems = run_separator(input_path, output_dir, device, device_mode)
        emit(
            {
                "type": "complete",
                "message": "Separation completed",
                "progress": 100,
                "jobId": job_id,
                "outputDir": output_dir,
                "stems": stems,
                "device": device,
            }
        )
        return 0
    except Exception as exc:
        if device == "cuda" and is_gpu_oom(exc):
            emit(
                {
                    "type": "error",
                    "message": "GPU memory exhausted. Retrying on CPU...",
                    "jobId": job_id,
                    "device": "cuda",
                }
            )
            try:
                os.environ["CUDA_VISIBLE_DEVICES"] = ""
                stems = run_separator(input_path, output_dir, "cpu", "cpu")
                emit(
                    {
                        "type": "complete",
                        "message": "Separation completed on CPU fallback",
                        "progress": 100,
                        "jobId": job_id,
                        "outputDir": output_dir,
                        "stems": stems,
                        "device": "cpu",
                    }
                )
                return 0
            except Exception as cpu_exc:
                emit(
                    {
                        "type": "error",
                        "message": f"CPU fallback failed: {cpu_exc}",
                        "jobId": job_id,
                        "device": "cpu",
                    }
                )
                traceback.print_exc()
                return 1

        emit({"type": "error", "message": f"Separation failed: {exc}", "jobId": job_id, "device": device})
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
