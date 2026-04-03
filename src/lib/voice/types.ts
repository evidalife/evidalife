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
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, warm and composed', gender: 'female', accent: 'American', use_case: 'narration' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft, friendly and conversational', gender: 'female', accent: 'American', use_case: 'conversational' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Warm, elegant and expressive', gender: 'female', accent: 'Swedish-English', use_case: 'narration' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Warm, clear and friendly', gender: 'female', accent: 'British', use_case: 'narration' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Articulate, confident and friendly', gender: 'male', accent: 'American', use_case: 'narration' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Friendly, young and versatile', gender: 'male', accent: 'American', use_case: 'conversational' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Deep, authoritative and calm', gender: 'male', accent: 'British', use_case: 'narration' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Warm, mature and composed', gender: 'male', accent: 'British', use_case: 'narration' },
];

// OpenAI TTS voices
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export const OPENAI_VOICES: { value: OpenAIVoice; label: string; gender: string }[] = [
  { value: 'nova', label: 'Nova (warm female)', gender: 'female' },
  { value: 'alloy', label: 'Alloy (neutral)', gender: 'neutral' },
  { value: 'echo', label: 'Echo (male)', gender: 'male' },
  { value: 'fable', label: 'Fable (expressive)', gender: 'neutral' },
  { value: 'onyx', label: 'Onyx (deep male)', gender: 'male' },
  { value: 'shimmer', label: 'Shimmer (bright female)', gender: 'female' },
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
