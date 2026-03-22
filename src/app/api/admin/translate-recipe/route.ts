import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { title?: string; description?: string; instructions?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title = '', description = '', instructions = '' } = body;
  if (!title && !description && !instructions) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are translating recipe content from English to German for a Swiss/DACH audience. Maintain cooking terminology accurately. Use natural German phrasing. Convert any remaining US/imperial measurements to metric (e.g. °F→°C, cups→g/ml, oz→g).

Translate the following recipe fields from English to German:

TITLE: ${title}

DESCRIPTION: ${description}

INSTRUCTIONS:
${instructions}

Return ONLY valid JSON:
{
  "title_de": string,
  "description_de": string,
  "instructions_de": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
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
