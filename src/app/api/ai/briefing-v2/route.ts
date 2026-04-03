import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAIUsage } from '@/lib/ai/usage-logger';
import {
  continuousScore,
  scoreToStatus,
  scoreColor,
  getName,
  fmtDate,
  fmtDateFull,
  DOMAIN_ORDER,
  DOMAIN_META,
  LANG_NAMES,
  type Lang,
  type BriefingSlide,
  type SlideData,
  type WelcomeData,
  type LongevityScoreData,
  type BioAgeScoreData,
  type DomainSummaryData,
  type ClosingData,
  type MarkerSummary,
  type MarkerDetail,
} from '@/lib/health-engine-v2-types';

export const maxDuration = 60;

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;

const EXCLUDED_SLUGS = new Set([
  'grip_strength',
  'ages_skin_scan',
  'bone_density_t_score',
  'bone_mineral_content',
  'trunk_fat_pct',
  'arms_fat_pct',
  'legs_fat_pct',
  'android_gynoid_ratio',
  'lpa',
]);

const BIO_CLOCK_MAPPING: Record<string, 'phenoage' | 'grimage_v2' | 'dunedinpace'> = {
  phenoage: 'phenoage',
  pheno_age: 'phenoage',
  grimage_v2: 'grimage_v2',
  grimage: 'grimage_v2',
  grim_age_v2: 'grimage_v2',
  dunedinpace: 'dunedinpace',
  dunedin_pace: 'dunedinpace',
  pace_of_aging: 'dunedinpace',
};

interface BiomarkerDef {
  id: string;
  slug: string;
  name: Record<string, string> | string;
  unit: string | null;
  he_domain: string;
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  is_calculated: boolean;
  sort_order: number | null;
  scoring_type: string | null;
}

interface LabResult {
  biomarker_definition_id: string;
  value_numeric: number;
  status_flag: string | null;
  measured_at: string | null;
  test_date: string | null;
  lab_report_id: string;
}

interface LabReport {
  id: string;
  test_date: string;
}

interface Profile {
  first_name: string;
  date_of_birth: string;
  sex: string | null;
}

// ── Helper: Normalize bio clock slug ────────────────────────────────────
function normalizeBioClock(slug: string): 'phenoage' | 'grimage_v2' | 'dunedinpace' | null {
  const normalized = slug.toLowerCase().replace(/_/g, '');
  for (const [key, value] of Object.entries(BIO_CLOCK_MAPPING)) {
    if (key.toLowerCase().replace(/_/g, '') === normalized) {
      return value;
    }
  }
  return null;
}

// ── Helper: Compute chronological age ────────────────────────────────────
function computeChronAge(dob: string): number {
  const born = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const hasHadBirthday = now.getMonth() > born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() >= born.getDate());
  if (!hasHadBirthday) age--;
  return age;
}

// ── Helper: Build marker summary ────────────────────────────────────────
function buildMarkerSummary(
  def: BiomarkerDef,
  value: number,
  score: number,
  domainKey: string,
  domainName: string,
): MarkerSummary {
  return {
    name: getName(def.name, 'en'),
    slug: def.slug,
    score,
    status: scoreToStatus(score),
    value,
    unit: def.unit ?? '',
    domainKey,
    domainName,
  };
}

