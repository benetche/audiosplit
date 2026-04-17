import { DeviceSelector } from "./DeviceSelector";
import { FileDropzone } from "./FileDropzone";
import { SeparationActions } from "./SeparationActions";

export function SeparationPanel() {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-card p-6 shadow-lg shadow-black/20">
      <FileDropzone />
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <DeviceSelector />
        <SeparationActions />
      </div>
    </section>
  );
}
