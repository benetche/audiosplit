/// <reference types="vite/client" />

import type { ProgressPayload, StartSeparationRequest, StartSeparationResponse } from "../electron/types";

declare global {
  interface Window {
    audioSplit: {
      getLocalFilePath: (file: File) => string | null;
      audioUrlFromPath: (absolutePath: string) => string;
      startSeparation: (request: StartSeparationRequest) => Promise<StartSeparationResponse>;
      onProgress: (callback: (payload: ProgressPayload) => void) => () => void;
      openOutputFolder: (outputPath: string) => Promise<string>;
    };
  }
}

export {};
