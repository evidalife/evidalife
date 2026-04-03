import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVoiceConfig } from '@/lib/voice/get-voice-config';
import { logAIUsage } from '@/lib/ai/usage-logger';

export const maxDuration = 15;

// ── POST: Transcribe audio via Deepgram ─────────────────────────────────────
// Client sends audio as base64; server calls Deepgram and returns transcript.
// Falls back gracefully if Deepgram isn't configured.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramKey) {
    return NextResponse.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
  }

  let body: {
    audioBase64: string;
    lang?: string;
    mimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { audioBase64, lang = 'en', mimeType = 'audio/webm' } = body;
  if (!audioBase64) {
    return NextResponse.json({ error: 'audioBase64 is required' }, { status: 400 });
  }

  // Map our lang codes to Deepgram BCP-47
  const LANG_MAP: Record<string, string> = {
    en: 'en-US', de: 'de', fr: 'fr', es: 'es', it: 'it',
  };
  const deepgramLang = LANG_MAP[lang] || lang;

  // Decode base64 → Buffer
  const audioBuffer = Buffer.from(audioBase64, 'base64');
  const audioSizeBytes = audioBuffer.length;

  // Determine encoding from mimeType
  const encodingMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/wav': 'wav',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
  };
  // Normalize mimeType for lookup
  const normalizedMime = mimeType.toLowerCase().replace(/\s/g, '');
  const encoding = encodingMap[normalizedMime] || 'webm';

  const startMs = Date.now();

  try {
    // Call Deepgram Nova-2 pre-recorded transcription API
    const dgRes = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-2&language=${deepgramLang}&smart_format=true&punctuate=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramKey}`,
          'Content-Type': normalizedMime || 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!dgRes.ok) {
      const errText = await dgRes.text();
      console.error('[speech-to-text] Deepgram error:', dgRes.status, errText);
      return NextResponse.json(
        { error: 'Deepgram transcription failed', detail: errText },
        { status: 502 },
      );
    }

    const dgData = await dgRes.json();
    const channel = dgData?.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];
    const transcript = alternative?.transcript || '';
    const confidence = alternative?.confidence ?? null;
    const durationSeconds = dgData?.metadata?.duration ?? null;
    const durationMs = durationSeconds ? Math.round(durationSeconds * 1000) : null;

    const totalMs = Date.now() - startMs;

    // Log usage for cost tracking
    logAIUsage({
      userId: user.id,
      provider: 'deepgram',
      endpoint: 'speech-to-text',
      model: 'nova-2',
      durationMs: durationMs ?? 0,
      metadata: {
        lang: deepgramLang,
        confidence,
        audioSizeBytes,
        encoding,
        latencyMs: totalMs,
      },
    });

    return NextResponse.json({
      transcript,
      confidence,
      durationMs,
      provider: 'deepgram',
    });
  } catch (e) {
    console.error('[speech-to-text] Error:', e);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}

// ── GET: Return current STT provider config ─────────────────────────────────
// Client calls this on mount to know whether to use Web Speech API or Deepgram.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await getVoiceConfig();
    return NextResponse.json({
      sttProvider: config.stt.provider,
      deepgramAvailable: !!process.env.DEEPGRAM_API_KEY,
    });
  } catch {
    return NextResponse.json({ sttProvider: 'web_speech_api', deepgramAvailable: false });
  }
}
