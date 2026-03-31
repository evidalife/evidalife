import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

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

  // Build domain meta (same as dashboard)
  const DOMAIN_WEIGHTS: Record<string, { name: string; weight: number; label: string }> = {
    heart_vessels:    { name: 'Heart & Vessels', weight: 0.18, label: '18%' },
    metabolism:       { name: 'Metabolism', weight: 0.16, label: '16%' },
    inflammation:     { name: 'Inflammation', weight: 0.14, label: '14%' },
    organ_function:   { name: 'Organ Function', weight: 0.13, label: '13%' },
    nutrients:        { name: 'Nutrients', weight: 0.10, label: '10%' },
    hormones:         { name: 'Hormones', weight: 0.09, label: '9%' },
    epigenetics:      { name: 'Epigenetics', weight: 0.10, label: '10%' },
    body_composition: { name: 'Body Composition', weight: 0.05, label: '5%' },
    fitness:          { name: 'Fitness', weight: 0.05, label: '5%' },
  };

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

  // Continuous scoring helper
  function continuousScore(value: number, rL: number | null, rH: number | null, oL: number | null, oH: number | null): number {
    if (rL != null && rH != null) {
      const span = rH - rL || 1;
      if (oL != null && oH != null) {
        if (value >= oL && value <= oH) return 95;
        if (value >= rL && value <= rH) return 70;
        const excess = value < rL ? (rL - value) / span : (value - rH) / span;
        return Math.max(5, 50 - excess * 100);
      }
      if (value >= rL && value <= rH) return 75;
      const excess = value < rL ? (rL - value) / span : (value - rH) / span;
      return Math.max(5, 50 - excess * 100);
    }
    if (rH != null) { // lower is better
      if (oH != null && value <= oH) return 95;
      if (value <= rH) return 75;
      return Math.max(5, 75 - ((value - rH) / (rH || 1)) * 50);
    }
    if (rL != null) { // higher is better
      if (oL != null && value >= oL) return 95;
      if (value >= rL) return 75;
      return Math.max(5, 75 - ((rL - value) / (rL || 1)) * 50);
    }
    return 50;
  }

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
  const getName = (obj: Record<string, string> | string | null): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj['en'] ?? obj['de'] ?? '';
  };

  const riskMarkers: Array<{ name: string; value: number; unit: string; status: string; refLow: number | null; refHigh: number | null }> = [];
  const improvedMarkers: Array<{ name: string; delta: number; unit: string }> = [];

  for (const def of definitions) {
    if (def.is_calculated) continue;
    const latestEntry = mData.get(def.id)?.get(latestDate);
    if (!latestEntry) continue;

    const score = continuousScore(latestEntry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
    const status = score >= 85 ? 'optimal' : score >= 65 ? 'good' : score >= 40 ? 'borderline' : 'risk';

    if (status === 'borderline' || status === 'risk') {
      riskMarkers.push({ name: getName(def.name), value: latestEntry.value, unit: def.unit ?? '', status, refLow: def.ref_range_low, refHigh: def.ref_range_high });
    }

    if (prevDate) {
      const prevEntry = mData.get(def.id)?.get(prevDate);
      if (prevEntry) {
        const prevScore = continuousScore(prevEntry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
        if (score > prevScore + 10) {
          improvedMarkers.push({ name: getName(def.name), delta: latestEntry.value - prevEntry.value, unit: def.unit ?? '' });
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

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
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

    return NextResponse.json({ steps: parsed.steps, summary });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
