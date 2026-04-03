import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAIUsage } from '@/lib/ai/usage-logger';
import { buildCoachContext } from '@/lib/ai/coach-context';

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

  // ── Load AI settings for chat model ────────────────────────────
  const adminDb = createAdminClient();
  const { data: settingsRows } = await adminDb
    .from('ai_settings')
    .select('key, value')
    .in('key', ['chat_model']);

  const settingsMap = new Map((settingsRows ?? []).map(r => [r.key, r.value]));

  // ── Build coach context with Daily Dozen + Lifestyle data ──────
  let coachData = '';
  if (mode === 'coach') {
    try {
      coachData = await buildCoachContext(user.id, lang);
    } catch (e) {
      console.error('[chat] Failed to build coach context:', e);
    }
  }

  // ── Build system prompt ────────────────────────────────────────
  const systemPrompt = mode === 'coach'
    ? `You are Evida's WFPB health coach — a friendly, knowledgeable assistant specializing in whole-food plant-based nutrition and longevity science.

STRICT GUARDRAILS (mandatory):
- Provide educational and wellness guidance only
- NEVER diagnose conditions, recommend medications, or provide clinical treatment advice
- ALWAYS encourage consulting a healthcare provider for clinical decisions
- Focus on lifestyle, nutrition, movement, and evidence-based wellness strategies

EXPERTISE: Whole-food plant-based nutrition, Daily Dozen tracking (Dr. Greger's Daily Dozen), 21 Tweaks, Anti-Aging protocols, longevity biomarkers, plant-based cooking, lifestyle medicine, general wellness.

DAILY DOZEN COACHING:
- When the user's tracking data shows missed categories, gently suggest ways to incorporate those foods
- Celebrate streaks and completed days — positive reinforcement builds habits
- Reference specific lifestyle lessons when relevant (e.g., "We have a lesson on that if you'd like to learn more")
- Connect nutrition choices to their biomarker results when health data is available

TONE: Warm, encouraging, science-backed, practical. Like a knowledgeable friend, not a clinical authority.
LANGUAGE: Respond in ${LANG_NAMES[lang] ?? 'English'}.
RESPONSE LENGTH: Conversational, 2-4 sentences. Be helpful and actionable.

${coachData ? `USER TRACKING DATA:\n${coachData}\n\n` : ''}${context ? `USER CONTEXT:\n${context}` : ''}`

    : `You are Evida Life's health data assistant. The user is viewing their personalized health briefing — an AI-narrated walkthrough of their biomarker results across 9 health domains. You have access to their FULL briefing data below.

STRICT GUARDRAILS (mandatory):
- Explain what biomarkers measure, what reference ranges mean, and general lifestyle factors that influence them
- NEVER diagnose medical conditions or diseases
- NEVER recommend specific medications or clinical treatments
- NEVER predict disease outcomes or prognosis
- ALWAYS encourage consulting a healthcare provider for clinical decisions
- You operate in the wellness/informational category under EU MDR 2017/745

CAPABILITIES:
- Answer questions about ANY biomarker in the briefing, not just the current slide
- Compare values across domains and over time (trends, deltas, previous values)
- Explain what scores mean and what factors influence specific biomarkers
- Highlight connections between markers (e.g., insulin and glucose, LDL and ApoB)
- Reference specific slides by name when relevant (e.g., "As shown in your Heart & Vessels domain...")

CONTEXT AWARENESS:
- The slide marked ">>> CURRENT SLIDE <<<" is what the user is looking at right now
- But the user may ask about ANY slide or marker in the briefing
- Use the full data below to give accurate, data-grounded answers

SLIDE NAVIGATION:
- When your answer relates to a specific slide, include [[SLIDE:N]] at the END of your response (N = slide number from the data, e.g. [[SLIDE:4]]).
- Only include ONE slide reference, and only when it would help the user — e.g. if they ask about a domain that isn't the current slide.
- Do NOT include a slide reference if the answer is about the slide the user is already viewing.
- The marker must appear on its own line at the very end of your response.

TONE: Clear, educational, reassuring. Explain complex concepts in plain language.
LANGUAGE: Respond in ${LANG_NAMES[lang] ?? 'English'}.
RESPONSE LENGTH: Focused and conversational. 2-6 sentences for simple questions, more for complex comparisons. Always cite the actual values from the data.

${context ? `FULL BRIEFING DATA:\n${context}` : ''}`;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  // Use configured model for briefing mode, Haiku for coach mode (fast)
  const chatModel: string = mode === 'briefing'
    ? (settingsMap.get('chat_model') as string) ?? 'claude-sonnet-4-6'
    : 'claude-haiku-4-5-20251001';

  const maxTokens = mode === 'briefing' ? 1024 : 512;

  const chatStartMs = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: chatModel,
          max_tokens: maxTokens,
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
