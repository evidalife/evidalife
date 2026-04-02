import { createHash } from 'crypto';

export const TTS_BUCKET = 'tts-cache';

/** Create a stable cache key from narration text + language */
export function ttsCacheKey(text: string, lang: string): string {
  const hash = createHash('sha256').update(`${lang}:${text}`).digest('hex').slice(0, 16);
  return `${lang}/${hash}.mp3`;
}
