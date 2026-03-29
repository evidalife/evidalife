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

  // Borderline: within 5% outside reference range (narrow margin — clearly out-of-range values should be 'risk')
  const borderlineBuffer = 0.05;
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
    'eGFR CKD-EPI 2009', 'eGFR (CKD-EPI)', 'Estimated GFR', 'estimated GFR',
    'Geschätzte glomeruläre Filtrationsrate', 'geschätzte GFR',
    'GFR estimé', 'filtrazione glomerulare', 'CKD-EPI', 'MDRD',
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
    'alkaline phosphatase', 'alk phos', 'AlkPhos',
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
  homa_ir: [
    'HOMA-IR', 'HOMA IR', 'HOMA Index', 'HOMA', 'HOMA2-IR',
    'Insulin Resistance Index', 'Homeostatic Model Assessment', 'homeostatic model assessment',
  ],

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
    'SHBG', 'Sexualhormon-bindendes Globulin', 'Sex-Hormon-bindendes Globulin',
    'Sex Hormone Binding Globulin', 'Sex hormone binding globulin',
    'Globuline liant les hormones sexuelles', 'globulina legante gli ormoni sessuali',
    'Globulina transportadora de hormonas sexuales',
  ],
  dhea_s: ['DHEA-S', 'DHEAS', 'DHEA-Sulfat', 'DHEA Sulfate'],
  estradiol: ['Östradiol', 'Estradiol', 'E2', 'Estradiol (E2)', 'Œstradiol'],
  igf_1: [
    'IGF-1', 'IGF1', 'IGF 1', 'Insulin-like Growth Factor 1', 'Somatomedin C', 'somatomedin-c',
    'IGF-I', 'insulinähnlicher Wachstumsfaktor', 'facteur de croissance insulinomimétique',
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

  // === BODY COMPOSITION / DEXA ===
  body_fat_pct: [
    'Body Fat Percentage', 'Body Fat %', 'Body Fat', 'Körperfettanteil',
    'Körperfett %', 'Fettanteil', 'Taux de graisse corporelle',
    'Percentuale di grasso corporeo', 'Porcentaje de grasa corporal',
    'BF%', 'Fat Percentage', 'Total Body Fat %',
  ],
  muscle_mass_pct: [
    'Muscle Mass Percentage', 'Muscle Mass %', 'Muscle Mass',
    'Muskelmasse %', 'Muskelmasse', 'Muskelmasseanteil',
    'Masse musculaire', 'Massa muscolare', 'Masa muscular',
    'Lean Body Mass %', 'Skeletal Muscle Mass %',
  ],
  visceral_fat: [
    'Visceral Fat', 'Visceral Fat Index', 'Viszerales Fett',
    'Viszeralfett', 'VAT', 'Visceral Adipose Tissue',
    'Graisse viscérale', 'Grasso viscerale', 'Grasa visceral',
  ],
  bone_density_t_score: [
    'Bone Density T-Score', 'Bone Density', 'T-Score', 'DEXA T-Score',
    'Knochendichte', 'Knochendichte T-Score', 'BMD T-Score',
    'Densité osseuse', 'Densità ossea', 'Densidad ósea',
  ],
  bmi: [
    'BMI', 'Body Mass Index', 'Körpermasseindex', 'KMI',
    'Indice de masse corporelle', 'IMC', 'Indice di massa corporea',
    'Índice de masa corporal',
  ],
  lean_mass: [
    'Lean Mass', 'Lean Body Mass', 'LBM', 'Fettfreie Masse',
    'Masse maigre', 'Massa magra', 'Masa magra',
    'Total Lean Mass', 'Lean Tissue Mass',
  ],
  fat_mass: [
    'Fat Mass', 'Total Fat Mass', 'Fettmasse', 'Gesamtfettmasse',
    'Masse grasse', 'Massa grassa', 'Masa grasa',
  ],
  bone_mineral_content: [
    'Bone Mineral Content', 'BMC', 'Knochenmineralgehalt',
    'Contenu minéral osseux', 'Contenuto minerale osseo',
    'Contenido mineral óseo', 'Total BMC',
  ],
  trunk_fat_pct: [
    'Trunk Fat', 'Trunk Fat %', 'Trunk Fat Percentage',
    'Rumpffett', 'Rumpffett %', 'Graisse du tronc',
    'Grasso del tronco', 'Grasa del tronco',
  ],
  arms_fat_pct: [
    'Arms Fat', 'Arms Fat %', 'Arms Fat Percentage', 'Arm Fat',
    'Armfett', 'Armfett %', 'Graisse des bras',
    'Grasso delle braccia', 'Grasa de brazos',
  ],
  legs_fat_pct: [
    'Legs Fat', 'Legs Fat %', 'Legs Fat Percentage', 'Leg Fat',
    'Beinfett', 'Beinfett %', 'Graisse des jambes',
    'Grasso delle gambe', 'Grasa de piernas',
  ],
  android_gynoid_ratio: [
    'Android/Gynoid Ratio', 'A/G Ratio', 'Android Gynoid Ratio',
    'Android-Gynoid-Verhältnis', 'Rapport androïde/gynoïde',
    'Rapporto androide/ginoide', 'Relación androide/ginoide',
  ],

  // === FITNESS / CARDIO ===
  vo2max: [
    'VO2max', 'VO2max (relative)', 'VO2 max', 'VO₂max', 'VO₂max (relativ)',
    'Maximale Sauerstoffaufnahme', 'VO2 Max relativ',
    'Consommation maximale d\'oxygène', 'Consumo massimo di ossigeno',
  ],
  vo2max_absolute: [
    'VO2max (absolute)', 'VO2max absolute', 'VO2max abs', 'VO₂max (absolut)',
    'VO2 Max absolut', 'Absolute VO2max',
  ],
  vt1: [
    'VT1', 'VT1 (Aerobic Threshold)', 'VT1 (Aerobe Schwelle)',
    'Aerobic Threshold', 'Aerobe Schwelle', 'First Ventilatory Threshold',
    'Erste ventilatorische Schwelle', 'Seuil aérobie',
  ],
  vt1_heart_rate: [
    'VT1 Heart Rate', 'VT1 HR', 'VT1 Herzfrequenz',
    'Heart Rate at VT1', 'Herzfrequenz bei VT1',
    'Fréquence cardiaque VT1', 'FC VT1',
  ],
  vt2: [
    'VT2', 'VT2 (Anaerobic Threshold)', 'VT2 (Anaerobe Schwelle)',
    'Anaerobic Threshold', 'Anaerobe Schwelle', 'Second Ventilatory Threshold',
    'Zweite ventilatorische Schwelle', 'Seuil anaérobie',
  ],
  vt2_heart_rate: [
    'VT2 Heart Rate', 'VT2 HR', 'VT2 Herzfrequenz',
    'Heart Rate at VT2', 'Herzfrequenz bei VT2',
    'Fréquence cardiaque VT2', 'FC VT2',
  ],
  resting_heart_rate: [
    'Resting Heart Rate', 'Ruheherzfrequenz', 'Ruhe-HF', 'Ruhe HR',
    'RHR', 'Rest HR', 'Fréquence cardiaque au repos',
    'Frequenza cardiaca a riposo', 'Frecuencia cardíaca en reposo',
  ],
  max_heart_rate: [
    'Maximum Heart Rate', 'Max Heart Rate', 'HRmax', 'HR max',
    'Maximale Herzfrequenz', 'Max. HF', 'Maximal HR',
    'Fréquence cardiaque maximale', 'FC max',
    'Frequenza cardiaca massima', 'Frecuencia cardíaca máxima',
  ],
  hrv: [
    'Heart Rate Variability', 'HRV', 'Herzfrequenzvariabilität',
    'Variabilité de la fréquence cardiaque', 'Variabilità della frequenza cardiaca',
    'Variabilidad de la frecuencia cardíaca', 'RMSSD', 'SDNN',
  ],
  max_power_output: [
    'Max Power Output', 'Maximum Power Output', 'Peak Power', 'Pmax',
    'Maximale Leistung', 'Max. Leistung', 'Spitzenleistung',
    'Puissance maximale', 'Potenza massima', 'Potencia máxima',
  ],
  rer_peak: [
    'RER at Peak', 'RER', 'RER peak', 'Peak RER',
    'Respiratory Exchange Ratio', 'Respiratorischer Quotient',
    'Quotient respiratoire', 'Quoziente respiratorio', 'Cociente respiratorio',
  ],
  spo2: [
    'SpO2', 'SpO₂', 'SpO2 at Rest', 'SpO₂ at Rest', 'Oxygen Saturation',
    'Sauerstoffsättigung', 'Saturation en oxygène', 'O2 Sat', 'O2-Sättigung',
    'Saturazione di ossigeno', 'Saturación de oxígeno',
  ],
  spo2_peak: [
    'SpO2 at Peak', 'SpO₂ at Peak', 'SpO2 peak', 'SpO₂ peak',
    'SpO2 bei Spitzenbelastung', 'Oxygen Saturation at Peak',
    'Sauerstoffsättigung bei Belastung',
  ],

  // === EPIGENETICS / AGING ===
  grim_age_v2: [
    'GrimAge', 'GrimAge v2', 'GrimAge2', 'Grim Age', 'Grim Age v2',
    'GrimAge Version 2', 'Biological Age (GrimAge)',
  ],
  dunedin_pace: [
    'DunedinPACE', 'Dunedin PACE', 'DunedinPace', 'PACE',
    'Pace of Aging', 'DunedinPoAm',
  ],
  // === OTHER ===
  omega_3_index: [
    'Omega-3 Index', 'Omega-3-Index', 'Omega 3 Index', 'Omega-3', 'EPA+DHA', 'EPA+DHA%',
    'omega-3 fatty acids', 'Omega-3-Fettsäuren', 'HS-Omega-3 Index', 'Índice Omega-3',
  ],
  iodine_urine: [
    'Jod', 'Jod (Urin)', 'Iodine', 'Iode', 'Iodio', 'Iod im Urin',
    'Yodo', 'Yodo en orina',
  ],

  // === CALCULATED (some labs do report these) ===
  non_hdl_c: [
    'Non-HDL', 'Non-HDL-C', 'Non-HDL Cholesterin', 'Nicht-HDL',
    'nicht-HDL Cholesterin', 'Non-HDL cholestérol', 'colesterolo non-HDL',
  ],
  tsat: [
    'TSAT', 'TS%', 'Transferrin-Sättigung', 'Transferrinsättigung',
    'transferrin saturation', 'saturation de la transferrine',
    'saturazione della transferrina', 'iron saturation',
  ],
};

