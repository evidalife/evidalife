// ── Health Engine 2.0 — Shared Types ────────────────────────────────────────
// Used by both the API route and client components.

export type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
export type MarkerStatus = 'optimal' | 'good' | 'borderline' | 'risk';

// ── Slide types ─────────────────────────────────────────────────────────────

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

// ── Slide data discriminated union ──────────────────────────────────────────

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
  // Progress data (matches health engine dashboard)
  borderlineMarkers: string[];   // names of borderline/risk markers
  improvedMarkers: string[];     // names of improved markers
  totalMarkers: number;
  // Summary cards
  firstScore: number | null;     // earliest meaningful longevity score
  progressLabel: string;         // e.g. "44-Month"
  // Bio age progress (for summary card)
  firstBioAgeDiff: number | null;  // earliest avg bio age diff from chrono
  latestBioAgeDiff: number | null; // latest avg bio age diff from chrono
}

export interface BioAgeScoreData {
  type: 'bio_age_score';
  bioAgeScore: number;         // epigenetics domain score
  chronAge: number;
  phenoAge: number | null;
  grimAge: number | null;
  dunedinPace: number | null;
  ageDiff: number;             // avg bio age - chronAge (negative = younger)
  avgBioAge: number | null;    // average bio age across clocks
  clockCount: number;          // number of active clocks
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
  markers: MarkerDetail[];        // ALL markers with full detail (trend, ranges, delta)
  criticalMarkers: MarkerDetail[]; // score < 55 — these get zoom cards
  exceptionalMarkers: MarkerDetail[]; // score >= 90 — brief highlight
  domainTrend: { date: string; score: number }[]; // domain score over time
}

export interface ClosingData {
  type: 'closing';
  score: number;
  improvements: string[];
  nextSteps: string[];
  totalMarkers: number;
  totalDomains: number;
}

// ── Marker types ────────────────────────────────────────────────────────────

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

// ── Bio age ─────────────────────────────────────────────────────────────────

export interface BioAge {
  phenoAge: number | null;
  grimAge: number | null;
  dunedinPace: number | null;
  chronAge: number;
}

// ── Study citation ──────────────────────────────────────────────────────────

export interface StudyCitation {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  keyFinding: string;
  url: string;
}

// ── API request/response ────────────────────────────────────────────────────

export interface BriefingV2Request {
  lang?: string;
}

export interface BriefingV2Response {
  slides: BriefingSlide[];
  cached: boolean;
  briefingId?: string;   // health_briefings.id — used for Q&A tracking
}

// ── Domain configuration ────────────────────────────────────────────────────

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

// ── Scoring helpers (copied from HealthEngineDashboard — single source of truth) ─

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

// ── Translations ────────────────────────────────────────────────────────────

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
