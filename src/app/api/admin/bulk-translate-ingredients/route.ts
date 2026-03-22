import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export interface BulkTranslateIngredientResult {
  id: string;
  name_fr: string | null;
  name_es: string | null;
  name_it: string | null;
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
    .map((i, idx) => `${idx + 1}. id="${i.id}" en="${i.name_en}"${i.name_de && i.name_de !== i.name_en ? ` de="${i.name_de}"` : ''}`)
    .join('\n');

  const prompt = `Translate these food ingredient names from English/German into French (fr), Spanish (es), and Italian (it).
Use common culinary terms. For each language, use the most natural/standard ingredient name used in cooking.

INGREDIENTS:
${list}

Return ONLY valid JSON — an array with one object per ingredient, in the same order:
[
  {
    "id": "<exact id from input>",
    "name_fr": "<French name>",
    "name_es": "<Spanish name>",
    "name_it": "<Italian name>"
  }
]

Rules:
- Use the standard culinary name in each language (not a literal translation)
- All values must be non-empty strings
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
    const results: BulkTranslateIngredientResult[] = JSON.parse(raw);
    return NextResponse.json({ results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
