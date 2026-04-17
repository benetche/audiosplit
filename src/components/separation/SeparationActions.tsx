import { useSeparationJob } from "../../hooks/useSeparationJob";
import { useAppStore } from "../../store/useAppStore";

export function SeparationActions() {
  const { canProcess, start } = useSeparationJob();
  const processing = useAppStore((s) => s.processing);
  const outputDir = useAppStore((s) => s.outputDir);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void start()}
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
  );
}
