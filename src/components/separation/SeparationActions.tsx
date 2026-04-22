import { FolderOpen, Loader2, Waves } from "lucide-react";
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
        className="flex items-center gap-2 rounded-xl2 bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : (
          <Waves className="h-4 w-4" strokeWidth={2} />
        )}
        {processing ? "Processando..." : "Separar"}
      </button>
      <button
        type="button"
        onClick={() => (outputDir ? window.audioSplit.openOutputFolder(outputDir) : undefined)}
        disabled={!outputDir}
        className="flex items-center gap-1.5 rounded-xl2 border border-white/5 px-4 py-2.5 text-sm text-text-secondary transition-all duration-200 hover:border-white/10 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
        Pasta
      </button>
    </div>
  );
}
