import { createAdminClient } from '@/lib/supabase/admin';
import type { VoiceSessionConfig, STTProvider, TTSProvider, OpenAIVoice } from './types';

// Default per-role voice mappings
const DEFAULT_ROLE_VOICES_EL: Record<string, string> = {
  briefing: '21m00Tcm4TlvDq8ikWAM', // Rachel
  coach: 'EXAVITQu4vr4xnSDxMaL',    // Sarah
  research: 'onwK4e9ZLuTAKqWW03F9',  // Daniel
};
const DEFAULT_ROLE_VOICES_OAI: Record<string, string> = {
  briefing: 'nova',
  coach: 'shimmer',
  research: 'echo',
};

/**
 * Reads voice configuration from ai_settings table.
 * Optionally accepts a role ('briefing' | 'coach' | 'research') to
 * return the specific voice assigned to that feature.
 */
export async function getVoiceConfig(role?: string): Promise<VoiceSessionConfig> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from('ai_settings')
    .select('key, value')
    .in('key', [
      'tts_provider',
      'stt_provider',
      'elevenlabs_voice_id',
      'openai_tts_voice',
      'voice_roles_elevenlabs',
      'voice_roles_openai',
      'voice_mode',
    ]);

  const get = (key: string, fallback: string) => {
    const s = settings?.find(s => s.key === key);
    return (s?.value as string) ?? fallback;
  };

  const getJson = <T>(key: string, fallback: T): T => {
    const s = settings?.find(s => s.key === key);
    if (!s?.value) return fallback;
    if (typeof s.value === 'object') return s.value as T;
    try { return JSON.parse(s.value as string) as T; } catch { return fallback; }
  };

  // Resolve voice for the given role, falling back to the global default
  const roleVoicesEL = getJson<Record<string, string>>('voice_roles_elevenlabs', DEFAULT_ROLE_VOICES_EL);
  const roleVoicesOAI = getJson<Record<string, string>>('voice_roles_openai', DEFAULT_ROLE_VOICES_OAI);

  const resolvedELVoice = role && roleVoicesEL[role]
    ? roleVoicesEL[role]
    : get('elevenlabs_voice_id', '21m00Tcm4TlvDq8ikWAM');

  const resolvedOAIVoice = role && roleVoicesOAI[role]
    ? roleVoicesOAI[role]
    : get('openai_tts_voice', 'nova');

  return {
    mode: get('voice_mode', 'orchestrated') as 'orchestrated' | 'claude_realtime',
    stt: {
      provider: get('stt_provider', 'web_speech_api') as STTProvider,
      lang: 'en-US', // overridden per-request
    },
    tts: {
      provider: get('tts_provider', 'elevenlabs') as TTSProvider,
      elevenlabs_voice_id: resolvedELVoice,
      elevenlabs_model: 'eleven_multilingual_v2',
      openai_voice: resolvedOAIVoice as OpenAIVoice,
      openai_model: 'tts-1',
    },
  };
}
