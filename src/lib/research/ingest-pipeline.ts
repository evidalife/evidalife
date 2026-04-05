// src/lib/research/ingest-pipeline.ts
// Orchestrates the full data ingestion pipeline:
// PMIDs → PubMed metadata → embeddings → Supabase insert

import { fetchPubMedStudies, sleep, chunk, type PubMedStudy } from './pubmed-api';
import { embedBatch, buildStudyEmbeddingText } from './embed';
import { detectDiseaseTags } from './disease-mapper';
import { detectBiomarkerSlugs } from './biomarker-mapper';

/**
 * Derive quality_tier from source + MeSH terms:
 *   1 = Greger-cited (trusted curation)
 *   2 = Systematic review / meta-analysis
 *   3 = RCT (Randomized Controlled Trial)
 *   4 = Prospective cohort / observational
 *   5 = Other
 */
function deriveQualityTier(source: string, meshTerms: string[]): number {
  if (source.startsWith('greger')) return 1;

  const joined = meshTerms.join(' ').toLowerCase();
  if (joined.includes('systematic review') || joined.includes('meta-analysis')) return 2;
  if (joined.includes('randomized controlled trial') || joined.includes('rct')) return 3;
  if (joined.includes('prospective') || joined.includes('cohort study') || joined.includes('longitudinal')) return 4;

  return 5;
}

export interface IngestOptions {
  supabaseUrl: string;
  supabaseServiceKey: string;
  openaiApiKey: string;
  pubmedApiKey?: string;
  source?: string;
  bookSlugs?: string[];       // Link ingested studies to these books (by slug)
  pmidsByBook?: Record<string, string[]>;  // Per-book PMID mapping (key=book slug, value=PMIDs from that book)
  batchSize?: number;         // PubMed fetch batch size (max 200)
  embedBatchSize?: number;    // OpenAI embedding batch size (max 2048, keep low to avoid timeouts)
  pubmedDelayMs?: number;     // Delay between PubMed API calls
  embedDelayMs?: number;      // Delay between embedding API calls
  dryRun?: boolean;           // Skip DB insert, just log
  linkOnly?: boolean;         // Skip PubMed fetch + embedding, only run book_citations linking
  onProgress?: (msg: string) => void;
}

export interface IngestResult {
  total: number;
  inserted: number;
  skipped: number;  // already in DB
  errors: number;
}

// Fetch existing PMIDs from Supabase to skip duplicates (paginated)
async function fetchExistingPmids(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Set<string>> {
  const headers = {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
  };
  const pageSize = 1000;
  const existing = new Set<string>();
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/studies?select=pmid&offset=${offset}&limit=${pageSize}`,
      { headers }
    );
    if (!res.ok) throw new Error(`Failed to fetch existing PMIDs: ${res.status}`);
    const rows: { pmid: string }[] = await res.json();
    for (const r of rows) existing.add(r.pmid);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return existing;
}

// Insert studies into Supabase (upsert by pmid)
async function upsertStudies(
  studies: Array<{
    pmid: string;
    title: string;
    authors: string[];
    journal: string;
    publication_year: number | null;
    abstract: string;
    mesh_terms: string[];
    doi: string | null;
    source: string;
    embedding: number[];
  }>,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  const res = await fetch(`${supabaseUrl}/rest/v1/studies?on_conflict=pmid`, {
    method: 'POST',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(studies),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert failed: ${res.status} ${err}`);
  }
}

