#!/usr/bin/env npx tsx
// scripts/ingest-book-content.ts
// Extracts prose from Greger EPUB books, embeds, and inserts into book_chunks table.
//
// Usage:
//   npx tsx scripts/ingest-book-content.ts [options]
//
// Options:
//   --book KEY          Only process a specific book (e.g., how_not_to_die)
//   --dry-run           Extract + embed but don't write to DB
//   --extract-only      Extract chunks only (no embedding, no DB) — for preview
//   --limit N           Only process first N chunks (for testing)
//   --epub-dir PATH     Directory containing EPUB files (default: data/greger-books)
//
// Environment variables required:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   OPENAI_API_KEY

import { readFileSync } from 'fs';
import { resolve, basename } from 'path';

// Load .env.local manually
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
} catch {
  // .env.local not found
}

import { GREGER_EPUB_BOOKS } from '../src/lib/research/ingest-epub';
import { extractBookContent, type BookChunk } from '../src/lib/research/extract-book-content';
import { embedBatch } from '../src/lib/research/embed';
import { detectDiseaseTags } from '../src/lib/research/disease-mapper';
import { detectBiomarkerSlugs } from '../src/lib/research/biomarker-mapper';
import { sleep } from '../src/lib/research/pubmed-api';

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (flag: string) => args.includes(flag);

const bookFilter = getArg('--book');
const dryRun = hasFlag('--dry-run');
const extractOnly = hasFlag('--extract-only');
const limit = getArg('--limit') ? parseInt(getArg('--limit')!, 10) : undefined;
const epubDir = getArg('--epub-dir');

// ── Validate env ──────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!extractOnly && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY)) {
  console.error('Missing required env vars:');
  if (!SUPABASE_URL) console.error('  NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('  SUPABASE_SERVICE_ROLE_KEY');
  if (!OPENAI_API_KEY) console.error('  OPENAI_API_KEY');
  process.exit(1);
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
const supabaseHeaders = () => ({
  'apikey': SUPABASE_SERVICE_KEY!,
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY!}`,
  'Content-Type': 'application/json',
});

async function fetchBookIds(): Promise<Map<string, string>> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/books?select=id,slug`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
  const books: { id: string; slug: string }[] = await res.json();
  const map = new Map<string, string>();
  for (const b of books) map.set(b.slug, b.id);
  return map;
}

async function deleteExistingChunks(bookId: string): Promise<number> {
  // Count existing chunks first
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/book_chunks?book_id=eq.${bookId}&select=id`,
    {
      headers: {
        ...supabaseHeaders(),
        'Prefer': 'count=exact',
        'Range-Unit': 'items',
        'Range': '0-0',
      },
    }
  );
  const contentRange = countRes.headers.get('content-range');
  const existingCount = contentRange ? parseInt(contentRange.split('/')[1] ?? '0', 10) : 0;

  if (existingCount > 0) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/book_chunks?book_id=eq.${bookId}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to delete existing chunks: ${res.status} ${err}`);
    }
  }

  return existingCount;
}

