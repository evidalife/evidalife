import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { name_en?: string; short_description_en?: string; description_en?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name_en = '', short_description_en = '', description_en = '' } = body;
  if (!name_en) {
    return NextResponse.json({ error: 'name_en is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Translate this product name, short description, and description from English to German (de), French (fr), Spanish (es), and Italian (it).
Use natural, fluent phrasing appropriate for a health and longevity testing platform.

NAME: ${name_en}
SHORT DESCRIPTION: ${short_description_en}
DESCRIPTION: ${description_en}

Return ONLY valid JSON:
{
  "name_de": string,
  "name_fr": string,
  "name_es": string,
  "name_it": string,
  "short_description_de": string,
  "short_description_fr": string,
  "short_description_es": string,
  "short_description_it": string,
  "description_de": string,
  "description_fr": string,
  "description_es": string,
  "description_it": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 768,
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
