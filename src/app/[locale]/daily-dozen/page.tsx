import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
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

const T = {
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

export default async function DailyDozenPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: '/login?redirectTo=/daily-dozen', locale });
    return null;
  }

  // Today's date in YYYY-MM-DD (UTC)
  const today = new Date().toISOString().split('T')[0];

  // 90 days back for per-category streak calculation
  const historyStart = new Date(today + 'T12:00:00');
  historyStart.setDate(historyStart.getDate() - 89);
  const historyStartStr = historyStart.toISOString().split('T')[0];

  // Fetch categories, entries (last 90 days), and streak in parallel
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

  // Derive today's entries from the historical set
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
        {/* Hero */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
          <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.sub}</p>
        </div>

        {categories.length === 0 ? (
          /* Migration hasn't been applied yet */
          <div className="rounded-2xl border border-[#ceab84]/30 bg-[#ceab84]/8 px-6 py-10 text-center">
            <p className="text-sm font-medium text-[#8a6a3e] mb-1">
              {locale === 'de'
                ? 'Datenbank-Migration erforderlich'
                : 'Database migration required'}
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
