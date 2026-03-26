// src/lib/lab-results/extract-pdf.ts
// Shared PDF/image extraction logic used by both admin and user routes.
// Calls Claude claude-sonnet-4-6, matches biomarker names, applies unit conversions.

import type { SupabaseClient } from '@supabase/supabase-js';
import { matchBiomarkerName } from './flagging';
import { convertToCanonical } from '@/lib/biomarker-conversions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LabMetadata {
  lab_name:    string | null;
  test_date:   string | null;
  lab_address: string | null;
  lab_email:   string | null;
  lab_phone:   string | null;
}

export interface ExtractedRow {
  extracted_name: string;
  value: number;
  unit: string;
  ref_low: number | null;
  ref_high: number | null;
  flagged: boolean;
  test_date: string | null;
  matched_id: string | null;
  matched_name: string | null;
  confidence: 'exact' | 'alias' | 'fuzzy' | 'unmatched';
  db_biomarker: any | null;
  include: boolean;
  original_value: number | null;
  original_unit: string | null;
  was_converted: boolean;
}

// ─── Extraction prompt ────────────────────────────────────────────────────────

export const EXTRACTION_PROMPT = `You are a lab report parser. Extract ALL biomarker/test results from this lab report.

Additionally, extract the following metadata from the report header/footer if present:
- lab_name: Name of the laboratory (e.g., "Laborgemeinschaft 1", "Walk-In Labor Zürich")
- test_date: Date the sample was collected or report issued (YYYY-MM-DD format or null)
- lab_address: Full address of the lab if shown
- lab_email: Email address if shown
- lab_phone: Phone number if shown

For each result, extract:
- name: the exact name as printed on the report (may be in any language — do NOT translate)
- value: the numeric value (number only, no units)
- unit: the unit exactly as printed (e.g., mmol/l, g/l, U/l, µmol/l, µg/l, %, pg, fl)
- ref_low: reference range lower bound (number or null)
- ref_high: reference range upper bound (number or null)
- flagged: true if the value is marked with H, L, *, or is outside the reference range
- test_date: date of the test if shown on this row (YYYY-MM-DD or null)

Rules:
- Extract ALL numeric results, even unfamiliar ones
- Keep the name exactly as printed — German, French, Italian, English, abbreviations
- Include the unit exactly as printed
- For "< 3.0" style values, extract value as 3.0
- Skip purely qualitative results (negativ, normal, unauffällig) — only numeric values
- Prefer percentage forms over absolute counts for differential (e.g., use "Neutrophile %" not "Neutrophile abs.")

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{
  "metadata": {
    "lab_name": "Laborgemeinschaft 1",
    "test_date": "2022-06-11",
    "lab_address": "Rautistrasse 11, 8047 Zürich",
    "lab_email": "lg1@lg1.ch",
    "lab_phone": "044 404 20 80"
  },
  "results": [
    {"name": "Hämoglobin", "value": 160, "unit": "g/l", "ref_low": 144, "ref_high": 175, "flagged": false, "test_date": null}
  ]
}`;

// ─── Call Claude ──────────────────────────────────────────────────────────────

export async function callClaudeForPdf(
  base64Data: string,
  mediaType: string,
  apiKey: string,
): Promise<{ metadata: LabMetadata; rawResults: any[] }> {
  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          mediaType === 'application/pdf'
            ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64Data } }
            : { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64Data } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  if (!claudeRes.ok) {
    const errText = await claudeRes.text();
    throw new Error(`Claude API error: ${errText.slice(0, 200)}`);
  }

  const claudeData = await claudeRes.json();
  const rawText: string = claudeData.content?.[0]?.text ?? '';

  // Try new object format first, fall back to plain array
  let metadata: LabMetadata = { lab_name: null, test_date: null, lab_address: null, lab_email: null, lab_phone: null };
  let rawResults: any[] = [];

  try {
    const objMatch = rawText.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      if (Array.isArray(parsed.results)) {
        metadata = { ...metadata, ...parsed.metadata };
        rawResults = parsed.results;
        return { metadata, rawResults };
      }
    }
  } catch { /* fall through */ }

  // Fallback: try plain array (backward compat)
  try {
    const arrMatch = rawText.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      rawResults = JSON.parse(arrMatch[0]);
    }
  } catch {
    throw new Error('Could not parse Claude response as JSON');
  }

  return { metadata, rawResults };
}

// ─── Match + convert ──────────────────────────────────────────────────────────

export async function matchAndConvertResults(
  rawResults: any[],
  supabase: SupabaseClient,
): Promise<ExtractedRow[]> {
  const { data: allBiomarkers } = await supabase
    .from('biomarkers')
    .select('id, slug, name, name_short, item_type, unit, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
    .eq('is_active', true);

  const dbBiomarkers = (allBiomarkers ?? []) as any[];

  // Match names to DB biomarkers
  const matchedRaw: ExtractedRow[] = rawResults.map((item: any) => {
    const result = matchBiomarkerName(item.name || '', dbBiomarkers);
    return {
      extracted_name: item.name || '',
      value:          item.value,
      unit:           item.unit || '',
      ref_low:        item.ref_low ?? null,
      ref_high:       item.ref_high ?? null,
      flagged:        item.flagged ?? false,
      test_date:      item.test_date ?? null,
      matched_id:     result?.biomarker.id ?? null,
      matched_name:   result
        ? ((n) => n?.en || n?.de || result.biomarker.slug)(result.biomarker.name)
        : null,
      confidence:     result?.confidence ?? 'unmatched',
      db_biomarker:   result?.biomarker ?? null,
      include:        result != null,
      original_value: null,
      original_unit:  null,
      was_converted:  false,
    };
  });

  // Load conversions for matched biomarkers
  const matchedIds = matchedRaw.map((m) => m.matched_id).filter(Boolean) as string[];
  const { data: allConversions } = matchedIds.length > 0
    ? await supabase.from('biomarker_unit_conversions').select('*').in('biomarker_id', matchedIds)
    : { data: [] };

  // Apply unit conversions
  return matchedRaw.map((item) => {
    const dbBm = item.db_biomarker;
    if (!dbBm || item.value == null || !item.unit) return item;

    const convs = (allConversions ?? []).filter((c: any) => c.biomarker_id === item.matched_id);
    const { convertedValue, wasConverted } = convertToCanonical(item.value, item.unit, dbBm.unit ?? '', convs);

    if (!wasConverted) return item;

    return {
      ...item,
      original_value: item.value,
      original_unit:  item.unit,
      value:          convertedValue,
      unit:           dbBm.unit ?? item.unit,
      was_converted:  true,
    };
  });
}
