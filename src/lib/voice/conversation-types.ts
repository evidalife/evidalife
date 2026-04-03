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

Your goals for this check-in:
1. Briefly acknowledge yesterday's Daily Dozen progress (reference it if the context data shows relevant completions or gaps)
2. Mention today's assigned lesson by name and explain briefly why it was picked for them
3. Set one clear focus goal for the day
4. If they're close to unlocking a new phase (like 21 Tweaks or Anti-Aging), mention it encouragingly
5. If biomarkers need attention, tie today's lesson to that specific health marker

Keep the entire check-in under 2 minutes. Be warm, personal, and motivating.

IMPORTANT: This is a voice conversation. Keep responses natural and conversational. Never use markdown, bullet points, or formatting. Speak as you would with a friend.`,

  coaching: `You are an Evida health coach in a voice coaching session. Be warm, knowledgeable, and conversational. Reference the user's actual health data and journey progress when available.

Your approach:
- Reference their current journey phase and lesson history to show you know them
- If they ask about food or nutrition, reference relevant lessons they've completed or recommend lessons they should do
- Focus on their specific health goals and biomarker data
- Provide evidence-based suggestions grounded in their data
- Keep responses to 3-4 sentences for natural conversation flow
- If their streak qualifies them to unlock the next phase, you can recommend unlocking it
- Ask clarifying questions to understand their needs

IMPORTANT: This is a live voice conversation. Use natural speech patterns. Never use markdown, lists, or formatting. Speak as you would in a real coaching session.`,

  freeform: `You are an Evida health AI assistant in an open voice conversation. You have access to the user's health data and can explain any biomarker, trend, or health topic in detail.

Your approach:
- Answer questions thoroughly but conversationally
- When discussing biomarkers, explain in plain language first, then provide the numbers
- Offer to go deeper on any topic
- Keep responses under 5 sentences for natural back-and-forth

IMPORTANT: This is a live voice conversation. Use natural, spoken language. Never use markdown, lists, or formatting.`,
};
