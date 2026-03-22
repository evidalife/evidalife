import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export interface BulkNutritionResult {
  id: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
  fiber_per_100g: number | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { ingredients: { id: string; name_en: string; name_de: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ingredients } = body;
  if (!ingredients?.length) {
    return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 });
  }

  const list = ingredients
    .map((i, idx) => `${idx + 1}. id="${i.id}" name="${i.name_en}"${i.name_de && i.name_de !== i.name_en ? ` / "${i.name_de}"` : ''}`)
    .join('\n');

  const prompt = `You are a nutrition database. For each food ingredient below, provide accurate nutrition values per 100g (raw/uncooked unless it's always served cooked like pasta/rice, then use cooked values).

INGREDIENTS:
${list}

Return ONLY valid JSON — an array with one object per ingredient, in the same order:
[
  {
    "id": "<exact id from input>",
    "kcal_per_100g": <number or null>,
    "protein_per_100g": <number or null>,
    "fat_per_100g": <number or null>,
    "carbs_per_100g": <number or null>,
    "fiber_per_100g": <number or null>
  }
]

Rules:
- Use well-known nutritional reference values (USDA, German BLS)
- Round to 1 decimal place
- If a name is truly ambiguous (e.g. a brand name, non-food item), return nulls for that item
- Return ONLY the JSON array, no markdown, no explanation`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const results: BulkNutritionResult[] = JSON.parse(raw);
    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
