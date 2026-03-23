import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEngineContent from '@/components/health/HealthEngineContent';
import { createClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/health-score';

export const metadata = { title: 'Health Dashboard – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

export default async function HealthEnginePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: '/login?redirectTo=/health-engine', locale });
    return null;
  }

  // ── Fetch all lab results for this user ────────────────────────────────────
  const { data: rawResults } = await supabase
    .from('lab_results')
    .select('id, value_numeric, unit, status_flag, measured_at, biomarker_definition_id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('measured_at', { ascending: false });

  const labResults = rawResults ?? [];

  // ── Fetch biomarker definitions for these results ─────────────────────────
  const defIds = [...new Set(labResults.map((r) => r.biomarker_definition_id).filter(Boolean))] as string[];

  const { data: rawDefs } = defIds.length > 0
    ? await supabase
        .from('biomarker_definitions')
        .select('id, slug, name, unit, category, reference_range_low, reference_range_high, optimal_range_low, optimal_range_high')
        .in('id', defIds)
    : { data: [] };

  const definitions = rawDefs ?? [];

  // ── Compute health scores ──────────────────────────────────────────────────
  const scores = computeHealthScore(labResults, definitions, lang);

  // ── Pass definition meta to client for trend charts ───────────────────────
  const defMeta = definitions.map((d) => ({
    id: d.id,
    reference_range_low: d.reference_range_low ?? null,
    reference_range_high: d.reference_range_high ?? null,
    optimal_range_low: d.optimal_range_low ?? null,
    optimal_range_high: d.optimal_range_high ?? null,
    unit: d.unit ?? null,
  }));

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <HealthEngineContent
        lang={lang}
        userId={user.id}
        scores={scores}
        definitions={defMeta}
      />
      <PublicFooter />
    </div>
  );
}
