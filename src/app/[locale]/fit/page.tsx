import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Fit – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, { comingSoon: string; title: string; desc: string }> = {
  de: {
    comingSoon: 'Demnächst',
    title: 'Fit',
    desc: 'Schlaf, Bewegung und Stress & Recovery Tracking – bald verfügbar.',
  },
  en: {
    comingSoon: 'Coming soon',
    title: 'Fit',
    desc: 'Sleep, exercise, and stress & recovery tracking — coming soon.',
  },
  fr: {
    comingSoon: 'Bientôt disponible',
    title: 'Fit',
    desc: 'Suivi du sommeil, exercice, et stress & récupération — bientôt disponible.',
  },
  es: {
    comingSoon: 'Próximamente',
    title: 'Fit',
    desc: 'Seguimiento de sueño, ejercicio y estrés y recuperación — próximamente.',
  },
  it: {
    comingSoon: 'Prossimamente',
    title: 'Fit',
    desc: 'Monitoraggio del sonno, esercizio, e stress & recupero — prossimamente.',
  },
};

export default async function FitPage() {
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
