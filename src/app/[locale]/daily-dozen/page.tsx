import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import DailyDozenTracker, { type DDCategory, type DDEntry, type DDStreak, type HistoricalEntry } from '@/components/DailyDozenTracker';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.dailyDozen[lang], path: '/daily-dozen', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

// ─── Tracker translations ──────────────────────────────────────────────────────
const T_TRACKER = {
  de: {
    eyebrow: 'Gesundheit',
    heading: 'Daily Dozen',
    sub: 'Die 12 Lebensmittelgruppen nach Dr. Michael Greger – täglich erfüllen für optimale Gesundheit.',
  },
  en: {
    eyebrow: 'Health',
    heading: 'Daily Dozen',
    sub: "Dr. Michael Greger's 12 daily food groups – hit all 12 every day for optimal health.",
  },
  fr: {
    eyebrow: 'Santé',
    heading: 'Daily Dozen',
    sub: 'Les 12 groupes alimentaires du Dr Michael Greger – atteindre les 12 chaque jour pour une santé optimale.',
  },
  es: {
    eyebrow: 'Salud',
    heading: 'Daily Dozen',
    sub: 'Los 12 grupos alimentarios del Dr. Michael Greger – alcanza los 12 cada día para una salud óptima.',
  },
  it: {
    eyebrow: 'Salute',
    heading: 'Daily Dozen',
    sub: 'I 12 gruppi alimentari del Dr. Michael Greger – raggiungi tutti i 12 ogni giorno per una salute ottimale.',
  },
};

