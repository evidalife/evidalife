import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  const { orderId, amount, reason } = await req.json();
  if (!orderId || !amount) {
    return NextResponse.json({ error: 'orderId and amount required' }, { status: 400 });
  }

  const supabase = serviceClient();

  // identify caller
  const authHeader = req.headers.get('authorization');
  let adminId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authHeader.slice(7));
    adminId = data.user?.id ?? null;
  }

  // Fetch order for Stripe intent
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, total_amount, currency, stripe_payment_intent_id, status')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Attempt Stripe refund if payment intent exists
  let stripeRefundId: string | null = null;
  if (order.stripe_payment_intent_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const amountCents = Math.round(Number(amount) * 100);
      const stripeRes = await fetch('https://api.stripe.com/v1/refunds', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          payment_intent: order.stripe_payment_intent_id,
          amount: String(amountCents),
          ...(reason ? { reason: 'requested_by_customer' } : {}),
        }),
      });
      const stripeData = await stripeRes.json();
      if (stripeData.id) stripeRefundId = stripeData.id;
    } catch {
      // Stripe refund failed — still record manually
    }
  }

  // Record refund
  const { data: refund, error: refundErr } = await supabase
    .from('order_refunds')
    .insert({
      order_id: orderId,
      admin_id: adminId,
      amount: Number(amount),
      currency: order.currency,
      reason: reason || null,
      stripe_refund_id: stripeRefundId,
      status: stripeRefundId ? 'completed' : 'manual',
    })
    .select('id, amount, currency, reason, stripe_refund_id, status, created_at')
    .single();

  if (refundErr) return NextResponse.json({ error: refundErr.message }, { status: 500 });

  // Update order status to refunded if full amount
  if (Number(amount) >= Number(order.total_amount)) {
    await supabase.from('orders').update({ status: 'refunded' }).eq('id', orderId);
  }

  return NextResponse.json({ refund, stripeRefundId });
}

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('order_refunds')
    .select('id, amount, currency, reason, stripe_refund_id, status, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ refunds: data ?? [] });
}
