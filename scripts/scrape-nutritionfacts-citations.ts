#!/usr/bin/env npx tsx
// scripts/scrape-nutritionfacts-citations.ts
// Scrapes citation pages from nutritionfacts.org for Greger's books.
// These pages use Ninja Tables (WordPress plugin) which loads citation data
// via AJAX from a CSV data source. Each citation includes PubMed links.
//
// Usage:
//   npx tsx scripts/scrape-nutritionfacts-citations.ts [options]
//
// Options:
//   --book age|diet|die|all        Which book(s) to scrape (default: all)
//   --output PATH                  Output JSON file (default: data/nf-citations-{book}.json)
//   --dry-run                      Print stats without saving
//   --compare                      Compare with existing DB studies and show gap

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (avoids dotenv dependency)
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

// ── Book citation page configs ───────────────────────────────────────────────

interface BookConfig {
  key: string;
  label: string;
  citationUrl: string;
  // Table IDs discovered from the Ninja Tables widget on each page
  // These are needed for the AJAX API call
  tableId: string;
}

const BOOKS: BookConfig[] = [
  {
    key: 'age',
    label: 'How Not to Age',
    citationUrl: 'https://nutritionfacts.org/book/how-not-to-age/citations/',
    tableId: '115571',
  },
  {
    key: 'diet',
    label: 'How Not to Diet',
    citationUrl: 'https://nutritionfacts.org/book/how-not-to-diet/citations/',
    tableId: '115564',
  },
  {
    key: 'die',
    label: 'How Not to Die',
    citationUrl: 'https://nutritionfacts.org/book/how-not-to-die/citations/',
    tableId: '', // Will discover from page
  },
];

// ── Fetch nonce from citation page ───────────────────────────────────────────

async function fetchNonce(citationUrl: string): Promise<{ nonce: string; ajaxUrl: string; tableId: string | null }> {
  const resp = await fetch(citationUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  const html = await resp.text();

  // Extract nonce
  const nonceMatch = html.match(/ninja_table_public_nonce["']\s*:\s*["']([a-f0-9]+)["']/);
  if (!nonceMatch) throw new Error(`Could not find nonce on ${citationUrl}`);

  // Extract ajax URL
  const ajaxMatch = html.match(/["']ajax_url["']\s*:\s*["'](https?:[^"']+)["']/);
  const ajaxUrl = ajaxMatch ? ajaxMatch[1].replace(/\\\//g, '/') : 'https://nutritionfacts.org/wp/wp-admin/admin-ajax.php';

  // Try to discover table ID from page if not known
  const tableIdMatch = html.match(/footable_(\d+)/);
  const discoveredTableId = tableIdMatch ? tableIdMatch[1] : null;

  return { nonce: nonceMatch[1], ajaxUrl, tableId: discoveredTableId };
}

// ── Fetch all citations via Ninja Tables AJAX ────────────────────────────────

interface RawCitation {
  number: number;
  text: string;
  pubmedUrl?: string;
  pmid?: string;
  doiUrl?: string;
  doi?: string;
}

async function fetchAllCitations(
  ajaxUrl: string,
  tableId: string,
  nonce: string,
  onProgress?: (msg: string) => void,
): Promise<RawCitation[]> {
  const allCitations: RawCitation[] = [];
  let page = 1;
  const perPage = 500; // Request large batches

  while (true) {
    const params = new URLSearchParams({
      action: 'ninja_table_public_action',
      table_id: tableId,
      target_action: 'get-all-data',
      default_sorting: 'old_first',
      ninja_table_public_nonce: nonce,
      skip_rows: String((page - 1) * perPage),
      limit_rows: String(perPage),
    });

    const resp = await fetch(ajaxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: params.toString(),
    });

    if (!resp.ok) {
      // Try alternate approach - fetch with no pagination
      if (page === 1) {
        onProgress?.(`  AJAX returned ${resp.status}, trying alternate params...`);
        return await fetchCitationsAlternate(ajaxUrl, tableId, nonce, onProgress);
      }
      break;
    }

    const data = await resp.json();

    if (!Array.isArray(data) || data.length === 0) {
      if (page === 1) {
        // Try the alternate approach
        onProgress?.(`  Got empty response, trying alternate params...`);
        return await fetchCitationsAlternate(ajaxUrl, tableId, nonce, onProgress);
      }
      break;
    }

    for (const row of data) {
      const citation = parseCitationRow(row);
      if (citation) allCitations.push(citation);
    }

    onProgress?.(`  Page ${page}: fetched ${data.length} rows (total: ${allCitations.length})`);

    if (data.length < perPage) break;
    page++;

    // Be polite
    await new Promise(r => setTimeout(r, 500));
  }

  return allCitations;
}

// Alternate fetching approach — some Ninja Tables configs need different params
async function fetchCitationsAlternate(
  ajaxUrl: string,
  tableId: string,
  nonce: string,
  onProgress?: (msg: string) => void,
): Promise<RawCitation[]> {
  // Try fetching with the format the FooTable JS client uses
  const params = new URLSearchParams({
    action: 'ninja_table_public_action',
    table_id: tableId,
    target_action: 'get-all-data',
    default_sorting: 'old_first',
    ninja_table_public_nonce: nonce,
  });

  const resp = await fetch(ajaxUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://nutritionfacts.org/`,
    },
    body: params.toString(),
  });

  const text = await resp.text();
  onProgress?.(`  Alternate response: status=${resp.status}, length=${text.length}`);

  if (text === '0' || text === '') {
    onProgress?.(`  ⚠ AJAX API returned empty. Falling back to HTML scraping...`);
    return [];
  }

  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) return [];
    return data.map(parseCitationRow).filter((c): c is RawCitation => c !== null);
  } catch {
    return [];
  }
}

