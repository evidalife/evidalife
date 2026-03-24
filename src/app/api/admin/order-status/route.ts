// src/app/api/admin/order-status/route.ts
// ========================================================================
// Admin API to transition order fulfilment status
// POST /api/admin/order-status
// Body: { orderId, trigger, notes? }
// ========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transitionOrder, getValidTransitions, type OrderStatus } from '@/lib/order-fulfilment';

export async function POST(req: NextRequest) {
  try {
    const { orderId, trigger, notes } = await req.json();

    if (!orderId || !trigger) {
      return NextResponse.json(
        { error: 'orderId and trigger are required' },
        { status: 400 }
      );
    }

    // Verify admin auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the auth header to identify the admin
    const authHeader = req.headers.get('authorization');
    let adminId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (!profile?.is_admin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        adminId = user.id;
      }
    }

    const result = await transitionOrder(orderId, trigger, adminId, notes);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newStatus: result.newStatus,
      actionsExecuted: result.actionsExecuted,
    });
  } catch (err: any) {
    console.error('Order status transition error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/admin/order-status?orderId=xxx
// Returns current status and valid next transitions
export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order } = await supabase
    .from('orders')
    .select('id, fulfilment_status, order_number')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const currentStatus = (order.fulfilment_status || 'pending') as OrderStatus;
  const validTransitions = getValidTransitions(currentStatus);

  // Get status history
  const { data: history } = await supabase
    .from('order_status_log')
    .select('from_status, to_status, trigger, notes, created_at, profiles(first_name, last_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  // Get voucher info if exists
  const { data: voucher } = await supabase
    .from('order_vouchers')
    .select('voucher_code, status, expires_at, lab_partners(name)')
    .eq('order_id', orderId)
    .single();

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    currentStatus,
    validTransitions: validTransitions.map(t => ({
      to: t.to,
      trigger: t.trigger,
      willSendEmail: !!t.emailTemplate,
      autoActions: t.autoActions,
    })),
    history: history || [],
    voucher: voucher || null,
  });
}
