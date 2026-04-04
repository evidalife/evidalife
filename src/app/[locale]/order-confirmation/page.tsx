import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PageHero from '@/components/PageHero';
import OrderConfirmationContent from './OrderConfirmationContent';

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const T: Record<Lang, { eyebrow: string; title: string }> = {
  en: { eyebrow: 'Order Confirmed', title: 'Thank you!' },
  de: { eyebrow: 'Bestellung bestätigt', title: 'Vielen Dank!' },
  fr: { eyebrow: 'Commande confirmée', title: 'Merci !' },
  es: { eyebrow: 'Pedido confirmado', title: '¡Gracias!' },
  it: { eyebrow: 'Ordine confermato', title: 'Grazie!' },
};

export default async function OrderConfirmationPage() {
  const rawLocale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(rawLocale) ? (rawLocale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <PageHero variant="light" eyebrow={t.eyebrow} title={t.title} />
      <main className="mx-auto w-full max-w-[1060px] px-8 md:px-12 pb-20 flex-1">
        <OrderConfirmationContent locale={lang} />
      </main>
      <PublicFooter />
    </div>
  );
}
