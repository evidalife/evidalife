import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian',
};

/**
 * Generic content rewrite & proofread endpoint.
 * Accepts a dictionary of fields + language + context.
 * Returns polished versions of the same fields.
 *
 * Body: { fields: Record<string, string>, language: string, context?: string }
 * Returns: { [fieldKey]: string }
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { fields?: Record<string, string>; language?: string; context?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { fields = {}, language = 'en', context = '' } = body;
  const fieldKeys = Object.keys(fields).filter(k => fields[k]?.trim());
  if (fieldKeys.length === 0) {
    return NextResponse.json({ error: 'At least one non-empty field is required' }, { status: 400 });
  }

  const langName = LANG_NAMES[language] ?? 'English';
  const contextHint = context ? `\nContext: ${context}` : '';
  const fieldsBlock = fieldKeys.map(k => `${k}: ${fields[k]}`).join('\n\n');

  const client = new Anthropic({ apiKey });

  const prompt = `You are a professional editor for a health and wellness platform. Rewrite and proofread the following content in ${langName}. Fix grammar, spelling, and improve clarity. Use professional but accessible language. Do NOT change the meaning or remove information. Keep the text concise.
${contextHint}

${fieldsBlock}

Return ONLY valid JSON:
{
${fieldKeys.map(k => `  "${k}": "rewritten text"`).join(',\n')}
}

Return ONLY the JSON object, no markdown fences, no explanation.`;

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
