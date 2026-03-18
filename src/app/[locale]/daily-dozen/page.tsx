import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import DailyDozenTracker, { type DDCategory, type DDEntry, type DDStreak } from '@/components/DailyDozenTracker';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Daily Dozen – Evida Life' };

type Lang = 'de' | 'en';

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
};

export default async function DailyDozenPage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: '/login?redirectTo=/daily-dozen', locale });
    return null;
  }

  // Today's date in YYYY-MM-DD (UTC)
  const today = new Date().toISOString().split('T')[0];

  // Fetch categories, today's entries, and streak in parallel
  const [
    { data: categoryRows },
    { data: entryRows },
    { data: streakRow },
  ] = await Promise.all([
    supabase
      .from('daily_dozen_categories')
      .select('id, key, name, target_servings, icon, sort_order')
      .order('sort_order'),

    supabase
      .from('daily_dozen_entries')
      .select('category_id, servings')
      .eq('user_id', user.id)
      .eq('date', today),

    supabase
      .from('daily_dozen_streaks')
      .select('current_streak, longest_streak, last_completed_date')
      .eq('user_id', user.id)
      .single(),
  ]);

  const categories: DDCategory[] = (categoryRows ?? []).map((r) => ({
    id:              r.id,
    key:             r.key,
    name:            (r.name as { de?: string; en?: string }) ?? {},
    target_servings: r.target_servings,
    icon:            r.icon ?? null,
    sort_order:      r.sort_order,
  }));

  const entries: DDEntry[] = (entryRows ?? []).map((r) => ({
    category_id: r.category_id,
    servings:    r.servings,
  }));

  const streak: DDStreak | null = streakRow
    ? {
        current_streak:      streakRow.current_streak,
        longest_streak:      streakRow.longest_streak,
        last_completed_date: streakRow.last_completed_date ?? null,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
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
            lang={locale}
            today={today}
          />
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
