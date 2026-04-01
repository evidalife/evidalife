// ── AI Usage Logger ──────────────────────────────────────────────────────────
// Logs every AI API call to ai_usage_log for cost monitoring and per-user tracking.

import { createAdminClient } from '@/lib/supabase/admin';

export type AIProvider = 'anthropic' | 'openai' | 'elevenlabs';

export type UsageLogEntry = {
  userId?: string | null;
  provider: AIProvider;
  endpoint: string;        // 'briefing' | 'chat' | 'tts' | 'email-assist' | 'research'
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  characters?: number;     // for TTS
  durationMs?: number;
  estimatedCostUsd?: number;
  metadata?: Record<string, unknown>;
};

// ── Cost estimation helpers ─────────────────────────────────────────────────
// Prices per 1M tokens (USD) — update as pricing changes
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6':            { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6':          { input: 3.0,  output: 15.0 },
  'claude-haiku-4-5-20251001':  { input: 0.8,  output: 4.0 },
};

const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':      { input: 2.5,  output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'tts-1':       { input: 15.0, output: 0 },  // $15 per 1M chars
  'tts-1-hd':    { input: 30.0, output: 0 },
};

// ElevenLabs: ~$0.30 per 1K characters (Pro plan)
const ELEVENLABS_COST_PER_1K_CHARS = 0.30;

export function estimateCost(entry: UsageLogEntry): number {
  const { provider, model, inputTokens = 0, outputTokens = 0, characters = 0 } = entry;

  if (provider === 'anthropic' && model) {
    const pricing = ANTHROPIC_PRICING[model];
    if (pricing) {
      return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
    }
  }

  if (provider === 'openai' && model) {
    const pricing = OPENAI_PRICING[model];
    if (pricing) {
      if (model.startsWith('tts')) {
        return (characters * pricing.input) / 1_000_000;
      }
      return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
    }
  }

  if (provider === 'elevenlabs') {
    return (characters / 1000) * ELEVENLABS_COST_PER_1K_CHARS;
  }

  return 0;
}

// ── Main log function ───────────────────────────────────────────────────────
export async function logAIUsage(entry: UsageLogEntry): Promise<void> {
  try {
    const cost = entry.estimatedCostUsd ?? estimateCost(entry);
    const supabase = createAdminClient();

    await supabase.from('ai_usage_log').insert({
      user_id: entry.userId ?? null,
      provider: entry.provider,
      endpoint: entry.endpoint,
      model: entry.model ?? null,
      input_tokens: entry.inputTokens ?? 0,
      output_tokens: entry.outputTokens ?? 0,
      characters: entry.characters ?? 0,
      duration_ms: entry.durationMs ?? null,
      estimated_cost_usd: cost,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    // Never let logging failures break the main flow
    console.error('[ai-usage-log] Failed to log:', err);
  }
}
