// Voice provider abstraction layer
// Pluggable backends for STT and TTS — prepared for future Claude Realtime Voice API

export type STTProvider = 'web_speech_api' | 'deepgram';
export type TTSProvider = 'elevenlabs' | 'openai' | 'browser';
export type VoiceProvider = 'orchestrated' | 'claude_realtime'; // future: native voice-to-voice

// ElevenLabs voice catalog (popular voices)
export interface ElevenLabsVoice {
  id: string;
  name: string;
  description: string;
  preview_url?: string;
  gender: 'female' | 'male';
  accent: string;
  use_case: string;
}

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, warm and composed', gender: 'female', accent: 'American', use_case: 'narration', preview_url: 'https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM/preview' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft, friendly and conversational', gender: 'female', accent: 'American', use_case: 'conversational', preview_url: 'https://api.elevenlabs.io/v1/voices/EXAVITQu4vr4xnSDxMaL/preview' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Warm, elegant and expressive', gender: 'female', accent: 'Swedish-English', use_case: 'narration', preview_url: 'https://api.elevenlabs.io/v1/voices/XB0fDUnXU5powFXDhCwa/preview' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Warm, clear and friendly', gender: 'female', accent: 'British', use_case: 'narration', preview_url: 'https://api.elevenlabs.io/v1/voices/pFZP5JQG7iQjIQuC4Bku/preview' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Articulate, confident and friendly', gender: 'male', accent: 'American', use_case: 'narration', preview_url: 'https://api.elevenlabs.io/v1/voices/TX3LPaxmHKxFdv7VOQHJ/preview' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Friendly, young and versatile', gender: 'male', accent: 'American', use_case: 'conversational', preview_url: 'https://api.elevenlabs.io/v1/voices/bIHbv24MWmeRgasZH58o/preview' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Deep, authoritative and calm', gender: 'male', accent: 'British', use_case: 'narration', preview_url: 'https://api.elevenlabs.io/v1/voices/onwK4e9ZLuTAKqWW03F9/preview' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm, mature and composed', gender: 'male', accent: 'British', use_case: 'narration', preview_url: 'https://api.elevenlabs.io/v1/voices/JBFqnCBsd6RMkjVDRZzb/preview' },
];

// OpenAI TTS voices
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface OpenAIVoiceInfo {
  value: OpenAIVoice;
  name: string;
  description: string;
  gender: 'female' | 'male' | 'neutral';
  use_case: string;
}

export const OPENAI_VOICES: OpenAIVoiceInfo[] = [
  { value: 'nova', name: 'Nova', description: 'Warm, friendly and clear', gender: 'female', use_case: 'conversational' },
  { value: 'shimmer', name: 'Shimmer', description: 'Bright, expressive and engaging', gender: 'female', use_case: 'narration' },
  { value: 'alloy', name: 'Alloy', description: 'Balanced, neutral and versatile', gender: 'neutral', use_case: 'general' },
  { value: 'fable', name: 'Fable', description: 'Expressive and animated', gender: 'neutral', use_case: 'storytelling' },
  { value: 'echo', name: 'Echo', description: 'Smooth, steady and composed', gender: 'male', use_case: 'narration' },
  { value: 'onyx', name: 'Onyx', description: 'Deep, authoritative and rich', gender: 'male', use_case: 'narration' },
];

// Voice roles — different AI features can use different voices
export type VoiceRole = 'briefing' | 'coach' | 'research';

export const VOICE_ROLES: { key: VoiceRole; label: string; description: string; icon: string }[] = [
  { key: 'briefing', label: 'Health Briefing', description: 'Narrates the lab results walkthrough — should sound professional and reassuring', icon: '🎙️' },
  { key: 'coach', label: 'Daily Coach', description: 'Daily check-ins, WFPB coaching, lifestyle tips — should sound warm and friendly', icon: '💬' },
  { key: 'research', label: 'Research Agent', description: 'Study summaries and scientific findings — should sound clear and knowledgeable', icon: '🔬' },
];

// STT interface — what any STT provider must implement
export interface STTConfig {
  provider: STTProvider;
  lang: string; // BCP-47
  deepgramApiKey?: string; // only needed server-side for Deepgram
}

// TTS interface — configuration for any TTS provider
export interface TTSConfig {
  provider: TTSProvider;
  backup_provider?: TTSProvider;
  elevenlabs_voice_id?: string;
  elevenlabs_model?: string;
  openai_voice?: OpenAIVoice;
  openai_model?: string;
}

// Voice session config combining STT + TTS
export interface VoiceSessionConfig {
  mode: VoiceProvider;
  stt: STTConfig;
  tts: TTSConfig;
  // Future: claude_realtime config
  claude_realtime?: {
    model?: string;
    voice?: string;
  };
}

// Credit costs per feature (in credits)
export const VOICE_CREDIT_COSTS = {
  voice_minute: 1,          // 1 credit per minute of voice conversation
  text_message: 0,          // free for all tiers (or 0.1 for metered free)
  briefing_generation: 5,   // 5 credits to generate a briefing
  briefing_replay: 0,       // free (cached)
  pdf_export: 2,            // 2 credits per PDF
  research_query: 1,        // 1 credit per research query
} as const;
