import { create } from "zustand";
import type { AppLanguage } from "../i18n/translations";
import { initialMutedChannels, initialSoloChannels } from "../lib/mixer/channels";
import type { AppState } from "./types";

const APP_LANGUAGE_KEY = "audiosplit.language";

const loadInitialLanguage = (): AppLanguage => {
  const stored = window.localStorage.getItem(APP_LANGUAGE_KEY);
  if (stored === "en" || stored === "pt-BR") {
    return stored;
  }
  return "en";
};

export const useAppStore = create<AppState>((set) => ({
  view: "download",
  selectedFilePath: "",
  selectedFileName: "",
  deviceMode: "auto",
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
    window.localStorage.setItem(APP_LANGUAGE_KEY, language);
    set({ language });
  },
  setDeviceMode: (deviceMode) => set({ deviceMode }),
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
        logs: [...state.logs, `[${payload.type}] ${localizeProgressMessage(state.language, payload.message)}`]
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
      return language === "pt-BR" ? "Separacao concluida." : "Separation completed.";
    default:
      return normalizeKnownBackendPortuguese(language, message);
  }
}

function normalizeKnownBackendPortuguese(language: AppLanguage, message: string): string {
  if (language === "pt-BR") return message;
  if (message.includes("URL do YouTube invalida")) return "Invalid YouTube URL.";
  if (message.includes("Formato de audio nao suportado")) return "Unsupported audio format.";
  if (message.includes("Download excedeu o tempo limite")) return "Download timed out and was terminated.";
  if (message.includes("Caminho fora do diretorio de saida")) return "Path is outside the output directory.";
  if (message.includes("Janela nao disponivel")) return "Window is not available.";
  if (message.includes("Arquivo de origem nao encontrado")) return "Source file not found.";
  return message;
}
