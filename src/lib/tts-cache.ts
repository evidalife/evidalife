import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const TTS_BUCKET = 'tts-cache';

/** Create a stable cache key from narration text + language */
export function ttsCacheKey(text: string, lang: string): string {
  const hash = createHash('sha256').update(`${lang}:${text}`).digest('hex').slice(0, 16);
  return `${lang}/${hash}.mp3`;
}

/**
 * Register a TTS cache file in the tracking table.
 * Links the file to the user and optionally to a briefing.
 * Enables cascade delete when user or briefing is removed.
 */
export async function registerTTSCacheFile(opts: {
  userId: string;
  storagePath: string;
  lang: string;
  source: string;
  briefingId?: string | null;
  sizeBytes?: number | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    // Upsert by storage_path to avoid duplicates
    await admin.from('tts_cache_files').upsert(
      {
        user_id: opts.userId,
        briefing_id: opts.briefingId ?? null,
        storage_path: opts.storagePath,
        lang: opts.lang,
        source: opts.source,
        size_bytes: opts.sizeBytes ?? null,
      },
      { onConflict: 'storage_path' }
    );
  } catch (err) {
    // Never let tracking failures break the main flow
    console.error('[tts-cache] Failed to register file:', err);
  }
}
