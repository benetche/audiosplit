#!/usr/bin/env python3
"""
AudioSplit YouTube downloader sidecar.

Baixa o audio de um video do YouTube via yt-dlp + FFmpeg e converte
para o formato pedido. Emite JSON linhas em stdout no mesmo padrao
de separator_core.py para o main do Electron consumir.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import traceback
from pathlib import Path
from typing import Any, Literal

SupportedFormat = Literal["mp3", "wav", "flac", "m4a"]
SUPPORTED_FORMATS: tuple[SupportedFormat, ...] = ("mp3", "wav", "flac", "m4a")


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=True), flush=True)


def ensure_yt_dlp() -> None:
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        emit(
            {
                "type": "error",
                "message": (
                    "Pacote 'yt-dlp' nao instalado neste Python. "
                    "Na raiz do projeto, rode 'uv sync' para criar/sincronizar a .venv e tente novamente."
                ),
            }
        )
        sys.exit(1)


def ensure_ffmpeg() -> None:
    """yt-dlp chama ffmpeg para extrair/converter audio; precisa estar no PATH."""
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


_YOUTUBE_URL_RE = re.compile(
    r"^https?://(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)/.+",
    re.IGNORECASE,
)


def is_valid_youtube_url(url: str) -> bool:
    return bool(_YOUTUBE_URL_RE.match(url.strip()))


_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def _clean_percent(value: str) -> float | None:
    cleaned = _ANSI_RE.sub("", value).strip().rstrip("%")
    try:
        return float(cleaned)
    except ValueError:
        return None


def build_progress_hooks(job_id: str) -> tuple[Any, Any]:
    """Hooks de progresso (download) e pos-processamento (convert)."""
    state = {"announced_download": False, "announced_convert": False}

    def download_hook(d: dict[str, Any]) -> None:
        status = d.get("status")
        if status == "downloading":
            if not state["announced_download"]:
                state["announced_download"] = True
                emit(
                    {
                        "type": "status",
                        "message": "Baixando audio do YouTube...",
                        "jobId": job_id,
                    }
                )

            percent: float | None = None
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes")
            if (
                isinstance(total, (int, float))
                and total > 0
                and isinstance(downloaded, (int, float))
            ):
                percent = max(0.0, min(100.0, (downloaded / total) * 100.0))
            elif isinstance(d.get("_percent_str"), str):
                percent = _clean_percent(d["_percent_str"])

            # Mapeia o download em 0..80 para deixar espaco pro pos-processamento.
            mapped = round((percent or 0.0) * 0.8, 1)
            emit(
                {
                    "type": "progress",
                    "message": "downloading",
                    "progress": mapped,
                    "jobId": job_id,
                    "phase": "downloading",
                }
            )
        elif status == "finished":
            emit(
                {
                    "type": "progress",
                    "message": "Download finalizado, convertendo...",
                    "progress": 80,
                    "jobId": job_id,
                    "phase": "converting",
                }
            )

    def postprocessor_hook(d: dict[str, Any]) -> None:
        status = d.get("status")
        pp = d.get("postprocessor", "")
        if status == "started" and not state["announced_convert"]:
            state["announced_convert"] = True
            emit(
                {
                    "type": "status",
                    "message": f"Pos-processando ({pp or 'ffmpeg'})...",
                    "jobId": job_id,
                }
            )
            emit(
                {
                    "type": "progress",
                    "message": "converting",
                    "progress": 90,
                    "jobId": job_id,
                    "phase": "converting",
                }
            )

    return download_hook, postprocessor_hook


def run_download(
    url: str, output_dir: str, audio_format: SupportedFormat, job_id: str
) -> str:
    import yt_dlp

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    download_hook, postprocessor_hook = build_progress_hooks(job_id)

    # restrictfilenames evita caracteres problematicos no nome do arquivo final.
    outtmpl = os.path.join(output_dir, "%(title)s.%(ext)s")
    ydl_opts: dict[str, Any] = {
        "format": "bestaudio/best",
        "outtmpl": outtmpl,
        "noplaylist": True,
        "restrictfilenames": True,
        "quiet": True,
        "no_warnings": True,
        "progress_hooks": [download_hook],
        "postprocessor_hooks": [postprocessor_hook],
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": audio_format,
                "preferredquality": "192",
            }
        ],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if info is None:
            raise RuntimeError("yt-dlp nao retornou informacoes do video.")

        # Caminho do arquivo apos o FFmpegExtractAudio altera a extensao.
        prepared = ydl.prepare_filename(info)
        base, _ = os.path.splitext(prepared)
        final_path = f"{base}.{audio_format}"
        if not os.path.exists(final_path):
            # fallback: se o yt-dlp manteve o original, usa esse
            if os.path.exists(prepared):
                final_path = prepared
            else:
                raise RuntimeError(f"Arquivo final nao encontrado: {final_path}")

        return final_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AudioSplit YouTube downloader")
    parser.add_argument("--url", required=True, dest="url")
    parser.add_argument("--output-dir", required=False, dest="output_dir", default="")
    parser.add_argument("--job-id", required=False, dest="job_id", default="preview")
    parser.add_argument(
        "--format",
        required=False,
        choices=list(SUPPORTED_FORMATS),
        dest="audio_format",
        default="mp3",
        help="Extensao final do arquivo de audio",
    )
    parser.add_argument(
        "--preview-only",
        action="store_true",
        dest="preview_only",
        help="Apenas retorna metadados do video sem baixar",
    )
    return parser.parse_args()


def run_preview(url: str, job_id: str) -> dict[str, Any]:
    import yt_dlp

    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if info is None:
            raise RuntimeError("yt-dlp nao retornou informacoes do video.")

    thumbnails = info.get("thumbnails") or []
    best_thumb = None
    for t in thumbnails:
        if not t.get("url"):
            continue
        if best_thumb is None or (t.get("height") or 0) > (
            best_thumb.get("height") or 0
        ):
            best_thumb = t
    thumbnail_url = (best_thumb or {}).get("url") or info.get("thumbnail")

    return {
        "title": info.get("title") or "",
        "duration": info.get("duration") or 0,
        "uploader": info.get("uploader") or info.get("channel") or "",
        "thumbnail": thumbnail_url or "",
        "webpageUrl": info.get("webpage_url") or url,
        "jobId": job_id,
    }


def main() -> int:
    args = parse_args()
    url: str = args.url
    output_dir: str = args.output_dir
    job_id: str = args.job_id
    audio_format: SupportedFormat = args.audio_format  # type: ignore[assignment]
    preview_only: bool = bool(args.preview_only)

    if not is_valid_youtube_url(url):
        emit({"type": "error", "message": "URL do YouTube invalida.", "jobId": job_id})
        return 1

    ensure_yt_dlp()

    if preview_only:
        try:
            info = run_preview(url, job_id)
            emit({"type": "preview", **info})
            return 0
        except Exception as exc:  # noqa: BLE001
            emit(
                {
                    "type": "error",
                    "message": f"Falha no preview: {exc}",
                    "jobId": job_id,
                }
            )
            traceback.print_exc()
            return 1

    if not output_dir:
        emit(
            {
                "type": "error",
                "message": "--output-dir obrigatorio para download.",
                "jobId": job_id,
            }
        )
        return 1

    emit(
        {
            "type": "status",
            "message": f"YouTube downloader iniciado (format: {audio_format})",
            "jobId": job_id,
        }
    )
    ensure_ffmpeg()

    try:
        final_path = run_download(url, output_dir, audio_format, job_id)
        title = Path(final_path).stem
        emit(
            {
                "type": "complete",
                "message": "Download concluido.",
                "progress": 100,
                "jobId": job_id,
                "filePath": final_path,
                "title": title,
                "outputDir": output_dir,
                "phase": "done",
            }
        )
        return 0
    except Exception as exc:  # noqa: BLE001
        # yt_dlp.utils.DownloadError e qualquer outro erro caem aqui.
        emit(
            {
                "type": "error",
                "message": f"Falha ao baixar: {exc}",
                "jobId": job_id,
            }
        )
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
