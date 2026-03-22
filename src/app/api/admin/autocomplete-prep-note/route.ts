import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type Body = {
  name_en?: string;
  name_de?: string;
  name_fr?: string;
  name_es?: string;
  name_it?: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const hasName = body.name_en || body.name_de || body.name_fr || body.name_es || body.name_it;
  if (!hasName) {
    return NextResponse.json({ error: 'At least one name field is required' }, { status: 400 });
  }

  const nameParts: string[] = [];
  if (body.name_en) nameParts.push(`EN="${body.name_en}"`);
  if (body.name_de) nameParts.push(`DE="${body.name_de}"`);
  if (body.name_fr) nameParts.push(`FR="${body.name_fr}"`);
  if (body.name_es) nameParts.push(`ES="${body.name_es}"`);
  if (body.name_it) nameParts.push(`IT="${body.name_it}"`);

  const prompt = `You are a culinary terminology expert.
Identify the cooking preparation note from the provided names, then return the complete set in all 5 languages plus a URL slug and is_common flag.

Provided names: ${nameParts.join(', ')}

Return ONLY a compact JSON object:
{"name_en":"...","name_de":"...","name_fr":"...","name_es":"...","name_it":"...","slug":"...","is_common":true}

slug: lowercase hyphenated URL-safe version of the EN name (e.g. "finely-chopped").
is_common: true if this is a commonly used preparation note in everyday recipes, false otherwise.
Use natural culinary language — not literal word-for-word translations.
No markdown, no explanation.`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
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
