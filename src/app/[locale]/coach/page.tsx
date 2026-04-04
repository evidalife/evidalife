import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import CoachPage from '@/components/coach/CoachPage';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { continuousScore, ageRatioScore } from '@/lib/health-engine';

export const metadata = { title: 'Coach – Evida Life' };

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

// Fallback weights — overridden by DB ai_settings when available
const DEFAULT_WEIGHTS: Record<string, number> = {
  heart_vessels: 0.18, metabolism: 0.16, inflammation: 0.14, organ_function: 0.13,
  nutrients: 0.10, hormones: 0.09, body_composition: 0.05, fitness: 0.05, epigenetics: 0.10,
};

export default async function CoachPageServer({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch all data in parallel — coach data + health snapshot data
  const [
    profileResult,
    streakResult,
    settingsResult,
    todayLessonResult,
    recentLessonsResult,
    statsResult,
    labResultsRes,
    ddCategoriesRes,
    ddEntriesRes,
    checklistItemsRes,
    checklistEntriesRes,
    domainWeightsRes,
  ] = await Promise.all([
    // Coach data
    admin.from('profiles').select('first_name, last_name, date_of_birth').eq('id', user.id).single(),
    admin.from('daily_dozen_streaks').select('current_streak, best_streak, last_checked_date').eq('user_id', user.id).single(),
    admin.from('user_settings').select('tweaks_enabled, anti_aging_enabled').eq('user_id', user.id).single(),
    admin.from('user_lesson_progress').select(`
      id, lesson_id, status, assigned_at,
      lifestyle_lessons(id, slug, title_en, title_de, title_fr, title_es, title_it, framework, photo_url, caption_en, caption_de, caption_fr, caption_es, caption_it)
    `).eq('user_id', user.id).in('status', ['assigned', 'in_progress']).order('assigned_at', { ascending: false }).limit(1),
    admin.from('user_lesson_progress').select(`
      id, lesson_id, status, completed_at,
      lifestyle_lessons(id, slug, title_en, title_de, title_fr, title_es, title_it, framework, photo_url)
    `).eq('user_id', user.id).eq('status', 'completed').order('completed_at', { ascending: false }).limit(5),
    admin.from('user_lesson_progress').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'completed'),

    // Health snapshot data
    supabase.from('lab_results').select(`
      id, biomarker_definition_id, value_numeric, unit, status_flag, measured_at,
      biomarkers!inner(id, slug, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, scoring_type)
    `).eq('user_id', user.id).is('deleted_at', null).order('measured_at', { ascending: false }).limit(300),
    supabase.from('daily_dozen_categories').select('id, target_servings').order('sort_order'),
    supabase.from('daily_dozen_entries').select('category_id, servings_completed').eq('user_id', user.id).eq('entry_date', today),
    supabase.from('daily_checklist_items').select('id, framework, target_servings').eq('is_active', true).in('framework', ['21_tweaks', 'anti_aging']),
    supabase.from('daily_checklist_entries').select('checklist_item_id, servings_completed, is_done').eq('user_id', user.id).eq('entry_date', today),

    // Domain weights from admin settings (same source as health-engine & briefing)
    admin.from('ai_settings').select('value').eq('key', 'domain_weights').single(),
  ]);

  // ── Domain weights (DB → fallback) — same source as health-engine ──────
  const dbWeights = (domainWeightsRes.data?.value as Record<string, number>) ?? null;
  const DOMAIN_WEIGHTS: Record<string, number> = { ...DEFAULT_WEIGHTS, ...dbWeights };

  // ── Coach data extraction ──────────────────────────────────────────────
  const profile = profileResult.data || null;
  const streak = streakResult.data || { current_streak: 0, best_streak: 0, last_checked_date: null };
  const settings = settingsResult.data || { tweaks_enabled: false, anti_aging_enabled: false };
  const totalCompleted = statsResult.count || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattenLesson = (row: any) => {
    if (!row) return null;
    const lesson = Array.isArray(row.lifestyle_lessons) ? row.lifestyle_lessons[0] : row.lifestyle_lessons;
    return { ...row, lifestyle_lessons: lesson ?? null };
  };
  const todayLesson = flattenLesson(todayLessonResult.data?.[0] ?? null);
  const recentLessons = (recentLessonsResult.data || []).map(flattenLesson).filter(Boolean);

  // ── Health snapshot computation ────────────────────────────────────────
  type BmDef = {
    id: string; slug: string; name: unknown; unit: string | null; he_domain: string | null;
    ref_range_low: number | null; ref_range_high: number | null;
    optimal_range_low: number | null; optimal_range_high: number | null;
    scoring_type: string | null;
  };

  const labRows = labResultsRes.data ?? [];
  const seenBiomarkers = new Set<string>();
  const latestResults = labRows.filter((r) => {
    if (seenBiomarkers.has(r.biomarker_definition_id)) return false;
    seenBiomarkers.add(r.biomarker_definition_id);
    return true;
  });

  const birthDate = profile?.date_of_birth ? new Date(profile.date_of_birth) : null;
  const chronoAge = birthDate ? +((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1) : null;

  const domainScores: Record<string, number[]> = {};
  for (const r of latestResults) {
    const bd = r.biomarkers as unknown as BmDef | null;
    if (!bd?.he_domain || r.value_numeric == null) continue;
    let value = Number(r.value_numeric);
    if (bd.scoring_type === 'age_ratio') {
      if (!chronoAge || chronoAge <= 0) continue;
      const ratio = value / chronoAge;
      const score = ageRatioScore(ratio, bd.ref_range_low, bd.ref_range_high, bd.optimal_range_low, bd.optimal_range_high);
      if (!domainScores[bd.he_domain]) domainScores[bd.he_domain] = [];
      domainScores[bd.he_domain].push(score);
      continue;
    }
    if (bd.scoring_type === 'pace_ratio') {
      const score = ageRatioScore(value, bd.ref_range_low, bd.ref_range_high, bd.optimal_range_low, bd.optimal_range_high);
      if (!domainScores[bd.he_domain]) domainScores[bd.he_domain] = [];
      domainScores[bd.he_domain].push(score);
      continue;
    }
    const score = continuousScore(value, bd.ref_range_low, bd.ref_range_high, bd.optimal_range_low, bd.optimal_range_high);
    if (!domainScores[bd.he_domain]) domainScores[bd.he_domain] = [];
    domainScores[bd.he_domain].push(score);
  }

  const domainAvgs: Record<string, number> = {};
  for (const [domain, scores] of Object.entries(domainScores)) {
    domainAvgs[domain] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  let longevityWSum = 0, longevityWUsed = 0;
  for (const [domain, avg] of Object.entries(domainAvgs)) {
    if (domain === 'epigenetics') continue;
    const w = DOMAIN_WEIGHTS[domain] ?? 0.05;
    longevityWSum += avg * w;
    longevityWUsed += w;
  }
  const longevityScore = longevityWUsed > 0 ? Math.round(longevityWSum / longevityWUsed) : null;
  const bioAgeScore = domainAvgs['epigenetics'] ?? null;

  // Daily tracker progress
  const ddCategories = ddCategoriesRes.data ?? [];
  const ddEntries = ddEntriesRes.data ?? [];
  const ddTotalServings = ddCategories.reduce((s, c) => s + c.target_servings, 0);
  const ddDone = ddCategories.reduce((s, cat) => {
    const entry = ddEntries.find((e) => e.category_id === cat.id);
    return s + Math.min(entry?.servings_completed ?? 0, cat.target_servings);
  }, 0);
  const ddPct = ddTotalServings > 0 ? Math.round((ddDone / ddTotalServings) * 100) : 0;

  const checklistItems = checklistItemsRes.data ?? [];
  const checklistEntries = checklistEntriesRes.data ?? [];

  function computeChecklistProgress(items: typeof checklistItems) {
    const total = items.reduce((s, i) => s + (i.target_servings ?? 1), 0);
    const done = items.reduce((s, item) => {
      const entry = checklistEntries.find(e => e.checklist_item_id === item.id);
      return s + Math.min(entry?.servings_completed ?? 0, item.target_servings ?? 1);
    }, 0);
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }

  const tweaksProgress = computeChecklistProgress(checklistItems.filter(i => i.framework === '21_tweaks'));
  const aaProgress = computeChecklistProgress(checklistItems.filter(i => i.framework === 'anti_aging'));

  const lang = (['en', 'de', 'fr', 'es', 'it'].includes(locale) ? locale : 'en') as Lang;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">
        <CoachPage
          lang={lang}
          userId={user.id}
          profile={profile}
          streak={streak}
          settings={settings}
          todayLesson={todayLesson}
          recentLessons={recentLessons as any}
          totalCompleted={totalCompleted}
          healthSnapshot={{
            longevityScore,
            bioAgeScore,
            dailyDozen: { done: ddDone, total: ddTotalServings, pct: ddPct },
            tweaks: settings.tweaks_enabled ? tweaksProgress : null,
            antiAging: settings.anti_aging_enabled ? aaProgress : null,
          }}
        />
      </main>

      <PublicFooter />
    </div>
  );
}
