import { FileAudio2, UploadCloud } from "lucide-react";
import { useI18n } from "../../i18n/I18nProvider";
import { useFileSelection } from "../../hooks/useFileSelection";
import { useAppStore } from "../../store/useAppStore";

export function FileDropzone() {
  const { t } = useI18n();
  const { getRootProps, getInputProps, isDragActive } = useFileSelection();
  const selectedFileName = useAppStore((s) => s.selectedFileName);

  return (
    <div
      {...getRootProps()}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed bg-background/50 px-6 py-10 transition-all duration-300 ${
        isDragActive
          ? "border-accent bg-accent-soft shadow-glow-sm"
          : "border-white/10 hover:border-accent/40 hover:bg-background/80"
      }`}
    >
      <input {...getInputProps()} />
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl2 text-text-secondary transition-colors ${
          isDragActive ? "bg-accent text-white" : "bg-white/5 group-hover:text-accent"
        }`}
      >
        {selectedFileName ? (
          <FileAudio2 className="h-5 w-5" strokeWidth={1.75} />
        ) : (
          <UploadCloud className="h-5 w-5" strokeWidth={1.75} />
        )}
      </div>
      <span className="text-sm text-text-secondary">
        {isDragActive ? t("separation.dropNow") : t("separation.dragOrClick")}
      </span>
      {selectedFileName ? (
        <span className="max-w-full truncate text-center text-xs text-accent">{selectedFileName}</span>
      ) : (
        <span className="text-[11px] text-text-muted">mp3, wav, flac, m4a</span>
      )}
    </div>
  );
}
