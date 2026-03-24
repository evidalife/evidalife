// src/lib/order-fulfilment.ts
// ========================================================================
// EVIDALIFE ORDER FULFILMENT STATE MACHINE
// ========================================================================
// Manages the lifecycle: paid → voucher_sent → sample_collected →
//                        processing → results_ready → completed
// ========================================================================

import { createClient } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'          // Created, awaiting payment
  | 'paid'             // Stripe payment confirmed
  | 'voucher_sent'     // Lab voucher emailed to customer
  | 'sample_collected' // Lab confirms blood draw happened
  | 'processing'       // Lab is running analysis
  | 'results_ready'    // Results uploaded, visible to user
  | 'completed'        // User has viewed results, order archived
  | 'cancelled'        // Order cancelled/refunded
  | 'failed';          // Payment or processing failed

export interface OrderStatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  trigger: string;        // What causes this transition
  emailTemplate?: string; // Which email to send
  autoActions?: string[]; // Side effects to execute
}

// ── Valid state transitions ────────────────────────────────────────────

export const ORDER_TRANSITIONS: OrderStatusTransition[] = [
  {
    from: 'pending',
    to: 'paid',
    trigger: 'stripe_webhook_checkout_completed',
    emailTemplate: 'order_confirmation',
    autoActions: ['create_invoice', 'generate_voucher'],
  },
  {
    from: 'paid',
    to: 'voucher_sent',
    trigger: 'voucher_generated_and_emailed',
    emailTemplate: 'voucher',
    autoActions: ['assign_nearest_lab'],
  },
  {
    from: 'voucher_sent',
    to: 'sample_collected',
    trigger: 'lab_confirms_collection',
    emailTemplate: 'processing',
    autoActions: ['create_order_test_items'],
  },
  {
    from: 'sample_collected',
    to: 'processing',
    trigger: 'lab_starts_analysis',
    autoActions: [],
  },
  {
    from: 'processing',
    to: 'results_ready',
    trigger: 'lab_results_uploaded',
    emailTemplate: 'results_ready',
    autoActions: ['calculate_health_engine_score', 'calculate_bio_age'],
  },
  {
    from: 'results_ready',
    to: 'completed',
    trigger: 'user_views_results',
    autoActions: [],
  },
  // Cancellation can happen from several states
  { from: 'pending',      to: 'cancelled', trigger: 'user_cancels',  autoActions: [] },
  { from: 'paid',         to: 'cancelled', trigger: 'admin_cancels', autoActions: ['process_refund'] },
  { from: 'voucher_sent', to: 'cancelled', trigger: 'admin_cancels', autoActions: ['process_refund', 'invalidate_voucher'] },
  // Failure
  { from: 'pending', to: 'failed', trigger: 'stripe_payment_failed', autoActions: [] },
];

// ── Voucher generation ─────────────────────────────────────────────────

