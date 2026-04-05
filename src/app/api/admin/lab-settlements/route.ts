import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET  /api/admin/lab-settlements?labId=...          — settlement summary + line items
 * POST /api/admin/lab-settlements                    — create a settlement batch (mark items as paid)
 */

export async function GET(req: NextRequest) {
  const labId = req.nextUrl.searchParams.get('labId');
  if (!labId) return NextResponse.json({ error: 'Missing labId' }, { status: 400 });

  const admin = createAdminClient();

  // 1. Get all settlement line items for this lab
  const { data: items } = await admin
    .from('lab_settlements')
    .select(`
      id, product_name, gross_amount, commission_rate,
      lab_payout_amount, evida_revenue, currency, status, batch_id,
      created_at, notes,
      order_vouchers!inner(voucher_code, redeemed_at),
      orders!inner(order_number)
    `)
    .eq('lab_partner_id', labId)
    .order('created_at', { ascending: false });

  // 2. Compute aggregates
  const allItems = items ?? [];
  const pending = allItems.filter(i => i.status === 'pending' || i.status === 'approved');
  const paid = allItems.filter(i => i.status === 'paid');

  const summary = {
    total_all_time_gross: allItems.reduce((s, i) => s + Number(i.gross_amount), 0),
    total_all_time_lab_payout: allItems.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
    total_all_time_evida_revenue: allItems.reduce((s, i) => s + Number(i.evida_revenue), 0),
    total_pending_payout: pending.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
    total_paid_out: paid.reduce((s, i) => s + Number(i.lab_payout_amount), 0),
    pending_count: pending.length,
    paid_count: paid.length,
    total_count: allItems.length,
  };

  // 3. Get settlement batches
  const { data: batches } = await admin
    .from('lab_settlement_batches')
    .select('*')
    .eq('lab_partner_id', labId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ summary, items: allItems, batches: batches ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { labId, itemIds, paymentReference, notes } = body;

  if (!labId || !itemIds?.length) {
    return NextResponse.json({ error: 'Missing labId or itemIds' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Get pending items for this lab
  const { data: items } = await admin
    .from('lab_settlements')
    .select('id, gross_amount, lab_payout_amount, evida_revenue, created_at')
    .eq('lab_partner_id', labId)
    .in('id', itemIds)
    .in('status', ['pending', 'approved']);

  if (!items?.length) {
    return NextResponse.json({ error: 'No eligible items found' }, { status: 404 });
  }

  // Generate batch number: EVSET-YYYY-NNN
  const year = new Date().getFullYear();
  const { count } = await admin
    .from('lab_settlement_batches')
    .select('id', { count: 'exact', head: true })
    .like('batch_number', `EVSET-${year}-%`);
  const seq = String((count ?? 0) + 1).padStart(3, '0');
  const batchNumber = `EVSET-${year}-${seq}`;

  // Determine period
  const dates = items.map(i => new Date(i.created_at));
  const periodFrom = new Date(Math.min(...dates.map(d => d.getTime())));
  const periodTo = new Date(Math.max(...dates.map(d => d.getTime())));

  const totalGross = items.reduce((s, i) => s + Number(i.gross_amount), 0);
  const totalLabPayout = items.reduce((s, i) => s + Number(i.lab_payout_amount), 0);
  const totalEvidaRevenue = items.reduce((s, i) => s + Number(i.evida_revenue), 0);

  // Create batch
  const { data: batch, error: batchError } = await admin
    .from('lab_settlement_batches')
    .insert({
      lab_partner_id: labId,
      batch_number: batchNumber,
      period_from: periodFrom.toISOString().slice(0, 10),
      period_to: periodTo.toISOString().slice(0, 10),
      total_gross: totalGross,
      total_lab_payout: totalLabPayout,
      total_evida_revenue: totalEvidaRevenue,
      item_count: items.length,
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_reference: paymentReference || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (batchError) {
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }

  // Mark items as paid and link to batch
  await admin
    .from('lab_settlements')
    .update({ status: 'paid', batch_id: batch.id })
    .in('id', itemIds);

  return NextResponse.json({ success: true, batch });
}
