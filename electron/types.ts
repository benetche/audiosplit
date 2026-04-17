export type SeparationDeviceMode = "auto" | "cuda" | "cpu" | "mps";

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
