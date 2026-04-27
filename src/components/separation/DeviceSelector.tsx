import type { SeparationDeviceMode } from "../../../electron/types";
import { useI18n } from "../../i18n/I18nProvider";
import { useEffect, useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";

export function DeviceSelector() {
  const { t } = useI18n();
  const deviceMode = useAppStore((s) => s.deviceMode);
  const setDeviceMode = useAppStore((s) => s.setDeviceMode);
  const processing = useAppStore((s) => s.processing);
  const devices = useAppStore((s) => s.separationDevices);
  const devicesLoaded = useAppStore((s) => s.separationDevicesLoaded);
  const devicesLoading = useAppStore((s) => s.separationDevicesLoading);
  const setDevices = useAppStore((s) => s.setSeparationDevices);
  const setDevicesLoading = useAppStore((s) => s.setSeparationDevicesLoading);

  useEffect(() => {
    if (devicesLoaded || devicesLoading) return;
    setDevicesLoading(true);
    void window.audioSplit
      .getSeparationDevices()
      .then((detected) => {
        const normalized = detected.filter((d) => d.mode === "cpu" || d.mode === "cuda" || d.mode === "mps");
        setDevices(normalized.length > 0 ? normalized : [{ mode: "cpu", name: "CPU", label: "CPU - CPU", kind: "cpu" }]);
      })
      .catch(() => {
        setDevices([{ mode: "cpu", name: "CPU", label: "CPU - CPU", kind: "cpu" }]);
      })
      .finally(() => {
        setDevicesLoading(false);
      });
  }, [devicesLoaded, devicesLoading, setDevices, setDevicesLoading]);

  const hasCurrentMode = useMemo(() => devices.some((d) => d.mode === deviceMode), [devices, deviceMode]);

  useEffect(() => {
    if (devices.length === 0) return;
    if (!hasCurrentMode) {
      setDeviceMode(devices[0].mode);
    }
  }, [devices, hasCurrentMode, setDeviceMode]);

  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-secondary">
      <span>{t("separation.device")}</span>
      <select
        value={hasCurrentMode ? deviceMode : (devices[0]?.mode ?? "cpu")}
        onChange={(e) => setDeviceMode(e.target.value as SeparationDeviceMode)}
        disabled={processing}
        className="min-w-[200px] rounded-xl2 border border-white/5 bg-background px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/40 disabled:opacity-50"
      >
        {devices.map((device) => (
          <option key={device.mode} value={device.mode}>
            {devicesLoading && !devicesLoaded && device.mode === "cpu" ? `${device.label} (detectando GPU...)` : device.label}
          </option>
        ))}
      </select>
    </label>
  );
}
