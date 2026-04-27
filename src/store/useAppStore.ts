import { create } from "zustand";
import type { AppLanguage } from "../i18n/translations";
import { initialMutedChannels, initialSoloChannels } from "../lib/mixer/channels";
import type { AppState } from "./types";

const APP_LANGUAGE_KEY = "audiosplit.language";
const MAX_LOG_ENTRIES = 200;

const loadInitialLanguage = (): AppLanguage => {
  try {
    const stored = window.localStorage.getItem(APP_LANGUAGE_KEY);
    if (stored === "en" || stored === "pt-BR") {
      return stored;
    }
  } catch {
    // Some Electron contexts can deny storage; default language keeps startup resilient.
  }
  return "en";
};
const defaultSeparationDevices = [{ mode: "cpu" as const, name: "CPU", label: "CPU - CPU", kind: "cpu" as const }];

const appendLogEntry = (logs: string[], entry: string): string[] => {
  const next = [...logs, entry];
  return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
};

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
  language: loadInitialLanguage(),
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
  setLanguage: (language) => {
    try {
      window.localStorage.setItem(APP_LANGUAGE_KEY, language);
    } catch {
      // Language still changes for this session even if persistence is unavailable.
    }
    set({ language });
  },
  setDeviceMode: (deviceMode) => set({ deviceMode }),
  setSeparationDevices: (separationDevices) => set({ separationDevices, separationDevicesLoaded: true }),
  setSeparationDevicesLoading: (separationDevicesLoading) => set({ separationDevicesLoading }),
  appendLog: (entry) => set((state) => ({ logs: appendLogEntry(state.logs, entry) })),
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
      const nextState = {
        progress,
        outputDir,
        stems,
        mutedChannels: stemsReplaced ? initialMutedChannels() : state.mutedChannels,
        soloChannels: stemsReplaced ? initialSoloChannels() : state.soloChannels
      };
      if (payload.type === "progress") {
        return nextState;
      }
      return {
        ...nextState,
        logs: appendLogEntry(state.logs, `[${payload.type}] ${localizeProgressMessage(state.language, payload.message)}`)
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

function localizeProgressMessage(language: AppLanguage, message: string): string {
  switch (message) {
    case "Processing timed out and was terminated.":
      return language === "pt-BR" ? "Processamento excedeu o tempo limite e foi encerrado." : message;
    case "Separation finished.":
      return language === "pt-BR" ? "Separação concluída." : "Separation completed.";
    default:
      return normalizeKnownBackendPortuguese(language, message);
  }
}

function normalizeKnownBackendPortuguese(language: AppLanguage, message: string): string {
  if (language === "pt-BR") {
    if (message.includes("URL do YouTube invalida")) return "URL do YouTube inválida.";
    if (message.includes("Formato de audio nao suportado")) return "Formato de áudio não suportado.";
    if (message.includes("Download excedeu o tempo limite")) return "Download excedeu o tempo limite e foi encerrado.";
    if (message.includes("Caminho fora do diretorio de saida")) return "Caminho fora do diretório de saída.";
    if (message.includes("Janela nao disponivel")) return "Janela não disponível.";
    if (message.includes("Arquivo de origem nao encontrado")) return "Arquivo de origem não encontrado.";
    return message;
  }
  if (message.includes("URL do YouTube invalida")) return "Invalid YouTube URL.";
  if (message.includes("Formato de audio nao suportado")) return "Unsupported audio format.";
  if (message.includes("Download excedeu o tempo limite")) return "Download timed out and was terminated.";
  if (message.includes("Caminho fora do diretorio de saida")) return "Path is outside the output directory.";
  if (message.includes("Janela nao disponivel")) return "Window is not available.";
  if (message.includes("Arquivo de origem nao encontrado")) return "Source file not found.";
  return message;
}
