import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export interface ParsedProduct {
  name_en: string;
  short_description_en: string;
  description_en: string;
  suggested_price_chf: number | null;
  suggested_product_type: string | null;
  marker_count: number | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are a product data extractor for a premium health and longevity platform. Extract structured product details from the following text.

TEXT:
${text}

Extract:
- name_en: Product name in English (concise, title case)
- short_description_en: One-sentence product subtitle for card display (max 120 chars)
- description_en: Full product description in English (keep all details, can be several paragraphs)
- suggested_price_chf: Price in CHF as a number, or null if not found
- suggested_product_type: One of: blood_test, addon_test, single_biomarker, supplement, functional_food, food, subscription, program, bundle, digital_product, device, coaching_session — pick the best fit, or null
- marker_count: Number of biomarkers/tests included if this is a test kit, or null

Return ONLY valid JSON:
{
  "name_en": string,
  "short_description_en": string,
  "description_en": string,
  "suggested_price_chf": number | null,
  "suggested_product_type": string | null,
  "marker_count": number | null
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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
