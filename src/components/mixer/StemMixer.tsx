import { useStemPlayback } from "../../hooks/useStemPlayback";
import type { StemItem } from "../../store/types";
import { MixerChannels } from "./MixerChannels";
import { MixerTransport } from "./MixerTransport";

type StemMixerProps = {
  stems: StemItem[];
};

export function StemMixer({ stems }: StemMixerProps) {
  const playback = useStemPlayback(stems);

  if (stems.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-card p-5">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Reproducao</p>

      <div className="flex flex-col gap-4">
        <MixerTransport
          playing={playback.playing}
          ready={playback.ready}
          duration={playback.duration}
          displayTime={playback.displayTime}
          onPlayPause={() => void playback.playPause()}
          onSeek={playback.seek}
        />
        <MixerChannels stems={stems} />
      </div>
    </div>
  );
}
