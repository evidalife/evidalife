// ── AI Usage Logger ──────────────────────────────────────────────────────────
// Logs every AI API call to ai_usage_log for cost monitoring and per-user tracking.

import { createAdminClient } from '@/lib/supabase/admin';

export type AIProvider = 'anthropic' | 'openai' | 'elevenlabs' | 'deepgram';

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

// ElevenLabs: subscription-based pricing. Characters included in plan are "free",
// so we estimate marginal cost only. Starter ($5/30K) ≈ $0.167/1K chars effective,
// Creator ($22/100K) ≈ $0.22/1K. Overage on Creator+ is $0.30/1K.
// We use the effective Starter rate for cost estimation since included chars have cost.
const ELEVENLABS_COST_PER_1K_CHARS = 0.18; // ~$5.40 per 30K (Starter effective rate)

// Deepgram: ~$0.0043 per minute (Nova-2 Pay-as-you-go)
// We track in seconds via durationMs, convert to minutes for cost
const DEEPGRAM_COST_PER_MINUTE = 0.0043;

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

  if (provider === 'deepgram') {
    // Cost based on audio duration (durationMs field)
    const { durationMs = 0 } = entry;
    const minutes = (durationMs || 0) / 60_000;
    return minutes * DEEPGRAM_COST_PER_MINUTE;
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
