import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAIUsage } from '@/lib/ai/usage-logger';
import { continuousScore, scoreToStatus, getName } from '@/lib/health-engine';

export const maxDuration = 60;

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

interface BriefingStep {
  id: string;
  title: string;
  narration: string;
  highlight: string;
}

const LANG_NAMES: Record<Lang, string> = {
  en: 'English', de: 'German (Schweizerdeutsch context)', fr: 'French', es: 'Spanish', it: 'Italian',
};

function buildBiomarkerSummary(data: {
  firstName: string;
  longevityScore: number;
  prevLongevityScore: number | null;
  latestDate: string;
  domains: Array<{ key: string; name: string; latestScore: number; prevScore: number | null; weight: string }>;
  riskMarkers: Array<{ name: string; value: number; unit: string; status: string; refLow: number | null; refHigh: number | null }>;
  improvedMarkers: Array<{ name: string; delta: number; unit: string }>;
  bioAge: { phenoAge: number | null; grimAge: number | null; chronAge: number | null } | null;
}): string {
  const { firstName, longevityScore, prevLongevityScore, latestDate, domains, riskMarkers, improvedMarkers, bioAge } = data;

  const scoreChange = prevLongevityScore != null
    ? `(${longevityScore > prevLongevityScore ? '+' : ''}${Math.round(longevityScore - prevLongevityScore)} since last test)`
    : '(first test)';

  const domainLines = domains
    .filter(d => d.latestScore > 0)
    .sort((a, b) => b.latestScore - a.latestScore)
    .map(d => {
      const change = d.prevScore != null
        ? ` (${d.latestScore > d.prevScore ? '▲' : d.latestScore < d.prevScore ? '▼' : '='} ${Math.abs(Math.round(d.latestScore - d.prevScore))})`
        : '';
      return `  ${d.name}: ${Math.round(d.latestScore)}/100${change} [weight: ${d.weight}]`;
    })
    .join('\n');

  const riskLines = riskMarkers.slice(0, 5).map(m => {
    const range = [m.refLow, m.refHigh].filter(v => v != null).join('–');
    return `  ${m.name}: ${m.value} ${m.unit} [${m.status}${range ? `, ref: ${range}` : ''}]`;
  }).join('\n');

  const improvedLines = improvedMarkers.slice(0, 3).map(m =>
    `  ${m.name}: improved by ${Math.abs(m.delta).toFixed(1)} ${m.unit}`
  ).join('\n');

  let bioAgeSection = '';
  if (bioAge?.phenoAge != null && bioAge?.chronAge != null) {
    const diff = Math.round(bioAge.phenoAge - bioAge.chronAge);
    const direction = diff > 0 ? `${diff} years older` : `${Math.abs(diff)} years younger`;
    bioAgeSection = `\nBIOLOGICAL AGE: PhenoAge = ${Math.round(bioAge.phenoAge)}, Chronological = ${bioAge.chronAge} (${direction} biologically)`;
    if (bioAge.grimAge != null) bioAgeSection += `, GrimAge = ${Math.round(bioAge.grimAge)}`;
  }

  return `USER: ${firstName}
LATEST TEST DATE: ${latestDate}
LONGEVITY SCORE: ${Math.round(longevityScore)}/100 ${scoreChange}

DOMAIN SCORES (weighted):
${domainLines || '  No domain data'}
${bioAgeSection}

MARKERS NEEDING ATTENTION:
${riskLines || '  None flagged'}

MARKERS THAT IMPROVED:
${improvedLines || '  None yet'}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { lang?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const lang: Lang = (VALID_LANGS as readonly string[]).includes(body.lang ?? '')
    ? (body.lang as Lang)
    : 'en';

  // Load AI settings from DB (admin client bypasses RLS on ai_settings)
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

  // Fetch user data
  const [profileRes, reportsRes, resultsRes, defsRes] = await Promise.all([
    supabase.from('profiles').select('first_name, date_of_birth, sex').eq('id', user.id).single(),
    supabase.from('lab_reports').select('id, test_date').eq('user_id', user.id)
      .in('status', ['confirmed', 'completed']).order('test_date', { ascending: true }),
    supabase.from('lab_results')
      .select('biomarker_definition_id, value_numeric, status_flag, measured_at, test_date, lab_report_id')
      .eq('user_id', user.id).is('deleted_at', null),
    supabase.from('biomarkers')
      .select('id, slug, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, is_calculated, sort_order')
      .eq('is_active', true),
  ]);

  const profile = profileRes.data;
  const reports = reportsRes.data ?? [];
  const results = resultsRes.data ?? [];
  const definitions = defsRes.data ?? [];

  if (!reports.length || !results.length) {
    return NextResponse.json({ error: 'No lab data found' }, { status: 404 });
  }

  // ── Caching: return existing briefing if lab data hasn't changed ─────────
  // Find the latest lab_result updated_at or created_at to use as a freshness marker
  const latestReportDate = reports[reports.length - 1]?.test_date ?? '';

  const { data: cachedBriefing } = await adminDb
    .from('health_briefings')
    .select('id, steps, summary_context, created_at')
    .eq('user_id', user.id)
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cachedBriefing?.steps && Array.isArray(cachedBriefing.steps) && cachedBriefing.steps.length > 0) {
    // Check if any lab_results were modified after the briefing was created
    const briefingTime = cachedBriefing.created_at;
    const { count: newerResults } = await adminDb
      .from('lab_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gt('created_at', briefingTime);

    // Also check if any reports were added after the briefing
    const { count: newerReports } = await adminDb
      .from('lab_reports')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'completed'])
      .gt('created_at', briefingTime);

    if ((newerResults ?? 0) === 0 && (newerReports ?? 0) === 0) {
      // Data hasn't changed — return cached briefing
      const ctx = cachedBriefing.summary_context as { summary?: string } | null;
      return NextResponse.json({
        steps: cachedBriefing.steps,
        summary: ctx?.summary ?? '',
        cached: true,
      });
    }
  }

  // Build domain meta — weights from DB, falling back to defaults
  const DEFAULT_WEIGHTS: Record<string, number> = {
    heart_vessels: 0.18, metabolism: 0.16, inflammation: 0.14, organ_function: 0.13,
    nutrients: 0.10, hormones: 0.09, epigenetics: 0.10, body_composition: 0.05, fitness: 0.05,
  };
  const DOMAIN_NAMES: Record<string, string> = {
    heart_vessels: 'Heart & Vessels', metabolism: 'Metabolism', inflammation: 'Inflammation',
    organ_function: 'Organ Function', nutrients: 'Nutrients', hormones: 'Hormones',
    epigenetics: 'Epigenetics', body_composition: 'Body Composition', fitness: 'Fitness',
  };
  const dbWeights = (settingsMap.get('domain_weights') as Record<string, number> | null) ?? DEFAULT_WEIGHTS;
  const DOMAIN_WEIGHTS: Record<string, { name: string; weight: number; label: string }> = Object.fromEntries(
    Object.entries(DOMAIN_NAMES).map(([key, name]) => [
      key,
      { name, weight: dbWeights[key] ?? DEFAULT_WEIGHTS[key] ?? 0.05, label: `${Math.round((dbWeights[key] ?? DEFAULT_WEIGHTS[key] ?? 0.05) * 100)}%` },
    ])
  );

  // Map: defId → date → value
  const reportDateMap = new Map(reports.map(r => [r.id, r.test_date]));
  const mData = new Map<string, Map<string, { value: number; flag: string | null }>>();
  for (const r of results) {
    if (!r.biomarker_definition_id || r.value_numeric == null) continue;
    const date = r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0];
    if (!date) continue;
    if (!mData.has(r.biomarker_definition_id)) mData.set(r.biomarker_definition_id, new Map());
    if (!mData.get(r.biomarker_definition_id)!.has(date)) {
      mData.get(r.biomarker_definition_id)!.set(date, { value: r.value_numeric, flag: r.status_flag });
    }
  }

  const allDates = [...new Set(results.map(r =>
    r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0]
  ).filter(Boolean))].sort() as string[];
  const latestDate = allDates[allDates.length - 1];
  const prevDate = allDates.length > 1 ? allDates[allDates.length - 2] : null;

  // Build domain scores
  const domainScores: Array<{ key: string; name: string; latestScore: number; prevScore: number | null; weight: string }> = [];
  let longevityScore = 0;
  let totalWeight = 0;
  let prevLongevityScore: number | null = null;
  let prevTotalWeight = 0;

  for (const [key, meta] of Object.entries(DOMAIN_WEIGHTS)) {
    if (key === 'epigenetics') continue; // shown separately
    const domDefs = definitions.filter(d => d.he_domain === key && mData.has(d.id));
    if (!domDefs.length) continue;

    const scores = domDefs.map(def => {
      const entry = mData.get(def.id)?.get(latestDate);
      if (!entry) return null;
      return continuousScore(entry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
    }).filter((s): s is number => s != null);

    const prevScores = prevDate ? domDefs.map(def => {
      const entry = mData.get(def.id)?.get(prevDate);
      if (!entry) return null;
      return continuousScore(entry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
    }).filter((s): s is number => s != null) : [];

    if (!scores.length) continue;
    const avg = scores.reduce((a, b) => a + b) / scores.length;
    const prevAvg = prevScores.length ? prevScores.reduce((a, b) => a + b) / prevScores.length : null;

    domainScores.push({ key, name: meta.name, latestScore: avg, prevScore: prevAvg, weight: meta.label });
    longevityScore += avg * meta.weight;
    totalWeight += meta.weight;

    if (prevAvg != null) {
      prevLongevityScore = (prevLongevityScore ?? 0) + prevAvg * meta.weight;
      prevTotalWeight += meta.weight;
    }
  }

  if (totalWeight > 0) longevityScore = longevityScore / totalWeight * 1;
  if (prevTotalWeight > 0 && prevLongevityScore != null) prevLongevityScore = prevLongevityScore / prevTotalWeight;

  // Find risk + improved markers
  const riskMarkers: Array<{ name: string; value: number; unit: string; status: string; refLow: number | null; refHigh: number | null }> = [];
  const improvedMarkers: Array<{ name: string; delta: number; unit: string }> = [];

  for (const def of definitions) {
    if (def.is_calculated) continue;
    const latestEntry = mData.get(def.id)?.get(latestDate);
    if (!latestEntry) continue;

    const score = continuousScore(latestEntry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
    const status = scoreToStatus(score);

    if (status === 'borderline' || status === 'risk') {
      riskMarkers.push({ name: getName(def.name, lang), value: latestEntry.value, unit: def.unit ?? '', status, refLow: def.ref_range_low, refHigh: def.ref_range_high });
    }

    if (prevDate) {
      const prevEntry = mData.get(def.id)?.get(prevDate);
      if (prevEntry) {
        const prevScore = continuousScore(prevEntry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
        if (score > prevScore + 10) {
          improvedMarkers.push({ name: getName(def.name, lang), delta: latestEntry.value - prevEntry.value, unit: def.unit ?? '' });
        }
      }
    }
  }

  // Bio age
  const bioAgeDefs = ['phenoage', 'grimage_v2'];
  const bioAge: { phenoAge: number | null; grimAge: number | null; chronAge: number | null } = { phenoAge: null, grimAge: null, chronAge: null };
  for (const def of definitions) {
    if (def.slug === 'phenoage') bioAge.phenoAge = mData.get(def.id)?.get(latestDate)?.value ?? null;
    if (def.slug === 'grimage_v2') bioAge.grimAge = mData.get(def.id)?.get(latestDate)?.value ?? null;
  }
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    bioAge.chronAge = new Date().getFullYear() - dob.getFullYear();
  }
  void bioAgeDefs; // suppress unused warning

  const summary = buildBiomarkerSummary({
    firstName: profile?.first_name ?? 'there',
    longevityScore,
    prevLongevityScore,
    latestDate,
    domains: domainScores,
    riskMarkers: riskMarkers.sort((a, b) => (a.status === 'risk' ? -1 : 1) - (b.status === 'risk' ? -1 : 1)).slice(0, 5),
    improvedMarkers: improvedMarkers.slice(0, 3),
    bioAge: (bioAge.phenoAge || bioAge.grimAge) ? bioAge : null,
  });

  const systemPrompt = `You are Evida Life's health data interpreter — a personalized health briefing narrator.

STRICT GUARDRAILS (mandatory, no exceptions):
- Present data, trends, reference ranges, and general educational context only
- NEVER diagnose medical conditions or diseases
- NEVER recommend specific medications or clinical treatments
- NEVER predict disease outcomes or prognosis
- NEVER provide clinical medical advice
- ALWAYS encourage consulting a qualified healthcare provider for clinical decisions
- You operate in the wellness/informational category under EU MDR 2017/745

TONE: Warm, encouraging, scientifically grounded, conversational (as if speaking to a friend who happens to be health-savvy). NOT clinical, NOT alarming.

LANGUAGE: Generate the entire briefing in ${LANG_NAMES[lang]}. Use natural, flowing speech — this will be converted to audio.

OUTPUT FORMAT: Return ONLY valid JSON with this exact structure:
{
  "steps": [
    {"id": "welcome", "title": "string", "narration": "string (50-80 words)", "highlight": "score"},
    {"id": "longevity_score", "title": "string", "narration": "string (60-90 words)", "highlight": "longevity"},
    {"id": "domain_breakdown", "title": "string", "narration": "string (80-120 words)", "highlight": "domains"},
    {"id": "action_items", "title": "string", "narration": "string (80-120 words)", "highlight": "markers"},
    {"id": "closing", "title": "string", "narration": "string (40-60 words)", "highlight": "score"}
  ]
}

Step guidance:
1. welcome: Greet by first name, briefly say what's coming (don't reveal scores yet)
2. longevity_score: Share the overall score, compare to previous if available, highlight top strength domain
3. domain_breakdown: Walk through the 2-3 most impactful domains (highest and lowest weight domains), explain what they mean in plain language
4. action_items: Share the 2-3 markers that could use attention, explain what lifestyle factors generally influence them (educational only)
5. closing: Encourage progress, suggest scheduling the next test, keep it positive

