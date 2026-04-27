import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import type {
  DownloadAudioFormat,
  LibraryEntry,
  ProgressPayload,
  SeparationDeviceInfo,
  SeparationDeviceMode,
  StartSeparationRequest,
  StartSeparationResponse,
  StartYoutubeDownloadRequest,
  StartYoutubeDownloadResponse,
  YoutubePreviewInfo,
  YoutubePreviewResponse,
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
  protocol.handle("audiosplit-local", (request) => {
    try {
      const u = new URL(request.url);
      const raw = u.searchParams.get("p");
      if (!raw) {
        return new Response("Missing path parameter.", { status: 400 });
      }
      const abs = path.normalize(decodeURIComponent(raw));
      if (!existsSync(abs) || !isPathUnderOutputRoot(abs)) {
        return new Response("File not found.", { status: 404 });
      }
      return net.fetch(pathToFileURL(abs).toString());
    } catch {
      return new Response("Invalid request.", { status: 400 });
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
const DEVICE_CACHE_TTL_MS = 1000 * 60 * 5;
const DEVICE_DETECTION_TIMEOUT_MS = 1000 * 15;
const FALLBACK_DEVICES: SeparationDeviceInfo[] = [{ mode: "cpu", name: "CPU", label: "CPU - CPU", kind: "cpu" }];

let deviceCache: { devices: SeparationDeviceInfo[]; expiresAt: number } | null = null;
let pendingDeviceDetection: Promise<SeparationDeviceInfo[]> | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#0F111A",
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: process.platform === "win32"
      ? { color: "#0F111A", symbolColor: "#F8FAFC", height: 36 }
      : undefined,
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist-electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const emitMaximizeChange = (): void => {
    mainWindow?.webContents.send("window:maximize-change", mainWindow.isMaximized());
  };
  mainWindow.on("maximize", emitMaximizeChange);
  mainWindow.on("unmaximize", emitMaximizeChange);

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

const detectSeparationDevices = async (): Promise<SeparationDeviceInfo[]> => {
  const pythonCommand = resolvePythonCommand();
  const script = [
    "import json, platform",
    "devices = []",
    "cpu_name = ''",
    "try:",
    "    if platform.system().lower() == 'linux':",
    "        with open('/proc/cpuinfo', 'r', encoding='utf-8', errors='ignore') as f:",
    "            for line in f:",
    "                if 'model name' in line:",
    "                    cpu_name = line.split(':', 1)[1].strip()",
    "                    break",
    "except Exception:",
    "    pass",
    "if not cpu_name:",
    "    cpu_name = platform.processor() or platform.machine() or 'CPU'",
    "devices.append({'mode':'cpu','name':cpu_name,'kind':'cpu','label':f'CPU - {cpu_name}'})",
    "try:",
    "    import torch",
    "    if torch.cuda.is_available():",
    "        gpu_name = torch.cuda.get_device_name(0)",
    "        devices.append({'mode':'cuda','name':gpu_name,'kind':'gpu','label':f'GPU - {gpu_name}'})",
    "    if platform.system().lower() == 'darwin' and getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available():",
    "        mps_name = 'Apple Silicon'",
    "        devices.append({'mode':'mps','name':mps_name,'kind':'gpu','label':f'GPU - {mps_name}'})",
    "except Exception:",
    "    pass",
    "print(json.dumps({'devices': devices}, ensure_ascii=True))"
  ].join("\n");

  return new Promise<SeparationDeviceInfo[]>((resolve) => {
    const child = spawn(pythonCommand, ["-c", script], { stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    const timeoutHandle = setTimeout(() => {
      child.kill("SIGTERM");
      resolve(FALLBACK_DEVICES);
    }, DEVICE_DETECTION_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.on("close", () => {
      clearTimeout(timeoutHandle);
      try {
        const parsed = JSON.parse(stdout.trim()) as {
          devices?: Array<{ mode?: string; name?: string; label?: string; kind?: string }>;
        };
        const normalized: SeparationDeviceInfo[] = (parsed.devices ?? [])
          .filter((d) => d.mode === "cpu" || d.mode === "cuda" || d.mode === "mps")
          .map((d) => ({
            mode: d.mode as SeparationDeviceInfo["mode"],
            name: String(d.name ?? ""),
            label: String(d.label ?? d.name ?? d.mode),
            kind: d.kind === "gpu" ? "gpu" : "cpu"
          }));
        if (normalized.length > 0) {
          resolve(normalized);
          return;
        }
      } catch {
        // ignore parse failures and fallback
      }
      resolve(FALLBACK_DEVICES);
    });
    child.on("error", () => {
      clearTimeout(timeoutHandle);
      resolve(FALLBACK_DEVICES);
    });
  });
};

const listSeparationDevices = async (): Promise<SeparationDeviceInfo[]> => {
  const now = Date.now();
  if (deviceCache && deviceCache.expiresAt > now) {
    return deviceCache.devices;
  }
  if (pendingDeviceDetection) {
    return pendingDeviceDetection;
  }

  pendingDeviceDetection = detectSeparationDevices()
    .then((devices) => {
      deviceCache = { devices, expiresAt: Date.now() + DEVICE_CACHE_TTL_MS };
      return devices;
    })
    .finally(() => {
      pendingDeviceDetection = null;
    });

  return pendingDeviceDetection;
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

const runYoutubePreview = async (url: string): Promise<YoutubePreviewResponse> => {
  if (!YOUTUBE_URL_RE.test(url.trim())) {
    return { success: false, error: "URL do YouTube invalida." };
  }
  const pythonCommand = resolvePythonCommand();
  const youtubeScript = getYoutubeScriptPath();
  return new Promise<YoutubePreviewResponse>((resolve) => {
    const child = spawn(pythonCommand, ["-u", youtubeScript, "--url", url.trim(), "--preview-only"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let info: YoutubePreviewInfo | null = null;
    let reportedError: string | undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const payload = JSON.parse(trimmed);
          if (payload.type === "preview") {
            info = {
              title: String(payload.title ?? ""),
              duration: Number(payload.duration ?? 0) || 0,
              uploader: String(payload.uploader ?? ""),
              thumbnail: String(payload.thumbnail ?? ""),
              webpageUrl: String(payload.webpageUrl ?? "")
            };
          } else if (payload.type === "error") {
            reportedError = typeof payload.message === "string" ? payload.message : reportedError;
          }
        } catch {
          /* ignorar linhas nao-JSON */
        }
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      reportedError = reportedError ?? err.message;
    });
    child.on("close", (code) => {
      if (info) {
        resolve({ success: true, info });
        return;
      }
      resolve({
        success: false,
        error: reportedError ?? stderrBuffer.trim() ?? `Processo Python encerrou com codigo ${String(code)}.`
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

const AUDIO_EXT_RE = /\.(wav|mp3|flac|m4a|aiff|aif|ogg)$/i;
const JOB_ID_SUFFIX_RE = /_[0-9a-f-]{8,}$/i;
const LIBRARY_LIST_CONCURRENCY = 8;

const readLibraryEntry = async (root: string, dirent: import("node:fs").Dirent): Promise<LibraryEntry | null> => {
  const fullPath = path.join(root, dirent.name);
  try {
    const [childStat, files] = await Promise.all([fs.stat(fullPath), fs.readdir(fullPath)]);
    const stemFiles = files.filter((f) => AUDIO_EXT_RE.test(f)).sort();
    if (stemFiles.length === 0) return null;

    const displayName = dirent.name.replace(JOB_ID_SUFFIX_RE, "");
    return {
      id: dirent.name,
      name: displayName || dirent.name,
      path: fullPath,
      createdAt: childStat.mtime.toISOString(),
      stems: stemFiles.map((f) => path.join(fullPath, f))
    };
  } catch {
    return null;
  }
};

const listLibraryEntries = async (): Promise<LibraryEntry[]> => {
  const root = getOutputRoot();
  if (!existsSync(root)) return [];
  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const directories = dirents.filter((dirent) => dirent.isDirectory());
  const entries: LibraryEntry[] = [];
  let nextIndex = 0;
  const workerCount = Math.min(LIBRARY_LIST_CONCURRENCY, directories.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < directories.length) {
        const dirent = directories[nextIndex];
        nextIndex += 1;
        const entry = await readLibraryEntry(root, dirent);
        if (entry) entries.push(entry);
      }
    })
  );

  entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return entries;
};

const removeLibraryEntry = async (targetPath: string): Promise<{ success: boolean; error?: string }> => {
  const normalized = path.normalize(targetPath);
  if (!isPathUnderOutputRoot(normalized)) {
    return { success: false, error: "Caminho fora do diretorio de saida." };
  }
  try {
    await fs.rm(normalized, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
};

const loadLibraryEntry = async (targetPath: string): Promise<{ success: boolean; stems: string[]; error?: string }> => {
  const normalized = path.normalize(targetPath);
  if (!isPathUnderOutputRoot(normalized)) {
    return { success: false, stems: [], error: "Caminho fora do diretorio de saida." };
  }
  try {
    const stems = (await fs.readdir(normalized))
      .filter((f) => AUDIO_EXT_RE.test(f))
      .sort()
      .map((f) => path.join(normalized, f));
    return { success: true, stems };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, stems: [], error: message };
  }
};

const getEnvInfo = async (): Promise<import("./types").EnvInfo> => {
  const pythonPath = resolvePythonCommand();
  let ffmpegFound = false;
  let ffmpegVersion = "";
  try {
    const version: string = await new Promise((resolve) => {
      const child = spawn("ffmpeg", ["-version"], { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      child.stdout.on("data", (d: Buffer) => {
        out += d.toString("utf8");
      });
      child.on("error", () => resolve(""));
      child.on("close", () => resolve(out));
    });
    if (version) {
      ffmpegFound = true;
      const firstLine = version.split("\n")[0] ?? "";
      ffmpegVersion = firstLine.trim();
    }
  } catch {
    ffmpegFound = false;
  }
  return {
    pythonPath,
    ffmpegFound,
    ffmpegVersion,
    appVersion: app.getVersion(),
    outputRoot: getOutputRoot(),
    defaultDownloadDir: getDefaultDownloadDir(),
    platform: process.platform
  };
};

const exportStem = async (sourcePath: string): Promise<{ success: boolean; destination?: string; error?: string }> => {
  if (!mainWindow) return { success: false, error: "Janela nao disponivel." };
  if (!sourcePath || !existsSync(sourcePath)) {
    return { success: false, error: "Arquivo de origem nao encontrado." };
  }
  const baseName = path.basename(sourcePath);
  const ext = path.extname(baseName) || ".wav";
  const defaultPath = path.join(getDefaultDownloadDir(), baseName);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Exportar stem",
    defaultPath,
    filters: [{ name: "Audio", extensions: [ext.replace(/^\./, "")] }]
  });
  if (result.canceled || !result.filePath) return { success: false };
  try {
    await fs.copyFile(sourcePath, result.filePath);
    return { success: true, destination: result.filePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
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
  ipcMain.handle("separation:devices", async () => listSeparationDevices());
  ipcMain.handle("output:open", async (_event, outputPath: string) => shell.openPath(outputPath));

  ipcMain.handle("youtube:start", async (_event, request: StartYoutubeDownloadRequest) =>
    runYoutubeDownload(request)
  );
  ipcMain.handle("youtube:cancel", async (_event, jobId: string) => cancelYoutubeDownload(jobId));
  ipcMain.handle("youtube:choose-directory", async () => chooseDownloadDirectory());
  ipcMain.handle("youtube:default-directory", async () => getDefaultDownloadDir());
  ipcMain.handle("youtube:preview", async (_event, url: string) => runYoutubePreview(url));

  ipcMain.handle("stem:export", async (_event, sourcePath: string) => exportStem(sourcePath));

  ipcMain.handle("library:list", async () => listLibraryEntries());
  ipcMain.handle("library:remove", async (_event, dirPath: string) => removeLibraryEntry(dirPath));
  ipcMain.handle("library:load", async (_event, dirPath: string) => loadLibraryEntry(dirPath));

  ipcMain.handle("env:info", async () => getEnvInfo());

  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
    return mainWindow?.isMaximized() ?? false;
  });
  ipcMain.handle("window:toggle-maximize", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  });
  ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });
  ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

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
