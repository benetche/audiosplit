import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "./store";
import type { StemItem } from "./store";
import { MIXER_CHANNEL_ORDER, MIXER_LABELS, channelHasStems, inferMixerChannel } from "./mixerChannels";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m)}:${String(s).padStart(2, "0")}`;
}

type StemMixerProps = {
  stems: StemItem[];
};

export function StemMixer({ stems }: StemMixerProps) {
  const mutedChannels = useAppStore((s) => s.mutedChannels);
  const toggleChannelMute = useAppStore((s) => s.toggleChannelMute);

  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Map<string, { audio: HTMLAudioElement; gain: GainNode }>>(new Map());

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
    const map = new Map<string, { audio: HTMLAudioElement; gain: GainNode }>();
    const muted = useAppStore.getState().mutedChannels;

    for (const stem of stems) {
      const audio = document.createElement("audio");
      audio.src = window.audioSplit.audioUrlFromPath(stem.path);
      audio.preload = "auto";
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      const ch = inferMixerChannel(stem.name);
      gain.gain.value = muted[ch] ? 0 : 1;
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
      const m = mutedChannels[ch];
      n.gain.gain.setValueAtTime(m ? 0 : 1, ctx.currentTime);
    }
  }, [mutedChannels, stems, stemKey]);

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

  if (stems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-card p-5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Reproducao</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void playPause()}
            disabled={!ready}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {playing ? "Pausar" : "Tocar"}
          </button>
          <span className="font-mono text-sm tabular-nums text-zinc-300">
            {formatTime(displayTime)} / {formatTime(duration)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(displayTime, duration || 0)}
          disabled={!ready || !duration}
          onChange={(e) => seek(Number.parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer accent-accent disabled:opacity-40"
        />

        <div className="flex flex-wrap gap-2">
          {MIXER_CHANNEL_ORDER.map((channel) => {
            const has = channelHasStems(stems, channel);
            const muted = mutedChannels[channel];
            return (
              <button
                key={channel}
                type="button"
                disabled={!has}
                onClick={() => toggleChannelMute(channel)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-30 ${
                  !has
                    ? "border border-zinc-800 bg-zinc-950 text-zinc-600"
                    : muted
                      ? "border border-zinc-600 bg-zinc-800 text-zinc-200"
                      : "border border-zinc-600 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {muted ? `${MIXER_LABELS[channel]} (mudo)` : MIXER_LABELS[channel]}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