async function insertChunks(
  rows: Array<{
    book_id: string;
    chapter_title: string;
    section_title: string | null;
    chunk_index: number;
    content: string;
    content_length: number;
    quality_tier: number;
    disease_tags: string[];
    biomarker_slugs: string[];
    embedding: string;
  }>
): Promise<void> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/book_chunks`,
    {
      method: 'POST',
      headers: {
        ...supabaseHeaders(),
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(rows),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert failed: ${res.status} ${err}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('='.repeat(60));
  console.log('Evidalife — Book Content Ingestion Pipeline');
  console.log('='.repeat(60));
  console.log(`Mode:       ${extractOnly ? 'extract-only' : dryRun ? 'dry-run' : 'full ingestion'}`);
  if (bookFilter) console.log(`Book:       ${bookFilter}`);
  if (limit) console.log(`Limit:      ${limit} chunks per book`);
  console.log('');

  const epubBase = epubDir ? resolve(epubDir) : resolve(process.cwd(), 'data/greger-books');

  // Filter books if --book specified
  let booksToProcess = GREGER_EPUB_BOOKS.map(book => ({
    ...book,
    path: resolve(epubBase, basename(book.path)),
  }));
  if (bookFilter) {
    booksToProcess = booksToProcess.filter(b => b.key === bookFilter);
    if (booksToProcess.length === 0) {
      console.error(`Book not found: ${bookFilter}`);
      console.error(`Available: ${GREGER_EPUB_BOOKS.map(b => b.key).join(', ')}`);
      process.exit(1);
    }
  }

  // Fetch book IDs from DB (unless extract-only)
  let bookIds: Map<string, string> | null = null;
  if (!extractOnly) {
    bookIds = await fetchBookIds();
    console.log(`Found ${bookIds.size} books in DB\n`);
  }

  let grandTotalChunks = 0;
  let grandTotalChars = 0;
  let grandTotalInserted = 0;

  for (const bookConfig of booksToProcess) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing: ${bookConfig.label} (${bookConfig.key})`);
    console.log('─'.repeat(60));

    // 1. Extract content from EPUB
    const result = await extractBookContent(bookConfig, console.log);
    let chunks = result.chunks;

    if (limit) {
      chunks = chunks.slice(0, limit);
      console.log(`  Limited to first ${chunks.length} chunks`);
    }

    grandTotalChunks += chunks.length;
    grandTotalChars += chunks.reduce((s, c) => s + c.content.length, 0);

    if (extractOnly) {
      // Preview mode: show first few chunks
      console.log(`\n  Preview (first 3 chunks):`);
      for (const chunk of chunks.slice(0, 3)) {
        console.log(`    [${chunk.chunk_index}] ${chunk.chapter_title}${chunk.section_title ? ' > ' + chunk.section_title : ''}`);
        console.log(`        ${chunk.content.slice(0, 120).replace(/\n/g, ' ')}...`);
        console.log(`        (${chunk.content.length} chars)`);
      }
      continue;
    }

    if (chunks.length === 0) {
      console.log('  No content chunks extracted — skipping');
      continue;
    }

    const bookId = bookIds!.get(bookConfig.key);
    if (!bookId) {
      console.log(`  Warning: Book "${bookConfig.key}" not found in DB — skipping`);
      continue;
    }

    // 2. Delete existing chunks for this book (full replace)
    const deleted = await deleteExistingChunks(bookId);
    if (deleted > 0) {
      console.log(`  Deleted ${deleted} existing chunks`);
    }

    // 3. Generate embeddings in batches
    console.log(`  Generating embeddings for ${chunks.length} chunks...`);
    const embedBatchSize = 50;
    const allEmbeddings: number[][] = [];
    const chunkBatches: BookChunk[][] = [];

    for (let i = 0; i < chunks.length; i += embedBatchSize) {
      chunkBatches.push(chunks.slice(i, i + embedBatchSize));
    }

    for (let bi = 0; bi < chunkBatches.length; bi++) {
      const batch = chunkBatches[bi];
      const texts = batch.map(c => {
        // Build embedding text: chapter + section + content for best retrieval
        const parts = [c.chapter_title];
        if (c.section_title) parts.push(c.section_title);
        parts.push(c.content);
        return parts.join('\n\n');
      });

      try {
        const embeddings = await embedBatch(texts, OPENAI_API_KEY!);
        allEmbeddings.push(...embeddings);
        if (bi > 0 && bi % 5 === 0) {
          console.log(`    Embedded ${allEmbeddings.length}/${chunks.length} chunks...`);
        }
        await sleep(200);
      } catch (e) {
        console.error(`    Embedding error (batch ${bi + 1}): ${e}`);
        // Fill with empty arrays for failed chunks
        for (let i = 0; i < batch.length; i++) allEmbeddings.push([]);
      }
    }

    console.log(`    ✓ Generated ${allEmbeddings.filter(e => e.length === 1536).length}/${chunks.length} embeddings`);

    // 4. Auto-tag with disease_tags and biomarker_slugs
    console.log(`  Auto-tagging chunks...`);

    // 5. Build insert rows
    const rows = chunks
      .map((chunk, i) => ({ chunk, embedding: allEmbeddings[i] }))
      .filter(({ embedding }) => embedding && embedding.length === 1536)
      .map(({ chunk, embedding }) => {
        const searchText = [chunk.chapter_title, chunk.section_title ?? '', chunk.content].join(' ');
        return {
          book_id: bookId,
          chapter_title: chunk.chapter_title,
          section_title: chunk.section_title,
          chunk_index: chunk.chunk_index,
          content: chunk.content,
          content_length: chunk.content.length,
          quality_tier: 0, // Highest tier — author's synthesized analysis
          disease_tags: detectDiseaseTags(chunk.chapter_title, chunk.content, []),
          biomarker_slugs: detectBiomarkerSlugs(searchText),
          embedding: `[${embedding.join(',')}]`,
        };
      });

    if (dryRun) {
      console.log(`  [DRY RUN] Would insert ${rows.length} chunks`);
      grandTotalInserted += rows.length;
      continue;
    }

    // 6. Insert in sub-batches (embeddings are large)
    console.log(`  Inserting ${rows.length} chunks into Supabase...`);
    const insertBatchSize = 15; // Keep small due to embedding payload size
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += insertBatchSize) {
      const batch = rows.slice(i, i + insertBatchSize);
      try {
        await insertChunks(batch);
        insertedCount += batch.length;
      } catch (e) {
        console.error(`    Insert error (batch ${Math.floor(i / insertBatchSize) + 1}): ${e}`);
      }
    }

    grandTotalInserted += insertedCount;
    console.log(`  ✓ Inserted ${insertedCount} chunks for "${bookConfig.label}"`);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('Book Content Ingestion Complete');
  console.log('='.repeat(60));
  console.log(`Total chunks:    ${grandTotalChunks}`);
  console.log(`Total chars:     ${(grandTotalChars / 1000).toFixed(0)}k`);
  if (!extractOnly) {
    console.log(`Total inserted:  ${grandTotalInserted}`);

    // Estimate embedding cost
    const avgTokensPerChunk = 400;
    const costUsd = (grandTotalChunks * avgTokensPerChunk / 1_000_000) * 0.02;
    console.log(`Embedding cost:  ~$${costUsd.toFixed(2)} USD`);
  }
  if (dryRun) console.log('\n⚠️  Dry run — no data was written to the database');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