// ── Helper: Build marker detail ────────────────────────────────────────
function buildMarkerDetail(
  def: BiomarkerDef,
  value: number,
  score: number,
  domainKey: string,
  domainName: string,
  prevValue: number | null,
  prevScore: number | null,
  trend: { dates: string[]; values: number[] },
): MarkerDetail {
  return {
    name: getName(def.name, 'en'),
    slug: def.slug,
    score,
    status: scoreToStatus(score),
    value,
    unit: def.unit ?? '',
    domainKey,
    domainName,
    refLow: def.ref_range_low,
    refHigh: def.ref_range_high,
    optLow: def.optimal_range_low,
    optHigh: def.optimal_range_high,
    trend,
    delta: prevValue !== null ? value - prevValue : null,
    prevValue,
    prevScore,
  };
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // ── Auth check ─────────────────────────────────────────────────────────
  // Auth: support both session auth and service-level pre-generation
  const pregenerateUserId = req.headers.get('X-Pregenerate-User-Id');
  const pregenerateSecret = req.headers.get('X-Pregenerate-Secret');
  let userId: string;

  if (pregenerateUserId && pregenerateSecret === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Service-level call from briefing-pregenerate utility
    userId = pregenerateUserId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = user.id;
  }

  // ── Parse request ──────────────────────────────────────────────────────
  let body: { lang?: string; cacheOnly?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const cacheOnly = body.cacheOnly === true;

  const lang: Lang = (VALID_LANGS as readonly string[]).includes(body.lang ?? '')
    ? (body.lang as Lang)
    : 'en';

  // ── Load AI settings ───────────────────────────────────────────────────
  const adminDb = createAdminClient();
  const { data: settingsRows } = await adminDb
    .from('ai_settings')
    .select('key, value')
    .in('key', ['briefing_enabled', 'briefing_model', 'domain_weights']);

  const settingsMap = new Map((settingsRows ?? []).map(r => [r.key, r.value]));
  const briefingEnabled = settingsMap.get('briefing_enabled') !== false;
  if (!briefingEnabled) {
    return NextResponse.json({ error: 'AI briefing feature is currently disabled' }, { status: 503 });
  }

  const briefingModel: string = (settingsMap.get('briefing_model') as string) ?? 'claude-sonnet-4-6';

  // ── Fetch user data (use adminDb to support both auth modes) ────────────
  const [profileRes, reportsRes, resultsRes, defsRes] = await Promise.all([
    adminDb.from('profiles').select('first_name, date_of_birth, sex').eq('id', userId).single(),
    adminDb.from('lab_reports').select('id, test_date').eq('user_id', userId)
      .in('status', ['confirmed', 'completed']).order('test_date', { ascending: true }),
    adminDb.from('lab_results')
      .select('biomarker_definition_id, value_numeric, status_flag, measured_at, test_date, lab_report_id')
      .eq('user_id', userId).is('deleted_at', null),
    adminDb.from('biomarkers')
      .select('id, slug, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, is_calculated, sort_order, scoring_type')
      .eq('is_active', true),
  ]);

  const profile: Profile | null = profileRes.data;
  const reports: LabReport[] = reportsRes.data ?? [];
  const results: LabResult[] = resultsRes.data ?? [];
  const definitions: BiomarkerDef[] = defsRes.data ?? [];

  if (!reports.length || !results.length || !profile) {
    return NextResponse.json({ error: 'No lab data found' }, { status: 404 });
  }

  // ── Caching: check for existing v2 briefing ────────────────────────────
  // The health_briefings table stores v2 briefings with summary_context.version='v2'
  const { data: cachedRows } = await adminDb
    .from('health_briefings')
    .select('id, steps, summary_context, created_at')
    .eq('user_id', userId)
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .limit(5);

  // Find a v2 briefing
  const cachedBriefing = (cachedRows ?? []).find(row => {
    const ctx = row.summary_context as Record<string, unknown> | null;
    return ctx?.version === 'v2';
  });

  if (cachedBriefing?.steps && Array.isArray(cachedBriefing.steps) && cachedBriefing.steps.length > 0) {
    const briefingTime = cachedBriefing.created_at;
    const [{ count: newerResults }, { count: newerReports }] = await Promise.all([
      adminDb
        .from('lab_results')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .gt('created_at', briefingTime),
      adminDb
        .from('lab_reports')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['confirmed', 'completed'])
        .gt('created_at', briefingTime),
    ]);

    if ((newerResults ?? 0) === 0 && (newerReports ?? 0) === 0) {
      return NextResponse.json({
        slides: cachedBriefing.steps,
        cached: true,
        briefingId: cachedBriefing.id,
      });
    }
  }

  // If cacheOnly was requested and nothing cached, return empty immediately
  if (cacheOnly) {
    return NextResponse.json({ slides: [], cached: false });
  }

  // ── Build data structures ──────────────────────────────────────────────
  const reportDateMap = new Map(reports.map(r => [r.id, r.test_date]));
  const markerData = new Map<string, Map<string, { value: number; flag: string | null }>>();

  for (const r of results) {
    if (!r.biomarker_definition_id || r.value_numeric == null) continue;
    const date = r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0];
    if (!date) continue;

    if (!markerData.has(r.biomarker_definition_id)) {
      markerData.set(r.biomarker_definition_id, new Map());
    }
    if (!markerData.get(r.biomarker_definition_id)!.has(date)) {
      markerData.get(r.biomarker_definition_id)!.set(date, { value: r.value_numeric, flag: r.status_flag });
    }
  }

  const allDates = [...new Set(results
    .map(r => r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0])
    .filter((d): d is string => d != null))].sort() as string[];

  const latestDate = allDates[allDates.length - 1];
  const prevDate = allDates.length > 1 ? allDates[allDates.length - 2] : null;
  const chronAge = computeChronAge(profile.date_of_birth);

  // ── Helper: Score a marker with age_ratio support ─────────────────────
  function scoreMarker(def: BiomarkerDef, value: number): number {
    if (def.scoring_type === 'age_ratio') {
      if (chronAge <= 0) return 70;
      const ratio = value / chronAge;
      return continuousScore(ratio, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
    }
    return continuousScore(value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
  }

  // ── Build domain scores and longevity score ────────────────────────────
  const DEFAULT_WEIGHTS: Record<string, number> = {
    heart_vessels: 0.18, metabolism: 0.16, inflammation: 0.14, organ_function: 0.13,
    nutrients: 0.10, hormones: 0.09, epigenetics: 0.10, body_composition: 0.05, fitness: 0.05,
  };
  const dbWeights = (settingsMap.get('domain_weights') as Record<string, number> | null) ?? DEFAULT_WEIGHTS;

  const domainScores: Record<string, { score: number; prevScore: number | null; markers: Array<{ def: BiomarkerDef; value: number; score: number; prevValue: number | null; prevScore: number | null }> }> = {};
  let longevityScore = 0;
  let totalWeight = 0;
  let prevLongevityScore: number | null = null;
  let prevTotalWeight = 0;

  for (const [key, weight] of Object.entries(DEFAULT_WEIGHTS)) {
    if (key === 'epigenetics') continue; // handled separately in bio_age_score

    const domDefs = definitions.filter(d => d.he_domain === key && markerData.has(d.id) && !d.is_calculated && !EXCLUDED_SLUGS.has(d.slug));
    if (!domDefs.length) continue;

    const scores: number[] = [];
    const markers: Array<{ def: BiomarkerDef; value: number; score: number; prevValue: number | null; prevScore: number | null }> = [];

    for (const def of domDefs) {
      const entry = markerData.get(def.id)?.get(latestDate);
      if (!entry) continue;

      const score = scoreMarker(def, entry.value);
      scores.push(score);

      const prevEntry = prevDate ? markerData.get(def.id)?.get(prevDate) : null;
      const prevScore = prevEntry ? scoreMarker(def, prevEntry.value) : null;

      markers.push({
        def,
        value: entry.value,
        score,
        prevValue: prevEntry?.value ?? null,
        prevScore,
      });
    }

    if (!scores.length) continue;

    const avg = scores.reduce((a, b) => a + b) / scores.length;
    const prevMarkerScores = markers.map(m => m.prevScore).filter((s): s is number => s !== null);
    const prevAvg = prevMarkerScores.length ? prevMarkerScores.reduce((a, b) => a + b) / prevMarkerScores.length : null;

    domainScores[key] = { score: avg, prevScore: prevAvg, markers };
    longevityScore += avg * weight;
    totalWeight += weight;

    if (prevAvg != null) {
      prevLongevityScore = (prevLongevityScore ?? 0) + prevAvg * weight;
      prevTotalWeight += weight;
    }
  }

  if (totalWeight > 0) longevityScore = longevityScore / totalWeight;
  if (prevTotalWeight > 0 && prevLongevityScore != null) prevLongevityScore = prevLongevityScore / prevTotalWeight;

  // ── Epigenetics domain (for bio age) ───────────────────────────────────
  const epiDefs = definitions.filter(d => d.he_domain === 'epigenetics' && markerData.has(d.id) && !d.is_calculated);
  const epiScores: number[] = [];
  for (const def of epiDefs) {
    const entry = markerData.get(def.id)?.get(latestDate);
    if (entry) {
      epiScores.push(scoreMarker(def, entry.value));
    }
  }
  const bioAgeScore = epiScores.length ? epiScores.reduce((a, b) => a + b) / epiScores.length : 0;

  // ── Extract bio clock values ───────────────────────────────────────────
  const bioClocksData: Record<'phenoage' | 'grimage_v2' | 'dunedinpace', { value: number; prevValue: number | null; score: number; prevScore: number | null; def: BiomarkerDef }> = {
    phenoage: { value: 0, prevValue: null, score: 0, prevScore: null, def: null as any },
    grimage_v2: { value: 0, prevValue: null, score: 0, prevScore: null, def: null as any },
    dunedinpace: { value: 0, prevValue: null, score: 0, prevScore: null, def: null as any },
  };

  for (const def of definitions) {
    const bioClockType = normalizeBioClock(def.slug);
    if (!bioClockType) continue;

    const entry = markerData.get(def.id)?.get(latestDate);
    if (!entry) continue;

    const score = scoreMarker(def, entry.value);
    const prevEntry = prevDate ? markerData.get(def.id)?.get(prevDate) : null;
    const prevScore = prevEntry ? scoreMarker(def, prevEntry.value) : null;

    bioClocksData[bioClockType] = {
      value: entry.value,
      prevValue: prevEntry?.value ?? null,
      score,
      prevScore,
      def,
    };
  }

  // ── Top strengths & priority actions ───────────────────────────────────
  const allMarkersByScore: Array<{ def: BiomarkerDef; value: number; score: number; domainKey: string }> = [];

  for (const [domKey, domData] of Object.entries(domainScores)) {
    for (const m of domData.markers) {
      allMarkersByScore.push({ def: m.def, value: m.value, score: m.score, domainKey: domKey });
    }
  }

  allMarkersByScore.sort((a, b) => b.score - a.score);

  const topStrengthsMarkers = allMarkersByScore
    .filter(m => m.score >= 85)
    .slice(0, 5)
    .map(m => buildMarkerSummary(m.def, m.value, m.score, m.domainKey, DOMAIN_META[m.domainKey].name[lang] || DOMAIN_META[m.domainKey].name['en']));

  const priorityActionsMarkers = allMarkersByScore
    .filter(m => m.score < 65)
    .slice(0, 5)
    .map(m => buildMarkerSummary(m.def, m.value, m.score, m.domainKey, DOMAIN_META[m.domainKey].name[lang] || DOMAIN_META[m.domainKey].name['en']));

  // ── Build slides ───────────────────────────────────────────────────────
  const slides: BriefingSlide[] = [];

  // 1. Welcome
  slides.push({
    id: 'welcome',
    type: 'welcome',
    title: 'Welcome',
    narration: '', // Will be filled by Claude
    data: {
      type: 'welcome',
      firstName: profile.first_name,
      testDate: latestDate,
      markerCount: allMarkersByScore.length,
      reportCount: reports.length,
    } as WelcomeData,
  });

  // 2. Longevity Score
  const longevityTrend: { date: string; score: number }[] = [];
  for (const date of allDates) {
    const dScores: number[] = [];
    let dTotalWeight = 0;
    for (const [domKey, weight] of Object.entries(DEFAULT_WEIGHTS)) {
      if (domKey === 'epigenetics') continue;
      const domDefs = definitions.filter(d => d.he_domain === domKey && markerData.has(d.id) && !d.is_calculated && !EXCLUDED_SLUGS.has(d.slug));
      if (!domDefs.length) continue;

      const markers = domDefs.filter(d => markerData.get(d.id)?.has(date));
      if (!markers.length) continue;

      const scores = markers.map(d => {
        const entry = markerData.get(d.id)!.get(date)!;
        return scoreMarker(d, entry.value);
      });

      const avg = scores.reduce((a, b) => a + b) / scores.length;
      dScores.push(avg * weight);
      dTotalWeight += weight;
    }

    if (dTotalWeight > 0) {
      longevityTrend.push({ date, score: Math.round(dScores.reduce((a, b) => a + b) / dTotalWeight) });
    }
  }

  const sortedDomains = Object.entries(domainScores)
    .map(([key, data]) => ({ key, name: DOMAIN_META[key].name[lang] || DOMAIN_META[key].name['en'], score: data.score }))
    .sort((a, b) => b.score - a.score);

  slides.push({
    id: 'longevity_score',
    type: 'longevity_score',
    title: 'Longevity Score',
    narration: '',
    data: {
      type: 'longevity_score',
      score: Math.round(longevityScore),
      prevScore: prevLongevityScore ? Math.round(prevLongevityScore) : null,
      trend: longevityScore > (prevLongevityScore ?? longevityScore) ? 'up' : longevityScore < (prevLongevityScore ?? longevityScore) ? 'down' : 'stable',
      history: longevityTrend,
      domainCount: Object.keys(domainScores).length,
      bestDomain: sortedDomains.length > 0 ? { name: sortedDomains[0].name, score: Math.round(sortedDomains[0].score) } : null,
      worstDomain: sortedDomains.length > 0 ? { name: sortedDomains[sortedDomains.length - 1].name, score: Math.round(sortedDomains[sortedDomains.length - 1].score) } : null,
    } as LongevityScoreData,
  });

  // 3. Bio Age Score (only if epigenetics data exists)
  const phenoAge = bioClocksData.phenoage.value || null;
  const grimAge = bioClocksData.grimage_v2.value || null;
  const dunedinPace = bioClocksData.dunedinpace.value || null;
  const ageDiff = phenoAge ? Math.round(phenoAge - chronAge) : 0;

  if (epiDefs.length > 0) {
    slides.push({
      id: 'bio_age_score',
      type: 'bio_age_score',
      title: 'Biological Age',
      narration: '',
      data: {
        type: 'bio_age_score',
        bioAgeScore: Math.round(bioAgeScore),
        chronAge,
        phenoAge: phenoAge ? Math.round(phenoAge * 10) / 10 : null,
        grimAge: grimAge ? Math.round(grimAge * 10) / 10 : null,
        dunedinPace: dunedinPace ? Math.round(dunedinPace * 100) / 100 : null,
        ageDiff,
      } as BioAgeScoreData,
    });
  }

  // 4. Domain Summaries (with smart zoom: critical markers expanded, exceptional markers highlighted)
  for (const domKey of DOMAIN_ORDER) {
    if (!domainScores[domKey]) continue;
    const domData = domainScores[domKey];

    const sortedMarkers = domData.markers.sort((a, b) => b.score - a.score);

    // Build full MarkerDetail for all markers
    const detailMarkers: MarkerDetail[] = [];
    for (const m of sortedMarkers) {
      const trend: { dates: string[]; values: number[] } = { dates: [], values: [] };
      for (const date of allDates) {
        const entry = markerData.get(m.def.id)?.get(date);
        if (entry) {
          trend.dates.push(date);
          trend.values.push(entry.value);
        }
      }

      detailMarkers.push(
        buildMarkerDetail(
          m.def,
          m.value,
          m.score,
          domKey,
          DOMAIN_META[domKey].name[lang] || DOMAIN_META[domKey].name['en'],
          m.prevValue,
          m.prevScore,
          trend,
        )
      );
    }

    // Smart zoom: categorize markers
    const criticalMarkers = detailMarkers.filter(m => m.score < 55);
    const exceptionalMarkers = detailMarkers.filter(m => m.score >= 90);

    // Build domain trend
    const domainTrend: { date: string; score: number }[] = [];
    for (const date of allDates) {
      const domDefs = definitions.filter(d => d.he_domain === domKey && markerData.has(d.id) && !d.is_calculated && !EXCLUDED_SLUGS.has(d.slug));
      const markers = domDefs.filter(d => markerData.get(d.id)?.has(date));
      if (markers.length) {
        const scores = markers.map(d => {
          const entry = markerData.get(d.id)!.get(date)!;
          return scoreMarker(d, entry.value);
        });
        const avg = scores.reduce((a, b) => a + b) / scores.length;
        domainTrend.push({ date, score: Math.round(avg) });
      }
    }

    const weight = dbWeights[domKey] ?? DEFAULT_WEIGHTS[domKey] ?? 0.05;
    const weightLabel = `${Math.round(weight * 100)}%`;

    slides.push({
      id: `domain_summary_${domKey}`,
      type: 'domain_summary',
      title: `${DOMAIN_META[domKey].name[lang] || DOMAIN_META[domKey].name['en']} Summary`,
      narration: '',
      data: {
        type: 'domain_summary',
        domainKey: domKey,
        domainName: DOMAIN_META[domKey].name[lang] || DOMAIN_META[domKey].name['en'],
        domainIcon: DOMAIN_META[domKey].icon,
        domainDescription: DOMAIN_META[domKey].description[lang] || DOMAIN_META[domKey].description['en'],
        score: Math.round(domData.score),
        prevScore: domData.prevScore ? Math.round(domData.prevScore) : null,
        weight: weightLabel,
        markers: detailMarkers,
        criticalMarkers,
        exceptionalMarkers,
        domainTrend,
      } as DomainSummaryData,
    });
  }

  // 5. Closing
  const improvementMarkers = allMarkersByScore
    .filter(m => {
      const prev = domainScores[m.domainKey]?.markers.find(x => x.def.id === m.def.id)?.prevScore;
      return prev && m.score > prev + 10;
    })
    .slice(0, 3)
    .map(m => getName(m.def.name, lang));

  slides.push({
    id: 'closing',
    type: 'closing',
    title: 'Closing',
    narration: '',
    data: {
      type: 'closing',
      score: Math.round(longevityScore),
      improvements: improvementMarkers,
      nextSteps: [
        `Retest in 3 months to track progress`,
        `Focus on the priority markers identified above`,
        `Consult healthcare providers as needed`,
      ],
      totalMarkers: allMarkersByScore.length,
      totalDomains: Object.keys(domainScores).length,
    } as ClosingData,
  });

  // ── Send to Claude for narration generation ─────────────────────────────
  const systemPrompt = `You are Evida Life's health data narrator — a personalized health briefing AI.

STRICT GUARDRAILS (mandatory, no exceptions):
- Present data, trends, reference ranges, and general educational context only
- NEVER diagnose medical conditions or diseases
- NEVER recommend specific medications or clinical treatments
- NEVER predict disease outcomes or prognosis
- NEVER provide clinical medical advice
- ALWAYS encourage consulting qualified healthcare providers for clinical decisions
- You operate in the wellness/informational category under EU MDR 2017/745

TONE: Warm, encouraging, scientifically grounded, conversational (as if speaking to a friend). NOT clinical, NOT alarming.

LANGUAGE: Generate the entire briefing in ${LANG_NAMES[lang]}. Use natural, flowing speech — this will be converted to audio.

OUTPUT FORMAT: Return ONLY valid JSON with this structure:
{
  "narrations": {
    "welcome": "narration text (50-80 words)",
    "longevity_score": "narration text (60-90 words)",
    "bio_age_score": "narration text (60-90 words)",
    "domain_summary_[key]": "narration text (50-80 words per domain)",
    "closing": "narration text (40-60 words)"
  }
}

Include narrations only for slides that exist in the data provided. Skip bio_age_score if the briefing contains no epigenetics data.`;

  const slideSummary = JSON.stringify(
    slides.map(s => ({ id: s.id, type: s.type, data: s.data })),
    null,
    2,
  );

  const client = new Anthropic({ apiKey });
  const startMs = Date.now();

  const MAX_RETRIES = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: briefingModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate narration for these health briefing slides:\n\n${slideSummary}` }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
      }

      const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed: { narrations: Record<string, string> } = JSON.parse(raw);

      if (!parsed.narrations || typeof parsed.narrations !== 'object') {
        return NextResponse.json({ error: 'Invalid narrations format' }, { status: 500 });
      }

      // Assign narrations to slides
      for (const slide of slides) {
        slide.narration = parsed.narrations[slide.id] ?? '';
      }

      const durationMs = Date.now() - startMs;
      const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);

      // Clean up old v2 briefing TTS cache before inserting new one
      if (cachedBriefing?.steps && Array.isArray(cachedBriefing.steps)) {
        const { ttsCacheKey: makeCacheKey } = await import('@/lib/tts-cache');
        const oldFiles: string[] = [];
        for (const step of cachedBriefing.steps) {
          const s = step as { narration?: string };
          if (s.narration) oldFiles.push(makeCacheKey(s.narration, lang));
        }
        if (oldFiles.length > 0) {
          adminDb.storage.from('tts-cache').remove(oldFiles).then(({ error: cleanupErr }) => {
            if (cleanupErr) console.error('[briefing-v2] TTS cache cleanup error:', cleanupErr.message);
            else console.log(`[briefing-v2] Cleaned up ${oldFiles.length} old TTS cache files`);
          });
        }
      }

      // Log to health_briefings and capture the ID for Q&A tracking
      let newBriefingId: string | undefined;
      const { data: insertedRow, error: insertErr } = await adminDb
        .from('health_briefings')
        .insert({
          user_id: userId,
          lang,
          steps: slides,
          summary_context: { version: 'v2' },
          model_used: briefingModel,
          tokens_used: tokensUsed,
          duration_ms: durationMs,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[briefing-v2] log error:', insertErr.message);
      } else {
        newBriefingId = insertedRow?.id;
      }

      // Log to ai_usage_log for cost tracking
      logAIUsage({
        userId,
        provider: 'anthropic',
        endpoint: 'briefing-v2',
        model: briefingModel,
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
        durationMs,
        metadata: { lang },
      });

      return NextResponse.json({
        slides,
        cached: false,
        briefingId: newBriefingId,
      });
    } catch (e: unknown) {
      lastError = e;
      const status = (e as { status?: number })?.status;
      if (status === 529 && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  return NextResponse.json({ error: msg }, { status: 500 });
}
