import { useEffect, useState } from "react";
import type { YoutubePreviewInfo } from "../../electron/types";

const YOUTUBE_URL_RE = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/.+/i;
const DEBOUNCE_MS = 450;

export type PreviewState = {
  loading: boolean;
  info: YoutubePreviewInfo | null;
  error: string | null;
};

const INITIAL_STATE: PreviewState = { loading: false, info: null, error: null };

/**
 * Debounce + chamada do IPC youtube:preview quando a URL e valida.
 * Ignora respostas tardias via token de revisao.
 */
export function useYoutubePreview(url: string): PreviewState {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || !YOUTUBE_URL_RE.test(trimmed)) {
      setState(INITIAL_STATE);
      return;
    }
    let cancelled = false;
    setState({ loading: true, info: null, error: null });
    const handle = window.setTimeout(async () => {
      try {
        const response = await window.audioSplit.previewYoutubeUrl(trimmed);
        if (cancelled) return;
        if (response.success) {
          setState({ loading: false, info: response.info, error: null });
        } else {
          setState({ loading: false, info: null, error: response.error });
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ loading: false, info: null, error: message });
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [url]);

  return state;
}

export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_RE.test(url.trim());
}
