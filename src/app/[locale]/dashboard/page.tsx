import { getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';
import { T } from './translations';
import BirthdayNudgeBanner from '@/components/health/BirthdayNudgeBanner';

export const metadata = { title: 'Dashboard – Evida Life' };

// ─── Types ────────────────────────────────────────────────────────────────────

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];
type StatusFlag = 'optimal' | 'good' | 'moderate' | 'risk';

// Bio-age biomarker slugs (stored in the biomarkers table)
const BIOAGE_SLUGS = ['pheno_age', 'grim_age_v2', 'dunedin_pace'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 70) return '#f59e0b';
  if (score >= 55) return '#f97316';
  return '#ef4444';
}

const SCORE_LABELS: Record<Lang, [string, string, string, string]> = {
  de: ['Ausgezeichnet', 'Gut', 'Mäßig', 'Verbesserungsbedarf'],
  en: ['Excellent', 'Good', 'Fair', 'Needs attention'],
  fr: ['Excellent', 'Bien', 'Passable', 'À améliorer'],
  es: ['Excelente', 'Bien', 'Regular', 'Necesita atención'],
  it: ['Eccellente', 'Buono', 'Discreto', 'Da migliorare'],
};

function scoreLabel(score: number, lang: Lang): string {
  const [l1, l2, l3, l4] = SCORE_LABELS[lang];
  if (score >= 85) return l1;
  if (score >= 70) return l2;
  if (score >= 55) return l3;
  return l4;
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

function locName(field: unknown, lang: Lang = 'en'): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const f = field as Record<string, string>;
  return f[lang] || f.en || f.de || '';
}

const LOCALE_MAP: Record<Lang, string> = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT' };

function fmtDate(iso: string | null, lang: Lang): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(LOCALE_MAP[lang], {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── SVG Gauge ────────────────────────────────────────────────────────────────

const GAUGE_R = 52;
const GAUGE_CX = 70;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;
const GAUGE_ARC  = GAUGE_CIRC * (270 / 360);
const GAUGE_GAP  = GAUGE_CIRC - GAUGE_ARC;

function ScoreGauge({ score, lang }: { score: number; lang: Lang }) {
  const filled  = GAUGE_ARC * (score / 100);
  const color   = scoreColor(score);
  const label   = scoreLabel(score, lang);

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx={GAUGE_CX} cy={GAUGE_CX} r={GAUGE_R}
          fill="none" stroke="#0e393d12" strokeWidth="9"
          strokeDasharray={`${GAUGE_ARC} ${GAUGE_GAP}`}
          strokeLinecap="round" transform={`rotate(135 ${GAUGE_CX} ${GAUGE_CX})`} />
        <circle cx={GAUGE_CX} cy={GAUGE_CX} r={GAUGE_R}
          fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${filled} ${GAUGE_CIRC - filled}`}
          strokeLinecap="round" transform={`rotate(135 ${GAUGE_CX} ${GAUGE_CX})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        <text x={GAUGE_CX} y={GAUGE_CX - 4} textAnchor="middle" dominantBaseline="middle"
          fontSize="26" fontWeight="700" fill={color} fontFamily="serif">
          {Math.round(score)}
        </text>
        <text x={GAUGE_CX} y={GAUGE_CX + 18} textAnchor="middle" dominantBaseline="middle"
          fontSize="10" fill="#1c2a2b55" fontFamily="sans-serif">/ 100</text>
      </svg>
      <p className="text-sm font-semibold mt-1" style={{ color }}>{label}</p>
    </div>
  );
}

function EmptyGauge() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx={GAUGE_CX} cy={GAUGE_CX} r={GAUGE_R}
        fill="none" stroke="#0e393d12" strokeWidth="9"
        strokeDasharray={`${GAUGE_ARC} ${GAUGE_GAP}`}
        strokeLinecap="round" transform={`rotate(135 ${GAUGE_CX} ${GAUGE_CX})`} />
      <text x={GAUGE_CX} y={GAUGE_CX} textAnchor="middle" dominantBaseline="middle"
        fontSize="13" fill="#1c2a2b40" fontFamily="sans-serif">—</text>
    </svg>
  );
}

