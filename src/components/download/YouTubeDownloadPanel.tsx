import { useEffect, useMemo, useState } from "react";
import type { DownloadAudioFormat } from "../../../electron/types";
import { useYoutubeDownload } from "../../hooks/useYoutubeDownload";
import { useAppStore } from "../../store/useAppStore";

const FORMATS: { value: DownloadAudioFormat; label: string }[] = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "flac", label: "FLAC" },
  { value: "m4a", label: "M4A" }
];

const YOUTUBE_URL_RE = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/.+/i;

export function YouTubeDownloadPanel() {
  const { state, start, cancel, reset } = useYoutubeDownload();
  const lastDownloadDir = useAppStore((s) => s.lastDownloadDir);
  const setLastDownloadDir = useAppStore((s) => s.setLastDownloadDir);
  const appendLog = useAppStore((s) => s.appendLog);

  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<DownloadAudioFormat>("mp3");
  const [outputDir, setOutputDir] = useState(lastDownloadDir);
  const [autoImport, setAutoImport] = useState(true);

  useEffect(() => {
    if (outputDir) return;
    let cancelled = false;
    void window.audioSplit.getDefaultDownloadDirectory().then((defaultDir) => {
      if (cancelled) return;
      if (defaultDir) {
        setOutputDir(defaultDir);
        if (!lastDownloadDir) setLastDownloadDir(defaultDir);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [outputDir, lastDownloadDir, setLastDownloadDir]);

  const isBusy = state.status === "downloading" || state.status === "converting";
  const urlIsValid = useMemo(() => YOUTUBE_URL_RE.test(url.trim()), [url]);
  const canStart = urlIsValid && !isBusy && outputDir.length > 0;

  const handleChooseDir = async () => {
    const chosen = await window.audioSplit.chooseDownloadDirectory();
    if (chosen) {
      setOutputDir(chosen);
      setLastDownloadDir(chosen);
    }
  };

  const handleStart = async () => {
    if (!urlIsValid) {
      appendLog("[youtube] URL invalida.");
      return;
    }
    setLastDownloadDir(outputDir);
    await start({ url: url.trim(), format, outputDir, autoImport });
  };

  const statusLabel = (() => {
    switch (state.status) {
      case "downloading":
        return "Baixando...";
      case "converting":
        return "Convertendo...";
      case "done":
        return "Concluido";
      case "error":
        return "Erro";
      default:
        return "";
    }
  })();

  const showProgress = isBusy || state.status === "done" || state.status === "error";
  const clamped = Math.max(0, Math.min(state.percent, 100));

  return (
    <section className="rounded-2xl border border-zinc-800 bg-card p-6 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">Baixar do YouTube</h2>
        <span className="text-xs text-zinc-500">Converte o audio via yt-dlp + FFmpeg</span>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs text-zinc-500">
          <span className="text-zinc-400">URL do video</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={isBusy}
            className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 disabled:opacity-50"
          />
          {url.length > 0 && !urlIsValid ? (
            <span className="text-xs text-red-400">URL invalida. Use um link do YouTube.</span>
          ) : null}
        </label>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1.5 text-xs text-zinc-500">
            <span className="text-zinc-400">Formato</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as DownloadAudioFormat)}
              disabled={isBusy}
              className="min-w-[140px] rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1.5 text-xs text-zinc-500">
            <span className="text-zinc-400">Pasta de destino</span>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={outputDir}
                placeholder="Selecione uma pasta..."
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              />
              <button
                type="button"
                onClick={() => void handleChooseDir()}
                disabled={isBusy}
                className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Escolher...
              </button>
            </div>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={autoImport}
            onChange={(e) => setAutoImport(e.target.checked)}
            disabled={isBusy}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-accent"
          />
          <span>Importar automaticamente para a separacao de stems</span>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={!canStart}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isBusy ? "Processando..." : "Baixar"}
          </button>
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={!isBusy}
            className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancelar
          </button>
          {state.status !== "idle" ? (
            <button
              type="button"
              onClick={reset}
              disabled={isBusy}
              className="rounded-lg border border-zinc-700 px-3 py-2.5 text-xs text-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar
            </button>
          ) : null}
        </div>

        {showProgress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{statusLabel}</span>
              <span>{Math.round(clamped)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  state.status === "error" ? "bg-red-500" : "bg-accent"
                }`}
                style={{ width: `${clamped}%` }}
              />
            </div>
            {state.status === "done" && state.title ? (
              <p className="truncate text-xs text-zinc-400">Arquivo: {state.title}</p>
            ) : null}
            {state.status === "error" && state.error ? (
              <p className="text-xs text-red-400">{state.error}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
