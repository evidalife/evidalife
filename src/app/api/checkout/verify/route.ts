import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { transitionOrder } from '@/lib/order-fulfilment';

/**
 * GET /api/checkout/verify?session_id=cs_xxx
 *
 * Verifies a Stripe Checkout session and ensures the order exists in our DB.
 * This handles the case where the webhook hasn't fired yet (race condition)
 * or can't reach the server (localhost / network issues).
 */

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

async function nextOrderNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true });
  return `EVD-${String((count ?? 0) + 1).padStart(5, '0')}`;
}

async function nextInvoiceNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true });
  return `INV-${String((count ?? 0) + 1).padStart(5, '0')}`;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const stripe = getStripe();

  // Retrieve the Checkout Session from Stripe
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({
      status: 'pending',
      payment_status: session.payment_status,
    });
  }

  const admin = createAdminClient();
  const productIds = (session.metadata?.product_ids ?? '').split(',').filter(Boolean);
  const quantities = (session.metadata?.quantities ?? '').split(',').map(Number);
  const userId = session.metadata?.user_id || null;

  // Check if order already exists (created by webhook)
  const { data: existingOrder } = await admin
    .from('orders')
    .select('id, order_number, total_amount, currency, status, created_at')
    .eq('stripe_session_id', sessionId)
    .single();

  if (existingOrder) {
    // Order already created by webhook — just return it
    // Fetch order items for the confirmation page
    const { data: items } = await admin
      .from('order_items')
      .select('id, quantity, unit_price, currency, product_name, product_sku')
      .eq('order_id', existingOrder.id);

    return NextResponse.json({
      status: 'completed',
      order: existingOrder,
      items: items ?? [],
      customer_email: session.customer_details?.email ?? null,
    });
  }

  // Order doesn't exist yet — create it (webhook hasn't fired or couldn't reach us)
  if (!productIds.length) {
    return NextResponse.json({ error: 'No product_ids in session metadata' }, { status: 422 });
  }

  // Fetch product snapshots
  const { data: products } = await admin
    .from('products')
    .select('id, name, sku, price_chf')
    .in('id', productIds);

  const totalAmount = (session.amount_total ?? 0) / 100;
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
    .select('id, order_number, total_amount, currency, status, created_at')
    .single();

  if (orderError || !order) {
    console.error('[checkout/verify] Failed to create order', orderError);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  // Create order items with product snapshots
  const orderItems = productIds.map((productId, idx) => {
    const product = products?.find((p) => p.id === productId);
    const name = product?.name;
    const productName = typeof name === 'string' ? name : (name?.de || name?.en || null);

    return {
      order_id: order.id,
      product_id: productId,
      quantity: quantities[idx] || 1,
      unit_price: product?.price_chf ?? 0,
      currency: 'CHF',
      product_name: productName,
      product_sku: product?.sku ?? null,
    };
  });

  const { error: itemsError } = await admin.from('order_items').insert(orderItems);
  if (itemsError) console.error('[checkout/verify] Failed to create order_items', itemsError);

  // Create invoice
  const invoiceNumber = await nextInvoiceNumber(admin);
  await admin.from('invoices').insert({
    invoice_number: invoiceNumber,
    order_id: order.id,
    amount: totalAmount,
    currency: 'CHF',
    status: 'paid',
    created_at: now,
  });

  // Trigger fulfilment
  try {
    await transitionOrder(order.id, 'checkout_verify_fallback');
  } catch (e) {
    console.error('[checkout/verify] Fulfilment transition failed', e);
  }

  // Re-fetch items for response
  const { data: items } = await admin
    .from('order_items')
    .select('id, quantity, unit_price, currency, product_name, product_sku')
    .eq('order_id', order.id);

  return NextResponse.json({
    status: 'completed',
    order,
    items: items ?? [],
    customer_email: session.customer_details?.email ?? null,
  });
}
