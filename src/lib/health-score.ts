// ── Health Score Calculation ──────────────────────────────────────────────────
//
// Computes an overall health score and per-domain scores from raw lab_results
// joined with biomarker_definitions.

export type StatusFlag = 'optimal' | 'good' | 'moderate' | 'risk';

export type BiomarkerCategory =
  | 'heart_vessels'
  | 'metabolism'
  | 'inflammation'
  | 'organ_function'
  | 'nutrients'
  | 'hormones'
  | 'body_composition'
  | 'fitness';

export type TrafficLight = 'green' | 'yellow' | 'red';

export type ScoredBiomarker = {
  id: string;
  definitionId: string;
  name: string;
  value: number;
  unit: string;
  score: number;
  trafficLight: TrafficLight;
  statusFlag: StatusFlag | null;
  category: BiomarkerCategory | null;
  measuredAt: string;
};

export type DomainScore = {
  score: number;
  biomarkerCount: number;
};

export type HealthScoreResult = {
  overall: number;
  domains: Partial<Record<BiomarkerCategory, DomainScore>>;
  biomarkers: ScoredBiomarker[];
};

// Domain weights — total sums to 1
const DOMAIN_WEIGHTS: Partial<Record<BiomarkerCategory, number>> = {
  heart_vessels:   0.20,
  metabolism:      0.18,
  inflammation:    0.15,
  organ_function:  0.15,
  nutrients:       0.12,
  hormones:        0.10,
  body_composition: 0.05,
  fitness:         0.05,
};

function flagToScore(flag: StatusFlag): number {
  switch (flag) {
    case 'optimal': return 100;
    case 'good': return 75;
    case 'moderate': return 50;
    case 'risk': return 25;
  }
}

// Infers range_type from which bounds are present, then scores accordingly.
//
//  lower_is_better  — only upper bounds set; lower value = better
//  higher_is_better — only lower bounds set; higher value = better
//  range            — both bounds set; value should be within band
function rangeScore(
  value: number,
  refLow: number | null,
  refHigh: number | null,
  optLow: number | null,
  optHigh: number | null,
): number {
  const hasRefLow  = refLow  != null;
  const hasRefHigh = refHigh != null;
  const hasOptLow  = optLow  != null;
  const hasOptHigh = optHigh != null;

  // ── lower_is_better ──────────────────────────────────────────────────────
  if (!hasRefLow && hasRefHigh) {
    const opt = hasOptHigh ? optHigh! : refHigh;
    if (value <= opt) return 100;
    if (value <= refHigh) return 75;
    const overshoot = (value - refHigh) / refHigh;
    if (overshoot <= 0.25) return 50;
    if (overshoot <= 0.75) return 25;
    return 0;
  }

  // ── higher_is_better ─────────────────────────────────────────────────────
  if (hasRefLow && !hasRefHigh) {
    const opt = hasOptLow ? optLow! : refLow;
    if (value >= opt) return 100;
    if (value >= refLow) return 75;
    const undershoot = (refLow - value) / refLow;
    if (undershoot <= 0.25) return 50;
    if (undershoot <= 0.75) return 25;
    return 0;
  }

  // ── range (both bounds) ───────────────────────────────────────────────────
  if (hasRefLow && hasRefHigh) {
    if (hasOptLow && hasOptHigh && value >= optLow! && value <= optHigh!) return 100;
    if (value >= refLow! && value <= refHigh) return 75;
    const span = refHigh - refLow!;
    if (span === 0) return 50;
    const pct = value < refLow!
      ? (refLow! - value) / span
      : (value - refHigh) / span;
    if (pct <= 0.25) return 50;
    if (pct <= 0.75) return 25;
    return 0;
  }

  return 50; // no range info — neutral
}

