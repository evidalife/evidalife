import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en: string; abbrev_en?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en, abbrev_en } = body;
  if (!name_en?.trim()) {
    return NextResponse.json({ error: 'name_en is required' }, { status: 400 });
  }

  const prompt = `You are a culinary and scientific measurement expert. Translate the following measurement unit name and abbreviation into German, French, Spanish, and Italian.

Use standard culinary/scientific terminology. Abbreviations should follow local conventions (e.g. "c. à s." for tablespoon in French, "EL" for Esslöffel in German).

Unit name (EN): "${name_en}"
${abbrev_en ? `Abbreviation (EN): "${abbrev_en}"` : ''}

Return ONLY a compact JSON object with these fields (omit abbreviation fields if no abbreviation was provided):
{"name_de":"...","name_fr":"...","name_es":"...","name_it":"...","abbrev_de":"...","abbrev_fr":"...","abbrev_es":"...","abbrev_it":"..."}

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