// Markers computed by Evidalife — must never be extracted from lab PDF reports.
// (egfr, non_hdl_c, tsat, homa_ir are exceptions — some labs do report them.)
export const CALCULATED_SKIP_IMPORT = new Set([
  'aip',
  'tg_hdl_ratio',
  'castelli_i',
  'castelli_ii',
  'mean_arterial_pressure',
  'pulse_pressure',
  'nlr',
  'lmr',
  'plr',
  'sii',
  'fib4_score',
  'de_ritis_ratio',
  'wht_ratio',
  'homa_beta',
  'pheno_age',
  'chronological_age',
  'age_difference',
]);

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
  if (slugMatch) {
    if (CALCULATED_SKIP_IMPORT.has(slugMatch.slug)) return null;
    return { biomarker: slugMatch, confidence: 'exact' };
  }

  // 2. Exact name match in any of 5 languages
  for (const b of biomarkers) {
    if (!b.name) continue;
    for (const lang of ['de', 'en', 'es', 'fr', 'it'] as const) {
      const langName = norm((b.name as Record<string, string>)[lang] ?? '');
      if (langName && langName === n) {
        if (CALCULATED_SKIP_IMPORT.has(b.slug)) return null;
        return { biomarker: b, confidence: 'exact' };
      }
    }
  }

  // 3. Alias exact match (case-insensitive, after normalisation)
  for (const [slug, aliases] of Object.entries(BIOMARKER_ALIASES)) {
    for (const alias of aliases) {
      if (norm(alias) === n) {
        const bm = biomarkers.find((b) => b.slug === slug);
        if (bm) {
          if (CALCULATED_SKIP_IMPORT.has(bm.slug)) return null;
          return { biomarker: bm, confidence: 'alias' };
        }
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
          if (bm) {
            if (CALCULATED_SKIP_IMPORT.has(bm.slug)) return null;
            return { biomarker: bm, confidence: 'fuzzy' };
          }
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
