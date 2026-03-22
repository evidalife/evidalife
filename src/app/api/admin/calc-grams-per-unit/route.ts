import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en?: string; unit_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en = '', unit_code = '' } = body;
  if (!name_en.trim() || !unit_code.trim()) {
    return NextResponse.json({ error: 'name_en and unit_code are required' }, { status: 400 });
  }

  const prompt = `Given the ingredient "${name_en}" with default measurement unit "${unit_code}", return the average weight in grams for ONE unit.

Examples: 1 jalapeño pepper (stk/piece) = 14g, 1 garlic clove (zehe) = 5g, 1 tablespoon of honey (el) = 21g, 1 teaspoon of salt (tl) = 6g, 1 bunch of parsley (bund) = 30g.

Return ONLY valid JSON: { "grams_per_unit": number }`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 64,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const result: { grams_per_unit: number } = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
