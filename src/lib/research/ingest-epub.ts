// src/lib/research/ingest-epub.ts
// Extracts structured citations from Greger EPUB endnotes and resolves them to PMIDs.
// The 3 smaller Greger books (Ozempic, Ultra-Processed Foods, Lower LDL Cholesterol)
// don't have nutritionfacts.org citation pages, so we parse the EPUBs directly.
//
// Pipeline: EPUB → extract endnotes → parse citation text → resolve to PMIDs via:
//   1. DOI → PMID lookup (batch, fast)
//   2. ECitMatch API (journal + year + volume + first_page + author → PMID, ~70-80% hit rate)
//   3. PubMed title search (fallback for remaining ~20%)

import { sleep } from './pubmed-api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EpubBookConfig {
  path: string;
  label: string;
  key: string;
}

export interface ExtractedCitation {
  id: string;
  rawText: string;
  isJournal: boolean;
  authorsApprox?: string;
  titleApprox?: string;
  year?: number;
  doi?: string;
  resolvedPmid?: string;
  // ECitMatch fields (parsed from structured journal citations)
  journalApprox?: string;
  volume?: string;
  firstPage?: string;
  firstAuthorLastName?: string;
}

export interface EpubExtractionResult {
  book: string;
  totalEntries: number;
  journalCitations: number;
  withDoi: number;
  resolvedPmids: string[];
  unresolvedCount: number;
}

// ── Default book configs ─────────────────────────────────────────────────────

// All 6 Greger books — nutritionfacts.org citation pages no longer contain
// PubMed URLs, so we extract citations from EPUBs and resolve to PMIDs
// via DOI lookup + PubMed title search.
export const GREGER_EPUB_BOOKS: EpubBookConfig[] = [
  // 3 major books
  {
    path: 'data/greger-books/EN How Not to Age.epub',
    label: 'How Not to Age',
    key: 'how_not_to_age',
  },
  {
    path: 'data/greger-books/EN How Not to Diet.epub',
    label: 'How Not to Diet',
    key: 'how_not_to_diet',
  },
  {
    path: 'data/greger-books/How Not to Die.epub',
    label: 'How Not to Die',
    key: 'how_not_to_die',
  },
  // 3 smaller books
  {
    path: 'data/greger-books/Lower-LDL-Cholesterol-Naturally-with-Food.epub',
    label: 'Lower LDL Cholesterol Naturally with Food',
    key: 'lower_ldl',
  },
  {
    path: 'data/greger-books/Ozempic.epub',
    label: 'Ozempic',
    key: 'ozempic',
  },
  {
    path: 'data/greger-books/Ultra-Processed-Foods.epub',
    label: 'Ultra-Processed Foods',
    key: 'ultra_processed',
  },
];

// ── EPUB Parsing ─────────────────────────────────────────────────────────────

// EPUBs are ZIP files with XHTML content — we use Node.js built-in unzip
// Note: We use a simple approach since the endnote structure in these books
// is consistent (role="doc-endnotes" section with <li> entries)

/**
 * Extract all XHTML file contents from an EPUB (ZIP) file.
 * Uses native `unzip` command — works without any npm dependencies.
 */
