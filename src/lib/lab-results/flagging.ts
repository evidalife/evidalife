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
// Keys are DB slugs; values include all lab-reported names in DE/FR/IT/EN
// and common abbreviations used by Swiss/German/EU labs.

export const BIOMARKER_ALIASES: Record<string, string[]> = {
  // === HEMATOLOGY ===
  hemoglobin: [
    'Hämoglobin', 'Hb', 'Hemoglobin', 'Hémoglobine', 'Emoglobina',
    'Haemoglobin', 'Hgb', 'Hemoglobina',
  ],
  hematocrit: [
    'Hämatokrit', 'Hkt', 'Hct', 'Hématocrite', 'Ematocrito', 'PCV',
    'Hematocrito',
  ],
  rbc: [
    'Erythrozyten', 'Red Blood Cells', 'Érythrocytes', 'Eritrociti',
    'Rote Blutkörperchen', 'RBC', 'Erythrocytes',
    'Glóbulos rojos', 'Eritrocitos',
  ],
  wbc: [
    'Leukozyten', 'White Blood Cells', 'Leucocytes', 'Leucociti',
    'Weisse Blutkörperchen', 'Weisse Blutzellen', 'WBC',
    'Glóbulos blancos', 'Leucocitos',
  ],
  platelets: [
    'Thrombozyten', 'Plättchen', 'Plaquettes', 'Piastrine', 'PLT',
    'Thrombocytes', 'Plaquetas', 'Trombocitos',
  ],
  mcv: ['MCV', 'Mittleres Zellvolumen', 'VGM', 'Volume Globulaire Moyen'],
  mch: ['MCH', 'Mittleres Zellhämoglobin', 'TCMH'],
  mchc: ['MCHC'],
  rdw: [
    'RDW', 'RDW-CV', 'RDW-SD', 'Erythrozytenverteilungsbreite', 'IDR',
    'Erythrocyte Distribution Width',
  ],
  neutrophils: [
    'Neutrophile', 'Neutrophile %', 'Neutrophils', 'Neutrophiles',
    'Segmentkernige', 'Granulozyten', 'NEUT', 'Neutrófilos',
  ],
  lymphocytes: [
    'Lymphozyten', 'Lymphozyten %', 'Lymphocytes', 'Linfociti', 'LYMPH',
    'Linfocitos',
  ],
  monocytes: [
    'Monozyten', 'Monozyten %', 'Monocytes', 'Monociti', 'MONO',
    'Monocitos',
  ],
  eosinophils: [
    'Eosinophile', 'Eosinophile %', 'Éosinophiles', 'Eosinofili', 'EOS',
    'Eosinófilos',
  ],
  basophils: [
    'Basophile', 'Basophile %', 'Basophiles', 'Basofili', 'BASO',
    'Basófilos',
  ],

  // === ELECTROLYTES & MINERALS ===
  potassium: [
    'Kalium', 'Kalium (WI)', 'Potassium', 'Potassio', 'K', 'K+',
    'Potasio',
  ],
  sodium: [
    'Natrium', 'Natrium (WI)', 'Sodium', 'Sodio', 'Na', 'Na+',
  ],
  calcium: [
    'Calcium', 'Calcium (WI)', 'Kalzium', 'Calcio', 'Ca',
  ],
  magnesium: ['Magnesium', 'Mg', 'Magnésium', 'Magnesio'],
  phosphate: [
    'Phosphat', 'Phosphate', 'Phosphor', 'Fosfato', 'Phosphore', 'P',
    'Fósforo',
  ],
  chloride: [
    'Chlorid', 'Chloride', 'Chlorure', 'Cloruro', 'Cl', 'Cl-',
    'Cloruro',
  ],
  zinc: ['Zink', 'Zinc', 'Zinco', 'Zn', 'Cinc'],
  selenium: ['Selen', 'Selenium', 'Sélénium', 'Selenio', 'Se'],

  // === KIDNEY ===
  creatinine: [
    'Kreatinin', 'Kreatinin (WI)', 'Creatinine', 'Créatinine', 'Creatinina',
  ],
  egfr: [
    'eGFR', 'eGFR CKD-EPI', 'GFR', 'Glomeruläre Filtrationsrate',
    'eGFR CKD-EPI 2009', 'eGFR (CKD-EPI)', 'Estimated GFR',
    'Geschätzte glomeruläre Filtrationsrate',
    'Tasa de filtración glomerular', 'TFG estimada',
  ],
  uric_acid: [
    'Harnsäure', 'Harnsäure (WI)', 'Uric Acid', 'Acide urique',
    'Acido urico', 'Urate', 'Ácido úrico',
  ],

  // === LIVER ===
  alt: [
    'GPT (ALAT)', 'GPT', 'ALAT', 'ALT', 'GPT (ALAT) (WI)',
    'Alanine Aminotransferase', 'Alanin-Aminotransferase',
    'ALAT (GPT)', 'GPT/ALAT', 'Transaminasa GPT',
  ],
  ast: [
    'GOT (ASAT)', 'GOT', 'ASAT', 'AST', 'GOT (ASAT) (WI)',
    'Aspartate Aminotransferase', 'Aspartat-Aminotransferase',
    'ASAT (GOT)', 'GOT/ASAT', 'Transaminasa GOT',
  ],
  ggt: [
    'GGT', 'Gamma-GT', 'GGT (Gamma-glut.-transf.)', 'γ-GT',
    'Gamma-Glutamyltransferase', 'Gamma-Glutamyl-Transferase', 'Gamma-GT',
  ],
  alp: [
    'Alkalische Phosphatase', 'AP', 'ALP', 'Phosphatase alcaline',
    'Fosfatasi alcalina', 'Alk. Phosphatase', 'Fosfatasa alcalina',
  ],
  ldh: [
    'LDH', 'Laktatdehydrogenase', 'Lactate Déshydrogénase',
    'Lattato Deidrogenasi', 'Lactate Dehydrogenase', 'Lactato Deshidrogenasa',
  ],
  ck: [
    'CK', 'Kreatinkinase', 'Créatine Kinase', 'Creatina Chinasi',
    'Creatine Kinase', 'CPK', 'Creatina Quinasa',
  ],
  albumin: ['Albumin', 'Albumine', 'Albumina', 'Albúmina'],
  bilirubin_total: [
    'Bilirubin', 'Bilirubin gesamt', 'Bilirubine', 'Bilirubina',
    'Total Bilirubin', 'Gesamtbilirubin', 'Bilirubin total',
    'Bilirrubina total',
  ],

  // === GLUCOSE / DIABETES ===
  fasting_glucose: [
    'Glukose nüchtern', 'Glukose', 'Glucose', 'Nüchternglukose',
    'Glycémie', 'Glicemia', 'Blutzucker', 'Nüchternblutzucker',
    'Fasting Glucose', 'Glukose (WI)',
    'Glucosa en ayunas', 'Glucemia', 'Glucosa',
  ],
  hba1c: [
    'HbA1c', 'HbA1c DCCT', 'HbA1c NGSP', 'Glykiertes Hämoglobin',
    'Hémoglobine glyquée', 'Glycated Haemoglobin', 'A1c',
    'Hemoglobina glicosilada', 'Hemoglobina glucosilada',
  ],
  fasting_insulin: [
    'Nüchterninsulin', 'Insulin nüchtern', 'Fasting Insulin',
    'Insuline à jeun', 'Insulina', 'Insulin', 'Insulina en ayunas',
  ],
  homa_ir: ['HOMA-IR', 'HOMA Index', 'HOMA', 'Homeostatic Model Assessment'],

  // === LIPIDS ===
  total_cholesterol: [
    'Cholesterin', 'Cholesterin (WI)', 'Total Cholesterol', 'Cholestérol',
    'Colesterolo', 'Gesamtcholesterin', 'Cholesterol',
    'Colesterol total',
  ],
  hdl_cholesterol: [
    'HDL-Cholesterin', 'HDL', 'HDL-C', 'Cholestérol HDL',
    'Colesterolo HDL', 'HDL Cholesterol', 'Colesterol HDL',
  ],
  ldl_cholesterol: [
    'LDL-Cholesterin', 'LDL', 'LDL-C', 'LDL-Cholesterin (berechnet)',
    'Cholestérol LDL', 'Colesterolo LDL', 'LDL Cholesterol',
    'Colesterol LDL',
  ],
  triglycerides: [
    'Triglyceride', 'Triglyceride (WI)', 'Triglycérides', 'Trigliceridi',
    'TG', 'Triglyzeriden', 'Triglyzeride', 'Triglicéridos',
  ],
  apob: [
    'ApoB', 'Apolipoprotein B', 'Apo B', 'Apolipoprotein-B',
    'Apolipoprotéine B', 'Apolipoproteína B',
  ],
  lpa: [
    'Lp(a)', 'Lipoprotein(a)', 'Lp a', 'Lipoprotéine(a)', 'Lipoprotein a',
    'Lipoproteína(a)',
  ],

  // === THYROID ===
  tsh: [
    'TSH', 'TSH basal', 'Thyreotropin', 'Thyroid Stimulating Hormone',
    'Thyrotropin', 'Tirotropina',
  ],
  ft3: [
    'fT3', 'freies T3', 'Free T3', 'T3 libre', 'T3 libera',
    'Freies Trijodthyronin', 'Freies Triiodthyronin', 'T3 libre',
  ],
  ft4: [
    'fT4', 'freies T4', 'Free T4', 'T4 libre', 'T4 libera',
    'Thyroxin frei', 'Freies Thyroxin', 'T4 libre',
  ],

  // === HORMONES ===
  testosterone_total: [
    'Testosteron total', 'Testosterone', 'Testostérone',
    'Testosterone totale', 'Total Testosterone', 'Testosteron',
    'Testosterona total', 'Testosterona',
  ],
  testosterone_free: [
    'Freies Testosteron', 'Free Testosterone', 'Testostérone libre',
    'Testosterone libero', 'Testosterona libre',
  ],
  shbg: [
    'SHBG', 'Sexualhormon-bindendes Globulin',
    'Sex Hormone Binding Globulin', 'Globuline liant les hormones sexuelles',
    'Globulina transportadora de hormonas sexuales',
  ],
  dhea_s: ['DHEA-S', 'DHEAS', 'DHEA-Sulfat', 'DHEA Sulfate'],
  estradiol: ['Östradiol', 'Estradiol', 'E2', 'Estradiol (E2)', 'Œstradiol'],
  igf_1: [
    'IGF-1', 'IGF1', 'Insulin-like Growth Factor 1', 'Somatomedin C', 'IGF-I',
    'Factor de crecimiento insulínico tipo 1',
  ],
  cortisol: ['Cortisol', 'Kortisol', 'Hydrocortisone'],

  // === VITAMINS ===
  vitamin_d: [
    '25-Hydroxy-Vitamin D', 'Vitamin D', '25-OH-Vitamin D',
    '25-OH Vitamin D3', 'Vitamine D', 'Vitamina D',
    '25(OH)D', '25-Hydroxyvitamin D', 'Calcidiol',
    '25-OH-Vit. D', 'Vitamin D3',
  ],
  vitamin_b12: [
    'Vitamin B12', 'Cobalamin', 'Vitamine B12', 'Vitamina B12',
    'B12', 'Cyanocobalamin',
  ],
  vitamin_b6: [
    'Vitamin B6', 'Pyridoxal-5-Phosphat', 'Vitamine B6',
    'Vitamina B6', 'Pyridoxine',
  ],
  folate_b9: [
    'Folsäure', 'Folsäure in Erythrozyten', 'Folate', 'Folat',
    'Acide folique', 'Acido folico', 'Vitamin B9', 'Folic Acid',
    'Ácido fólico', 'Folato',
  ],

  // === IRON ===
  ferritin: [
    'Ferritin', 'Ferritin (Roche)', 'Ferritin (WI)', 'Ferritine', 'Ferritina',
  ],
  iron_serum: [
    'Eisen', 'Eisen (WI)', 'Iron', 'Fer', 'Ferro', 'Fe', 'Serumeisen',
    'Hierro sérico', 'Hierro',
  ],
  transferrin: ['Transferrin', 'Transferrine', 'Transferrina'],

  // === INFLAMMATION ===
  hs_crp: [
    'hs-CRP', 'CRP', 'C-reaktives Protein', 'Protéine C réactive',
    'hsCRP', 'CRP ultrasensibel', 'C-Reactive Protein',
    'C-reaktives Protein (ultrasensitiv)', 'hsCRP (ultrasensitiv)',
    'Proteína C reactiva', 'PCR ultrasensible',
  ],
  homocysteine: [
    'Homocystein', 'Homocysteine', 'Homocystéine', 'Omocisteina',
    'Homocisteína',
  ],

  // === OTHER ===
  omega_3_index: [
    'Omega-3 Index', 'Omega-3-Index', 'Omega-3', 'EPA+DHA',
    'Índice Omega-3',
  ],
  iodine_urine: [
    'Jod', 'Jod (Urin)', 'Iodine', 'Iode', 'Iodio', 'Iod im Urin',
    'Yodo', 'Yodo en orina',
  ],
};

