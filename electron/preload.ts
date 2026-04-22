import { contextBridge, ipcRenderer, webUtils } from "electron";
import type {
  EnvInfo,
  LibraryEntry,
  ProgressPayload,
  StartSeparationRequest,
  StartSeparationResponse,
  StartYoutubeDownloadRequest,
  StartYoutubeDownloadResponse,
  YoutubePreviewResponse,
  YoutubeProgressPayload
} from "./types";

type SeparationApi = {
  /** Caminho absoluto no disco (obrigatório no Electron moderno; `File.path` nem sempre existe). */
  getLocalFilePath: (file: File) => string | null;
  /** URL para <audio src> (evita bloqueio file:// com origem http do Vite). */
  audioUrlFromPath: (absolutePath: string) => string;
  startSeparation: (request: StartSeparationRequest) => Promise<StartSeparationResponse>;
  onProgress: (callback: (payload: ProgressPayload) => void) => () => void;
  openOutputFolder: (outputPath: string) => Promise<string>;
  startYoutubeDownload: (request: StartYoutubeDownloadRequest) => Promise<StartYoutubeDownloadResponse>;
  cancelYoutubeDownload: (jobId: string) => Promise<boolean>;
  chooseDownloadDirectory: () => Promise<string | null>;
  getDefaultDownloadDirectory: () => Promise<string>;
  previewYoutubeUrl: (url: string) => Promise<YoutubePreviewResponse>;
  exportStem: (sourcePath: string) => Promise<{ success: boolean; destination?: string; error?: string }>;
  listLibrary: () => Promise<LibraryEntry[]>;
  removeLibraryEntry: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
  loadLibraryEntry: (dirPath: string) => Promise<{ success: boolean; stems: string[]; error?: string }>;
  getEnvInfo: () => Promise<EnvInfo>;
  onYoutubeProgress: (callback: (payload: YoutubeProgressPayload) => void) => () => void;
  windowControls: {
    minimize: () => Promise<boolean>;
    toggleMaximize: () => Promise<boolean>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (maximized: boolean) => void) => () => void;
  };
};

const getLocalFilePath = (file: File): string | null => {
  try {
    return webUtils.getPathForFile(file);
  } catch {
    const legacy = (file as File & { path?: string }).path;
    return typeof legacy === "string" && legacy.length > 0 ? legacy : null;
  }
};

const audioUrlFromPath = (absolutePath: string): string =>
  `audiosplit-local://file?p=${encodeURIComponent(absolutePath)}`;

const api: SeparationApi = {
  getLocalFilePath,
  audioUrlFromPath,
  startSeparation: (request: StartSeparationRequest) => ipcRenderer.invoke("separation:start", request),
  onProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ProgressPayload) => callback(payload);
    ipcRenderer.on("separation:progress", listener);
    return () => ipcRenderer.removeListener("separation:progress", listener);
  },
  openOutputFolder: (outputPath: string) => ipcRenderer.invoke("output:open", outputPath),
  startYoutubeDownload: (request: StartYoutubeDownloadRequest) =>
    ipcRenderer.invoke("youtube:start", request),
  cancelYoutubeDownload: (jobId: string) => ipcRenderer.invoke("youtube:cancel", jobId),
  chooseDownloadDirectory: () => ipcRenderer.invoke("youtube:choose-directory"),
  getDefaultDownloadDirectory: () => ipcRenderer.invoke("youtube:default-directory"),
  previewYoutubeUrl: (url: string) => ipcRenderer.invoke("youtube:preview", url),
  exportStem: (sourcePath: string) => ipcRenderer.invoke("stem:export", sourcePath),
  listLibrary: () => ipcRenderer.invoke("library:list"),
  removeLibraryEntry: (dirPath: string) => ipcRenderer.invoke("library:remove", dirPath),
  loadLibraryEntry: (dirPath: string) => ipcRenderer.invoke("library:load", dirPath),
  getEnvInfo: () => ipcRenderer.invoke("env:info"),
  onYoutubeProgress: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: YoutubeProgressPayload) => callback(payload);
    ipcRenderer.on("youtube:progress", listener);
    return () => ipcRenderer.removeListener("youtube:progress", listener);
  },
  windowControls: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
    onMaximizeChange: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
      ipcRenderer.on("window:maximize-change", listener);
      return () => ipcRenderer.removeListener("window:maximize-change", listener);
    }
  }
};

contextBridge.exposeInMainWorld("audioSplit", api);
