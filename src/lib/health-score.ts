// ── Health Score Calculation ──────────────────────────────────────────────────
//
// Computes an overall health score and per-domain scores from raw lab_results
// joined with biomarker_definitions.

export type StatusFlag = 'optimal' | 'good' | 'moderate' | 'risk';

export type BiomarkerCategory =
  | 'metabolic'
  | 'cardiovascular'
  | 'inflammation'
  | 'hormonal'
  | 'nutritional'
  | 'organ_function'
  | 'functional'
  | 'epigenetic';

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

// Domain weights — total should sum to 1
const DOMAIN_WEIGHTS: Partial<Record<BiomarkerCategory, number>> = {
  metabolic: 0.20,
  cardiovascular: 0.20,
  inflammation: 0.15,
  organ_function: 0.15,
  hormonal: 0.15,
  nutritional: 0.10,
  functional: 0.03,
  epigenetic: 0.02,
};

function flagToScore(flag: StatusFlag): number {
  switch (flag) {
    case 'optimal': return 100;
    case 'good': return 75;
    case 'moderate': return 50;
    case 'risk': return 25;
  }
}

function rangeScore(
  value: number,
  refLow: number | null,
  refHigh: number | null,
  optLow: number | null,
  optHigh: number | null,
): number {
  if (optLow != null && optHigh != null && value >= optLow && value <= optHigh) return 100;
  if (refLow != null && refHigh != null) {
    if (value >= refLow && value <= refHigh) return 75;
    const span = refHigh - refLow;
    if (span === 0) return 50;
    const pct = value < refLow
      ? (refLow - value) / span
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
    const key = bm.category ?? 'functional';
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
  metabolic:      { de: 'Metabolismus',      en: 'Metabolic Health',     fr: 'Métabolisme',       es: 'Salud Metabólica',      it: 'Salute Metabolica' },
  cardiovascular: { de: 'Herz-Kreislauf',     en: 'Cardiovascular',       fr: 'Cardiovasculaire',  es: 'Cardiovascular',        it: 'Cardiovascolare' },
  inflammation:   { de: 'Entzündung',         en: 'Inflammation',         fr: 'Inflammation',      es: 'Inflamación',           it: 'Infiammazione' },
  organ_function: { de: 'Organfunktion',      en: 'Organ Function',       fr: 'Fonction Organique',es: 'Función Orgánica',      it: 'Funzione Organica' },
  hormonal:       { de: 'Hormonhaushalt',     en: 'Hormonal Balance',     fr: 'Équilibre Hormonal',es: 'Balance Hormonal',      it: 'Equilibrio Ormonale' },
  nutritional:    { de: 'Nährstoffversorgung',en: 'Nutrition',             fr: 'Nutrition',         es: 'Nutrición',             it: 'Nutrizione' },
  functional:     { de: 'Funktionalität',     en: 'Functional',           fr: 'Fonctionnel',       es: 'Funcional',             it: 'Funzionale' },
  epigenetic:     { de: 'Epigenetik',         en: 'Epigenetic',           fr: 'Épigénétique',      es: 'Epigenética',           it: 'Epigenética' },
};
