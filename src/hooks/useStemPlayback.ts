import { useCallback, useEffect, useRef, useState } from "react";
import { effectiveMute, inferMixerChannel } from "../lib/mixer/channels";
import { useAppStore } from "../store/useAppStore";
import type { StemItem } from "../store/types";

type StemNode = {
  audio: HTMLAudioElement;
  gain: GainNode;
};

export type StemPlaybackApi = {
  ready: boolean;
  playing: boolean;
  duration: number;
  displayTime: number;
  playPause: () => Promise<void>;
  seek: (value: number) => void;
};

/**
 * Controla a reprodução sincronizada de múltiplos stems via Web Audio,
 * aplicando mute por canal e expondo uma API de transporte única.
 */
export function useStemPlayback(stems: StemItem[]): StemPlaybackApi {
  const mutedChannels = useAppStore((s) => s.mutedChannels);
  const soloChannels = useAppStore((s) => s.soloChannels);

  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Map<string, StemNode>>(new Map());

  const [duration, setDuration] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const stemKey = stems.map((s) => s.path).join("|");

  useEffect(() => {
    setReady(false);
    setDuration(0);
    setDisplayTime(0);
    setPlaying(false);

    if (stems.length === 0) {
      nodesRef.current.clear();
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const map = new Map<string, StemNode>();
    const muted = useAppStore.getState().mutedChannels;
    const solo = useAppStore.getState().soloChannels;

    for (const stem of stems) {
      const audio = document.createElement("audio");
      audio.src = window.audioSplit.audioUrlFromPath(stem.path);
      audio.preload = "auto";
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      const ch = inferMixerChannel(stem.name);
      gain.gain.value = effectiveMute(ch, muted, solo) ? 0 : 1;
      source.connect(gain);
      gain.connect(ctx.destination);
      map.set(stem.path, { audio, gain });
    }

    nodesRef.current = map;

    const master = map.get(stems[0].path)?.audio;
    if (master) {
      const onMeta = () => {
        setDuration(Number.isFinite(master.duration) ? master.duration : 0);
        setReady(true);
      };
      if (master.readyState >= 1) onMeta();
      else master.addEventListener("loadedmetadata", onMeta, { once: true });
    }

    return () => {
      map.forEach(({ audio }) => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      });
      void ctx.close();
      ctxRef.current = null;
      nodesRef.current.clear();
    };
  }, [stemKey, stems.length]);

  useEffect(() => {
    const ctx = ctxRef.current;
    const map = nodesRef.current;
    if (!ctx || map.size === 0 || stems.length === 0) return;

    for (const stem of stems) {
      const n = map.get(stem.path);
      if (!n) continue;
      const ch = inferMixerChannel(stem.name);
      const m = effectiveMute(ch, mutedChannels, soloChannels);
      n.gain.gain.setValueAtTime(m ? 0 : 1, ctx.currentTime);
    }
  }, [mutedChannels, soloChannels, stems, stemKey]);

  useEffect(() => {
    if (stems.length === 0) return;
    const map = nodesRef.current;
    const master = map.get(stems[0].path)?.audio;
    if (!master) return;

    const masterPath = stems[0].path;
    const onTime = () => {
      const t = master.currentTime;
      setDisplayTime(t);
      map.forEach(({ audio }, path) => {
        if (path === masterPath) return;
        if (Math.abs(audio.currentTime - t) > 0.2) {
          audio.currentTime = t;
        }
      });
    };
    const onEnded = () => setPlaying(false);
    master.addEventListener("timeupdate", onTime);
    master.addEventListener("ended", onEnded);
    const id = window.setInterval(onTime, 200);
    return () => {
      master.removeEventListener("timeupdate", onTime);
      master.removeEventListener("ended", onEnded);
      window.clearInterval(id);
    };
  }, [stemKey, stems.length]);

  const playPause = useCallback(async () => {
    const ctx = ctxRef.current;
    const map = nodesRef.current;
    if (!ctx || map.size === 0 || stems.length === 0) return;

    if (playing) {
      map.forEach(({ audio }) => audio.pause());
      setPlaying(false);
      return;
    }

    await ctx.resume();
    const masterPath = stems[0].path;
    const t = map.get(masterPath)?.audio.currentTime ?? 0;
    map.forEach(({ audio }) => {
      audio.currentTime = t;
    });
    try {
      await Promise.all([...map.values()].map(({ audio }) => audio.play()));
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, [playing, stems]);

  const seek = useCallback(
    (value: number) => {
      const map = nodesRef.current;
      if (map.size === 0) return;
      const t = Math.max(0, Math.min(value, duration || value));
      map.forEach(({ audio }) => {
        audio.currentTime = t;
      });
      setDisplayTime(t);
    },
    [duration]
  );

  return { ready, playing, duration, displayTime, playPause, seek };
}
