import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

  let body: { text: string; lang: string; action: 'proofread' | 'rewrite' };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { text, lang, action } = body;
  if (!text?.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  const langName = LANG_NAMES[lang] ?? 'English';
  const client = new Anthropic({ apiKey });

  const prompt = action === 'proofread'
    ? `Proofread and fix grammar, spelling, and punctuation in the following ${langName} lab partner description. Keep the meaning and structure identical — only fix errors.

TEXT:
${text}

Return ONLY valid JSON: { "text": string }
Return ONLY the JSON object, no markdown, no explanation.`
    : `Rewrite and improve the following ${langName} lab partner description. Make it more professional, clear, and compelling for a precision health platform. Keep all factual information intact.

TEXT:
${text}

Return ONLY valid JSON: { "text": string }
Return ONLY the JSON object, no markdown, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
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
