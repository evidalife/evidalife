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

// ── Calculated Markers ────────────────────────────────────────────────────────
//
// A map of slug → compute function. Each function receives a slug→value lookup
// of the user's measured biomarkers and returns the calculated value, or null
// if any required input is missing.

type SlugValues = Record<string, number>;

export type CalculatedMarkerFn = (v: SlugValues) => number | null;

function get(v: SlugValues, slug: string): number | null {
  return slug in v ? v[slug] : null;
}

function all(v: SlugValues, ...slugs: string[]): number[] | null {
  const vals = slugs.map((s) => get(v, s));
  if (vals.some((x) => x === null)) return null;
  return vals as number[];
}

export const CALCULATED_MARKERS: Record<string, CalculatedMarkerFn> = {
  // HOMA-IR — insulin resistance index
  homa_ir: (v) => {
    const [glucose, insulin] = all(v, 'fasting_glucose', 'fasting_insulin') ?? [null, null];
    if (glucose === null || insulin === null) return null;
    // glucose in mmol/L, insulin in µIU/mL
    return (glucose * insulin) / 22.5;
  },

  // eGFR (CKD-EPI simplified, serum creatinine in µmol/L)
  egfr: (v) => {
    const cr = get(v, 'creatinine');
    if (cr === null) return null;
    // CKD-EPI race-free 2021: approximation; age/sex unknown so neutral midpoint
    // Convert µmol/L → mg/dL: divide by 88.4
    const crMg = cr / 88.4;
    // Use simplified Cockcroft-Gault placeholder (accurate eGFR needs age+sex from profile)
    if (crMg <= 0) return null;
    return Math.round(100 / crMg);
  },

  // BMI — body mass index
  bmi: (v) => {
    const [weight, height] = all(v, 'weight', 'height') ?? [null, null];
    if (weight === null || height === null || height === 0) return null;
    const heightM = height / 100;
    return weight / (heightM * heightM);
  },

  // PhenoAge (Levine biological age proxy — simplified)
  pheno_age: (v) => {
    const albumin   = get(v, 'albumin');
    const creatinine = get(v, 'creatinine');
    const glucose    = get(v, 'fasting_glucose');
    const crp        = get(v, 'hs_crp');
    const lympho     = get(v, 'lymphocytes');
    const mcv        = get(v, 'mcv');
    const rdw        = get(v, 'rdw');
    const alkPhos    = get(v, 'alkaline_phosphatase');
    const wbc        = get(v, 'leukocytes');
    if ([albumin, creatinine, glucose, crp, lympho, mcv, rdw, alkPhos, wbc].some((x) => x === null)) return null;
    // Levine 2018 linear combination (simplified — full formula requires log transforms)
    const score =
      -19.907 -
      0.0336  * albumin! +
      0.0095  * creatinine! +
      0.1953  * glucose! +
      0.0954  * Math.log(crp! + 0.01) -
      0.0120  * lympho! +
      0.0268  * mcv! +
      0.3306  * rdw! +
      0.00188 * alkPhos! +
      0.0554  * wbc!;
    return score;
  },

  // TG/HDL ratio
  tg_hdl_ratio: (v) => {
    const [tg, hdl] = all(v, 'triglycerides', 'hdl_cholesterol') ?? [null, null];
    if (tg === null || hdl === null || hdl === 0) return null;
    return tg / hdl;
  },

  // AIP — Atherogenic Index of Plasma: log(TG/HDL) in mmol/L
  atherogenic_index: (v) => {
    const [tg, hdl] = all(v, 'triglycerides', 'hdl_cholesterol') ?? [null, null];
    if (tg === null || hdl === null || hdl <= 0 || tg <= 0) return null;
    return Math.log10(tg / hdl);
  },

  // Non-HDL-C = Total Cholesterol − HDL
  non_hdl_cholesterol: (v) => {
    const [tc, hdl] = all(v, 'total_cholesterol', 'hdl_cholesterol') ?? [null, null];
    if (tc === null || hdl === null) return null;
    return tc - hdl;
  },

  // Castelli Risk Index I = TC / HDL
  castelli_risk_index_i: (v) => {
    const [tc, hdl] = all(v, 'total_cholesterol', 'hdl_cholesterol') ?? [null, null];
    if (tc === null || hdl === null || hdl === 0) return null;
    return tc / hdl;
  },

  // Castelli Risk Index II = LDL / HDL
  castelli_risk_index_ii: (v) => {
    const [ldl, hdl] = all(v, 'ldl_cholesterol', 'hdl_cholesterol') ?? [null, null];
    if (ldl === null || hdl === null || hdl === 0) return null;
    return ldl / hdl;
  },

  // MAP — Mean Arterial Pressure: DBP + (SBP - DBP) / 3
  mean_arterial_pressure: (v) => {
    const [sbp, dbp] = all(v, 'systolic_bp', 'diastolic_bp') ?? [null, null];
    if (sbp === null || dbp === null) return null;
    return dbp + (sbp - dbp) / 3;
  },

  // Pulse Pressure = SBP − DBP
  pulse_pressure: (v) => {
    const [sbp, dbp] = all(v, 'systolic_bp', 'diastolic_bp') ?? [null, null];
    if (sbp === null || dbp === null) return null;
    return sbp - dbp;
  },

  // FIB-4 — liver fibrosis score: (age × AST) / (platelets × √ALT)
  // age is not a biomarker slug — FIB-4 requires age from profile; return null if missing
  fib4_index: (v) => {
    const [ast, alt, platelets, age] = all(v, 'ast', 'alt', 'platelets', 'age_years') ?? [null, null, null, null];
    if (ast === null || alt === null || platelets === null || age === null || alt <= 0 || platelets <= 0) return null;
    return (age * ast) / (platelets * Math.sqrt(alt));
  },

  // De Ritis ratio = AST / ALT
  de_ritis_ratio: (v) => {
    const [ast, alt] = all(v, 'ast', 'alt') ?? [null, null];
    if (ast === null || alt === null || alt === 0) return null;
    return ast / alt;
  },

  // NLR — Neutrophil-to-Lymphocyte Ratio
  neutrophil_lymphocyte_ratio: (v) => {
    const [neut, lymph] = all(v, 'neutrophils', 'lymphocytes') ?? [null, null];
    if (neut === null || lymph === null || lymph === 0) return null;
    return neut / lymph;
  },

  // LMR — Lymphocyte-to-Monocyte Ratio
  lymphocyte_monocyte_ratio: (v) => {
    const [lymph, mono] = all(v, 'lymphocytes', 'monocytes') ?? [null, null];
    if (lymph === null || mono === null || mono === 0) return null;
    return lymph / mono;
  },

  // PLR — Platelet-to-Lymphocyte Ratio
  platelet_lymphocyte_ratio: (v) => {
    const [plt, lymph] = all(v, 'platelets', 'lymphocytes') ?? [null, null];
    if (plt === null || lymph === null || lymph === 0) return null;
    return plt / lymph;
  },

  // SII — Systemic Immune-Inflammation Index: platelets × NLR
  systemic_immune_inflammation_index: (v) => {
    const [plt, neut, lymph] = all(v, 'platelets', 'neutrophils', 'lymphocytes') ?? [null, null, null];
    if (plt === null || neut === null || lymph === null || lymph === 0) return null;
    return (plt * neut) / lymph;
  },

  // TSAT — Transferrin Saturation: (serum iron / TIBC) × 100
  transferrin_saturation: (v) => {
    const [iron, tibc] = all(v, 'serum_iron', 'tibc') ?? [null, null];
    if (iron === null || tibc === null || tibc === 0) return null;
    return (iron / tibc) * 100;
  },

  // WHtR — Waist-to-Height Ratio
  waist_height_ratio: (v) => {
    const [waist, height] = all(v, 'waist_circumference', 'height') ?? [null, null];
    if (waist === null || height === null || height === 0) return null;
    return waist / height;
  },

  // HOMA-β — Beta-cell function: (20 × insulin) / (glucose − 3.5)
  homa_beta: (v) => {
    const [glucose, insulin] = all(v, 'fasting_glucose', 'fasting_insulin') ?? [null, null];
    if (glucose === null || insulin === null || glucose <= 3.5) return null;
    return (20 * insulin) / (glucose - 3.5);
  },
};

/**
 * Given a map of measured biomarker slug → numeric value,
 * returns all computable calculated markers as additional slug→value entries.
 * Already-measured values are NOT overwritten.
 */
export function computeAllCalculatedMarkers(measured: SlugValues): SlugValues {
  const result: SlugValues = { ...measured };
  for (const [slug, fn] of Object.entries(CALCULATED_MARKERS)) {
    if (slug in result) continue; // don't overwrite a directly measured value
    const val = fn(result);
    if (val !== null && isFinite(val)) {
      result[slug] = Math.round(val * 10000) / 10000; // 4 dp precision
    }
  }
  return result;
}
