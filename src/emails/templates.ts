// src/emails/templates.ts
// ========================================================================
// EVIDALIFE EMAIL TEMPLATE SYSTEM
// ========================================================================
// 5 transactional email templates with inline CSS, 5-language support
// Uses Resend API — drop into src/emails/ and import where needed
// Brand: dark teal #0e393d, gold #C4A96A, cream #fafaf8, green #0C9C6C
// ========================================================================

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

interface BaseEmailData {
  lang: Lang;
  firstName: string;
  siteUrl?: string;
}

// ── Shared layout shell (used by all 10 templates) ────────────────────

export function buildEmailShell(opts: {
  heading: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaText?: string;
  footerNote?: string;
  preheader?: string;
}): string {
  const ctaBlock = opts.ctaUrl ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto 0;">
        <tr><td style="background-color:#ceab84;border-radius:12px;text-align:center;">
          <a href="${opts.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">${opts.ctaText ?? 'Continue'}</a>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:rgba(28,42,43,0.35);text-align:center;">
        If the button doesn't work, copy this link:<br>
        <a href="${opts.ctaUrl}" style="color:#ceab84;word-break:break-all;">${opts.ctaUrl}</a>
      </p>` : '';
  const footerNoteBlock = opts.footerNote ? `
      <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:rgba(28,42,43,0.5);">${opts.footerNote}</p>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap');
  body{margin:0;padding:0;background:#f7f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  .subtext{font-size:16px;color:#5f5e5a;line-height:1.6;margin:0 0 28px}
  .section-title{font-size:12px;color:#ceab84;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:32px 0 16px;padding-bottom:8px;border-bottom:1px solid rgba(14,57,61,0.08)}
  .card{background:#fafaf8;border-radius:12px;padding:20px 24px;margin:0 0 16px;border:1px solid rgba(14,57,61,0.06)}
  .btn{display:inline-block;background:#0e393d;color:#ffffff !important;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:600;text-decoration:none;text-align:center;margin:8px 0}
  .btn-outline{display:inline-block;background:transparent;color:#0e393d !important;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:600;text-decoration:none;border:2px solid rgba(14,57,61,0.15)}
  .btn-gold{display:inline-block;background:#ceab84;color:#ffffff !important;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:600;text-decoration:none}
  .divider{height:1px;background:rgba(14,57,61,0.08);margin:28px 0}
  .highlight-box{background:linear-gradient(135deg,#0e393d 0%,#145a54 100%);border-radius:12px;padding:24px;text-align:center;margin:24px 0}
  .highlight-score{font-size:48px;font-weight:800;color:#0C9C6C;margin:0}
  .highlight-label{font-size:14px;color:rgba(255,255,255,0.7);margin:4px 0 0}
  .badge{display:inline-block;background:#0C9C6C;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px}
  .badge-gold{background:#ceab84}
  .badge-warn{background:#ef9f27}
  .item-row{padding:12px 0;border-bottom:1px solid rgba(14,57,61,0.05)}
  .item-row:last-child{border-bottom:none}
  .item-name{font-size:15px;color:#0e393d;font-weight:600}
  .item-detail{font-size:13px;color:#888780;margin-top:2px}
  .item-price{font-size:15px;color:#0e393d;font-weight:700;text-align:right}
  .total-row{padding:16px 0;border-top:2px solid #0e393d}
  .total-label{font-size:16px;color:#0e393d;font-weight:700}
  .total-price{font-size:20px;color:#0e393d;font-weight:800}
  .preheader{display:none !important;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f7f5f0}
  @media(max-width:620px){.inner-td{padding:28px 24px !important}}
</style>
</head>
<body>
<div class="preheader">${opts.preheader ?? ''}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#0e393d;padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;">
        <img src="https://evidalife.com/logo-email.png" width="44" height="44" alt="Evida Life" style="border-radius:50%;display:block;margin:0 auto 12px;" onerror="this.style.display='none'">
        <span style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">EVIDA LIFE</span>
      </td></tr>
      <tr><td style="background:#ceab84;height:3px;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td class="inner-td" style="background:#ffffff;padding:44px 40px;border-radius:0 0 16px 16px;">
        <h1 style="margin:0 0 20px;font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#0e393d;line-height:1.3;">${opts.heading}</h1>
        ${opts.bodyHtml}
        ${ctaBlock}
        ${footerNoteBlock}
      </td></tr>
      <tr><td style="padding:24px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(28,42,43,0.4);">
          Evida Life AG &middot; Switzerland<br>
          <a href="https://evidalife.com" style="color:#ceab84;text-decoration:none;">evidalife.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── 1. WELCOME EMAIL ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface WelcomeEmailData extends BaseEmailData {}

const WELCOME_T: Record<Lang, {
  subject: string;
  preheader: string;
  greeting: string;
  intro: string;
  whatNext: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  ctaTracker: string;
  ctaShop: string;
  closing: string;
}> = {
  en: {
    subject: 'Welcome to Evidalife — your longevity journey starts now',
    preheader: 'Start tracking your Daily Dozen and explore your health dashboard',
    greeting: 'Welcome',
    intro: 'Your account is ready. Evidalife combines evidence-based nutrition with precision lab testing to help you live longer and healthier.',
    whatNext: 'What you can do now',
    step1Title: 'Track your Daily Dozen',
    step1Desc: 'The 12 food categories proven to support longevity. Tap to track — it takes 30 seconds.',
    step2Title: 'Explore plant-based recipes',
    step2Desc: 'Whole-food recipes tagged by Daily Dozen category, health goal, and difficulty.',
    step3Title: 'Get your blood tested',
    step3Desc: 'Up to 57 biomarkers analyzed with your personal Health Engine score.',
    ctaTracker: 'Start tracking today',
    ctaShop: 'Explore test packages',
    closing: 'Questions? Just reply to this email — we read every message.',
  },
  de: {
    subject: 'Willkommen bei Evidalife — dein Weg zur Langlebigkeit beginnt jetzt',
    preheader: 'Starte deinen Daily Dozen Tracker und entdecke dein Gesundheits-Dashboard',
    greeting: 'Willkommen',
    intro: 'Dein Konto ist bereit. Evidalife kombiniert evidenzbasierte Ernährung mit präzisen Labortests, damit du länger und gesünder lebst.',
    whatNext: 'Das kannst du jetzt tun',
    step1Title: 'Tracke dein Daily Dozen',
    step1Desc: 'Die 12 Lebensmittelkategorien, die nachweislich Langlebigkeit fördern. Tippe zum Tracken — dauert 30 Sekunden.',
    step2Title: 'Entdecke pflanzliche Rezepte',
    step2Desc: 'Vollwertige Rezepte nach Daily Dozen Kategorie, Gesundheitsziel und Schwierigkeit.',
    step3Title: 'Lass dein Blut testen',
    step3Desc: 'Bis zu 57 Biomarker analysiert mit deinem persönlichen Health Engine Score.',
    ctaTracker: 'Jetzt tracken',
    ctaShop: 'Testpakete entdecken',
    closing: 'Fragen? Antworte einfach auf diese E-Mail — wir lesen jede Nachricht.',
  },
  fr: {
    subject: 'Bienvenue chez Evidalife — votre parcours longévité commence maintenant',
    preheader: 'Commencez à suivre votre Daily Dozen et explorez votre tableau de bord santé',
    greeting: 'Bienvenue',
    intro: 'Votre compte est prêt. Evidalife combine nutrition fondée sur les preuves et analyses de laboratoire de précision pour vous aider à vivre plus longtemps et en meilleure santé.',
    whatNext: 'Ce que vous pouvez faire maintenant',
    step1Title: 'Suivez votre Daily Dozen',
    step1Desc: 'Les 12 catégories alimentaires prouvées pour soutenir la longévité.',
    step2Title: 'Découvrez des recettes végétales',
    step2Desc: 'Des recettes complètes classées par catégorie Daily Dozen et objectif santé.',
    step3Title: 'Faites analyser votre sang',
    step3Desc: "Jusqu'à 57 biomarqueurs analysés avec votre score Health Engine personnel.",
    ctaTracker: 'Commencer le suivi',
    ctaShop: 'Découvrir les packs',
    closing: 'Des questions ? Répondez simplement à cet email.',
  },
  es: {
    subject: 'Bienvenido a Evidalife — tu viaje de longevidad comienza ahora',
    preheader: 'Empieza a rastrear tu Daily Dozen y explora tu panel de salud',
    greeting: 'Bienvenido',
    intro: 'Tu cuenta está lista. Evidalife combina nutrición basada en evidencia con análisis de laboratorio de precisión para ayudarte a vivir más y mejor.',
    whatNext: 'Qué puedes hacer ahora',
    step1Title: 'Rastrea tu Daily Dozen',
    step1Desc: 'Las 12 categorías de alimentos demostradas para apoyar la longevidad.',
    step2Title: 'Explora recetas vegetales',
    step2Desc: 'Recetas integrales por categoría Daily Dozen y objetivo de salud.',
    step3Title: 'Hazte un análisis de sangre',
    step3Desc: 'Hasta 57 biomarcadores analizados con tu puntuación Health Engine personal.',
    ctaTracker: 'Empieza hoy',
    ctaShop: 'Explorar paquetes',
    closing: '¿Preguntas? Responde a este email — leemos cada mensaje.',
  },
  it: {
    subject: 'Benvenuto su Evidalife — il tuo percorso di longevità inizia ora',
    preheader: 'Inizia a tracciare il tuo Daily Dozen e esplora la tua dashboard salute',
    greeting: 'Benvenuto',
    intro: "Il tuo account è pronto. Evidalife combina nutrizione basata sull'evidenza con test di laboratorio di precisione per aiutarti a vivere più a lungo e in salute.",
    whatNext: 'Cosa puoi fare adesso',
    step1Title: 'Traccia il tuo Daily Dozen',
    step1Desc: 'Le 12 categorie alimentari dimostrate per supportare la longevità.',
    step2Title: 'Scopri ricette vegetali',
    step2Desc: 'Ricette integrali per categoria Daily Dozen e obiettivo salute.',
    step3Title: 'Fai analizzare il tuo sangue',
    step3Desc: 'Fino a 57 biomarcatori analizzati con il tuo punteggio Health Engine personale.',
    ctaTracker: 'Inizia oggi',
    ctaShop: 'Scopri i pacchetti',
    closing: 'Domande? Rispondi a questa email — leggiamo ogni messaggio.',
  },
};

export function buildWelcomeEmail({ lang, firstName }: WelcomeEmailData) {
  const t = WELCOME_T[lang] || WELCOME_T.en;
  const url = 'https://evidalife.com';

  const bodyHtml = `
  <p class="subtext">${t.intro}</p>

  <div class="section-title">${t.whatNext}</div>

  <div class="card">
    <div style="font-size:15px;font-weight:700;color:#0e393d;margin-bottom:4px">1. ${t.step1Title}</div>
    <div style="font-size:14px;color:#5f5e5a;line-height:1.5">${t.step1Desc}</div>
  </div>
  <div class="card">
    <div style="font-size:15px;font-weight:700;color:#0e393d;margin-bottom:4px">2. ${t.step2Title}</div>
    <div style="font-size:14px;color:#5f5e5a;line-height:1.5">${t.step2Desc}</div>
  </div>
  <div class="card">
    <div style="font-size:15px;font-weight:700;color:#0e393d;margin-bottom:4px">3. ${t.step3Title}</div>
    <div style="font-size:14px;color:#5f5e5a;line-height:1.5">${t.step3Desc}</div>
  </div>

  <div style="text-align:center;margin:32px 0 8px">
    <a href="${url}/${lang}/daily-dozen" class="btn">${t.ctaTracker}</a>
  </div>
  <div style="text-align:center;margin:0 0 24px">
    <a href="${url}/${lang}/shop" class="btn-outline">${t.ctaShop}</a>
  </div>

  <div class="divider"></div>
  <p style="font-size:14px;color:#888780;text-align:center;margin:0">${t.closing}</p>`;

  return {
    subject: t.subject,
    html: buildEmailShell({ heading: `${t.greeting}, ${firstName} 👋`, bodyHtml, preheader: t.preheader }),
  };
}


// ── 2. ORDER CONFIRMATION EMAIL ────────────────────────────────────────

interface OrderItem {
  name: string;
  quantity: number;
  price: number; // in CHF
}

interface OrderEmailData extends BaseEmailData {
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
}

const ORDER_T: Record<Lang, {
  subject: (orderNum: string) => string;
  preheader: string;
  greeting: string;
  intro: string;
  orderDetails: string;
  item: string;
  qty: string;
  price: string;
  subtotal: string;
  vat: string;
  total: string;
  nextSteps: string;
  step1: string;
  step2: string;
  step3: string;
  ctaOrders: string;
  invoiceNote: string;
}> = {
  en: {
    subject: (n) => `Order confirmed — #${n}`,
    preheader: 'Your Evidalife order has been confirmed. Here are your details.',
    greeting: 'Order confirmed',
    intro: 'Thank you for your order. We\'re preparing everything for you.',
    orderDetails: 'Order details',
    item: 'Item',
    qty: 'Qty',
    price: 'Price',
    subtotal: 'Subtotal',
    vat: 'VAT (8.1%)',
    total: 'Total',
    nextSteps: 'What happens next',
    step1: 'You\'ll receive a voucher for your partner lab within 24 hours.',
    step2: 'Book your appointment at any partner lab location.',
    step3: 'Results appear in your Health Engine dashboard within 5–7 business days.',
    ctaOrders: 'View your orders',
    invoiceNote: 'Your invoice is available in your account under "My Orders".',
  },
  de: {
    subject: (n) => `Bestellung bestätigt — #${n}`,
    preheader: 'Deine Evidalife-Bestellung wurde bestätigt.',
    greeting: 'Bestellung bestätigt',
    intro: 'Vielen Dank für deine Bestellung. Wir bereiten alles für dich vor.',
    orderDetails: 'Bestelldetails',
    item: 'Artikel',
    qty: 'Menge',
    price: 'Preis',
    subtotal: 'Zwischensumme',
    vat: 'MwSt. (8,1%)',
    total: 'Gesamt',
    nextSteps: 'Wie es weitergeht',
    step1: 'Du erhältst innerhalb von 24 Stunden einen Gutschein für dein Partnerlabor.',
    step2: 'Buche deinen Termin bei einem Partnerlabor-Standort.',
    step3: 'Ergebnisse erscheinen innerhalb von 5–7 Werktagen in deinem Health Engine Dashboard.',
    ctaOrders: 'Bestellungen ansehen',
    invoiceNote: 'Deine Rechnung findest du in deinem Konto unter «Meine Bestellungen».',
  },
  fr: {
    subject: (n) => `Commande confirmée — #${n}`,
    preheader: 'Votre commande Evidalife a été confirmée.',
    greeting: 'Commande confirmée',
    intro: 'Merci pour votre commande. Nous préparons tout pour vous.',
    orderDetails: 'Détails de la commande',
    item: 'Article',
    qty: 'Qté',
    price: 'Prix',
    subtotal: 'Sous-total',
    vat: 'TVA (8,1%)',
    total: 'Total',
    nextSteps: 'Prochaines étapes',
    step1: 'Vous recevrez un bon pour votre laboratoire partenaire sous 24 heures.',
    step2: 'Réservez votre rendez-vous dans un laboratoire partenaire.',
    step3: 'Les résultats apparaîtront dans votre tableau de bord Health Engine sous 5 à 7 jours ouvrés.',
    ctaOrders: 'Voir vos commandes',
    invoiceNote: 'Votre facture est disponible dans votre compte sous « Mes commandes ».',
  },
  es: {
    subject: (n) => `Pedido confirmado — #${n}`,
    preheader: 'Tu pedido de Evidalife ha sido confirmado.',
    greeting: 'Pedido confirmado',
    intro: 'Gracias por tu pedido. Estamos preparando todo para ti.',
    orderDetails: 'Detalles del pedido',
    item: 'Artículo',
    qty: 'Cant.',
    price: 'Precio',
    subtotal: 'Subtotal',
    vat: 'IVA (8,1%)',
    total: 'Total',
    nextSteps: 'Próximos pasos',
    step1: 'Recibirás un vale para tu laboratorio asociado en 24 horas.',
    step2: 'Reserva tu cita en un laboratorio asociado.',
    step3: 'Los resultados aparecerán en tu panel Health Engine en 5–7 días hábiles.',
    ctaOrders: 'Ver tus pedidos',
    invoiceNote: 'Tu factura está disponible en tu cuenta bajo « Mis pedidos ».',
  },
  it: {
    subject: (n) => `Ordine confermato — #${n}`,
    preheader: 'Il tuo ordine Evidalife è stato confermato.',
    greeting: 'Ordine confermato',
    intro: 'Grazie per il tuo ordine. Stiamo preparando tutto per te.',
    orderDetails: "Dettagli dell'ordine",
    item: 'Articolo',
    qty: 'Qtà',
    price: 'Prezzo',
    subtotal: 'Subtotale',
    vat: 'IVA (8,1%)',
    total: 'Totale',
    nextSteps: 'Prossimi passi',
    step1: 'Riceverai un buono per il tuo laboratorio partner entro 24 ore.',
    step2: 'Prenota il tuo appuntamento presso un laboratorio partner.',
    step3: 'I risultati appariranno nella tua dashboard Health Engine entro 5–7 giorni lavorativi.',
    ctaOrders: 'Vedi i tuoi ordini',
    invoiceNote: 'La tua fattura è disponibile nel tuo account sotto « I miei ordini ».',
  },
};

export function buildOrderConfirmationEmail(data: OrderEmailData) {
  const t = ORDER_T[data.lang] || ORDER_T.en;
  const url = 'https://evidalife.com';
  const fmt = (n: number) => `${data.currency} ${n.toFixed(2)}`;

  const itemRows = data.items.map(item => `
    <div class="item-row" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div class="item-name">${item.name}</div>
        <div class="item-detail">${t.qty}: ${item.quantity}</div>
      </div>
      <div class="item-price">${fmt(item.price * item.quantity)}</div>
    </div>`).join('');

  const bodyHtml = `
  <p class="subtext" style="text-align:center">${t.intro}</p>

  <div class="section-title">${t.orderDetails} · #${data.orderNumber}</div>
  <div class="card">
    ${itemRows}
    <div class="divider" style="margin:12px 0"></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0">
      <span style="font-size:14px;color:#888780">${t.subtotal}</span>
      <span style="font-size:14px;color:#0e393d">${fmt(data.subtotal)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:4px 0">
      <span style="font-size:14px;color:#888780">${t.vat}</span>
      <span style="font-size:14px;color:#0e393d">${fmt(data.vat)}</span>
    </div>
    <div class="total-row" style="display:flex;justify-content:space-between;align-items:center">
      <span class="total-label">${t.total}</span>
      <span class="total-price">${fmt(data.total)}</span>
    </div>
  </div>

  <div class="section-title">${t.nextSteps}</div>
  <div class="card">
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">1.</span> ${t.step1}</div>
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">2.</span> ${t.step2}</div>
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">3.</span> ${t.step3}</div>
  </div>

  <div style="text-align:center;margin:28px 0 16px">
    <a href="${url}/${data.lang}/orders" class="btn">${t.ctaOrders}</a>
  </div>
  <p style="font-size:13px;color:#888780;text-align:center;margin:0">${t.invoiceNote}</p>`;

  return {
    subject: t.subject(data.orderNumber),
    html: buildEmailShell({ heading: `${t.greeting}, ${data.firstName}!`, bodyHtml, preheader: t.preheader }),
  };
}


// ── 3. VOUCHER / LAB BOOKING EMAIL ─────────────────────────────────────

interface VoucherEmailData extends BaseEmailData {
  orderNumber: string;
  voucherCode: string;
  packageName: string;
  labPartnerName: string;
  labAddress: string;
  labPhone?: string;
  expiresAt: string; // formatted date
}

const VOUCHER_T: Record<Lang, {
  subject: string;
  preheader: string;
  greeting: string;
  intro: (pkg: string) => string;
  voucherLabel: string;
  labInfo: string;
  howTo: string;
  step1: string;
  step2: (lab: string) => string;
  step3: string;
  step4: string;
  validUntil: string;
  ctaLabs: string;
  important: string;
  fastingNote: string;
}> = {
  en: {
    subject: 'Your lab voucher is ready — book your appointment',
    preheader: 'Your voucher code is ready. Book your lab appointment now.',
    greeting: 'Your voucher is ready',
    intro: (pkg) => `Your ${pkg} voucher has been generated. Present this code at any partner lab.`,
    voucherLabel: 'Your voucher code',
    labInfo: 'Recommended lab',
    howTo: 'How to use your voucher',
    step1: 'Call or visit the partner lab to book an appointment.',
    step2: (lab) => `Show this voucher code at ${lab} reception.`,
    step3: 'A blood sample will be taken (5–10 minutes).',
    step4: 'Results will appear in your Health Engine dashboard within 5–7 business days.',
    validUntil: 'Valid until',
    ctaLabs: 'Find partner labs',
    important: 'Important',
    fastingNote: 'Please fast for 10–12 hours before your blood draw (water is fine). Morning appointments are recommended.',
  },
  de: {
    subject: 'Dein Laborgutschein ist bereit — buche deinen Termin',
    preheader: 'Dein Gutscheincode ist bereit. Buche jetzt deinen Labortermin.',
    greeting: 'Dein Gutschein ist bereit',
    intro: (pkg) => `Dein ${pkg}-Gutschein wurde erstellt. Zeige diesen Code bei einem Partnerlabor vor.`,
    voucherLabel: 'Dein Gutscheincode',
    labInfo: 'Empfohlenes Labor',
    howTo: 'So nutzt du deinen Gutschein',
    step1: 'Rufe das Partnerlabor an oder besuche es, um einen Termin zu vereinbaren.',
    step2: (lab) => `Zeige diesen Gutscheincode am Empfang von ${lab}.`,
    step3: 'Eine Blutprobe wird entnommen (5–10 Minuten).',
    step4: 'Ergebnisse erscheinen innerhalb von 5–7 Werktagen in deinem Health Engine Dashboard.',
    validUntil: 'Gültig bis',
    ctaLabs: 'Partnerlabore finden',
    important: 'Wichtig',
    fastingNote: 'Bitte 10–12 Stunden vor der Blutentnahme nüchtern sein (Wasser ist erlaubt). Morgentermine werden empfohlen.',
  },
  fr: {
    subject: 'Votre bon de laboratoire est prêt — réservez votre rendez-vous',
    preheader: 'Votre code de bon est prêt. Réservez maintenant.',
    greeting: 'Votre bon est prêt',
    intro: (pkg) => `Votre bon ${pkg} a été généré. Présentez ce code dans un laboratoire partenaire.`,
    voucherLabel: 'Votre code de bon',
    labInfo: 'Laboratoire recommandé',
    howTo: 'Comment utiliser votre bon',
    step1: 'Appelez ou visitez le laboratoire partenaire pour prendre rendez-vous.',
    step2: (lab) => `Montrez ce code de bon à l'accueil de ${lab}.`,
    step3: 'Un échantillon de sang sera prélevé (5–10 minutes).',
    step4: 'Les résultats apparaîtront dans votre dashboard Health Engine sous 5 à 7 jours ouvrés.',
    validUntil: "Valable jusqu'au",
    ctaLabs: 'Trouver un laboratoire',
    important: 'Important',
    fastingNote: "Veuillez être à jeun 10–12 heures avant la prise de sang (l'eau est autorisée).",
  },
  es: {
    subject: 'Tu vale de laboratorio está listo — reserva tu cita',
    preheader: 'Tu código de vale está listo. Reserva ahora.',
    greeting: 'Tu vale está listo',
    intro: (pkg) => `Tu vale ${pkg} ha sido generado. Presenta este código en un laboratorio asociado.`,
    voucherLabel: 'Tu código de vale',
    labInfo: 'Laboratorio recomendado',
    howTo: 'Cómo usar tu vale',
    step1: 'Llama o visita el laboratorio asociado para reservar una cita.',
    step2: (lab) => `Muestra este código de vale en la recepción de ${lab}.`,
    step3: 'Se tomará una muestra de sangre (5–10 minutos).',
    step4: 'Los resultados aparecerán en tu panel Health Engine en 5–7 días hábiles.',
    validUntil: 'Válido hasta',
    ctaLabs: 'Buscar laboratorios',
    important: 'Importante',
    fastingNote: 'Por favor, ayuna 10–12 horas antes de la extracción de sangre (el agua está permitida).',
  },
  it: {
    subject: 'Il tuo buono laboratorio è pronto — prenota il tuo appuntamento',
    preheader: 'Il tuo codice buono è pronto. Prenota ora.',
    greeting: 'Il tuo buono è pronto',
    intro: (pkg) => `Il tuo buono ${pkg} è stato generato. Presenta questo codice in un laboratorio partner.`,
    voucherLabel: 'Il tuo codice buono',
    labInfo: 'Laboratorio consigliato',
    howTo: 'Come usare il tuo buono',
    step1: 'Chiama o visita il laboratorio partner per prenotare un appuntamento.',
    step2: (lab) => `Mostra questo codice buono alla reception di ${lab}.`,
    step3: 'Verrà prelevato un campione di sangue (5–10 minuti).',
    step4: 'I risultati appariranno nella tua dashboard Health Engine entro 5–7 giorni lavorativi.',
    validUntil: 'Valido fino al',
    ctaLabs: 'Trova laboratori',
    important: 'Importante',
    fastingNote: 'Digiuno di 10–12 ore prima del prelievo di sangue (acqua consentita).',
  },
};

export function buildVoucherEmail(data: VoucherEmailData) {
  const t = VOUCHER_T[data.lang] || VOUCHER_T.en;
  const url = 'https://evidalife.com';

  const bodyHtml = `
  <p class="subtext">${t.intro(data.packageName)}</p>

  <div class="highlight-box">
    <div style="font-size:12px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">${t.voucherLabel}</div>
    <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:4px;font-family:monospace">${data.voucherCode}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:8px">${t.validUntil}: ${data.expiresAt}</div>
  </div>

  <div class="section-title">${t.labInfo}</div>
  <div class="card">
    <div style="font-size:16px;font-weight:700;color:#0e393d;margin-bottom:4px">${data.labPartnerName}</div>
    <div style="font-size:14px;color:#5f5e5a">${data.labAddress}</div>
    ${data.labPhone ? `<div style="font-size:14px;color:#5f5e5a;margin-top:4px">${data.labPhone}</div>` : ''}
  </div>

  <div class="section-title">${t.howTo}</div>
  <div class="card">
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">1.</span> ${t.step1}</div>
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">2.</span> ${t.step2(data.labPartnerName)}</div>
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">3.</span> ${t.step3}</div>
    <div style="padding:6px 0"><span style="color:#ceab84;font-weight:700;margin-right:8px">4.</span> ${t.step4}</div>
  </div>

  <div class="card" style="border-left:3px solid #ef9f27;border-radius:0 12px 12px 0">
    <div style="font-size:13px;font-weight:700;color:#ef9f27;margin-bottom:4px">${t.important}</div>
    <div style="font-size:14px;color:#5f5e5a;line-height:1.5">${t.fastingNote}</div>
  </div>

  <div style="text-align:center;margin:28px 0">
    <a href="${url}/${data.lang}/partner-labs" class="btn">${t.ctaLabs}</a>
  </div>`;

  return {
    subject: t.subject,
    html: buildEmailShell({ heading: `${t.greeting}, ${data.firstName}!`, bodyHtml, preheader: t.preheader }),
  };
}


// ── 4. RESULTS READY EMAIL ─────────────────────────────────────────────

interface ResultsEmailData extends BaseEmailData {
  longevityScore: number;
  bioAge?: number;
  chronoAge?: number;
  domainHighlight?: string; // e.g. "Metabolism improved by 12 points"
  biomarkersCount: number;
}

const RESULTS_T: Record<Lang, {
  subject: string;
  preheader: (score: number) => string;
  greeting: string;
  intro: string;
  scoreLabel: string;
  scoreSubtext: (count: number) => string;
  bioAgeLabel: string;
  chronoLabel: string;
  yearsDiff: (diff: number) => string;
  ctaDashboard: string;
  tip: string;
  tipText: string;
}> = {
  en: {
    subject: 'Your lab results are ready — see your Longevity Score',
    preheader: (s) => `Your Longevity Score: ${s}/100. View your full results now.`,
    greeting: 'Your results are in',
    intro: 'Your blood analysis is complete. Here is your personalized health summary.',
    scoreLabel: 'Longevity Score',
    scoreSubtext: (n) => `Based on ${n} biomarker results`,
    bioAgeLabel: 'Biological Age',
    chronoLabel: 'Chronological Age',
    yearsDiff: (d) => d < 0 ? `${Math.abs(d)} years younger` : d > 0 ? `${d} years older` : 'Same as chronological',
    ctaDashboard: 'View full results',
    tip: 'What to do next',
    tipText: 'Your Health Engine dashboard shows detailed results for every biomarker, trend charts, and personalized recommendations. Check it out to see what\'s working and where you can improve.',
  },
  de: {
    subject: 'Deine Laborergebnisse sind da — sieh deinen Longevity Score',
    preheader: (s) => `Dein Longevity Score: ${s}/100. Sieh dir jetzt deine Ergebnisse an.`,
    greeting: 'Deine Ergebnisse sind da',
    intro: 'Deine Blutanalyse ist abgeschlossen. Hier ist deine personalisierte Gesundheitsübersicht.',
    scoreLabel: 'Longevity Score',
    scoreSubtext: (n) => `Basierend auf ${n} Biomarker-Ergebnissen`,
    bioAgeLabel: 'Biologisches Alter',
    chronoLabel: 'Chronologisches Alter',
    yearsDiff: (d) => d < 0 ? `${Math.abs(d)} Jahre jünger` : d > 0 ? `${d} Jahre älter` : 'Gleich wie chronologisch',
    ctaDashboard: 'Alle Ergebnisse ansehen',
    tip: 'Was du als nächstes tun kannst',
    tipText: 'Dein Health Engine Dashboard zeigt detaillierte Ergebnisse für jeden Biomarker, Trenddiagramme und personalisierte Empfehlungen.',
  },
  fr: {
    subject: 'Vos résultats de laboratoire sont prêts — découvrez votre Longevity Score',
    preheader: (s) => `Votre Longevity Score : ${s}/100. Consultez vos résultats.`,
    greeting: 'Vos résultats sont arrivés',
    intro: 'Votre analyse sanguine est terminée. Voici votre résumé santé personnalisé.',
    scoreLabel: 'Longevity Score',
    scoreSubtext: (n) => `Basé sur ${n} résultats de biomarqueurs`,
    bioAgeLabel: 'Âge biologique',
    chronoLabel: 'Âge chronologique',
    yearsDiff: (d) => d < 0 ? `${Math.abs(d)} ans plus jeune` : d > 0 ? `${d} ans plus vieux` : 'Identique au chronologique',
    ctaDashboard: 'Voir tous les résultats',
    tip: 'Que faire ensuite',
    tipText: 'Votre tableau de bord Health Engine montre les résultats détaillés, les graphiques de tendance et les recommandations personnalisées.',
  },
  es: {
    subject: 'Tus resultados de laboratorio están listos — ve tu Longevity Score',
    preheader: (s) => `Tu Longevity Score: ${s}/100. Consulta tus resultados ahora.`,
    greeting: 'Tus resultados están listos',
    intro: 'Tu análisis de sangre está completo. Aquí está tu resumen de salud personalizado.',
    scoreLabel: 'Longevity Score',
    scoreSubtext: (n) => `Basado en ${n} resultados de biomarcadores`,
    bioAgeLabel: 'Edad biológica',
    chronoLabel: 'Edad cronológica',
    yearsDiff: (d) => d < 0 ? `${Math.abs(d)} años más joven` : d > 0 ? `${d} años mayor` : 'Igual a la cronológica',
    ctaDashboard: 'Ver todos los resultados',
    tip: 'Qué hacer a continuación',
    tipText: 'Tu panel Health Engine muestra resultados detallados, gráficos de tendencia y recomendaciones personalizadas.',
  },
  it: {
    subject: 'I tuoi risultati di laboratorio sono pronti — vedi il tuo Longevity Score',
    preheader: (s) => `Il tuo Longevity Score: ${s}/100. Visualizza i tuoi risultati.`,
    greeting: 'I tuoi risultati sono pronti',
    intro: 'La tua analisi del sangue è completa. Ecco il tuo riepilogo salute personalizzato.',
    scoreLabel: 'Longevity Score',
    scoreSubtext: (n) => `Basato su ${n} risultati di biomarcatori`,
    bioAgeLabel: 'Età biologica',
    chronoLabel: 'Età cronologica',
    yearsDiff: (d) => d < 0 ? `${Math.abs(d)} anni più giovane` : d > 0 ? `${d} anni più vecchio` : 'Uguale alla cronologica',
    ctaDashboard: 'Vedi tutti i risultati',
    tip: 'Cosa fare dopo',
    tipText: 'La tua dashboard Health Engine mostra risultati dettagliati, grafici di tendenza e raccomandazioni personalizzate.',
  },
};

export function buildResultsReadyEmail(data: ResultsEmailData) {
  const t = RESULTS_T[data.lang] || RESULTS_T.en;
  const url = 'https://evidalife.com';
  const scoreColor = data.longevityScore >= 85 ? '#0C9C6C' : data.longevityScore >= 70 ? '#C4A96A' : '#E24B4A';
  const ageDiff = data.bioAge && data.chronoAge ? data.bioAge - data.chronoAge : null;

  const bioAgeSection = data.bioAge && data.chronoAge ? `
  <div class="section-title">${t.bioAgeLabel}</div>
  <div class="card" style="display:flex;justify-content:space-around;text-align:center">
    <div>
      <div style="font-size:36px;font-weight:800;color:#0e393d">${data.bioAge}</div>
      <div style="font-size:12px;color:#888780">${t.bioAgeLabel}</div>
    </div>
    <div style="width:1px;background:rgba(14,57,61,0.1)"></div>
    <div>
      <div style="font-size:36px;font-weight:800;color:#888780">${data.chronoAge}</div>
      <div style="font-size:12px;color:#888780">${t.chronoLabel}</div>
    </div>
  </div>
  ${ageDiff !== null ? `<p style="text-align:center;font-size:14px;color:${ageDiff <= 0 ? '#0C9C6C' : '#E24B4A'};font-weight:600;margin:8px 0 0">${t.yearsDiff(ageDiff)}</p>` : ''}
  ` : '';

  const bodyHtml = `
  <p class="subtext">${t.intro}</p>

  <div class="highlight-box">
    <div class="highlight-label">${t.scoreLabel}</div>
    <div class="highlight-score" style="color:${scoreColor}">${data.longevityScore}</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px">${t.scoreSubtext(data.biomarkersCount)}</div>
  </div>

  ${bioAgeSection}

  ${data.domainHighlight ? `
  <div class="card" style="border-left:3px solid #0C9C6C;border-radius:0 12px 12px 0">
    <div style="font-size:14px;color:#0e393d;font-weight:600">${data.domainHighlight}</div>
  </div>` : ''}

  <div style="text-align:center;margin:32px 0 16px">
    <a href="${url}/${data.lang}/health-engine" class="btn-gold">${t.ctaDashboard}</a>
  </div>

  <div class="divider"></div>
  <div style="font-size:13px;font-weight:700;color:#ceab84;margin-bottom:6px">${t.tip}</div>
  <p style="font-size:14px;color:#5f5e5a;line-height:1.5;margin:0">${t.tipText}</p>`;

  return {
    subject: t.subject,
    html: buildEmailShell({ heading: `${t.greeting}, ${data.firstName}!`, bodyHtml, preheader: t.preheader(data.longevityScore) }),
  };
}


// ── 5. SAMPLE COLLECTED / PROCESSING EMAIL ─────────────────────────────

interface ProcessingEmailData extends BaseEmailData {
  orderNumber: string;
  packageName: string;
  collectedDate: string;
  estimatedResultsDate: string;
}

const PROCESSING_T: Record<Lang, {
  subject: string;
  preheader: string;
  greeting: string;
  intro: string;
  status: string;
  collected: string;
  processing: string;
  estimatedResults: string;
  whileYouWait: string;
  tip1: string;
  tip2: string;
  ctaTracker: string;
}> = {
  en: {
    subject: 'Your blood sample is being analyzed',
    preheader: 'We received your sample and analysis is underway. Results expected soon.',
    greeting: 'Sample received',
    intro: 'Your blood sample has arrived at the lab and analysis is underway.',
    status: 'Status',
    collected: 'Sample collected',
    processing: 'Lab analysis in progress',
    estimatedResults: 'Estimated results',
    whileYouWait: 'While you wait',
    tip1: 'Track your Daily Dozen to start building your nutrition baseline.',
    tip2: 'Explore our recipe collection for evidence-based meal ideas.',
    ctaTracker: 'Open Daily Dozen Tracker',
  },
  de: {
    subject: 'Deine Blutprobe wird analysiert',
    preheader: 'Wir haben deine Probe erhalten und die Analyse läuft.',
    greeting: 'Probe eingegangen',
    intro: 'Deine Blutprobe ist im Labor eingetroffen und wird analysiert.',
    status: 'Status',
    collected: 'Probe entnommen',
    processing: 'Laboranalyse in Bearbeitung',
    estimatedResults: 'Ergebnisse voraussichtlich',
    whileYouWait: 'In der Zwischenzeit',
    tip1: 'Tracke dein Daily Dozen, um dein Ernährungs-Baseline aufzubauen.',
    tip2: 'Entdecke unsere Rezeptsammlung für evidenzbasierte Mahlzeiten.',
    ctaTracker: 'Daily Dozen Tracker öffnen',
  },
  fr: {
    subject: 'Votre échantillon sanguin est en cours d\'analyse',
    preheader: 'Nous avons reçu votre échantillon. Résultats attendus bientôt.',
    greeting: 'Échantillon reçu',
    intro: 'Votre échantillon sanguin est arrivé au laboratoire et l\'analyse est en cours.',
    status: 'Statut',
    collected: 'Échantillon prélevé',
    processing: 'Analyse en cours',
    estimatedResults: 'Résultats estimés',
    whileYouWait: 'En attendant',
    tip1: 'Suivez votre Daily Dozen pour construire votre base nutritionnelle.',
    tip2: 'Explorez notre collection de recettes fondées sur les preuves.',
    ctaTracker: 'Ouvrir le tracker Daily Dozen',
  },
  es: {
    subject: 'Tu muestra de sangre está siendo analizada',
    preheader: 'Recibimos tu muestra y el análisis está en curso.',
    greeting: 'Muestra recibida',
    intro: 'Tu muestra de sangre ha llegado al laboratorio y el análisis está en curso.',
    status: 'Estado',
    collected: 'Muestra recolectada',
    processing: 'Análisis de laboratorio en progreso',
    estimatedResults: 'Resultados estimados',
    whileYouWait: 'Mientras esperas',
    tip1: 'Rastrea tu Daily Dozen para construir tu base nutricional.',
    tip2: 'Explora nuestra colección de recetas basadas en evidencia.',
    ctaTracker: 'Abrir tracker Daily Dozen',
  },
  it: {
    subject: 'Il tuo campione di sangue è in fase di analisi',
    preheader: 'Abbiamo ricevuto il tuo campione. Risultati attesi a breve.',
    greeting: 'Campione ricevuto',
    intro: "Il tuo campione di sangue è arrivato in laboratorio e l'analisi è in corso.",
    status: 'Stato',
    collected: 'Campione prelevato',
    processing: 'Analisi di laboratorio in corso',
    estimatedResults: 'Risultati previsti',
    whileYouWait: 'Nel frattempo',
    tip1: 'Traccia il tuo Daily Dozen per costruire la tua base nutrizionale.',
    tip2: 'Esplora la nostra raccolta di ricette basate sulle prove.',
    ctaTracker: 'Apri tracker Daily Dozen',
  },
};

export function buildProcessingEmail(data: ProcessingEmailData) {
  const t = PROCESSING_T[data.lang] || PROCESSING_T.en;
  const url = 'https://evidalife.com';

  const bodyHtml = `
  <div style="text-align:center;margin-bottom:24px">
    <span class="badge badge-gold">${t.processing}</span>
  </div>
  <p class="subtext">${t.intro}</p>

  <div class="section-title">${t.status}</div>
  <div class="card">
    <div style="padding:8px 0;display:flex;align-items:center">
      <div style="width:24px;height:24px;border-radius:50%;background:#0C9C6C;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0">
        <span style="color:#fff;font-size:12px;font-weight:700">✓</span>
      </div>
      <div>
        <div style="font-size:14px;color:#0e393d;font-weight:600">${t.collected}</div>
        <div style="font-size:13px;color:#888780">${data.collectedDate}</div>
      </div>
    </div>
    <div style="margin-left:12px;width:1px;height:20px;background:rgba(14,57,61,0.1)"></div>
    <div style="padding:8px 0;display:flex;align-items:center">
      <div style="width:24px;height:24px;border-radius:50%;background:#ceab84;display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0">
        <span style="color:#fff;font-size:14px">⏳</span>
      </div>
      <div>
        <div style="font-size:14px;color:#0e393d;font-weight:600">${t.processing}</div>
        <div style="font-size:13px;color:#888780">${data.packageName} · #${data.orderNumber}</div>
      </div>
    </div>
    <div style="margin-left:12px;width:1px;height:20px;background:rgba(14,57,61,0.1)"></div>
    <div style="padding:8px 0;display:flex;align-items:center;opacity:0.5">
      <div style="width:24px;height:24px;border-radius:50%;border:2px dashed rgba(14,57,61,0.2);display:flex;align-items:center;justify-content:center;margin-right:12px;flex-shrink:0">
      </div>
      <div>
        <div style="font-size:14px;color:#0e393d;font-weight:600">${t.estimatedResults}</div>
        <div style="font-size:13px;color:#888780">${data.estimatedResultsDate}</div>
      </div>
    </div>
  </div>

  <div class="section-title">${t.whileYouWait}</div>
  <div class="card">
    <div style="padding:6px 0;font-size:14px;color:#5f5e5a;line-height:1.5">${t.tip1}</div>
    <div style="padding:6px 0;font-size:14px;color:#5f5e5a;line-height:1.5">${t.tip2}</div>
  </div>

  <div style="text-align:center;margin:28px 0">
    <a href="${url}/${data.lang}/daily-dozen" class="btn">${t.ctaTracker}</a>
  </div>`;

  return {
    subject: t.subject,
    html: buildEmailShell({ heading: `${t.greeting}, ${data.firstName}!`, bodyHtml, preheader: t.preheader }),
  };
}
