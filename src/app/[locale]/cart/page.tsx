import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Warenkorb – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, { comingSoon: string; title: string; desc: string; cta: string }> = {
  de: {
    comingSoon: 'Demnächst',
    title: 'Warenkorb',
    desc: 'Dein Warenkorb und Checkout – bald verfügbar. Besuche den Shop für direkte Bestellung.',
    cta: '→ Zum Shop',
  },
  en: {
    comingSoon: 'Coming soon',
    title: 'Cart',
    desc: 'Your cart and checkout — coming soon. Visit the shop to order directly.',
    cta: '→ Go to Shop',
  },
  fr: {
    comingSoon: 'Bientôt disponible',
    title: 'Panier',
    desc: 'Votre panier et paiement — bientôt disponible. Visitez la boutique pour commander directement.',
    cta: '→ Aller à la boutique',
  },
  es: {
    comingSoon: 'Próximamente',
    title: 'Carrito',
    desc: 'Tu carrito y pago — próximamente. Visita la tienda para pedir directamente.',
    cta: '→ Ir a la tienda',
  },
  it: {
    comingSoon: 'Prossimamente',
    title: 'Carrello',
    desc: 'Il tuo carrello e il pagamento — prossimamente. Visita il negozio per ordinare direttamente.',
    cta: '→ Vai al negozio',
  },
};

export default async function CartPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-28 text-center">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
            {t.comingSoon}
          </p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-4">
            {t.title}
          </h1>
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed mb-8">
            {t.desc}
          </p>
          <Link href="/shop" className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#1a5055] transition-colors">
            {t.cta}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
