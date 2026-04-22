import type { ProgressPayload, SeparationDeviceMode } from "../../electron/types";
import type { MixerChannel } from "../lib/mixer/channels";

export type StemItem = {
  path: string;
  name: string;
};

export type AppView = "download" | "library" | "settings";

export type AppState = {
  view: AppView;
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
  /** true = canal em solo (se algum solo ativo, so os solos tocam) */
  soloChannels: Record<MixerChannel, boolean>;
  /** Ultima pasta escolhida para downloads nesta sessao (nao persistida em disco). */
  lastDownloadDir: string;
  setView: (view: AppView) => void;
  setFile: (path: string, name: string) => void;
  setStems: (stems: StemItem[], outputDir?: string) => void;
  setDeviceMode: (mode: SeparationDeviceMode) => void;
  appendLog: (entry: string) => void;
  clearLogs: () => void;
  resetJob: () => void;
  setProcessing: (processing: boolean) => void;
  applyProgress: (payload: ProgressPayload) => void;
  toggleChannelMute: (channel: MixerChannel) => void;
  toggleChannelSolo: (channel: MixerChannel) => void;
  setLastDownloadDir: (dir: string) => void;
};
