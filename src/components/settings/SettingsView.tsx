import { Check, CheckCircle2, FolderOpen, Settings as SettingsIcon, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { EnvInfo } from "../../../electron/types";
import { useI18n } from "../../i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";
import { DeviceSelector } from "../separation/DeviceSelector";
import { Skeleton } from "../ui/Skeleton";

export function SettingsView() {
  const [env, setEnv] = useState<EnvInfo | null>(null);
  const { language, setLanguage, t } = useI18n();
  const lastDownloadDir = useAppStore((s) => s.lastDownloadDir);
  const setLastDownloadDir = useAppStore((s) => s.setLastDownloadDir);

  useEffect(() => {
    let cancelled = false;
    void window.audioSplit.getEnvInfo().then((info) => {
      if (!cancelled) setEnv(info);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeDownloadDir = lastDownloadDir || env?.defaultDownloadDir || "";

  const handleChooseDir = async () => {
    const chosen = await window.audioSplit.chooseDownloadDirectory();
    if (chosen) setLastDownloadDir(chosen);
  };

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <SettingsIcon className="h-6 w-6 text-accent" strokeWidth={1.75} />
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("settings.subtitle")}
        </p>
      </header>

      <Section title={t("settings.section.performance")}>
        <DeviceSelector />
      </Section>

      <Section title={t("settings.section.downloads")}>
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
          <span>{t("settings.defaultFolder")}</span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={activeDownloadDir}
              placeholder={t("settings.noFolder")}
              className="flex-1 truncate rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => void handleChooseDir()}
              className="flex items-center gap-1.5 rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-secondary transition-colors hover:border-white/10 hover:text-text-primary"
            >
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t("download.choose")}
            </button>
          </div>
        </label>
      </Section>

      <Section title={t("settings.section.language")}>
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
          <span>{t("settings.language.label")}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "pt-BR")}
            className="max-w-[280px] rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/40"
          >
            <option value="en">{t("settings.language.english")}</option>
            <option value="pt-BR">{t("settings.language.portuguese")}</option>
          </select>
        </label>
      </Section>

      <Section title={t("settings.section.environment")}>
        {env === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-y-2 text-xs sm:grid-cols-[140px_1fr]">
            <InfoRow label="App" value={`v${env.appVersion}`} />
            <InfoRow label={t("settings.platform")} value={env.platform} />
            <InfoRow label="Python" value={env.pythonPath} />
            <InfoRow
              label="FFmpeg"
              value={
                env.ffmpegFound ? (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                    {env.ffmpegVersion || t("settings.detected")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-300">
                    <XCircle className="h-3 w-3" strokeWidth={2} />
                    {t("settings.ffmpegMissing")}
                  </span>
                )
              }
            />
            <InfoRow label="Output" value={env.outputRoot} />
          </dl>
        )}
      </Section>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl2 border border-white/5 bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="mono break-all text-text-secondary">{value}</dd>
    </>
  );
}
