import { useDropzone, type DropzoneState, type FileRejection } from "react-dropzone";
import { ACCEPTED_AUDIO_MIME, isSupportedAudioExtension } from "../lib/audio/supportedFormats";
import { useAppStore } from "../store/useAppStore";

/** Encapsula o fluxo de seleção de arquivo e validação de formato. */
export function useFileSelection(): DropzoneState {
  const setFile = useAppStore((s) => s.setFile);
  const appendLog = useAppStore((s) => s.appendLog);

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
    if (!isSupportedAudioExtension(first.name)) {
      appendLog("Extensao invalida.");
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
