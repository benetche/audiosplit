/// <reference types="vite/client" />

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
} from "../electron/types";

declare global {
  interface Window {
    audioSplit: {
      getLocalFilePath: (file: File) => string | null;
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
  }
}

export {};