// ── Parse a single citation row from the Ninja Tables response ───────────────

function parseCitationRow(row: any): RawCitation | null {
  // Ninja Tables returns rows as objects with column keys like "ninja_column_1", "ninja_column_2"
  const numCol = row['ninja_column_1'] ?? row['0'] ?? row['#'];
  const textCol = row['ninja_column_2'] ?? row['1'] ?? row['Citation'] ?? row['citation'];

  if (!textCol) return null;

  const text = stripHtml(String(textCol));
  const number = parseInt(String(numCol), 10) || 0;

  // Extract PubMed URL and PMID
  const pubmedMatch = String(textCol).match(/href=["'](https?:\/\/(?:www\.)?(?:ncbi\.nlm\.nih\.gov\/)?pubmed[^"']*)/i)
    || text.match(/(https?:\/\/(?:www\.)?(?:ncbi\.nlm\.nih\.gov\/)?pubmed\/?\d+)/i);
  const pubmedUrl = pubmedMatch ? pubmedMatch[1] : undefined;
  const pmidMatch = pubmedUrl?.match(/\/(\d{5,10})/);
  const pmid = pmidMatch ? pmidMatch[1] : undefined;

  // Also try to find PMID in the text directly
  const textPmidMatch = text.match(/PMID[:\s]*(\d{5,10})/i);
  const finalPmid = pmid || (textPmidMatch ? textPmidMatch[1] : undefined);

  // Extract DOI
  const doiMatch = text.match(/doi[:\s]*(10\.\d{4,}\/[^\s;,)]+)/i)
    || String(textCol).match(/href=["'](https?:\/\/doi\.org\/10\.[^"']+)/i);
  const doi = doiMatch ? doiMatch[1].replace(/^https?:\/\/doi\.org\//, '').replace(/\.$/, '') : undefined;

  return { number, text, pubmedUrl, pmid: finalPmid, doiUrl: doiMatch?.[0], doi };
}

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

// ── Fallback: scrape rendered HTML page (if AJAX fails) ──────────────────────

async function scrapeCitationPageHtml(
  citationUrl: string,
  onProgress?: (msg: string) => void,
): Promise<RawCitation[]> {
  onProgress?.(`  Trying HTML page scraping for ${citationUrl}...`);

  // The citations page might render server-side for crawlers
  const resp = await fetch(citationUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html',
    },
  });

  const html = await resp.text();

  // Look for citation data embedded in the page (some Ninja Tables configs embed data inline)
  const citations: RawCitation[] = [];

  // Pattern: numbered citations in list items or table rows
  const liPattern = new RegExp('<(?:li|tr)[^>]*>.*?(\\d+)\\.\\s*(.*?)<\\/(?:li|tr)>', 'gs');
  for (const match of html.matchAll(liPattern)) {
    const citation = parseCitationRow({ ninja_column_1: match[1], ninja_column_2: match[2] });
    if (citation) citations.push(citation);
  }

  onProgress?.(`  HTML scraping found ${citations.length} citations`);
  return citations;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const hasFlag = (flag: string) => args.includes(flag);

  const bookFilter = getArg('--book') || 'all';
  const outputPath = getArg('--output');
  const dryRun = hasFlag('--dry-run');
  const compare = hasFlag('--compare');

  const booksToScrape = bookFilter === 'all'
    ? BOOKS
    : BOOKS.filter(b => b.key === bookFilter);

  if (booksToScrape.length === 0) {
    console.error(`Unknown book: ${bookFilter}. Use: age, diet, die, or all`);
    process.exit(1);
  }

  console.log(`\n📚 NutritionFacts.org Citation Scraper`);
  console.log(`   Books: ${booksToScrape.map(b => b.label).join(', ')}\n`);

  const allResults: Record<string, { citations: RawCitation[]; withPmid: number; withDoi: number }> = {};
  const allPmids = new Set<string>();

  for (const book of booksToScrape) {
    console.log(`── ${book.label} ──────────────────────────────────────`);

    try {
      // Step 1: Get nonce from citation page
      console.log(`  Fetching nonce from ${book.citationUrl}...`);
      const { nonce, ajaxUrl, tableId: discoveredTableId } = await fetchNonce(book.citationUrl);
      const tableId = book.tableId || discoveredTableId;

      if (!tableId) {
        console.log(`  ⚠ Could not find table ID for ${book.label}, skipping`);
        continue;
      }

      console.log(`  Table ID: ${tableId}, nonce: ${nonce}`);

      // Step 2: Fetch citations via AJAX
      let citations = await fetchAllCitations(ajaxUrl, tableId, nonce, console.log);

      // Step 3: Fallback to HTML scraping if AJAX failed
      if (citations.length === 0) {
        citations = await scrapeCitationPageHtml(book.citationUrl, console.log);
      }

      if (citations.length === 0) {
        console.log(`  ⚠ No citations found for ${book.label}`);
        console.log(`  💡 You may need to manually export the table from the NutritionFacts.org page`);
        console.log(`     Open ${book.citationUrl} in a browser and look for an export/download option`);
        continue;
      }

      const withPmid = citations.filter(c => c.pmid).length;
      const withDoi = citations.filter(c => c.doi).length;

      console.log(`\n  📊 Results for ${book.label}:`);
      console.log(`     Total citations: ${citations.length}`);
      console.log(`     With PubMed ID: ${withPmid} (${(100 * withPmid / citations.length).toFixed(0)}%)`);
      console.log(`     With DOI: ${withDoi} (${(100 * withDoi / citations.length).toFixed(0)}%)`);
      console.log(`     No identifiers: ${citations.length - withPmid - withDoi + citations.filter(c => c.pmid && c.doi).length}`);

      allResults[book.key] = { citations, withPmid, withDoi };
      for (const c of citations) {
        if (c.pmid) allPmids.add(c.pmid);
      }

      // Save per-book output
      if (!dryRun) {
        const outFile = outputPath || `data/nf-citations-${book.key}.json`;
        writeFileSync(outFile, JSON.stringify(citations, null, 2));
        console.log(`     Saved to ${outFile}`);
      }

    } catch (err: any) {
      console.error(`  ❌ Error scraping ${book.label}: ${err.message}`);
    }

    console.log('');
  }

  // Summary
  console.log(`\n══ Summary ════════════════════════════════════════════`);
  console.log(`   Total unique PMIDs across all books: ${allPmids.size}`);

  // Compare with existing DB
  if (compare && allPmids.size > 0) {
    console.log(`\n   Comparing with existing studies in Supabase...`);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        // Fetch existing PMIDs from DB
        const resp = await fetch(`${supabaseUrl}/rest/v1/studies?select=pmid&source=eq.greger_epub`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        const existing = await resp.json();
        const existingPmids = new Set(existing.map((s: any) => s.pmid));

        const newPmids = [...allPmids].filter(p => !existingPmids.has(p));
        const overlap = allPmids.size - newPmids.length;

        console.log(`   Existing studies in DB: ${existingPmids.size}`);
        console.log(`   Already in DB: ${overlap}`);
        console.log(`   NEW PMIDs to add: ${newPmids.length}`);

        if (newPmids.length > 0 && !dryRun) {
          const newPmidsFile = 'data/nf-new-pmids.json';
          writeFileSync(newPmidsFile, JSON.stringify(newPmids, null, 2));
          console.log(`   Saved new PMIDs to ${newPmidsFile}`);
          console.log(`   To ingest them: npx tsx scripts/ingest-studies.ts --pmids "$(cat ${newPmidsFile} | tr -d '[]" ' | tr ',' ',')"`);
        }
      } catch (err: any) {
        console.error(`   ⚠ Could not compare with DB: ${err.message}`);
      }
    } else {
      console.log(`   ⚠ No Supabase credentials found, skipping DB comparison`);
    }
  }

  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
