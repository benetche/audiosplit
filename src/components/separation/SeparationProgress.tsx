import { useAppStore } from "../../store/useAppStore";

export function SeparationProgress() {
  const progress = useAppStore((s) => s.progress);
  const processing = useAppStore((s) => s.processing);

  const visible = processing || progress > 0;
  if (!visible) return null;

  const clamped = Math.max(0, Math.min(progress, 100));

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Progresso</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </section>
  );
}
