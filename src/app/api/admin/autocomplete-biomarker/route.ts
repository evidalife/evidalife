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

  const prompt = `You are a clinical laboratory and precision medicine expert. Given the biomarker or health measurement named "${name_en}", provide complete registry data.

Return ONLY valid JSON matching this exact structure:
{
  "unit": string | null,
  "ref_range_low": number | null,
  "ref_range_high": number | null,
  "optimal_range_low": number | null,
  "optimal_range_high": number | null,
  "body_system": string | null,
  "he_domain": string | null,
  "description_de": string,
  "description_en": string,
  "description_fr": string,
  "description_es": string,
  "description_it": string
}

Rules:
- unit: standard SI or conventional unit used in clinical labs (e.g. "mg/dL", "mmol/L", "µg/L", "pg/mL", "IU/L", "bpm", "%", "kg/m²"). Use null if not applicable.
- ref_range_low / ref_range_high: standard adult clinical reference range (typical lab normal range). Use the most widely accepted values. Use null if not a numeric biomarker.
- optimal_range_low / optimal_range_high: evidence-based optimal/longevity-focused range (may be narrower than reference range). Use null if unknown or not applicable.
- body_system: MUST be exactly one of these or null: cardiovascular, metabolic, hormonal, immune, musculoskeletal, neurological, renal, hepatic, pulmonary, hematological, other
- he_domain: MUST be exactly one of these or null: longevity, fitness, nutrition, mental_health, sleep, stress, other
- description_*: 1–2 clear, accessible sentences explaining what this biomarker measures and why it matters for health. Write in the target language (de=German, en=English, fr=French, es=Spanish, it=Italian). Keep it patient-friendly, not overly clinical.
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
