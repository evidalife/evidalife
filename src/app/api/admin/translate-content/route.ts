import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian',
};

/**
 * Generic content translation endpoint.
 * Accepts a dictionary of fields to translate + source language,
 * returns translations for all other languages.
 *
 * Body: { fields: Record<string, string>, source_language: string, context?: string }
 * Returns: { translations: Record<lang, Record<fieldKey, string>> }
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { fields?: Record<string, string>; source_language?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fields = {}, source_language = 'en', context = '' } = body;
  const fieldKeys = Object.keys(fields).filter(k => fields[k]?.trim());
  if (fieldKeys.length === 0) {
    return NextResponse.json({ error: 'At least one non-empty field is required' }, { status: 400 });
  }

  const sourceName = LANG_NAMES[source_language] ?? 'English';
  const targetLangs = (['de', 'en', 'fr', 'es', 'it'] as const).filter(l => l !== source_language);
  const targetNames = targetLangs.map(l => `${LANG_NAMES[l]} (${l})`).join(', ');

  const fieldsBlock = fieldKeys.map(k => `${k}: ${fields[k]}`).join('\n\n');
  const contextHint = context ? `\nContext: ${context}` : '';

  const client = new Anthropic({ apiKey });

  const prompt = `Translate the following content from ${sourceName} to: ${targetNames}.
For German, use Swiss/DACH conventions. For all languages, use natural, culturally appropriate phrasing.
${contextHint}

${fieldsBlock}

Return ONLY valid JSON with this structure:
{
  "translations": {
${targetLangs.map(l => `    "${l}": { ${fieldKeys.map(k => `"${k}": "translated text"`).join(', ')} }`).join(',\n')}
  }
}

Return ONLY the JSON object, no markdown fences, no explanation.`;

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