// Link studies to books via the book_citations junction table
// When pmidsByBook is provided, each study is linked only to its source book(s).
// Fallback: if pmidsByBook is empty, links all PMIDs to all bookSlugs (legacy behavior).
async function linkStudiesToBooks(
  pmids: string[],
  bookSlugs: string[],
  supabaseUrl: string,
  supabaseServiceKey: string,
  onProgress: (msg: string) => void,
  pmidsByBook?: Record<string, string[]>
): Promise<void> {
  if (bookSlugs.length === 0 || pmids.length === 0) return;

  const headers = {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Content-Type': 'application/json',
  };

  // Fetch book IDs for the given slugs
  const booksRes = await fetch(
    `${supabaseUrl}/rest/v1/books?slug=in.(${bookSlugs.join(',')})&select=id,slug`,
    { headers }
  );
  if (!booksRes.ok) {
    onProgress(`  Warning: Could not fetch book IDs: ${booksRes.status}`);
    return;
  }
  const books: { id: string; slug: string }[] = await booksRes.json();
  if (books.length === 0) {
    onProgress(`  Warning: No books found for slugs: ${bookSlugs.join(', ')}`);
    return;
  }

  // Build a PMID→study_id lookup from the DB
  const batchSize = 500;
  const pmidToStudyId = new Map<string, string>();
  for (let i = 0; i < pmids.length; i += batchSize) {
    const batch = pmids.slice(i, i + batchSize);
    const studiesRes = await fetch(
      `${supabaseUrl}/rest/v1/studies?pmid=in.(${batch.join(',')})&select=id,pmid`,
      { headers }
    );
    if (studiesRes.ok) {
      const studies: { id: string; pmid: string }[] = await studiesRes.json();
      for (const s of studies) pmidToStudyId.set(s.pmid, s.id);
    }
  }

  if (pmidToStudyId.size === 0) return;

  // Build junction rows using per-book mapping when available
  const rows: { book_id: string; study_id: string }[] = [];
  const hasPerBookMapping = pmidsByBook && Object.keys(pmidsByBook).length > 0;

  if (hasPerBookMapping) {
    // Correct per-book linking: each study linked only to its source book(s)
    for (const book of books) {
      const bookPmids = pmidsByBook[book.slug] ?? [];
      let linked = 0;
      for (const pmid of bookPmids) {
        const studyId = pmidToStudyId.get(pmid);
        if (studyId) {
          rows.push({ book_id: book.id, study_id: studyId });
          linked++;
        }
      }
      onProgress(`  ${book.slug}: ${linked} studies to link`);
    }
  } else {
    // Legacy fallback: link all PMIDs to all books (not ideal)
    onProgress(`  Warning: No per-book PMID mapping — linking all studies to all books`);
    for (const book of books) {
      pmidToStudyId.forEach((studyId) => {
        rows.push({ book_id: book.id, study_id: studyId });
      });
    }
  }

  // Upsert in batches (skip conflicts via ON CONFLICT DO NOTHING equivalent)
  const insertBatchSize = 1000;
  let linked = 0;
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    const batch = rows.slice(i, i + insertBatchSize);
    const res = await fetch(`${supabaseUrl}/rest/v1/book_citations?on_conflict=book_id,study_id`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });
    if (res.ok) {
      linked += batch.length;
    } else {
      const err = await res.text();
      onProgress(`  Warning: book_citations insert error: ${err}`);
    }
  }

  onProgress(`  Linked ${linked} total book_citation rows`);

  // Note: total_citations on books table is set from EPUB endnote counts,
  // not from book_citations count (which only includes resolved PMIDs).
}

