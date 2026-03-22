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

  let body: { instructions?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { instructions = '', language = 'en' } = body;
  if (!instructions) {
    return NextResponse.json({ error: 'instructions is required' }, { status: 400 });
  }

  const langName = LANG_NAMES[language] ?? 'English';
  const client = new Anthropic({ apiKey });

  const prompt = `You are a recipe styling expert. Take these recipe instructions in ${langName} and enhance them with professional markdown formatting. Add **bold** for key ingredients and temperatures. Ensure steps are properly numbered. Add section headers (## Prep, ## Cook, ## Serve). Highlight tips with > quote blocks. Add --- dividers between major sections. Preserve ALL existing photo references (![photo:N]) exactly as-is. Do NOT change the actual content or recipe steps. Return ONLY valid JSON with a single "instructions" key.

CRITICAL: Use this exact section structure for ALL languages:
- ## Prep — only preparation steps like washing, chopping, measuring. If no distinct prep steps exist, leave this section empty with just the header and ---
- ## Cook — ALL cooking steps with numbered list
- ## Serve — plating and serving steps
Never put cooking steps under ## Prep. The section headers must ALWAYS be in English (## Prep, ## Cook, ## Serve) regardless of the recipe language — they are formatting markers, not translated text.

INSTRUCTIONS:
${instructions}

Return ONLY valid JSON:
{
  "instructions": string
}

Return ONLY the JSON object, no markdown wrapper, no explanation.`;

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
