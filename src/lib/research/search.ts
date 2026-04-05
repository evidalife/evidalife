// src/lib/research/search.ts
// pgvector cosine similarity search against studies + book_chunks tables

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

export interface BookChunkResult {
  id: string;
  book_id: string;
  chapter_title: string;
  section_title: string | null;
  chunk_index: number;
  content: string;
  content_length: number;
  quality_tier: number;
  disease_tags: string[] | null;
  biomarker_slugs: string[] | null;
  similarity: number;
  // Joined from books table (added client-side)
  book_title?: string;
  book_slug?: string;
}

export interface NfContentResult {
  id: string;
  slug: string;
  title: string;
  content_type: string; // 'video' | 'blog' | 'question'
  transcript: string;
  pmids: string[] | null;
  url: string;
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

// ── Book chunk search ───────────────────────────────────────────────────────

export interface BookChunkSearchOptions {
  limit?: number;
  minSimilarity?: number;
  bookId?: string;
  biomarkerSlug?: string;
  diseaseTag?: string;
}

// Search book content chunks by vector similarity (admin client, for API routes)
export async function searchBookChunksAdmin(
  query: string,
  openaiApiKey: string,
  options: BookChunkSearchOptions = {}
): Promise<BookChunkResult[]> {
  const {
    limit = 5,
    minSimilarity = 0.3,
    bookId,
    biomarkerSlug,
    diseaseTag,
  } = options;

  const queryEmbedding = await embedText(query, openaiApiKey);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('match_book_chunks', {
    query_embedding: embeddingStr,
    match_threshold: minSimilarity,
    match_count: limit,
    filter_book_id: bookId ?? null,
    filter_disease_tag: diseaseTag ?? null,
    filter_biomarker_slug: biomarkerSlug ?? null,
  });

  if (error) throw new Error(`Book chunk search failed: ${error.message}`);
  return (data ?? []) as BookChunkResult[];
}

// ── NutritionFacts content search ──────────────────────────────────────────

export interface NfContentSearchOptions {
  limit?: number;
  minSimilarity?: number;
  contentType?: string; // 'video' | 'blog' | 'question'
}

// Search NutritionFacts content (videos, blogs, Q&A) by vector similarity
export async function searchNfContentAdmin(
  query: string,
  openaiApiKey: string,
  options: NfContentSearchOptions = {}
): Promise<NfContentResult[]> {
  const {
    limit = 5,
    minSimilarity = 0.3,
  } = options;

  const queryEmbedding = await embedText(query, openaiApiKey);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('match_nf_content', {
    query_embedding: embeddingStr,
    match_threshold: minSimilarity,
    match_count: limit,
  });

  if (error) throw new Error(`NF content search failed: ${error.message}`);
  return (data ?? []) as NfContentResult[];
}

// Enrich book chunk results with book title/slug
export async function enrichBookChunks(
  chunks: BookChunkResult[]
): Promise<BookChunkResult[]> {
  if (chunks.length === 0) return chunks;

  const supabase = createAdminClient();
  const bookIds = [...new Set(chunks.map(c => c.book_id))];
  const { data: books } = await supabase
    .from('books')
    .select('id, title, slug')
    .in('id', bookIds);

  if (books) {
    const bookMap = new Map(books.map((b: any) => [b.id, b]));
    for (const chunk of chunks) {
      const book = bookMap.get(chunk.book_id);
      if (book) {
        chunk.book_title = book.title;
        chunk.book_slug = book.slug;
      }
    }
  }

  return chunks;
}
