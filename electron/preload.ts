import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { ProgressPayload, StartSeparationRequest, StartSeparationResponse } from "./types";

type SeparationApi = {
  /** Caminho absoluto no disco (obrigatório no Electron moderno; `File.path` nem sempre existe). */
  getLocalFilePath: (file: File) => string | null;
  /** URL para <audio src> (evita bloqueio file:// com origem http do Vite). */
  audioUrlFromPath: (absolutePath: string) => string;
  startSeparation: (request: StartSeparationRequest) => Promise<StartSeparationResponse>;
  onProgress: (callback: (payload: ProgressPayload) => void) => () => void;
  openOutputFolder: (outputPath: string) => Promise<string>;
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
  openOutputFolder: (outputPath: string) => ipcRenderer.invoke("output:open", outputPath)
};

contextBridge.exposeInMainWorld("audioSplit", api);
