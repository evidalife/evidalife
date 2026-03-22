import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: {
    ingredients?: string[];
    nutrition?: { kcal?: number; protein?: number; fat?: number; carbs?: number; fiber?: number };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ingredients = [], nutrition } = body;
  if (ingredients.length === 0) {
    return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const nutritionStr = nutrition
    ? `Nutrition per serving: ${nutrition.kcal ?? '?'} kcal, protein ${nutrition.protein ?? '?'}g, fat ${nutrition.fat ?? '?'}g, carbs ${nutrition.carbs ?? '?'}g, fiber ${nutrition.fiber ?? '?'}g`
    : '';

  const prompt = `Based on these ingredients and nutrition profile, select the 2-4 most relevant health goals from this exact list:
weight_loss, heart_health, anti_inflammation, longevity, gut_health, energy, immune, bone_health, brain_health, diabetes_prevention

INGREDIENTS: ${ingredients.join(', ')}
${nutritionStr}

Return ONLY a JSON array of goal keys, e.g.: ["gut_health", "anti_inflammation"]
No explanation, no markdown.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const goals: string[] = JSON.parse(raw);
    return NextResponse.json({ goals });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