// ─── Public page translations ──────────────────────────────────────────────────
const T_PUBLIC: Record<Lang, {
  tag: string;
  title: string;
  sub: string;
  whatHeading: string;
  whatP1: string;
  whatP2: string;
  whatLink: string;
  catsHeading: string;
  servings: string;
  trackHeading: string;
  trackDesc: string;
  ctaLogin: string;
  ctaAlreadyHave: string;
  ctaLogIn: string;
  ctaDark: string;
}> = {
  de: {
    tag: 'DAILY DOZEN',
    title: 'Tracke, was am wichtigsten ist.',
    sub: 'Dr. Michael Gregers evidenzbasierte Checkliste der 12 Lebensmittelgruppen, die du täglich essen solltest – für optimale Gesundheit.',
    whatHeading: 'Was ist das Daily Dozen?',
    whatP1: 'Das Daily Dozen ist eine Checkliste, die von Dr. Michael Greger von NutritionFacts.org entwickelt wurde. Sie enthält 12 Lebensmittelkategorien mit empfohlenen täglichen Portionen, die auf wissenschaftlichen Erkenntnissen zur Prävention chronischer Krankheiten basieren.',
    whatP2: 'Inspiriert von Dr. Michael Gregers Forschung bei NutritionFacts.org.',
    whatLink: 'NutritionFacts.org Daily Dozen →',
    catsHeading: 'Die 12 Kategorien',
    servings: 'Portionen',
    trackHeading: 'Tracke es mit Evida Life',
    trackDesc: 'Unsere App hat einen eingebauten Daily Dozen Tracker – mit täglichen Checkboxen, einem Fortschritts-Gauge und einem Streak-System, das dich motiviert, dranszubleiben.',
    ctaLogin: 'Kostenloses Konto erstellen',
    ctaAlreadyHave: 'Bereits ein Konto?',
    ctaLogIn: 'Einloggen →',
    ctaDark: 'Starte deine Daily Dozen Reise.',
  },
  en: {
    tag: 'DAILY DOZEN',
    title: 'Track what matters most.',
    sub: "Dr. Michael Greger's evidence-based checklist of the 12 food groups to eat every day for optimal health.",
    whatHeading: 'What is the Daily Dozen?',
    whatP1: 'The Daily Dozen is a checklist created by Dr. Michael Greger from NutritionFacts.org. It covers 12 food categories with recommended daily servings, based on scientific evidence for preventing chronic disease.',
    whatP2: 'Inspired by Dr. Michael Greger\'s research at NutritionFacts.org.',
    whatLink: 'NutritionFacts.org Daily Dozen →',
    catsHeading: 'The 12 Categories',
    servings: 'servings',
    trackHeading: 'Track it with Evida Life',
    trackDesc: 'Our app has a built-in Daily Dozen tracker — with daily checkboxes, a progress gauge, and a streak system that keeps you motivated to stay consistent.',
    ctaLogin: 'Create free account to start tracking',
    ctaAlreadyHave: 'Already have an account?',
    ctaLogIn: 'Log in →',
    ctaDark: 'Start your Daily Dozen journey.',
  },
  fr: {
    tag: 'DAILY DOZEN',
    title: 'Suivez ce qui compte le plus.',
    sub: 'La liste de contrôle factuelle du Dr Michael Greger sur les 12 groupes alimentaires à consommer chaque jour pour une santé optimale.',
    whatHeading: "Qu'est-ce que le Daily Dozen ?",
    whatP1: "Le Daily Dozen est une liste de contrôle créée par le Dr Michael Greger de NutritionFacts.org. Elle couvre 12 catégories alimentaires avec des portions quotidiennes recommandées, basées sur des preuves scientifiques pour la prévention des maladies chroniques.",
    whatP2: 'Inspiré par les recherches du Dr Michael Greger sur NutritionFacts.org.',
    whatLink: 'NutritionFacts.org Daily Dozen →',
    catsHeading: 'Les 12 catégories',
    servings: 'portions',
    trackHeading: 'Suivez-le avec Evida Life',
    trackDesc: "Notre application dispose d'un suivi Daily Dozen intégré — avec des cases à cocher quotidiennes, une jauge de progression et un système de série qui vous motive à rester régulier.",
    ctaLogin: 'Créer un compte gratuit pour commencer',
    ctaAlreadyHave: 'Vous avez déjà un compte ?',
    ctaLogIn: 'Se connecter →',
    ctaDark: 'Commencez votre parcours Daily Dozen.',
  },
  es: {
    tag: 'DAILY DOZEN',
    title: 'Registra lo que más importa.',
    sub: 'La lista de verificación basada en evidencia del Dr. Michael Greger de los 12 grupos de alimentos que debes comer cada día para una salud óptima.',
    whatHeading: '¿Qué es el Daily Dozen?',
    whatP1: 'El Daily Dozen es una lista de verificación creada por el Dr. Michael Greger de NutritionFacts.org. Cubre 12 categorías de alimentos con porciones diarias recomendadas, basadas en evidencia científica para prevenir enfermedades crónicas.',
    whatP2: 'Inspirado por la investigación del Dr. Michael Greger en NutritionFacts.org.',
    whatLink: 'NutritionFacts.org Daily Dozen →',
    catsHeading: 'Las 12 categorías',
    servings: 'porciones',
    trackHeading: 'Regístralo con Evida Life',
    trackDesc: 'Nuestra app tiene un rastreador Daily Dozen integrado — con casillas de verificación diarias, un indicador de progreso y un sistema de rachas que te mantiene motivado.',
    ctaLogin: 'Crear cuenta gratuita para empezar',
    ctaAlreadyHave: '¿Ya tienes una cuenta?',
    ctaLogIn: 'Iniciar sesión →',
    ctaDark: 'Comienza tu viaje Daily Dozen.',
  },
  it: {
    tag: 'DAILY DOZEN',
    title: 'Traccia ciò che conta di più.',
    sub: 'La lista di controllo basata su prove scientifiche del Dr. Michael Greger dei 12 gruppi alimentari da mangiare ogni giorno per una salute ottimale.',
    whatHeading: "Cos'è il Daily Dozen?",
    whatP1: "Il Daily Dozen è una lista di controllo creata dal Dr. Michael Greger di NutritionFacts.org. Copre 12 categorie alimentari con porzioni giornaliere raccomandate, basate su prove scientifiche per la prevenzione delle malattie croniche.",
    whatP2: 'Ispirato dalla ricerca del Dr. Michael Greger su NutritionFacts.org.',
    whatLink: 'NutritionFacts.org Daily Dozen →',
    catsHeading: 'Le 12 categorie',
    servings: 'porzioni',
    trackHeading: 'Traccialo con Evida Life',
    trackDesc: "La nostra app ha un tracker Daily Dozen integrato — con caselle di controllo giornaliere, un indicatore di avanzamento e un sistema di serie che ti mantiene motivato.",
    ctaLogin: 'Crea account gratuito per iniziare',
    ctaAlreadyHave: 'Hai già un account?',
    ctaLogIn: 'Accedi →',
    ctaDark: 'Inizia il tuo viaggio Daily Dozen.',
  },
};

