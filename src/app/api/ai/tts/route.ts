import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAIUsage } from '@/lib/ai/usage-logger';
import { TTS_BUCKET, ttsCacheKey } from '@/lib/tts-cache';

export const maxDuration = 30;

import { getVoiceConfig } from '@/lib/voice/get-voice-config';

// ── Provider config (defaults — overridden by admin settings) ────
const DEFAULT_ELEVENLABS_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel
const DEFAULT_OPENAI_VOICE = 'nova';
const DEFAULT_OPENAI_MODEL = 'tts-1';

// ── Cache config ─────────────────────────────────────────────────
const CACHE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ── TTS providers ────────────────────────────────────────────────

async function elevenLabsTTS(text: string, elKey: string, voiceId: string = DEFAULT_ELEVENLABS_VOICE_ID): Promise<Buffer | null> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!response.ok) {
      const err = await response.text();
      console.error('[TTS] ElevenLabs error:', response.status, err);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    console.error('[TTS] ElevenLabs fetch error:', e instanceof Error ? e.message : e);
    return null;
  }
}

async function openaiTTS(text: string, openaiKey: string, voice: string = DEFAULT_OPENAI_VOICE): Promise<Buffer | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_OPENAI_MODEL,
        input: text,
        voice,
        response_format: 'mp3',
        speed: 0.95,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error('[TTS] OpenAI error:', response.status, err);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    console.error('[TTS] OpenAI fetch error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Main handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: support both session auth and service-level pre-generation
  const pregenerateUserId = req.headers.get('X-Pregenerate-User-Id');
  const pregenerateSecret = req.headers.get('X-Pregenerate-Secret');
  let authUserId: string;

  if (pregenerateUserId && pregenerateSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    authUserId = pregenerateUserId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    authUserId = user.id;
  }

  let body: { text?: string; lang?: string; role?: string; _preview_voice?: string; _preview_provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, lang = 'en', role, _preview_voice, _preview_provider } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const isPreview = !!_preview_voice && !!_preview_provider;
  const adminDb = createAdminClient();

  // ── 1. Check Supabase Storage cache (skip for previews) ────────
  if (!isPreview) {
    const key = ttsCacheKey(text, lang);
    try {
      const { data: cached } = await adminDb.storage.from(TTS_BUCKET).download(key);
      if (cached) {
        const audioBuffer = new Uint8Array(await cached.arrayBuffer());
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(audioBuffer.length),
            'Cache-Control': `private, max-age=${CACHE_MAX_AGE}`,
            'X-TTS-Source': 'cache',
          },
        });
      }
    } catch {
      // Cache miss — proceed to generate
    }
  }

  // ── 2. Determine voice to use ──────────────────────────────────
  let elVoiceId = DEFAULT_ELEVENLABS_VOICE_ID;
  let oaiVoice = DEFAULT_OPENAI_VOICE;
  let forcedProvider: 'elevenlabs' | 'openai' | null = null;

  if (isPreview) {
    // Preview mode: use the exact voice/provider requested
    forcedProvider = _preview_provider as 'elevenlabs' | 'openai';
    if (_preview_provider === 'elevenlabs') {
      elVoiceId = _preview_voice!;
    } else {
      oaiVoice = _preview_voice!;
    }
  } else {
    // Normal mode: load admin config, optionally with role
    let voiceConfig;
    try {
      voiceConfig = await getVoiceConfig(role);
    } catch {
      voiceConfig = null;
    }
    elVoiceId = voiceConfig?.tts.elevenlabs_voice_id || DEFAULT_ELEVENLABS_VOICE_ID;
    oaiVoice = voiceConfig?.tts.openai_voice || DEFAULT_OPENAI_VOICE;
  }

  // ── 3. Generate audio with fallback chain ──────────────────────
  const ttsStartMs = Date.now();
  let audioBuffer: Buffer | null = null;
  let provider: 'elevenlabs' | 'openai' = 'elevenlabs';

  if (forcedProvider === 'openai') {
    // Preview: force OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      audioBuffer = await openaiTTS(text, openaiKey, oaiVoice);
      if (audioBuffer) provider = 'openai';
    }
  } else {
    // Tier 1: ElevenLabs (or forced ElevenLabs preview)
    const elKey = process.env.ELEVENLABS_API_KEY;
    if (elKey) {
      audioBuffer = await elevenLabsTTS(text, elKey, elVoiceId);
      if (audioBuffer) provider = 'elevenlabs';
    }

    // Tier 2: OpenAI TTS (fallback, skip if forced elevenlabs preview)
    if (!audioBuffer && !forcedProvider) {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        audioBuffer = await openaiTTS(text, openaiKey, oaiVoice);
        if (audioBuffer) provider = 'openai';
      }
    }
  }

  // Tier 3: No server-side TTS available — client falls back to browser SpeechSynthesis
  if (!audioBuffer) {
    return NextResponse.json(
      { error: 'All TTS providers failed', fallback: 'browser' },
      { status: 502 }
    );
  }

  const durationMs = Date.now() - ttsStartMs;

  // ── 4. Store in cache (fire-and-forget, skip for previews) ─────
  if (!isPreview) {
    const cacheKey = ttsCacheKey(text, lang);
    adminDb.storage
      .from(TTS_BUCKET)
      .upload(cacheKey, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      })
      .then(({ error: uploadErr }) => {
        if (uploadErr) console.error('[TTS] Cache upload error:', uploadErr.message);
      });
  }

  // ── 5. Log usage ───────────────────────────────────────────────
  logAIUsage({
    userId: authUserId,
    provider,
    endpoint: 'tts',
    model: provider === 'elevenlabs' ? 'eleven_multilingual_v2' : DEFAULT_OPENAI_MODEL,
    characters: text.length,
    durationMs,
    metadata: {
      lang,
      voiceId: provider === 'elevenlabs' ? elVoiceId : oaiVoice,
      cached: false,
    },
  });

  const responseBody = new Uint8Array(audioBuffer);
  return new NextResponse(responseBody, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.length),
      'Cache-Control': `private, max-age=${CACHE_MAX_AGE}`,
      'X-TTS-Source': provider,
    },
  });
}
