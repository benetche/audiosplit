import { useEffect, useState } from "react";

/**
 * Cache de peaks por caminho absoluto. Evita reprocessar ao mudar de aba.
 * Compartilhado em modulo para manter persistencia enquanto a aba esta aberta.
 */
const peaksCache = new Map<string, Float32Array>();
const inflight = new Map<string, Promise<Float32Array>>();

export type UseWaveformPeaksResult = {
  peaks: Float32Array | null;
  loading: boolean;
  error: string | null;
};

/**
 * Gera um array de peaks (0..1) para o arquivo de audio referenciado por `absolutePath`.
 * Usa Web Audio API para decodificar e faz downsampling baseado em max(abs) por bucket.
 */
export function useWaveformPeaks(absolutePath: string | null, targetBins = 200): UseWaveformPeaksResult {
  const [state, setState] = useState<UseWaveformPeaksResult>({
    peaks: absolutePath ? peaksCache.get(absolutePath) ?? null : null,
    loading: false,
    error: null
  });

  useEffect(() => {
    if (!absolutePath) {
      setState({ peaks: null, loading: false, error: null });
      return;
    }

    const cached = peaksCache.get(absolutePath);
    if (cached) {
      setState({ peaks: cached, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState({ peaks: null, loading: true, error: null });

    const task = inflight.get(absolutePath) ?? (async () => {
      const url = window.audioSplit.audioUrlFromPath(absolutePath);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Falha ao ler audio (${response.status}).`);
      const buffer = await response.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      try {
        const decoded = await audioCtx.decodeAudioData(buffer.slice(0));
        const peaks = downsamplePeaks(decoded, targetBins);
        peaksCache.set(absolutePath, peaks);
        return peaks;
      } finally {
        void audioCtx.close();
      }
    })();
    inflight.set(absolutePath, task);

    task
      .then((peaks) => {
        if (cancelled) return;
        setState({ peaks, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ peaks: null, loading: false, error: message });
      })
      .finally(() => {
        inflight.delete(absolutePath);
      });

    return () => {
      cancelled = true;
    };
  }, [absolutePath, targetBins]);

  return state;
}

function downsamplePeaks(audio: AudioBuffer, targetBins: number): Float32Array {
  const channels = audio.numberOfChannels;
  const length = audio.length;
  const bucketSize = Math.max(1, Math.floor(length / targetBins));
  const bins = Math.min(targetBins, Math.floor(length / bucketSize));
  const out = new Float32Array(bins);

  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c += 1) {
    data.push(audio.getChannelData(c));
  }

  let max = 0;
  for (let i = 0; i < bins; i += 1) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, length);
    let peak = 0;
    for (let c = 0; c < channels; c += 1) {
      const ch = data[c];
      for (let j = start; j < end; j += 1) {
        const v = Math.abs(ch[j]);
        if (v > peak) peak = v;
      }
    }
    out[i] = peak;
    if (peak > max) max = peak;
  }

  if (max > 0) {
    for (let i = 0; i < bins; i += 1) {
      out[i] = out[i] / max;
    }
  }

  return out;
}

/** Para skeleton / fallback enquanto os peaks carregam. */
export function pseudoPeaks(seed: string, bins = 200): Float32Array {
  const out = new Float32Array(bins);
  let h = 2166136261 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h ^ seed.charCodeAt(i)) * 16777619;
  }
  let state = h >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  for (let i = 0; i < bins; i += 1) {
    const phase = Math.sin(i * 0.22) * 0.4 + 0.6;
    out[i] = Math.min(1, Math.max(0.08, next() * 0.6 + phase * 0.4));
  }
  return out;
}
