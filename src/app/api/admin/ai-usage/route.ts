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
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const d = await res.json();
    return {
      ok: true as const,
      characterCount: d.character_count ?? 0,
      characterLimit: d.character_limit ?? 0,
      remaining: (d.character_limit ?? 0) - (d.character_count ?? 0),
      tier: d.tier ?? 'unknown',
      nextReset: d.next_character_count_reset_unix
        ? new Date(d.next_character_count_reset_unix * 1000).toISOString()
        : null,
    };
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
      providerRes,
      endpointRes,
      dailyRes,
      topUsersRes,
      recentRes,
      totalsRes,
    ] = await Promise.all([
      fetchElevenLabsSubscription(),

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
        openai:    { ok: !!process.env.OPENAI_API_KEY },
        elevenlabs,
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