// Main ingestion function
export async function ingestPmids(
  pmids: string[],
  options: IngestOptions
): Promise<IngestResult> {
  const {
    supabaseUrl,
    supabaseServiceKey,
    openaiApiKey,
    pubmedApiKey,
    source = 'greger',
    bookSlugs = [],
    pmidsByBook = {},
    batchSize = 100,
    embedBatchSize = 50,
    pubmedDelayMs = 110,    // ~9 req/sec — just under PubMed's 10/sec limit with API key
    embedDelayMs = 200,
    dryRun = false,
    linkOnly = false,
    onProgress = console.log,
  } = options;

  const result: IngestResult = { total: pmids.length, inserted: 0, skipped: 0, errors: 0 };

  if (linkOnly) {
    // Skip ingestion entirely — just run book_citations linking
    if (bookSlugs.length > 0) {
      onProgress(`\nLink-only mode: linking ${pmids.length} PMIDs to books: ${bookSlugs.join(', ')}...`);
      await linkStudiesToBooks(pmids, bookSlugs, supabaseUrl, supabaseServiceKey, onProgress, pmidsByBook);
    }
    return result;
  }

  // Check which PMIDs are already in the DB
  onProgress(`Checking ${pmids.length} PMIDs against existing DB...`);
  const existingPmids = await fetchExistingPmids(supabaseUrl, supabaseServiceKey);
  const newPmids = pmids.filter(p => !existingPmids.has(p));
  result.skipped = pmids.length - newPmids.length;
  onProgress(`  ${result.skipped} already in DB, ${newPmids.length} new to process`);

  if (newPmids.length === 0) return result;

  // Process in batches
  const pmidBatches = chunk(newPmids, batchSize);
  onProgress(`Processing ${pmidBatches.length} batches of up to ${batchSize} studies each...`);

  for (let bi = 0; bi < pmidBatches.length; bi++) {
    const pmidBatch = pmidBatches[bi];
    onProgress(`\nBatch ${bi + 1}/${pmidBatches.length} — fetching ${pmidBatch.length} studies from PubMed...`);

    // 1. Fetch PubMed metadata
    let pubmedStudies: PubMedStudy[];
    try {
      pubmedStudies = await fetchPubMedStudies(pmidBatch, pubmedApiKey);
      await sleep(pubmedDelayMs);
    } catch (e) {
      onProgress(`  PubMed error: ${e}`);
      result.errors += pmidBatch.length;
      continue;
    }

    // Filter out studies without abstracts (not useful for RAG)
    const studiesWithAbstracts = pubmedStudies.filter(s => s.abstract.length > 50);
    const studiesWithoutAbstracts = pubmedStudies.filter(s => s.abstract.length <= 50);
    onProgress(`  ${pubmedStudies.length} fetched, ${studiesWithAbstracts.length} have abstracts`);

    // Record PMIDs without abstracts as skipped (so they don't show as "pending" forever)
    if (studiesWithoutAbstracts.length > 0 && !dryRun) {
      const skippedPmids = studiesWithoutAbstracts.map(s => s.pmid);
      // Also include PMIDs that PubMed didn't return at all
      const returnedPmids = new Set(pubmedStudies.map(s => s.pmid));
      const notFoundPmids = pmidBatch.filter(p => !returnedPmids.has(p));
      const allSkipped = [...skippedPmids, ...notFoundPmids];

      if (allSkipped.length > 0) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const sb = createClient(supabaseUrl, supabaseServiceKey);
          await sb.from('skipped_pmids').upsert(
            allSkipped.map(pmid => ({ pmid, reason: 'no_abstract', source })),
            { onConflict: 'pmid' }
          );
          onProgress(`  Recorded ${allSkipped.length} skipped PMIDs (no abstract)`);
        } catch (e) {
          onProgress(`  Warning: Could not record skipped PMIDs: ${e}`);
        }
      }
    }

    if (studiesWithAbstracts.length === 0) continue;

    // 2. Generate embeddings in sub-batches
    const embedBatches = chunk(studiesWithAbstracts, embedBatchSize);
    const embeddings: number[][] = [];

    for (const eBatch of embedBatches) {
      const texts = eBatch.map(buildStudyEmbeddingText);
      try {
        const batchEmbeddings = await embedBatch(texts, openaiApiKey);
        embeddings.push(...batchEmbeddings);
        await sleep(embedDelayMs);
      } catch (e) {
        onProgress(`  Embedding error: ${e}`);
        // Fill with empty arrays for failed studies
        for (let i = 0; i < eBatch.length; i++) embeddings.push([]);
      }
    }

    // 3. Build insert rows (skip studies where embedding failed)
    const rows = studiesWithAbstracts
      .map((study, i) => ({ study, embedding: embeddings[i] }))
      .filter(({ embedding }) => embedding.length === 1536)
      .map(({ study, embedding }) => {
        const searchText = [study.title, study.abstract, ...study.mesh_terms].join(' ');
        return {
          pmid: study.pmid,
          title: study.title,
          authors: study.authors,
          journal: study.journal,
          publication_year: study.publication_year,
          abstract: study.abstract,
          mesh_terms: study.mesh_terms,
          doi: study.doi,
          source,
          quality_tier: deriveQualityTier(source, study.mesh_terms),
          biomarker_slugs: detectBiomarkerSlugs(searchText),
          disease_tags: detectDiseaseTags(study.title, study.abstract, study.mesh_terms),
          embedding: `[${embedding.join(',')}]`, // pgvector expects array literal string
        };
      });

    onProgress(`  Inserting ${rows.length} studies into Supabase...`);

    if (!dryRun && rows.length > 0) {
      // Insert in sub-batches of 25 to avoid statement timeouts on large embedding payloads
      const insertSubBatchSize = 25;
      let insertedCount = 0;
      for (let i = 0; i < rows.length; i += insertSubBatchSize) {
        const insertBatch = rows.slice(i, i + insertSubBatchSize);
        try {
          await upsertStudies(insertBatch as any, supabaseUrl, supabaseServiceKey);
          insertedCount += insertBatch.length;
        } catch (e) {
          onProgress(`  Insert error (sub-batch ${Math.floor(i / insertSubBatchSize) + 1}): ${e}`);
          result.errors += insertBatch.length;
        }
      }
      result.inserted += insertedCount;
      onProgress(`  ✓ Inserted ${insertedCount} studies`);
    } else if (dryRun) {
      onProgress(`  [DRY RUN] Would insert ${rows.length} studies`);
      result.inserted += rows.length;
    }
  }

  // Link studies to books if bookSlugs were provided
  if (bookSlugs.length > 0 && !dryRun) {
    onProgress(`\nLinking studies to books: ${bookSlugs.join(', ')}...`);
    try {
      await linkStudiesToBooks(pmids, bookSlugs, supabaseUrl, supabaseServiceKey, onProgress, pmidsByBook);
    } catch (e) {
      onProgress(`  Warning: Book linking failed: ${e}`);
    }
  }

  return result;
}
