import { useEffect, useMemo, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useAppStore } from "./store";
import { StemMixer } from "./StemMixer";

const ACCEPT = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/flac": [".flac"],
  "audio/mp4": [".m4a"]
};

const extAllowed = (name: string): boolean => /\.(mp3|wav|flac|m4a)$/i.test(name);

function App() {
  const {
    selectedFileName,
    selectedFilePath,
    deviceMode,
    setDeviceMode,
    logs,
    progress,
    processing,
    outputDir,
    stems,
    setFile,
    resetJob,
    setProcessing,
    applyProgress,
    appendLog
  } = useAppStore();

  const [logsOpen, setLogsOpen] = useState(false);

  const showProgress = processing || progress > 0;

  useEffect(() => {
    const unsubscribe = window.audioSplit.onProgress((payload) => {
      applyProgress(payload);
    });
    return unsubscribe;
  }, [applyProgress]);

  const onDrop = (acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      appendLog("Formato nao suportado.");
      return;
    }
    const first = acceptedFiles[0];
    if (!first) return;
    const nativePath = window.audioSplit.getLocalFilePath(first);
    if (!nativePath) {
      appendLog("Nao foi possivel ler o arquivo.");
      return;
    }
    if (!extAllowed(first.name)) {
      appendLog("Extensao invalida.");
      return;
    }
    setFile(nativePath, first.name);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false
  });

  const canProcess = useMemo(() => Boolean(selectedFilePath) && !processing, [selectedFilePath, processing]);

  const handleStart = async () => {
    if (!canProcess) return;
    resetJob();
    setProcessing(true);
    appendLog("Iniciando separacao...");
    const response = await window.audioSplit.startSeparation({
      inputPath: selectedFilePath,
      device: deviceMode
    });
    if (!response.success) {
      appendLog(response.error ?? "Falha desconhecida.");
    } else {
      appendLog("Concluido.");
    }
    setProcessing(false);
  };

  return (
    <main className="min-h-screen bg-surface text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">AudioSplit</h1>
        </header>

        <section className="rounded-2xl border border-zinc-800 bg-card p-6 shadow-lg shadow-black/20">
          <div
            {...getRootProps()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 bg-zinc-950/30 px-6 py-12 transition hover:border-accent/60"
          >
            <input {...getInputProps()} />
            <span className="text-sm text-zinc-300">{isDragActive ? "Solte o arquivo aqui" : "Arraste ou clique para escolher"}</span>
            {selectedFileName ? (
              <span className="max-w-full truncate text-center text-sm text-accent">{selectedFileName}</span>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex flex-col gap-1.5 text-xs text-zinc-500">
              <span className="text-zinc-400">Dispositivo</span>
              <select
                value={deviceMode}
                onChange={(e) => setDeviceMode(e.target.value as typeof deviceMode)}
                disabled={processing}
                className="min-w-[200px] rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <option value="auto">Automatico</option>
                <option value="cuda">GPU NVIDIA</option>
                <option value="cpu">CPU</option>
                <option value="mps">Apple Silicon</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={!canProcess}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {processing ? "Processando..." : "Separar"}
              </button>
              <button
                type="button"
                onClick={() => (outputDir ? window.audioSplit.openOutputFolder(outputDir) : undefined)}
                disabled={!outputDir}
                className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Pasta
              </button>
            </div>
          </div>
        </section>

        {showProgress ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Progresso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
              />
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Mix</h2>
          {stems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/20 py-10 text-center text-sm text-zinc-500">
              Os resultados aparecem aqui apos a separacao.
            </p>
          ) : (
            <StemMixer stems={stems} />
          )}
        </section>

        <section className="border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={() => setLogsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-400"
          >
            <span>Detalhes</span>
            <span className="text-zinc-600">{logsOpen ? "−" : "+"}</span>
          </button>
          {logsOpen ? (
            <div className="max-h-40 overflow-auto rounded-lg bg-zinc-950/80 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
              {logs.length === 0 ? <p className="text-zinc-600">Sem logs.</p> : logs.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>)}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default App;
