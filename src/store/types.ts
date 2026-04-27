import type { AppLanguage } from "../i18n/translations";
import type { ProgressPayload, SeparationDeviceInfo, SeparationDeviceMode } from "../../electron/types";
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
  separationDevices: SeparationDeviceInfo[];
  separationDevicesLoading: boolean;
  separationDevicesLoaded: boolean;
  logs: string[];
  progress: number;
  processing: boolean;
  outputDir: string;
  stems: StemItem[];
  /** true = canal mutado (sem contribuicao no mix) */
  mutedChannels: Record<MixerChannel, boolean>;
  /** true = canal em solo (se algum solo ativo, so os solos tocam) */
  soloChannels: Record<MixerChannel, boolean>;
  /** Volume por canal, de 0 a 1. */
  channelVolumes: Record<MixerChannel, number>;
  /** Volume master do mix, de 0 a 1. */
  masterVolume: number;
  /** Ultima pasta escolhida para downloads nesta sessao (nao persistida em disco). */
  lastDownloadDir: string;
  language: AppLanguage;
  setView: (view: AppView) => void;
  setFile: (path: string, name: string) => void;
  setStems: (stems: StemItem[], outputDir?: string) => void;
  setDeviceMode: (mode: SeparationDeviceMode) => void;
  setSeparationDevices: (devices: SeparationDeviceInfo[]) => void;
  setSeparationDevicesLoading: (loading: boolean) => void;
  appendLog: (entry: string) => void;
  clearLogs: () => void;
  resetJob: () => void;
  setProcessing: (processing: boolean) => void;
  applyProgress: (payload: ProgressPayload) => void;
  toggleChannelMute: (channel: MixerChannel) => void;
  toggleChannelSolo: (channel: MixerChannel) => void;
  setChannelVolume: (channel: MixerChannel, volume: number) => void;
  setMasterVolume: (volume: number) => void;
  setLastDownloadDir: (dir: string) => void;
  setLanguage: (language: AppLanguage) => void;
};
