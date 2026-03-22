import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface IngredientInput {
  id: string;
  name_en: string;
  name_de: string;
  unit_code: string | null;
}

interface IngredientResult {
  id: string;
  is_common: boolean;
  grams_per_unit: number | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { ingredients: IngredientInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ingredients } = body;
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 });
  }

  const GRAM_CODES = ['g', 'kg', 'mg', 'ml', 'l'];

  const list = ingredients
    .map((ing) => {
      const name = ing.name_en || ing.name_de || '';
      const unit = ing.unit_code || 'g';
      return `{"id":"${ing.id}","name":"${name}","unit":"${unit}"}`;
    })
    .join('\n');

  const prompt = `For each ingredient below, determine:
1. is_common: true if it's an everyday cooking ingredient (onions, garlic, olive oil, salt, common vegetables, grains, basic spices), false for rare/specialty items
2. grams_per_unit: average grams for ONE unit, but ONLY if the unit is NOT gram-based. Gram-based units: ${GRAM_CODES.join(', ')}. For gram-based units, set grams_per_unit to null.

Ingredients (JSON lines):
${list}

Return ONLY a JSON array with one object per ingredient:
[{"id": "...", "is_common": boolean, "grams_per_unit": number | null}, ...]

No markdown, no explanation.`;

  const client = new Anthropic({ apiKey });

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
    const results: IngredientResult[] = JSON.parse(raw);
    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
