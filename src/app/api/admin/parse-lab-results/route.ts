// src/app/api/admin/parse-lab-results/route.ts
// POST { storagePath, uploadId }
// Fetches PDF/image from lab-pdfs storage, extracts biomarkers via Claude,
// matches to DB biomarkers and applies unit conversions.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { matchBiomarkerName } from '@/lib/lab-results/flagging';
import { convertToCanonical } from '@/lib/biomarker-conversions';

export const maxDuration = 60;

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const EXTRACTION_PROMPT = `You are a lab report parser. Extract ALL biomarker/test results from this lab report.

For each result, output:
- name: the exact name as printed on the report (may be in any language — do NOT translate)
- value: the numeric value (number only, no units)
- unit: the unit exactly as printed (e.g., mmol/l, g/l, U/l, µmol/l, µg/l, %, pg, fl)
- ref_low: reference range lower bound (number or null)
- ref_high: reference range upper bound (number or null)
- flagged: true if the value is marked with H, L, *, or is outside the reference range
- test_date: date of the test if shown (YYYY-MM-DD format or null)

Rules:
- Extract ALL numeric results, even unfamiliar ones
- Keep the name exactly as printed — German, French, Italian, English, abbreviations
- Include the unit exactly as printed
- For "< 3.0" style values, extract value as 3.0
- Skip purely qualitative results (negativ, normal, unauffällig) — only numeric values
- Prefer percentage forms over absolute counts for differential (e.g., use "Neutrophile %" not "Neutrophile abs.")

Return ONLY a JSON array, no markdown, no explanation:
[{"name": "Hämoglobin", "value": 160, "unit": "g/l", "ref_low": 144, "ref_high": 175, "flagged": false, "test_date": "2026-01-15"}, ...]`;

export async function POST(req: NextRequest) {
  try {
    const { storagePath, uploadId } = await req.json();
    if (!storagePath || !uploadId) {
      return NextResponse.json({ error: 'storagePath and uploadId are required' }, { status: 400 });
    }

    const supabase = adminClient();

    // Mark upload as processing
    await supabase.from('lab_pdf_uploads').update({ extraction_status: 'processing' }).eq('id', uploadId);

    // Generate a fresh signed URL from the storage path (service role can always do this)
    const { data: signedData, error: signError } = await supabase.storage
      .from('lab-pdfs')
      .createSignedUrl(storagePath, 300);

    if (signError || !signedData?.signedUrl) {
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: 'Could not generate signed URL for file',
      }).eq('id', uploadId);
      return NextResponse.json({ error: 'Could not access file in storage' }, { status: 400 });
    }

    // Fetch the file
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) {
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: 'Could not fetch file',
      }).eq('id', uploadId);
      return NextResponse.json({ error: 'Could not fetch file' }, { status: 400 });
    }
    const fileBuffer = await fileRes.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

    // Determine media type from path
    const pathLower = storagePath.toLowerCase();
    const mediaType = pathLower.endsWith('.pdf')
      ? 'application/pdf'
      : pathLower.endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Call Claude API
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
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
              : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: `Claude API error: ${errText.slice(0, 200)}`,
      }).eq('id', uploadId);
      return NextResponse.json({ error: 'Claude API error' }, { status: 500 });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text ?? '';

    // Parse JSON from response
    let extracted: any[] = [];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch {
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: 'Could not parse Claude response as JSON',
      }).eq('id', uploadId);
      return NextResponse.json({ error: 'Parse error', raw: rawText }, { status: 500 });
    }

    // Fetch all biomarkers for matching (include slug for alias lookup)
    const { data: allBiomarkers } = await supabase
      .from('biomarkers')
      .select('id, slug, name, unit, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .eq('is_active', true);

    const dbBiomarkers = (allBiomarkers ?? []) as Array<{
      id: string;
      slug: string;
      name: Record<string, string> | null;
      unit: string | null;
      ref_range_low: number | null;
      ref_range_high: number | null;
      optimal_range_low: number | null;
      optimal_range_high: number | null;
      range_type: string | null;
    }>;

    // Match extracted items to DB biomarkers
    const matchedRaw = extracted.map((item: any) => {
      const result = matchBiomarkerName(item.name || '', dbBiomarkers);
      return {
        extracted_name: item.name || '',
        value: item.value,
        unit: item.unit || '',
        ref_low: item.ref_low ?? null,
        ref_high: item.ref_high ?? null,
        flagged: item.flagged ?? false,
        test_date: item.test_date ?? null,
        matched_id: result?.biomarker.id ?? null,
        matched_name: result ? (() => {
          const n = result.biomarker.name;
          return (n?.en || n?.de || result.biomarker.slug) as string;
        })() : null,
        confidence: result?.confidence ?? 'unmatched' as const,
        db_biomarker: result?.biomarker ?? null,
        include: result != null,
        original_value: null as number | null,
        original_unit: null as string | null,
        was_converted: false,
      };
    });

    // Load unit conversions for matched biomarkers
    const matchedIds = matchedRaw.map((m) => m.matched_id).filter(Boolean) as string[];
    const { data: allConversions } = matchedIds.length > 0
      ? await supabase.from('biomarker_unit_conversions').select('*').in('biomarker_id', matchedIds)
      : { data: [] };

    // Apply unit conversion where needed
    const matched = matchedRaw.map((item) => {
      const dbBm = item.db_biomarker;
      if (!dbBm || item.value == null || !item.unit) return item;

      const conversions = (allConversions ?? []).filter((c: any) => c.biomarker_id === item.matched_id);
      const { convertedValue, wasConverted } = convertToCanonical(
        item.value, item.unit, dbBm.unit ?? '', conversions,
      );

      if (!wasConverted) return item;

      return {
        ...item,
        original_value: item.value,
        original_unit: item.unit,
        value: convertedValue,
        unit: dbBm.unit ?? item.unit,
        was_converted: true,
      };
    });

    // Save extraction results to upload record
    await supabase.from('lab_pdf_uploads').update({
      extraction_status: 'completed',
      extracted_data: matched,
    }).eq('id', uploadId);

    return NextResponse.json({ success: true, extracted: matched, uploadId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
