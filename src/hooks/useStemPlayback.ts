import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StemPlayerEngine, type StemPlayerMixerControls, type StemPlayerSnapshot } from "../lib/audio/stemPlayerEngine.ts";
import { useAppStore } from "../store/useAppStore";
import type { StemItem } from "../store/types";

export type StemPlaybackApi = {
  ready: boolean;
  playing: boolean;
  duration: number;
  displayTime: number;
  stemCount: number;
  playPause: () => Promise<void>;
  seek: (value: number) => void;
};

const initialSnapshot = (stemCount: number): StemPlayerSnapshot => ({
  ready: false,
  playing: false,
  duration: 0,
  currentTime: 0,
  stemCount
});

const mixerControlsEqual = (a: StemPlayerMixerControls, b: StemPlayerMixerControls): boolean => {
  if (a.masterVolume !== b.masterVolume) return false;
  for (const channel of Object.keys(a.mutedChannels) as Array<keyof StemPlayerMixerControls["mutedChannels"]>) {
    if (a.mutedChannels[channel] !== b.mutedChannels[channel]) return false;
    if (a.soloChannels[channel] !== b.soloChannels[channel]) return false;
    if (a.channelVolumes[channel] !== b.channelVolumes[channel]) return false;
  }
  return true;
};

/**
 * Controla a reprodução sincronizada dos stems por meio de um motor imperativo,
 * mantendo React apenas como camada de assinatura de estado e comandos.
 */
export function useStemPlayback(stems: StemItem[]): StemPlaybackApi {
  const mutedChannels = useAppStore((s) => s.mutedChannels);
  const soloChannels = useAppStore((s) => s.soloChannels);
  const channelVolumes = useAppStore((s) => s.channelVolumes);
  const masterVolume = useAppStore((s) => s.masterVolume);

  const stemKey = stems.map((s) => s.path).join("|");
  const engineRef = useRef<StemPlayerEngine | null>(null);
  const controlsRef = useRef<StemPlayerMixerControls | null>(null);
  const [snapshot, setSnapshot] = useState<StemPlayerSnapshot>(() => initialSnapshot(stems.length));

  const controls = useMemo<StemPlayerMixerControls>(
    () => ({ mutedChannels, soloChannels, channelVolumes, masterVolume }),
    [mutedChannels, soloChannels, channelVolumes, masterVolume]
  );

  useEffect(() => {
    const engine = new StemPlayerEngine(stems, controls);
    engineRef.current = engine;
    controlsRef.current = controls;
    setSnapshot(initialSnapshot(stems.length));
    const unsubscribe = engine.subscribe(setSnapshot);

    return () => {
      unsubscribe();
      engine.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, [stemKey, stems]);

  useEffect(() => {
    const engine = engineRef.current;
    const previousControls = controlsRef.current;
    if (!engine || (previousControls && mixerControlsEqual(previousControls, controls))) {
      return;
    }
    controlsRef.current = controls;
    engine.setMixerControls(controls);
  }, [controls]);

  const playPause = useCallback(async () => engineRef.current?.playPause(), []);

  const seek = useCallback(
    (value: number) => {
      engineRef.current?.seek(value);
    },
    []
  );

  return {
    ready: snapshot.ready,
    playing: snapshot.playing,
    duration: snapshot.duration,
    displayTime: snapshot.currentTime,
    stemCount: snapshot.stemCount,
    playPause,
    seek
  };
}
