// ── Credit Manager ──────────────────────────────────────────────────────────
// Server-side credit tracking and enforcement.
// All write operations use the admin client (bypasses RLS).

import { createAdminClient } from '@/lib/supabase/admin';

export type CreditFeature =
  | 'voice_conversation'
  | 'briefing_generation'
  | 'pdf_export'
  | 'research_query'
  | 'text_chat'
  | 'daily_checkin'
  | 'subscription_reset'
  | 'admin_bonus'
  | 'purchase';

// Credit costs per feature
const CREDIT_COSTS: Record<string, number> = {
  voice_conversation: 1,     // 1 credit per minute
  briefing_generation: 5,
  pdf_export: 2,
  research_query: 1,
  text_chat: 0,              // free
  daily_checkin: 0,           // free
};

export interface UserCreditBalance {
  totalCredits: number;
  usedCredits: number;
  bonusCredits: number;
  remainingCredits: number;
  voiceMinutesTotal: number;
  voiceMinutesUsed: number;
  voiceMinutesRemaining: number;
  resetDate: string;
  planSlug: string;
  planName: string;
}

export interface CreditCheckResult {
  allowed: boolean;
  remainingCredits: number;
  requiredCredits: number;
  reason?: string;
}

/**
 * Get a user's current credit balance with plan info
 */
export async function getUserCreditBalance(userId: string): Promise<UserCreditBalance | null> {
  const admin = createAdminClient();

  // Get credits
  const { data: credits } = await admin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get subscription with plan
  const { data: subscription } = await admin
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!credits) {
    // User has no credits yet — initialize with free plan defaults
    const initialized = await initializeUserCredits(userId);
    if (!initialized) return null;
    return getUserCreditBalance(userId); // recurse once
  }

  const plan = (subscription as any)?.subscription_plans;

  return {
    totalCredits: credits.total_credits,
    usedCredits: credits.used_credits,
    bonusCredits: credits.bonus_credits,
    remainingCredits: (credits.total_credits + credits.bonus_credits) - credits.used_credits,
    voiceMinutesTotal: credits.voice_minutes_total,
    voiceMinutesUsed: parseFloat(credits.voice_minutes_used) || 0,
    voiceMinutesRemaining: credits.voice_minutes_total - (parseFloat(credits.voice_minutes_used) || 0),
    resetDate: credits.reset_date,
    planSlug: plan?.slug ?? 'free',
    planName: plan?.name ?? 'Free',
  };
}

/**
 * Initialize credits for a new user (assigns free plan)
 */
export async function initializeUserCredits(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  // Get free plan
  const { data: freePlan } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('slug', 'free')
    .single();

  if (!freePlan) {
    console.error('[credits] Free plan not found');
    return false;
  }

  // Create subscription
  const { error: subError } = await admin
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      plan_id: freePlan.id,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'user_id' });

  if (subError) {
    console.error('[credits] Failed to create subscription:', subError.message);
    return false;
  }

  // Create credit balance
  const { error: credError } = await admin
    .from('user_credits')
    .upsert({
      user_id: userId,
      total_credits: freePlan.monthly_credits,
      used_credits: 0,
      bonus_credits: 0,
      voice_minutes_total: freePlan.voice_minutes_per_month || 0,
      voice_minutes_used: 0,
      reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_reset_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (credError) {
    console.error('[credits] Failed to create credits:', credError.message);
    return false;
  }

  // Log the initial credit grant
  await logCreditTransaction(userId, 'credit', freePlan.monthly_credits, freePlan.monthly_credits, 'subscription_reset', 'Initial free plan credit grant');

  return true;
}

/**
 * Check if a user is an admin (admins bypass all credit limits)
 */
async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();
  return !!data?.is_admin;
}

/**
 * Check if user has enough credits for a feature (does NOT debit)
 * Admins always pass — they are exempt from credit limits.
 */
export async function checkCredits(userId: string, feature: CreditFeature, amount?: number): Promise<CreditCheckResult> {
  // Admins bypass all credit checks
  if (await isAdmin(userId)) {
    return { allowed: true, remainingCredits: Infinity, requiredCredits: 0 };
  }

  const balance = await getUserCreditBalance(userId);
  if (!balance) {
    return { allowed: false, remainingCredits: 0, requiredCredits: 0, reason: 'No credit balance found' };
  }

  const cost = amount ?? CREDIT_COSTS[feature] ?? 0;

  // Free features always allowed
  if (cost === 0) {
    return { allowed: true, remainingCredits: balance.remainingCredits, requiredCredits: 0 };
  }

  // Voice minutes check
  if (feature === 'voice_conversation') {
    if (balance.voiceMinutesRemaining <= 0) {
      return { allowed: false, remainingCredits: balance.remainingCredits, requiredCredits: cost, reason: 'No voice minutes remaining' };
    }
  }

  // General credit check
  if (balance.remainingCredits < cost) {
    return { allowed: false, remainingCredits: balance.remainingCredits, requiredCredits: cost, reason: 'Insufficient credits' };
  }

  return { allowed: true, remainingCredits: balance.remainingCredits, requiredCredits: cost };
}

