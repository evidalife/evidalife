import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type UnitInput = {
  id: string;
  name_en: string;
  name_de: string;
  name_fr: string;
  name_es: string;
  name_it: string;
  abbrev_en: string;
  abbrev_de: string;
  abbrev_fr: string;
  abbrev_es: string;
  abbrev_it: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { units: UnitInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { units } = body;
  if (!Array.isArray(units) || units.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Build compact list showing only what's missing per unit
  const items = units
    .map((u) => {
      const item: Record<string, unknown> = {
        id: u.id,
        name: u.name_en || u.name_de,
        abbrev: u.abbrev_en || u.abbrev_de || undefined,
      };
      if (!u.name_fr) item.need_name_fr = true;
      if (!u.name_es) item.need_name_es = true;
      if (!u.name_it) item.need_name_it = true;
      if (u.abbrev_en && !u.abbrev_fr) item.need_abbrev_fr = true;
      if (u.abbrev_en && !u.abbrev_es) item.need_abbrev_es = true;
      if (u.abbrev_en && !u.abbrev_it) item.need_abbrev_it = true;
      return item;
    })
    .filter((item) =>
      item.need_name_fr || item.need_name_es || item.need_name_it ||
      item.need_abbrev_fr || item.need_abbrev_es || item.need_abbrev_it
    );

  if (items.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const prompt = `You are a culinary and scientific measurement expert. For each measurement unit, provide the missing translations into French, Spanish, and/or Italian as indicated.

Use standard culinary/scientific terminology for names and abbreviations. Follow local conventions for abbreviations (e.g. "EL" for Esslöffel in German, "c. à s." for tablespoon in French).

Units to translate:
${JSON.stringify(items)}

Return ONLY a compact JSON array. Each element:
{"id":"...","name_fr"?:"...","name_es"?:"...","name_it"?:"...","abbrev_fr"?:"...","abbrev_es"?:"...","abbrev_it"?:"..."}
Include only the fields marked as needed. Only include units that need at least one translation.
No markdown, no explanation.`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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
