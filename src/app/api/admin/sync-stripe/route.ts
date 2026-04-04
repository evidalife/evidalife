import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/**
 * POST /api/admin/sync-stripe
 *
 * Syncs a product from the database to Stripe. Creates or updates the
 * Stripe Product and Price, then stores the IDs back in the database.
 *
 * Body: { productId: string }
 */
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  let body: { productId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { productId } = body;
  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
  }

  const stripe = getStripe();

  // Fetch product from database
  const { data: product, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchErr || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const name = (product.name as Record<string, string>)?.en
    || (product.name as Record<string, string>)?.de
    || 'Product';

  const description = (product.short_description as Record<string, string>)?.en
    || (product.short_description as Record<string, string>)?.de
    || '';

  try {
    let stripeProductId = product.stripe_product_id;
    let stripePriceIdChf = product.stripe_price_id_chf;
    let stripePriceIdEur = product.stripe_price_id_eur;

    // ─── Create or update Stripe Product ────────────────────────────
    if (stripeProductId) {
      // Update existing Stripe product
      await stripe.products.update(stripeProductId, {
        name,
        description: description || undefined,
        images: product.image_url ? [product.image_url] : undefined,
        active: product.is_active ?? true,
      });
    } else {
      // Create new Stripe product
      const stripeProduct = await stripe.products.create({
        name,
        description: description || undefined,
        images: product.image_url ? [product.image_url] : [],
        active: product.is_active ?? true,
        metadata: {
          evida_product_id: productId,
          sku: product.sku || '',
        },
      });
      stripeProductId = stripeProduct.id;
    }

    // ─── Create or update CHF Price ─────────────────────────────────
    if (product.price_chf != null) {
      const chfAmount = Math.round(product.price_chf * 100); // Stripe expects cents

      if (stripePriceIdChf) {
        // Stripe doesn't allow updating price amounts — check if it matches
        const existingPrice = await stripe.prices.retrieve(stripePriceIdChf);
        if (existingPrice.unit_amount !== chfAmount) {
          // Archive old price and create new one
          await stripe.prices.update(stripePriceIdChf, { active: false });
          const newPrice = await stripe.prices.create({
            product: stripeProductId!,
            unit_amount: chfAmount,
            currency: 'chf',
            metadata: { evida_product_id: productId },
          });
          stripePriceIdChf = newPrice.id;
        }
      } else {
        // Create new CHF price
        const newPrice = await stripe.prices.create({
          product: stripeProductId!,
          unit_amount: chfAmount,
          currency: 'chf',
          metadata: { evida_product_id: productId },
        });
        stripePriceIdChf = newPrice.id;
      }
    }

    // ─── Create or update EUR Price ─────────────────────────────────
    if (product.price_eur != null) {
      const eurAmount = Math.round(product.price_eur * 100);

      if (stripePriceIdEur) {
        const existingPrice = await stripe.prices.retrieve(stripePriceIdEur);
        if (existingPrice.unit_amount !== eurAmount) {
          await stripe.prices.update(stripePriceIdEur, { active: false });
          const newPrice = await stripe.prices.create({
            product: stripeProductId!,
            unit_amount: eurAmount,
            currency: 'eur',
            metadata: { evida_product_id: productId },
          });
          stripePriceIdEur = newPrice.id;
        }
      } else {
        const newPrice = await stripe.prices.create({
          product: stripeProductId!,
          unit_amount: eurAmount,
          currency: 'eur',
          metadata: { evida_product_id: productId },
        });
        stripePriceIdEur = newPrice.id;
      }
    }

    // ─── Save Stripe IDs back to database ───────────────────────────
    const { error: updateErr } = await supabase
      .from('products')
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id_chf: stripePriceIdChf,
        stripe_price_id_eur: stripePriceIdEur,
      })
      .eq('id', productId);

    if (updateErr) {
      return NextResponse.json({ error: `DB update failed: ${updateErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stripe_product_id: stripeProductId,
      stripe_price_id_chf: stripePriceIdChf,
      stripe_price_id_eur: stripePriceIdEur,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[sync-stripe] Error:', msg);
    return NextResponse.json({ error: `Stripe sync failed: ${msg}` }, { status: 500 });
  }
}
