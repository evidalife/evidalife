import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export interface AutocompleteIngredientResult {
  name_en: string;
  name_de: string;
  name_fr: string;
  name_es: string;
  name_it: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
  fiber_per_100g: number | null;
  suggested_daily_dozen_slug: string | null;
  suggested_unit_code: string | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en?: string; name_de?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en = '', name_de = '' } = body;
  if (!name_en.trim() && !name_de.trim()) {
    return NextResponse.json({ error: 'name_en or name_de is required' }, { status: 400 });
  }

  const nameHint = [name_en.trim(), name_de.trim()].filter(Boolean).join(' / ');

  const prompt = `You are a nutrition and culinary database expert. Given the ingredient name "${nameHint}", provide complete data.

Return ONLY valid JSON matching this exact structure:
{
  "name_en": string,
  "name_de": string,
  "name_fr": string,
  "name_es": string,
  "name_it": string,
  "kcal_per_100g": number | null,
  "protein_per_100g": number | null,
  "fat_per_100g": number | null,
  "carbs_per_100g": number | null,
  "fiber_per_100g": number | null,
  "suggested_daily_dozen_slug": string | null,
  "suggested_unit_code": string | null
}

Rules:
- Translations: use the most common culinary term in each language (not literal translations)
- Nutrition: values per 100g raw/uncooked (use cooked for pasta/rice/legumes which are always served cooked); use USDA or European BLS values; round to 1 decimal
- suggested_daily_dozen_slug: pick one from [beans, berries, fruits, cruciferous, greens, vegetables, flaxseeds, nuts, herbs-spices, whole-grains, beverages, exercise] or null if none fits
- suggested_unit_code: pick the most natural default unit from [g, kg, ml, l, stk, tl, el, prise, bund, zehe] — use "g" for most solid foods, "ml" for liquids, "stk" for countable items
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
    const result: AutocompleteIngredientResult = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
