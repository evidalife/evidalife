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
  grams_per_unit: number | null;
  is_common: boolean;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en?: string; name_de?: string; name_fr?: string; name_es?: string; name_it?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en = '', name_de = '', name_fr = '', name_es = '', name_it = '' } = body;
  const hasAny = [name_en, name_de, name_fr, name_es, name_it].some(n => n.trim());
  if (!hasAny) {
    return NextResponse.json({ error: 'At least one name is required' }, { status: 400 });
  }

  const nameParts = [
    name_en && `EN: "${name_en}"`,
    name_de && `DE: "${name_de}"`,
    name_fr && `FR: "${name_fr}"`,
    name_es && `ES: "${name_es}"`,
    name_it && `IT: "${name_it}"`,
  ].filter(Boolean).join(', ');

  const prompt = `You are a nutrition and culinary database expert. Given an ingredient name in one or more languages (${nameParts}), identify the ingredient and provide complete data.

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
  "suggested_unit_code": string | null,
  "grams_per_unit": number | null,
  "is_common": boolean
}

Rules:
- First identify the ingredient from whichever language(s) are provided
- Translations: use the most common culinary term in each language (not literal translations)
- Nutrition: values per 100g raw/uncooked (use cooked for pasta/rice/legumes which are always served cooked); use USDA or European BLS values; round to 1 decimal
- suggested_daily_dozen_slug: MUST be exactly one of these values or null: beans, berries, fruits, cruciferous, greens, vegetables, flaxseeds, nuts, herbs-spices, whole-grains, beverages, exercise
- suggested_unit_code: MUST be exactly one of these values or null: g, kg, ml, l, stk, tl, el, prise, bund, zehe — use "g" for most solid foods, "ml" for liquids, "stk" for countable items
- grams_per_unit: if the suggested unit is NOT gram-based (not g/kg/mg), provide the average weight in grams of ONE unit. Examples: 1 jalapeño (stk) ≈ 14g, 1 garlic clove (zehe) ≈ 5g, 1 tbsp miso (el) ≈ 18g, 1 lemon (stk) ≈ 60g. If the unit IS gram-based (g/kg/ml/l), set grams_per_unit to null
- is_common: true for everyday cooking ingredients (onions, garlic, olive oil, salt, common vegetables, grains, basic spices, etc.); false for rare or specialty items (truffle oil, saffron, exotic peppers, unusual spices, etc.)
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
