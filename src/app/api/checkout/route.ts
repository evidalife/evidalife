import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

const SWISS_TAX_RATE = 0.081; // 8.1 % MwSt

export async function POST(req: NextRequest) {
  const body = await req.json();
  const productIds: string[] = body.productIds ?? [];

  if (!productIds.length) {
    return NextResponse.json({ error: 'No products selected' }, { status: 400 });
  }

  // Fetch products via admin client so we always get price_chf regardless of RLS
  const admin = createAdminClient();
  const { data: products, error } = await admin
    .from('products')
    .select('id, name, sku, price_chf, stripe_price_id_chf')
    .in('id', productIds)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error || !products?.length) {
    return NextResponse.json({ error: 'Products not found' }, { status: 404 });
  }

  // Resolve current user (optional — guest checkout is allowed)
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  // Build Stripe line items — use pre-created Price ID if available, dynamic otherwise
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let dynamicSubtotalRappen = 0;

  for (const p of products) {
    if (p.stripe_price_id_chf) {
      // Pre-created Stripe Price — tax already configured on the Price object
      lineItems.push({ price: p.stripe_price_id_chf, quantity: 1 });
    } else {
      const name =
        typeof p.name === 'string'
          ? p.name
          : (p.name?.de || p.name?.en || 'Product');
      const unitAmount = Math.round((p.price_chf ?? 0) * 100);
      dynamicSubtotalRappen += unitAmount;
      lineItems.push({
        price_data: {
          currency: 'chf',
          product_data: {
            name,
            metadata: { product_id: p.id, sku: p.sku ?? '' },
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      });
    }
  }

  // Add Swiss MwSt line item only for dynamic-priced items
  if (dynamicSubtotalRappen > 0) {
    const taxRappen = Math.round(dynamicSubtotalRappen * SWISS_TAX_RATE);
    lineItems.push({
      price_data: {
        currency: 'chf',
        product_data: { name: 'MwSt 8.1 %' },
        unit_amount: taxRappen,
      },
      quantity: 1,
    });
  }

  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${origin}/shop?success=1`,
    cancel_url: `${origin}/shop?cancelled=1`,
    metadata: {
      product_ids: productIds.join(','),
      user_id: user?.id ?? '',
    },
  });

  return NextResponse.json({ url: session.url });
}
