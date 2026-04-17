import { create } from "zustand";
import type { ProgressPayload, SeparationDeviceMode } from "../electron/types";
import { initialMutedChannels, type MixerChannel } from "./mixerChannels";

export type StemItem = {
  path: string;
  name: string;
};

type AppState = {
  selectedFilePath: string;
  selectedFileName: string;
  deviceMode: SeparationDeviceMode;
  logs: string[];
  progress: number;
  processing: boolean;
  outputDir: string;
  stems: StemItem[];
  /** true = canal mutado (sem contribuicao no mix) */
  mutedChannels: Record<MixerChannel, boolean>;
  setFile: (path: string, name: string) => void;
  setDeviceMode: (mode: SeparationDeviceMode) => void;
  appendLog: (entry: string) => void;
  resetJob: () => void;
  setProcessing: (processing: boolean) => void;
  applyProgress: (payload: ProgressPayload) => void;
  toggleChannelMute: (channel: MixerChannel) => void;
};

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
