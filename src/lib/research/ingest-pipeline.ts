// src/lib/research/ingest-pipeline.ts
// Orchestrates the full data ingestion pipeline:
// PMIDs → PubMed metadata → embeddings → Supabase insert

import { fetchPubMedStudies, sleep, chunk, type PubMedStudy } from './pubmed-api';
import { embedBatch, buildStudyEmbeddingText } from './embed';

export interface IngestOptions {
  supabaseUrl: string;
  supabaseServiceKey: string;
  openaiApiKey: string;
  pubmedApiKey?: string;
  source?: string;
  bookSlugs?: string[];       // Link ingested studies to these books (by slug)
  batchSize?: number;         // PubMed fetch batch size (max 200)
  embedBatchSize?: number;    // OpenAI embedding batch size (max 2048, keep low to avoid timeouts)
  pubmedDelayMs?: number;     // Delay between PubMed API calls
  embedDelayMs?: number;      // Delay between embedding API calls
  dryRun?: boolean;           // Skip DB insert, just log
  onProgress?: (msg: string) => void;
}

export interface IngestResult {
  total: number;
  inserted: number;
  skipped: number;  // already in DB
  errors: number;
}

// Fetch existing PMIDs from Supabase to skip duplicates
async function fetchExistingPmids(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Set<string>> {
  const res = await fetch(`${supabaseUrl}/rest/v1/studies?select=pmid`, {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch existing PMIDs: ${res.status}`);
  const rows: { pmid: string }[] = await res.json();
  return new Set(rows.map(r => r.pmid));
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
  const res = await fetch(`${supabaseUrl}/rest/v1/studies`, {
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
async function linkStudiesToBooks(
  pmids: string[],
  bookSlugs: string[],
  supabaseUrl: string,
  supabaseServiceKey: string,
  onProgress: (msg: string) => void
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

  // Fetch study IDs for the PMIDs we just ingested
  // Process in batches since there could be thousands
  const batchSize = 500;
  const allStudies: { id: string; pmid: string }[] = [];
  for (let i = 0; i < pmids.length; i += batchSize) {
    const batch = pmids.slice(i, i + batchSize);
    const studiesRes = await fetch(
      `${supabaseUrl}/rest/v1/studies?pmid=in.(${batch.join(',')})&select=id,pmid`,
      { headers }
    );
    if (studiesRes.ok) {
      const studies: { id: string; pmid: string }[] = await studiesRes.json();
      allStudies.push(...studies);
    }
  }

  if (allStudies.length === 0) return;

  // Build junction rows (book_id, study_id) for each book × study combination
  const rows: { book_id: string; study_id: string }[] = [];
  for (const book of books) {
    for (const study of allStudies) {
      rows.push({ book_id: book.id, study_id: study.id });
    }
  }

  // Upsert in batches (skip conflicts via ON CONFLICT DO NOTHING equivalent)
  const insertBatchSize = 1000;
  let linked = 0;
  for (let i = 0; i < rows.length; i += insertBatchSize) {
    const batch = rows.slice(i, i + insertBatchSize);
    const res = await fetch(`${supabaseUrl}/rest/v1/book_citations`, {
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

  for (const book of books) {
    onProgress(`  Linked ${allStudies.length} studies to book: ${book.slug}`);
  }

  // Update total_citations count on each book
  for (const book of books) {
    const countQuery = await fetch(
      `${supabaseUrl}/rest/v1/book_citations?book_id=eq.${book.id}&select=id`,
      { headers: { ...headers, 'Prefer': 'count=exact' } }
    );
    const countHeader = countQuery.headers.get('content-range');
    const total = countHeader ? parseInt(countHeader.split('/')[1] || '0', 10) : 0;
    if (total > 0) {
      await fetch(`${supabaseUrl}/rest/v1/books?slug=eq.${book.slug}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ total_citations: total }),
      });
      onProgress(`  Updated ${book.slug} citation count: ${total}`);
    }
  }
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
    batchSize = 100,
    embedBatchSize = 50,
    pubmedDelayMs = 110,    // ~9 req/sec — just under PubMed's 10/sec limit with API key
    embedDelayMs = 200,
    dryRun = false,
    onProgress = console.log,
  } = options;

  const result: IngestResult = { total: pmids.length, inserted: 0, skipped: 0, errors: 0 };

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
    onProgress(`  ${pubmedStudies.length} fetched, ${studiesWithAbstracts.length} have abstracts`);

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
      .map(({ study, embedding }) => ({
        pmid: study.pmid,
        title: study.title,
        authors: study.authors,
        journal: study.journal,
        publication_year: study.publication_year,
        abstract: study.abstract,
        mesh_terms: study.mesh_terms,
        doi: study.doi,
        source,
        embedding: `[${embedding.join(',')}]`, // pgvector expects array literal string
      }));

    onProgress(`  Inserting ${rows.length} studies into Supabase...`);

    if (!dryRun && rows.length > 0) {
      try {
        await upsertStudies(rows as any, supabaseUrl, supabaseServiceKey);
        result.inserted += rows.length;
        onProgress(`  ✓ Inserted ${rows.length} studies`);
      } catch (e) {
        onProgress(`  Insert error: ${e}`);
        result.errors += rows.length;
      }
    } else if (dryRun) {
      onProgress(`  [DRY RUN] Would insert ${rows.length} studies`);
      result.inserted += rows.length;
    }
  }

  // Link studies to books if bookSlugs were provided
  if (bookSlugs.length > 0 && !dryRun && result.inserted > 0) {
    onProgress(`\nLinking studies to books: ${bookSlugs.join(', ')}...`);
    try {
      await linkStudiesToBooks(pmids, bookSlugs, supabaseUrl, supabaseServiceKey, onProgress);
    } catch (e) {
      onProgress(`  Warning: Book linking failed: ${e}`);
    }
  }

  return result;
}
