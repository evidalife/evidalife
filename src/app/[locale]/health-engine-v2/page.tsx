import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEngine2 from '@/components/health-v2/HealthEngine2';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Link } from '@/i18n/navigation';

export const metadata = { title: 'Health Engine 2.0 – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

// Test account used for public sample view
const SAMPLE_USER_ID = 'c796aa47-fce4-41e6-992a-e79c0dec5ad4';

const T = {
  sampleBanner: {
    en: 'Sample Data — Sign in to see your own results',
    de: 'Beispieldaten — Melde dich an, um deine Ergebnisse zu sehen',
    fr: 'Données d\'exemple — Connectez-vous pour voir vos résultats',
    es: 'Datos de ejemplo — Inicia sesión para ver tus resultados',
    it: 'Dati di esempio — Accedi per vedere i tuoi risultati',
  },
  sampleBannerLoggedIn: {
    en: 'Sample Data — This is what your Health Engine will look like',
    de: 'Beispieldaten — So wird deine Health Engine aussehen',
    fr: 'Données d\'exemple — Voici à quoi ressemblera votre Health Engine',
    es: 'Datos de ejemplo — Así se verá tu Health Engine',
    it: 'Dati di esempio — Ecco come apparirà il tuo Health Engine',
  },
  noDataTitle: {
    en: 'No lab data yet',
    de: 'Noch keine Labordaten',
    fr: 'Pas encore de données',
    es: 'Sin datos de laboratorio',
    it: 'Nessun dato di laboratorio',
  },
  noDataDesc: {
    en: 'Upload your first lab report to activate the Health Engine.',
    de: 'Lade deinen ersten Laborbericht hoch, um die Health Engine zu aktivieren.',
    fr: 'Téléchargez votre premier rapport pour activer le Health Engine.',
    es: 'Sube tu primer informe para activar el Health Engine.',
    it: 'Carica il tuo primo referto per attivare l\'Health Engine.',
  },
  uploadBtn: {
    en: 'Upload Lab Report',
    de: 'Laborbericht hochladen',
    fr: 'Télécharger un rapport',
    es: 'Subir informe',
    it: 'Carica referto',
  },
} as const;

async function hasLabData(supabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { count } = await supabase
    .from('lab_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);
  return (count ?? 0) > 0;
}

export default async function HealthEngineV2Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale)
    ? (locale as Lang)
    : 'en';
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Not logged in or ?view=info → sample data ──
  const showSample = !user || params.view === 'info';
  if (showSample) {
    const adminDb = createAdminClient();
    const hasSampleData = await hasLabData(adminDb, SAMPLE_USER_ID);

    if (hasSampleData) {
      const isLoggedIn = !!user;
      return (
        <>
          <PublicNav />
          <div className="fixed top-[76px] left-1/2 -translate-x-1/2 z-40">
            <div className="px-6 py-2 rounded-full bg-[#ceab84] text-[#0e393d] text-xs font-semibold tracking-wide shadow-lg whitespace-nowrap">
              {isLoggedIn ? T.sampleBannerLoggedIn[lang] : T.sampleBanner[lang]}
            </div>
          </div>
          <HealthEngine2
            lang={lang}
            userId={SAMPLE_USER_ID}
            hasData={true}
            isSample
          />
          <PublicFooter />
        </>
      );
    }

    // No sample data — prompt to sign in
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-[#0e393d]/[.06] flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">🧬</span>
            </div>
            <h2 className="font-serif text-2xl text-[#0e393d] mb-2">{T.noDataTitle[lang]}</h2>
            <p className="text-sm text-[#1c2a2b]/50 mb-6">{T.noDataDesc[lang]}</p>
            <Link
              href="/login"
              className="inline-block px-8 py-3 rounded-lg font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: '#ceab84', color: '#0e393d' }}
            >
              Get Started
            </Link>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // ── Logged in: check for user's own data ──
  const userHasData = await hasLabData(supabase, user.id);

  if (!userHasData) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-[#0e393d]/[.06] flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">📊</span>
            </div>
            <h2 className="font-serif text-2xl text-[#0e393d] mb-2">{T.noDataTitle[lang]}</h2>
            <p className="text-sm text-[#1c2a2b]/50 mb-6">{T.noDataDesc[lang]}</p>
            <Link
              href="/dashboard"
              className="inline-block px-8 py-3 rounded-lg font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: '#ceab84', color: '#0e393d' }}
            >
              {T.uploadBtn[lang]}
            </Link>
          </div>
        </div>
        <PublicFooter />
      </>
    );
  }

  // ── User has data → show Health Engine 2.0 ──
  return (
    <>
      <PublicNav />
      <HealthEngine2
        lang={lang}
        userId={user.id}
        hasData={true}
      />
      <PublicFooter />
    </>
  );
}
