import { formatTime } from "../../lib/audio/formatTime";

type MixerTransportProps = {
  playing: boolean;
  ready: boolean;
  duration: number;
  displayTime: number;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
};

export function MixerTransport({ playing, ready, duration, displayTime, onPlayPause, onSeek }: MixerTransportProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onPlayPause}
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
        onChange={(e) => onSeek(Number.parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer accent-accent disabled:opacity-40"
      />
    </>
  );
}