function generateVoucherCode(): string {
  // Format: EV-XXXX-XXXX (8 alphanumeric chars)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let code = 'EV-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── SQL Migration for order_vouchers and order_test_items ───────────────
// Run this in Supabase SQL editor before using the fulfilment system

export const FULFILMENT_MIGRATION_SQL = `
-- Order vouchers table
CREATE TABLE IF NOT EXISTS order_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  voucher_code TEXT NOT NULL UNIQUE,
  lab_partner_id UUID REFERENCES lab_partners(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'invalidated')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vouchers_order ON order_vouchers(order_id);
CREATE INDEX idx_vouchers_code ON order_vouchers(voucher_code);

-- RLS for order_vouchers
ALTER TABLE order_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vouchers"
  ON order_vouchers FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage vouchers"
  ON order_vouchers FOR ALL
  USING (true)
  WITH CHECK (true);

-- Order test items table (fulfilment checklist per biomarker)
CREATE TABLE IF NOT EXISTS order_test_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_item_id UUID NOT NULL REFERENCES product_item_definitions(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'processing', 'completed', 'failed')),
  result_value NUMERIC,
  result_unit TEXT,
  status_flag TEXT CHECK (status_flag IN ('optimal', 'normal', 'borderline', 'out_of_range')),
  lab_result_id UUID REFERENCES lab_results(id),
  notes TEXT,
  collected_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_items_order ON order_test_items(order_id);
CREATE INDEX idx_test_items_status ON order_test_items(status);

-- RLS for order_test_items
ALTER TABLE order_test_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test items"
  ON order_test_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage test items"
  ON order_test_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add status column to orders if not exists
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilment_status TEXT
    DEFAULT 'pending'
    CHECK (fulfilment_status IN (
      'pending', 'paid', 'voucher_sent', 'sample_collected',
      'processing', 'results_ready', 'completed', 'cancelled', 'failed'
    ));
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Status history log for audit trail
CREATE TABLE IF NOT EXISTS order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  trigger TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_log_order ON order_status_log(order_id);
`;


// ── Core state machine ─────────────────────────────────────────────────

interface TransitionResult {
  success: boolean;
  newStatus: OrderStatus;
  error?: string;
  actionsExecuted: string[];
}

export async function transitionOrder(
  orderId: string,
  trigger: string,
  performedBy?: string,
  notes?: string
): Promise<TransitionResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Get current order status
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, fulfilment_status, user_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, newStatus: 'pending', error: 'Order not found', actionsExecuted: [] };
  }

  const currentStatus = (order.fulfilment_status || 'pending') as OrderStatus;

  // 2. Find valid transition
  const transition = ORDER_TRANSITIONS.find(
    t => t.from === currentStatus && t.trigger === trigger
  );

  if (!transition) {
    return {
      success: false,
      newStatus: currentStatus,
      error: `No valid transition from "${currentStatus}" with trigger "${trigger}"`,
      actionsExecuted: [],
    };
  }

  // 3. Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ fulfilment_status: transition.to })
    .eq('id', orderId);

  if (updateError) {
    return { success: false, newStatus: currentStatus, error: updateError.message, actionsExecuted: [] };
  }

  // 4. Log the transition
  await supabase.from('order_status_log').insert({
    order_id: orderId,
    from_status: currentStatus,
    to_status: transition.to,
    trigger,
    performed_by: performedBy || null,
    notes: notes || null,
  });

  // 5. Execute auto-actions
  const actionsExecuted: string[] = [];
  for (const action of transition.autoActions || []) {
    try {
      await executeAction(action, orderId, order.user_id, supabase);
      actionsExecuted.push(action);
    } catch (err) {
      console.error(`Action ${action} failed for order ${orderId}:`, err);
    }
  }

  // 6. Send email if configured
  if (transition.emailTemplate) {
    try {
      await sendFulfilmentEmail(transition.emailTemplate, orderId, order.user_id, supabase);
      actionsExecuted.push(`email:${transition.emailTemplate}`);
    } catch (err) {
      console.error(`Email ${transition.emailTemplate} failed for order ${orderId}:`, err);
    }
  }

  return {
    success: true,
    newStatus: transition.to,
    actionsExecuted,
  };
}


// ── Action executor ────────────────────────────────────────────────────

