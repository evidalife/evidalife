import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type Body = {
  name_en?: string; name_de?: string; name_fr?: string; name_es?: string; name_it?: string;
  abbrev_en?: string; abbrev_de?: string; abbrev_fr?: string; abbrev_es?: string; abbrev_it?: string;
  max_sort_order?: number;
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

  const abbrevParts: string[] = [];
  if (body.abbrev_en) abbrevParts.push(`EN="${body.abbrev_en}"`);
  if (body.abbrev_de) abbrevParts.push(`DE="${body.abbrev_de}"`);
  if (body.abbrev_fr) abbrevParts.push(`FR="${body.abbrev_fr}"`);
  if (body.abbrev_es) abbrevParts.push(`ES="${body.abbrev_es}"`);
  if (body.abbrev_it) abbrevParts.push(`IT="${body.abbrev_it}"`);

  const nextSortOrder = (body.max_sort_order ?? 0) + 10;

  const prompt = `You are a culinary and scientific measurement expert.
Identify the measurement unit from the provided names/abbreviations, then return the complete set in all 5 languages plus metadata.
Use standard culinary/scientific terminology. Abbreviations should follow local conventions.

Provided names: ${nameParts.join(', ')}
${abbrevParts.length > 0 ? `Provided abbreviations: ${abbrevParts.join(', ')}` : ''}

Return ONLY a compact JSON object with these exact keys:
{"name_en":"...","name_de":"...","name_fr":"...","name_es":"...","name_it":"...","abbrev_en":"...","abbrev_de":"...","abbrev_fr":"...","abbrev_es":"...","abbrev_it":"...","code":"...","category":"...","sort_order":${nextSortOrder}}

Rules:
- code: short lowercase identifier, e.g. "tbsp", "bag", "btl", "piece" (max 10 chars)
- category: one of exactly "weight", "volume", "count", "other"
- sort_order: use ${nextSortOrder} (next logical number after current max)
- If a unit has no standard abbreviation in a given language, use an empty string for that abbrev field.
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
