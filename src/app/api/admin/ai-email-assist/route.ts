import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { logAIUsage } from '@/lib/ai/usage-logger';

type Action = 'translate' | 'proofread' | 'rewrite';

type EmailContent = {
  subject: string;
  heading: string;
  body: string;
  buttonText: string;
  footerNote: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { action?: Action; content?: EmailContent; sourceLang?: string; tone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, content, sourceLang = 'en', tone = 'professional' } = body;
  if (!action || !content) {
    return NextResponse.json({ error: 'action and content are required' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const contentJson = JSON.stringify(content, null, 2);

  let prompt = '';

  if (action === 'translate') {
    prompt = `You are an expert multilingual copywriter specializing in health and wellness brands. Translate the following email template content from ${sourceLang} into all 5 languages: en (English), de (German), fr (French), es (Spanish), it (Italian).

Input content:
${contentJson}

Rules:
- Keep the brand name "Evida Life" unchanged in all languages
- Keep "{{ .ConfirmationURL }}" unchanged if it appears
- Maintain the same tone and formality level appropriate for each language (German: "du" informal, French: "vous" formal)
- Subject lines should be punchy and localized, not literal translations
- Return ONLY valid JSON with this exact structure:
{
  "en": { "subject": "...", "heading": "...", "body": "...", "buttonText": "...", "footerNote": "..." },
  "de": { ... },
  "fr": { ... },
  "es": { ... },
  "it": { ... }
}`;
  } else if (action === 'proofread') {
    prompt = `You are an expert copywriter and proofreader specializing in health and wellness brands (language: ${sourceLang}). Review the following email template content for grammar, spelling, punctuation, clarity, and tone. The brand is "Evida Life" — a premium longevity health platform.

Input content:
${contentJson}

Return ONLY valid JSON with this exact structure:
{
  "corrected": { "subject": "...", "heading": "...", "body": "...", "buttonText": "...", "footerNote": "..." },
  "changes": ["Description of change 1", "Description of change 2", ...]
}

If no changes are needed for a field, keep it identical to the input. If no changes at all, return an empty "changes" array.`;
  } else if (action === 'rewrite') {
    prompt = `You are an expert email copywriter specializing in health and wellness brands. Rewrite the following email template content in a ${tone} tone. The brand is "Evida Life" — a premium precision longevity health platform targeting health-conscious adults in DACH region. Language: ${sourceLang}.

Input content:
${contentJson}

Tone guidelines:
- professional: authoritative, clear, trustworthy — like a premium Swiss health brand
- friendly: warm, encouraging, personal — like a supportive health coach
- concise: ultra-short, action-oriented — every word earns its place

Return ONLY valid JSON with this exact structure:
{
  "rewritten": { "subject": "...", "heading": "...", "body": "...", "buttonText": "...", "footerNote": "..." }
}`;
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const emailStartMs = Date.now();

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0];
    if (text.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    // Log usage
    logAIUsage({
      userId: null, // admin endpoint, no specific user
      provider: 'anthropic',
      endpoint: 'email-assist',
      model: 'claude-sonnet-4-6',
      inputTokens: message.usage?.input_tokens ?? 0,
      outputTokens: message.usage?.output_tokens ?? 0,
      durationMs: Date.now() - emailStartMs,
      metadata: { action, sourceLang },
    });

    const raw = text.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
