import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Lifestyle – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const T: Record<Lang, { tag: string; h1: string; sub: string; comingSoon: string }> = {
  de: {
    tag: 'LIFESTYLE',
    h1: 'Dein gesundes Leben.',
    sub: 'Evidenzbasierte Tipps für Schlaf, Bewegung, Stressmanagement und Erholung – abgestimmt auf deine Biomarker.',
    comingSoon: 'Inhalte werden gerade erstellt. Bald verfügbar.',
  },
  en: {
    tag: 'LIFESTYLE',
    h1: 'Your healthy life.',
    sub: 'Evidence-based guidance on sleep, exercise, stress management, and recovery – tailored to your biomarkers.',
    comingSoon: 'Content is being created. Coming soon.',
  },
  fr: {
    tag: 'LIFESTYLE',
    h1: 'Votre vie saine.',
    sub: 'Conseils basés sur des preuves pour le sommeil, l\'exercice, la gestion du stress et la récupération – adaptés à vos biomarqueurs.',
    comingSoon: 'Le contenu est en cours de création. Bientôt disponible.',
  },
  es: {
    tag: 'LIFESTYLE',
    h1: 'Tu vida saludable.',
    sub: 'Consejos basados en evidencia sobre sueño, ejercicio, gestión del estrés y recuperación – adaptados a tus biomarcadores.',
    comingSoon: 'El contenido se está creando. Disponible pronto.',
  },
  it: {
    tag: 'LIFESTYLE',
    h1: 'La tua vita sana.',
    sub: 'Consigli basati sull\'evidenza per sonno, esercizio, gestione dello stress e recupero – adattati ai tuoi biomarcatori.',
    comingSoon: 'I contenuti sono in fase di creazione. Presto disponibili.',
  },
};

export default async function LifestylePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1 flex flex-col items-center justify-center text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
          {t.tag}
        </p>
        <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">
          {t.h1}
        </h1>
        <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed mb-10">
          {t.sub}
        </p>

        <div className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 px-10 py-12 max-w-lg w-full">
          <div className="text-4xl mb-4">🌿</div>
          <p className="text-sm text-[#1c2a2b]/50 leading-relaxed">
            {t.comingSoon}
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
