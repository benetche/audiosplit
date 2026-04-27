import { effectiveMute, inferMixerChannel, type MixerChannel } from "../mixer/channels";
import type { StemItem } from "../../store/types";

type StemNode = {
  stem: StemItem;
  channel: MixerChannel;
  buffer: AudioBuffer | null;
  duration: number;
  gain: GainNode;
  source: AudioBufferSourceNode | null;
};

export type StemPlayerSnapshot = {
  ready: boolean;
  playing: boolean;
  duration: number;
  currentTime: number;
  stemCount: number;
};

export type StemPlayerMixerControls = {
  mutedChannels: Record<MixerChannel, boolean>;
  soloChannels: Record<MixerChannel, boolean>;
  channelVolumes: Record<MixerChannel, number>;
  masterVolume: number;
};

type StemPlayerListener = (snapshot: StemPlayerSnapshot) => void;

const START_DELAY_SECONDS = 0.04;
const END_EPSILON_SECONDS = 0.02;

const emptySnapshot = (stemCount: number): StemPlayerSnapshot => ({
  ready: false,
  playing: false,
  duration: 0,
  currentTime: 0,
  stemCount
});

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
};

const createAudioContext = (): AudioContext => {
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) {
    throw new Error("AudioContext is not available.");
  }
  return new AudioContextCtor();
};

