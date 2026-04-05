import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLabSession } from '@/lib/lab-auth';

/**
 * GET /api/lab-portal/settlements — lab's own settlement overview
 */
export async function GET() {
  const session = await getLabSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Line items
  const { data: items } = await admin
    .from('lab_settlements')
    .select('id, product_name, gross_amount, commission_rate, lab_payout_amount, currency, status, created_at')
    .eq('lab_partner_id', session.labId)
    .order('created_at', { ascending: false })
    .limit(200);

  const all = items ?? [];
  const pending = all.filter(i => i.status === 'pending' || i.status === 'approved');
  const paid = all.filter(i => i.status === 'paid');

  // Batches (paid settlements)
  const { data: batches } = await admin
    .from('lab_settlement_batches')
    .select('id, batch_number, period_from, period_to, total_lab_payout, item_count, currency, status, paid_at')
    .eq('lab_partner_id', session.labId)
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    summary: {
      pending_payout: pending.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
      total_paid: paid.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
      total_earned: all.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
      pending_count: pending.length,
      total_count: all.length,
      currency: all[0]?.currency ?? 'CHF',
    },
    recent_items: all.slice(0, 20),
    batches: batches ?? [],
  });
}
