'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useCart } from '@/lib/cart';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  product_name: string | null;
  product_sku: string | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const T: Record<Lang, {
  verifying: string;
  orderNumber: string;
  email: string;
  items: string;
  total: string;
  nextSteps: string;
  step1: string;
  step2: string;
  step3: string;
  viewOrders: string;
  backToShop: string;
  dashboard: string;
  error: string;
  errorSub: string;
  pending: string;
  pendingSub: string;
}> = {
  en: {
    verifying: 'Verifying your payment…',
    orderNumber: 'Order',
    email: 'Confirmation sent to',
    items: 'Items',
    total: 'Total',
    nextSteps: 'What happens next?',
    step1: 'You\'ll receive a confirmation email with your order details and invoice.',
    step2: 'We\'ll notify you when your test kit voucher is ready.',
    step3: 'Visit a partner lab, get tested, and your results will appear in your dashboard.',
    viewOrders: 'View my orders',
    backToShop: 'Back to shop',
    dashboard: 'Go to dashboard',
    error: 'Something went wrong',
    errorSub: 'We couldn\'t verify your payment. If you were charged, please contact us.',
    pending: 'Payment processing',
    pendingSub: 'Your payment is still being processed. Please check back in a moment.',
  },
  de: {
    verifying: 'Zahlung wird überprüft…',
    orderNumber: 'Bestellung',
    email: 'Bestätigung gesendet an',
    items: 'Artikel',
    total: 'Gesamtbetrag',
    nextSteps: 'Wie geht es weiter?',
    step1: 'Du erhältst eine Bestätigungs-E-Mail mit deinen Bestelldetails und Rechnung.',
    step2: 'Wir benachrichtigen dich, wenn dein Testkit-Gutschein bereit ist.',
    step3: 'Besuche ein Partnerlabor, lass dich testen, und deine Ergebnisse erscheinen in deinem Dashboard.',
    viewOrders: 'Meine Bestellungen',
    backToShop: 'Zurück zum Shop',
    dashboard: 'Zum Dashboard',
    error: 'Etwas ist schiefgelaufen',
    errorSub: 'Wir konnten deine Zahlung nicht verifizieren. Falls du belastet wurdest, kontaktiere uns bitte.',
    pending: 'Zahlung wird bearbeitet',
    pendingSub: 'Deine Zahlung wird noch bearbeitet. Bitte versuche es in einem Moment erneut.',
  },
  fr: {
    verifying: 'Vérification du paiement…',
    orderNumber: 'Commande',
    email: 'Confirmation envoyée à',
    items: 'Articles',
    total: 'Total',
    nextSteps: 'Et maintenant ?',
    step1: 'Vous recevrez un e-mail de confirmation avec les détails de votre commande et facture.',
    step2: 'Nous vous informerons quand votre bon de test sera prêt.',
    step3: 'Rendez-vous dans un laboratoire partenaire, faites le test, et vos résultats apparaîtront dans votre tableau de bord.',
    viewOrders: 'Mes commandes',
    backToShop: 'Retour à la boutique',
    dashboard: 'Tableau de bord',
    error: 'Un problème est survenu',
    errorSub: 'Nous n\'avons pas pu vérifier votre paiement. Si vous avez été débité, contactez-nous.',
    pending: 'Paiement en cours',
    pendingSub: 'Votre paiement est encore en cours de traitement. Veuillez réessayer dans un instant.',
  },
  es: {
    verifying: 'Verificando tu pago…',
    orderNumber: 'Pedido',
    email: 'Confirmación enviada a',
    items: 'Artículos',
    total: 'Total',
    nextSteps: '¿Qué sigue?',
    step1: 'Recibirás un correo de confirmación con los detalles de tu pedido y factura.',
    step2: 'Te notificaremos cuando tu vale de prueba esté listo.',
    step3: 'Visita un laboratorio asociado, hazte la prueba, y tus resultados aparecerán en tu panel.',
    viewOrders: 'Mis pedidos',
    backToShop: 'Volver a la tienda',
    dashboard: 'Panel de salud',
    error: 'Algo salió mal',
    errorSub: 'No pudimos verificar tu pago. Si se te cobró, por favor contáctanos.',
    pending: 'Pago en proceso',
    pendingSub: 'Tu pago aún se está procesando. Por favor, vuelve a verificar en un momento.',
  },
  it: {
    verifying: 'Verifica del pagamento…',
    orderNumber: 'Ordine',
    email: 'Conferma inviata a',
    items: 'Articoli',
    total: 'Totale',
    nextSteps: 'E adesso?',
    step1: 'Riceverai un\'e-mail di conferma con i dettagli dell\'ordine e la fattura.',
    step2: 'Ti avviseremo quando il tuo buono per il test sarà pronto.',
    step3: 'Visita un laboratorio partner, fai il test, e i tuoi risultati appariranno nella tua dashboard.',
    viewOrders: 'I miei ordini',
    backToShop: 'Torna al negozio',
    dashboard: 'Dashboard',
    error: 'Qualcosa è andato storto',
    errorSub: 'Non siamo riusciti a verificare il tuo pagamento. Se sei stato addebitato, contattaci.',
    pending: 'Pagamento in elaborazione',
    pendingSub: 'Il tuo pagamento è ancora in elaborazione. Riprova tra un momento.',
  },
};

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrderConfirmationContent({ locale }: { locale: string }) {
  const lang = (['en', 'de', 'fr', 'es', 'it'].includes(locale) ? locale : 'en') as Lang;
  const t = T[lang];
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();

  const [state, setState] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setState('error');
      return;
    }

    // Clear the cart on successful redirect
    clearCart();

    const verify = async () => {
      try {
        const res = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
        const data = await res.json();

        if (data.status === 'completed') {
          setOrder(data.order);
          setItems(data.items ?? []);
          setCustomerEmail(data.customer_email);
          setState('success');
        } else if (data.status === 'pending') {
          setState('pending');
        } else {
          setState('error');
        }
      } catch {
        setState('error');
      }
    };

    verify();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading
  if (state === 'loading') {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center gap-3 text-[#0e393d]/60">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">{t.verifying}</span>
        </div>
      </div>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="font-serif text-xl text-[#0e393d] mb-2">{t.error}</h2>
        <p className="text-sm text-[#1c2a2b]/50 mb-6">{t.errorSub}</p>
        <Link href="/shop" className="text-sm text-[#0e393d] underline underline-offset-4">{t.backToShop}</Link>
      </div>
    );
  }

  // Pending
  if (state === 'pending') {
    return (
      <div className="py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="animate-spin h-6 w-6 text-amber-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="font-serif text-xl text-[#0e393d] mb-2">{t.pending}</h2>
        <p className="text-sm text-[#1c2a2b]/50 mb-6">{t.pendingSub}</p>
      </div>
    );
  }

  // Success
  return (
    <div className="py-8 space-y-8">
      {/* Success icon */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        {customerEmail && (
          <p className="text-sm text-[#1c2a2b]/50">{t.email} <span className="font-medium text-[#0e393d]">{customerEmail}</span></p>
        )}
      </div>

      {/* Order details card */}
      {order && (
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 sm:p-8 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">{t.orderNumber}</p>
              <p className="font-serif text-lg text-[#0e393d]">{order.order_number}</p>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 capitalize">
              {order.status}
            </span>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="border-t border-[#0e393d]/8 pt-4 space-y-3">
              <p className="text-xs text-[#1c2a2b]/40 uppercase tracking-wide">{t.items}</p>
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-[#0e393d]">
                    {item.product_name ?? 'Product'} {item.quantity > 1 ? `× ${item.quantity}` : ''}
                  </span>
                  <span className="text-[#0e393d]/70 font-medium">{chf(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-[#0e393d]/8 pt-3 flex justify-between font-semibold text-[#0e393d]">
                <span>{t.total}</span>
                <span className="font-serif text-lg">{chf(order.total_amount)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Next steps */}
      <div className="max-w-lg mx-auto">
        <h3 className="font-serif text-lg text-[#0e393d] mb-4">{t.nextSteps}</h3>
        <div className="space-y-3">
          {[t.step1, t.step2, t.step3].map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0e393d]/5 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium text-[#0e393d]/50">{i + 1}</span>
              </div>
              <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center pt-4">
        <Link
          href="/profile?tab=orders"
          className="bg-[#0e393d] text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-[#0e393d]/90 transition-colors"
        >
          {t.viewOrders}
        </Link>
        <Link
          href="/dashboard"
          className="bg-[#0e393d]/5 text-[#0e393d] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#0e393d]/10 transition-colors"
        >
          {t.dashboard}
        </Link>
      </div>
    </div>
  );
}
