export const ACCEPTED_AUDIO_MIME: Record<string, string[]> = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/flac": [".flac"],
  "audio/mp4": [".m4a"]
};

export const isSupportedAudioExtension = (name: string): boolean => /\.(mp3|wav|flac|m4a)$/i.test(name);
