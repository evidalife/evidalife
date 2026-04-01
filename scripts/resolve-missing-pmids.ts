#!/usr/bin/env npx tsx
// scripts/resolve-missing-pmids.ts
// Re-processes EPUB citations that failed PMID resolution using improved strategies:
//   Tier 4: CrossRef API (free, massive coverage, metadata matching)
//   Tier 5: Looser PubMed title search (fewer words, author name added)
//
// Run overnight: npx tsx scripts/resolve-missing-pmids.ts
// Dry run:       npx tsx scripts/resolve-missing-pmids.ts --dry-run
// Single book:   npx tsx scripts/resolve-missing-pmids.ts --book "How Not to Age"

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local ──────────────────────────────────────────────────────────
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
} catch { /* .env.local not found */ }

import {
  collectEpubPmids,
  GREGER_EPUB_BOOKS,
  type ExtractedCitation,
  type EpubBookConfig,
  searchPmidByCitation,
} from '../src/lib/research/ingest-epub';
import { ingestPmids } from '../src/lib/research/ingest-pipeline';
import { sleep } from '../src/lib/research/pubmed-api';

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const hasFlag = (flag: string) => args.includes(flag);

const dryRun = hasFlag('--dry-run');
const bookFilter = getArg('--book');
const limitArg = getArg('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : 0;

// ── CrossRef API (Tier 4) ────────────────────────────────────────────────────
// Free, no API key needed, polite pool with mailto header
// Docs: https://api.crossref.org/swagger-ui/index.html

interface CrossRefWork {
  DOI: string;
  title?: string[];
  'published-print'?: { 'date-parts': number[][] };
  'published-online'?: { 'date-parts': number[][] };
  author?: { family: string; given?: string }[];
  'container-title'?: string[];
  volume?: string;
  page?: string;
}

async function resolveCitationsViaCrossRef(
  citations: ExtractedCitation[],
  options: { delayMs?: number; onProgress?: (msg: string) => void } = {}
): Promise<Map<string, string>> {
  const { delayMs = 1100, onProgress = console.log } = options; // CrossRef: ~1 req/sec without key
  const citationIdToPmid = new Map<string, string>();

  onProgress(`\n  ── CrossRef Resolution (Tier 4) ──`);
  onProgress(`  Processing ${citations.length} unresolved citations...`);

  let resolved = 0;
  let processed = 0;
  let crossrefFound = 0;

  // Step 1: Find DOIs via CrossRef for citations that don't have them
  const needDoi = citations.filter(c => !c.doi && c.titleApprox && c.year);
  const alreadyHaveDoi = citations.filter(c => c.doi && !c.resolvedPmid);

  onProgress(`  Need DOI: ${needDoi.length}, Have DOI but no PMID: ${alreadyHaveDoi.length}`);

  // For citations without DOI, search CrossRef by title + author
  for (const citation of needDoi) {
    processed++;
    if (processed % 50 === 0) {
      onProgress(`  CrossRef: ${processed}/${needDoi.length} searched, ${crossrefFound} DOIs found`);
    }

    try {
      const titleWords = (citation.titleApprox ?? '')
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 6)
        .join('+');

      if (titleWords.length < 8) continue;

      // Build CrossRef query
      let query = `query.bibliographic=${encodeURIComponent(titleWords)}`;
      if (citation.firstAuthorLastName) {
        query += `&query.author=${encodeURIComponent(citation.firstAuthorLastName)}`;
      }
      if (citation.year) {
        query += `&filter=from-pub-date:${citation.year - 1},until-pub-date:${citation.year + 1}`;
      }
      query += '&rows=3&select=DOI,title,author,published-print,published-online,container-title,volume,page';

      const resp = await fetch(`https://api.crossref.org/works?${query}`, {
        headers: {
          'User-Agent': 'EvidaLife/1.0 (mailto:research@evidalife.com)',
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        const items: CrossRefWork[] = data.message?.items ?? [];

        if (items.length > 0) {
          // Validate the match - check title similarity
          const bestMatch = items[0];
          const crTitle = (bestMatch.title?.[0] ?? '').toLowerCase();
          const ourTitle = (citation.titleApprox ?? '').toLowerCase();

          // Simple overlap check: at least 60% of words match
          const crWords = new Set(crTitle.split(/\s+/).filter(w => w.length > 3));
          const ourWords = ourTitle.split(/\s+/).filter(w => w.length > 3);
          const matchCount = ourWords.filter(w => crWords.has(w)).length;
          const matchRatio = ourWords.length > 0 ? matchCount / ourWords.length : 0;

          if (matchRatio >= 0.6 && bestMatch.DOI) {
            citation.doi = bestMatch.DOI;
            crossrefFound++;
          }
        }
      }

      await sleep(delayMs);
    } catch {
      // Silently continue on errors
    }
  }

  onProgress(`  CrossRef found ${crossrefFound} new DOIs out of ${needDoi.length} searched`);

  // Step 2: Resolve all DOIs (new + existing) to PMIDs via NCBI ID converter
  const withNewDoi = citations.filter(c => c.doi && !c.resolvedPmid);
  if (withNewDoi.length > 0) {
    onProgress(`  Resolving ${withNewDoi.length} DOIs to PMIDs via NCBI...`);
    const { resolveDoiToPmid } = await import('../src/lib/research/ingest-epub');
    const doiMap = await resolveDoiToPmid(
      withNewDoi.map(c => c.doi!),
      { apiKey: process.env.PUBMED_API_KEY, delayMs: 350 }
    );

    for (const citation of withNewDoi) {
      const pmid = doiMap.get(citation.doi!.toLowerCase());
      if (pmid) {
        citation.resolvedPmid = pmid;
        citationIdToPmid.set(citation.id, pmid);
        resolved++;
      }
    }
    onProgress(`  DOI→PMID resolved: ${resolved}`);
  }

  onProgress(`  CrossRef tier total: ${resolved} new PMIDs`);
  return citationIdToPmid;
}

// ── Looser PubMed Search (Tier 5) ────────────────────────────────────────────

async function loosePubmedTitleSearch(
  citations: ExtractedCitation[],
  options: { apiKey?: string; delayMs?: number; onProgress?: (msg: string) => void } = {}
): Promise<Map<string, string>> {
  const { apiKey, delayMs = 350, onProgress = console.log } = options;
  const citationIdToPmid = new Map<string, string>();

  const unresolved = citations.filter(c => !c.resolvedPmid && c.titleApprox);

  onProgress(`\n  ── Loose PubMed Title Search (Tier 5) ──`);
  onProgress(`  Processing ${unresolved.length} still-unresolved citations...`);

  let resolved = 0;
  let processed = 0;

  for (const citation of unresolved) {
    processed++;
    if (processed % 100 === 0) {
      onProgress(`  Loose search: ${processed}/${unresolved.length}, resolved ${resolved}`);
    }

    try {
      // Strategy A: fewer title words (5 instead of 8) + author name
      const titleWords = (citation.titleApprox ?? '')
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 5)
        .join(' ');

      if (titleWords.length < 8) continue;

      // Add author to improve accuracy
      let query = `${titleWords}[Title]`;
      if (citation.year) query += ` AND ${citation.year}[pdat]`;
      if (citation.firstAuthorLastName) {
        query += ` AND ${citation.firstAuthorLastName}[Author]`;
      }

      const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
      const params = new URLSearchParams({
        db: 'pubmed',
        term: query,
        retmax: '5',
        retmode: 'json',
      });
      if (apiKey) params.set('api_key', apiKey);

      await sleep(delayMs);
      const res = await fetch(`${NCBI_BASE}/esearch.fcgi?${params}`);
      if (!res.ok) continue;

      const data = await res.json();
      const ids: string[] = data.esearchresult?.idlist ?? [];

      if (ids.length === 1) {
        // Exact single match — confident
        citation.resolvedPmid = ids[0];
        citationIdToPmid.set(citation.id, ids[0]);
        resolved++;
        continue;
      }

      if (ids.length === 0 && citation.titleApprox) {
        // Strategy B: try without year constraint (sometimes year is off by 1)
        const queryB = `${titleWords}[Title]${citation.firstAuthorLastName ? ` AND ${citation.firstAuthorLastName}[Author]` : ''}`;
        const paramsB = new URLSearchParams({
          db: 'pubmed',
          term: queryB,
          retmax: '3',
          retmode: 'json',
        });
        if (apiKey) paramsB.set('api_key', apiKey);

        await sleep(delayMs);
        const resB = await fetch(`${NCBI_BASE}/esearch.fcgi?${paramsB}`);
        if (resB.ok) {
          const dataB = await resB.json();
          const idsB: string[] = dataB.esearchresult?.idlist ?? [];
          if (idsB.length === 1) {
            citation.resolvedPmid = idsB[0];
            citationIdToPmid.set(citation.id, idsB[0]);
            resolved++;
          }
        }
      }
    } catch {
      // Continue silently
    }
  }

  onProgress(`  Loose search resolved ${resolved}/${unresolved.length}`);
  return citationIdToPmid;
}

// ── Extract unresolved citations from EPUBs ──────────────────────────────────
// We need to re-extract and re-run the first 3 tiers to find what's unresolved,
// then apply tiers 4 and 5.

async function extractAllCitationsFromEpub(
  book: EpubBookConfig,
  onProgress: (msg: string) => void
): Promise<ExtractedCitation[]> {
  const { execSync } = await import('child_process');
  const { mkdtempSync, readdirSync, readFileSync: readFs, rmSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  onProgress(`  Extracting EPUB: ${book.path}`);

  const tmpDir = mkdtempSync(join(tmpdir(), 'epub-'));
  try {
    execSync(`unzip -o -q "${book.path}" -d "${tmpDir}"`, { stdio: 'pipe' });

    const xhtmlFiles = new Map<string, string>();
    const walkDir = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) walkDir(fullPath);
        else if (entry.name.endsWith('.xhtml') || entry.name.endsWith('.html')) {
          xhtmlFiles.set(fullPath.replace(tmpDir + '/', ''), readFs(fullPath, 'utf-8'));
        }
      }
    };
    walkDir(tmpDir);

    // Use the parseEndnotes function via dynamic import trick
    // Since it's not exported, we'll inline a minimal version
    const allCitations: ExtractedCitation[] = [];
    for (const [, content] of xhtmlFiles) {
      const citations = parseEndnotesLocal(content);
      allCitations.push(...citations);
    }

    onProgress(`  Found ${allCitations.length} endnotes, ${allCitations.filter(c => c.isJournal).length} journal citations`);
    return allCitations;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Inline version of parseEndnotes + parseCitationText (since they're not exported)
function parseEndnotesLocal(xhtmlContent: string): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];

  const endnotesMatch = xhtmlContent.match(
    /<section[^>]*role="doc-endnotes"[^>]*>([\s\S]*?)<\/section>/
  );

  if (endnotesMatch) {
    const section = endnotesMatch[1];
    const liMatches = section.matchAll(/<li[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/li>/g);
    for (const m of liMatches) {
      const text = stripHtml(m[2]).trim();
      if (text.length < 10) continue;
      citations.push(parseCitationTextLocal(m[1], text));
    }
    return citations;
  }

  const footnoteMatches = xhtmlContent.matchAll(
    /<(?:li|p|div)[^>]*id="((?:foot|end)note-\d+)"[^>]*>([\s\S]*?)<\/(?:li|p|div)>/g
  );
  for (const m of footnoteMatches) {
    const text = stripHtml(m[2]).trim();
    if (text.length < 10) continue;
    citations.push(parseCitationTextLocal(m[1], text));
  }

  const notesChapterMatches = xhtmlContent.matchAll(
    /<li[^>]*id="(notes-[^"]+)"[^>]*>([\s\S]*?)<\/li>/g
  );
  for (const m of notesChapterMatches) {
    const text = stripHtml(m[2]).trim();
    if (text.length < 10) continue;
    if (!citations.some(c => c.id === m[1])) {
      citations.push(parseCitationTextLocal(m[1], text));
    }
  }

  return citations;
}

