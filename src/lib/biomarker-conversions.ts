/**
 * Biomarker Unit Conversion System
 *
 * Converts lab result values from any supported unit to the canonical unit
 * stored in the biomarkers table. Used by:
 * - Manual lab result entry (OrderEntryTab)
 * - AI PDF import (parse-lab-results API)
 * - Future: patient self-import
 */

export interface UnitConversion {
  biomarker_id: string;
  alt_unit: string;
  canonical_unit: string;
  multiplier: number;
  offset_value: number;
}

/**
 * Convert a value from an alternative unit to the canonical unit.
 * Formula: canonical_value = (input_value × multiplier) + offset
 * Returns the original value unchanged if no conversion is found.
 */
export function convertToCanonical(
  value: number,
  inputUnit: string,
  canonicalUnit: string,
  conversions: UnitConversion[]
): { convertedValue: number; wasConverted: boolean } {
  const normalizedInput = normalizeUnit(inputUnit);
  const normalizedCanonical = normalizeUnit(canonicalUnit);

  if (normalizedInput === normalizedCanonical) {
    return { convertedValue: value, wasConverted: false };
  }

  const conversion = conversions.find(
    (c) => normalizeUnit(c.alt_unit) === normalizedInput
  );

  if (!conversion) {
    console.warn(`No conversion found: ${inputUnit} → ${canonicalUnit}`);
    return { convertedValue: value, wasConverted: false };
  }

  const convertedValue = value * conversion.multiplier + conversion.offset_value;
  return {
    convertedValue: Math.round(convertedValue * 100) / 100,
    wasConverted: true,
  };
}

/**
 * Normalize unit strings for fuzzy matching.
 * Handles common variations: µ vs μ, spaces, British/American spelling, case.
 */
export function normalizeUnit(unit: string): string {
  return unit
    .toLowerCase()
    .replace(/μ/g, 'µ')         // Greek mu → micro sign
    .replace(/\bmc(?=[a-z])/g, 'µ')  // "mc" prefix → micro (mcmol → µmol, mcg → µg)
    .replace(/\bumol\b/g, 'µmol')    // umol → µmol (ASCII u → micro sign)
    .replace(/\bug\b/g, 'µg')        // ug → µg
    .replace(/\bul\b/g, 'µl')        // ul → µl
    .replace(/\s+/g, '')         // remove spaces
    .replace(/per/g, '/')        // "per" → "/"
    .replace(/litre/g, 'l')      // British spelling
    .replace(/liter/g, 'l')      // American spelling
    .replace(/decilitre/g, 'dl')
    .replace(/deciliter/g, 'dl')
    .replace(/millilitre/g, 'ml')
    .replace(/milliliter/g, 'ml')
    .replace(/\/mm3/g, '/mm³')   // mm3 → mm³
    .replace(/10e3\/µl/g, '10³/µl')  // 10e3 notation
    .replace(/10e6\/µl/g, '10⁶/µl')  // 10e6 notation
    .trim();
}

/**
 * Common unit aliases that labs use interchangeably (1:1 conversions).
 */
export const UNIT_ALIASES: Record<string, string[]> = {
  'ng/mL': ['ng/ml', 'µg/L', 'µg/l'],
  'pg/mL': ['pg/ml'],
  'µU/mL': ['µU/ml', 'µIU/mL', 'mIU/L'],
  'U/L':   ['U/l', 'IU/L'],
  'mg/dL': ['mg/dl'],
  'mg/L':  ['mg/l'],
  'µg/L':  ['µg/l', 'mcg/L'],
  'µg/dL': ['µg/dl', 'mcg/dL'],
  'µmol/L': ['µmol/l', 'umol/L'],
  'nmol/L': ['nmol/l'],
  'pmol/L': ['pmol/l'],
  'mmol/L': ['mmol/l'],
  'mIU/L':  ['mIU/l', 'µIU/mL', 'µIU/ml'],
  'mL/min/1.73m²': ['mL/min/1.73m2', 'ml/min/1.73m²', 'mL/min/1.73 m²'],
};
