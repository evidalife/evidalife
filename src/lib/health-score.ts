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
  epigenetics:      { de: 'Epigenetik & Bio-Alter',  en: 'Epigenetics & Bio Age', fr: 'Épigénétique & Bio Âge',  es: 'Epigenética & Bio Edad',   it: 'Epigenetica & Bio Età' },
};

// ── Calculated Markers ────────────────────────────────────────────────────────
//
// Each key MUST exactly match the slug in the `biomarkers` DB table.
// Keys renamed from previous version:
//   atherogenic_index              → aip
//   non_hdl_cholesterol            → non_hdl_c
//   castelli_risk_index_i          → castelli_i
//   castelli_risk_index_ii         → castelli_ii
//   fib4_index                     → fib4_score
//   neutrophil_lymphocyte_ratio    → nlr
//   lymphocyte_monocyte_ratio      → lmr
//   platelet_lymphocyte_ratio      → plr
//   systemic_immune_inflammation_index → sii
//   transferrin_saturation         → tsat  (inputs: serum_iron→iron_serum, tibc→transferrin)
//   waist_height_ratio             → wht_ratio
//
// Canonical units in lab_results (what formulas receive):
//   fasting_glucose  mg/dL    triglycerides    mg/dL
//   creatinine       mg/dL    hdl_cholesterol  mg/dL
//   albumin          g/dL     ldl_cholesterol  mg/dL
//   hs_crp           mg/L     total_cholesterol mg/dL
//   systolic_bp      mmHg     diastolic_bp     mmHg
//   neutrophils      %        lymphocytes      %
//   monocytes        %        platelets        10³/µL
//   alt/ast/alp      U/L      iron_serum       µg/dL
//   transferrin      mg/dL

type SlugValues = Record<string, number>;

export type CalculatedMarkerFn = (v: SlugValues, userAge?: number) => number | null;

function get(v: SlugValues, slug: string): number | null {
  return slug in v ? v[slug] : null;
}

function all(v: SlugValues, ...slugs: string[]): number[] | null {
  const vals = slugs.map((s) => get(v, s));
  if (vals.some((x) => x === null)) return null;
  return vals as number[];
}

