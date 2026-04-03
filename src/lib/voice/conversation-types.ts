// ── Voice Conversation Types ────────────────────────────────────────────────
// Types for Phase 9: Live Voice Conversation

export type ConversationMode = 'daily_checkin' | 'coaching' | 'freeform';

export interface VoiceSession {
  id: string;
  userId: string;
  mode: ConversationMode;
  status: 'active' | 'paused' | 'ended';
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  creditsUsed: number;
  voiceMinutesUsed: number;
  turnCount: number;
  lang: string;
}

export interface ConversationTurn {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  durationMs: number;
  timestamp: string;
}

export interface VoiceSessionConfig {
  mode: ConversationMode;
  lang: string;
  /** Max duration in seconds before auto-end */
  maxDurationSeconds: number;
  /** Credits required to start */
  requiredCredits: number;
  /** Voice minutes required */
  requiredVoiceMinutes: number;
}

// Mode configurations with credit/duration limits
export const CONVERSATION_MODES: Record<ConversationMode, {
  label: string;
  description: string;
  icon: string;
  maxDurationSeconds: number;
  creditsPerSession: number;
  voiceMinutesPerSession: number;
  premium: boolean;
}> = {
  daily_checkin: {
    label: 'Daily Check-in',
    description: 'Quick 2-minute health check-in with your AI coach',
    icon: '🌅',
    maxDurationSeconds: 120,
    creditsPerSession: 1,
    voiceMinutesPerSession: 2,
    premium: false,
  },
  coaching: {
    label: 'Voice Coaching',
    description: 'Guided health coaching session about your goals and progress',
    icon: '💬',
    maxDurationSeconds: 600,
    creditsPerSession: 3,
    voiceMinutesPerSession: 10,
    premium: true,
  },
  freeform: {
    label: 'Open Conversation',
    description: 'Ask anything about your health data, get detailed voice explanations',
    icon: '🎙️',
    maxDurationSeconds: 900,
    creditsPerSession: 5,
    voiceMinutesPerSession: 15,
    premium: true,
  },
};

// System prompts for each mode
export const CONVERSATION_SYSTEM_PROMPTS: Record<ConversationMode, string> = {
  daily_checkin: `You are an Evida health coach doing a quick daily check-in. Keep responses SHORT (2-3 sentences max). Be warm, encouraging, and concise.

Your goals:
- Ask how the user is feeling today
- Ask about one healthy habit (sleep, exercise, nutrition)
- Give a brief encouraging note
- End with a positive message

IMPORTANT: This is a voice conversation. Keep responses natural and conversational. Never use markdown, bullet points, or formatting.`,

  coaching: `You are an Evida health coach in a voice coaching session. Be warm, knowledgeable, and conversational. Reference the user's actual health data when available.

Your approach:
- Focus on the user's specific health goals and biomarker data
- Provide evidence-based suggestions
- Keep responses to 3-4 sentences for natural conversation flow
- Ask clarifying questions to understand their needs
- Reference specific biomarkers and trends when relevant

IMPORTANT: This is a live voice conversation. Use natural speech patterns. Never use markdown, lists, or formatting. Speak as you would in a real coaching session.`,

  freeform: `You are an Evida health AI assistant in an open voice conversation. You have access to the user's health data and can explain any biomarker, trend, or health topic in detail.

Your approach:
- Answer questions thoroughly but conversationally
- When discussing biomarkers, explain in plain language first, then provide the numbers
- Offer to go deeper on any topic
- Keep responses under 5 sentences for natural back-and-forth

IMPORTANT: This is a live voice conversation. Use natural, spoken language. Never use markdown, lists, or formatting.`,
};