const toArrayBuffer = (bytes: ArrayBuffer | Uint8Array): ArrayBuffer => {
  if (bytes instanceof ArrayBuffer) return bytes;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const readAndDecode = async (ctx: AudioContext, absolutePath: string): Promise<AudioBuffer> => {
  const bytes = await window.audioSplit.getAudioBytes(absolutePath);
  if (!bytes) {
    throw new Error("Audio bytes are not available.");
  }
  return ctx.decodeAudioData(toArrayBuffer(bytes).slice(0));
};

const readNativeDuration = async (absolutePath: string): Promise<number> => {
  const duration = await window.audioSplit.getAudioDuration(absolutePath);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

/**
 * Mixer multifaixa baseado em AudioBufferSourceNode.
 *
 * Diferente de múltiplos HTMLAudioElement, todos os stems são agendados no
 * mesmo AudioContext.currentTime, usando um único relógio para play e seek.
 */
export class StemPlayerEngine {
  private readonly ctx: AudioContext;
  private readonly masterGain: GainNode;
  private readonly nodes = new Map<string, StemNode>();
  private readonly listeners = new Set<StemPlayerListener>();
  private snapshot: StemPlayerSnapshot;
  private controls: StemPlayerMixerControls;
  private destroyed = false;
  private offset = 0;
  private startedAt = 0;
  private animationFrameId: number | null = null;
  private loadToken = 0;
  private loadPromise: Promise<void>;

  constructor(stems: StemItem[], controls: StemPlayerMixerControls) {
    this.ctx = createAudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.snapshot = emptySnapshot(stems.length);
    this.controls = controls;

    for (const stem of stems) {
      const channel = inferMixerChannel(stem.name);
      const gain = this.ctx.createGain();
      gain.connect(this.masterGain);
      const node: StemNode = {
        stem,
        channel,
        buffer: null,
        duration: 0,
        gain,
        source: null
      };
      this.nodes.set(stem.path, node);
      this.applyNodeVolume(node);
    }

    this.applyMasterVolume();
    this.loadPromise = this.loadBuffers();
  }

  subscribe(listener: StemPlayerListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setMixerControls(controls: StemPlayerMixerControls): void {
    this.controls = controls;
    this.applyMasterVolume();
    this.nodes.forEach((node) => this.applyNodeVolume(node));
  }

  async playPause(): Promise<void> {
    if (this.snapshot.playing) {
      this.pause();
      return;
    }
    await this.play();
  }

  async play(): Promise<void> {
    if (this.destroyed || !this.snapshot.ready || this.nodes.size === 0) return;

    await this.loadPromise;
    if (this.destroyed || !this.hasPlayableBuffers()) return;

    await this.ctx.resume();
    if (this.offset >= this.snapshot.duration - END_EPSILON_SECONDS) {
      this.offset = 0;
    }

    this.stopSources();
    const startAt = this.ctx.currentTime + START_DELAY_SECONDS;
    this.startedAt = startAt - this.offset;

    this.nodes.forEach((node) => {
      if (!node.buffer || this.offset >= node.buffer.duration - END_EPSILON_SECONDS) {
        return;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = node.buffer;
      source.connect(node.gain);
      source.start(startAt, Math.max(0, Math.min(this.offset, node.buffer.duration)));
      node.source = source;
    });

    this.setSnapshot({ playing: true, currentTime: this.offset });
    this.startClock();
  }

  pause(): void {
    if (this.destroyed) return;

    const currentTime = this.readCurrentTime();
    this.offset = currentTime;
    this.stopSources();
    this.stopClock();
    this.setSnapshot({ playing: false, currentTime });
  }

  seek(value: number): void {
    if (this.destroyed) return;

    const target = this.clampTimelineTime(value);
    const wasPlaying = this.snapshot.playing;
    this.offset = target;
    this.stopSources();
    this.stopClock();
    this.setSnapshot({ playing: false, currentTime: target });

    if (wasPlaying) {
      void this.play();
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.loadToken += 1;
    this.stopSources();
    this.stopClock();
    this.listeners.clear();
    this.nodes.forEach((node) => {
      node.gain.disconnect();
    });
    this.nodes.clear();
    this.masterGain.disconnect();
    void this.ctx.close();
  }

  private async loadBuffers(): Promise<void> {
    const token = this.loadToken + 1;
    this.loadToken = token;
    const entries = [...this.nodes.values()];

    const nativeDurations = await Promise.allSettled(entries.map((node) => readNativeDuration(node.stem.path)));
    if (this.destroyed || this.loadToken !== token) return;

    nativeDurations.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value > 0) {
        entries[index].duration = result.value;
      }
    });
    this.updateReadyState();

    await Promise.all(
      entries.map(async (node) => {
        try {
          node.buffer = await readAndDecode(this.ctx, node.stem.path);
          node.duration = Math.max(node.duration, node.buffer.duration);
        } catch (error) {
          console.warn(`[AudioSplit] Failed to decode stem: ${node.stem.name}`, error);
        }
        if (!this.destroyed && this.loadToken === token) {
          this.updateReadyState();
        }
      })
    );
    if (this.destroyed || this.loadToken !== token) return;

    this.updateReadyState();
  }

  private updateReadyState(): void {
    const entries = [...this.nodes.values()];
    const playableBuffers = entries.filter((node) => node.buffer !== null);
    const duration = Math.max(0, ...entries.map((node) => node.duration));
    const ready = duration > 0 && (playableBuffers.length > 0 || entries.some((node) => node.duration > 0));
    this.offset = this.clampValue(this.offset, duration);
    this.setSnapshot({
      ready,
      duration,
      stemCount: entries.length,
      currentTime: this.offset
    });
  }

  private hasPlayableBuffers(): boolean {
    return [...this.nodes.values()].some((node) => node.buffer !== null);
  }

  private startClock(): void {
    this.stopClock();
    const tick = () => {
      if (this.destroyed || !this.snapshot.playing) return;

      const currentTime = this.readCurrentTime();
      if (currentTime >= this.snapshot.duration - END_EPSILON_SECONDS) {
        this.stopAtEnd();
        return;
      }

      this.setSnapshot({ currentTime });
      this.animationFrameId = window.requestAnimationFrame(tick);
    };
    this.animationFrameId = window.requestAnimationFrame(tick);
  }

  private stopClock(): void {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private stopAtEnd(): void {
    this.offset = this.snapshot.duration;
    this.stopSources();
    this.stopClock();
    this.setSnapshot({ playing: false, currentTime: this.snapshot.duration });
  }

  private stopSources(): void {
    this.nodes.forEach((node) => {
      if (!node.source) return;
      try {
        node.source.stop();
      } catch {
        // Source nodes are one-shot and may already have ended naturally.
      }
      node.source.disconnect();
      node.source = null;
    });
  }

  private readCurrentTime(): number {
    if (!this.snapshot.playing) {
      return this.clampTimelineTime(this.offset);
    }
    return this.clampTimelineTime(this.ctx.currentTime - this.startedAt);
  }

  private applyMasterVolume(): void {
    this.masterGain.gain.setValueAtTime(clampVolume(this.controls.masterVolume), this.ctx.currentTime);
  }

  private applyNodeVolume(node: StemNode): void {
    const muted = effectiveMute(node.channel, this.controls.mutedChannels, this.controls.soloChannels);
    const volume = muted ? 0 : clampVolume(this.controls.channelVolumes[node.channel]);
    node.gain.gain.setValueAtTime(volume, this.ctx.currentTime);
  }

  private clampTimelineTime(value: number): number {
    return this.clampValue(value, this.snapshot.duration);
  }

  private clampValue(value: number, max: number): number {
    const safeValue = Number.isFinite(value) ? value : 0;
    if (max > 0) {
      return Math.max(0, Math.min(safeValue, max));
    }
    return Math.max(0, safeValue);
  }

  private setSnapshot(next: Partial<StemPlayerSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }
}
