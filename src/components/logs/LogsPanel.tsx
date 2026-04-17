import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export function LogsPanel() {
  const logs = useAppStore((s) => s.logs);
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-zinc-800 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-400"
      >
        <span>Detalhes</span>
        <span className="text-zinc-600">{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="max-h-40 overflow-auto rounded-lg bg-zinc-950/80 p-3 font-mono text-[11px] leading-relaxed text-zinc-400">
          {logs.length === 0 ? (
            <p className="text-zinc-600">Sem logs.</p>
          ) : (
            logs.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>)
          )}
        </div>
      ) : null}
    </section>
  );
}
