import { createAdminClient } from '@/lib/supabase/admin';
import type { VoiceSessionConfig, STTProvider, TTSProvider, OpenAIVoice } from './types';

/**
 * Reads voice configuration from ai_settings table.
 * Used by API routes to determine which STT/TTS providers to use.
 */
export async function getVoiceConfig(): Promise<VoiceSessionConfig> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from('ai_settings')
    .select('key, value')
    .in('key', [
      'tts_provider',
      'stt_provider',
      'elevenlabs_voice_id',
      'openai_tts_voice',
      'voice_mode',
    ]);

  const get = (key: string, fallback: string) => {
    const s = settings?.find(s => s.key === key);
    return (s?.value as string) ?? fallback;
  };

  return {
    mode: get('voice_mode', 'orchestrated') as 'orchestrated' | 'claude_realtime',
    stt: {
      provider: get('stt_provider', 'web_speech_api') as STTProvider,
      lang: 'en-US', // overridden per-request
    },
    tts: {
      provider: get('tts_provider', 'elevenlabs') as TTSProvider,
      elevenlabs_voice_id: get('elevenlabs_voice_id', '21m00Tcm4TlvDq8ikWAM'),
      elevenlabs_model: 'eleven_multilingual_v2',
      openai_voice: get('openai_tts_voice', 'nova') as OpenAIVoice,
      openai_model: 'tts-1',
    },
  };
}
