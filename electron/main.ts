import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type {
  DownloadAudioFormat,
  ProgressPayload,
  SeparationDeviceMode,
  StartSeparationRequest,
  StartSeparationResponse,
  StartYoutubeDownloadRequest,
  StartYoutubeDownloadResponse,
  YoutubeProgressPayload
} from "./types";

const ALLOWED_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".m4a"]);
const ALLOWED_DOWNLOAD_FORMATS = new Set<DownloadAudioFormat>(["mp3", "wav", "flac", "m4a"]);
const PROCESS_TIMEOUT_MS = 1000 * 60 * 30;
const DOWNLOAD_TIMEOUT_MS = 1000 * 60 * 20;
const YOUTUBE_URL_RE = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\/.+/i;

const sanitizeFileName = (name: string): string =>
  name.normalize("NFKD").replace(/[^\w.\-]/g, "_");

/**
 * Usa PYTHON_EXECUTABLE se definido; senão tenta `.venv` do projeto (onde costuma estar o `pip install`);
 * por último cai no `python3` do PATH (pode não ter audio-separator).
 */
const resolvePythonCommand = (): string => {
  if (process.env.PYTHON_EXECUTABLE) {
    return process.env.PYTHON_EXECUTABLE;
  }
  const root = app.getAppPath();
  const venvPythonUnix = path.join(root, ".venv", "bin", "python");
  const venvPythonWin = path.join(root, ".venv", "Scripts", "python.exe");
  if (existsSync(venvPythonUnix)) {
    return venvPythonUnix;
  }
  if (existsSync(venvPythonWin)) {
    return venvPythonWin;
  }
  return "python3";
};

const getEngineScriptPath = (): string => path.join(app.getAppPath(), "engine", "separator_core.py");

const getYoutubeScriptPath = (): string => path.join(app.getAppPath(), "engine", "youtube_downloader.py");

const getOutputRoot = (): string => path.join(app.getAppPath(), "output");

const getDefaultDownloadDir = (): string => {
  try {
    return path.join(app.getPath("music"), "AudioSplit");
  } catch {
    return path.join(app.getAppPath(), "downloads");
  }
};

/** Permite <audio src="audiosplit-local://..."> no renderer (Vite http) sem webSecurity false. */
protocol.registerSchemesAsPrivileged([
  {
    scheme: "audiosplit-local",
    privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true, corsEnabled: true }
  }
]);

const isPathUnderOutputRoot = (absFile: string): boolean => {
  const root = path.normalize(getOutputRoot());
  const abs = path.normalize(absFile);
  const rel = path.relative(root, abs);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const registerLocalAudioProtocol = (): void => {
  protocol.registerFileProtocol("audiosplit-local", (request, callback) => {
    try {
      const u = new URL(request.url);
      const raw = u.searchParams.get("p");
      if (!raw) {
        callback({ error: -2 });
        return;
      }
      const abs = path.normalize(decodeURIComponent(raw));
      if (!existsSync(abs) || !isPathUnderOutputRoot(abs)) {
        callback({ error: -6 });
        return;
      }
      callback({ path: abs });
    } catch {
      callback({ error: -2 });
    }
  });
};

let mainWindow: BrowserWindow | null = null;

const sendProgress = (payload: ProgressPayload): void => {
  mainWindow?.webContents.send("separation:progress", payload);
};

const sendYoutubeProgress = (payload: YoutubeProgressPayload): void => {
  mainWindow?.webContents.send("youtube:progress", payload);
};

/** Mantem referencia aos downloads ativos para suportar cancelamento. */
const activeDownloads = new Map<string, ChildProcess>();

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    backgroundColor: "#09090f",
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  }
};

const buildChildEnv = (device: SeparationDeviceMode): NodeJS.ProcessEnv => {
  const env = { ...process.env } as NodeJS.ProcessEnv;
  if (device === "cpu") {
    env.CUDA_VISIBLE_DEVICES = "";
  } else if (device === "cuda") {
    const cur = env.CUDA_VISIBLE_DEVICES?.trim() ?? "";
    if (cur === "") {
      env.CUDA_VISIBLE_DEVICES = "0";
    }
  }
  return env;
};

