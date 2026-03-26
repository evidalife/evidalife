import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en = '' } = body;
  if (!name_en.trim()) {
    return NextResponse.json({ error: 'name_en is required' }, { status: 400 });
  }

  const prompt = `You are a clinical laboratory expert specializing in Swiss, German, and Austrian precision medicine labs. Given the biomarker or health measurement named "${name_en}", provide complete registry data.

Return ONLY valid JSON matching this exact structure:
{
  "name_short": string | null,
  "is_calculated": boolean,
  "formula": string | null,
  "calculation_inputs": string[] | null,
  "unit": string | null,
  "range_logic": "lower_is_better" | "higher_is_better" | "range" | null,
  "ref_range_low": number | null,
  "ref_range_high": number | null,
  "optimal_range_low": number | null,
  "optimal_range_high": number | null,
  "he_domain": string | null,
  "description_de": string,
  "description_en": string,
  "description_fr": string,
  "description_es": string,
  "description_it": string
}

Rules:
- name_short: Standard clinical abbreviation for this marker if one exists (e.g. "HbA1c", "hs-CRP", "ApoB", "eGFR", "TSH", "fT3", "fT4", "LDL-C", "HDL-C", "TG", "MAP", "PP", "BMI", "WHtR"). null if no standard abbreviation.
- is_calculated: true if this marker is derived/computed from other measured biomarkers (e.g. HOMA-IR, eGFR, BMI, TG/HDL ratio, Non-HDL-C, MAP, pulse pressure, FIB-4, NLR, LMR), false if it is directly measured in a lab or clinical test.
- formula: if is_calculated=true, provide the mathematical formula using common biomarker slug names (snake_case). e.g. "(fasting_glucose * fasting_insulin) / 22.5" for HOMA-IR. null if not calculated.
- calculation_inputs: if is_calculated=true, list the slug names of the input biomarkers the formula depends on (e.g. ["fasting_glucose", "fasting_insulin"] for HOMA-IR). null if not calculated.
- unit: IMPORTANT — use the unit most commonly reported in Swiss/German/Austrian clinical labs. Examples: mg/dL for lipids (LDL, HDL, total cholesterol, triglycerides), µmol/L for homocysteine and uric acid, nmol/L for vitamin D (25-OH), pmol/L for fT3/fT4, mIU/L for TSH, µg/L for ferritin and B12, U/L for ALT/AST/GGT/ALP, g/dL for haemoglobin, g/L for albumin/total protein, ×10⁹/L for WBC/platelets, ×10¹²/L for red blood cells, % for HbA1c and haematocrit, mmol/L for glucose/HbA1c (if SI preferred), mL/min/1.73m² for eGFR, mL/kg/min for VO₂max. Use null only if truly not applicable.
- range_logic: "lower_is_better" if lower values are healthier (e.g. LDL, hs-CRP, HbA1c, ApoB, homocysteine, triglycerides), "higher_is_better" if higher is healthier (e.g. HDL, vitamin D, eGFR, VO₂max, testosterone), "range" if both bounds define normal (e.g. TSH, fT3/fT4, haemoglobin, glucose, sodium). Use null if not a numeric measurement.
- ref_range_low: only provide if range_logic is "higher_is_better" or "range". Set null for "lower_is_better".
- ref_range_high: only provide if range_logic is "lower_is_better" or "range". Set null for "higher_is_better".
- optimal_range_low: only provide if range_logic is "higher_is_better" or "range". Set null for "lower_is_better".
- optimal_range_high: only provide if range_logic is "lower_is_better" or "range". Set null for "higher_is_better".
- Use standard adult clinical reference ranges (most widely accepted values for Swiss/EU labs).
- optimal ranges should reflect evidence-based longevity/performance targets (may differ from lab normals).
- he_domain: MUST be exactly one of these or null: heart_vessels, metabolism, inflammation, organ_function, nutrients, hormones, body_composition, fitness, epigenetics, genetics
- description_*: 1–2 clear, accessible sentences explaining what this biomarker measures and why it matters for health. Write in the target language (de=German, en=English, fr=French, es=Spanish, it=Italian). Patient-friendly, not overly clinical.
- Return ONLY the JSON object, no markdown, no explanation`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
