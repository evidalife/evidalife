// src/app/api/admin/parse-lab-results/route.ts
// POST { fileUrl, orderId?, userId?, uploadId }
// Uses Claude to extract biomarker results from a lab PDF/image

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

const EXTRACTION_PROMPT = `You are a medical lab results extraction system. Extract ALL biomarker test results from this lab report.

For each result, return a JSON object with:
- biomarker_name: the name as written on the report (original language)
- biomarker_name_en: English translation of the biomarker name
- value: the numeric value (number only, no units)
- unit: the measurement unit EXACTLY as printed on the report (e.g. mg/dL, mmol/L, ng/mL, %). Never omit or guess the unit.
- reference_range_low: lower reference range if shown (number or null)
- reference_range_high: upper reference range if shown (number or null)
- test_date: the date of the test if shown (ISO format YYYY-MM-DD or null)
- flag: any flag shown on the report (H for high, L for low, or null)

Return ONLY a JSON array. No explanation. Example:
[
  {"biomarker_name": "Apolipoprotein B", "biomarker_name_en": "Apolipoprotein B", "value": 95, "unit": "mg/dL", "reference_range_low": 40, "reference_range_high": 100, "test_date": "2026-03-20", "flag": null},
  {"biomarker_name": "HbA1c", "biomarker_name_en": "HbA1c", "value": 5.4, "unit": "%", "reference_range_low": 4.0, "reference_range_high": 5.6, "test_date": "2026-03-20", "flag": null}
]

Extract ALL results, even if you are not 100% certain. Include any biomarker, hormone, vitamin, mineral, blood count value, or health metric found in the document.`;

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, orderId, userId, uploadId } = await req.json();
    if (!fileUrl || !uploadId) {
      return NextResponse.json({ error: 'fileUrl and uploadId are required' }, { status: 400 });
    }

    const supabase = adminClient();

    // Mark upload as processing
    await supabase.from('lab_pdf_uploads').update({ extraction_status: 'processing' }).eq('id', uploadId);

    // Determine file type from URL
    const urlLower = fileUrl.toLowerCase();
    const isPdf = urlLower.includes('.pdf');
    const mediaType = isPdf ? 'application/pdf' : urlLower.includes('.png') ? 'image/png' : 'image/jpeg';

    // Fetch the file
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      await supabase.from('lab_pdf_uploads').update({ extraction_status: 'failed', error_message: 'Could not fetch file' }).eq('id', uploadId);
      return NextResponse.json({ error: 'Could not fetch file' }, { status: 400 });
    }
    const fileBuffer = await fileRes.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            isPdf
              ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: base64Data } }
              : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      await supabase.from('lab_pdf_uploads').update({ extraction_status: 'failed', error_message: `Claude API error: ${errText.slice(0, 200)}` }).eq('id', uploadId);
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
      await supabase.from('lab_pdf_uploads').update({ extraction_status: 'failed', error_message: 'Could not parse Claude response as JSON' }).eq('id', uploadId);
      return NextResponse.json({ error: 'Parse error', raw: rawText }, { status: 500 });
    }

    // Fetch all biomarkers for matching
    const { data: allBiomarkers } = await supabase
      .from('biomarkers')
      .select('id, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .eq('is_active', true);

    const dbBiomarkers = (allBiomarkers ?? []).map((b: any) => ({
      ...b,
      name_en: typeof b.name === 'object' ? (b.name?.en || '') : (b.name || ''),
    }));

    // Match extracted biomarkers to DB
    const matchedRaw = extracted.map((item: any) => {
      const match = matchBiomarkerName(item.biomarker_name_en || item.biomarker_name || '', dbBiomarkers);
      const dbBm = match ? dbBiomarkers.find((b) => b.id === match.id) : null;
      return {
        ...item,
        matched_id: match?.id ?? null,
        matched_name: match?.name ?? null,
        confidence: match?.confidence ?? 0,
        db_biomarker: dbBm ?? null,
        include: (match?.confidence ?? 0) >= 0.7,
      };
    });

    // Load unit conversions for all matched biomarker IDs
    const matchedIds = matchedRaw.map((m: any) => m.matched_id).filter(Boolean);
    const { data: allConversions } = matchedIds.length > 0
      ? await supabase.from('biomarker_unit_conversions').select('*').in('biomarker_id', matchedIds)
      : { data: [] };

    // Apply unit conversion where needed
    const matched = matchedRaw.map((item: any) => {
      const dbBm = item.db_biomarker;
      if (!dbBm || item.value == null || !item.unit) return item;

      const conversions = (allConversions ?? []).filter((c: any) => c.biomarker_id === item.matched_id);
      const { convertedValue, wasConverted } = convertToCanonical(
        item.value, item.unit, dbBm.unit ?? '', conversions
      );

      return {
        ...item,
        original_value: item.value,
        original_unit: item.unit,
        value: convertedValue,
        unit: wasConverted ? dbBm.unit : item.unit,
        was_converted: wasConverted,
      };
    });

    // Update upload record
    await supabase.from('lab_pdf_uploads').update({
      extraction_status: 'completed',
      extracted_data: matched,
    }).eq('id', uploadId);

    return NextResponse.json({ success: true, extracted: matched, uploadId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
