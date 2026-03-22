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

  let body: { title?: string; description?: string; instructions?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title = '', description = '', instructions = '', language = 'en' } = body;
  if (!title && !description && !instructions) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  const langName = LANG_NAMES[language] ?? 'English';
  const client = new Anthropic({ apiKey });

  const prompt = `You are a professional recipe editor. Rewrite and proofread this recipe content in ${langName}. Fix grammar, spelling, and improve clarity. Use professional culinary language. Do NOT change the meaning or remove any information. Preserve ALL markdown formatting (**bold**, *italic*, ## headings, - bullet lists, 1. numbered lists, > blockquotes, --- horizontal rules). Preserve ALL photo references exactly as-is (![photo:1], ![photo:2], etc.). Return ONLY valid JSON.

TITLE: ${title}

DESCRIPTION: ${description}

INSTRUCTIONS:
${instructions}

Return ONLY valid JSON:
{
  "title": string,
  "description": string,
  "instructions": string
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
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
