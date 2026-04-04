// ── Health Engine — Single Source of Truth ──────────────────────────────────
//
// Unified module for all health-engine scoring, types, domain metadata,
// calculated marker formulas, and briefing types.
//
// Previously split across health-score.ts and health-engine-shared.ts.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared types ───────────────────────────────────────────────────────────

export type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

/**
 * Canonical status used by the continuous scoring system (health engine v2+).
 * The thresholds are: optimal ≥ 90, good ≥ 75, borderline ≥ 55, risk < 55.
 */
export type MarkerStatus = 'optimal' | 'good' | 'borderline' | 'risk';

/**
 * Legacy status flag — still present on some lab_results rows and used by
 * the older computeHealthScore() path.  'moderate' maps to 'borderline'.
 */
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

// ── Slide types (Health Briefing v2) ───────────────────────────────────────

export type SlideType =
  | 'welcome'
  | 'longevity_score'
  | 'bio_age_score'
  | 'domain_summary'
  | 'closing';

export interface BriefingSlide {
  id: string;
  type: SlideType;
  title: string;
  narration: string;
  data: SlideData;
  audioUrl?: string;
}

export type SlideData =
  | WelcomeData
  | LongevityScoreData
  | BioAgeScoreData
  | DomainSummaryData
  | ClosingData;

export interface WelcomeData {
  type: 'welcome';
  firstName: string;
  testDate: string;
  markerCount: number;
  reportCount: number;
}

export interface LongevityScoreData {
  type: 'longevity_score';
  score: number;
  prevScore: number | null;
  trend: 'up' | 'down' | 'stable';
  history: { date: string; score: number }[];
  domainCount: number;
  bestDomain: { name: string; score: number; markerCount?: number } | null;
  worstDomain: { name: string; score: number } | null;
  borderlineMarkers: string[];
  improvedMarkers: string[];
  totalMarkers: number;
  firstScore: number | null;
  progressLabel: string;
  firstBioAgeDiff: number | null;
  latestBioAgeDiff: number | null;
  domainWeights?: { label: string; value: string }[];
}

export interface BioAgeScoreData {
  type: 'bio_age_score';
  bioAgeScore: number;
  chronAge: number;
  phenoAge: number | null;
  grimAge: number | null;
  dunedinPace: number | null;
  ageDiff: number;
  avgBioAge: number | null;
  clockCount: number;
  bestClock: { label: string; age: number } | null;
  focusClock: { label: string; age: number } | null;
  chartData: { date: string; avg: number | null; chron: number }[];
}

export interface DomainSummaryData {
  type: 'domain_summary';
  domainKey: string;
  domainName: string;
  domainIcon: string;
  domainDescription: string;
  score: number;
  prevScore: number | null;
  weight: string;
  markers: MarkerDetail[];
  criticalMarkers: MarkerDetail[];
  exceptionalMarkers: MarkerDetail[];
  domainTrend: { date: string; score: number }[];
}

export interface ClosingData {
  type: 'closing';
  score: number;
  improvements: string[];
  nextSteps: string[];
  totalMarkers: number;
  totalDomains: number;
}

// ── Marker types ───────────────────────────────────────────────────────────

export interface MarkerSummary {
  name: string;
  slug: string;
  score: number;
  status: MarkerStatus;
  value: number;
  unit: string;
  domainKey: string;
  domainName: string;
}

export interface MarkerDetail extends MarkerSummary {
  refLow: number | null;
  refHigh: number | null;
  optLow: number | null;
  optHigh: number | null;
  trend: { dates: string[]; values: number[] };
  delta: number | null;
  prevValue: number | null;
  prevScore: number | null;
}

export interface BioAge {
  phenoAge: number | null;
  grimAge: number | null;
  dunedinPace: number | null;
  chronAge: number;
}

export interface StudyCitation {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  keyFinding: string;
  url: string;
}

// ── API request/response ───────────────────────────────────────────────────

export interface BriefingV2Request {
  lang?: string;
}

export interface BriefingV2Response {
  slides: BriefingSlide[];
  cached: boolean;
  briefingId?: string;
}

// ── Legacy scored-biomarker types (used by HealthEngineContent) ────────────

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

// ── Domain configuration ───────────────────────────────────────────────────

export const DOMAIN_ORDER = [
  'heart_vessels', 'metabolism', 'inflammation', 'organ_function',
  'nutrients', 'hormones', 'body_composition', 'fitness', 'epigenetics',
] as const;