// ── Mini progress bar component ──────────────────────────────────────────────

function MiniProgress({ label, pct, done, total, suffix, allDone, href }: {
  label: string; pct: number; done: number; total: number; suffix: string;
  allDone: boolean; href: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-[#1c2a2b]">{label}</span>
        <Link href={href} className="text-[11px] font-medium text-[#0e393d]/60 hover:text-[#0e393d] hover:underline transition">
          Details →
        </Link>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-2 rounded-full bg-[#0e393d]/8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-[#ceab84]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`shrink-0 text-xs font-bold tabular-nums ${allDone ? 'text-emerald-600' : 'text-[#0e393d]'}`}>
          {pct}%
        </span>
      </div>
      <p className="text-[11px] text-[#1c2a2b]/40 mt-1">
        {done} / {total} {suffix}{allDone ? ' 🎉' : ''}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
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
    labResultsRes,
    bioageRes,
    ddCategoriesRes,
    ddEntriesRes,
    ddStreakRes,
    profileRes,
    checklistItemsRes,
    checklistEntriesRes,
    userSettingsRes,
    likedRecipesCountRes,
  ] = await Promise.allSettled([
    // 0: Health Engine Score
    supabase
      .from('health_engine_scores')
      .select('score, calculated_at')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 1: Lab results (biomarkers)
    supabase
      .from('lab_results')
      .select(`
        id, biomarker_definition_id, value_numeric, status_flag, collected_at,
        biomarker_definitions:biomarkers!inner( id, slug, name, unit, he_domain )
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('collected_at', { ascending: false })
      .limit(200),

    // 2: Bio-age biomarker results (pheno_age, grim_age_v2, dunedin_pace)
    supabase
      .from('lab_results')
      .select(`
        value_numeric, collected_at, status_flag,
        biomarker_definitions:biomarkers!inner( slug, name, unit )
      `)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .in('biomarker_definitions.slug', [...BIOAGE_SLUGS])
      .order('collected_at', { ascending: false })
      .limit(10),

    // 3: Daily Dozen categories
    supabase
      .from('daily_dozen_categories')
      .select('id, target_servings')
      .order('sort_order'),

    // 4: Daily Dozen entries
    supabase
      .from('daily_dozen_entries')
      .select('category_id, servings_completed')
      .eq('user_id', user.id)
      .eq('entry_date', today),

    // 5: Daily Dozen streak
    supabase
      .from('daily_dozen_streaks')
      .select('current_streak_days')
      .eq('user_id', user.id)
      .maybeSingle(),

    // 6: Profile (birthday)
    supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('id', user.id)
      .single(),

    // 7: Checklist items (21 Tweaks + Anti-Aging 8)
    supabase
      .from('daily_checklist_items')
      .select('id, framework, target_servings')
      .eq('is_active', true)
      .in('framework', ['21_tweaks', 'anti_aging']),

    // 8: Checklist entries for today
    supabase
      .from('daily_checklist_entries')
      .select('checklist_item_id, servings_completed, is_done')
      .eq('user_id', user.id)
      .eq('entry_date', today),

    // 9: User settings (tweaks/anti-aging enabled)
    supabase
      .from('user_settings')
      .select('tweaks_enabled, anti_aging_enabled')
      .eq('user_id', user.id)
      .single(),

    // 10: Liked recipes count (rating >= 4)
    supabase
      .from('recipe_ratings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('rating', 4),
  ]);

  // ── Extract data safely ───────────────────────────────────────────────────

  const heScore = heScoreRes.status === 'fulfilled' ? heScoreRes.value.data : null;

  // Lab results
  const labRows = labResultsRes.status === 'fulfilled' ? (labResultsRes.value.data ?? []) : [];
  const seenBiomarkers = new Set<string>();
  const latestResults = labRows.filter((r) => {
    if (seenBiomarkers.has(r.biomarker_definition_id)) return false;
    seenBiomarkers.add(r.biomarker_definition_id);
    return true;
  });
  const bySystem: Record<string, typeof latestResults> = {};
  for (const r of latestResults) {
    const bd = r.biomarker_definitions as unknown as { id: string; slug: string; name: unknown; unit: string | null; he_domain: string | null } | null;
    const system = bd?.he_domain ?? 'other';
    if (!bySystem[system]) bySystem[system] = [];
    bySystem[system].push(r);
  }

  // Biological age data
  type BioageRow = { slug: string; name: unknown; unit: string; value: number; status_flag: string | null; collected_at: string | null };
  const bioageRows: BioageRow[] = [];
  if (bioageRes.status === 'fulfilled') {
    const raw = bioageRes.value.data ?? [];
    const seenSlugs = new Set<string>();
    for (const r of raw) {
      const bd = r.biomarker_definitions as unknown as { slug: string; name: unknown; unit: string } | null;
      if (!bd || seenSlugs.has(bd.slug)) continue;
      seenSlugs.add(bd.slug);
      if (r.value_numeric != null) {
        bioageRows.push({
          slug: bd.slug,
          name: bd.name,
          unit: bd.unit,
          value: Number(r.value_numeric),
          status_flag: r.status_flag,
          collected_at: r.collected_at,
        });
      }
    }
  }
  const hasBioage = bioageRows.length > 0;
  // Use GrimAge v2 or PhenoAge as the "headline" biological age (in years)
  const headlineBioage = bioageRows.find(b => b.slug === 'grim_age_v2') ?? bioageRows.find(b => b.slug === 'pheno_age');

  // Daily Dozen
  const ddCategories = ddCategoriesRes.status === 'fulfilled' ? (ddCategoriesRes.value.data ?? []) : [];
  const ddEntries    = ddEntriesRes.status === 'fulfilled'    ? (ddEntriesRes.value.data ?? [])    : [];
  const ddStreak     = ddStreakRes.status === 'fulfilled'     ? ddStreakRes.value.data              : null;

  const ddTotalServings = ddCategories.reduce((s, c) => s + c.target_servings, 0);
  const ddDone = ddCategories.reduce((s, cat) => {
    const entry = ddEntries.find((e) => e.category_id === cat.id);
    return s + Math.min(entry?.servings_completed ?? 0, cat.target_servings);
  }, 0);
  const ddPct     = ddTotalServings > 0 ? Math.round((ddDone / ddTotalServings) * 100) : 0;
  const ddAllDone = ddTotalServings > 0 && ddDone >= ddTotalServings;

  // 21 Tweaks + Anti-Aging 8
  const checklistItems  = checklistItemsRes.status === 'fulfilled' ? (checklistItemsRes.value.data ?? []) : [];
  const checklistEntries = checklistEntriesRes.status === 'fulfilled' ? (checklistEntriesRes.value.data ?? []) : [];
  const userSettings = userSettingsRes.status === 'fulfilled' ? userSettingsRes.value.data : null;

  const tweaksEnabled    = userSettings?.tweaks_enabled ?? false;
  const antiAgingEnabled = userSettings?.anti_aging_enabled ?? false;

  const tweaksItems  = checklistItems.filter(i => i.framework === '21_tweaks');
  const aaItems      = checklistItems.filter(i => i.framework === 'anti_aging');

  function computeChecklistProgress(items: typeof checklistItems) {
    const totalServings = items.reduce((s, i) => s + (i.target_servings ?? 1), 0);
    const doneServings = items.reduce((s, item) => {
      const entry = checklistEntries.find(e => e.checklist_item_id === item.id);
      return s + Math.min(entry?.servings_completed ?? 0, item.target_servings ?? 1);
    }, 0);
    const pct = totalServings > 0 ? Math.round((doneServings / totalServings) * 100) : 0;
    return { done: doneServings, total: totalServings, pct, allDone: totalServings > 0 && doneServings >= totalServings };
  }

  const tweaksProgress = computeChecklistProgress(tweaksItems);
  const aaProgress     = computeChecklistProgress(aaItems);

  // Profile & recipes
  const profileData = profileRes.status === 'fulfilled' ? profileRes.value.data : null;
  const hasBirthday = !!profileData?.date_of_birth;

  const likedRecipesCount = likedRecipesCountRes.status === 'fulfilled'
    ? (likedRecipesCountRes.value.count ?? 0)
    : 0;

  const hasLabResults = latestResults.length > 0;
  const systemKeys    = Object.keys(bySystem).sort();

  // Count markers by status
  const statusCounts = { optimal: 0, good: 0, moderate: 0, risk: 0 };
  for (const r of latestResults) {
    const f = r.status_flag as StatusFlag | null;
    if (f && f in statusCounts) statusCounts[f as keyof typeof statusCounts]++;
  }

  const quickLinks = [
    { href: '/profile?tab=lab-results', label: t.quickLinkLabels.labResults, icon: '🧪' },
    { href: '/research',                label: t.quickLinkLabels.research,   icon: '🔬' },
    { href: '/daily-dozen',             label: t.quickLinkLabels.dailyDozen, icon: '🥗' },
    { href: '/recipes',                 label: t.quickLinkLabels.recipes,    icon: '👨‍🍳' },
    { href: '/shop',                    label: t.quickLinkLabels.shop,       icon: '🛒' },
    { href: '/profile',                 label: t.quickLinkLabels.profile,    icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#0e393d] px-6 pt-28 pb-14">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-white leading-tight">{t.heading}</h1>
        </div>
      </section>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── Score + Biological Age ─────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2">

          {/* Health Engine Score */}
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.score}</p>
            {heScore ? (
              <>
                <ScoreGauge score={heScore.score} lang={lang} />
                <p className="text-[11px] text-[#1c2a2b]/35 mt-2">
                  {t.collected} {fmtDate(heScore.calculated_at, lang)}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center py-2 text-center">
                <EmptyGauge />
                <p className="text-sm font-medium text-[#1c2a2b]/50 mt-1">{t.scoreNone}</p>
                <p className="text-xs text-[#1c2a2b]/35 mt-1 max-w-[180px]">{t.scoreNoneHint}</p>
              </div>
            )}
            {hasLabResults && (
              <div className="flex gap-2 mt-4 flex-wrap justify-center">
                {statusCounts.optimal > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${flagCls('optimal')}`}>
                    {statusCounts.optimal} {t.flagLabels.optimal}
                  </span>
                )}
                {statusCounts.good > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${flagCls('good')}`}>
                    {statusCounts.good} {t.flagLabels.good}
                  </span>
                )}
                {statusCounts.moderate > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${flagCls('moderate')}`}>
                    {statusCounts.moderate} {t.flagLabels.moderate}
                  </span>
                )}
                {statusCounts.risk > 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${flagCls('risk')}`}>
                    {statusCounts.risk} {t.flagLabels.risk}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Biological Age */}
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 flex flex-col items-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.bioage}</p>

            {hasBioage && headlineBioage ? (
              <div className="flex flex-col items-center">
                {/* Large age ring */}
                <div className="w-[140px] h-[140px] rounded-full border-[9px] border-[#0e393d]/15 flex flex-col items-center justify-center">
                  <span className="text-3xl font-serif font-bold text-[#0e393d]">
                    {headlineBioage.value.toFixed(1)}
                  </span>
                  <span className="text-[10px] text-[#1c2a2b]/40 mt-0.5">{t.bioageYears}</span>
                </div>
                <p className="text-xs font-medium text-[#0e393d] mt-3">
                  {locName(headlineBioage.name, lang)}
                </p>
                {headlineBioage.collected_at && (
                  <p className="text-[11px] text-[#1c2a2b]/35 mt-1">
                    {t.collected} {fmtDate(headlineBioage.collected_at, lang)}
                  </p>
                )}
                {/* Other clocks */}
                {bioageRows.length > 1 && (
                  <div className="flex gap-4 mt-4 pt-3 border-t border-[#0e393d]/6 w-full justify-center">
                    {bioageRows.filter(b => b.slug !== headlineBioage.slug).map(b => (
                      <div key={b.slug} className="text-center">
                        <p className="text-lg font-serif font-bold text-[#0e393d]">
                          {b.slug === 'dunedin_pace' ? b.value.toFixed(2) : b.value.toFixed(1)}
                        </p>
                        <p className="text-[10px] text-[#1c2a2b]/40">
                          {locName(b.name, lang)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-2 text-center">
                <div className="w-[140px] h-[140px] rounded-full border-[9px] border-[#0e393d]/8 flex items-center justify-center">
                  <span className="text-[13px] text-[#1c2a2b]/40">—</span>
                </div>
                <p className="text-sm font-medium text-[#1c2a2b]/50 mt-3">{t.bioageNone}</p>
                <p className="text-xs text-[#1c2a2b]/35 mt-1 max-w-[200px]">{t.bioageHint}</p>
                <Link href="/bioage" className="mt-3 text-xs font-semibold text-[#0e393d] hover:underline">
                  {t.bioageOrder}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Closed-loop mini ───────────────────────────────────────────── */}
        <div className="rounded-2xl bg-[#0e393d] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-5">{t.loop}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {t.loopSteps.map((step, i) => (
              <Link key={i} href={step.href}
                className="relative rounded-xl bg-white/[.07] border border-white/10 p-4 hover:bg-white/[.12] transition group">
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">{step.num}</div>
                <h3 className="text-sm font-semibold text-white mb-0.5">{step.label}</h3>
                <p className="text-[11px] font-light text-white/40 leading-relaxed">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden sm:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-white/20 text-sm">›</div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Daily Trackers (Daily Dozen + 21 Tweaks + Anti-Aging 8) ────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84]">{t.dailyDozen}</p>
            <div className="flex items-center gap-3">
              {ddStreak?.current_streak_days ? (
                <span className="text-xs font-medium text-[#0e393d]">{t.streak(ddStreak.current_streak_days)}</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5 space-y-5">
            {/* Daily Dozen */}
            <MiniProgress
              label="Daily Dozen"
              pct={ddPct}
              done={ddDone}
              total={ddTotalServings}
              suffix={lang === 'de' ? 'Portionen' : lang === 'fr' ? 'portions' : lang === 'es' ? 'porciones' : lang === 'it' ? 'porzioni' : 'servings'}
              allDone={ddAllDone}
              href="/daily-dozen"
            />

            {/* 21 Tweaks */}
            {tweaksEnabled && tweaksItems.length > 0 && (
              <>
                <div className="border-t border-[#0e393d]/6" />
                <MiniProgress
                  label="21 Tweaks"
                  pct={tweaksProgress.pct}
                  done={tweaksProgress.done}
                  total={tweaksProgress.total}
                  suffix={lang === 'de' ? 'erledigt' : lang === 'fr' ? 'complétés' : lang === 'es' ? 'completados' : lang === 'it' ? 'completati' : 'completed'}
                  allDone={tweaksProgress.allDone}
                  href="/daily-dozen"
                />
              </>
            )}

            {/* Anti-Aging 8 */}
            {antiAgingEnabled && aaItems.length > 0 && (
              <>
                <div className="border-t border-[#0e393d]/6" />
                <MiniProgress
                  label="Anti-Aging 8"
                  pct={aaProgress.pct}
                  done={aaProgress.done}
                  total={aaProgress.total}
                  suffix={lang === 'de' ? 'erledigt' : lang === 'fr' ? 'complétés' : lang === 'es' ? 'completados' : lang === 'it' ? 'completati' : 'completed'}
                  allDone={aaProgress.allDone}
                  href="/daily-dozen"
                />
              </>
            )}

            {/* Enable hint */}
            {(!tweaksEnabled || !antiAgingEnabled) && (
              <p className="text-[11px] text-[#1c2a2b]/30 pt-2 border-t border-[#0e393d]/6">
                {!tweaksEnabled && !antiAgingEnabled
                  ? (lang === 'de' ? '21 Tweaks & Anti-Aging 8 in den Profil-Einstellungen freischalten →'
                    : lang === 'fr' ? 'Débloquez 21 Tweaks & Anti-Aging 8 dans les paramètres du profil →'
                    : lang === 'es' ? 'Desbloquea 21 Tweaks & Anti-Aging 8 en la configuración del perfil →'
                    : lang === 'it' ? 'Sblocca 21 Tweaks & Anti-Aging 8 nelle impostazioni del profilo →'
                    : 'Unlock 21 Tweaks & Anti-Aging 8 in your profile settings →')
                  : !tweaksEnabled
                  ? (lang === 'de' ? '21 Tweaks in Profil-Einstellungen freischalten →' : 'Unlock 21 Tweaks in profile settings →')
                  : (lang === 'de' ? 'Anti-Aging 8 in Profil-Einstellungen freischalten →' : 'Unlock Anti-Aging 8 in profile settings →')}
              </p>
            )}
          </div>
        </section>

        {/* ── AI Research + Liked Recipes row ─────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2">

          {/* AI Research */}
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.research}</p>
            <p className="text-[13px] text-[#1c2a2b]/50 leading-relaxed mb-4">{t.researchDesc}</p>
            <div className="mt-auto">
              <Link href="/research"
                className="inline-flex items-center gap-2 rounded-full bg-[#0e393d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition">
                {t.researchCta}
              </Link>
            </div>
          </div>

          {/* Liked Recipes */}
          <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5 flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.likedRecipes}</p>
            <p className="text-[13px] text-[#1c2a2b]/50 leading-relaxed mb-4">{t.likedRecipesDesc}</p>
            <div className="flex items-center gap-3 mt-auto">
              <Link href="/recipes"
                className="inline-flex items-center gap-2 rounded-full bg-[#0e393d] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition">
                {t.likedRecipesCta}
              </Link>
              {likedRecipesCount > 0 && (
                <span className="text-xs font-medium text-[#0e393d]/50">
                  {likedRecipesCount} {lang === 'de' ? 'Favoriten' : lang === 'fr' ? 'favoris' : lang === 'es' ? 'favoritos' : lang === 'it' ? 'preferiti' : 'favorites'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Birthday nudge ──────────────────────────────────────────────── */}
        {hasLabResults && !hasBirthday && (
          <BirthdayNudgeBanner locale={locale} />
        )}

        {/* ── Quick actions ──────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.quickActions}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickLinks.map((ql) => (
              <Link key={ql.href} href={ql.href}
                className="flex items-center gap-3 rounded-xl border border-[#0e393d]/10 bg-white px-4 py-3.5 hover:border-[#0e393d]/30 hover:bg-[#0e393d]/3 transition group">
                <span className="text-xl">{ql.icon}</span>
                <span className="text-sm font-medium text-[#0e393d] group-hover:text-[#1a5055] transition-colors">{ql.label}</span>
              </Link>
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
              <Link href="/profile?tab=lab-results"
                className="inline-flex items-center gap-2 rounded-full bg-[#0e393d] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0e393d]/85 transition">
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
                        const bd = r.biomarker_definitions as unknown as { id: string; slug: string; name: unknown; unit: string | null; he_domain: string | null } | null;
                        const name = locName(bd?.name, lang);
                        const flag = r.status_flag as StatusFlag | null;
                        const flagLabel = flag ? t.flagLabels[flag] : null;

                        return (
                          <div key={r.id} className="flex items-center px-5 py-3 gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1c2a2b] truncate">{name}</p>
                              {r.collected_at && (
                                <p className="text-[11px] text-[#1c2a2b]/35">
                                  {t.collected} {fmtDate(r.collected_at, lang)}
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
