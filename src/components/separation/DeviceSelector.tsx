import type { SeparationDeviceMode } from "../../../electron/types";
import { useAppStore } from "../../store/useAppStore";

export function DeviceSelector() {
  const deviceMode = useAppStore((s) => s.deviceMode);
  const setDeviceMode = useAppStore((s) => s.setDeviceMode);
  const processing = useAppStore((s) => s.processing);

  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
      <span>Dispositivo</span>
      <select
        value={deviceMode}
        onChange={(e) => setDeviceMode(e.target.value as SeparationDeviceMode)}
        disabled={processing}
        className="min-w-[200px] rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/40 disabled:opacity-50"
      >
        <option value="auto">Automatico</option>
        <option value="cuda">GPU NVIDIA</option>
        <option value="cpu">CPU</option>
        <option value="mps">Apple Silicon</option>
      </select>
    </label>
  );
}