export const DOMAIN_META: Record<string, {
  icon: string; color: string; weight: number; weightLabel: string;
  name: Record<string, string>;
  description: Record<string, string>;
}> = {
  heart_vessels: {
    icon: '❤️', color: '#dc2626', weight: 0.18, weightLabel: '18%',
    name: { en: 'Heart & Vessels', de: 'Herz & Gefässe', fr: 'Coeur & Vaisseaux', es: 'Corazón & Vasos', it: 'Cuore & Vasi' },
    description: {
      en: 'Cardiovascular markers predict heart attack and stroke risk — the #1 cause of death globally.',
      de: 'Kardiovaskuläre Marker sagen Herzinfarkt- und Schlaganfallrisiko voraus.',
      fr: 'Les marqueurs cardiovasculaires prédisent le risque de crise cardiaque et d\'AVC.',
      es: 'Los marcadores cardiovasculares predicen el riesgo de infarto y ACV.',
      it: 'I marcatori cardiovascolari predicono il rischio di infarto e ictus.',
    },
  },
  metabolism: {
    icon: '⚡', color: '#059669', weight: 0.16, weightLabel: '16%',
    name: { en: 'Metabolism', de: 'Stoffwechsel', fr: 'Métabolisme', es: 'Metabolismo', it: 'Metabolismo' },
    description: {
      en: 'Blood sugar regulation and insulin sensitivity are central drivers of aging.',
      de: 'Blutzuckerregulation und Insulinsensitivität sind zentrale Treiber des Alterns.',
      fr: 'La régulation de la glycémie et la sensibilité à l\'insuline sont des facteurs centraux du vieillissement.',
      es: 'La regulación de la glucosa y la sensibilidad a la insulina son factores centrales del envejecimiento.',
      it: 'La regolazione glicemica e la sensibilità all\'insulina sono fattori centrali dell\'invecchiamento.',
    },
  },
  inflammation: {
    icon: '🛡️', color: '#d97706', weight: 0.14, weightLabel: '14%',
    name: { en: 'Inflammation', de: 'Entzündung', fr: 'Inflammation', es: 'Inflamación', it: 'Infiammazione' },
    description: {
      en: 'Chronic low-grade inflammation silently damages tissue for decades.',
      de: 'Chronische niedriggradige Entzündung schädigt still das Gewebe über Jahrzehnte.',
      fr: 'L\'inflammation chronique de bas grade endommage silencieusement les tissus.',
      es: 'La inflamación crónica de bajo grado daña silenciosamente los tejidos.',
      it: 'L\'infiammazione cronica di basso grado danneggia silenziosamente i tessuti.',
    },
  },
  organ_function: {
    icon: '🫁', color: '#7c3aed', weight: 0.13, weightLabel: '13%',
    name: { en: 'Organ Function', de: 'Organfunktion', fr: 'Fonction Organique', es: 'Función Orgánica', it: 'Funzione Organica' },
    description: {
      en: 'Kidney, liver, and thyroid function decline with age but respond well to early intervention.',
      de: 'Nieren-, Leber- und Schilddrüsenfunktion nehmen mit dem Alter ab, sprechen aber gut auf frühe Intervention an.',
      fr: 'Les fonctions rénale, hépatique et thyroïdienne répondent bien à une intervention précoce.',
      es: 'Las funciones renal, hepática y tiroidea responden bien a la intervención temprana.',
      it: 'Le funzioni renale, epatica e tiroidea rispondono bene all\'intervento precoce.',
    },
  },
  nutrients: {
    icon: '🥗', color: '#10b981', weight: 0.10, weightLabel: '10%',
    name: { en: 'Nutrients', de: 'Nährstoffe', fr: 'Nutriments', es: 'Nutrientes', it: 'Nutrienti' },
    description: {
      en: 'Even mild deficiencies in key micronutrients impair immune function, energy, and DNA repair.',
      de: 'Selbst leichte Defizite bei Mikronährstoffen beeinträchtigen Immunfunktion und DNA-Reparatur.',
      fr: 'Même de légères carences en micronutriments altèrent la fonction immunitaire.',
      es: 'Incluso deficiencias leves en micronutrientes afectan la función inmunitaria.',
      it: 'Anche lievi carenze di micronutrienti compromettono la funzione immunitaria.',
    },
  },
  hormones: {
    icon: '🧬', color: '#f59e0b', weight: 0.09, weightLabel: '9%',
    name: { en: 'Hormones', de: 'Hormone', fr: 'Hormones', es: 'Hormonas', it: 'Ormoni' },
    description: {
      en: 'Hormonal balance affects energy, mood, body composition, and cognitive performance.',
      de: 'Hormonales Gleichgewicht beeinflusst Energie, Stimmung und kognitive Leistung.',
      fr: 'L\'équilibre hormonal affecte l\'énergie, l\'humeur et la performance cognitive.',
      es: 'El equilibrio hormonal afecta la energía, el estado de ánimo y el rendimiento cognitivo.',
      it: 'L\'equilibrio ormonale influisce su energia, umore e prestazioni cognitive.',
    },
  },
  body_composition: {
    icon: '🏋️', color: '#0ea5e9', weight: 0.05, weightLabel: '5%',
    name: { en: 'Body Composition', de: 'Körperzusammensetzung', fr: 'Composition Corporelle', es: 'Composición Corporal', it: 'Composizione Corporea' },
    description: {
      en: 'Visceral fat, lean mass, and bone density are independent predictors of mortality.',
      de: 'Viszeralfett, Muskelmasse und Knochendichte sind unabhängige Sterblichkeitsprädiktoren.',
      fr: 'La graisse viscérale et la masse osseuse sont des prédicteurs indépendants de mortalité.',
      es: 'La grasa visceral y la densidad ósea son predictores independientes de mortalidad.',
      it: 'Il grasso viscerale e la densità ossea sono predittori indipendenti di mortalità.',
    },
  },
  fitness: {
    icon: '🏃', color: '#16a34a', weight: 0.05, weightLabel: '5%',
    name: { en: 'Fitness', de: 'Fitness', fr: 'Condition Physique', es: 'Fitness', it: 'Fitness' },
    description: {
      en: 'VO₂max is the strongest single predictor of all-cause mortality.',
      de: 'VO₂max ist der stärkste einzelne Prädiktor für die Gesamtsterblichkeit.',
      fr: 'La VO₂max est le meilleur prédicteur individuel de mortalité toutes causes.',
      es: 'El VO₂max es el predictor más fuerte de mortalidad por todas las causas.',
      it: 'Il VO₂max è il più forte predittore di mortalità per tutte le cause.',
    },
  },
  epigenetics: {
    icon: '🧪', color: '#8b5cf6', weight: 0.10, weightLabel: '10%',
    name: { en: 'Epigenetics', de: 'Epigenetik', fr: 'Épigénétique', es: 'Epigenética', it: 'Epigenetica' },
    description: {
      en: 'Epigenetic clocks measure biological aging at the molecular level.',
      de: 'Epigenetische Uhren messen das biologische Altern auf molekularer Ebene.',
      fr: 'Les horloges épigénétiques mesurent le vieillissement biologique au niveau moléculaire.',
      es: 'Los relojes epigenéticos miden el envejecimiento biológico a nivel molecular.',
      it: 'Gli orologi epigenetici misurano l\'invecchiamento biologico a livello molecolare.',
    },
  },
};

