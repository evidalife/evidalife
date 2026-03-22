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

  let body: { title?: string; description?: string; instructions?: string; source_language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title = '', description = '', instructions = '', source_language = 'en' } = body;
  if (!title && !description && !instructions) {
    return NextResponse.json({ error: 'At least one field is required' }, { status: 400 });
  }

  const sourceName = LANG_NAMES[source_language] ?? 'English';
  const targetLangs = (['de', 'en', 'fr', 'es', 'it'] as const).filter(l => l !== source_language);
  const targetNames = targetLangs.map(l => `${LANG_NAMES[l]} (${l})`).join(', ');

  const client = new Anthropic({ apiKey });

  const prompt = `Translate this recipe content from ${sourceName} to: ${targetNames}.
For German, use Swiss/DACH conventions and culinary terms. For all languages, use natural phrasing.
Convert any remaining US/imperial measurements to metric (°F→°C, cups→g/ml, oz→g, lb→g).

IMPORTANT formatting rules:
- Preserve ALL markdown formatting exactly: **bold**, *italic*, ## headings, - bullet lists, 1. numbered lists, > blockquotes, --- horizontal rules
- Preserve ALL photo references exactly as written, character for character: ![photo:1], ![photo:2], etc.
- Do NOT translate, modify, or remove any markdown syntax or photo references
- Translate only the human-readable text content

TITLE: ${title}

DESCRIPTION: ${description}

INSTRUCTIONS:
${instructions}

Return ONLY valid JSON:
{
  "translations": {
${targetLangs.map(l => `    "${l}": { "title": string, "description": string, "instructions": string }`).join(',\n')}
  }
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
