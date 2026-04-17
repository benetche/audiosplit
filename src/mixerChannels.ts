/** Canais do mixer (uma faixa por instrumento / grupo). */
export type MixerChannel = "vocals" | "drums" | "bass" | "guitars" | "other";

export const MIXER_CHANNEL_ORDER: MixerChannel[] = ["vocals", "drums", "guitars", "bass", "other"];

export const MIXER_LABELS: Record<MixerChannel, string> = {
  vocals: "Vocal",
  drums: "Bateria",
  guitars: "Guitarras",
  bass: "Baixo",
  other: "Outros"
};

const initialMuted: Record<MixerChannel, boolean> = {
  vocals: false,
  drums: false,
  bass: false,
  guitars: false,
  other: false
};

export function initialMutedChannels(): Record<MixerChannel, boolean> {
  return { ...initialMuted };
}

/** Mapeia ficheiro de stem para canal (instrumental / resto -> other). */
export function inferMixerChannel(fileName: string): MixerChannel {
  const base = fileName.replace(/\.[^.]+$/, "");
  const lower = base.toLowerCase();

  if (
    /(instrumental|instru|karaoke|\(instrumental\)|no[-_\s]?vocals|non[-_\s]?vocal|no_vocals|novocals|minus[-_\s]?vocal|no[-_\s]?vocal\b)/i.test(
      lower
    )
  ) {
    return "other";
  }
  if (/(drum|bateria)/i.test(lower)) return "drums";
  if (/(bass|baixo)/i.test(lower)) return "bass";
  if (/(guitar|gtr|guitarras)/i.test(lower)) return "guitars";
  if (/(piano|teclado)/i.test(lower)) return "other";
  if (/\bvocals?\b/i.test(lower)) return "vocals";
  if (/(other|outros)/i.test(lower)) return "other";
  return "other";
}

export function stemsByChannel(stems: { path: string; name: string }[]): Map<MixerChannel, { path: string; name: string }[]> {
  const map = new Map<MixerChannel, { path: string; name: string }[]>();
  for (const ch of MIXER_CHANNEL_ORDER) {
    map.set(ch, []);
  }
  for (const stem of stems) {
    const ch = inferMixerChannel(stem.name);
    map.get(ch)!.push(stem);
  }
  return map;
}

export function channelHasStems(stems: { path: string; name: string }[], channel: MixerChannel): boolean {
  return stems.some((s) => inferMixerChannel(s.name) === channel);
}
