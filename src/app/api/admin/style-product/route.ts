import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { description?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { description = '', language = 'en' } = body;
  if (!description) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 });
  }

  const langName = LANG_NAMES[language] ?? 'English';
  const client = new Anthropic({ apiKey });

  const prompt = `You are a product copy editor for a premium health and longevity brand. Enhance this product description in ${langName} with markdown formatting to make it more scannable and compelling.

Guidelines:
- Add ## section headers for major topics (e.g. ## What's included, ## Benefits, ## How it works)
- Use **bold** for key benefits, important terms, and numbers
- Use bullet lists (- item) for feature lists
- Use numbered lists (1. step) for process/how-to content
- Add > blockquote blocks for important notes or callouts
- Preserve ALL existing content — do not remove or change facts
- Keep the same language (${langName})

DESCRIPTION:
${description}

Return ONLY valid JSON:
{
  "description": string
}

Return ONLY the JSON object, no markdown wrapper, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
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
