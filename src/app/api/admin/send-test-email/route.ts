// src/app/api/admin/send-test-email/route.ts
// POST { template, lang, recipientEmail }
// Builds email with sample data and sends via Resend

import { NextRequest, NextResponse } from 'next/server';
import {
  buildWelcomeEmail,
  buildOrderConfirmationEmail,
  buildVoucherEmail,
  buildProcessingEmail,
  buildResultsReadyEmail,
} from '@/emails/templates';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

const SAMPLE_DATA = {
  welcome: (lang: Lang) => buildWelcomeEmail({ lang, firstName: 'Michael' }),

  order_confirmation: (lang: Lang) => buildOrderConfirmationEmail({
    lang,
    firstName: 'Michael',
    orderNumber: 'EV-00042',
    items: [{ name: 'Longevity Complete', quantity: 1, price: 449 }],
    subtotal: 415.36,
    vat: 33.64,
    total: 449,
    currency: 'CHF',
  }),

  voucher: (lang: Lang) => buildVoucherEmail({
    lang,
    firstName: 'Michael',
    orderNumber: 'EV-00042',
    voucherCode: 'EV-AB3K-7X9P',
    packageName: 'Longevity Complete',
    labPartnerName: 'Medisyn Lab Zürich',
    labAddress: 'Bahnhofstrasse 42, 8001 Zürich',
    expiresAt: '30. Juni 2026',
  }),

  processing: (lang: Lang) => buildProcessingEmail({
    lang,
    firstName: 'Michael',
    orderNumber: 'EV-00042',
    packageName: 'Longevity Complete',
    collectedDate: '24. März 2026',
    estimatedResultsDate: '31. März 2026',
  }),

  results_ready: (lang: Lang) => buildResultsReadyEmail({
    lang,
    firstName: 'Michael',
    longevityScore: 78,
    bioAge: 34,
    chronoAge: 38,
    biomarkersCount: 36,
  }),
};

export async function POST(req: NextRequest) {
  try {
    const { template, lang = 'en', recipientEmail } = await req.json();

    if (!template || !recipientEmail) {
      return NextResponse.json({ error: 'template and recipientEmail are required' }, { status: 400 });
    }

    const builder = SAMPLE_DATA[template as keyof typeof SAMPLE_DATA];
    if (!builder) {
      return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
    }

    const emailData = builder(lang as Lang);

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Evidalife <noreply@evidalife.com>',
        to: recipientEmail,
        subject: `[TEST] ${emailData.subject}`,
        html: emailData.html,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: resData.message ?? 'Resend error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: resData.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