async function executeAction(
  action: string,
  orderId: string,
  userId: string,
  supabase: any
) {
  switch (action) {
    case 'generate_voucher': {
      const code = generateVoucherCode();
      // Find nearest lab partner (simple: pick first active one)
      const { data: labs } = await supabase
        .from('lab_partners')
        .select('id')
        .limit(1);

      await supabase.from('order_vouchers').insert({
        order_id: orderId,
        voucher_code: code,
        lab_partner_id: labs?.[0]?.id || null,
      });
      break;
    }

    case 'create_order_test_items': {
      // Get order items to find which products were purchased
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId);

      if (!orderItems?.length) break;

      // Get product item definitions (biomarkers) for each product
      const productIds = orderItems.map((i: any) => i.product_id);
      const { data: productItems } = await supabase
        .from('product_items')
        .select('product_item_definition_id')
        .in('product_id', productIds);

      if (!productItems?.length) break;

      // Create a test item row for each biomarker
      const testItems = productItems.map((pi: any) => ({
        order_id: orderId,
        product_item_id: pi.product_item_definition_id,
        status: 'pending',
      }));

      await supabase.from('order_test_items').insert(testItems);
      break;
    }

    case 'create_invoice': {
      // Invoice is already created in Stripe webhook — this is a no-op
      // unless you want to generate the PDF proactively
      break;
    }

    case 'assign_nearest_lab': {
      // Future: use user's postal code to find nearest lab
      // For now, just ensure voucher has a lab assigned
      break;
    }

    case 'calculate_health_engine_score': {
      // Trigger score recalculation after results are uploaded
      // This calls the health-score.ts engine
      console.log(`TODO: Recalculate Health Engine score for user ${userId}`);
      break;
    }

    case 'calculate_bio_age': {
      // Future: Levine PhenoAge calculation
      console.log(`TODO: Calculate biological age for user ${userId}`);
      break;
    }

    case 'process_refund': {
      // Future: Stripe refund API call
      console.log(`TODO: Process Stripe refund for order ${orderId}`);
      break;
    }

    case 'invalidate_voucher': {
      await supabase
        .from('order_vouchers')
        .update({ status: 'invalidated' })
        .eq('order_id', orderId);
      break;
    }

    default:
      console.warn(`Unknown action: ${action}`);
  }
}


// ── Email dispatcher ───────────────────────────────────────────────────

export async function sendFulfilmentEmail(
  template: string,
  orderId: string,
  userId: string,
  supabase: any
) {
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, email, preferred_language')
    .eq('id', userId)
    .single();

  if (!profile?.email) return;

  const lang = (profile.preferred_language || 'de') as 'en' | 'de' | 'fr' | 'es' | 'it';
  const firstName = profile.first_name || 'there';

  // Import email builders dynamically to avoid circular deps
  const {
    buildOrderConfirmationEmail,
    buildVoucherEmail,
    buildProcessingEmail,
    buildResultsReadyEmail,
  } = await import('@/emails/templates');

  let emailData: { subject: string; html: string } | null = null;

  switch (template) {
    case 'order_confirmation': {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, total_amount, subtotal, vat_amount, currency')
        .eq('id', orderId)
        .single();
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price, products(name)')
        .eq('order_id', orderId);

      if (order && items) {
        emailData = buildOrderConfirmationEmail({
          lang,
          firstName,
          orderNumber: order.order_number,
          items: items.map((i: any) => ({
            name: i.products?.name?.[lang] || i.products?.name?.en || 'Product',
            quantity: i.quantity,
            price: i.unit_price,
          })),
          subtotal: order.subtotal || order.total_amount / 1.081,
          vat: order.vat_amount || order.total_amount * 0.081 / 1.081,
          total: order.total_amount,
          currency: order.currency || 'CHF',
        });
      }
      break;
    }

    case 'voucher': {
      const { data: voucher } = await supabase
        .from('order_vouchers')
        .select('voucher_code, expires_at, lab_partners(name, street_address, city, phone)')
        .eq('order_id', orderId)
        .single();
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, order_items(products(name))')
        .eq('id', orderId)
        .single();

      if (voucher && order) {
        const lab = (voucher as any).lab_partners;
        emailData = buildVoucherEmail({
          lang,
          firstName,
          orderNumber: order.order_number,
          voucherCode: voucher.voucher_code,
          packageName: (order as any).order_items?.[0]?.products?.name?.[lang] || 'Longevity Test',
          labPartnerName: lab?.name || 'Partner Lab',
          labAddress: lab ? `${lab.street_address}, ${lab.city}` : 'See partner labs page',
          labPhone: lab?.phone,
          expiresAt: new Date(voucher.expires_at).toLocaleDateString(lang === 'de' ? 'de-CH' : lang, {
            day: 'numeric', month: 'long', year: 'numeric',
          }),
        });
      }
      break;
    }

    case 'processing': {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, order_items(products(name))')
        .eq('id', orderId)
        .single();

      if (order) {
        const now = new Date();
        const estimated = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        emailData = buildProcessingEmail({
          lang,
          firstName,
          orderNumber: order.order_number,
          packageName: (order as any).order_items?.[0]?.products?.name?.[lang] || 'Longevity Test',
          collectedDate: now.toLocaleDateString(lang === 'de' ? 'de-CH' : lang, {
            day: 'numeric', month: 'long', year: 'numeric',
          }),
          estimatedResultsDate: estimated.toLocaleDateString(lang === 'de' ? 'de-CH' : lang, {
            day: 'numeric', month: 'long', year: 'numeric',
          }),
        });
      }
      break;
    }

    case 'results_ready': {
      // Fetch the computed health engine score
      const { data: score } = await supabase
        .from('health_engine_scores')
        .select('overall_score')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: bioAge } = await supabase
        .from('biological_age_results')
        .select('estimated_age')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { data: profileAge } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', userId)
        .single();

      const chronoAge = profileAge?.date_of_birth
        ? Math.floor((Date.now() - new Date(profileAge.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined;

      // Count biomarkers for this order
      const { count } = await supabase
        .from('order_test_items')
        .select('id', { count: 'exact' })
        .eq('order_id', orderId)
        .eq('status', 'completed');

      emailData = buildResultsReadyEmail({
        lang,
        firstName,
        longevityScore: score?.overall_score || 0,
        bioAge: bioAge?.estimated_age,
        chronoAge,
        biomarkersCount: count || 0,
      });
      break;
    }
  }

  if (!emailData) return;

  // Send via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — email skipped');
    return;
  }

  let sendStatus: 'sent' | 'failed' = 'sent';
  let errorMessage: string | undefined;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Evidalife <noreply@evidalife.com>',
        to: profile.email,
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      sendStatus = 'failed';
      errorMessage = errData.message ?? `HTTP ${res.status}`;
    }
  } catch (err) {
    sendStatus = 'failed';
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  // Log to email_log
  await supabase.from('email_log').insert({
    user_id: userId || null,
    email_address: profile.email,
    template,
    subject: emailData.subject,
    status: sendStatus,
    error_message: errorMessage ?? null,
  }).then(({ error }: { error: any }) => {
    if (error) console.error('email_log insert failed:', error.message);
  });
}


