import { getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Dashboard – Evida Life' };

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';
type StatusFlag = 'optimal' | 'good' | 'moderate' | 'risk';

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    eyebrow:       'Übersicht',
    heading:       'Dashboard',
    sub:           'Dein persönlicher Gesundheits-Überblick.',
    score:         'Health Engine Score',
    scoreNone:     'Noch kein Score',
    scoreNoneHint: 'Bestelle deinen ersten Test, um deinen Score zu berechnen.',
    domains:       'Gesundheits-Domänen',
    domainNone:    '—',
    biomarkers:    'Aktuelle Biomarker',
    bioNone:       'Noch keine Testergebnisse',
    bioNoneHint:   'Bestelle deinen ersten Bluttest, um deine Biomarker zu sehen.',
    orderCta:      'Test bestellen',
    dailyDozen:    'Daily Dozen – Heute',
    ddOf:          (done: number, total: number) => `${done} von ${total} Kategorien`,
    quickLinks:    'Schnellzugriff',
    collected:     'Abgenommen',
    streak:        (n: number) => `🔥 ${n} Tage Streak`,
    flagLabels: {
      optimal:  'Optimal',
      good:     'Gut',
      moderate: 'Mäßig',
      risk:     'Risiko',
    },
    domainLabels: {
      metabolic:         'Stoffwechsel',
      cardiovascular:    'Herz-Kreislauf',
      inflammation:      'Entzündung',
      hormonal:          'Hormonal',
      nutritional:       'Ernährung',
      body_composition:  'Körperzusammensetzung',
    },
    quickLinkLabels: {
      shop:       'Teste bestellen',
      dailyDozen: 'Daily Dozen',
      recipes:    'Rezepte',
      profile:    'Profil',
    },
  },
  en: {
    eyebrow:       'Overview',
    heading:       'Dashboard',
    sub:           'Your personal health overview.',
    score:         'Health Engine Score',
    scoreNone:     'No score yet',
    scoreNoneHint: 'Order your first test to calculate your score.',
    domains:       'Health Domains',
    domainNone:    '—',
    biomarkers:    'Latest Biomarkers',
    bioNone:       'No test results yet',
    bioNoneHint:   'Order your first blood test to see your biomarkers.',
    orderCta:      'Order a test',
    dailyDozen:    'Daily Dozen – Today',
    ddOf:          (done: number, total: number) => `${done} of ${total} categories`,
    quickLinks:    'Quick Links',
    collected:     'Collected',
    streak:        (n: number) => `🔥 ${n}-day streak`,
    flagLabels: {
      optimal:  'Optimal',
      good:     'Good',
      moderate: 'Moderate',
      risk:     'Risk',
    },
    domainLabels: {
      metabolic:         'Metabolic',
      cardiovascular:    'Cardiovascular',
      inflammation:      'Inflammation',
      hormonal:          'Hormonal',
      nutritional:       'Nutritional',
      body_composition:  'Body Composition',
    },
    quickLinkLabels: {
      shop:       'Order a test',
      dailyDozen: 'Daily Dozen',
      recipes:    'Recipes',
      profile:    'Profile',
    },
  },
};

const DOMAIN_KEYS = ['metabolic', 'cardiovascular', 'inflammation', 'hormonal', 'nutritional', 'body_composition'] as const;

const DOMAIN_ICONS: Record<string, string> = {
  metabolic:        '⚡',
  cardiovascular:   '❤️',
  inflammation:     '🔥',
  hormonal:         '⚖️',
  nutritional:      '🥗',
  body_composition: '📊',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return '#10b981'; // green
  if (score >= 70) return '#f59e0b'; // yellow
  if (score >= 55) return '#f97316'; // orange
  return '#ef4444';                  // red
}

function scoreLabel(score: number, lang: Lang): string {
  if (lang === 'de') {
    if (score >= 85) return 'Ausgezeichnet';
    if (score >= 70) return 'Gut';
    if (score >= 55) return 'Mäßig';
    return 'Verbesserungsbedarf';
  }
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Needs attention';
}