/**
 * Debit credits for a feature usage
 */
export async function debitCredits(
  userId: string,
  feature: CreditFeature,
  amount?: number,
  description?: string,
  usageLogId?: string,
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const cost = amount ?? CREDIT_COSTS[feature] ?? 0;

  // Admins are exempt — no debit
  if (await isAdmin(userId)) {
    return { success: true, remaining: Infinity };
  }

  // Free features — no debit needed
  if (cost === 0) {
    const balance = await getUserCreditBalance(userId);
    return { success: true, remaining: balance?.remainingCredits ?? 0 };
  }

  const admin = createAdminClient();

  // Atomic update
  const { data: credits, error } = await admin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !credits) {
    return { success: false, remaining: 0, error: 'Credit record not found' };
  }

  const remaining = (credits.total_credits + credits.bonus_credits) - credits.used_credits;
  if (remaining < cost) {
    return { success: false, remaining, error: 'Insufficient credits' };
  }

  const newUsed = credits.used_credits + cost;
  const { error: updateError } = await admin
    .from('user_credits')
    .update({ used_credits: newUsed, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (updateError) {
    return { success: false, remaining, error: updateError.message };
  }

  const balanceAfter = (credits.total_credits + credits.bonus_credits) - newUsed;

  // Log transaction
  await logCreditTransaction(
    userId,
    'debit',
    -cost,
    balanceAfter,
    feature,
    description ?? `Used ${cost} credit(s) for ${feature}`,
    usageLogId,
  );

  return { success: true, remaining: balanceAfter };
}

/**
 * Add voice minutes usage
 */
export async function debitVoiceMinutes(userId: string, minutes: number): Promise<boolean> {
  const admin = createAdminClient();

  const { data: credits } = await admin
    .from('user_credits')
    .select('voice_minutes_used, voice_minutes_total')
    .eq('user_id', userId)
    .single();

  if (!credits) return false;

  const newUsed = parseFloat(String(credits.voice_minutes_used)) + minutes;

  const { error } = await admin
    .from('user_credits')
    .update({ voice_minutes_used: newUsed, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  return !error;
}

/**
 * Add bonus credits (admin gift or purchase)
 */
export async function addBonusCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: credits } = await admin
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!credits) return false;

  const newBonus = credits.bonus_credits + amount;
  const { error } = await admin
    .from('user_credits')
    .update({ bonus_credits: newBonus, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) return false;

  const balanceAfter = (credits.total_credits + newBonus) - credits.used_credits;
  await logCreditTransaction(userId, 'bonus', amount, balanceAfter, 'admin_bonus', reason);

  return true;
}

/**
 * Reset credits for a new billing cycle
 */
export async function resetMonthlyCredits(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  // Get current plan
  const { data: subscription } = await admin
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const plan = (subscription as any)?.subscription_plans;
  if (!plan) return false;

  const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from('user_credits')
    .update({
      total_credits: plan.monthly_credits,
      used_credits: 0,
      // bonus_credits carry over
      voice_minutes_total: plan.voice_minutes_per_month || 0,
      voice_minutes_used: 0,
      reset_date: nextReset,
      last_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) return false;

  await logCreditTransaction(userId, 'reset', plan.monthly_credits, plan.monthly_credits, 'subscription_reset', `Monthly reset — ${plan.name} plan`);

  return true;
}

/**
 * Log a credit transaction
 */
async function logCreditTransaction(
  userId: string,
  type: 'debit' | 'credit' | 'reset' | 'bonus' | 'refund',
  amount: number,
  balanceAfter: number,
  feature: string,
  description?: string,
  usageLogId?: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('credit_transactions').insert({
      user_id: userId,
      type,
      amount,
      balance_after: balanceAfter,
      feature,
      description: description ?? null,
      usage_log_id: usageLogId ?? null,
    });
  } catch (err) {
    console.error('[credits] Failed to log transaction:', err);
  }
}
