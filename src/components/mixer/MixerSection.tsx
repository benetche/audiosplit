import { useAppStore } from "../../store/useAppStore";
import { StemMixer } from "./StemMixer";

export function MixerSection() {
  const stems = useAppStore((s) => s.stems);

  return (
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
  );
}
