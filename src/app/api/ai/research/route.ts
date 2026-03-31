// src/app/api/ai/research/route.ts
// Streaming RAG endpoint for the Research Engine
//
// POST { question, biomarkerContext? }
// Streams: text/event-stream with "data: ..." chunks
//   - type: "citations"  — JSON array of StudyResult (sent first)
//   - type: "text"       — streamed answer token
//   - type: "done"       — end of stream

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { searchStudiesAdmin } from '@/lib/research/search';
import { formatCitation, pubmedUrl } from '@/lib/research/search';
import type { StudyResult } from '@/lib/research/search';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are Evida Research — an AI assistant that synthesizes peer-reviewed scientific research on nutrition, longevity, and health. You have access to thousands of studies from PubMed and other curated sources.

Your role:
- Synthesize the provided research studies into a clear, evidence-based answer
- Cite specific papers inline using [Author et al., Year] format
- Present findings objectively, noting where evidence is strong vs. preliminary
- Use accessible language while maintaining scientific accuracy
- Highlight practical implications for the user's health

Critical safety rules:
- You provide EDUCATIONAL INFORMATION ONLY — not medical advice
- Never diagnose conditions, prescribe treatments, or replace professional healthcare
- Always note that users should consult their doctor for personal health decisions
- Acknowledge when evidence is limited, mixed, or preliminary

Response format:
- Start directly with the key finding (no preamble)
- Use short paragraphs — one idea per paragraph
- Bold key terms and important findings
- End with a brief practical takeaway
- Keep total length to 200-400 words unless the topic requires more depth`;

function buildResearchPrompt(
  question: string,
  studies: StudyResult[],
  biomarkerContext?: string
): string {
  const studyContext = studies
    .map((s, i) => {
      const citation = formatCitation(s);
      return `[${i + 1}] ${citation}
Journal: ${s.journal ?? 'Unknown journal'}${s.publication_year ? ` (${s.publication_year})` : ''}
Abstract: ${s.abstract.slice(0, 800)}${s.abstract.length > 800 ? '...' : ''}`;
    })
    .join('\n\n---\n\n');

  const bioContext = biomarkerContext
    ? `\n\nUser's biomarker context:\n${biomarkerContext}\n`
    : '';

  return `${bioContext}
Research question: ${question}

Here are the ${studies.length} most relevant studies from the research database:

${studyContext}

Based on these studies, please provide a clear, evidence-based answer to the research question. Cite the studies using their author/year format from above.`;
}

function sseChunk(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`;
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_API_KEY) return new Response('ANTHROPIC_API_KEY not configured', { status: 500 });
  if (!OPENAI_API_KEY) return new Response('OPENAI_API_KEY not configured', { status: 500 });

  let question: string;
  let biomarkerContext: string | undefined;

  try {
    const body = await req.json();
    question = body.question?.trim();
    biomarkerContext = body.biomarkerContext;
    if (!question) return new Response('question is required', { status: 400 });
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  // Stream setup
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (chunk: string) => {
    await writer.write(encoder.encode(chunk));
  };

  // Run async in background, streaming to client
  (async () => {
    try {
      // 1. Vector search for relevant studies
      const studies = await searchStudiesAdmin(question, OPENAI_API_KEY, {
        limit: 15,
        minSimilarity: 0.25,
      });

      if (studies.length === 0) {
        // No studies found — answer from general knowledge with disclaimer
        await send(sseChunk('citations', []));
        await send(sseChunk('text', "I couldn't find closely matching studies in the research database for this specific question. "));
        await send(sseChunk('text', "The database is still growing — try rephrasing your question or asking about a related topic like dietary interventions, specific biomarkers, or lifestyle factors."));
        await send(sseChunk('done', null));
        await writer.close();
        return;
      }

      // 2. Send citations to client immediately (before synthesis starts)
      const citationsPayload = studies.map(s => ({
        pmid: s.pmid,
        title: s.title,
        authors: s.authors,
        journal: s.journal,
        publication_year: s.publication_year,
        doi: s.doi,
        similarity: Math.round(s.similarity * 100),
        url: pubmedUrl(s.pmid),
        citation: formatCitation(s),
      }));
      await send(sseChunk('citations', citationsPayload));

      // 3. Stream Claude synthesis
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const prompt = buildResearchPrompt(question, studies, biomarkerContext);

      const claudeStream = await client.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });

      for await (const chunk of claudeStream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          await send(sseChunk('text', chunk.delta.text));
        }
      }

      await send(sseChunk('done', null));
    } catch (err: any) {
      await send(sseChunk('error', err.message ?? 'Unknown error'));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
