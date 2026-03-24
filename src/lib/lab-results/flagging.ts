// src/lib/lab-results/flagging.ts
// ============================================================
// Auto-flagging, plausibility checks, and biomarker aliases
// ============================================================

export type StatusFlag = 'optimal' | 'good' | 'moderate' | 'risk';

export interface BiomarkerRanges {
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  range_type: 'range' | 'lower_is_better' | 'higher_is_better' | null;
}

// ─── Auto-flag calculation ────────────────────────────────────────────────────

export function computeStatusFlag(value: number, ranges: BiomarkerRanges): StatusFlag {
  const {
    ref_range_low: rl, ref_range_high: rh,
    optimal_range_low: ol, optimal_range_high: oh,
    range_type,
  } = ranges;

  // Check optimal first
  const inOptimal = (
    (ol == null || value >= ol) &&
    (oh == null || value <= oh)
  );

  if (inOptimal && (ol != null || oh != null)) return 'optimal';

  // Check within reference range
  const inRef = (
    (rl == null || value >= rl) &&
    (rh == null || value <= rh)
  );

  if (inRef) return 'good';

  // Borderline: within 20% outside reference range
  const borderlineBuffer = 0.20;
  const refLowBuffer = rl != null ? rl * (1 - borderlineBuffer) : null;
  const refHighBuffer = rh != null ? rh * (1 + borderlineBuffer) : null;
  const inBorderline = (
    (refLowBuffer == null || value >= refLowBuffer) &&
    (refHighBuffer == null || value <= refHighBuffer)
  );

  if (inBorderline && (rl != null || rh != null)) return 'moderate';

  return 'risk';
}

// ─── Plausibility ranges (absolute physiological limits) ─────────────────────

export const PLAUSIBILITY_RANGES: Record<string, { min: number; max: number }> = {
  'HbA1c': { min: 2, max: 20 },
  'Fasting Glucose': { min: 10, max: 800 },
  'Total Cholesterol': { min: 50, max: 600 },
  'LDL Cholesterol': { min: 10, max: 500 },
  'HDL Cholesterol': { min: 5, max: 150 },
  'Triglycerides': { min: 10, max: 2000 },
  'ApoB': { min: 10, max: 300 },
  'Lp(a)': { min: 0, max: 500 },
  'hs-CRP': { min: 0, max: 200 },
  'Homocysteine': { min: 1, max: 100 },
  'Ferritin': { min: 1, max: 5000 },
  'Vitamin D': { min: 1, max: 200 },
  '25-OH-Vitamin D': { min: 1, max: 200 },
  'Vitamin B12': { min: 50, max: 5000 },
  'TSH': { min: 0.01, max: 100 },
  'fT3': { min: 0.5, max: 20 },
  'fT4': { min: 0.1, max: 10 },
  'Testosterone Total': { min: 0.1, max: 50 },
  'eGFR': { min: 5, max: 200 },
  'Creatinine': { min: 0.1, max: 20 },
  'GGT': { min: 1, max: 2000 },
  'ALT': { min: 1, max: 2000 },
  'AST': { min: 1, max: 2000 },
  'Uric Acid': { min: 0.5, max: 20 },
  'Hemoglobin': { min: 3, max: 25 },
  'Fasting Insulin': { min: 0.1, max: 500 },
  'IGF-1': { min: 10, max: 1000 },
  'Omega-3 Index': { min: 1, max: 20 },
  'Magnesium': { min: 0.1, max: 5 },
  'Selenium': { min: 10, max: 500 },
};

export function checkPlausibility(
  value: number,
  biomarkerName: string,
  ranges: BiomarkerRanges,
): { plausible: boolean; message?: string } {
  // Check against known absolute limits
  const limits = PLAUSIBILITY_RANGES[biomarkerName];
  if (limits) {
    if (value < limits.min || value > limits.max) {
      return {
        plausible: false,
        message: `Value ${value} is outside physiological range (${limits.min}–${limits.max}) for ${biomarkerName}. Please verify.`,
      };
    }
  }

  // Check ref range heuristic (10x rule)
  if (ranges.ref_range_high && value > ranges.ref_range_high * 10) {
    return {
      plausible: false,
      message: `Value ${value} seems implausible — more than 10× the reference high (${ranges.ref_range_high}). Please verify.`,
    };
  }
  if (ranges.ref_range_low && ranges.ref_range_low > 0 && value < ranges.ref_range_low / 10) {
    return {
      plausible: false,
      message: `Value ${value} seems implausible — less than 1/10th of the reference low (${ranges.ref_range_low}). Please verify.`,
    };
  }

  return { plausible: true };
}

// ─── Biomarker aliases for PDF extraction matching ────────────────────────────

