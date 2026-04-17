import { create } from "zustand";
import { initialMutedChannels } from "../lib/mixer/channels";
import type { AppState } from "./types";

export const useAppStore = create<AppState>((set) => ({
  selectedFilePath: "",
  selectedFileName: "",
  deviceMode: "auto",
  logs: [],
  progress: 0,
  processing: false,
  outputDir: "",
  stems: [],
  mutedChannels: initialMutedChannels(),
  setFile: (selectedFilePath, selectedFileName) => set({ selectedFilePath, selectedFileName }),
  setDeviceMode: (deviceMode) => set({ deviceMode }),
  appendLog: (entry) => set((state) => ({ logs: [...state.logs, entry] })),
  resetJob: () =>
    set({
      logs: [],
      progress: 0,
      outputDir: "",
      stems: [],
      mutedChannels: initialMutedChannels()
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
        logs: [...state.logs, `[${payload.type}] ${payload.message}`]
      };
    }),
  toggleChannelMute: (channel) =>
    set((state) => ({
      mutedChannels: { ...state.mutedChannels, [channel]: !state.mutedChannels[channel] }
    }))
}));

export type { StemItem, AppState } from "./types";
