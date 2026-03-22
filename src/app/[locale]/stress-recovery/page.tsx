import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Stress & Recovery – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, { comingSoon: string; title: string; desc: string; cta: string }> = {
  de: {
    comingSoon: 'Demnächst',
    title: 'Stress & Recovery',
    desc: 'HRV-Tracking, Atemübungen und Erholungsmassnahmen für optimale Regeneration – bald verfügbar.',
    cta: '← Zur Startseite',
  },
  en: {
    comingSoon: 'Coming soon',
    title: 'Stress & Recovery',
    desc: 'HRV tracking, breathing exercises, and recovery tools for optimal regeneration — coming soon.',
    cta: '← Back to home',
  },
  fr: {
    comingSoon: 'Bientôt disponible',
    title: 'Stress & Récupération',
    desc: 'Suivi de la VFC, exercices de respiration et outils de récupération pour une régénération optimale — bientôt disponible.',
    cta: '← Retour à l\'accueil',
  },
  es: {
    comingSoon: 'Próximamente',
    title: 'Estrés y Recuperación',
    desc: 'Seguimiento de VFC, ejercicios de respiración y herramientas de recuperación para una regeneración óptima — próximamente.',
    cta: '← Volver al inicio',
  },
  it: {
    comingSoon: 'Prossimamente',
    title: 'Stress & Recupero',
    desc: 'Monitoraggio HRV, esercizi di respirazione e strumenti di recupero per una rigenerazione ottimale — prossimamente.',
    cta: '← Torna alla home',
  },
};

export default async function StressRecoveryPage() {
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
