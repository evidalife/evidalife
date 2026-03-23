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

  let body: { name?: string; short_description?: string; description?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name = '', short_description = '', description = '', language = 'en' } = body;
  if (!name && !short_description && !description) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  const langName = LANG_NAMES[language] ?? 'English';
  const client = new Anthropic({ apiKey });

  const prompt = `You are a professional copywriter for a premium health and longevity brand. Rewrite and proofread the following product content in ${langName}.

Goals:
- Fix grammar, spelling, and punctuation
- Improve clarity and flow
- Make the copy more compelling and premium-feeling
- Keep the name concise and punchy
- Make the short description a strong one-liner (max 120 chars)
- Preserve all facts, numbers, and key information in the description
- Preserve any existing markdown formatting in the description
- Keep the same language (${langName})

NAME: ${name}

SHORT DESCRIPTION: ${short_description}

DESCRIPTION:
${description}

Return ONLY valid JSON:
{
  "name": string,
  "short_description": string,
  "description": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

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
