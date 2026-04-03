import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAIUsage } from '@/lib/ai/usage-logger';
import { buildCoachContext } from '@/lib/ai/coach-context';
import { getVoiceConfig } from '@/lib/voice/get-voice-config';
import { CONVERSATION_SYSTEM_PROMPTS, type ConversationMode } from '@/lib/voice/conversation-types';
import { TTS_BUCKET, ttsCacheKey, registerTTSCacheFile } from '@/lib/tts-cache';

export const maxDuration = 30;

// ── POST: Handle a single voice conversation turn ────────────────────────
// Receives user text → generates AI text response → returns text + TTS audio
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: {
    sessionId: string;
    userText: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    lang?: string;
    mode?: ConversationMode;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { sessionId, userText, history = [], lang = 'en', mode = 'daily_checkin' } = body;
  if (!userText?.trim()) {
    return new Response(JSON.stringify({ error: 'userText is required' }), { status: 400 });
  }

  const adminDb = createAdminClient();

  // ── Verify session is active ──────────────────────────────────────
  const { data: session } = await adminDb
    .from('voice_sessions')
    .select('id, status, mode, started_at, max_duration_seconds')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session || session.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Session not found or not active' }), { status: 404 });
  }

  // Check session hasn't exceeded max duration
  const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000;
  if (elapsed > session.max_duration_seconds) {
    // Auto-end session
    await adminDb.from('voice_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId);
    return new Response(JSON.stringify({ error: 'Session time limit reached', elapsed: Math.round(elapsed) }), { status: 410 });
  }

  // ── Build system prompt with context ──────────────────────────────
  const LANG_NAMES: Record<string, string> = {
    en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  };

  const sessionMode = (session.mode || mode) as ConversationMode;
  let systemPrompt = CONVERSATION_SYSTEM_PROMPTS[sessionMode] || CONVERSATION_SYSTEM_PROMPTS.daily_checkin;

  // Add language instruction
  systemPrompt += `\n\nRespond in ${LANG_NAMES[lang] || 'English'}.`;

  // Add coach context for coaching/freeform modes
  if (sessionMode === 'coaching' || sessionMode === 'freeform') {
    try {
      const coachData = await buildCoachContext(user.id, lang);
      if (coachData) {
        systemPrompt += `\n\n<user_health_data>\n${coachData}\n</user_health_data>`;
      }
    } catch (e) {
      console.error('[voice-turn] Failed to build coach context:', e);
    }
  }

  // Add time context
  const timeInfo = `Current time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. Elapsed in session: ${Math.round(elapsed)} seconds.`;
  systemPrompt += `\n\n${timeInfo}`;

  // ── Load AI model setting ─────────────────────────────────────────
  const { data: settingsRows } = await adminDb
    .from('ai_settings')
    .select('key, value')
    .in('key', ['chat_model']);

  const settingsMap = new Map((settingsRows ?? []).map(r => [r.key, r.value]));
  const chatModel = (settingsMap.get('chat_model') as string) || 'claude-haiku-4-5-20251001';

  // ── Generate AI response ──────────────────────────────────────────
  const startMs = Date.now();
  const anthropic = new Anthropic({ apiKey });

  // Build message history
  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userText },
  ];

  let assistantText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const response = await anthropic.messages.create({
      model: chatModel,
      max_tokens: 300, // Short responses for voice
      system: systemPrompt,
      messages,
    });

    assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;
  } catch (e) {
    console.error('[voice-turn] Anthropic error:', e);
    return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: 502 });
  }

  const llmDurationMs = Date.now() - startMs;

  // ── Generate TTS audio ────────────────────────────────────────────
  let audioBase64: string | null = null;
  let ttsProvider: string = 'none';

  try {
    const voiceConfig = await getVoiceConfig('coach');
    const provider = voiceConfig?.tts.provider || 'elevenlabs';

    if (provider === 'elevenlabs' && process.env.ELEVENLABS_API_KEY) {
      const voiceId = voiceConfig?.tts.elevenlabs_voice_id || '21m00Tcm4TlvDq8ikWAM';
      const ttsRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: assistantText,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
          }),
        }
      );
      if (ttsRes.ok) {
        audioBase64 = Buffer.from(await ttsRes.arrayBuffer()).toString('base64');
        ttsProvider = 'elevenlabs';
      }
    }

    // Fallback to OpenAI TTS
    if (!audioBase64 && process.env.OPENAI_API_KEY) {
      const oaiVoice = voiceConfig?.tts.openai_voice || 'nova';
      const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: assistantText,
          voice: oaiVoice,
          response_format: 'mp3',
          speed: 0.95,
        }),
      });
      if (ttsRes.ok) {
        audioBase64 = Buffer.from(await ttsRes.arrayBuffer()).toString('base64');
        ttsProvider = 'openai';
      }
    }
  } catch (e) {
    console.error('[voice-turn] TTS error:', e);
    // Non-fatal: return text without audio
  }

  // ── Cache voice-turn TTS + register in tracking table ─────────────
  if (audioBase64) {
    const cacheKey = ttsCacheKey(assistantText, lang);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    adminDb.storage
      .from(TTS_BUCKET)
      .upload(cacheKey, audioBuffer, { contentType: 'audio/mpeg', upsert: true })
      .then(({ error: uploadErr }) => {
        if (uploadErr) console.error('[voice-turn] TTS cache upload error:', uploadErr.message);
        registerTTSCacheFile({
          userId: user.id,
          storagePath: cacheKey,
          lang,
          source: 'voice_turn',
          sizeBytes: audioBuffer.length,
        });
      });
  }

  // ── Log usage ─────────────────────────────────────────────────────
  logAIUsage({
    userId: user.id,
    provider: 'anthropic',
    endpoint: 'voice-turn',
    model: chatModel,
    inputTokens,
    outputTokens,
    durationMs: llmDurationMs,
    metadata: {
      sessionId,
      mode: sessionMode,
      ttsProvider,
      ttsChars: assistantText.length,
    },
  });

  // Update session turn count (fire-and-forget)
  const { error: rpcErr } = await adminDb.rpc('increment_voice_turn_count', { session_id: sessionId });
  if (rpcErr) {
    // Fallback: manual update if RPC doesn't exist yet
    await adminDb
      .from('voice_sessions')
      .update({ turn_count: ((session as Record<string, number>).turn_count ?? 0) + 1 })
      .eq('id', sessionId);
  }

  return new Response(JSON.stringify({
    text: assistantText,
    audioBase64,
    ttsProvider,
    durationMs: Date.now() - startMs,
    elapsed: Math.round(elapsed),
    maxDuration: session.max_duration_seconds,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
