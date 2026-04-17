import type { ProgressPayload, SeparationDeviceMode } from "../../electron/types";
import type { MixerChannel } from "../lib/mixer/channels";

export type StemItem = {
  path: string;
  name: string;
};

export type AppState = {
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
