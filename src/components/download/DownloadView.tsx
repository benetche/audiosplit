import { SlidersHorizontal, Sparkles } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import { LogsPanel } from "../logs/LogsPanel";
import { MixerSection } from "../mixer/MixerSection";
import { SeparationPanel } from "../separation/SeparationPanel";
import { SeparationProgress } from "../separation/SeparationProgress";
import { YouTubeDownloadPanel } from "./YouTubeDownloadPanel";

export function DownloadView() {
  const { t } = useI18n();
  const selectedFilePath = useAppStore((s) => s.selectedFilePath);
  const stems = useAppStore((s) => s.stems);
  const hasContent = Boolean(selectedFilePath) || stems.length > 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <SlidersHorizontal className="h-6 w-6 text-accent" strokeWidth={1.75} />
          {t("download.mixerTitle")}
        </h1>
      </header>

      <YouTubeDownloadPanel />

      {!hasContent ? <HeroEmptyState /> : null}

      <SeparationPanel />
      <SeparationProgress />
      <MixerSection />
      <LogsPanel />
    </section>
  );
}

function HeroEmptyState() {
  const { t } = useI18n();
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 rounded-xl2 px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl2 bg-accent-soft text-accent">
        <Sparkles className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <p className="max-w-md text-sm text-text-secondary">
        {t("download.emptyHint")}
      </p>
    </div>
  );
}
