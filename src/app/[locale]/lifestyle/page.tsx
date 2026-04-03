import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import LessonLibrary from '@/components/coach/LessonLibrary';

export const metadata = { title: 'Lifestyle – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const T: Record<Lang, { tag: string; h1: string; sub: string; ctaSignUp: string }> = {
  de: {
    tag: 'LIFESTYLE',
    h1: 'Dein gesundes Leben.',
    sub: 'Evidenzbasierte Tipps für Schlaf, Bewegung, Stressmanagement und Erholung – abgestimmt auf deine Biomarker.',
    ctaSignUp: 'Melde dich an, um zu beginnen',
  },
  en: {
    tag: 'LIFESTYLE',
    h1: 'Your healthy life.',
    sub: 'Evidence-based guidance on sleep, exercise, stress management, and recovery – tailored to your biomarkers.',
    ctaSignUp: 'Sign up to get started',
  },
  fr: {
    tag: 'LIFESTYLE',
    h1: 'Votre vie saine.',
    sub: 'Conseils basés sur des preuves pour le sommeil, l\'exercice, la gestion du stress et la récupération – adaptés à vos biomarqueurs.',
    ctaSignUp: 'Inscrivez-vous pour commencer',
  },
  es: {
    tag: 'LIFESTYLE',
    h1: 'Tu vida saludable.',
    sub: 'Consejos basados en evidencia sobre sueño, ejercicio, gestión del estrés y recuperación – adaptados a tus biomarcadores.',
    ctaSignUp: 'Regístrate para comenzar',
  },
  it: {
    tag: 'LIFESTYLE',
    h1: 'La tua vita sana.',
    sub: 'Consigli basati sull\'evidenza per sonno, esercizio, gestione dello stress e recupero – adattati ai tuoi biomarcatori.',
    ctaSignUp: 'Iscriviti per iniziare',
  },
};

export default async function LifestylePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale)
    ? (locale as Lang)
    : 'en';
  const t = T[lang];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // User is authenticated
  if (user) {
    const admin = createAdminClient();

    // Fetch all data in parallel
    const [lessonsResult, progressResult, settingsResult] = await Promise.all([
      // All published lifestyle lessons
      admin
        .from('lifestyle_lessons')
        .select(
          'id, slug, title_en, title_de, title_fr, title_es, title_it, caption_en, caption_de, caption_fr, caption_es, caption_it, framework, category, difficulty, photo_url, estimated_minutes, sort_order'
        )
        .eq('is_published', true)
        .order('sort_order')
        .order('created_at', { ascending: false }),

      // User lesson progress
      admin
        .from('user_lesson_progress')
        .select('lesson_id, status, completed_at')
        .eq('user_id', user.id),

      // User settings
      admin
        .from('user_settings')
        .select('tweaks_enabled, anti_aging_enabled')
        .eq('user_id', user.id)
        .single(),
    ]);

    const lessons = lessonsResult.data || [];
    const progressMap: Record<string, { status: string; completed_at?: string }> =
      (progressResult.data || []).reduce(
        (acc, p) => {
          acc[p.lesson_id] = { status: p.status, completed_at: p.completed_at };
          return acc;
        },
        {} as Record<string, { status: string; completed_at?: string }>
      );

    const settings = settingsResult.data || {
      tweaks_enabled: false,
      anti_aging_enabled: false,
    };

    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col">
        <PublicNav />

        <main className="mx-auto w-full max-w-[1200px] px-6 pt-20 pb-16 flex-1">
          <div className="text-center mb-16">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
              {t.tag}
            </p>
            <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">
              {t.h1}
            </h1>
            <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">
              {t.sub}
            </p>
          </div>

          <LessonLibrary
            lang={lang}
            lessons={lessons}
            progressMap={progressMap}
            settings={settings}
          />
        </main>

        <PublicFooter />
      </div>
    );
  }

  // Public version (user not authenticated)
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
          <p className="text-sm text-[#1c2a2b]/60 leading-relaxed mb-6">
            Explore our comprehensive lifestyle lessons to optimize your health.
          </p>
          <a
            href="/login"
            className="inline-block w-full px-6 py-3 rounded-lg bg-[#0e393d] text-white font-medium hover:bg-[#0e393d]/90 transition-colors"
          >
            {t.ctaSignUp}
          </a>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
