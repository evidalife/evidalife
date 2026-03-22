import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { title_en?: string; excerpt_en?: string; seo_title_en?: string; seo_description_en?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title_en = '', excerpt_en = '', seo_title_en = '', seo_description_en = '' } = body;
  if (!title_en) {
    return NextResponse.json({ error: 'title_en is required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Translate this article metadata from English to French (fr), Spanish (es), and Italian (it).
Use natural, fluent phrasing appropriate for a health and nutrition platform.

TITLE: ${title_en}
EXCERPT: ${excerpt_en}
SEO_TITLE: ${seo_title_en}
SEO_DESCRIPTION: ${seo_description_en}

Return ONLY valid JSON:
{
  "title_fr": string,
  "title_es": string,
  "title_it": string,
  "excerpt_fr": string,
  "excerpt_es": string,
  "excerpt_it": string,
  "seo_title_fr": string,
  "seo_title_es": string,
  "seo_title_it": string,
  "seo_description_fr": string,
  "seo_description_es": string,
  "seo_description_it": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
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
