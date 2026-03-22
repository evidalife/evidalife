import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type UnitInput = {
  id: string;
  code: string;
  category: string;
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

  // Build compact list showing each unit's current state and what it needs
  const items = units
    .map((u) => {
      const item: Record<string, unknown> = { id: u.id };

      // Provide context (what we know)
      if (u.name_en) item.name_en = u.name_en;
      if (u.name_de) item.name_de = u.name_de;
      if (u.name_fr) item.name_fr = u.name_fr;
      if (u.name_es) item.name_es = u.name_es;
      if (u.name_it) item.name_it = u.name_it;
      if (u.abbrev_en) item.abbrev_en = u.abbrev_en;
      if (u.abbrev_de) item.abbrev_de = u.abbrev_de;
      if (u.abbrev_fr) item.abbrev_fr = u.abbrev_fr;
      if (u.abbrev_es) item.abbrev_es = u.abbrev_es;
      if (u.abbrev_it) item.abbrev_it = u.abbrev_it;
      if (u.category) item.category = u.category;
      if (u.code) item.code = u.code;

      // What's missing
      if (!u.name_de) item.need_name_de = true;
      if (!u.name_fr) item.need_name_fr = true;
      if (!u.name_es) item.need_name_es = true;
      if (!u.name_it) item.need_name_it = true;

      const hasAnyAbbrev = u.abbrev_en || u.abbrev_de || u.abbrev_fr || u.abbrev_es || u.abbrev_it;
      if (hasAnyAbbrev) {
        if (!u.abbrev_en) item.need_abbrev_en = true;
        if (!u.abbrev_de) item.need_abbrev_de = true;
        if (!u.abbrev_fr) item.need_abbrev_fr = true;
        if (!u.abbrev_es) item.need_abbrev_es = true;
        if (!u.abbrev_it) item.need_abbrev_it = true;
      }

      if (!u.category) item.need_category = true;

      return item;
    })
    .filter((item) =>
      item.need_name_de || item.need_name_fr || item.need_name_es || item.need_name_it ||
      item.need_abbrev_en || item.need_abbrev_de || item.need_abbrev_fr || item.need_abbrev_es || item.need_abbrev_it ||
      item.need_category
    );

  if (items.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const prompt = `You are a culinary and scientific measurement expert. For each measurement unit, fill in the missing fields as indicated by the "need_*" flags.

Use standard culinary/scientific terminology for names and abbreviations. Follow local conventions (e.g. "EL" for Esslöffel in German, "c. à s." for tablespoon in French). For category, use one of: volume, weight, count, length, temperature, time, or other.

Units to complete:
${JSON.stringify(items)}

Return ONLY a compact JSON array. Each element must have "id" plus only the fields that were needed:
{"id":"...","name_de"?:"...","name_fr"?:"...","name_es"?:"...","name_it"?:"...","abbrev_en"?:"...","abbrev_de"?:"...","abbrev_fr"?:"...","abbrev_es"?:"...","abbrev_it"?:"...","category"?:"..."}
Only include units that needed at least one field. No markdown, no explanation.`;

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
