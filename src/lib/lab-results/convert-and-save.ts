// src/lib/lab-results/convert-and-save.ts
// Single conversion + save entry point for ALL lab result data paths.
// Every input path (PDF upload, manual entry, self-report, API import) MUST
// call convertLabResult() before inserting into lab_results.

import { convertToCanonical, normalizeUnit } from '@/lib/biomarker-conversions';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LabResultInput {
  biomarker_id: string;
  user_id: string;
  value: number;
  unit: string;          // the unit the value was entered/extracted in
  test_date?: string;
  source: 'pdf_upload' | 'manual_entry' | 'self_report' | 'api_import';
  entered_by?: string;
  pdf_url?: string;
  extraction_confidence?: number;
}

export interface ConvertedResult {
  biomarker_id: string;
  user_id: string;
  value_numeric: number;        // ALWAYS in canonical unit
  unit: string;                  // ALWAYS the canonical unit
  original_value: number;        // what was entered/extracted
  original_unit: string;         // the unit it was entered in
  was_converted: boolean;
  test_date: string;
  source: string;
  entered_by: string | null;
  pdf_url: string | null;
  extraction_confidence: number | null;
}

/**
 * Convert a lab result value to the biomarker's canonical unit and prepare
 * for DB insertion. This is the ONLY function that should be called before
 * inserting into lab_results from any server-side path.
 */
export async function convertLabResult(
  input: LabResultInput,
  supabase: SupabaseClient,
): Promise<ConvertedResult> {
  const baseResult: Omit<ConvertedResult, 'value_numeric' | 'unit' | 'was_converted'> = {
    biomarker_id:           input.biomarker_id,
    user_id:                input.user_id,
    original_value:         input.value,
    original_unit:          input.unit,
    test_date:              input.test_date || new Date().toISOString().slice(0, 10),
    source:                 input.source,
    entered_by:             input.entered_by ?? null,
    pdf_url:                input.pdf_url ?? null,
    extraction_confidence:  input.extraction_confidence ?? null,
  };

  // 1. Get the biomarker's canonical unit
  const { data: biomarker } = await supabase
    .from('biomarkers')
    .select('unit')
    .eq('id', input.biomarker_id)
    .single();

  const canonicalUnit = biomarker?.unit ?? input.unit;

  // 2. Check if conversion is needed
  if (normalizeUnit(input.unit) === normalizeUnit(canonicalUnit)) {
    return { ...baseResult, value_numeric: input.value, unit: canonicalUnit, was_converted: false };
  }

  // 3. Load conversion rules for this biomarker
  const { data: conversions } = await supabase
    .from('biomarker_unit_conversions')
    .select('biomarker_id, alt_unit, canonical_unit, multiplier, offset_value')
    .eq('biomarker_id', input.biomarker_id);

  const { convertedValue, wasConverted } = convertToCanonical(
    input.value, input.unit, canonicalUnit, conversions ?? [],
  );

  if (!wasConverted) {
    console.warn(
      `[convert-and-save] No conversion rule for ${input.unit} → ${canonicalUnit} on biomarker ${input.biomarker_id}. Storing raw value.`,
    );
  }

  return {
    ...baseResult,
    value_numeric: wasConverted ? convertedValue : input.value,
    unit:          wasConverted ? canonicalUnit  : input.unit,
    was_converted: wasConverted,
  };
}

// ─── Batch conversion ─────────────────────────────────────────────────────────

export interface SimpleLabInput {
  biomarker_id: string;
  value: number;
  unit: string;
}

export interface SimplifiedConvertedResult {
  biomarker_id: string;
  value_numeric: number;
  unit: string;
  original_value: number;
  original_unit: string;
  was_converted: boolean;
}

/**
 * Batch-convert multiple results efficiently (one DB round-trip each for
 * biomarkers and conversions rather than N round-trips).
 */
export async function convertLabResultsBatch(
  inputs: SimpleLabInput[],
  supabase: SupabaseClient,
): Promise<SimplifiedConvertedResult[]> {
  if (inputs.length === 0) return [];

  const biomarkerIds = [...new Set(inputs.map((i) => i.biomarker_id))];

  const [{ data: biomarkers }, { data: conversions }] = await Promise.all([
    supabase.from('biomarkers').select('id, unit').in('id', biomarkerIds),
    supabase.from('biomarker_unit_conversions').select('biomarker_id, alt_unit, canonical_unit, multiplier, offset_value').in('biomarker_id', biomarkerIds),
  ]);

  const bmMap = new Map<string, string>((biomarkers ?? []).map((b: any) => [b.id, b.unit]));
  const convMap = new Map<string, any[]>();
  for (const c of (conversions ?? [])) {
    if (!convMap.has(c.biomarker_id)) convMap.set(c.biomarker_id, []);
    convMap.get(c.biomarker_id)!.push(c);
  }

  return inputs.map((input) => {
    const canonicalUnit = bmMap.get(input.biomarker_id) ?? input.unit;

    if (normalizeUnit(input.unit) === normalizeUnit(canonicalUnit)) {
      return {
        biomarker_id:   input.biomarker_id,
        value_numeric:  input.value,
        unit:           canonicalUnit,
        original_value: input.value,
        original_unit:  input.unit,
        was_converted:  false,
      };
    }

    const { convertedValue, wasConverted } = convertToCanonical(
      input.value, input.unit, canonicalUnit, convMap.get(input.biomarker_id) ?? [],
    );

    return {
      biomarker_id:   input.biomarker_id,
      value_numeric:  wasConverted ? convertedValue : input.value,
      unit:           wasConverted ? canonicalUnit  : input.unit,
      original_value: input.value,
      original_unit:  input.unit,
      was_converted:  wasConverted,
    };
  });
}
