import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEnginePublic from '@/components/health/HealthEnginePublic';
import HealthEngineDashboard from '@/components/health/HealthEngineDashboard';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Health Engine – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

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

  // ?view=info → always show sample / info page
  if (params.view === 'info') {
    return (
      <>
        <PublicNav />
        <HealthEnginePublic lang={lang} />
        <PublicFooter />
      </>
    );
  }

  // ── Auth check ──────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <PublicNav />
        <HealthEnginePublic lang={lang} />
        <PublicFooter />
      </>
    );
  }

  // ── Fetch all data in parallel ──────────────────────────────────
  const [profileRes, reportsRes, resultsRes, defsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, birthday, sex, height_cm')
      .eq('id', user.id)
      .single(),
    supabase
      .from('lab_reports')
      .select('id, title, test_date, status')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'completed'])
      .order('test_date', { ascending: true }),
    supabase
      .from('lab_results')
      .select(
        'id, lab_report_id, biomarker_definition_id, value_numeric, unit, status_flag, measured_at, test_date',
      )
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('measured_at', { ascending: true }),
    supabase
      .from('biomarkers')
      .select(
        'id, slug, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, item_type, sort_order',
      )
      .eq('is_active', true),
  ]);

  const profile = profileRes.data;
  const reports = reportsRes.data ?? [];
  const results = resultsRes.data ?? [];
  const definitions = defsRes.data ?? [];

  // No data → show sample
  if (!reports.length || !results.length) {
    return (
      <>
        <PublicNav />
        <HealthEnginePublic lang={lang} />
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicNav />
      <HealthEngineDashboard
        lang={lang}
        userId={user.id}
        profile={profile}
        reports={reports}
        results={results}
        definitions={definitions}
      />
      <PublicFooter />
    </>
  );
}
