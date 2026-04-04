import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

type CartItem = { productId: string; quantity: number };

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Support both { productIds: string[] } and { items: CartItem[] }
  let cartItems: CartItem[];
  if (body.items) {
    cartItems = (body.items as CartItem[]).filter((i) => i.productId && i.quantity > 0);
  } else {
    const productIds: string[] = body.productIds ?? [];
    cartItems = productIds.map((id) => ({ productId: id, quantity: 1 }));
  }

  const productIds = cartItems.map((i) => i.productId);

  if (!cartItems.length) {
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

  // Resolve current user and profile
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();

  let customerEmail: string | undefined;
  if (user) {
    // Get email from profile or auth
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    customerEmail = profile?.email || user.email;
  }

  // Build Stripe line items — use pre-created Price ID if available, dynamic otherwise
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const p of products) {
    const qty = cartItems.find((i) => i.productId === p.id)?.quantity ?? 1;
    if (p.stripe_price_id_chf) {
      // Pre-created Stripe Price — tax already configured on the Price object
      lineItems.push({ price: p.stripe_price_id_chf, quantity: qty });
    } else {
      const name =
        typeof p.name === 'string'
          ? p.name
          : (p.name?.de || p.name?.en || 'Product');
      const unitAmount = Math.round((p.price_chf ?? 0) * 100);
      lineItems.push({
        price_data: {
          currency: 'chf',
          product_data: {
            name,
            metadata: { product_id: p.id, sku: p.sku ?? '' },
          },
          unit_amount: unitAmount,
        },
        quantity: qty,
      });
    }
  }

  // Tax is handled by Stripe Tax or configured on the Price object in Stripe dashboard

  const origin =
    req.headers.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000';

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    // Redirect to order confirmation page with session ID for verification
    success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    billing_address_collection: 'required',
    metadata: {
      product_ids: productIds.join(','),
      quantities: cartItems.map(i => i.quantity).join(','),
      user_id: user?.id ?? '',
    },
  };

  // Pre-fill email if user is logged in
  if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}