export const BIOMARKER_ALIASES: Record<string, string[]> = {
  'Apolipoprotein B': ['ApoB', 'Apo B', 'Apolipoprotein-B'],
  'HbA1c': ['Glycated Hemoglobin', 'Glycosylated Hemoglobin', 'Hämoglobin A1c', 'HbA1C', 'A1c'],
  'hs-CRP': ['CRP', 'C-Reactive Protein', 'C-reaktives Protein', 'hsCRP', 'High-sensitivity CRP'],
  '25-OH-Vitamin D': ['Vitamin D', 'Vitamin D3', '25-Hydroxyvitamin D', 'Calcidiol', '25(OH)D'],
  'Vitamin B12': ['Cobalamin', 'B12', 'Cyanocobalamin'],
  'Fasting Glucose': ['Glucose', 'Nüchternglukose', 'Blutzucker', 'Blood Sugar', 'Glukose'],
  'Fasting Insulin': ['Insulin', 'Nüchterninsulin', 'Insuline'],
  'Total Cholesterol': ['Cholesterol', 'Cholesterin', 'Gesamtcholesterin'],
  'LDL Cholesterol': ['LDL', 'LDL-C', 'LDL-Cholesterin', 'Low Density Lipoprotein'],
  'HDL Cholesterol': ['HDL', 'HDL-C', 'HDL-Cholesterin', 'High Density Lipoprotein'],
  'Triglycerides': ['Triglyceride', 'Triglyzeride', 'TG'],
  'TSH': ['Thyroid Stimulating Hormone', 'Thyreotropin', 'Thyrotropin'],
  'fT3': ['Free T3', 'Freies T3', 'Triiodothyronine'],
  'fT4': ['Free T4', 'Freies T4', 'Thyroxine'],
  'Ferritin': ['Serum Ferritin', 'Ferritine'],
  'Hemoglobin': ['Hb', 'Hämoglobin', 'Haemoglobin'],
  'Creatinine': ['Kreatinin', 'Créatinine'],
  'eGFR': ['GFR', 'Glomerular Filtration Rate', 'Glomeruläre Filtrationsrate'],
  'GGT': ['Gamma-GT', 'Gamma-Glutamyltransferase', 'γ-GT'],
  'ALT': ['GPT', 'ALAT', 'Alanine Aminotransferase'],
  'AST': ['GOT', 'ASAT', 'Aspartate Aminotransferase'],
  'Uric Acid': ['Harnsäure', 'Acide urique', 'Urate'],
  'Homocysteine': ['Homocystein', 'Homocystéine'],
  'Selenium': ['Selen', 'Sélénium', 'Se'],
  'Magnesium': ['Mg', 'Magnésium'],
  'IGF-1': ['Insulin-like Growth Factor 1', 'Somatomedin C'],
  'Testosterone Total': ['Testosteron', 'Total Testosterone', 'Testostérone'],
  'Lp(a)': ['Lipoprotein(a)', 'Lipoprotein a', 'Lp a'],
  'Omega-3 Index': ['Omega-3', 'Omega 3 Index', 'EPA+DHA'],
  'HOMA-IR': ['HOMA', 'Homeostatic Model Assessment'],
  'ApoB': ['Apolipoprotein B', 'Apo B', 'Apolipoprotein-B'],
};

// Build reverse lookup: alias → canonical name
export function buildAliasLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(BIOMARKER_ALIASES)) {
    lookup.set(canonical.toLowerCase(), canonical);
    for (const alias of aliases) {
      lookup.set(alias.toLowerCase(), canonical);
    }
  }
  return lookup;
}

export function matchBiomarkerName(
  extractedName: string,
  dbBiomarkers: { id: string; name_en: string }[],
): { id: string; name: string; confidence: number } | null {
  const aliasLookup = buildAliasLookup();
  const extracted = extractedName.toLowerCase().trim();

  // Exact match on DB name
  for (const bm of dbBiomarkers) {
    if (bm.name_en.toLowerCase() === extracted) {
      return { id: bm.id, name: bm.name_en, confidence: 1.0 };
    }
  }

  // Alias match → canonical name → DB name
  const canonical = aliasLookup.get(extracted);
  if (canonical) {
    for (const bm of dbBiomarkers) {
      if (bm.name_en.toLowerCase() === canonical.toLowerCase()) {
        return { id: bm.id, name: bm.name_en, confidence: 0.9 };
      }
    }
  }

  // Partial contains match
  for (const bm of dbBiomarkers) {
    const dbName = bm.name_en.toLowerCase();
    if (dbName.includes(extracted) || extracted.includes(dbName)) {
      return { id: bm.id, name: bm.name_en, confidence: 0.7 };
    }
  }

  return null;
}

// ─── Flag display helpers ─────────────────────────────────────────────────────

export const FLAG_LABEL: Record<StatusFlag, string> = {
  optimal:  'Optimal',
  good:     'Normal',
  moderate: 'Borderline',
  risk:     'Out of Range',
};

export const FLAG_COLOR_CLASS: Record<StatusFlag, string> = {
  optimal:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  good:     'bg-[#CEAB84]/15 text-[#8a6a30] ring-[#CEAB84]/30',
  moderate: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  risk:     'bg-red-50 text-red-700 ring-red-600/20',
};

export const FLAG_DOT_COLOR: Record<StatusFlag, string> = {
  optimal:  '#0C9C6C',
  good:     '#C4A96A',
  moderate: '#ef9f27',
  risk:     '#E24B4A',
};
