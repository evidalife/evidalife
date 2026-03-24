export const BIOMARKER_UNITS = [
  // Concentration – mass
  { value: 'mg/dL',       label: 'mg/dL',       category: 'Concentration' },
  { value: 'g/dL',        label: 'g/dL',        category: 'Concentration' },
  { value: 'g/L',         label: 'g/L',         category: 'Concentration' },
  { value: 'ng/mL',       label: 'ng/mL',       category: 'Concentration' },
  { value: 'pg/mL',       label: 'pg/mL',       category: 'Concentration' },
  { value: 'µg/L',        label: 'µg/L',        category: 'Concentration' },
  { value: 'µg/dL',       label: 'µg/dL',       category: 'Concentration' },
  // Molar (SI – preferred in Swiss/EU labs)
  { value: 'mmol/L',      label: 'mmol/L',      category: 'Molar (SI)' },
  { value: 'µmol/L',      label: 'µmol/L',      category: 'Molar (SI)' },
  { value: 'nmol/L',      label: 'nmol/L',      category: 'Molar (SI)' },
  { value: 'pmol/L',      label: 'pmol/L',      category: 'Molar (SI)' },
  // Enzyme / Activity
  { value: 'U/L',         label: 'U/L',         category: 'Enzyme' },
  { value: 'IU/L',        label: 'IU/L',        category: 'Enzyme' },
  { value: 'µU/mL',       label: 'µU/mL',       category: 'Enzyme' },
  { value: 'mIU/L',       label: 'mIU/L',       category: 'Enzyme' },
  // Ratio / Dimensionless
  { value: '%',           label: '%',           category: 'Ratio' },
  { value: 'ratio',       label: 'ratio',       category: 'Ratio' },
  { value: 'index',       label: 'index',       category: 'Ratio' },
  // Rate
  { value: 'mL/min/1.73m²', label: 'mL/min/1.73m²', category: 'Rate' },
  { value: 'mL/kg/min',  label: 'mL/kg/min',   category: 'Rate' },
  // Physical / Vital
  { value: 'mmHg',        label: 'mmHg',        category: 'Physical' },
  { value: 'bpm',         label: 'bpm',         category: 'Physical' },
  { value: 'kg',          label: 'kg',          category: 'Physical' },
  { value: 'cm',          label: 'cm',          category: 'Physical' },
  { value: 'kg/m²',       label: 'kg/m²',       category: 'Physical' },
  { value: 'g/cm²',       label: 'g/cm²',       category: 'Physical' },
  { value: 'kgf',         label: 'kgf',         category: 'Physical' },
  // Time / Age
  { value: 'years',       label: 'years',       category: 'Time' },
  { value: 'years/year',  label: 'years/year',  category: 'Time' },
  // Score / Composite
  { value: 'AU',          label: 'AU',          category: 'Score' },
  { value: 'score',       label: 'score',       category: 'Score' },
  // Count / Cellular
  { value: '×10⁹/L',     label: '×10⁹/L',     category: 'Count' },
  { value: '×10¹²/L',    label: '×10¹²/L',    category: 'Count' },
  { value: 'cells/µL',   label: 'cells/µL',    category: 'Count' },
] as const;

export type BiomarkerUnit = typeof BIOMARKER_UNITS[number]['value'];

export const BIOMARKER_UNIT_CATEGORIES = [
  ...new Set(BIOMARKER_UNITS.map((u) => u.category)),
] as const;
