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
