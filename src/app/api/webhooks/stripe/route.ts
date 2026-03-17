import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// ── Sequential number helpers ────────────────────────────────────────────────

async function nextOrderNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true });
  return `EVD-${String((count ?? 0) + 1).padStart(5, '0')}`;
}

async function nextInvoiceNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true });
  return `INV-${String((count ?? 0) + 1).padStart(5, '0')}`;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const text = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(text, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const productIds = (session.metadata?.product_ids ?? '').split(',').filter(Boolean);
  const userId = session.metadata?.user_id || null;

  if (!productIds.length) {
    console.error('[stripe-webhook] No product_ids in session metadata', session.id);
    return NextResponse.json({ error: 'No product_ids in metadata' }, { status: 422 });
  }

  const admin = createAdminClient();

  // Fetch product snapshots
  const { data: products } = await admin
    .from('products')
    .select('id, name, sku, price_chf')
    .in('id', productIds);

  const totalAmount = (session.amount_total ?? 0) / 100; // CHF

  // ── Create order ────────────────────────────────────────────────────────────
  const orderNumber = await nextOrderNumber(admin);
  const now = new Date().toISOString();

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: userId,
      status: 'paid',
      currency: 'CHF',
      total_amount: totalAmount,
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string | null,
      paid_at: now,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[stripe-webhook] Failed to create order', orderError);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  // ── Create order items with product snapshots ───────────────────────────────
  const orderItems = productIds.map((productId) => {
    const product = products?.find((p) => p.id === productId);
    const name = product?.name;
    const productName =
      typeof name === 'string' ? name : (name?.de || name?.en || null);

    return {
      order_id: order.id,
      product_id: productId,
      quantity: 1,
      unit_price: product?.price_chf ?? 0,
      currency: 'CHF',
      product_name: productName,
      product_sku: product?.sku ?? null,
    };
  });

  const { error: itemsError } = await admin.from('order_items').insert(orderItems);
  if (itemsError) {
    console.error('[stripe-webhook] Failed to create order_items', itemsError);
  }

  // ── Create invoice ──────────────────────────────────────────────────────────
  const invoiceNumber = await nextInvoiceNumber(admin);

  const { error: invoiceError } = await admin.from('invoices').insert({
    invoice_number: invoiceNumber,
    order_id: order.id,
    amount: totalAmount,
    currency: 'CHF',
    status: 'paid',
    created_at: now,
  });

  if (invoiceError) {
    console.error('[stripe-webhook] Failed to create invoice', invoiceError);
  }

  return NextResponse.json({ received: true, order_number: orderNumber });
}
