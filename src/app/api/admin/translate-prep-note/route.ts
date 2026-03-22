import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en } = body;
  if (!name_en?.trim()) {
    return NextResponse.json({ error: 'name_en is required' }, { status: 400 });
  }

  const prompt = `Translate this cooking/food preparation term "${name_en}" into German (de), French (fr), Spanish (es), and Italian (it).
Use the most natural culinary term used by professional cooks in each language (e.g. "finely chopped" → "fein gehackt", "finement haché", "finamente picado", "finemente tritato").

Return ONLY valid JSON:
{
  "name_de": string,
  "name_fr": string,
  "name_es": string,
  "name_it": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
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