function parseCitationTextLocal(id: string, text: string): ExtractedCitation {
  const isJournal =
    /\d{4};\d+(\(\d+\))?/.test(text) ||
    /Published online/i.test(text) ||
    /\.\s*\d{4};\d+/.test(text) ||
    /et al\./.test(text) ||
    /\b[A-Z][a-z]+ [A-Z]{1,2}[,.]/.test(text);

  const citation: ExtractedCitation = { id, rawText: text, isJournal };

  const doiMatch = text.match(/doi[:\s]*(10\.\d{4,}\/[^\s;,)]+)/i);
  if (doiMatch) citation.doi = doiMatch[1].replace(/\.$/, '');

  const yearMatch = text.match(/[;.]\s*(\d{4})[;:\s(]/);
  if (yearMatch) citation.year = parseInt(yearMatch[1], 10);
  else {
    const fallback = text.match(/\b(19\d{2}|20[012]\d)\b/);
    if (fallback) citation.year = parseInt(fallback[1], 10);
  }

  const parts = text.split(/\.\s/);
  if (parts.length >= 3) {
    citation.authorsApprox = parts[0].trim();
    citation.titleApprox = parts[1].trim();
  }

  if (citation.authorsApprox) {
    const firstAuthor = citation.authorsApprox.split(/[,;]/)[0].trim();
    const nameMatch = firstAuthor.match(/^(.+?)\s+[A-Z]{1,3}$/);
    if (nameMatch) citation.firstAuthorLastName = nameMatch[1].trim();
    else citation.firstAuthorLastName = firstAuthor.replace(/\s+[A-Z]$/, '').trim();
  }

  const journalVolumeMatch = text.match(
    /\.\s+([A-Z][^.]+?)\.\s*\d{4}\s*;(\d+)\s*(?:\([^)]*\))?\s*:\s*(\d+)/
  );
  if (journalVolumeMatch) {
    citation.journalApprox = journalVolumeMatch[1].trim();
    citation.volume = journalVolumeMatch[2];
    citation.firstPage = journalVolumeMatch[3];
  } else {
    const looseMatch = text.match(
      /\.\s+([A-Z][A-Za-z\s&]+(?:\s[A-Z][a-z]+)*)\.\s*(\d{4})\s*;\s*(\d+)/
    );
    if (looseMatch) {
      citation.journalApprox = looseMatch[1].trim();
      citation.volume = looseMatch[3];
      const pageMatch = text.match(/:\s*(\d+)\s*[-–—]/);
      if (pageMatch) citation.firstPage = pageMatch[1];
    }
  }

  return citation;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

  log('🔬 Resolve Missing PMIDs — CrossRef + Loose Title Search');
  log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE (will ingest new studies)'}`);
  if (bookFilter) log(`   Book filter: ${bookFilter}`);
  if (limit) log(`   Limit: ${limit} PMIDs`);
  log('');

  const pubmedApiKey = process.env.PUBMED_API_KEY;

  // ── Step 1: Fetch existing PMIDs from DB ─────────────────────────────────
  log('Step 1: Loading existing PMIDs from Supabase...');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  let existingPmids = new Set<string>();
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const resp = await fetch(
      `${supabaseUrl}/rest/v1/studies?select=pmid&offset=${offset}&limit=${pageSize}`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) existingPmids.add(r.pmid);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  log(`  ${existingPmids.size} PMIDs already in database`);

  // ── Step 2: Re-extract citations from EPUBs ──────────────────────────────
  log('\nStep 2: Extracting citations from EPUBs...');
  const books = bookFilter
    ? GREGER_EPUB_BOOKS.filter(b => b.label.toLowerCase().includes(bookFilter.toLowerCase()))
    : GREGER_EPUB_BOOKS;

  if (books.length === 0) {
    log(`  No books matched filter "${bookFilter}"`);
    process.exit(1);
  }

  const allCitations: ExtractedCitation[] = [];
  for (const book of books) {
    const citations = await extractAllCitationsFromEpub(book, log);
    allCitations.push(...citations);
  }

  const journalCitations = allCitations.filter(c => c.isJournal);
  log(`\n  Total endnotes: ${allCitations.length}`);
  log(`  Journal citations: ${journalCitations.length}`);

  // Mark citations that already have PMIDs in DB as resolved
  // (we use DOI or existing match — this is a heuristic skip)
  // Actually, we can't know which are already resolved without re-running tiers 1-3
  // So we'll run tiers 4+5 on ALL unresolved journal citations

  // ── Step 3: Quick tier 1-3 to identify what's already resolved ───────────
  log('\nStep 3: Running Tier 1-3 (DOI + ECitMatch + Title) to find unresolved...');

  // Tier 1: DOI → PMID
  const withDoi = journalCitations.filter(c => c.doi);
  if (withDoi.length > 0) {
    log(`  Tier 1: Resolving ${withDoi.length} DOIs...`);
    const { resolveDoiToPmid } = await import('../src/lib/research/ingest-epub');
    const doiMap = await resolveDoiToPmid(withDoi.map(c => c.doi!), { apiKey: pubmedApiKey });
    let doiResolved = 0;
    for (const c of withDoi) {
      const pmid = doiMap.get(c.doi!.toLowerCase());
      if (pmid) { c.resolvedPmid = pmid; doiResolved++; }
    }
    log(`  Tier 1 resolved: ${doiResolved}/${withDoi.length}`);
  }

  // Tier 2: ECitMatch
  const unresolvedForEcit = journalCitations.filter(c => !c.resolvedPmid);
  const ecitEligible = unresolvedForEcit.filter(c => c.journalApprox && c.year && c.firstAuthorLastName);
  if (ecitEligible.length > 0) {
    log(`  Tier 2: ECitMatch for ${ecitEligible.length} citations...`);
    const { resolveCitationsViaECitMatch } = await import('../src/lib/research/ingest-epub');
    const ecitMap = await resolveCitationsViaECitMatch(ecitEligible, {
      apiKey: pubmedApiKey,
      onProgress: log,
    });
    for (const c of ecitEligible) {
      const pmid = ecitMap.get(c.id);
      if (pmid) c.resolvedPmid = pmid;
    }
  }

  // Tier 3: Title search (original strict version)
  const unresolvedForTitle = journalCitations.filter(c => !c.resolvedPmid && c.titleApprox);
  if (unresolvedForTitle.length > 0) {
    log(`  Tier 3: Strict title search for ${unresolvedForTitle.length} citations...`);
    let titleResolved = 0;
    let processed = 0;
    for (const c of unresolvedForTitle) {
      processed++;
      const pmid = await searchPmidByCitation(c, { apiKey: pubmedApiKey });
      if (pmid) { c.resolvedPmid = pmid; titleResolved++; }
      if (processed % 100 === 0) log(`    ${processed}/${unresolvedForTitle.length}, resolved ${titleResolved}`);
    }
    log(`  Tier 3 resolved: ${titleResolved}/${unresolvedForTitle.length}`);
  }

  const afterTier3 = journalCitations.filter(c => c.resolvedPmid).length;
  const stillUnresolved = journalCitations.filter(c => !c.resolvedPmid);
  log(`\n  After tiers 1-3: ${afterTier3} resolved, ${stillUnresolved.length} still unresolved`);

  // ── Step 4: CrossRef resolution ──────────────────────────────────────────
  const crossRefMap = await resolveCitationsViaCrossRef(stillUnresolved, {
    delayMs: 1100,
    onProgress: log,
  });

  // ── Step 5: Loose PubMed title search ────────────────────────────────────
  const afterCrossRef = journalCitations.filter(c => !c.resolvedPmid);
  const looseMap = await loosePubmedTitleSearch(afterCrossRef, {
    apiKey: pubmedApiKey,
    delayMs: 350,
    onProgress: log,
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const allResolvedPmids = journalCitations
    .filter(c => c.resolvedPmid)
    .map(c => c.resolvedPmid!);

  const uniquePmids = [...new Set(allResolvedPmids)];
  const newPmids = uniquePmids.filter(p => !existingPmids.has(p));

  log(`\n══ Summary ════════════════════════════════════════════`);
  log(`   Total journal citations: ${journalCitations.length}`);
  log(`   Resolved (all tiers): ${uniquePmids.length}`);
  log(`   Already in DB: ${uniquePmids.length - newPmids.length}`);
  log(`   NEW PMIDs to ingest: ${newPmids.length}`);
  log(`   Breakdown:`);
  log(`     CrossRef found: ${crossRefMap.size} new PMIDs`);
  log(`     Loose search found: ${looseMap.size} new PMIDs`);

  // Save unresolved citations for debugging
  const finalUnresolved = journalCitations.filter(c => !c.resolvedPmid);
  if (finalUnresolved.length > 0) {
    const unresolvedFile = 'data/unresolved-citations.json';
    writeFileSync(unresolvedFile, JSON.stringify(
      finalUnresolved.map(c => ({
        id: c.id,
        authors: c.authorsApprox?.slice(0, 50),
        title: c.titleApprox?.slice(0, 80),
        year: c.year,
        journal: c.journalApprox,
        doi: c.doi,
      })),
      null,
      2
    ));
    log(`   Still unresolved: ${finalUnresolved.length} (saved to ${unresolvedFile})`);
  }

  // ── Step 6: Ingest new PMIDs ─────────────────────────────────────────────
  if (newPmids.length > 0 && !dryRun) {
    const pmidsToIngest = limit > 0 ? newPmids.slice(0, limit) : newPmids;
    log(`\nStep 6: Ingesting ${pmidsToIngest.length} new studies...`);

    const result = await ingestPmids(pmidsToIngest, {
      supabaseUrl,
      supabaseServiceKey: supabaseKey,
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pubmedApiKey,
      source: 'greger_epub',
      dryRun: false,
      onProgress: log,
    });

    log(`\n  Ingestion complete:`);
    log(`    Total: ${result.total}`);
    log(`    Inserted: ${result.inserted}`);
    log(`    Skipped: ${result.skipped}`);
    log(`    Errors: ${result.errors}`);
  } else if (newPmids.length > 0) {
    log(`\n  DRY RUN — would ingest ${newPmids.length} new PMIDs`);
    // Save new PMIDs for manual ingestion
    const newPmidsFile = 'data/new-pmids-from-resolution.json';
    writeFileSync(newPmidsFile, JSON.stringify(newPmids, null, 2));
    log(`  Saved to ${newPmidsFile}`);
  } else {
    log(`\n  No new PMIDs to ingest.`);
  }

  log('\nDone! ✅');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
