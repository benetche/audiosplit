import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

/** Assina o canal de progresso do sidecar e atualiza o store. */
export function useProgressSubscription(): void {
  const applyProgress = useAppStore((s) => s.applyProgress);

  useEffect(() => {
    const unsubscribe = window.audioSplit.onProgress((payload) => {
      applyProgress(payload);
    });
    return unsubscribe;
  }, [applyProgress]);
}
