import { Download, FolderOpen, Loader2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DownloadAudioFormat } from "../../../electron/types";
import { useI18n } from "../../i18n/I18nProvider";
import { isValidYoutubeUrl } from "../../hooks/useYoutubePreview";
import { useYoutubeDownload } from "../../hooks/useYoutubeDownload";
import { useAppStore } from "../../store/useAppStore";
import { UrlHero } from "./UrlHero";

const FORMATS: { value: DownloadAudioFormat; label: string }[] = [
  { value: "mp3", label: "MP3" },
  { value: "wav", label: "WAV" },
  { value: "flac", label: "FLAC" },
  { value: "m4a", label: "M4A" }
];

export function YouTubeDownloadPanel() {
  const { t } = useI18n();
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
  const urlIsValid = useMemo(() => isValidYoutubeUrl(url), [url]);
  const canStart = urlIsValid && !isBusy && outputDir.length > 0;
  const showAdvanced = urlIsValid || state.status !== "idle";

  const handleChooseDir = async () => {
    const chosen = await window.audioSplit.chooseDownloadDirectory();
    if (chosen) {
      setOutputDir(chosen);
      setLastDownloadDir(chosen);
    }
  };

  const handleStart = async () => {
    if (!urlIsValid) {
      appendLog(t("download.invalidUrlLog"));
      return;
    }
    setLastDownloadDir(outputDir);
    await start({ url: url.trim(), format, outputDir, autoImport });
  };

  const statusLabel = (() => {
    switch (state.status) {
      case "downloading":
        return t("download.status.downloading");
      case "converting":
        return t("download.status.converting");
      case "done":
        return t("download.status.done");
      case "error":
        return t("download.status.error");
      default:
        return "";
    }
  })();

  const showProgress = isBusy || state.status === "done" || state.status === "error";
  const clamped = Math.max(0, Math.min(state.percent, 100));

  return (
    <section className="flex flex-col gap-4 rounded-xl2 border border-white/5 bg-card p-5 shadow-card">
      <UrlHero value={url} onChange={setUrl} disabled={isBusy} />

      {showAdvanced ? (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
              <span>{t("download.format")}</span>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as DownloadAudioFormat)}
                disabled={isBusy}
                className="min-w-[140px] rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/40 disabled:opacity-50"
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-1 flex-col gap-1.5 text-xs text-text-secondary">
              <span>{t("download.outputFolder")}</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={outputDir}
                  placeholder={t("download.selectFolder")}
                  className="flex-1 truncate rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => void handleChooseDir()}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-secondary transition-all duration-200 hover:border-white/10 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {t("download.choose")}
                </button>
              </div>
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={autoImport}
              onChange={(e) => setAutoImport(e.target.checked)}
              disabled={isBusy}
              className="h-4 w-4 rounded border-white/10 bg-background accent-accent"
            />
            <span>{t("download.autoImport")}</span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!canStart}
              className="flex items-center gap-2 rounded-xl2 bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Download className="h-4 w-4" strokeWidth={2} />
              )}
              {isBusy ? t("download.processing") : t("download.download")}
            </button>
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={!isBusy}
              className="flex items-center gap-1.5 rounded-xl2 border border-white/5 px-4 py-2.5 text-sm text-text-secondary transition-all duration-200 hover:border-white/10 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t("download.cancel")}
            </button>
            {state.status !== "idle" ? (
              <button
                type="button"
                onClick={reset}
                disabled={isBusy}
                className="rounded-xl2 border border-white/5 px-3 py-2.5 text-xs text-text-muted transition-colors hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("download.reset")}
              </button>
            ) : null}
          </div>

          {showProgress ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>{statusLabel}</span>
                <span className="mono">{Math.round(clamped)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    state.status === "error"
                      ? "bg-red-500"
                      : "bg-gradient-to-r from-accent to-accent-hover"
                  }`}
                  style={{ width: `${clamped}%` }}
                />
              </div>
              {state.status === "done" && state.title ? (
                <p className="truncate text-xs text-text-secondary">
                  {t("download.fileLabel", { title: state.title })}
                </p>
              ) : null}
              {state.status === "error" && state.error ? (
                <p className="text-xs text-red-400">{state.error}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