export function computeHealthScore(
  labResults: Array<{
    id: string;
    biomarker_definition_id: string | null;
    value_numeric: number | null;
    unit: string | null;
    status_flag: string | null;
    measured_at: string;
  }>,
  definitions: Array<{
    id: string;
    name: Record<string, string> | null;
    unit: string | null;
    category: string | null;
    reference_range_low: number | null;
    reference_range_high: number | null;
    optimal_range_low: number | null;
    optimal_range_high: number | null;
  }>,
  lang = 'en',
): HealthScoreResult {
  const defMap = new Map(definitions.map((d) => [d.id, d]));

  // Keep only the latest result per definition
  const latestByDef = new Map<string, typeof labResults[0]>();
  for (const r of labResults) {
    if (!r.biomarker_definition_id || r.value_numeric == null) continue;
    const existing = latestByDef.get(r.biomarker_definition_id);
    if (!existing || r.measured_at > existing.measured_at) {
      latestByDef.set(r.biomarker_definition_id, r);
    }
  }

  const biomarkers: ScoredBiomarker[] = [];

  for (const [defId, result] of latestByDef) {
    const def = defMap.get(defId);
    if (!def) continue;

    const flag = result.status_flag as StatusFlag | null;
    const score = flag != null
      ? flagToScore(flag)
      : rangeScore(
          result.value_numeric!,
          def.reference_range_low,
          def.reference_range_high,
          def.optimal_range_low,
          def.optimal_range_high,
        );

    const trafficLight: TrafficLight =
      score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red';

    const nameObj = def.name ?? {};
    const name = nameObj[lang] ?? nameObj['en'] ?? nameObj['de'] ?? 'Unknown';

    biomarkers.push({
      id: result.id,
      definitionId: defId,
      name,
      value: result.value_numeric!,
      unit: result.unit ?? def.unit ?? '',
      score,
      trafficLight,
      statusFlag: flag,
      category: (def.category as BiomarkerCategory | null) ?? null,
      measuredAt: result.measured_at,
    });
  }

  // Sort: red first, then yellow, then green; alphabetically within tier
  biomarkers.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

  // Domain scores grouped by category
  const groups = new Map<string, number[]>();
  for (const bm of biomarkers) {
    const key = bm.category ?? 'fitness';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bm.score);
  }

  const domains: Partial<Record<BiomarkerCategory, DomainScore>> = {};
  for (const [key, scores] of groups) {
    domains[key as BiomarkerCategory] = {
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      biomarkerCount: scores.length,
    };
  }

  // Weighted overall score
  let weightedSum = 0;
  let usedWeight = 0;
  for (const [cat, ds] of Object.entries(domains) as [BiomarkerCategory, DomainScore][]) {
    const w = DOMAIN_WEIGHTS[cat] ?? 0.05;
    weightedSum += ds.score * w;
    usedWeight += w;
  }
  const overall = biomarkers.length === 0
    ? 0
    : usedWeight > 0
      ? Math.round(weightedSum / usedWeight)
      : Math.round(biomarkers.reduce((a, b) => a + b.score, 0) / biomarkers.length);

  return { overall, domains, biomarkers };
}

export const CATEGORY_DISPLAY: Record<string, Record<string, string>> = {
  heart_vessels:    { de: 'Herz & Gefässe',        en: 'Heart & Vessels',       fr: 'Cœur & Vaisseaux',       es: 'Corazón & Vasos',        it: 'Cuore & Vasi' },
  metabolism:       { de: 'Stoffwechsel',            en: 'Metabolism',            fr: 'Métabolisme',             es: 'Metabolismo',             it: 'Metabolismo' },
  inflammation:     { de: 'Entzündung & Immunsystem',en: 'Inflammation & Immune', fr: 'Inflammation & Immunité', es: 'Inflamación & Inmunidad',  it: 'Infiammazione & Immunit.' },
  organ_function:   { de: 'Organfunktion',           en: 'Organ Function',        fr: 'Fonction Organique',      es: 'Función Orgánica',         it: 'Funzione Organica' },
  nutrients:        { de: 'Nährstoffe',              en: 'Nutrients',             fr: 'Nutriments',              es: 'Nutrientes',               it: 'Nutrienti' },
  hormones:         { de: 'Hormone',                 en: 'Hormones',              fr: 'Hormones',                es: 'Hormonas',                 it: 'Ormoni' },
  body_composition: { de: 'Körperzusammensetzung',   en: 'Body Composition',      fr: 'Composition Corporelle',  es: 'Composición Corporal',     it: 'Composizione Corporea' },
  fitness:          { de: 'Fitness & Erholung',      en: 'Fitness & Recovery',    fr: 'Forme & Récupération',    es: 'Forma & Recuperación',     it: 'Forma & Recupero' },
};
