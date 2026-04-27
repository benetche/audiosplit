import { DeviceSelector } from "./DeviceSelector";
import { FileDropzone } from "./FileDropzone";
import { SeparationActions } from "./SeparationActions";
import { useI18n } from "../../i18n/I18nProvider";

export function SeparationPanel() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-5 rounded-xl2 border border-white/5 bg-card p-5 shadow-card">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">{t("separation.localFile")}</h2>
        <span className="text-[11px] text-text-muted">{t("separation.dragHint")}</span>
      </header>
      <FileDropzone />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DeviceSelector />
        <SeparationActions />
      </div>
    </section>
  );
}
