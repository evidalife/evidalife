import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Eat@Home – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, { comingSoon: string; title: string; desc: string; cta: string }> = {
  de: {
    comingSoon: 'Demnächst',
    title: 'Eat@Home',
    desc: 'Wöchentliche Lieferboxen mit frischen, vollwertigen Zutaten nach dem Daily Dozen – bald verfügbar.',
    cta: '← Zur Startseite',
  },
  en: {
    comingSoon: 'Coming soon',
    title: 'Eat@Home',
    desc: 'Weekly delivery boxes with fresh whole-food ingredients following the Daily Dozen — coming soon.',
    cta: '← Back to home',
  },
  fr: {
    comingSoon: 'Bientôt disponible',
    title: 'Eat@Home',
    desc: 'Boîtes de livraison hebdomadaires avec des ingrédients frais et complets selon le Daily Dozen — bientôt disponible.',
    cta: '← Retour à l\'accueil',
  },
  es: {
    comingSoon: 'Próximamente',
    title: 'Eat@Home',
    desc: 'Cajas de entrega semanales con ingredientes frescos e integrales siguiendo el Daily Dozen — próximamente.',
    cta: '← Volver al inicio',
  },
  it: {
    comingSoon: 'Prossimamente',
    title: 'Eat@Home',
    desc: 'Scatole di consegna settimanali con ingredienti freschi e integrali secondo il Daily Dozen — prossimamente.',
    cta: '← Torna alla home',
  },
};

export default async function EatAtHomePage() {
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
          <Link href="/" className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#1a5055] transition-colors">
            {t.cta}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
