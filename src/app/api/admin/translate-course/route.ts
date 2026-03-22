import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { title_en?: string; description_en?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title_en = '', description_en = '' } = body;
  if (!title_en) {
    return NextResponse.json({ error: 'title_en is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Translate this course title and description from English to French (fr), Spanish (es), and Italian (it).
Use natural, fluent phrasing appropriate for an evidence-based health education platform.

TITLE: ${title_en}
DESCRIPTION: ${description_en}

Return ONLY valid JSON:
{
  "title_fr": string,
  "title_es": string,
  "title_it": string,
  "description_fr": string,
  "description_es": string,
  "description_it": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

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