async function readEpubXhtmlNative(epubPath: string): Promise<Map<string, string>> {
  const { execSync } = await import('child_process');
  const { mkdtempSync, readdirSync, readFileSync: readFs, rmSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const tmpDir = mkdtempSync(join(tmpdir(), 'epub-'));
  try {
    execSync(`unzip -o -q "${epubPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

    const result = new Map<string, string>();
    const walkDir = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.xhtml') || entry.name.endsWith('.html')) {
          const content = readFs(fullPath, 'utf-8');
          result.set(fullPath.replace(tmpDir + '/', ''), content);
        }
      }
    };
    walkDir(tmpDir);
    return result;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Parse endnote entries from XHTML content.
 * Looks for <section role="doc-endnotes"> with <li> entries,
 * or falls back to regex-based extraction.
 */
function parseEndnotes(xhtmlContent: string): ExtractedCitation[] {
  const citations: ExtractedCitation[] = [];

  // Pattern 1: Structured endnotes (role="doc-endnotes" with <li> elements)
  const endnotesMatch = xhtmlContent.match(
    /<section[^>]*role="doc-endnotes"[^>]*>([\s\S]*?)<\/section>/
  );

  if (endnotesMatch) {
    const section = endnotesMatch[1];
    const liMatches = section.matchAll(/<li[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/li>/g);

    for (const m of liMatches) {
      const id = m[1];
      const rawHtml = m[2];
      const text = stripHtml(rawHtml).trim();

      if (text.length < 10) continue; // Skip empty/trivial entries

      citations.push(parseCitationText(id, text));
    }

    return citations;
  }

  // Pattern 2: Footnote-style (id="footnote-NNN" or id="endnote-NNN")
  const footnoteMatches = xhtmlContent.matchAll(
    /<(?:li|p|div)[^>]*id="((?:foot|end)note-\d+)"[^>]*>([\s\S]*?)<\/(?:li|p|div)>/g
  );

  for (const m of footnoteMatches) {
    const id = m[1];
    const text = stripHtml(m[2]).trim();
    if (text.length < 10) continue;
    citations.push(parseCitationText(id, text));
  }

  // Pattern 3: Notes chapter with numbered entries (e.g., "notes-ch1-102")
  const notesChapterMatches = xhtmlContent.matchAll(
    /<li[^>]*id="(notes-[^"]+)"[^>]*>([\s\S]*?)<\/li>/g
  );

  for (const m of notesChapterMatches) {
    const id = m[1];
    const text = stripHtml(m[2]).trim();
    if (text.length < 10) continue;
    // Avoid duplicates if Pattern 1 already captured these
    if (!citations.some(c => c.id === id)) {
      citations.push(parseCitationText(id, text));
    }
  }

  return citations;
}

/**
 * Parse a single citation's raw text to extract structured fields.
 */
function parseCitationText(id: string, text: string): ExtractedCitation {
  const citation: ExtractedCitation = {
    id,
    rawText: text,
    isJournal: isJournalCitation(text),
  };

  // Extract DOI
  const doiMatch = text.match(/doi[:\s]*(10\.\d{4,}\/[^\s;,)]+)/i);
  if (doiMatch) {
    citation.doi = doiMatch[1].replace(/\.$/, ''); // strip trailing period
  }

  // Extract year from citation pattern (usually after journal name: "2024;54(3)")
  const yearMatch = text.match(/[;.]\s*(\d{4})[;:\s(]/);
  if (yearMatch) {
    citation.year = parseInt(yearMatch[1], 10);
  } else {
    const fallbackYear = text.match(/\b(19\d{2}|20[012]\d)\b/);
    if (fallbackYear) citation.year = parseInt(fallbackYear[1], 10);
  }

  // Extract approximate authors (text before first period)
  const parts = text.split(/\.\s/);
  if (parts.length >= 3) {
    citation.authorsApprox = parts[0].trim();
    citation.titleApprox = parts[1].trim();
  }

  // ── ECitMatch fields ──────────────────────────────────────────────────────
  // Standard citation format: "Author AB, Author CD. Title. Journal Abbrev. Year;Vol(Issue):Pages."
  // We need: journal abbreviation, volume, first page, first author last name

  // First author last name (first word before initials or comma)
  if (citation.authorsApprox) {
    const firstAuthor = citation.authorsApprox.split(/[,;]/)[0].trim();
    // "Kassirer JP" → "Kassirer", "van der Berg A" → "van der Berg"
    const nameMatch = firstAuthor.match(/^(.+?)\s+[A-Z]{1,3}$/);
    if (nameMatch) {
      citation.firstAuthorLastName = nameMatch[1].trim();
    } else {
      // Fallback: just use the first word(s) before any single-letter initials
      citation.firstAuthorLastName = firstAuthor.replace(/\s+[A-Z]$/, '').trim();
    }
  }

  // Journal + volume + pages: match "Journal Name. Year;Vol(Issue):FirstPage–LastPage"
  // or "Journal Name. Year;Vol:FirstPage-LastPage"
  const journalVolumeMatch = text.match(
    /\.\s+([A-Z][^.]+?)\.\s*\d{4}\s*;(\d+)\s*(?:\([^)]*\))?\s*:\s*(\d+)/
  );
  if (journalVolumeMatch) {
    citation.journalApprox = journalVolumeMatch[1].trim();
    citation.volume = journalVolumeMatch[2];
    citation.firstPage = journalVolumeMatch[3];
  } else {
    // Looser pattern: "Journal Name. Year;Vol(Issue):Pages" without requiring colon
    const looseMatch = text.match(
      /\.\s+([A-Z][A-Za-z\s&]+(?:\s[A-Z][a-z]+)*)\.\s*(\d{4})\s*;\s*(\d+)/
    );
    if (looseMatch) {
      citation.journalApprox = looseMatch[1].trim();
      citation.volume = looseMatch[3];
      // Try to find first page separately
      const pageMatch = text.match(/:\s*(\d+)\s*[-–—]/);
      if (pageMatch) citation.firstPage = pageMatch[1];
    }
  }

  return citation;
}

/**
 * Heuristic: does this look like a journal citation?
 */
function isJournalCitation(text: string): boolean {
  return (
    /\d{4};\d+(\(\d+\))?/.test(text) ||           // 2024;54(3)
    /Published online/i.test(text) ||               // Published online
    /\.\s*\d{4};\d+/.test(text) ||                  // . 2024;54
    /et al\./.test(text) ||                         // et al.
    /\b[A-Z][a-z]+ [A-Z]{1,2}[,.]/.test(text)      // Author AB, (initials pattern)
  );
}

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── PMID Resolution ──────────────────────────────────────────────────────────

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * Resolve a DOI to a PMID using NCBI's ID converter.
 * Batch-friendly: processes up to 200 DOIs at once.
 */
export async function resolveDoiToPmid(
  dois: string[],
  options: { apiKey?: string; delayMs?: number } = {}
): Promise<Map<string, string>> {
  const { apiKey, delayMs = 350 } = options;
  const doiToPmid = new Map<string, string>();

  // Use NCBI's ID converter API
  // https://www.ncbi.nlm.nih.gov/pmc/tools/id-converter-api/
  const batchSize = 100;
  for (let i = 0; i < dois.length; i += batchSize) {
    const batch = dois.slice(i, i + batchSize);
    const params = new URLSearchParams({
      ids: batch.join(','),
      format: 'json',
      tool: 'evidalife',
      email: 'research@evidalife.com',
    });

    try {
      const url = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?${params}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        for (const record of data.records ?? []) {
          if (record.pmid && record.doi) {
            doiToPmid.set(record.doi.toLowerCase(), record.pmid);
          }
        }
      }
    } catch (e) {
      console.warn(`  DOI batch resolution error: ${e}`);
    }

    if (i + batchSize < dois.length) await sleep(delayMs);
  }

  return doiToPmid;
}

/**
 * Resolve citations to PMIDs using PubMed's ECitMatch API.
 * This is specifically designed for bibliographic citation matching and
 * is much more accurate than title search (~70-80% hit rate).
 *
 * ECitMatch format: journal_title|year|volume|first_page|author_name|key|
 * Batch-friendly: up to ~200 citations per request.
 *
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ECitMatch
 */
export async function resolveCitationsViaECitMatch(
  citations: ExtractedCitation[],
  options: { apiKey?: string; delayMs?: number; onProgress?: (msg: string) => void } = {}
): Promise<Map<string, string>> {
  const { apiKey, delayMs = 350, onProgress = console.log } = options;
  const citationIdToPmid = new Map<string, string>();

  // Filter to citations that have the required ECitMatch fields
  const eligible = citations.filter(
    c => !c.resolvedPmid && c.journalApprox && c.year && c.firstAuthorLastName
  );

  if (eligible.length === 0) return citationIdToPmid;

  onProgress(`  ECitMatch: ${eligible.length} eligible citations (have journal + year + author)`);

  // ECitMatch supports batches in the request body (one citation per line)
  const batchSize = 150; // stay under limits
  let resolved = 0;
  let processed = 0;

  for (let i = 0; i < eligible.length; i += batchSize) {
    const batch = eligible.slice(i, i + batchSize);

    // Build the bdata string: one citation per line
    // Format: journal|year|volume|first_page|author_name|key|\n
    const lines = batch.map(c => {
      const journal = c.journalApprox ?? '';
      const year = c.year?.toString() ?? '';
      const volume = c.volume ?? '';
      const firstPage = c.firstPage ?? '';
      const author = c.firstAuthorLastName ?? '';
      // Use the citation ID as the key so we can map results back
      return `${journal}|${year}|${volume}|${firstPage}|${author}|${c.id}|`;
    });

    const bdata = lines.join('\n');

    try {
      const params = new URLSearchParams({
        db: 'pubmed',
        retmode: 'xml',
        bdata,
      });
      if (apiKey) params.set('api_key', apiKey);

      const res = await fetch(`${NCBI_BASE}/ecitmatch.cgi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (res.ok) {
        const text = await res.text();
        // Response format: one line per citation, pipe-delimited
        // journal|year|volume|first_page|author|key|PMID
        // If no match, PMID field is "NOT_FOUND"
        for (const line of text.trim().split('\n')) {
          if (!line.trim()) continue;
          const fields = line.split('|');
          // The key is at index 5, PMID at index 6
          if (fields.length >= 7) {
            const key = fields[5]?.trim();
            const pmid = fields[6]?.trim();
            if (key && pmid && pmid !== 'NOT_FOUND' && pmid !== '') {
              citationIdToPmid.set(key, pmid);
              resolved++;
            }
          }
        }
      } else {
        onProgress(`  ECitMatch batch error: HTTP ${res.status}`);
      }
    } catch (e) {
      onProgress(`  ECitMatch batch error: ${e}`);
    }

    processed += batch.length;
    if (processed % 300 === 0 || i + batchSize >= eligible.length) {
      onProgress(`  ECitMatch: ${processed}/${eligible.length} processed, ${resolved} resolved`);
    }

    if (i + batchSize < eligible.length) await sleep(delayMs);
  }

  onProgress(`  ECitMatch resolved ${resolved}/${eligible.length} (${Math.round(resolved / eligible.length * 100)}%)`);
  return citationIdToPmid;
}

/**
 * Search PubMed for a citation by title/author to find its PMID.
 * Fallback strategy: title words + first author + year.
 * Used after DOI lookup and ECitMatch have been tried.
 */
export async function searchPmidByCitation(
  citation: ExtractedCitation,
  options: { apiKey?: string; delayMs?: number } = {}
): Promise<string | null> {
  const { apiKey, delayMs = 350 } = options;

  if (!citation.titleApprox || !citation.year) return null;

  // Build a targeted PubMed search
  // Strategy: use first ~8 words of title + year
  const titleWords = citation.titleApprox
    .replace(/[^\w\s]/g, '') // remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 8)
    .join(' ');

  if (titleWords.length < 10) return null; // too short to search reliably

  const query = `${titleWords}[Title] AND ${citation.year}[pdat]`;

  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: '3',
    retmode: 'json',
  });
  if (apiKey) params.set('api_key', apiKey);

  try {
    await sleep(delayMs);
    const res = await fetch(`${NCBI_BASE}/esearch.fcgi?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const ids: string[] = data.esearchresult?.idlist ?? [];

    // If exactly 1 result, it's a confident match
    if (ids.length === 1) return ids[0];

    // If 2-3 results, return the first (most relevant) — PubMed search is usually accurate
    if (ids.length > 0 && ids.length <= 3) return ids[0];

    return null;
  } catch {
    return null;
  }
}

// ── Main Export ──────────────────────────────────────────────────────────────

export interface CollectEpubPmidsOptions {
  epubPaths: EpubBookConfig[];
  pubmedApiKey?: string;
  delayMs?: number;
  onProgress?: (msg: string) => void;
}

/**
 * Main function: extract citations from EPUB files and resolve them to PMIDs.
 */
export async function collectEpubPmids(
  options: CollectEpubPmidsOptions
): Promise<{ pmids: string[]; stats: Record<string, number> }> {
  const {
    epubPaths,
    pubmedApiKey,
    delayMs = 350,
    onProgress = console.log,
  } = options;

  const allPmids = new Set<string>();
  const stats: Record<string, number> = {};

  for (const book of epubPaths) {
    onProgress(`\nProcessing EPUB: ${book.label}`);
    onProgress(`  Path: ${book.path}`);

    // Step 1: Extract XHTML from EPUB
    let xhtmlFiles: Map<string, string>;
    try {
      xhtmlFiles = await readEpubXhtmlNative(book.path);
    } catch (e) {
      onProgress(`  Error reading EPUB: ${e}`);
      stats[book.label] = 0;
      continue;
    }

    onProgress(`  Found ${xhtmlFiles.size} HTML files`);

    // Step 2: Extract citations from all files
    const allCitations: ExtractedCitation[] = [];
    for (const [filename, content] of xhtmlFiles) {
      const citations = parseEndnotes(content);
      allCitations.push(...citations);
    }

    const journalCitations = allCitations.filter(c => c.isJournal);
    const withDoi = journalCitations.filter(c => c.doi);
    const withoutDoi = journalCitations.filter(c => !c.doi && c.titleApprox);

    const withEcitFields = journalCitations.filter(c => c.journalApprox && c.year && c.firstAuthorLastName);

    onProgress(`  Total endnotes: ${allCitations.length}`);
    onProgress(`  Journal citations: ${journalCitations.length}`);
    onProgress(`  With DOI: ${withDoi.length}`);
    onProgress(`  ECitMatch-ready (journal+year+author): ${withEcitFields.length}`);
    onProgress(`  Searchable by title: ${withoutDoi.length}`);

    // ── Step 3: Resolve DOIs to PMIDs (batch, fast) ────────────────────────
    if (withDoi.length > 0) {
      onProgress(`  Resolving ${withDoi.length} DOIs to PMIDs...`);
      const dois = withDoi.map(c => c.doi!);
      const doiMap = await resolveDoiToPmid(dois, { apiKey: pubmedApiKey, delayMs });

      let doiResolved = 0;
      for (const citation of withDoi) {
        const pmid = doiMap.get(citation.doi!.toLowerCase());
        if (pmid) {
          citation.resolvedPmid = pmid;
          allPmids.add(pmid);
          doiResolved++;
        }
      }
      onProgress(`  Resolved ${doiResolved}/${withDoi.length} DOIs to PMIDs`);
    }

    // ── Step 4: ECitMatch for unresolved journal citations (batch, accurate) ─
    const unresolvedJournal = journalCitations.filter(c => !c.resolvedPmid);
    const ecitEligible = unresolvedJournal.filter(c => c.journalApprox && c.year && c.firstAuthorLastName);
    onProgress(`  ECitMatch eligible: ${ecitEligible.length}/${unresolvedJournal.length} unresolved`);

    if (ecitEligible.length > 0) {
      const ecitMap = await resolveCitationsViaECitMatch(ecitEligible, {
        apiKey: pubmedApiKey,
        delayMs,
        onProgress,
      });

      for (const citation of ecitEligible) {
        const pmid = ecitMap.get(citation.id);
        if (pmid) {
          citation.resolvedPmid = pmid;
          allPmids.add(pmid);
        }
      }
    }

    // ── Step 5: Title search fallback for remaining unresolved ────────────
    const stillUnresolved = journalCitations.filter(c => !c.resolvedPmid && c.titleApprox);
    if (stillUnresolved.length > 0) {
      onProgress(`  Title search fallback for ${stillUnresolved.length} remaining citations...`);
      let titleResolved = 0;
      let processed = 0;

      for (const citation of stillUnresolved) {
        processed++;

        const pmid = await searchPmidByCitation(citation, {
          apiKey: pubmedApiKey,
          delayMs,
        });

        if (pmid) {
          citation.resolvedPmid = pmid;
          allPmids.add(pmid);
          titleResolved++;
        }

        // Progress every 100 citations
        if (processed % 100 === 0) {
          onProgress(`    ${processed}/${stillUnresolved.length} searched, ${titleResolved} resolved`);
        }
      }
      onProgress(`  Title search resolved ${titleResolved}/${stillUnresolved.length}`);
    }

    const bookPmids = journalCitations.filter(c => c.resolvedPmid).length;
    stats[book.label] = bookPmids;
    onProgress(`  Total PMIDs for ${book.label}: ${bookPmids}`);
  }

  return { pmids: Array.from(allPmids), stats };
}
