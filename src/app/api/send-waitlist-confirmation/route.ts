import { NextRequest, NextResponse } from 'next/server';

// ─── Bilingual email content ──────────────────────────────────────────────────

const EMAIL_CONTENT = {
  de: {
    subject: 'Willkommen auf der Warteliste – Evida Life',
    body: `Hallo,

vielen Dank für deine Anmeldung auf der Warteliste von Evida Life!

Wir werden dich kontaktieren, sobald wir starten. In der Zwischenzeit kannst du unsere Webseite besuchen und mehr über unsere evidenzbasierte Gesundheitsplattform erfahren.

Mit freundlichen Grüssen,
Das Evida Life Team

---
Evida Life AG · Zürich, Schweiz
hello@evidalife.com · evidalife.com

Du erhältst diese E-Mail, weil du dich auf der Warteliste von Evida Life angemeldet hast. Falls du dies nicht warst, kannst du diese E-Mail ignorieren.`,
  },
  en: {
    subject: 'Welcome to the waitlist – Evida Life',
    body: `Hello,

Thank you for joining the Evida Life waitlist!

We will reach out as soon as we launch. In the meantime, visit our website to learn more about our evidence-based health platform.

Best regards,
The Evida Life Team

---
Evida Life AG · Zürich, Switzerland
hello@evidalife.com · evidalife.com

You're receiving this email because you signed up for the Evida Life waitlist. If that wasn't you, you can safely ignore this email.`,
  },
} as const;

type Lang = keyof typeof EMAIL_CONTENT;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { email?: string; lang?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, lang } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const locale: Lang = lang === 'en' ? 'en' : 'de';
  const content = EMAIL_CONTENT[locale];

  // ── Log to console (replace with your email provider below) ──────────────
  console.log('[waitlist-confirmation] Sending confirmation email:', {
    to: email,
    subject: content.subject,
    body: content.body,
    locale,
  });

  // ── Resend integration (uncomment when RESEND_API_KEY is configured) ──────
  //
  // const resendKey = process.env.RESEND_API_KEY;
  // if (resendKey) {
  //   const res = await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: {
  //       'Authorization': `Bearer ${resendKey}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       from: 'Evida Life <noreply@evidalife.com>',
  //       to: email,
  //       subject: content.subject,
  //       text: content.body,
  //     }),
  //   });
  //   if (!res.ok) {
  //     const err = await res.json();
  //     console.error('[waitlist-confirmation] Resend error:', err);
  //     return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
  //   }
  // }

  // ── Mailgun integration (uncomment when MAILGUN_API_KEY is configured) ────
  //
  // const mgKey = process.env.MAILGUN_API_KEY;
  // const mgDomain = process.env.MAILGUN_DOMAIN;
  // if (mgKey && mgDomain) {
  //   const form = new URLSearchParams({
  //     from: 'Evida Life <noreply@evidalife.com>',
  //     to: email,
  //     subject: content.subject,
  //     text: content.body,
  //   });
  //   await fetch(`https://api.mailgun.net/v3/${mgDomain}/messages`, {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Basic ${Buffer.from(`api:${mgKey}`).toString('base64')}`,
  //       'Content-Type': 'application/x-www-form-urlencoded',
  //     },
  //     body: form.toString(),
  //   });
  // }

  return NextResponse.json({ ok: true });
}
