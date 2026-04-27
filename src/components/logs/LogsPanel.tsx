import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { useAppStore } from "../../store/useAppStore";

export function LogsPanel() {
  const { t } = useI18n();
  const logs = useAppStore((s) => s.logs);
  const clearLogs = useAppStore((s) => s.clearLogs);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl2 border border-white/5 bg-card/40">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-secondary transition-colors hover:text-text-primary"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          <span>{t("logs.details")}</span>
          <span className="mono text-[10px] text-text-muted">({logs.length})</span>
        </button>
        {open && logs.length > 0 ? (
          <button
            type="button"
            onClick={clearLogs}
            aria-label={t("logs.clearAria")}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-white/5 hover:text-text-secondary"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="mono max-h-48 overflow-auto border-t border-white/5 p-3 text-[11px] leading-relaxed text-text-secondary">
          {logs.length === 0 ? (
            <p className="text-text-muted">{t("logs.empty")}</p>
          ) : (
            logs.map((line, idx) => (
              <p key={`${line}-${idx}`} className="whitespace-pre-wrap break-words">
                {line}
              </p>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
