// src/app/api/ai/research/route.ts
// Streaming RAG endpoint for the Research Engine
//
// POST { question, biomarkerContext?, flaggedMarkers?, diseaseTag? }
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
import { getResearchQuestion, getMappingBySlug } from '@/lib/research/biomarker-mapper';
import { getDiseaseLabel } from '@/lib/research/disease-mapper';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Flagged marker passed from briefing AI
interface FlaggedMarker {
  slug: string;
  name: string;
  value: number;
  unit: string;
  status: string; // 'risk' | 'borderline'
}

const SYSTEM_PROMPT = `You are Evida Research — an AI assistant that synthesises peer-reviewed scientific research on nutrition, longevity, and health. You have access to thousands of studies from PubMed and other curated sources.

Your role:
- Synthesise the provided research studies into a clear, evidence-based answer
- Cite specific papers inline using [Author et al., Year] format
- Present findings objectively, noting where evidence is strong vs. preliminary
- Use accessible language while maintaining scientific accuracy
- Highlight practical implications for the user's health

Critical safety rules:
- You provide EDUCATIONAL INFORMATION ONLY — not medical advice
- Never diagnose conditions, prescribe treatments, or replace professional healthcare
- Always note that users should consult their doctor for personal health decisions
- Acknowledge when evidence is limited, mixed, or preliminary
- Per EU MDR 2017/745: nutrition research is supplementary to medical treatment, not a replacement

Response format:
- Start directly with the key finding (no preamble)
- Use short paragraphs — one idea per paragraph
- Bold key terms and important findings
- End with a brief practical takeaway
- Keep total length to 200-400 words unless the topic requires more depth`;

const BRIEFING_SYSTEM_PROMPT = `You are Evida Research — an AI assistant helping users understand the research behind their flagged biomarkers. The user's health briefing identified out-of-range biomarkers and you are now providing the scientific context.

Your role:
- Explain what each flagged biomarker means and why it matters
- Cite the specific studies provided, using [Author et al., Year] format
- Focus on actionable, nutrition-based and lifestyle interventions supported by evidence
- Rank interventions by strength of evidence (meta-analyses > RCTs > observational)
- Be encouraging — frame findings as opportunities, not threats

Critical safety rules:
- You provide EDUCATIONAL INFORMATION ONLY — not medical advice
- Never diagnose conditions, prescribe treatments, or replace professional healthcare
- Always note that users should consult their doctor for personal health decisions
- Per EU MDR 2017/745: nutrition research is supplementary to medical treatment, not a replacement

Response format:
- Group findings by biomarker if multiple are flagged
- Use short paragraphs with bold biomarker names as headers
- For each biomarker: what it means → what research says → practical takeaway
- End with a combined action summary
- Keep total length proportional to the number of flagged markers (150-250 words per marker)`;

function buildResearchPrompt(
  question: string,
  studies: StudyResult[],
  biomarkerContext?: string
): string {
  const studyContext = studies
    .map((s, i) => {
      const citation = formatCitation(s);
      const tierLabel = s.quality_tier
        ? ['', 'Greger-cited', 'Systematic Review/Meta-analysis', 'RCT', 'Cohort/Observational', 'Other'][s.quality_tier] ?? ''
        : '';
      return `[${i + 1}] ${citation}
Journal: ${s.journal ?? 'Unknown journal'}${s.publication_year ? ` (${s.publication_year})` : ''}${tierLabel ? `\nEvidence level: ${tierLabel}` : ''}
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

function buildBriefingResearchPrompt(
  flaggedMarkers: FlaggedMarker[],
  studiesByMarker: Map<string, StudyResult[]>
): string {
  const sections: string[] = [];

  for (const marker of flaggedMarkers) {
    const studies = studiesByMarker.get(marker.slug) ?? [];
    if (studies.length === 0) continue;

    const mapping = getMappingBySlug(marker.slug);
    const label = mapping?.label ?? marker.name;

    const studyContext = studies.map((s, i) => {
      const citation = formatCitation(s);
      const tierLabel = s.quality_tier
        ? ['', 'Greger-cited', 'Systematic Review/Meta-analysis', 'RCT', 'Cohort/Observational', 'Other'][s.quality_tier] ?? ''
        : '';
      return `  [${i + 1}] ${citation}
  Journal: ${s.journal ?? 'Unknown journal'}${s.publication_year ? ` (${s.publication_year})` : ''}${tierLabel ? `\n  Evidence level: ${tierLabel}` : ''}
  Abstract: ${s.abstract.slice(0, 600)}${s.abstract.length > 600 ? '...' : ''}`;
    }).join('\n\n');

    sections.push(
      `## ${label}: ${marker.value} ${marker.unit} (${marker.status})\n` +
      `Research question: ${getResearchQuestion(marker.slug) ?? `What does research say about improving ${label}?`}\n\n` +
      `Relevant studies:\n${studyContext}`
    );
  }

  return `The user's health briefing flagged the following biomarkers as out of optimal range. Please analyse the research for each one.\n\n${sections.join('\n\n---\n\n')}`;
}

