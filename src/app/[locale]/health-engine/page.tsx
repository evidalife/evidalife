import { getLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEnginePublic from '@/components/health/HealthEnginePublic';
import { Link } from '@/i18n/navigation';

export const metadata = { title: 'Health Engine – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, {
  eyebrow: string;
  heading: string;
  noScore: string;
  noScoreSub: string;
  linkDashboard: string;
  linkHow: string;
  linkShop: string;
}> = {
  de: {
    eyebrow: 'Deine Health Engine',
    heading: 'Dein persönlicher Gesundheits-Score',
    noScore: 'Noch kein Score vorhanden.',
    noScoreSub: 'Bestelle deinen ersten Bluttest, damit wir deinen Health Engine Score berechnen können.',
    linkDashboard: 'Zum vollständigen Dashboard →',
    linkHow: 'Wie funktioniert die Health Engine? →',
    linkShop: 'Bluttest bestellen →',
  },
  en: {
    eyebrow: 'Your Health Engine',
    heading: 'Your personal health score',
    noScore: 'No score yet.',
    noScoreSub: 'Order your first blood test so we can calculate your Health Engine Score.',
    linkDashboard: 'View full dashboard →',
    linkHow: 'How the Health Engine works →',
    linkShop: 'Order a blood test →',
  },
  fr: {
    eyebrow: 'Votre Health Engine',
    heading: 'Votre score de santé personnel',
    noScore: 'Pas encore de score.',
    noScoreSub: 'Commandez votre premier test sanguin pour que nous puissions calculer votre score Health Engine.',
    linkDashboard: 'Voir le tableau de bord complet →',
    linkHow: 'Comment fonctionne le Health Engine ? →',
    linkShop: 'Commander un test sanguin →',
  },
  es: {
    eyebrow: 'Tu Health Engine',
    heading: 'Tu puntuación de salud personal',
    noScore: 'Aún no hay puntuación.',
    noScoreSub: 'Pide tu primer análisis de sangre para que podamos calcular tu Health Engine Score.',
    linkDashboard: 'Ver panel completo →',
    linkHow: '¿Cómo funciona el Health Engine? →',
    linkShop: 'Pedir un análisis de sangre →',
  },
  it: {
    eyebrow: 'Il tuo Health Engine',
    heading: 'Il tuo punteggio di salute personale',
    noScore: 'Nessun punteggio ancora.',
    noScoreSub: 'Ordina il tuo primo esame del sangue per calcolare il tuo Health Engine Score.',
    linkDashboard: 'Vedi il pannello completo →',
    linkHow: 'Come funziona il Health Engine? →',
    linkShop: 'Ordina un esame del sangue →',
  },
};

export default async function HealthEnginePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

  const params = await searchParams;
  const viewInfo = params.view === 'info';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Logged-out, or any visitor requesting ?view=info → show public info page
  if (!user || viewInfo) {
    return (
      <>
        <PublicNav />
        <HealthEnginePublic lang={lang} />
        <PublicFooter />
      </>
    );
  }

  // Logged-in, no ?view=info → show personal Health Engine view
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">

        {/* Hero */}
        <section className="w-full bg-[#0e393d] px-6 pt-28 pb-20">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight">{t.heading}</h1>
          </div>
        </section>

        {/* Score placeholder */}
        <section className="w-full max-w-2xl mx-auto px-6 py-16">
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white px-8 py-12 text-center flex flex-col items-center gap-6">
            {/* Placeholder ring */}
            <div className="w-32 h-32 rounded-full border-8 border-[#0e393d]/10 flex items-center justify-center">
              <span className="font-serif text-3xl text-[#0e393d]/25">—</span>
            </div>

            <div>
              <p className="font-serif text-xl text-[#0e393d] mb-2">{t.noScore}</p>
              <p className="text-sm text-[#1c2a2b]/55 leading-relaxed max-w-sm">{t.noScoreSub}</p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0e393d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition"
              >
                {t.linkShop}
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-[#0e393d] hover:underline underline-offset-2 transition"
              >
                {t.linkDashboard}
              </Link>
              <Link
                href="/health-engine?view=info"
                className="text-sm text-[#1c2a2b]/45 hover:text-[#0e393d] hover:underline underline-offset-2 transition"
              >
                {t.linkHow}
              </Link>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