// ── API route helper for admin status updates ──────────────────────────

export function getValidTransitions(currentStatus: OrderStatus): OrderStatusTransition[] {
  return ORDER_TRANSITIONS.filter(t => t.from === currentStatus);
}

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending:          '#888780',
    paid:             '#C4A96A',
    voucher_sent:     '#0C9C6C',
    sample_collected: '#0C9C6C',
    processing:       '#C4A96A',
    results_ready:    '#0C9C6C',
    completed:        '#0e393d',
    cancelled:        '#E24B4A',
    failed:           '#E24B4A',
  };
  return colors[status] || '#888780';
}

export function getStatusLabel(status: OrderStatus, lang: string = 'en'): string {
  const labels: Record<string, Record<OrderStatus, string>> = {
    en: {
      pending:          'Pending',
      paid:             'Paid',
      voucher_sent:     'Voucher sent',
      sample_collected: 'Sample collected',
      processing:       'Processing',
      results_ready:    'Results ready',
      completed:        'Completed',
      cancelled:        'Cancelled',
      failed:           'Failed',
    },
    de: {
      pending:          'Ausstehend',
      paid:             'Bezahlt',
      voucher_sent:     'Gutschein versendet',
      sample_collected: 'Probe entnommen',
      processing:       'In Bearbeitung',
      results_ready:    'Ergebnisse bereit',
      completed:        'Abgeschlossen',
      cancelled:        'Storniert',
      failed:           'Fehlgeschlagen',
    },
  };
  return labels[lang]?.[status] || labels.en[status] || status;
}
