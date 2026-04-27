import { useDropzone, type DropzoneState, type FileRejection } from "react-dropzone";
import { useI18n } from "../i18n/I18nProvider";
import { ACCEPTED_AUDIO_MIME, isSupportedAudioExtension } from "../lib/audio/supportedFormats";
import { useAppStore } from "../store/useAppStore";

/** Encapsula o fluxo de seleção de arquivo e validação de formato. */
export function useFileSelection(): DropzoneState {
  const { t } = useI18n();
  const setFile = useAppStore((s) => s.setFile);
  const appendLog = useAppStore((s) => s.appendLog);

  const onDrop = (acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      appendLog(t("hooks.file.unsupportedFormat"));
      return;
    }
    const first = acceptedFiles[0];
    if (!first) return;
    const nativePath = window.audioSplit.getLocalFilePath(first);
    if (!nativePath) {
      appendLog(t("hooks.file.readError"));
      return;
    }
    if (!isSupportedAudioExtension(first.name)) {
      appendLog(t("hooks.file.invalidExtension"));
      return;
    }
    setFile(nativePath, first.name);
  };

  return useDropzone({
    onDrop,
    accept: ACCEPTED_AUDIO_MIME,
    multiple: false
  });
}