Do not include markdown, explanations, or anything outside the JSON object.`;

  const client = new Anthropic({ apiKey });
  const startMs = Date.now();

  const MAX_RETRIES = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await client.messages.create({
        model: briefingModel,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generate my health briefing based on this data:\n\n${summary}` }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
      }

      const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed: { steps: BriefingStep[] } = JSON.parse(raw);

      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        return NextResponse.json({ error: 'Invalid briefing format' }, { status: 500 });
      }

      const durationMs = Date.now() - startMs;
      const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);

      // Log to health_briefings (fire-and-forget — don't block response)
      adminDb.from('health_briefings').insert({
        user_id: user.id,
        lang,
        steps: parsed.steps,
        summary_context: { summary },
        model_used: briefingModel,
        tokens_used: tokensUsed,
        duration_ms: durationMs,
      }).then(({ error }) => {
        if (error) console.error('[briefing] log error:', error.message);
      });

      // Log to ai_usage_log for cost tracking
      logAIUsage({
        userId: user.id,
        provider: 'anthropic',
        endpoint: 'briefing',
        model: briefingModel,
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
        durationMs,
        metadata: { lang },
      });

      return NextResponse.json({ steps: parsed.steps, summary });
    } catch (e: unknown) {
      lastError = e;
      // Retry on 529 Overloaded with exponential backoff
      const status = (e as { status?: number })?.status;
      if (status === 529 && attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt))); // 1s, 2s
        continue;
      }
      break;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  return NextResponse.json({ error: msg }, { status: 500 });
}
