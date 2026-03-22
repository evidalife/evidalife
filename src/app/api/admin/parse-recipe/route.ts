import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export interface ParsedIngredient {
  name_en: string;
  quantity: number | null;
  unit: string;
  notes: string;
  optional: boolean;
  matched_ingredient_id: string | null;
  is_missing: boolean;
}

export interface ParsedRecipe {
  title_en: string;
  description_en: string;
  instructions_en: string;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard';
  course_type: string | null;
  meal_types: string[];
  ingredients: ParsedIngredient[];
  health_goals: string[];
  nutrition_per_serving: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  } | null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { text?: string; existingIngredients?: { id: string; name_en: string; name_de: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { text, existingIngredients = [] } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const ingredientList = existingIngredients
    .map((i) => `- "${i.name_en}" (also "${i.name_de}", id: ${i.id})`)
    .join('\n');

  const prompt = `You are a recipe parser. Parse the following recipe text into structured JSON.

EXISTING INGREDIENTS DATABASE:
${ingredientList || '(empty)'}

RECIPE TEXT:
${text}

Return ONLY valid JSON matching this exact TypeScript interface:
{
  "title_en": string,
  "description_en": string,
  "instructions_en": string (markdown, numbered steps),
  "prep_minutes": number | null,
  "cook_minutes": number | null,
  "servings": number | null,
  "difficulty": "easy" | "medium" | "hard",
  "course_type": string | null (one of: "Appetizer", "Main", "Side", "Component", "Dessert", "Snack", "Drink" or null),
  "meal_types": string[] (subset of: ["Breakfast", "Lunch", "Dinner", "Anytime"]),
  "ingredients": [
    {
      "name_en": string,
      "quantity": number | null,
      "unit": string (e.g. "g", "ml", "piece", "tbsp", "tsp", "cup"),
      "notes": string (e.g. "finely chopped", ""),
      "optional": boolean,
      "matched_ingredient_id": string | null (match to existing ingredient ID if found, else null),
      "is_missing": boolean (true if no match found in database)
    }
  ],
  "health_goals": string[] (2-4 from: "weight_loss", "heart_health", "anti_inflammation", "longevity", "gut_health", "energy", "immune", "bone_health", "brain_health", "diabetes_prevention"),
  "nutrition_per_serving": { "kcal": number, "protein_g": number, "fat_g": number, "carbs_g": number, "fiber_g": number } | null
}

Rules:
- Match ingredients to the database by name similarity (case-insensitive, handle plurals/German)
- For ingredients not found in database, set matched_ingredient_id to null and is_missing to true
- Translate any non-English recipe to English
- Return ONLY the JSON object, no markdown, no explanation`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type from Claude' }, { status: 500 });
    }

    // Strip potential markdown code fences
    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed: ParsedRecipe = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
