/**
 * Pre-generates a Health Engine v2 briefing + TTS audio cache
 * for a given user. Called after report confirmation when
 * the `briefing_pregenerate` setting is `on_confirm`.
 *
 * Runs fire-and-forget — errors are logged, never thrown.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

/**
 * Check if pre-generation is enabled in AI settings.
 */
export async function isPregenerateEnabled(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ai_settings')
    .select('value')
    .eq('key', 'briefing_pregenerate')
    .maybeSingle();
  return data?.value === 'on_confirm';
}

/**
 * Pre-generate briefing + TTS for a user across their active languages.
 * This is designed to be called fire-and-forget after report confirmation.
 */
export async function pregenerateBriefing(userId: string): Promise<void> {
  try {
    const enabled = await isPregenerateEnabled();
    if (!enabled) return;

    console.log(`[pregenerate] Starting briefing pre-generation for user ${userId.slice(0, 8)}…`);

    // Get the user's preferred language (default to 'en')
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('preferred_language')
      .eq('id', userId)
      .maybeSingle();

    const lang = profile?.preferred_language || 'en';

    // 1. Generate the briefing (narrations + slide data)
    //    Using internal fetch to reuse existing briefing-v2 route logic
    //    We need to impersonate the user — use a service-level call
    const briefingRes = await fetch(`${BASE_URL}/api/ai/briefing-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass user ID via a special header for service-level pre-generation
        'X-Pregenerate-User-Id': userId,
        'X-Pregenerate-Secret': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
      body: JSON.stringify({ lang }),
    });

    if (!briefingRes.ok) {
      const err = await briefingRes.text();
      console.error(`[pregenerate] Briefing generation failed: ${briefingRes.status} ${err}`);
      return;
    }

    const { slides, cached } = await briefingRes.json();
    if (cached) {
      console.log(`[pregenerate] Briefing already cached for user ${userId.slice(0, 8)}, skipping TTS`);
      // Still pre-cache TTS for cached briefings (might not have audio yet)
    }

    if (!slides?.length) {
      console.log(`[pregenerate] No slides generated for user ${userId.slice(0, 8)}`);
      return;
    }

    // 2. Pre-generate TTS for each slide (sequentially to avoid rate limits)
    let cached_count = 0;
    for (const slide of slides) {
      if (!slide.narration) continue;
      try {
        const ttsRes = await fetch(`${BASE_URL}/api/ai/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Pregenerate-User-Id': userId,
        'X-Pregenerate-Secret': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          },
          body: JSON.stringify({ text: slide.narration, lang, role: 'briefing' }),
        });
        if (ttsRes.ok) {
          cached_count++;
          const source = ttsRes.headers.get('X-TTS-Source');
          if (source === 'cache') {
            // Already cached, skip logging
          }
        } else {
          console.error(`[pregenerate] TTS failed for slide ${slide.id}: ${ttsRes.status}`);
        }
      } catch (e) {
        console.error(`[pregenerate] TTS error for slide ${slide.id}:`, e);
      }
    }

    console.log(`[pregenerate] Done for user ${userId.slice(0, 8)}: ${slides.length} slides, ${cached_count} audio files cached`);
  } catch (e) {
    console.error('[pregenerate] Unexpected error:', e);
  }
}
