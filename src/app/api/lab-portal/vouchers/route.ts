import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLabSession } from '@/lib/lab-auth';

/**
 * GET  /api/lab-portal/vouchers          — list vouchers for this lab
 * POST /api/lab-portal/vouchers          — validate & redeem a voucher code
 */

export async function GET() {
  const session = await getLabSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Get vouchers assigned to this lab or unassigned (available to any lab)
  const { data: vouchers } = await admin
    .from('order_vouchers')
    .select(`
      id, voucher_code, status, product_type, issued_at, redeemed_at, expires_at,
      orders!inner(order_number, user_id, profiles:user_id(first_name, last_name, email))
    `)
    .or(`lab_partner_id.eq.${session.labId},lab_partner_id.is.null`)
    .in('status', ['active', 'redeemed'])
    .order('issued_at', { ascending: false })
    .limit(100);

  return NextResponse.json({ vouchers: vouchers ?? [] });
}

export async function POST(req: NextRequest) {
  const session = await getLabSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: 'Missing voucher code' }, { status: 400 });

  const admin = createAdminClient();

  // Look up the voucher
  const { data: voucher } = await admin
    .from('order_vouchers')
    .select(`
      id, voucher_code, status, product_type, expires_at, order_id, order_item_id,
      orders!inner(order_number, user_id, profiles:user_id(first_name, last_name, email))
    `)
    .eq('voucher_code', code.trim().toUpperCase())
    .single();

  if (!voucher) {
    return NextResponse.json({ error: 'Voucher not found', valid: false }, { status: 404 });
  }

  if (voucher.status === 'redeemed') {
    return NextResponse.json({
      error: 'Voucher already redeemed',
      valid: false,
      voucher: { code: voucher.voucher_code, status: voucher.status },
    }, { status: 409 });
  }

  if (voucher.status !== 'active') {
    return NextResponse.json({
      error: `Voucher is ${voucher.status}`,
      valid: false,
      voucher: { code: voucher.voucher_code, status: voucher.status },
    }, { status: 410 });
  }

  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    // Mark as expired
    await admin.from('order_vouchers').update({ status: 'expired' }).eq('id', voucher.id);
    return NextResponse.json({
      error: 'Voucher has expired',
      valid: false,
      voucher: { code: voucher.voucher_code, status: 'expired' },
    }, { status: 410 });
  }

  // Redeem the voucher
  const { error: redeemError } = await admin
    .from('order_vouchers')
    .update({
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
      lab_partner_id: session.labId,
    })
    .eq('id', voucher.id);

  if (redeemError) {
    return NextResponse.json({ error: 'Failed to redeem voucher' }, { status: 500 });
  }

  // Transition the order to sample_collected if in voucher_sent state
  try {
    const { transitionOrder } = await import('@/lib/order-fulfilment');
    await transitionOrder(voucher.order_id, 'lab_confirms_collection', session.labId);
  } catch (e) {
    console.error('[lab-portal] Order transition failed', e);
  }

  // ── Create settlement line item ──────────────────────────────────
  try {
    // Determine billing lab: if this lab has a parent, bill to parent org
    const { data: redeemingLab } = await admin
      .from('lab_partners')
      .select('id, parent_lab_id, settlement_currency')
      .eq('id', session.labId)
      .single();

    const billingLabId = redeemingLab?.parent_lab_id ?? session.labId;

    // Get order item info (price, product)
    const orderItemId = voucher.order_item_id;
    let grossAmount = 0;
    let productName = 'Product';
    let productId: string | null = null;

    if (orderItemId) {
      const { data: item } = await admin
        .from('order_items')
        .select('unit_price, quantity, product_name, product_id')
        .eq('id', orderItemId)
        .single();
      if (item) {
        grossAmount = Number(item.unit_price) * (item.quantity ?? 1);
        productId = item.product_id;
        const rawName = item.product_name;
        productName = typeof rawName === 'string'
          ? rawName
          : (rawName?.de || rawName?.en || 'Product');
      }
    } else {
      // Fallback: get first order item for this order
      const { data: items } = await admin
        .from('order_items')
        .select('unit_price, quantity, product_name, product_id')
        .eq('order_id', voucher.order_id)
        .limit(1);
      if (items?.[0]) {
        grossAmount = Number(items[0].unit_price) * (items[0].quantity ?? 1);
        productId = items[0].product_id;
        const rawName = items[0].product_name;
        productName = typeof rawName === 'string'
          ? rawName
          : (rawName?.de || rawName?.en || 'Product');
      }
    }

    // Look up negotiated fixed cost for this lab × product
    let labCost = 0;
    if (productId) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: pricing } = await admin
        .from('lab_product_pricing')
        .select('lab_cost')
        .eq('lab_partner_id', billingLabId)
        .eq('product_id', productId)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();
      if (pricing) labCost = Number(pricing.lab_cost);
    }

    const labPayout = labCost;
    const evidaRevenue = Math.round((grossAmount - labPayout) * 100) / 100;
    const currency = redeemingLab?.settlement_currency ?? 'CHF';

    await admin.from('lab_settlements').insert({
      lab_partner_id: billingLabId,
      billing_lab_id: billingLabId,
      redeeming_lab_id: session.labId,
      voucher_id: voucher.id,
      order_id: voucher.order_id,
      order_item_id: orderItemId || null,
      product_id: productId,
      product_name: productName,
      gross_amount: grossAmount,
      lab_cost: labCost,
      lab_payout_amount: labPayout,
      evida_revenue: evidaRevenue,
      currency,
      status: 'pending',
    });
  } catch (e) {
    // Don't fail the redemption if settlement creation fails
    console.error('[lab-portal] Settlement creation failed', e);
  }

  const order = voucher.orders as any;
  const profile = order?.profiles;

  return NextResponse.json({
    valid: true,
    voucher: {
      code: voucher.voucher_code,
      status: 'redeemed',
      product_type: voucher.product_type,
    },
    customer: profile ? {
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
      email: profile.email,
    } : null,
    order_number: order?.order_number,
  });
}
