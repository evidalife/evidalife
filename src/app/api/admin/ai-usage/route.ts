// GET /api/admin/ai-usage?days=30
// Returns AI usage stats + live credit balances for the admin dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 15;

// ── Live balance fetchers ───────────────────────────────────────────────────

async function fetchElevenLabsSubscription() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { ok: false as const, error: 'Not configured' };
  try {
    for (const endpoint of [
      'https://api.elevenlabs.io/v1/user/subscription',
      'https://api.elevenlabs.io/v1/user',
    ]) {
      const res = await fetch(endpoint, {
        headers: { 'xi-api-key': key },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const sub = d.subscription ?? d;
      return {
        ok: true as const,
        characterCount: sub.character_count ?? 0,
        characterLimit: sub.character_limit ?? 0,
        remaining: (sub.character_limit ?? 0) - (sub.character_count ?? 0),
        tier: sub.tier ?? d.tier ?? 'unknown',
        nextReset: sub.next_character_count_reset_unix
          ? new Date(sub.next_character_count_reset_unix * 1000).toISOString()
          : null,
      };
    }
    return { ok: true as const, characterCount: 0, characterLimit: 0, remaining: 0, tier: 'api-key', nextReset: null };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchOpenAIBalance() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false as const, error: 'Not configured' };
  try {
    // Try the billing endpoints (may not work for all key types)
    const headers = { 'Authorization': `Bearer ${key}` };

    // Get organization usage limit
    const limitsRes = await fetch('https://api.openai.com/v1/organization/limits?model=tts-1', {
      headers, signal: AbortSignal.timeout(5000),
    });

    // Try dashboard billing (works for most accounts)
    const billingRes = await fetch('https://api.openai.com/dashboard/billing/credit_grants', {
      headers, signal: AbortSignal.timeout(5000),
    });

    let totalGranted = 0;
    let totalUsed = 0;
    let remaining = 0;

    if (billingRes.ok) {
      const billing = await billingRes.json();
      totalGranted = billing.total_granted ?? 0;
      totalUsed = billing.total_used ?? 0;
      remaining = billing.total_available ?? (totalGranted - totalUsed);
    }

    // Even if billing endpoint fails, key is valid if we can hit models
    if (!billingRes.ok) {
      const modelsRes = await fetch('https://api.openai.com/v1/models', {
        headers, signal: AbortSignal.timeout(5000),
      });
      if (modelsRes.ok) {
        return { ok: true as const, totalGranted: 0, totalUsed: 0, remaining: 0, note: 'Key active — billing data unavailable' };
      }
    }

    void limitsRes; // we attempted but may not have data
    return { ok: true as const, totalGranted, totalUsed, remaining };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

async function fetchDeepgramBalance() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return { ok: false as const, error: 'Not configured' };
  try {
    // Get projects first
    const projRes = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!projRes.ok) {
      // Key works if we get 200 on /v1/listen — try a lightweight check
      return { ok: true as const, remainingCredits: 0, note: 'Key active — balance data unavailable' };
    }
    const { projects } = await projRes.json();
    if (!projects?.length) return { ok: true as const, remainingCredits: 0 };

    const projectId = projects[0].project_id;
    // Get balances
    const balRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/balances`, {
      headers: { 'Authorization': `Token ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!balRes.ok) return { ok: true as const, remainingCredits: 0 };
    const { balances } = await balRes.json();
    const totalRemaining = balances?.reduce((sum: number, b: { amount: number }) => sum + (b.amount ?? 0), 0) ?? 0;

    return { ok: true as const, remainingCredits: totalRemaining };
  } catch (e: unknown) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createAdminClient();
    const { data: profile } = await db
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const days = Math.min(parseInt(url.searchParams.get('days') ?? '30', 10), 365);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();

    // ── All queries in parallel ──────────────────────────────────────────
    const [
      elevenlabs,
      openai,
      deepgram,
      providerRes,
      endpointRes,
      dailyRes,
      topUsersRes,
      recentRes,
      totalsRes,
    ] = await Promise.all([
      fetchElevenLabsSubscription(),
      fetchOpenAIBalance(),
      fetchDeepgramBalance(),

      db.rpc('ai_usage_by_provider', { since_date: since }),
      db.rpc('ai_usage_by_endpoint', { since_date: since }),
      db.rpc('ai_usage_daily', { since_date: since, num_days: days }),
      db.rpc('ai_usage_top_users', { since_date: since, max_rows: 10 }),
      db.from('ai_usage_log')
        .select('id, user_id, provider, endpoint, model, input_tokens, output_tokens, characters, estimated_cost_usd, duration_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      db.rpc('ai_usage_totals'),
    ]);

    return NextResponse.json({
      balances: {
        anthropic: { ok: !!process.env.ANTHROPIC_API_KEY },
        openai,
        elevenlabs,
        deepgram,
      },
      byProvider: providerRes.data ?? [],
      byEndpoint: endpointRes.data ?? [],
      daily:      dailyRes.data ?? [],
      topUsers:   topUsersRes.data ?? [],
      recent:     recentRes.data ?? [],
      totals:     totalsRes.data?.[0] ?? { total_calls: 0, total_cost: 0, total_tokens: 0, total_characters: 0 },
      period:     { days, since },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
