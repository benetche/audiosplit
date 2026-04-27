import { Pause, Play, Volume2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { formatTime } from "../../lib/audio/formatTime";

type MixerTransportProps = {
  playing: boolean;
  ready: boolean;
  duration: number;
  displayTime: number;
  masterVolume: number;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onMasterVolumeChange: (value: number) => void;
};

export function MixerTransport({
  playing,
  ready,
  duration,
  displayTime,
  masterVolume,
  onPlayPause,
  onSeek,
  onMasterVolumeChange
}: MixerTransportProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!ready}
          aria-label={playing ? t("mixer.pause") : t("mixer.play")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white transition-all duration-200 hover:scale-[1.06] hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          {playing ? <Pause className="h-5 w-5" strokeWidth={2} /> : <Play className="ml-0.5 h-5 w-5" strokeWidth={2} />}
        </button>
        <span className="mono text-sm tabular-nums text-text-secondary">
          {formatTime(displayTime)} <span className="text-text-muted">/ {formatTime(duration)}</span>
        </span>
        <label className="ml-auto flex min-w-[190px] items-center gap-2 text-xs text-text-secondary">
          <Volume2 className="h-4 w-4 text-text-muted" strokeWidth={1.75} />
          <span className="whitespace-nowrap">{t("mixer.masterVolume")}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(Number.parseFloat(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-accent"
          />
          <span className="mono w-9 text-right text-[11px] text-text-muted">{Math.round(masterVolume * 100)}%</span>
        </label>
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
