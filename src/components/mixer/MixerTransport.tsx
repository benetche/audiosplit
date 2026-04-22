import { Pause, Play } from "lucide-react";
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!ready}
          aria-label={playing ? "Pausar" : "Tocar"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white transition-all duration-200 hover:scale-[1.06] hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          {playing ? <Pause className="h-5 w-5" strokeWidth={2} /> : <Play className="ml-0.5 h-5 w-5" strokeWidth={2} />}
        </button>
        <span className="mono text-sm tabular-nums text-text-secondary">
          {formatTime(displayTime)} <span className="text-text-muted">/ {formatTime(duration)}</span>
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
        className="h-1 w-full cursor-pointer accent-accent disabled:opacity-40"
      />
    </div>
  );
}
