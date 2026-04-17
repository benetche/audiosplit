import { useCallback, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";

type SeparationJobApi = {
  canProcess: boolean;
  start: () => Promise<void>;
};

/** Controla o ciclo de vida do job de separação (iniciar + feedback no store). */
export function useSeparationJob(): SeparationJobApi {
  const selectedFilePath = useAppStore((s) => s.selectedFilePath);
  const processing = useAppStore((s) => s.processing);
  const deviceMode = useAppStore((s) => s.deviceMode);
  const resetJob = useAppStore((s) => s.resetJob);
  const setProcessing = useAppStore((s) => s.setProcessing);
  const appendLog = useAppStore((s) => s.appendLog);

  const canProcess = useMemo(
    () => Boolean(selectedFilePath) && !processing,
    [selectedFilePath, processing]
  );

  const start = useCallback(async () => {
    if (!selectedFilePath || processing) return;
    resetJob();
    setProcessing(true);
    appendLog("Iniciando separacao...");
    const response = await window.audioSplit.startSeparation({
      inputPath: selectedFilePath,
      device: deviceMode
    });
    if (!response.success) {
      appendLog(response.error ?? "Falha desconhecida.");
    } else {
      appendLog("Concluido.");
    }
    setProcessing(false);
  }, [selectedFilePath, processing, deviceMode, resetJob, setProcessing, appendLog]);

  return { canProcess, start };
}