/**
 * Localized domain display names.
 * Kept for backward-compat — prefer DOMAIN_META[key].name for new code.
 */
export const CATEGORY_DISPLAY: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(DOMAIN_META).map(([key, meta]) => [key, meta.name]),
);

// ── Canonical scoring (continuous 0–100) ───────────────────────────────────

export function continuousScore(
  value: number,
  refLow: number | null, refHigh: number | null,
  optLow: number | null, optHigh: number | null,
): number {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const hRL = refLow != null, hRH = refHigh != null;
  const hOL = optLow != null, hOH = optHigh != null;

  if (hRL && hRH) {
    const rL = refLow!, rH = refHigh!;
    const span = rH - rL || 1;

    if (hOL && hOH) {
      const oL = optLow!, oH = optHigh!;
      const oMid = (oL + oH) / 2;
      const oHalf = (oH - oL) / 2 || 1;

      if (value >= oL && value <= oH) {
        const dist = Math.abs(value - oMid) / oHalf;
        return clamp(100 - 18 * dist);
      }
      if (value >= rL && value <= rH) {
        if (value < oL) {
          const pct = (oL - value) / (oL - rL || 1);
          return clamp(81 - 26 * pct);
        } else {
          const pct = (value - oH) / (rH - oH || 1);
          return clamp(81 - 26 * pct);
        }
      }
    } else {
      const mid = (rL + rH) / 2;
      const half = span / 2;
      if (value >= rL && value <= rH) {
        const dist = Math.abs(value - mid) / half;
        return clamp(90 - 22 * dist);
      }
    }

    const overshoot = value < rL ? (rL - value) / span : (value - rH) / span;
    if (overshoot <= 0.15) return clamp(50 - overshoot * 80);
    if (overshoot <= 0.5) return clamp(42 - overshoot * 50);
    return clamp(25 - overshoot * 30);
  }

  if (!hRL && hRH) {
    const rH = refHigh!;
    const opt = hOH ? optHigh! : rH * 0.8;
    if (value <= 0) return 100;
    if (value <= opt * 0.5) return clamp(98 - 4 * (value / (opt * 0.5 || 1)));
    if (value <= opt) {
      const ratio = (value - opt * 0.5) / (opt * 0.5 || 1);
      return clamp(94 - 12 * ratio);
    }
    if (value <= rH) {
      const pct = (value - opt) / (rH - opt || 1);
      return clamp(81 - 26 * pct);
    }
    const overshoot = (value - rH) / (rH || 1);
    return clamp(50 - overshoot * 65);
  }

  if (hRL && !hRH) {
    const rL = refLow!;
    const opt = hOL ? optLow! : rL * 1.2;
    if (value >= opt * 1.5) return clamp(94 - 6 * Math.min(1, (value - opt * 1.5) / (opt || 1)));
    if (value >= opt) {
      const excess = (value - opt) / (opt * 0.5 || 1);
      return clamp(98 - 4 * Math.min(1, excess));
    }
    if (value >= rL) {
      const pct = (opt - value) / (opt - rL || 1);
      return clamp(81 - 26 * pct);
    }
    const undershoot = (rL - value) / (rL || 1);
    return clamp(50 - undershoot * 65);
  }

  return 70;
}

