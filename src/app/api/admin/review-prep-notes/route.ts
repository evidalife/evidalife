import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type NoteInput = {
  id: string;
  slug: string;
  is_common: boolean;
  name_en: string;
  name_de: string;
  name_fr: string;
  name_es: string;
  name_it: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { notes: NoteInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { notes } = body;
  if (!Array.isArray(notes) || notes.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Build compact list showing each note's state and what it needs
  const items = notes
    .map((n) => {
      const item: Record<string, unknown> = { id: n.id };

      // Provide context
      if (n.name_en) item.name_en = n.name_en;
      if (n.name_de) item.name_de = n.name_de;
      if (n.name_fr) item.name_fr = n.name_fr;
      if (n.name_es) item.name_es = n.name_es;
      if (n.name_it) item.name_it = n.name_it;
      if (n.slug) item.slug = n.slug;
      item.is_common = n.is_common;

      // What's missing
      if (!n.name_de) item.need_name_de = true;
      if (!n.name_fr) item.need_name_fr = true;
      if (!n.name_es) item.need_name_es = true;
      if (!n.name_it) item.need_name_it = true;
      if (!n.slug) item.need_slug = true;

      return item;
    })
    .filter((item) =>
      item.need_name_de || item.need_name_fr || item.need_name_es || item.need_name_it || item.need_slug
    );

  if (items.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const prompt = `You are a culinary terminology expert. For each cooking preparation note, fill in the missing fields as indicated by the "need_*" flags.

Use natural culinary language — not literal word-for-word translations. For example: "finely chopped" → DE: "fein gehackt", FR: "finement haché", ES: "finamente picado", IT: "finemente tritato".
For slug: lowercase, hyphenated, URL-safe version of the EN name (e.g. "finely-chopped").

Prep notes to complete:
${JSON.stringify(items)}

Return ONLY a compact JSON array. Each element must have "id" plus only the fields that were needed:
{"id":"...","name_de"?:"...","name_fr"?:"...","name_es"?:"...","name_it"?:"...","slug"?:"..."}
Only include notes that needed at least one field. No markdown, no explanation.`;

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
