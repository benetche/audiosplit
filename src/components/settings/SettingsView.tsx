import { Check, CheckCircle2, FolderOpen, Settings as SettingsIcon, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { EnvInfo } from "../../../electron/types";
import { useAppStore } from "../../store/useAppStore";
import { DeviceSelector } from "../separation/DeviceSelector";
import { Skeleton } from "../ui/Skeleton";

export function SettingsView() {
  const [env, setEnv] = useState<EnvInfo | null>(null);
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
          Configurações
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Escolha o dispositivo de inferencia e ajuste os diretorios padroes.
        </p>
      </header>

      <Section title="Performance">
        <DeviceSelector />
      </Section>

      <Section title="Downloads">
        <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
          <span>Pasta padrao</span>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={activeDownloadDir}
              placeholder="Sem pasta escolhida"
              className="flex-1 truncate rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="button"
              onClick={() => void handleChooseDir()}
              className="flex items-center gap-1.5 rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-secondary transition-colors hover:border-white/10 hover:text-text-primary"
            >
              <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
              Escolher
            </button>
          </div>
        </label>
      </Section>

      <Section title="Ambiente">
        {env === null ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-y-2 text-xs sm:grid-cols-[140px_1fr]">
            <InfoRow label="App" value={`v${env.appVersion}`} />
            <InfoRow label="Plataforma" value={env.platform} />
            <InfoRow label="Python" value={env.pythonPath} />
            <InfoRow
              label="FFmpeg"
              value={
                env.ffmpegFound ? (
                  <span className="flex items-center gap-1 text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                    {env.ffmpegVersion || "detectado"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-300">
                    <XCircle className="h-3 w-3" strokeWidth={2} />
                    nao encontrado no PATH
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