function flagCls(flag: StatusFlag | null): string {
  switch (flag) {
    case 'optimal':  return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
    case 'good':     return 'bg-[#0e393d]/8 text-[#0e393d] ring-1 ring-[#0e393d]/20';
    case 'moderate': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
    case 'risk':     return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
    default:         return 'bg-gray-50 text-gray-500 ring-1 ring-gray-400/20';
  }
}

function locName(field: unknown): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const f = field as Record<string, string>;
  return f.de || f.en || '';
}

function fmtDate(iso: string | null, lang: Lang): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── SVG Gauge ────────────────────────────────────────────────────────────────
// 270° arc gauge — starts bottom-left, ends bottom-right

const GAUGE_R = 60;
const GAUGE_CX = 80;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;      // ≈ 376.99
const GAUGE_ARC  = GAUGE_CIRC * (270 / 360);   // ≈ 282.74
const GAUGE_GAP  = GAUGE_CIRC - GAUGE_ARC;     // ≈ 94.25

function ScoreGauge({ score, lang }: { score: number; lang: Lang }) {
  const filled  = GAUGE_ARC * (score / 100);
  const color   = scoreColor(score);
  const label   = scoreLabel(score, lang);

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Track */}
        <circle
          cx={GAUGE_CX} cy={GAUGE_CX} r={GAUGE_R}
          fill="none"
          stroke="#0e393d12"
          strokeWidth="10"
          strokeDasharray={`${GAUGE_ARC} ${GAUGE_GAP}`}
          strokeLinecap="round"
          transform={`rotate(135 ${GAUGE_CX} ${GAUGE_CX})`}
        />
        {/* Progress */}
        <circle
          cx={GAUGE_CX} cy={GAUGE_CX} r={GAUGE_R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${filled} ${GAUGE_CIRC - filled}`}
          strokeLinecap="round"
          transform={`rotate(135 ${GAUGE_CX} ${GAUGE_CX})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Score number */}
        <text x={GAUGE_CX} y={GAUGE_CX - 4} textAnchor="middle" dominantBaseline="middle"
          fontSize="28" fontWeight="700" fill={color} fontFamily="serif">
          {Math.round(score)}
        </text>
        {/* /100 */}
        <text x={GAUGE_CX} y={GAUGE_CX + 20} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="#1c2a2b55" fontFamily="sans-serif">
          / 100
        </text>
      </svg>
      <p className="text-sm font-semibold mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

// ─── Domain score card ────────────────────────────────────────────────────────

