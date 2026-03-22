import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type IngredientInput = {
  id: string;
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
  unit_code: string | null;
  grams_per_unit: number | null;
};

const GRAM_CODES = ['g', 'kg', 'mg', 'ml', 'l'];

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
    return NextResponse.json({ suggestions: [] });
  }

  // Build compact representation showing only what's missing
  const items = ingredients
    .map((ing) => {
      const item: Record<string, unknown> = {
        id: ing.id,
        name: ing.name_en || ing.name_de,
      };

      if (!ing.name_de) item.need_de = true;
      if (!ing.name_fr) item.need_fr = true;
      if (!ing.name_es) item.need_es = true;
      if (!ing.name_it) item.need_it = true;

      if (ing.kcal_per_100g == null || ing.protein_per_100g == null ||
          ing.fat_per_100g == null || ing.carbs_per_100g == null || ing.fiber_per_100g == null) {
        item.need_nutrition = true;
      }

      const isGramBased = GRAM_CODES.includes((ing.unit_code ?? '').toLowerCase());
      if (!isGramBased && ing.grams_per_unit == null && ing.unit_code) {
        item.unit = ing.unit_code;
        item.need_grams = true;
      }

      return item;
    })
    .filter((item) =>
      item.need_de || item.need_fr || item.need_es || item.need_it ||
      item.need_nutrition || item.need_grams
    );

  if (items.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const prompt = `You are a nutrition and culinary database expert. For each ingredient, fill in ONLY the fields marked as needed. Do NOT include fields that are not marked.

Output key names (use EXACTLY these keys in the changes object):
- need_de → key "name_de": German culinary name
- need_fr → key "name_fr": French culinary name
- need_es → key "name_es": Spanish culinary name
- need_it → key "name_it": Italian culinary name
- need_nutrition → keys "kcal_per_100g", "protein_per_100g", "fat_per_100g", "carbs_per_100g", "fiber_per_100g" (USDA/European BLS values per 100g, round to 1 decimal; use cooked values for pasta/rice/legumes)
- need_grams → key "grams_per_unit": average grams for one "unit" (unit field provided). Examples: 1 jalapeño (stk) = 14g, 1 garlic clove (zehe) = 5g, 1 tbsp (el) honey = 21g

Ingredients:
${JSON.stringify(items)}

Return ONLY a compact JSON array. Each element: {"id":"...","changes":{<only needed fields with exact key names above>}}
Include ONLY ingredients that need at least one change.
No markdown, no explanation.`;

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
    const suggestions = JSON.parse(raw);
    return NextResponse.json({ suggestions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