/**
 * Dedicated scoring for age-ratio biomarkers (epigenetic clocks, pace-of-aging).
 * Uses the 4 DB range columns as hard status-zone boundaries:
 *   optHigh  – upper edge of "optimal"   (default 0.7)
 *   refLow   – upper edge of "good"      (default 0.9)
 *   refHigh  – upper edge of "borderline" (default 1.1)
 * Within each zone the score is linearly interpolated so the gauge
 * moves smoothly while the status label flips at the exact thresholds.
 */
export function ageRatioScore(
  ratio: number,
  refLow: number | null,
  refHigh: number | null,
  optLow: number | null,
  optHigh: number | null,
): number {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const oH  = optHigh ?? 0.7;
  const gH  = refLow  ?? 0.9;
  const rH  = refHigh ?? 1.1;

  if (ratio <= 0) return 100;

  // Optimal zone: score 90–100
  if (ratio <= oH) {
    const pct = ratio / oH;
    return clamp(100 - 10 * pct);
  }
  // Good zone: score 75–89
  if (ratio <= gH) {
    const pct = (ratio - oH) / (gH - oH || 1);
    return clamp(89 - 14 * pct);
  }
  // Borderline zone: score 55–74
  if (ratio <= rH) {
    const pct = (ratio - gH) / (rH - gH || 1);
    return clamp(74 - 19 * pct);
  }
  // Risk zone: score 0–54
  const overshoot = (ratio - rH) / (rH || 1);
  return clamp(54 - overshoot * 60);
}

export function scoreToStatus(s: number): MarkerStatus {
  if (s >= 90) return 'optimal';
  if (s >= 75) return 'good';
  if (s >= 55) return 'borderline';
  return 'risk';
}

export function scoreColor(score: number): string {
  if (score >= 88) return '#0C9C6C';
  if (score >= 70) return '#5ba37a';
  if (score >= 50) return '#C4A96A';
  return '#E06B5B';
}

export function statusColor(s: MarkerStatus): string {
  return s === 'optimal' ? '#0C9C6C' : s === 'good' ? '#5ba37a' : s === 'borderline' ? '#C4A96A' : '#E06B5B';
}

// ── Legacy step-function scoring (used by HealthEngineContent) ─────────────

function flagToScore(flag: StatusFlag): number {
  switch (flag) {
    case 'optimal': return 100;
    case 'good': return 75;
    case 'moderate': return 50;
    case 'risk': return 25;
  }
}

/**
 * Legacy range scorer — returns discrete 0/25/50/75/100 buckets.
 * Prefer `continuousScore()` for all new code.
 */
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

  if (!hasRefLow && hasRefHigh) {
    const opt = hasOptHigh ? optHigh! : refHigh;
    if (value <= opt) return 100;
    if (value <= refHigh) return 75;
    const overshoot = (value - refHigh) / refHigh;
    if (overshoot <= 0.25) return 50;
    if (overshoot <= 0.75) return 25;
    return 0;
  }

  if (hasRefLow && !hasRefHigh) {
    const opt = hasOptLow ? optLow! : refLow;
    if (value >= opt) return 100;
    if (value >= refLow) return 75;
    const undershoot = (refLow - value) / refLow;
    if (undershoot <= 0.25) return 50;
    if (undershoot <= 0.75) return 25;
    return 0;
  }

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

  return 50;
}

