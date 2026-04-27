import { useAppStore } from "../../store/useAppStore";
import { useI18n } from "../../i18n/I18nProvider";

export function SeparationProgress() {
  const { t } = useI18n();
  const progress = useAppStore((s) => s.progress);
  const processing = useAppStore((s) => s.processing);

  const visible = processing || progress > 0;
  if (!visible) return null;

  const clamped = Math.max(0, Math.min(progress, 100));

  return (
    <section className="flex flex-col gap-2 rounded-xl2 border border-white/5 bg-card/60 px-5 py-4">
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{processing ? t("separation.progress.running") : t("separation.progress.done")}</span>
        <span className="mono">{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </section>
  );
}