const DD_CATEGORIES: Record<Lang, { emoji: string; name: string; servings: number }[]> = {
  de: [
    { emoji: '🫘', name: 'Hülsenfrüchte',       servings: 3 },
    { emoji: '🫐', name: 'Beeren',               servings: 1 },
    { emoji: '🍎', name: 'Andere Früchte',        servings: 3 },
    { emoji: '🥦', name: 'Kreuzblütler',          servings: 1 },
    { emoji: '🥬', name: 'Grünes Blattgemüse',    servings: 2 },
    { emoji: '🥕', name: 'Anderes Gemüse',        servings: 2 },
    { emoji: '🌱', name: 'Leinsamen',             servings: 1 },
    { emoji: '🥜', name: 'Nüsse & Samen',         servings: 1 },
    { emoji: '🌾', name: 'Vollkornprodukte',       servings: 3 },
    { emoji: '🧂', name: 'Gewürze',               servings: 1 },
    { emoji: '💧', name: 'Wasser',                servings: 5 },
    { emoji: '🏃', name: 'Bewegung',              servings: 1 },
  ],
  en: [
    { emoji: '🫘', name: 'Beans',             servings: 3 },
    { emoji: '🫐', name: 'Berries',           servings: 1 },
    { emoji: '🍎', name: 'Other Fruits',      servings: 3 },
    { emoji: '🥦', name: 'Cruciferous Veg',  servings: 1 },
    { emoji: '🥬', name: 'Greens',            servings: 2 },
    { emoji: '🥕', name: 'Other Vegetables', servings: 2 },
    { emoji: '🌱', name: 'Flaxseeds',         servings: 1 },
    { emoji: '🥜', name: 'Nuts & Seeds',      servings: 1 },
    { emoji: '🌾', name: 'Whole Grains',      servings: 3 },
    { emoji: '🧂', name: 'Spices',            servings: 1 },
    { emoji: '💧', name: 'Water',             servings: 5 },
    { emoji: '🏃', name: 'Exercise',          servings: 1 },
  ],
  fr: [
    { emoji: '🫘', name: 'Légumineuses',        servings: 3 },
    { emoji: '🫐', name: 'Baies',               servings: 1 },
    { emoji: '🍎', name: 'Autres fruits',        servings: 3 },
    { emoji: '🥦', name: 'Légumes crucifères',   servings: 1 },
    { emoji: '🥬', name: 'Légumes verts',        servings: 2 },
    { emoji: '🥕', name: 'Autres légumes',       servings: 2 },
    { emoji: '🌱', name: 'Graines de lin',       servings: 1 },
    { emoji: '🥜', name: 'Noix & graines',       servings: 1 },
    { emoji: '🌾', name: 'Céréales complètes',   servings: 3 },
    { emoji: '🧂', name: 'Épices',               servings: 1 },
    { emoji: '💧', name: 'Eau',                  servings: 5 },
    { emoji: '🏃', name: 'Exercice',             servings: 1 },
  ],
  es: [
    { emoji: '🫘', name: 'Legumbres',           servings: 3 },
    { emoji: '🫐', name: 'Bayas',               servings: 1 },
    { emoji: '🍎', name: 'Otras frutas',         servings: 3 },
    { emoji: '🥦', name: 'Crucíferas',           servings: 1 },
    { emoji: '🥬', name: 'Verduras de hoja',     servings: 2 },
    { emoji: '🥕', name: 'Otras verduras',       servings: 2 },
    { emoji: '🌱', name: 'Linaza',               servings: 1 },
    { emoji: '🥜', name: 'Frutos secos y semillas', servings: 1 },
    { emoji: '🌾', name: 'Cereales integrales',  servings: 3 },
    { emoji: '🧂', name: 'Especias',             servings: 1 },
    { emoji: '💧', name: 'Agua',                 servings: 5 },
    { emoji: '🏃', name: 'Ejercicio',            servings: 1 },
  ],
  it: [
    { emoji: '🫘', name: 'Legumi',              servings: 3 },
    { emoji: '🫐', name: 'Bacche',              servings: 1 },
    { emoji: '🍎', name: 'Altra frutta',         servings: 3 },
    { emoji: '🥦', name: 'Verdure crocifere',    servings: 1 },
    { emoji: '🥬', name: 'Verdure a foglia',     servings: 2 },
    { emoji: '🥕', name: 'Altre verdure',        servings: 2 },
    { emoji: '🌱', name: 'Semi di lino',         servings: 1 },
    { emoji: '🥜', name: 'Noci e semi',          servings: 1 },
    { emoji: '🌾', name: 'Cereali integrali',    servings: 3 },
    { emoji: '🧂', name: 'Spezie',               servings: 1 },
    { emoji: '💧', name: 'Acqua',                servings: 5 },
    { emoji: '🏃', name: 'Esercizio',            servings: 1 },
  ],
};

