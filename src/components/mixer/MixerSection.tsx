import { Music2 } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { useStemPlayback } from "../../hooks/useStemPlayback";
import { useAppStore } from "../../store/useAppStore";
import { MixerTransport } from "./MixerTransport";
import { StemRows } from "./StemRows";

export function MixerSection() {
  const { t } = useI18n();
  const stems = useAppStore((s) => s.stems);

  if (stems.length === 0) {
    return (
      <section className="glass flex flex-col items-center justify-center gap-3 rounded-xl2 p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-accent-soft text-accent">
          <Music2 className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <p className="max-w-sm text-sm text-text-secondary">
          {t("mixer.empty")}
        </p>
      </section>
    );
  }

  return <MixerBody />;
}

function MixerBody() {
  const { t } = useI18n();
  const stems = useAppStore((s) => s.stems);
  const masterVolume = useAppStore((s) => s.masterVolume);
  const setMasterVolume = useAppStore((s) => s.setMasterVolume);
  const playback = useStemPlayback(stems);

  return (
    <section className="flex flex-col gap-5 rounded-xl2 border border-white/5 bg-card p-5 shadow-card">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">{t("mixer.header")}</h2>
        <span className="mono text-[11px] uppercase tracking-wider text-text-muted">
          {stems.length} stems
        </span>
      </header>
      <MixerTransport
        playing={playback.playing}
        ready={playback.ready}
        duration={playback.duration}
        displayTime={playback.displayTime}
        masterVolume={masterVolume}
        onPlayPause={() => void playback.playPause()}
        onSeek={playback.seek}
        onMasterVolumeChange={setMasterVolume}
      />
      <StemRows
        stems={stems}
        duration={playback.duration}
        displayTime={playback.displayTime}
        onSeek={playback.seek}
      />
    </section>
  );
}
