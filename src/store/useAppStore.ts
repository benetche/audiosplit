import { create } from "zustand";
import { initialMutedChannels, initialSoloChannels } from "../lib/mixer/channels";
import type { AppState } from "./types";

const defaultSeparationDevices = [{ mode: "cpu" as const, name: "CPU", label: "CPU - CPU", kind: "cpu" as const }];

export const useAppStore = create<AppState>((set) => ({
  view: "download",
  selectedFilePath: "",
  selectedFileName: "",
  deviceMode: "auto",
  separationDevices: defaultSeparationDevices,
  separationDevicesLoading: false,
  separationDevicesLoaded: false,
  logs: [],
  progress: 0,
  processing: false,
  outputDir: "",
  stems: [],
  mutedChannels: initialMutedChannels(),
  soloChannels: initialSoloChannels(),
  lastDownloadDir: "",
  setView: (view) => set({ view }),
  setFile: (selectedFilePath, selectedFileName) => set({ selectedFilePath, selectedFileName }),
  setStems: (stems, outputDir) =>
    set({
      stems,
      outputDir: outputDir ?? "",
      mutedChannels: initialMutedChannels(),
      soloChannels: initialSoloChannels()
    }),
  setLastDownloadDir: (lastDownloadDir) => set({ lastDownloadDir }),
  setDeviceMode: (deviceMode) => set({ deviceMode }),
  setSeparationDevices: (separationDevices) => set({ separationDevices, separationDevicesLoaded: true }),
  setSeparationDevicesLoading: (separationDevicesLoading) => set({ separationDevicesLoading }),
  appendLog: (entry) => set((state) => ({ logs: [...state.logs, entry] })),
  clearLogs: () => set({ logs: [] }),
  resetJob: () =>
    set({
      logs: [],
      progress: 0,
      outputDir: "",
      stems: [],
      mutedChannels: initialMutedChannels(),
      soloChannels: initialSoloChannels()
    }),
  setProcessing: (processing) => set({ processing }),
  applyProgress: (payload) =>
    set((state) => {
      const progress = payload.progress ?? state.progress;
      const outputDir = payload.outputDir ?? state.outputDir;
      const stems =
        payload.stems?.map((stemPath) => ({
          path: stemPath,
          name: stemPath.split(/[\\/]/).pop() ?? stemPath
        })) ?? state.stems;
      const stemsReplaced = Boolean(payload.stems?.length);
      return {
        progress,
        outputDir,
        stems,
        mutedChannels: stemsReplaced ? initialMutedChannels() : state.mutedChannels,
        soloChannels: stemsReplaced ? initialSoloChannels() : state.soloChannels,
        logs: [...state.logs, `[${payload.type}] ${payload.message}`]
      };
    }),
  toggleChannelMute: (channel) =>
    set((state) => ({
      mutedChannels: { ...state.mutedChannels, [channel]: !state.mutedChannels[channel] }
    })),
  toggleChannelSolo: (channel) =>
    set((state) => ({
      soloChannels: { ...state.soloChannels, [channel]: !state.soloChannels[channel] }
    }))
}));

export type { StemItem, AppState, AppView } from "./types";
