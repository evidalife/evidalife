import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return null;
  return { user, admin };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

  // Recent briefings with profile name
  const { data: briefings } = await admin
    .from('health_briefings')
    .select('id, user_id, lang, model_used, tokens_used, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  const userIds = [...new Set((briefings ?? []).map(b => b.user_id))];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, first_name, last_name, email').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

  const rows = (briefings ?? []).map(b => ({
    ...b,
    user: profileMap.get(b.user_id) ?? null,
  }));

  // Stats
  const { count: totalCount } = await admin
    .from('health_briefings')
    .select('*', { count: 'exact', head: true });

  const { data: uniqueUsers } = await admin
    .from('health_briefings')
    .select('user_id');

  const uniqueUserCount = new Set((uniqueUsers ?? []).map(r => r.user_id)).size;
  const avgPerUser = uniqueUserCount > 0 ? ((totalCount ?? 0) / uniqueUserCount).toFixed(1) : '0';

  // Lang breakdown
  const langCounts: Record<string, number> = {};
  for (const b of briefings ?? []) {
    langCounts[b.lang] = (langCounts[b.lang] ?? 0) + 1;
  }

  return NextResponse.json({
    briefings: rows,
    stats: {
      total: totalCount ?? 0,
      unique_users: uniqueUserCount,
      avg_per_user: parseFloat(avgPerUser),
      lang_counts: langCounts,
    },
  });
}

// POST — get single briefing with steps (for playback)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data, error } = await admin
    .from('health_briefings')
    .select('id, user_id, lang, steps, model_used, tokens_used, duration_ms, created_at')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE a briefing
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error, count } = await admin.from('health_briefings').delete({ count: 'exact' }).eq('id', id);
  if (error) {
    console.error('[admin/ai-briefings] DELETE error:', error.message, error.code, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  console.log(`[admin/ai-briefings] Deleted briefing ${id}, rows affected: ${count}`);
  return NextResponse.json({ ok: true, deleted: count });
}
