import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEngineDashboard from '@/components/health/HealthEngineDashboard';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Link } from '@/i18n/navigation';

export const metadata = { title: 'Health Engine – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

// Test account used for public sample view
const SAMPLE_USER_ID = 'c796aa47-fce4-41e6-992a-e79c0dec5ad4';

// ── 9 Health Domains ──────────────────────────────────────────────────────────
const DOMAINS = [
  { key: 'heart', icon: '❤️', name: { en: 'Heart & Vessels', de: 'Herz & Gefässe', fr: 'Coeur & Vaisseaux', es: 'Corazón & Vasos', it: 'Cuore & Vasi' } },
  { key: 'metabolism', icon: '⚡', name: { en: 'Metabolism', de: 'Stoffwechsel', fr: 'Métabolisme', es: 'Metabolismo', it: 'Metabolismo' } },
  { key: 'inflammation', icon: '🔬', name: { en: 'Inflammation', de: 'Entzündung', fr: 'Inflammation', es: 'Inflamación', it: 'Infiammazione' } },
  { key: 'organ', icon: '🫁', name: { en: 'Organ Function', de: 'Organfunktion', fr: 'Fonction Organique', es: 'Función Orgánica', it: 'Funzione Organica' } },
  { key: 'nutrients', icon: '🥗', name: { en: 'Nutrients', de: 'Nährstoffe', fr: 'Nutriments', es: 'Nutrientes', it: 'Nutrienti' } },
  { key: 'hormones', icon: '🧬', name: { en: 'Hormones', de: 'Hormone', fr: 'Hormones', es: 'Hormonas', it: 'Ormoni' } },
  { key: 'body', icon: '⚖️', name: { en: 'Body Composition', de: 'Körperzusammensetzung', fr: 'Composition Corporelle', es: 'Composición Corporal', it: 'Composizione Corporea' } },
  { key: 'fitness', icon: '🏃', name: { en: 'Fitness', de: 'Fitness', fr: 'Condition Physique', es: 'Fitness', it: 'Fitness' } },
  { key: 'epigenetics', icon: '🧪', name: { en: 'Epigenetics', de: 'Epigenetik', fr: 'Épigénétique', es: 'Epigenética', it: 'Epigenetica' } },
] as const;

const T = {
  heroTag: {
    en: 'Health Engine', de: 'Health Engine',
    fr: 'Health Engine', es: 'Health Engine', it: 'Health Engine',
  },
  heading: {
    en: 'Your Health Engine', de: 'Deine Health Engine',
    fr: 'Votre Health Engine', es: 'Tu Health Engine', it: 'Il tuo Health Engine',
  },
  heroSub: {
    en: 'Your personal longevity dashboard — tracking biomarkers across 9 health domains.',
    de: 'Dein persönliches Langlebigkeits-Dashboard — Biomarker in 9 Gesundheitsbereichen.',
    fr: 'Votre tableau de bord longévité — suivi des biomarqueurs dans 9 domaines de santé.',
    es: 'Tu panel de longevidad — seguimiento de biomarcadores en 9 dominios de salud.',
    it: 'La tua dashboard longevità — monitoraggio biomarcatori in 9 domini di salute.',
  },
  noDataTitle: {
    en: 'No lab data yet', de: 'Noch keine Labordaten',
    fr: 'Pas encore de données', es: 'Sin datos de laboratorio',
    it: 'Nessun dato di laboratorio',
  },
  noDataDesc: {
    en: 'Upload your first lab report to activate the Health Engine. We\'ll analyze your biomarkers and track your longevity journey.',
    de: 'Lade deinen ersten Laborbericht hoch, um die Health Engine zu aktivieren. Wir analysieren deine Biomarker und verfolgen deinen Weg.',
    fr: 'Téléchargez votre premier rapport pour activer le Health Engine. Nous analyserons vos biomarqueurs.',
    es: 'Sube tu primer informe para activar el Health Engine. Analizaremos tus biomarcadores.',
    it: 'Carica il tuo primo referto per attivare l\'Health Engine. Analizzeremo i tuoi biomarcatori.',
  },
  uploadBtn: {
    en: 'Upload Lab Report', de: 'Laborbericht hochladen',
    fr: 'Télécharger un rapport', es: 'Subir informe', it: 'Carica referto',
  },
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
  viewSample: {
    en: 'View Sample Dashboard', de: 'Beispiel-Dashboard ansehen',
    fr: 'Voir le tableau de bord exemple', es: 'Ver panel de ejemplo',
    it: 'Vedi dashboard di esempio',
  },
  publicTitle: {
    en: 'The Evidalife Health Engine',
    de: 'Die Evidalife Health Engine',
    fr: 'Le Health Engine Evidalife',
    es: 'El Health Engine de Evidalife',
    it: 'L\'Health Engine di Evidalife',
  },
  publicDesc: {
    en: 'Track 60+ biomarkers across 9 health domains. Powered by science, designed for longevity.',
    de: 'Verfolge 60+ Biomarker in 9 Gesundheitsbereichen. Wissenschaftsbasiert, für Langlebigkeit.',
    fr: 'Suivez 60+ biomarqueurs dans 9 domaines de santé. Basé sur la science, conçu pour la longévité.',
    es: 'Rastrea 60+ biomarcadores en 9 dominios de salud. Basado en ciencia, diseñado para la longevidad.',
    it: 'Monitora 60+ biomarcatori in 9 domini di salute. Basato sulla scienza, progettato per la longevità.',
  },
  domainsTag: {
    en: '9 Health Domains', de: '9 Gesundheitsbereiche',
    fr: '9 Domaines de Santé', es: '9 Dominios de Salud', it: '9 Domini di Salute',
  },
  domainsTitle: {
    en: 'A complete picture of your health', de: 'Ein vollständiges Bild deiner Gesundheit',
    fr: 'Une vue complète de votre santé', es: 'Una imagen completa de tu salud',
    it: 'Un quadro completo della tua salute',
  },
  stepsTag: {
    en: 'How It Works', de: 'So funktioniert\'s',
    fr: 'Comment ça marche', es: 'Cómo funciona', it: 'Come funziona',
  },
  stepsTitle: {
    en: 'Three steps to your longevity score', de: 'Drei Schritte zu deinem Longevity Score',
    fr: 'Trois étapes vers votre score longévité', es: 'Tres pasos hacia tu puntuación de longevidad',
    it: 'Tre passi verso il tuo punteggio longevità',
  },
  steps: {
    en: [
      { title: 'Get tested', desc: 'Visit a partner lab or upload your existing lab report.' },
      { title: 'See your scores', desc: 'The Health Engine calculates scores across all 9 domains.' },
      { title: 'Improve & track', desc: 'Follow personalized insights and track your progress over time.' },
    ],
    de: [
      { title: 'Testen lassen', desc: 'Besuche ein Partnerlabor oder lade deinen Laborbericht hoch.' },
      { title: 'Scores anzeigen', desc: 'Die Health Engine berechnet Scores in allen 9 Bereichen.' },
      { title: 'Verbessern & verfolgen', desc: 'Folge personalisierten Empfehlungen und verfolge deinen Fortschritt.' },
    ],
    fr: [
      { title: 'Faites le test', desc: 'Visitez un laboratoire partenaire ou téléchargez votre rapport.' },
      { title: 'Consultez vos scores', desc: 'Le Health Engine calcule les scores dans les 9 domaines.' },
      { title: 'Améliorez & suivez', desc: 'Suivez les recommandations personnalisées et votre progression.' },
    ],
    es: [
      { title: 'Hazte el test', desc: 'Visita un laboratorio asociado o sube tu informe.' },
      { title: 'Consulta tus scores', desc: 'El Health Engine calcula puntuaciones en los 9 dominios.' },
      { title: 'Mejora y rastrea', desc: 'Sigue las recomendaciones personalizadas y tu progreso.' },
    ],
    it: [
      { title: 'Fai il test', desc: 'Visita un laboratorio partner o carica il tuo referto.' },
      { title: 'Vedi i tuoi punteggi', desc: 'L\'Health Engine calcola i punteggi in tutti i 9 domini.' },
      { title: 'Migliora e monitora', desc: 'Segui i consigli personalizzati e il tuo progresso.' },
    ],
  },
  signIn: {
    en: 'Get Started', de: 'Jetzt starten', fr: 'Commencer', es: 'Empezar', it: 'Inizia',
  },
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchHealthData(supabase: any, userId: string) {
  const [profileRes, reportsRes, resultsRes, defsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, date_of_birth, sex, height_cm')
      .eq('id', userId)
      .single(),
    supabase
      .from('lab_reports')
      .select('id, title, test_date, status')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'completed'])
      .order('test_date', { ascending: true }),
    supabase
      .from('lab_results')
      .select(
        'id, lab_report_id, biomarker_definition_id, value_numeric, unit, status_flag, measured_at, test_date',
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('measured_at', { ascending: true }),
    supabase
      .from('biomarkers')
      .select(
        'id, slug, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, item_type, sort_order, is_calculated',
      )
      .eq('is_active', true),
  ]);

  return {
    profile: profileRes.data,
    reports: reportsRes.data ?? [],
    results: resultsRes.data ?? [],
    definitions: defsRes.data ?? [],
  };
}

