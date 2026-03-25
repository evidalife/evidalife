import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  let body: { sourceText: string; sourceLang: string; targetLangs: string[]; context?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { sourceText, sourceLang, targetLangs } = body;
  if (!sourceText?.trim()) return NextResponse.json({ error: 'sourceText is required' }, { status: 400 });
  if (!targetLangs?.length) return NextResponse.json({ error: 'targetLangs is required' }, { status: 400 });

  const sourceName = LANG_NAMES[sourceLang] ?? 'English';
  const targetNames = targetLangs.map((l) => `${LANG_NAMES[l] ?? l} (${l})`).join(', ');
  const client = new Anthropic({ apiKey });

  const keys = targetLangs.map((l) => `  "${l}": string`).join(',\n');
  const prompt = `Translate this lab partner description from ${sourceName} into: ${targetNames}.
Use natural, professional language appropriate for a health and longevity testing platform.

SOURCE (${sourceName}):
${sourceText}

Return ONLY valid JSON:
{
${keys}
}

Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const content = message.content[0];
    if (content.type !== 'text') return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    const raw = content.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return NextResponse.json(JSON.parse(raw));
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