function sseChunk(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`;
}

// De-duplicate studies across multiple marker searches, keeping highest similarity
function deduplicateStudies(studyArrays: StudyResult[][]): StudyResult[] {
  const seen = new Map<string, StudyResult>();
  for (const arr of studyArrays) {
    for (const s of arr) {
      const existing = seen.get(s.pmid);
      if (!existing || s.similarity > existing.similarity) {
        seen.set(s.pmid, s);
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.similarity - a.similarity);
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

  let question: string | undefined;
  let biomarkerContext: string | undefined;
  let flaggedMarkers: FlaggedMarker[] | undefined;
  let diseaseTag: string | undefined;

  try {
    const body = await req.json();
    question = body.question?.trim();
    biomarkerContext = body.biomarkerContext;
    flaggedMarkers = body.flaggedMarkers;
    diseaseTag = body.diseaseTag;

    // Either question or flaggedMarkers must be provided
    if (!question && (!flaggedMarkers || flaggedMarkers.length === 0)) {
      return new Response('question or flaggedMarkers is required', { status: 400 });
    }
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
      // ── Mode A: Briefing handoff — flagged biomarkers ──────────────────────
      if (flaggedMarkers && flaggedMarkers.length > 0) {
        const studiesByMarker = new Map<string, StudyResult[]>();
        const allStudyArrays: StudyResult[][] = [];

        // Search for studies relevant to each flagged marker
        for (const marker of flaggedMarkers) {
          const researchQ = getResearchQuestion(marker.slug)
            ?? `How does ${marker.name} affect health and what interventions help?`;

          const markerStudies = await searchStudiesAdmin(researchQ, OPENAI_API_KEY, {
            limit: 8,
            minSimilarity: 0.2,
            biomarkerSlug: marker.slug,
          });

          // If biomarker filter yields too few, broaden search without filter
          if (markerStudies.length < 3) {
            const broader = await searchStudiesAdmin(researchQ, OPENAI_API_KEY, {
              limit: 8,
              minSimilarity: 0.2,
            });
            const combined = deduplicateStudies([markerStudies, broader]).slice(0, 8);
            studiesByMarker.set(marker.slug, combined);
            allStudyArrays.push(combined);
          } else {
            studiesByMarker.set(marker.slug, markerStudies);
            allStudyArrays.push(markerStudies);
          }
        }

        // Flatten and deduplicate all studies for the citations payload
        const allStudies = deduplicateStudies(allStudyArrays);

        if (allStudies.length === 0) {
          await send(sseChunk('citations', []));
          await send(sseChunk('text', "I couldn't find closely matching studies for your flagged biomarkers yet. The research database is still growing — please check back soon."));
          await send(sseChunk('done', null));
          await writer.close();
          return;
        }

        // Send citations
        const citationsPayload = allStudies.map(s => ({
          pmid: s.pmid,
          title: s.title,
          authors: s.authors,
          journal: s.journal,
          publication_year: s.publication_year,
          doi: s.doi,
          similarity: Math.round(s.similarity * 100),
          url: pubmedUrl(s.pmid),
          citation: formatCitation(s),
          quality_tier: s.quality_tier,
          biomarker_slugs: s.biomarker_slugs,
          disease_tags: s.disease_tags,
        }));
        await send(sseChunk('citations', citationsPayload));

        // Stream Claude synthesis with briefing-specific prompt
        const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
        const prompt = buildBriefingResearchPrompt(flaggedMarkers, studiesByMarker);

        const claudeStream = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048, // more tokens for multi-marker analysis
          system: BRIEFING_SYSTEM_PROMPT,
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

      // ── Mode B: Direct question (original flow) ────────────────────────────
      } else if (question) {
        // Build search options
        const searchOpts: Parameters<typeof searchStudiesAdmin>[2] = {
          limit: 15,
          minSimilarity: 0.25,
          ...(diseaseTag ? { diseaseTag } : {}),
        };

        const studies = await searchStudiesAdmin(question, OPENAI_API_KEY, searchOpts);

        if (studies.length === 0) {
          await send(sseChunk('citations', []));
          await send(sseChunk('text', "I couldn't find closely matching studies in the research database for this specific question. "));
          await send(sseChunk('text', "The database is still growing — try rephrasing your question or asking about a related topic like dietary interventions, specific biomarkers, or lifestyle factors."));
          await send(sseChunk('done', null));
          await writer.close();
          return;
        }

        // Send citations
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
          quality_tier: s.quality_tier,
          biomarker_slugs: s.biomarker_slugs,
          disease_tags: s.disease_tags,
        }));
        await send(sseChunk('citations', citationsPayload));

        // Stream Claude synthesis
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
      }
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