export const CALCULATED_MARKERS: Record<string, CalculatedMarkerFn> = {

  // ── Metabolism ──────────────────────────────────────────────────────────────

  // HOMA-IR — insulin resistance
  // Divisor 405 because fasting_glucose is in mg/dL (not mmol/L)
  homa_ir: (v) => {
    const r = all(v, 'fasting_insulin', 'fasting_glucose');
    if (!r) return null;
    const [insulin, glucose] = r;
    if (glucose <= 0) return null;
    return (insulin * glucose) / 405;
  },

  // HOMA-β — pancreatic beta-cell function (normal ~100%)
  homa_beta: (v) => {
    const r = all(v, 'fasting_insulin', 'fasting_glucose');
    if (!r) return null;
    const [insulin, glucose] = r;
    const glucoseMmol = glucose / 18.0182;
    if (glucoseMmol <= 3.5) return null;
    return (20 * insulin) / (glucoseMmol - 3.5);
  },

  // ── Heart & Vessels ─────────────────────────────────────────────────────────

  // Non-HDL Cholesterol = Total − HDL (mg/dL)
  non_hdl_c: (v) => {
    const r = all(v, 'total_cholesterol', 'hdl_cholesterol');
    if (!r) return null;
    return r[0] - r[1];
  },

  // TG/HDL Ratio (both mg/dL — ratio is unit-independent)
  tg_hdl_ratio: (v) => {
    const r = all(v, 'triglycerides', 'hdl_cholesterol');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // AIP — Atherogenic Index of Plasma: log10(TG/HDL in mmol/L)
  // Convert mg/dL → mmol/L first: TG÷88.57, HDL÷38.67
  aip: (v) => {
    const r = all(v, 'triglycerides', 'hdl_cholesterol');
    if (!r) return null;
    const tgMmol  = r[0] / 88.57;
    const hdlMmol = r[1] / 38.67;
    if (hdlMmol <= 0 || tgMmol <= 0) return null;
    return Math.log10(tgMmol / hdlMmol);
  },

  // Castelli Risk Index I = Total Cholesterol / HDL
  castelli_i: (v) => {
    const r = all(v, 'total_cholesterol', 'hdl_cholesterol');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // Castelli Risk Index II = LDL / HDL
  castelli_ii: (v) => {
    const r = all(v, 'ldl_cholesterol', 'hdl_cholesterol');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // MAP — Mean Arterial Pressure (mmHg)
  mean_arterial_pressure: (v) => {
    const r = all(v, 'systolic_bp', 'diastolic_bp');
    if (!r) return null;
    return r[1] + (r[0] - r[1]) / 3;
  },

  // Pulse Pressure = SBP − DBP (mmHg)
  pulse_pressure: (v) => {
    const r = all(v, 'systolic_bp', 'diastolic_bp');
    if (!r) return null;
    return r[0] - r[1];
  },

  // ── Inflammation ─────────────────────────────────────────────────────────────

  // NLR — Neutrophil-to-Lymphocyte Ratio
  nlr: (v) => {
    const r = all(v, 'neutrophils', 'lymphocytes');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // LMR — Lymphocyte-to-Monocyte Ratio
  lmr: (v) => {
    const r = all(v, 'lymphocytes', 'monocytes');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // PLR — Platelet-to-Lymphocyte Ratio
  plr: (v) => {
    const r = all(v, 'platelets', 'lymphocytes');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // SII — Systemic Immune-Inflammation Index: (Neutrophils × Platelets) / Lymphocytes
  sii: (v) => {
    const r = all(v, 'neutrophils', 'platelets', 'lymphocytes');
    if (!r || r[2] <= 0) return null;
    return (r[0] * r[1]) / r[2];
  },

  // ── Organ Function ────────────────────────────────────────────────────────────

  // eGFR — CKD-EPI 2021 race-free (Inker et al. NEJM 2021)
  // sex_code: 0=female, 1=male, 0.5/undefined=unknown → average of M+F
  egfr: (v, userAge) => {
    const cr = get(v, 'creatinine'); // mg/dL canonical
    if (cr === null || cr <= 0 || !userAge) return null;

    const sexCode = get(v, 'sex_code'); // 0=female, 1=male, 0.5=unknown

    function ckdEpi(creatinine: number, age: number, kappa: number, alpha: number, sexMult: number): number {
      const ratio = creatinine / kappa;
      const exp = ratio <= 1 ? alpha : -1.200;
      return 142 * Math.pow(ratio, exp) * Math.pow(0.9938, age) * sexMult;
    }

    let result: number;
    if (sexCode === 0) {
      result = ckdEpi(cr, userAge, 0.7, -0.241, 1.012);
    } else if (sexCode === 1) {
      result = ckdEpi(cr, userAge, 0.9, -0.302, 1.0);
    } else {
      // Sex unknown: average of male and female
      const female = ckdEpi(cr, userAge, 0.7, -0.241, 1.012);
      const male   = ckdEpi(cr, userAge, 0.9, -0.302, 1.0);
      result = (female + male) / 2;
    }
    return Math.max(0, Math.round(result));
  },

  // De Ritis Ratio = AST / ALT
  de_ritis_ratio: (v) => {
    const r = all(v, 'ast', 'alt');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  // FIB-4 — liver fibrosis: (Age × AST) / (Platelets × √ALT)
  // Requires userAge — returns null without it
  fib4_score: (v, userAge) => {
    const r = all(v, 'ast', 'alt', 'platelets');
    if (!r || !userAge) return null;
    const [ast, alt, platelets] = r;
    if (alt <= 0 || platelets <= 0) return null;
    return (userAge * ast) / (platelets * Math.sqrt(alt));
  },

  // ── Nutrients ────────────────────────────────────────────────────────────────

  // TSAT — Transferrin Saturation (%)
  // iron_serum µg/dL → µmol/L: ÷5.585
  // transferrin mg/dL → g/L: ×0.01 → µmol/L: ×25.2 (MW 79,570 Da, 2 Fe sites)
  tsat: (v) => {
    const r = all(v, 'iron_serum', 'transferrin');
    if (!r) return null;
    const [ironUgDl, transferrinMgDl] = r;
    const ironUmolL     = ironUgDl / 5.585;
    const transferrinGL = transferrinMgDl * 0.01;
    const tibcUmolL     = transferrinGL * 25.2;
    if (tibcUmolL <= 0) return null;
    return (ironUmolL / tibcUmolL) * 100;
  },

  // ── Body Composition ──────────────────────────────────────────────────────────

  // BMI — height_cm injected from profile (not in lab_results)
  bmi: (v) => {
    const weight = get(v, 'body_weight'); // kg
    const height = get(v, 'height_cm');  // injected from profile
    if (weight === null || height === null || height <= 0) return null;
    const hM = height / 100;
    return weight / (hM * hM);
  },

  // WHtR — Waist-to-Height Ratio (height_cm from profile)
  wht_ratio: (v) => {
    const waist  = get(v, 'waist_circumference');
    const height = get(v, 'height_cm'); // injected from profile
    if (waist === null || height === null || height <= 0) return null;
    return waist / height;
  },

  // ── Epigenetics ──────────────────────────────────────────────────────────────

  // PhenoAge — Levine 2018 biological age (years)
  //
  // Inputs (canonical units → Levine units):
  //   albumin        g/dL  → g/L       (×10)
  //   creatinine     mg/dL → µmol/L    (×88.42)
  //   fasting_glucose mg/dL → mmol/L   (÷18.0182)
  //   hs_crp         mg/L  → mg/dL     (÷10) then ln()
  //   lymphocytes    %     → as-is
  //   mcv            fL    → as-is
  //   rdw            %     → as-is
  //   alp            U/L   → as-is
  //   userAge        years → from profile (NOT a lab slug)
  //
  // Previous bugs fixed:
  //   'alkaline_phosphatase' → 'alp'
  //   'leukocytes'           → removed (wbc is NOT in Levine formula)
  //   9th coefficient        → chronological age (was incorrectly wbc)
  pheno_age: (v, userAge) => {
    const albumin    = get(v, 'albumin');
    const creatinine = get(v, 'creatinine');
    const glucose    = get(v, 'fasting_glucose');
    const crp        = get(v, 'hs_crp');
    const lympho     = get(v, 'lymphocytes');
    const mcv        = get(v, 'mcv');
    const rdw        = get(v, 'rdw');
    const alp        = get(v, 'alp');

    if (
      albumin === null || creatinine === null || glucose === null ||
      crp === null || lympho === null || mcv === null ||
      rdw === null || alp === null || !userAge
    ) return null;

    const albGL     = albumin * 10;
    const creatUmol = creatinine * 88.42;
    const glucMmol  = glucose / 18.0182;
    const crpMgDl   = crp / 10;
    const lnCrp     = Math.log(Math.max(crpMgDl, 0.001));

    const ms =
      -19.907
      - 0.0336  * albGL
      + 0.0095  * creatUmol
      + 0.1953  * glucMmol
      + 0.0954  * lnCrp
      - 0.0120  * lympho
      + 0.0268  * mcv
      + 0.3306  * rdw
      + 0.00188 * alp
      + 0.0554  * userAge;

    const mortalityRisk = 1 - Math.exp(-Math.exp(ms) * 0.0076927);
    if (mortalityRisk <= 0 || mortalityRisk >= 1) return null;
    return 141.50 + Math.log(-Math.log(1 - mortalityRisk)) / 0.09165;
  },
};

/**
 * Computes all derivable calculated markers from a slug→value map.
 * Already-measured values are never overwritten.
 *
 * @param measured   slug → canonical-unit value from lab_results
 * @param userAge    chronological age in years (from profiles.birthday)
 * @param heightCm   height in cm (from profiles.height_cm) — for BMI / WHtR
 * @param userSex    biological sex from profiles.sex — used for CKD-EPI eGFR
 */
export function computeAllCalculatedMarkers(
  measured: SlugValues,
  userAge?: number,
  heightCm?: number,
  userSex?: 'male' | 'female' | null,
): SlugValues {
  const enriched: SlugValues = { ...measured };
  if (userAge !== undefined)  enriched['age_years']  = userAge;
  if (heightCm !== undefined) enriched['height_cm']  = heightCm;
  // Inject sex_code synthetic slug: 0=female, 1=male, 0.5=unknown
  if (userSex !== undefined) {
    enriched['sex_code'] = userSex === 'female' ? 0 : userSex === 'male' ? 1 : 0.5;
  }

  const result: SlugValues = { ...enriched };

  for (const [slug, fn] of Object.entries(CALCULATED_MARKERS)) {
    if (slug in measured) continue;
    const val = fn(enriched, userAge);
    if (val !== null && isFinite(val)) {
      result[slug] = Math.round(val * 10000) / 10000;
    }
  }

  return result;
}