// ─── Biomarker name matching ──────────────────────────────────────────────────

type MatchedBiomarker = {
  id: string;
  slug: string;
  name: Record<string, string> | null;
  unit: string | null;
  [key: string]: unknown;
};

/**
 * Match a lab-extracted name to a DB biomarker using 4-tier matching:
 * 1. Slug (exact)
 * 2. Name in any of 5 languages (exact)
 * 3. BIOMARKER_ALIASES (case-insensitive)
 * 4. Fuzzy stripped alphanumeric prefix match
 */
export function matchBiomarkerName(
  extractedName: string,
  biomarkers: MatchedBiomarker[],
): { biomarker: MatchedBiomarker; confidence: 'exact' | 'alias' | 'fuzzy' } | null {
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/\s*\(wi\)\s*/gi, '')
      .replace(/\s*\(roche\)\s*/gi, '')
      .replace(/\s*\(berechnet\)\s*/gi, '')
      .replace(/\s*\(e\)\s*/gi, '')
      .replace(/\s+%\s*$/, '')
      .trim();

  const n = norm(extractedName);
  if (!n) return null;

  // 1. Slug match
  const slugCandidate = n.replace(/[\s\-]/g, '_').replace(/[^a-z0-9_]/g, '');
  const slugMatch = biomarkers.find((b) => b.slug === slugCandidate);
  if (slugMatch) return { biomarker: slugMatch, confidence: 'exact' };

  // 2. Exact name match in any of 5 languages
  for (const b of biomarkers) {
    if (!b.name) continue;
    for (const lang of ['de', 'en', 'es', 'fr', 'it'] as const) {
      const langName = norm((b.name as Record<string, string>)[lang] ?? '');
      if (langName && langName === n) return { biomarker: b, confidence: 'exact' };
    }
  }

  // 3. Alias exact match (case-insensitive, after normalisation)
  for (const [slug, aliases] of Object.entries(BIOMARKER_ALIASES)) {
    for (const alias of aliases) {
      if (norm(alias) === n) {
        const bm = biomarkers.find((b) => b.slug === slug);
        if (bm) return { biomarker: bm, confidence: 'alias' };
      }
    }
  }

  // 4. Fuzzy: strip to alphanumeric and check prefix/equality (min length 4)
  const stripped = n.replace(/[^a-z0-9äöüéèàùâêîôûñ]/gi, '').toLowerCase();
  if (stripped.length >= 4) {
    for (const [slug, aliases] of Object.entries(BIOMARKER_ALIASES)) {
      for (const alias of aliases) {
        const a = norm(alias).replace(/[^a-z0-9äöüéèàùâêîôûñ]/gi, '').toLowerCase();
        if (a.length >= 4 && (stripped === a || stripped.startsWith(a) || a.startsWith(stripped))) {
          const bm = biomarkers.find((b) => b.slug === slug);
          if (bm) return { biomarker: bm, confidence: 'fuzzy' };
        }
      }
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
