import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { logAIUsage } from '@/lib/ai/usage-logger';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), { status: 500 });
  }

  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: string;
    lang?: string;
    mode?: 'briefing' | 'coach';
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { messages, context = '', lang = 'en', mode = 'briefing' } = body;
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: 'messages array is required' }), { status: 400 });
  }

  const LANG_NAMES: Record<string, string> = {
    en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  };

  const systemPrompt = mode === 'coach'
    ? `You are Evida's WFPB health coach — a friendly, knowledgeable assistant specializing in whole-food plant-based nutrition and longevity science.

STRICT GUARDRAILS (mandatory):
- Provide educational and wellness guidance only
- NEVER diagnose conditions, recommend medications, or provide clinical treatment advice
- ALWAYS encourage consulting a healthcare provider for clinical decisions
- Focus on lifestyle, nutrition, movement, and evidence-based wellness strategies

EXPERTISE: Whole-food plant-based nutrition, Daily Dozen tracking, longevity biomarkers, plant-based cooking, lifestyle medicine, general wellness.

TONE: Warm, encouraging, science-backed, practical. Like a knowledgeable friend, not a clinical authority.
LANGUAGE: Respond in ${LANG_NAMES[lang] ?? 'English'}.
RESPONSE LENGTH: Conversational, 2-4 sentences. Be helpful and actionable.

${context ? `USER CONTEXT:\n${context}` : ''}`
    : `You are Evida Life's health data assistant — helping users understand their biomarker results during their personalized health briefing.

STRICT GUARDRAILS (mandatory):
- Explain what biomarkers measure, what reference ranges mean, and general lifestyle factors that influence them
- NEVER diagnose medical conditions or diseases
- NEVER recommend specific medications or clinical treatments
- NEVER predict disease outcomes or prognosis
- ALWAYS encourage consulting a healthcare provider for clinical decisions
- You operate in the wellness/informational category

TONE: Clear, educational, reassuring. Explain complex concepts in plain language.
LANGUAGE: Respond in ${LANG_NAMES[lang] ?? 'English'}.
RESPONSE LENGTH: Concise, 2-5 sentences. Answer the specific question without overwhelming.

${context ? `USER'S BIOMARKER CONTEXT:\n${context}` : ''}`;

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const chatModel = 'claude-haiku-4-5-20251001';
  const chatStartMs = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: chatModel,
          max_tokens: 512,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        // Log usage after stream completes
        const finalMessage = await anthropicStream.finalMessage();
        logAIUsage({
          userId: user.id,
          provider: 'anthropic',
          endpoint: 'chat',
          model: chatModel,
          inputTokens: finalMessage.usage?.input_tokens ?? 0,
          outputTokens: finalMessage.usage?.output_tokens ?? 0,
          durationMs: Date.now() - chatStartMs,
          metadata: { lang, mode },
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
