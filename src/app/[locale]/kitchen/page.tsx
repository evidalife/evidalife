import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Kitchen – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, { comingSoon: string; title: string; desc: string }> = {
  de: {
    comingSoon: 'Demnächst',
    title: 'Kitchen',
    desc: 'Rezepte, Daily Dozen Tracker und Ernährungsplanung – bald verfügbar.',
  },
  en: {
    comingSoon: 'Coming soon',
    title: 'Kitchen',
    desc: 'Recipes, Daily Dozen tracker, and meal planning — coming soon.',
  },
  fr: {
    comingSoon: 'Bientôt disponible',
    title: 'Kitchen',
    desc: 'Recettes, suivi Daily Dozen et planification des repas — bientôt disponible.',
  },
  es: {
    comingSoon: 'Próximamente',
    title: 'Cocina',
    desc: 'Recetas, seguimiento del Daily Dozen y planificación de comidas — próximamente.',
  },
  it: {
    comingSoon: 'Prossimamente',
    title: 'Cucina',
    desc: 'Ricette, tracker Daily Dozen e pianificazione dei pasti — prossimamente.',
  },
};

export default async function KitchenPage() {
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
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed">
            {t.desc}
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
