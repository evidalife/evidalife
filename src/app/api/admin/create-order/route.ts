import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  const { userId, items, notes, source = 'manual' } = await req.json();

  if (!userId || !items?.length) {
    return NextResponse.json({ error: 'userId and items required' }, { status: 400 });
  }

  const supabase = serviceClient();

  // Validate items and compute total
  const productIds = items.map((i: any) => i.productId);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, price, currency')
    .in('id', productIds);

  if (prodErr || !products?.length) {
    return NextResponse.json({ error: 'Could not load products' }, { status: 400 });
  }

  const productMap = Object.fromEntries(products.map((p: any) => [p.id, p]));

  let totalAmount = 0;
  const currency = products[0].currency ?? 'CHF';

  for (const item of items) {
    const product = productMap[item.productId];
    if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 400 });
    totalAmount += product.price * item.quantity;
  }

  // Generate order number
  const orderNumber = `ORD-M-${Date.now().toString(36).toUpperCase()}`;

  // Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_number: orderNumber,
      status: 'paid',
      fulfilment_status: 'paid',
      currency,
      total_amount: totalAmount,
      paid_at: new Date().toISOString(),
      notes: notes || null,
      source: source,
    })
    .select('id, order_number')
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? 'Failed to create order' }, { status: 500 });
  }

  // Create order items
  const orderItems = items.map((item: any) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: productMap[item.productId].price,
    currency,
  }));

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
  if (itemsErr) {
    // Rollback order
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id, orderNumber: order.order_number });
}