function DomainCard({ domain, score, label, lang }: {
  domain: string; score: number | null; label: string; lang: Lang;
}) {
  const hasScore = score != null;
  const color    = hasScore ? scoreColor(score!) : '#1c2a2b40';
  const pct      = hasScore ? score! : 0;

  return (
    <div className="rounded-xl border border-[#0e393d]/10 bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{DOMAIN_ICONS[domain] ?? '●'}</span>
        <p className="text-xs font-semibold text-[#0e393d]">{label}</p>
      </div>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-2xl font-bold font-serif" style={{ color }}>
          {hasScore ? Math.round(score!) : '—'}
        </span>
        {hasScore && <span className="text-[10px] text-[#1c2a2b]/35">/ 100</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#0e393d]/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {!hasScore && (
        <p className="mt-1.5 text-[10px] text-[#1c2a2b]/35">
          {lang === 'de' ? 'Kein Wert' : 'No data'}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: '/login?redirectTo=/dashboard', locale });
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  // ── Parallel data fetches ─────────────────────────────────────────────────

  const [
    heScoreRes,
    heDomainRes,
    labResultsRes,
    ddCategoriesRes,
    ddEntriesRes,
    ddStreakRes,
  ] = await Promise.allSettled([
    supabase
      .from('health_engine_scores')
      .select('score, calculated_at')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('health_engine_domain_scores')
      .select('domain, score, calculated_at')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false }),

    supabase
      .from('lab_results')
      .select(`
        id, biomarker_definition_id, value_numeric, status_flag, collected_at,
        biomarker_definitions ( id, name, unit, category )
      `)
      .eq('user_id', user.id)
      .order('collected_at', { ascending: false })
      .limit(200),

    supabase
      .from('daily_dozen_categories')
      .select('id, target_servings')
      .order('sort_order'),

    supabase
      .from('daily_dozen_entries')
      .select('category_id, servings')
      .eq('user_id', user.id)
      .eq('date', today),

    supabase
      .from('daily_dozen_streaks')
      .select('current_streak')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  // ── Extract data safely ───────────────────────────────────────────────────

  const heScore = heScoreRes.status === 'fulfilled' ? heScoreRes.value.data : null;

  const heDomainRows = heDomainRes.status === 'fulfilled' ? (heDomainRes.value.data ?? []) : [];
  // Keep only the most recent row per domain
  const domainMap: Record<string, number> = {};
  for (const row of heDomainRows) {
    if (row.domain && !(row.domain in domainMap)) {
      domainMap[row.domain] = row.score;
    }
  }

  const labRows = labResultsRes.status === 'fulfilled' ? (labResultsRes.value.data ?? []) : [];
  // Deduplicate: keep most recent result per biomarker
  const seenBiomarkers = new Set<string>();
  const latestResults = labRows.filter((r) => {
    if (seenBiomarkers.has(r.biomarker_definition_id)) return false;
    seenBiomarkers.add(r.biomarker_definition_id);
    return true;
  });
  // Group by body system (biomarker_definitions.category)
  const bySystem: Record<string, typeof latestResults> = {};
  for (const r of latestResults) {
    const bd = r.biomarker_definitions as unknown as { id: string; name: unknown; unit: string | null; category: string | null } | null;
    const system = bd?.category ?? 'other';
    if (!bySystem[system]) bySystem[system] = [];
    bySystem[system].push(r);
  }

  const ddCategories = ddCategoriesRes.status === 'fulfilled' ? (ddCategoriesRes.value.data ?? []) : [];
  const ddEntries    = ddEntriesRes.status === 'fulfilled'    ? (ddEntriesRes.value.data ?? [])    : [];
  const ddStreak     = ddStreakRes.status === 'fulfilled'     ? ddStreakRes.value.data              : null;

  const ddDone = ddCategories.filter((cat) => {
    const entry = ddEntries.find((e) => e.category_id === cat.id);
    return (entry?.servings ?? 0) >= cat.target_servings;
  }).length;
  const ddTotal = ddCategories.length;
  const ddPct   = ddTotal > 0 ? Math.round((ddDone / ddTotal) * 100) : 0;
  const ddAllDone = ddDone === ddTotal && ddTotal > 0;

  const hasLabResults = latestResults.length > 0;
  const systemKeys    = Object.keys(bySystem).sort();

  const quickLinks = [
    { href: '/shop',         label: t.quickLinkLabels.shop,       icon: '🧪' },
    { href: '/daily-dozen',  label: t.quickLinkLabels.dailyDozen, icon: '🥗' },
    { href: '/recipes',      label: t.quickLinkLabels.recipes,    icon: '👨‍🍳' },
    { href: '/profile',      label: t.quickLinkLabels.profile,    icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-3xl text-[#0e393d]">{t.heading}</h1>
        </div>

        {/* ── Score + Quick links ─────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">

          {/* Score card */}
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 flex flex-col items-center min-w-[200px]">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.score}</p>
            {heScore ? (
              <ScoreGauge score={heScore.score} lang={locale} />
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                {/* Empty gauge */}
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx={GAUGE_CX} cy={GAUGE_CX} r={GAUGE_R}
                    fill="none" stroke="#0e393d12" strokeWidth="10"
                    strokeDasharray={`${GAUGE_ARC} ${GAUGE_GAP}`} strokeLinecap="round"
                    transform={`rotate(135 ${GAUGE_CX} ${GAUGE_CX})`} />
                  <text x={GAUGE_CX} y={GAUGE_CX} textAnchor="middle" dominantBaseline="middle"
                    fontSize="13" fill="#1c2a2b40" fontFamily="sans-serif">—</text>
                </svg>
                <p className="text-sm font-medium text-[#1c2a2b]/50 mt-1">{t.scoreNone}</p>
                <p className="text-xs text-[#1c2a2b]/35 mt-1 max-w-[140px]">{t.scoreNoneHint}</p>
              </div>
            )}
          </div>

          {/* Quick links + Daily Dozen mini */}
          <div className="space-y-4">

            {/* Daily Dozen mini */}
            <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84]">{t.dailyDozen}</p>
                <div className="flex items-center gap-3">
                  {ddStreak?.current_streak ? (
                    <span className="text-xs font-medium text-[#0e393d]">{t.streak(ddStreak.current_streak)}</span>
                  ) : null}
                  <Link href="/daily-dozen" className="text-xs font-medium text-[#0e393d] hover:underline">
                    {locale === 'de' ? 'Details →' : 'Details →'}
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2.5 rounded-full bg-[#0e393d]/8 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${ddAllDone ? 'bg-emerald-500' : 'bg-[#ceab84]'}`}
                    style={{ width: `${ddPct}%` }}
                  />
                </div>
                <span className={`shrink-0 text-sm font-bold tabular-nums ${ddAllDone ? 'text-emerald-600' : 'text-[#0e393d]'}`}>
                  {ddPct}%
                </span>
              </div>
              <p className="text-xs text-[#1c2a2b]/45">
                {ddTotal > 0 ? t.ddOf(ddDone, ddTotal) : (locale === 'de' ? 'Keine Kategorien gefunden' : 'No categories found')}
                {ddAllDone && ' 🎉'}
              </p>
            </div>

            {/* Quick links grid */}
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((ql) => (
                <Link
                  key={ql.href}
                  href={ql.href}
                  className="flex items-center gap-3 rounded-xl border border-[#0e393d]/10 bg-white px-4 py-3.5 hover:border-[#0e393d]/30 hover:bg-[#0e393d]/3 transition group"
                >
                  <span className="text-xl">{ql.icon}</span>
                  <span className="text-sm font-medium text-[#0e393d] group-hover:text-[#1a5055] transition-colors">{ql.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Domain scores ───────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.domains}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DOMAIN_KEYS.map((domain) => (
              <DomainCard
                key={domain}
                domain={domain}
                score={domainMap[domain] ?? null}
                label={t.domainLabels[domain]}
                lang={locale}
              />
            ))}
          </div>
        </section>

        {/* ── Latest biomarkers ───────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.biomarkers}</p>

          {!hasLabResults ? (
            <div className="rounded-2xl border border-[#0e393d]/10 bg-white py-16 text-center">
              <p className="text-3xl mb-3">🧪</p>
              <p className="text-base font-serif text-[#0e393d] mb-1">{t.bioNone}</p>
              <p className="text-sm text-[#1c2a2b]/50 mb-6">{t.bioNoneHint}</p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-[#0e393d] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition"
              >
                {t.orderCta} →
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {systemKeys.map((system) => {
                const results = bySystem[system];
                return (
                  <div key={system} className="rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#0e393d]/8 bg-[#0e393d]/3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#0e393d]/60 capitalize">
                        {system.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="divide-y divide-[#0e393d]/6">
                      {results.map((r) => {
                        const bd = r.biomarker_definitions as unknown as { id: string; name: unknown; unit: string | null; category: string | null } | null;
                        const name = locName(bd?.name);
                        const flag = r.status_flag as StatusFlag | null;
                        const flagLabel = flag ? t.flagLabels[flag] : null;

                        return (
                          <div key={r.id} className="flex items-center px-5 py-3 gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1c2a2b] truncate">{name}</p>
                              {r.collected_at && (
                                <p className="text-[11px] text-[#1c2a2b]/35">
                                  {t.collected} {fmtDate(r.collected_at, locale)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {r.value_numeric != null && (
                                <span className="text-sm font-semibold tabular-nums text-[#1c2a2b]">
                                  {r.value_numeric}
                                  {bd?.unit && <span className="ml-0.5 text-[11px] font-normal text-[#1c2a2b]/45">{bd.unit}</span>}
                                </span>
                              )}
                              {flagLabel && (
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${flagCls(flag)}`}>
                                  {flagLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
