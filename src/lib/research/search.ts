// src/lib/research/search.ts
// pgvector cosine similarity search against the studies table

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { embedText } from './embed';

export interface StudyResult {
  id: string;
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publication_year: number | null;
  abstract: string;
  mesh_terms: string[];
  doi: string | null;
  source: string;
  biomarker_slugs: string[] | null;
  he_domains: string[] | null;
  disease_tags: string[] | null;
  quality_tier: number | null;
  similarity: number;
}

export interface SearchOptions {
  limit?: number;
  minSimilarity?: number;
  source?: string;           // filter by source: 'greger', 'pubmed_nutrition', etc.
  biomarkerSlug?: string;    // filter studies related to a specific biomarker
  heDomain?: string;         // filter by health engine domain
  diseaseTag?: string;       // filter by disease/condition tag
}

// Search studies by vector similarity + optional filters
// Uses server-side Supabase client (requires auth)
export async function searchStudies(
  query: string,
  openaiApiKey: string,
  options: SearchOptions = {}
): Promise<StudyResult[]> {
  const {
    limit = 15,
    minSimilarity = 0.3,
    source,
    biomarkerSlug,
    heDomain,
    diseaseTag,
  } = options;

  // Embed the query
  const queryEmbedding = await embedText(query, openaiApiKey);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build RPC call with pgvector match function
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('match_studies', {
    query_embedding: embeddingStr,
    match_threshold: minSimilarity,
    match_count: limit,
    filter_source: source ?? null,
    filter_biomarker_slug: biomarkerSlug ?? null,
    filter_he_domain: heDomain ?? null,
    filter_disease_tag: diseaseTag ?? null,
  });

  if (error) throw new Error(`Study search failed: ${error.message}`);
  return (data ?? []) as StudyResult[];
}

// Server-side search using admin client (for API routes)
export async function searchStudiesAdmin(
  query: string,
  openaiApiKey: string,
  options: SearchOptions = {}
): Promise<StudyResult[]> {
  const {
    limit = 15,
    minSimilarity = 0.3,
    source,
    biomarkerSlug,
    heDomain,
    diseaseTag,
  } = options;

  const queryEmbedding = await embedText(query, openaiApiKey);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('match_studies', {
    query_embedding: embeddingStr,
    match_threshold: minSimilarity,
    match_count: limit,
    filter_source: source ?? null,
    filter_biomarker_slug: biomarkerSlug ?? null,
    filter_he_domain: heDomain ?? null,
    filter_disease_tag: diseaseTag ?? null,
  });

  if (error) throw new Error(`Study search failed: ${error.message}`);
  return (data ?? []) as StudyResult[];
}

// Build citation string for a study
export function formatCitation(study: StudyResult): string {
  const firstAuthor = study.authors[0] ?? 'Unknown';
  const et_al = study.authors.length > 2 ? ' et al.' : '';
  const secondAuthor = study.authors.length === 2 ? ` & ${study.authors[1]}` : '';
  const year = study.publication_year ?? 'n.d.';
  return `${firstAuthor}${secondAuthor}${et_al}, ${year}`;
}

// Build PubMed URL for a study
export function pubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}
