export type SeparationDeviceMode = "auto" | "cuda" | "cpu" | "mps";

export type SeparationDeviceInfo = {
  mode: Exclude<SeparationDeviceMode, "auto">;
  label: string;
  name: string;
  kind: "cpu" | "gpu";
};

export type ProgressPayload = {
  type: "status" | "progress" | "error" | "complete";
  message: string;
  progress?: number;
  jobId?: string;
  outputDir?: string;
  stems?: string[];
  device?: "cuda" | "mps" | "cpu";
};

export type StartSeparationRequest = {
  inputPath: string;
  /** auto: detectar; cuda: NVIDIA; cpu: forcar CPU; mps: Apple Silicon */
  device?: SeparationDeviceMode;
};

export type StartSeparationResponse = {
  success: boolean;
  jobId?: string;
  outputDir?: string;
  stems?: string[];
  error?: string;
};

export type DownloadAudioFormat = "mp3" | "wav" | "flac" | "m4a";

export type YoutubeProgressPayload = {
  type: "status" | "progress" | "error" | "complete";
  message: string;
  progress?: number;
  jobId?: string;
  outputDir?: string;
  filePath?: string;
  title?: string;
  /** "downloading" | "converting" | "done" */
  phase?: string;
};

export type StartYoutubeDownloadRequest = {
  url: string;
  format: DownloadAudioFormat;
  outputDir: string;
};

export type StartYoutubeDownloadResponse = {
  success: boolean;
  jobId?: string;
  filePath?: string;
  title?: string;
  outputDir?: string;
  error?: string;
};

export type YoutubePreviewInfo = {
  title: string;
  duration: number;
  uploader: string;
  thumbnail: string;
  webpageUrl: string;
};

export type YoutubePreviewResponse =
  | { success: true; info: YoutubePreviewInfo }
  | { success: false; error: string };

export type EnvInfo = {
  pythonPath: string;
  ffmpegFound: boolean;
  ffmpegVersion: string;
  appVersion: string;
  outputRoot: string;
  defaultDownloadDir: string;
  platform: string;
};

export type LibraryEntry = {
  id: string;
  name: string;
  path: string;
  /** ISO string */
  createdAt: string;
  stems: string[];
};
