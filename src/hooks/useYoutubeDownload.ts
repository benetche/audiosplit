import { useCallback, useEffect, useRef, useState } from "react";
import type { DownloadAudioFormat, YoutubeProgressPayload } from "../../electron/types";
import { useI18n } from "../i18n/I18nProvider";
import { useAppStore } from "../store/useAppStore";

export type DownloadStatus = "idle" | "downloading" | "converting" | "done" | "error";

export type YoutubeDownloadState = {
  status: DownloadStatus;
  percent: number;
  jobId: string | null;
  filePath: string | null;
  title: string | null;
  error: string | null;
};

type StartParams = {
  url: string;
  format: DownloadAudioFormat;
  outputDir: string;
  autoImport: boolean;
};

type YoutubeDownloadApi = {
  state: YoutubeDownloadState;
  start: (params: StartParams) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
};

const INITIAL_STATE: YoutubeDownloadState = {
  status: "idle",
  percent: 0,
  jobId: null,
  filePath: null,
  title: null,
  error: null
};

const baseName = (p: string): string => p.split(/[\\/]/).pop() ?? p;

export function useYoutubeDownload(): YoutubeDownloadApi {
  const { t } = useI18n();
  const appendLog = useAppStore((s) => s.appendLog);
  const setFile = useAppStore((s) => s.setFile);
  const [state, setState] = useState<YoutubeDownloadState>(INITIAL_STATE);
  const autoImportRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = window.audioSplit.onYoutubeProgress((payload: YoutubeProgressPayload) => {
      // Ignora payloads de outros jobs.
      if (payload.jobId && jobIdRef.current && payload.jobId !== jobIdRef.current) return;

      if (payload.type === "progress") {
        const phase: DownloadStatus =
          payload.phase === "converting" ? "converting" : "downloading";
        const percent =
          typeof payload.progress === "number" && Number.isFinite(payload.progress)
            ? Math.max(0, Math.min(100, payload.progress))
            : undefined;
        setState((prev) => ({
          ...prev,
          status: phase,
          percent: percent ?? prev.percent
        }));
        return;
      }

      if (payload.type === "status") {
        appendLog(`[youtube] ${payload.message}`);
        return;
      }

      if (payload.type === "error") {
        appendLog(`[youtube] ${payload.message}`);
        setState((prev) => ({
          ...prev,
          status: "error",
          error: payload.message
        }));
        return;
      }

      if (payload.type === "complete" && typeof payload.filePath === "string") {
        const filePath = payload.filePath;
        const title = payload.title ?? baseName(filePath);
        setState({
          status: "done",
          percent: 100,
          jobId: jobIdRef.current,
          filePath,
          title,
          error: null
        });
        appendLog(t("hooks.youtube.downloadDone", { title }));
        if (autoImportRef.current) {
          setFile(filePath, baseName(filePath));
          appendLog(t("hooks.youtube.autoImported"));
        }
      }
    });
    return unsubscribe;
  }, [appendLog, setFile, t]);

  const start = useCallback(
    async ({ url, format, outputDir, autoImport }: StartParams) => {
      autoImportRef.current = autoImport;
      setState({
        status: "downloading",
        percent: 0,
        jobId: null,
        filePath: null,
        title: null,
        error: null
      });
      appendLog(t("hooks.youtube.startingDownload", { format }));

      const response = await window.audioSplit.startYoutubeDownload({ url, format, outputDir });
      if (!response.success) {
        const error = response.error ?? t("hooks.youtube.unknownFailure");
        jobIdRef.current = null;
        setState((prev) => ({
          ...prev,
          status: "error",
          error,
          jobId: response.jobId ?? null
        }));
        appendLog(`[youtube] ${error}`);
        return;
      }

      jobIdRef.current = response.jobId ?? null;
      // O evento "complete" via onYoutubeProgress ja cuidou do auto-import;
      // aqui apenas confirmamos o estado final caso o evento tenha sido perdido.
      if (response.filePath) {
        setState((prev) => ({
          ...prev,
          status: "done",
          percent: 100,
          jobId: response.jobId ?? prev.jobId,
          filePath: response.filePath ?? prev.filePath,
          title: response.title ?? prev.title ?? baseName(response.filePath ?? "")
        }));
      }
    },
    [appendLog, t]
  );

  const cancel = useCallback(async () => {
    const jobId = jobIdRef.current;
    if (!jobId) return;
    await window.audioSplit.cancelYoutubeDownload(jobId);
    const cancelledMessage = t("hooks.youtube.cancelled");
    setState((prev) => ({ ...prev, status: "error", error: cancelledMessage }));
    appendLog(t("hooks.youtube.cancelledLog"));
  }, [appendLog, t]);

  const reset = useCallback(() => {
    jobIdRef.current = null;
    autoImportRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  return { state, start, cancel, reset };
}