const runSeparation = async (request: StartSeparationRequest): Promise<StartSeparationResponse> => {
  const inputPath = request.inputPath;
  const device: SeparationDeviceMode = request.device ?? "auto";
  const normalized = path.normalize(inputPath.trim());
  const ext = path.extname(normalized).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { success: false, error: "Unsupported extension. Use .mp3, .wav, .flac or .m4a." };
  }
  if (!existsSync(normalized)) {
    return { success: false, error: "Input file does not exist." };
  }

  const safeName = sanitizeFileName(path.basename(normalized, ext));
  const jobId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const outputDir = path.join(getOutputRoot(), `${safeName}_${jobId}`);
  await fs.mkdir(outputDir, { recursive: true });

  const pythonCommand = resolvePythonCommand();
  const engineScript = getEngineScriptPath();

  return new Promise<StartSeparationResponse>((resolve) => {
    const child = spawn(
      pythonCommand,
      [
        "-u",
        engineScript,
        "--input",
        normalized,
        "--output-dir",
        outputDir,
        "--job-id",
        jobId,
        "--device",
        device
      ],
      { stdio: ["ignore", "pipe", "pipe"], env: buildChildEnv(device) }
    );

    let stderrBuffer = "";

    child.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk
        .toString("utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const payload = JSON.parse(line) as ProgressPayload;
          sendProgress(payload);
        } catch {
          sendProgress({ type: "status", message: line, jobId, outputDir });
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8");
      stderrBuffer += message;
      sendProgress({ type: "error", message, jobId, outputDir });
    });

    const timeoutHandle = setTimeout(() => {
      child.kill("SIGTERM");
      sendProgress({
        type: "error",
        message: "Processing timed out and was terminated.",
        jobId,
        outputDir
      });
    }, PROCESS_TIMEOUT_MS);

    child.on("close", async (code) => {
      clearTimeout(timeoutHandle);
      if (code !== 0) {
        const files = await fs.readdir(outputDir).catch(() => []);
        if (files.length === 0) {
          await fs.rm(outputDir, { recursive: true, force: true }).catch(() => undefined);
        }
        resolve({
          success: false,
          error: stderrBuffer || `Python process exited with code ${String(code)}.`,
          jobId,
          outputDir
        });
        return;
      }

      const files = await fs.readdir(outputDir);
      const stems = files.filter((file) => file.toLowerCase().endsWith(".wav")).map((file) => path.join(outputDir, file));
      sendProgress({ type: "complete", message: "Separation finished.", progress: 100, jobId, outputDir, stems });
      resolve({ success: true, jobId, outputDir, stems });
    });
  });
};

const runYoutubeDownload = async (
  request: StartYoutubeDownloadRequest
): Promise<StartYoutubeDownloadResponse> => {
  const url = (request.url ?? "").trim();
  const format = request.format;
  const targetDirRaw = (request.outputDir ?? "").trim();

  if (!YOUTUBE_URL_RE.test(url)) {
    return { success: false, error: "URL do YouTube invalida." };
  }
  if (!ALLOWED_DOWNLOAD_FORMATS.has(format)) {
    return { success: false, error: "Formato de audio nao suportado." };
  }

  const outputDir = path.normalize(targetDirRaw.length > 0 ? targetDirRaw : getDefaultDownloadDir());
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Nao foi possivel criar a pasta de destino: ${message}` };
  }

  const jobId = randomUUID();
  const pythonCommand = resolvePythonCommand();
  const youtubeScript = getYoutubeScriptPath();

  return new Promise<StartYoutubeDownloadResponse>((resolve) => {
    const child = spawn(
      pythonCommand,
      ["-u", youtubeScript, "--url", url, "--output-dir", outputDir, "--format", format, "--job-id", jobId],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    activeDownloads.set(jobId, child);

    let stderrBuffer = "";
    let completedFilePath: string | undefined;
    let completedTitle: string | undefined;
    let reportedError: string | undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk
        .toString("utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const payload = JSON.parse(line) as YoutubeProgressPayload;
          if (payload.type === "complete" && typeof payload.filePath === "string") {
            completedFilePath = payload.filePath;
            completedTitle = payload.title;
          }
          if (payload.type === "error" && typeof payload.message === "string") {
            reportedError = payload.message;
          }
          sendYoutubeProgress({ ...payload, jobId });
        } catch {
          sendYoutubeProgress({ type: "status", message: line, jobId });
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8");
      stderrBuffer += message;
    });

    const timeoutHandle = setTimeout(() => {
      child.kill("SIGTERM");
      sendYoutubeProgress({
        type: "error",
        message: "Download excedeu o tempo limite e foi encerrado.",
        jobId
      });
    }, DOWNLOAD_TIMEOUT_MS);

    child.on("error", (err) => {
      reportedError = reportedError ?? err.message;
      sendYoutubeProgress({ type: "error", message: err.message, jobId });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timeoutHandle);
      activeDownloads.delete(jobId);

      if (signal === "SIGTERM") {
        resolve({ success: false, jobId, error: reportedError ?? "Download cancelado." });
        return;
      }

      if (code !== 0 || !completedFilePath) {
        resolve({
          success: false,
          jobId,
          outputDir,
          error:
            reportedError ??
            stderrBuffer.trim() ??
            `Processo Python encerrou com codigo ${String(code)}.`
        });
        return;
      }

      resolve({
        success: true,
        jobId,
        outputDir,
        filePath: completedFilePath,
        title: completedTitle
      });
    });
  });
};

const cancelYoutubeDownload = (jobId: string): boolean => {
  const child = activeDownloads.get(jobId);
  if (!child) return false;
  child.kill("SIGTERM");
  activeDownloads.delete(jobId);
  return true;
};

const chooseDownloadDirectory = async (): Promise<string | null> => {
  if (!mainWindow) return null;
  const defaultPath = getDefaultDownloadDir();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Escolher pasta de download",
    defaultPath,
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0] ?? null;
};

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerLocalAudioProtocol();

  createWindow();

  ipcMain.handle("separation:start", async (_event, request: StartSeparationRequest) => runSeparation(request));
  ipcMain.handle("output:open", async (_event, outputPath: string) => shell.openPath(outputPath));

  ipcMain.handle("youtube:start", async (_event, request: StartYoutubeDownloadRequest) =>
    runYoutubeDownload(request)
  );
  ipcMain.handle("youtube:cancel", async (_event, jobId: string) => cancelYoutubeDownload(jobId));
  ipcMain.handle("youtube:choose-directory", async () => chooseDownloadDirectory());
  ipcMain.handle("youtube:default-directory", async () => getDefaultDownloadDir());

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
