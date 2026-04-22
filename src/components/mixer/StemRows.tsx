import { Download, Drum, Guitar, Mic2, Music, Piano, type LucideIcon } from "lucide-react";
import {
  channelHasStems,
  effectiveMute,
  inferMixerChannel,
  MIXER_CHANNEL_ORDER,
  MIXER_LABELS,
  type MixerChannel
} from "../../lib/mixer/channels";
import type { StemItem } from "../../store/types";
import { useAppStore } from "../../store/useAppStore";
import { WaveformBar } from "./WaveformBar";

const CHANNEL_ICONS: Record<MixerChannel, LucideIcon> = {
  vocals: Mic2,
  drums: Drum,
  bass: Music,
  guitars: Guitar,
  other: Piano
};

type StemRowsProps = {
  stems: StemItem[];
  duration: number;
  displayTime: number;
  onSeek: (seconds: number) => void;
};

export function StemRows({ stems, duration, displayTime, onSeek }: StemRowsProps) {
  const muted = useAppStore((s) => s.mutedChannels);
  const solo = useAppStore((s) => s.soloChannels);
  const toggleMute = useAppStore((s) => s.toggleChannelMute);
  const toggleSolo = useAppStore((s) => s.toggleChannelSolo);

  const progress = duration > 0 ? displayTime / duration : 0;

  return (
    <div className="flex flex-col gap-2">
      {MIXER_CHANNEL_ORDER.map((channel) => {
        const has = channelHasStems(stems, channel);
        const Icon = CHANNEL_ICONS[channel];
        const stem = stems.find((s) => inferChannel(s.name) === channel);
        const muteActive = muted[channel];
        const soloActive = solo[channel];
        const effMuted = effectiveMute(channel, muted, solo);

        return (
          <div
            key={channel}
            className={`group flex items-center gap-4 rounded-xl2 border border-white/5 bg-background/60 px-4 py-3 transition-all duration-300 ${
              !has ? "opacity-40" : effMuted ? "opacity-60" : ""
            }`}
          >
            <div className="flex w-[160px] shrink-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl2 transition-colors duration-200 ${
                  soloActive
                    ? "bg-accent text-white shadow-glow-sm"
                    : has
                      ? "bg-white/5 text-text-secondary group-hover:text-accent"
                      : "bg-white/5 text-text-muted"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-text-primary">{MIXER_LABELS[channel]}</span>
                <span className="mono text-[10px] text-text-muted">
                  {has ? (stem ? truncate(stem.name, 22) : "1 stem") : "sem stem"}
                </span>
              </div>
            </div>

            <div className="flex-1">
              {stem ? (
                <WaveformBar
                  path={stem.path}
                  progress={progress}
                  disabled={effMuted || !has}
                  onSeekRatio={(ratio) => onSeek(ratio * duration)}
                />
              ) : (
                <div className="h-9 w-full rounded-lg bg-white/5" />
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <TogglePill
                label="S"
                title="Solo"
                active={soloActive}
                disabled={!has}
                onClick={() => toggleSolo(channel)}
                variant="solo"
              />
              <TogglePill
                label="M"
                title="Mute"
                active={muteActive}
                disabled={!has}
                onClick={() => toggleMute(channel)}
                variant="mute"
              />
              <button
                type="button"
                aria-label={`Exportar ${MIXER_LABELS[channel]}`}
                title="Exportar stem"
                disabled={!has || !stem}
                onClick={() => stem && void window.audioSplit.exportStem(stem.path)}
                className="flex h-8 w-8 items-center justify-center rounded-xl2 border border-white/5 text-text-secondary transition-all duration-200 hover:border-white/10 hover:bg-white/5 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type TogglePillProps = {
  label: string;
  title: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  variant: "mute" | "solo";
};

function TogglePill({ label, title, active, disabled, onClick, variant }: TogglePillProps) {
  const activeClass =
    variant === "solo"
      ? "bg-accent text-white shadow-glow-sm"
      : "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)]";
  const inactiveClass = "bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`mono flex h-8 w-8 items-center justify-center rounded-xl2 text-xs font-semibold transition-all duration-200 hover:scale-[1.05] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label}
    </button>
  );
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function inferChannel(name: string): MixerChannel {
  return inferMixerChannel(name);
}