export default async function HealthEnginePage({
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

  // ── Auth check ──────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Not logged in or ?view=info → try sample data from test account ──
  const showSample = !user || params.view === 'info';
  if (showSample) {
    // Use admin client to bypass RLS — anonymous users can't read other users' data
    const adminDb = createAdminClient();
    const sample = await fetchHealthData(adminDb, SAMPLE_USER_ID);

    if (sample.reports.length && sample.results.length) {
      // Show sample dashboard with appropriate banner
      const isLoggedIn = !!user;
      return (
        <>
          <PublicNav />
          {/* Floating sample-data pill — sits below the navbar, persists on scroll */}
          <div className="fixed top-[76px] left-1/2 -translate-x-1/2 z-40">
            <div className="px-6 py-2 rounded-full bg-[#ceab84] text-[#0e393d] text-xs font-semibold tracking-wide shadow-lg whitespace-nowrap">
              {isLoggedIn ? T.sampleBannerLoggedIn[lang] : T.sampleBanner[lang]}
            </div>
          </div>
          <HealthEngineDashboard
            lang={lang}
            userId={SAMPLE_USER_ID}
            profile={sample.profile}
            reports={sample.reports}
            results={sample.results}
            definitions={sample.definitions}
            isSample
          />
          <PublicFooter />
        </>
      );
    }

    // No sample data available → elegant marketing page (Pattern B1)
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-[#fafaf8] flex flex-col">
          {/* ── Dark teal hero band (Pattern B1) ── */}
          <section className="bg-[#0e393d] pt-28 pb-20">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
                {T.heroTag[lang]}
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-4">
                {T.publicTitle[lang]}
              </h1>
              <p className="text-base text-white/60 leading-relaxed max-w-xl mx-auto mb-10">
                {T.publicDesc[lang]}
              </p>
              <Link
                href="/login"
                className="inline-block px-8 py-3 rounded-lg font-medium transition-all hover:brightness-110"
                style={{ backgroundColor: '#ceab84', color: '#0e393d' }}
              >
                {T.signIn[lang]}
              </Link>
            </div>
          </section>

          {/* ── 9 Health Domains feature grid ── */}
          <section className="mx-auto w-full max-w-[1060px] px-6 py-20">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] text-center">
              {T.domainsTag[lang]}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] text-center mb-12">
              {T.domainsTitle[lang]}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-4">
              {DOMAINS.map((d) => (
                <div
                  key={d.key}
                  className="bg-white rounded-xl border border-[#0e393d]/10 p-5 text-center hover:shadow-md transition-shadow"
                >
                  <div className="text-2xl mb-2">{d.icon}</div>
                  <h3 className="text-sm font-semibold text-[#0e393d]">{d.name[lang]}</h3>
                </div>
              ))}
            </div>
          </section>

          {/* ── How it works ── */}
          <section className="bg-[#0e393d] py-16">
            <div className="mx-auto max-w-3xl px-6 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
                {T.stepsTag[lang]}
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl text-white mb-12">
                {T.stepsTitle[lang]}
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-[#ceab84] text-[#0e393d] font-bold text-sm flex items-center justify-center mx-auto mb-4">
                      {n}
                    </div>
                    <h3 className="text-white font-semibold text-sm mb-2">
                      {T.steps[lang][n - 1].title}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed">
                      {T.steps[lang][n - 1].desc}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-12">
                <Link
                  href="/login"
                  className="inline-block px-8 py-3 rounded-lg font-medium transition-all hover:brightness-110"
                  style={{ backgroundColor: '#ceab84', color: '#0e393d' }}
                >
                  {T.signIn[lang]}
                </Link>
              </div>
            </div>
          </section>

          <PublicFooter />
        </div>
      </>
    );
  }

  // ── Logged in → fetch user's own data ──────────────────────────
  const data = await fetchHealthData(supabase, user.id);

  // No data → elegant empty state matching site design
  if (!data.reports.length || !data.results.length) {
    return (
      <>
        <PublicNav />
        <div className="min-h-screen bg-[#fafaf8] flex flex-col">
          {/* ── Dark teal hero band (Pattern B1) ── */}
          <section className="bg-[#0e393d] pt-28 pb-20">
            <div className="mx-auto max-w-2xl px-6 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">
                {T.heroTag[lang]}
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-4">
                {T.heading[lang]}
              </h1>
              <p className="text-base text-white/60 leading-relaxed max-w-xl mx-auto">
                {T.heroSub[lang]}
              </p>
            </div>
          </section>

          {/* ── Empty state card ── */}
          <section className="mx-auto w-full max-w-[1060px] px-6 py-16 flex-1">
            <div className="max-w-xl mx-auto">
              <div className="bg-white rounded-2xl border border-[#0e393d]/10 p-10 text-center shadow-sm">
                <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center bg-[#0e393d]/5">
                  <svg className="w-8 h-8 text-[#0e393d]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="font-serif text-2xl text-[#0e393d] mb-3">
                  {T.noDataTitle[lang]}
                </h2>
                <p className="text-[#1c2a2b]/55 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                  {T.noDataDesc[lang]}
                </p>
                <Link
                  href="/profile?tab=results"
                  className="inline-block px-8 py-3 rounded-lg font-medium transition-all hover:brightness-110"
                  style={{ backgroundColor: '#ceab84', color: '#0e393d' }}
                >
                  {T.uploadBtn[lang]}
                </Link>
                <div className="mt-4">
                  <Link
                    href="/health-engine?view=info"
                    className="text-sm text-[#0e393d]/50 hover:text-[#0e393d]/80 underline underline-offset-2 transition-colors"
                  >
                    {T.viewSample[lang]}
                  </Link>
                </div>
              </div>

              {/* ── Domain preview pills ── */}
              <div className="mt-10 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
                  {T.domainsTag[lang]}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {DOMAINS.map((d) => (
                    <span
                      key={d.key}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#0e393d]/10 text-xs text-[#0e393d]/70"
                    >
                      <span>{d.icon}</span>
                      {d.name[lang]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <PublicFooter />
        </div>
      </>
    );
  }

  return (
    <>
      <PublicNav />
      <HealthEngineDashboard
        lang={lang}
        userId={user.id}
        profile={data.profile}
        reports={data.reports}
        results={data.results}
        definitions={data.definitions}
      />
      <PublicFooter />
    </>
  );
}
