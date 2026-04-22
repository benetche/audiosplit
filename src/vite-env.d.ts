/// <reference types="vite/client" />

import type {
  ProgressPayload,
  StartSeparationRequest,
  StartSeparationResponse,
  StartYoutubeDownloadRequest,
  StartYoutubeDownloadResponse,
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
      onYoutubeProgress: (callback: (payload: YoutubeProgressPayload) => void) => () => void;
    };
  }
}

export {};
