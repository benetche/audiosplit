import { channelHasStems, MIXER_CHANNEL_ORDER, MIXER_LABELS } from "../../lib/mixer/channels";
import type { StemItem } from "../../store/types";
import { useAppStore } from "../../store/useAppStore";

type MixerChannelsProps = {
  stems: StemItem[];
};

export function MixerChannels({ stems }: MixerChannelsProps) {
  const mutedChannels = useAppStore((s) => s.mutedChannels);
  const toggleChannelMute = useAppStore((s) => s.toggleChannelMute);

  return (
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
  );
}
