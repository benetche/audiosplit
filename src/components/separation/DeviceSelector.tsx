import type { SeparationDeviceMode } from "../../../electron/types";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";

export function DeviceSelector() {
  const deviceMode = useAppStore((s) => s.deviceMode);
  const setDeviceMode = useAppStore((s) => s.setDeviceMode);
  const processing = useAppStore((s) => s.processing);
  const [devices, setDevices] = useState<
    Array<{ mode: Exclude<SeparationDeviceMode, "auto">; label: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    void window.audioSplit.getSeparationDevices().then((detected) => {
      if (cancelled) return;
      const normalized = detected
        .filter((d) => d.mode === "cpu" || d.mode === "cuda" || d.mode === "mps")
        .map((d) => ({ mode: d.mode, label: d.label }));
      setDevices(normalized);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCurrentMode = useMemo(
    () => devices.some((d) => d.mode === deviceMode),
    [devices, deviceMode]
  );

  useEffect(() => {
    if (devices.length === 0) return;
    if (!hasCurrentMode) {
      setDeviceMode(devices[0].mode);
    }
  }, [devices, hasCurrentMode, setDeviceMode]);

  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
      <span>Dispositivo</span>
      <select
        value={hasCurrentMode ? deviceMode : (devices[0]?.mode ?? "cpu")}
        onChange={(e) => setDeviceMode(e.target.value as SeparationDeviceMode)}
        disabled={processing || devices.length === 0}
        className="min-w-[200px] rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/40 disabled:opacity-50"
      >
        {devices.length === 0 ? (
          <option value="cpu">Detectando dispositivos...</option>
        ) : (
          devices.map((device) => (
            <option key={device.mode} value={device.mode}>
              {device.label}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
