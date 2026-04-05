import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ─── GET: Preview or list test data ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const before = req.nextUrl.searchParams.get('before') ?? new Date().toISOString();

  // Call the cleanup function in dry-run mode
  const { data, error } = await admin.rpc('cleanup_test_orders', {
    p_before: before,
    p_dry_run: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also fetch the actual order list for display
  const { data: orders } = await admin
    .from('orders')
    .select('id, order_number, status, fulfilment_status, total_amount, currency, email, created_at')
    .lt('created_at', before)
    .order('created_at', { ascending: false });

  return NextResponse.json({ preview: data, orders: orders ?? [] });
}

// ─── POST: Execute cleanup ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const admin = createAdminClient();
  const body = await req.json();
  const { action, before, orderIds } = body;

  if (action === 'cleanup_orders') {
    if (!before) {
      return NextResponse.json({ error: 'Missing "before" date parameter' }, { status: 400 });
    }

    // Execute the real cleanup
    const { data, error } = await admin.rpc('cleanup_test_orders', {
      p_before: before,
      p_dry_run: false,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ result: data, message: 'Cleanup completed successfully' });
  }

  if (action === 'delete_specific_orders') {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Missing orderIds array' }, { status: 400 });
    }

    // Delete specific orders using the same dependency-safe order
    // 1. lab_results linked to these orders' reports
    const { data: reports } = await admin
      .from('lab_reports')
      .select('id')
      .in('order_id', orderIds);
    const reportIds = (reports ?? []).map(r => r.id);

    if (reportIds.length > 0) {
      await admin.from('lab_results').delete().in('lab_report_id', reportIds);
    }
    await admin.from('lab_results').delete().in('order_id', orderIds);

    // 2. lab_reports
    await admin.from('lab_reports').delete().in('order_id', orderIds);

    // 3. lab_kits
    await admin.from('lab_kits').delete().in('order_id', orderIds);

    // 4. lab_pdf_uploads
    await admin.from('lab_pdf_uploads').delete().in('order_id', orderIds);

    // 5. Nullify batch_id on settlements, then delete batches if orphaned
    const { data: settlements } = await admin
      .from('lab_settlements')
      .select('batch_id')
      .in('order_id', orderIds)
      .not('batch_id', 'is', null);
    const batchIds = [...new Set((settlements ?? []).map(s => s.batch_id).filter(Boolean))];

    await admin.from('lab_settlements').update({ batch_id: null }).in('order_id', orderIds);

    if (batchIds.length > 0) {
      // Only delete batches where all items are gone
      for (const bid of batchIds) {
        const { count } = await admin
          .from('lab_settlements')
          .select('id', { count: 'exact', head: true })
          .eq('batch_id', bid);
        if (count === 0) {
          await admin.from('lab_settlement_batches').delete().eq('id', bid);
        }
      }
    }

    // 6. lab_settlements
    await admin.from('lab_settlements').delete().in('order_id', orderIds);

    // 7. invoices
    await admin.from('invoices').delete().in('order_id', orderIds);

    // 8. order_refunds
    await admin.from('order_refunds').delete().in('order_id', orderIds);

    // 9. orders (cascades: order_items, order_vouchers, order_test_items, order_status_log, order_notes)
    const { error: delErr, count } = await admin
      .from('orders')
      .delete({ count: 'exact' })
      .in('id', orderIds);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ deleted: count, message: `Deleted ${count} order(s) and all related data` });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