export default async function DailyDozenPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ─── Authenticated: show tracker ─────────────────────────────────────────────
  if (user) {
    const t = T_TRACKER[lang];

    const today = new Date().toISOString().split('T')[0];
    const historyStart = new Date(today + 'T12:00:00');
    historyStart.setDate(historyStart.getDate() - 89);
    const historyStartStr = historyStart.toISOString().split('T')[0];

    const [
      { data: categoryRows },
      { data: histEntryRows },
      { data: streakRow },
    ] = await Promise.all([
      supabase
        .from('daily_dozen_categories')
        .select('id, slug, name, target_servings, icon, sort_order, details')
        .order('sort_order'),

      supabase
        .from('daily_dozen_entries')
        .select('category_id, entry_date, servings_completed')
        .eq('user_id', user.id)
        .gte('entry_date', historyStartStr)
        .lte('entry_date', today)
        .order('entry_date'),

      supabase
        .from('daily_dozen_streaks')
        .select('current_streak_days, longest_streak_days, last_completed_date')
        .eq('user_id', user.id)
        .single(),
    ]);

    const categories: DDCategory[] = (categoryRows ?? []).map((r) => ({
      id:              r.id,
      slug:            r.slug,
      name:            (r.name as { de?: string; en?: string }) ?? {},
      target_servings: r.target_servings,
      icon:            r.icon ?? null,
      sort_order:      r.sort_order,
      details:         (r.details as DDCategory['details']) ?? null,
    }));

    const entries: DDEntry[] = (histEntryRows ?? [])
      .filter((r) => r.entry_date === today)
      .map((r) => ({ category_id: r.category_id, servings: r.servings_completed }));

    const historicalEntries: HistoricalEntry[] = (histEntryRows ?? []).map((r) => ({
      category_id: r.category_id,
      date:        r.entry_date,
      servings:    r.servings_completed,
    }));

    const streak: DDStreak | null = streakRow
      ? {
          current_streak:      streakRow.current_streak_days,
          longest_streak:      streakRow.longest_streak_days,
          last_completed_date: streakRow.last_completed_date ?? null,
        }
      : null;

    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col">
        <PublicNav />
        <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-12">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
            <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.sub}</p>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-[#ceab84]/30 bg-[#ceab84]/8 px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#8a6a3e] mb-1">
                {locale === 'de' ? 'Datenbank-Migration erforderlich' : 'Database migration required'}
              </p>
              <p className="text-xs text-[#8a6a3e]/70">
                {locale === 'de'
                  ? 'Bitte führe die Migration 20260318000004_daily_dozen.sql im Supabase SQL Editor aus.'
                  : 'Please apply migration 20260318000004_daily_dozen.sql in the Supabase SQL Editor.'}
              </p>
            </div>
          ) : (
            <DailyDozenTracker
              userId={user.id}
              categories={categories}
              entries={entries}
              streak={streak}
              lang={lang}
              today={today}
              historicalEntries={historicalEntries}
            />
          )}
        </main>
        <PublicFooter />
      </div>
    );
  }

  // ─── Public: show explainer ───────────────────────────────────────────────────
  const t = T_PUBLIC[lang];
  const cats = DD_CATEGORIES[lang];

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">
      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 pt-32 pb-16">
        <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.tag}</p>
        <h1 className="font-serif font-normal text-4xl md:text-5xl lg:text-[3.5rem] text-[#0e393d] leading-[1.08] tracking-tight mb-5 max-w-[640px]">
          {t.title}
        </h1>
        <p className="text-[1rem] font-light text-[#5a6e6f] leading-relaxed max-w-[520px]">{t.sub}</p>
      </section>

      {/* ─── WHAT IS THE DAILY DOZEN ─── */}
      <section className="border-t border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
          <div>
            <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.12] tracking-tight mb-6">
              {t.whatHeading}
            </h2>
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed">{t.whatP1}</p>
            <p className="text-[0.9rem] text-[#5a6e6f]/70">
              {t.whatP2}{' '}
              <a
                href="https://nutritionfacts.org/daily-dozen/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#ceab84] hover:underline"
              >
                {t.whatLink}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ─── THE 12 CATEGORIES ─── */}
      <section className="bg-[#0e393d] py-16 md:py-20 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-white leading-[1.1] tracking-tight mb-10">
            {t.catsHeading}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cats.map((cat) => (
              <div
                key={cat.name}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <p className="text-white font-light text-[0.88rem] leading-snug">{cat.name}</p>
                <p className="text-white/40 text-[0.75rem]">{cat.servings} {t.servings}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRACK IT WITH EVIDA LIFE ─── */}
      <section className="border-b border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center">
          <div>
            <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.12] tracking-tight mb-5">
              {t.trackHeading}
            </h2>
            <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed mb-8">{t.trackDesc}</p>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Link
                href="/login"
                className="bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
              >
                {t.ctaLogin}
              </Link>
              <span className="text-[#5a6e6f] text-[0.85rem]">
                {t.ctaAlreadyHave}{' '}
                <Link href="/login" className="text-[#ceab84] hover:underline">
                  {t.ctaLogIn}
                </Link>
              </span>
            </div>
          </div>
          {/* Gauge mockup */}
          <div className="flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-[12px] border-[#0e393d]/10 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border-[12px] border-emerald-500/40"
                style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 60%, 50% 100%, 0 60%, 0 0)' }}
              />
              <div className="text-center">
                <span className="font-serif text-4xl text-[#0e393d]">8</span>
                <p className="text-[0.7rem] text-[#5a6e6f] uppercase tracking-wider mt-0.5">/ 12</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DARK CTA ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
        <div className="rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-8 leading-tight">{t.ctaDark}</h2>
          <Link
            href="/login"
            className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
          >
            {t.ctaLogin}
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
