import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

type NoteInput = {
  id: string;
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

  // Build compact list showing only what's missing per note
  const items = notes
    .map((n) => {
      const item: Record<string, unknown> = {
        id: n.id,
        name: n.name_en || n.name_de,
      };
      if (!n.name_fr) item.need_fr = true;
      if (!n.name_es) item.need_es = true;
      if (!n.name_it) item.need_it = true;
      return item;
    })
    .filter((item) => item.need_fr || item.need_es || item.need_it);

  if (items.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const prompt = `You are a culinary terminology expert. For each cooking preparation term, provide the missing translations into culinary French, Spanish, and/or Italian as indicated.

Use natural culinary language — not literal translations. For example: "finely chopped" → FR: "finement haché", ES: "finamente picado", IT: "finemente tritato".

Preparation terms to translate:
${JSON.stringify(items)}

Return ONLY a compact JSON array. Each element: {"id":"...","name_fr"?:"...","name_es"?:"...","name_it"?:"..."}
Include only the fields marked as needed. Only include notes that need at least one translation.
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
