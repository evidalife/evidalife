import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { addBonusCredits, resetMonthlyCredits } from '@/lib/credits/credit-manager';

async function requireAdmin() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return null;
  return { user, admin };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { action: string; user_id: string; amount?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, user_id, amount, reason } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  switch (action) {
    case 'add_bonus': {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Positive amount required' }, { status: 400 });
      }
      const ok = await addBonusCredits(user_id, amount, reason || 'Admin bonus');
      if (!ok) return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    case 'reset': {
      const ok = await resetMonthlyCredits(user_id);
      if (!ok) return NextResponse.json({ error: 'Failed to reset credits' }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