/**
 * Legacy health score computation — discrete buckets, no age-ratio support.
 * Used by HealthEngineContent. New code should use continuousScore() directly.
 */
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

  biomarkers.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

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

  // Use canonical weights from DOMAIN_META
  let weightedSum = 0;
  let usedWeight = 0;
  for (const [cat, ds] of Object.entries(domains) as [BiomarkerCategory, DomainScore][]) {
    const w = DOMAIN_META[cat]?.weight ?? 0.05;
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

// ── Calculated Markers ─────────────────────────────────────────────────────
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

  homa_ir: (v) => {
    const r = all(v, 'fasting_insulin', 'fasting_glucose');
    if (!r) return null;
    const [insulin, glucose] = r;
    if (glucose <= 0) return null;
    return (insulin * glucose) / 405;
  },

  homa_beta: (v) => {
    const r = all(v, 'fasting_insulin', 'fasting_glucose');
    if (!r) return null;
    const [insulin, glucose] = r;
    const glucoseMmol = glucose / 18.0182;
    if (glucoseMmol <= 3.5) return null;
    return (20 * insulin) / (glucoseMmol - 3.5);
  },

  // ── Heart & Vessels ─────────────────────────────────────────────────────────

  non_hdl_c: (v) => {
    const r = all(v, 'total_cholesterol', 'hdl_cholesterol');
    if (!r) return null;
    return r[0] - r[1];
  },

  tg_hdl_ratio: (v) => {
    const r = all(v, 'triglycerides', 'hdl_cholesterol');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  aip: (v) => {
    const r = all(v, 'triglycerides', 'hdl_cholesterol');
    if (!r) return null;
    const tgMmol  = r[0] / 88.57;
    const hdlMmol = r[1] / 38.67;
    if (hdlMmol <= 0 || tgMmol <= 0) return null;
    return Math.log10(tgMmol / hdlMmol);
  },

  castelli_i: (v) => {
    const r = all(v, 'total_cholesterol', 'hdl_cholesterol');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  castelli_ii: (v) => {
    const r = all(v, 'ldl_cholesterol', 'hdl_cholesterol');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  mean_arterial_pressure: (v) => {
    const r = all(v, 'systolic_bp', 'diastolic_bp');
    if (!r) return null;
    return r[1] + (r[0] - r[1]) / 3;
  },

  pulse_pressure: (v) => {
    const r = all(v, 'systolic_bp', 'diastolic_bp');
    if (!r) return null;
    return r[0] - r[1];
  },

  // ── Inflammation ─────────────────────────────────────────────────────────────

  nlr: (v) => {
    const r = all(v, 'neutrophils', 'lymphocytes');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  lmr: (v) => {
    const r = all(v, 'lymphocytes', 'monocytes');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  plr: (v) => {
    const r = all(v, 'platelets', 'lymphocytes');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  sii: (v) => {
    const r = all(v, 'neutrophils', 'platelets', 'lymphocytes');
    if (!r || r[2] <= 0) return null;
    return (r[0] * r[1]) / r[2];
  },

  // ── Organ Function ────────────────────────────────────────────────────────────

  egfr: (v, userAge) => {
    const crUmol = get(v, 'creatinine');
    if (crUmol === null || crUmol <= 0 || !userAge) return null;
    const cr = crUmol / 88.42;

    const sexCode = get(v, 'sex_code');

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
      const female = ckdEpi(cr, userAge, 0.7, -0.241, 1.012);
      const male   = ckdEpi(cr, userAge, 0.9, -0.302, 1.0);
      result = (female + male) / 2;
    }
    return Math.max(0, Math.round(result));
  },

  de_ritis_ratio: (v) => {
    const r = all(v, 'ast', 'alt');
    if (!r || r[1] <= 0) return null;
    return r[0] / r[1];
  },

  fib4_score: (v, userAge) => {
    const r = all(v, 'ast', 'alt', 'platelets');
    if (!r || !userAge) return null;
    const [ast, alt, platelets] = r;
    if (alt <= 0 || platelets <= 0) return null;
    return (userAge * ast) / (platelets * Math.sqrt(alt));
  },

  // ── Nutrients ────────────────────────────────────────────────────────────────

  tsat: (v) => {
    const r = all(v, 'iron_serum', 'transferrin');
    if (!r) return null;
    const [ironUmolL, transferrinMgDl] = r;
    const transferrinGL = transferrinMgDl * 0.01;
    const tibcUmolL     = transferrinGL * 25.2;
    if (tibcUmolL <= 0) return null;
    return (ironUmolL / tibcUmolL) * 100;
  },

  // ── Body Composition ──────────────────────────────────────────────────────────

  bmi: (v) => {
    const weight = get(v, 'body_weight');
    const height = get(v, 'height_cm');
    if (weight === null || height === null || height <= 0) return null;
    const hM = height / 100;
    return weight / (hM * hM);
  },

  wht_ratio: (v) => {
    const waist  = get(v, 'waist_circumference');
    const height = get(v, 'height_cm');
    if (waist === null || height === null || height <= 0) return null;
    return waist / height;
  },

  // ── Hormones ─────────────────────────────────────────────────────────────────

  testosterone_free: (v) => {
    const totalT = get(v, 'testosterone_total');
    const shbg   = get(v, 'shbg');
    const albumin = get(v, 'albumin');

    if (totalT === null || shbg === null || albumin === null) return null;
    if (totalT <= 0 || shbg <= 0 || albumin <= 0) return null;

    const totalT_nmol = totalT / 28.842;
    const albumin_mol = (albumin * 10) / 66430;

    const Ka_T_SHBG = 5.97e8;
    const Ka_T_Alb  = 3.6e4;

    const shbg_mol = shbg * 1e-9;

    let ft = totalT_nmol * 1e-9;
    for (let i = 0; i < 20; i++) {
      const denom = 1 + Ka_T_Alb * albumin_mol + Ka_T_SHBG * shbg_mol / (1 + Ka_T_SHBG * ft);
      ft = (totalT_nmol * 1e-9) / denom;
    }

    const ft_ngdl = ft * 1e9 * 28.842;
    return ft_ngdl > 0 ? Math.round(ft_ngdl * 100) / 100 : null;
  },

  // ── Epigenetics ──────────────────────────────────────────────────────────────

  pheno_age: (v, userAge) => {
    const albumin    = get(v, 'albumin');
    const creatinine = get(v, 'creatinine');
    const glucose    = get(v, 'fasting_glucose');
    const crp        = get(v, 'hs_crp');
    const lymphoAbs  = get(v, 'lymphocytes');
    const wbc        = get(v, 'wbc');
    const mcv        = get(v, 'mcv');
    const rdw        = get(v, 'rdw');
    const alp        = get(v, 'alp');

    if (
      albumin === null || creatinine === null || glucose === null ||
      crp === null || lymphoAbs === null || wbc === null || wbc <= 0 ||
      mcv === null || rdw === null || alp === null || !userAge
    ) return null;

    const glucMmol  = glucose / 18.0182;
    const crpMgDl   = crp / 10;
    const lnCrp     = Math.log(Math.max(crpMgDl, 0.001));
    const lymphoPct = (lymphoAbs / wbc) * 100;

    const xb =
      -19.9067
      - 0.0336  * albumin
      + 0.0095  * creatinine
      + 0.1953  * glucMmol
      + 0.0954  * lnCrp
      - 0.0120  * lymphoPct
      + 0.0268  * mcv
      + 0.3306  * rdw
      + 0.00188 * alp
      + 0.0554  * userAge;

    const gamma = 0.0076927;
    const cumulFactor = (Math.exp(120 * gamma) - 1) / gamma;
    const mortalityRisk = 1 - Math.exp(-Math.exp(xb) * cumulFactor);

    if (mortalityRisk <= 0 || mortalityRisk >= 1) return null;

    return 141.50225 + Math.log(-0.00553 * Math.log(1 - mortalityRisk)) / 0.09165;
  },
};

/**
 * Computes all derivable calculated markers from a slug→value map.
 * Already-measured values are never overwritten.
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

// ── Translations & utility ─────────────────────────────────────────────────

export const LANG_NAMES: Record<Lang, string> = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
};

export function getName(obj: Record<string, string> | string | null, lang: string): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj['en'] ?? obj['de'] ?? '';
}

export function fmtDate(iso: string, lang: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(
    lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-GB',
    { month: 'short', year: 'numeric' },
  );
}

export function fmtDateFull(iso: string, lang: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(
    lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
}
