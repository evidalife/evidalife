import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFulfilmentEmail } from '@/lib/order-fulfilment';

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  const { orderId, template } = await req.json();
  if (!orderId || !template) {
    return NextResponse.json({ error: 'orderId and template required' }, { status: 400 });
  }

  const supabase = serviceClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    await sendFulfilmentEmail(template, orderId, order.user_id, supabase);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to send email' }, { status: 500 });
  }
}
