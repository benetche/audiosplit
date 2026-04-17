import { useFileSelection } from "../../hooks/useFileSelection";
import { useAppStore } from "../../store/useAppStore";

export function FileDropzone() {
  const { getRootProps, getInputProps, isDragActive } = useFileSelection();
  const selectedFileName = useAppStore((s) => s.selectedFileName);

  return (
    <div
      {...getRootProps()}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 bg-zinc-950/30 px-6 py-12 transition hover:border-accent/60"
    >
      <input {...getInputProps()} />
      <span className="text-sm text-zinc-300">
        {isDragActive ? "Solte o arquivo aqui" : "Arraste ou clique para escolher"}
      </span>
      {selectedFileName ? (
        <span className="max-w-full truncate text-center text-sm text-accent">{selectedFileName}</span>
      ) : null}
    </div>
  );
}
