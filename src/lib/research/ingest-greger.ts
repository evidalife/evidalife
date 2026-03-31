// src/lib/research/ingest-greger.ts
// Extracts PMIDs from nutritionfacts.org citation pages (CC BY-NC 4.0)
// Michael Greger's books and NutritionFacts.org videos cite PubMed studies.
// This scraper finds all citation pages and extracts the PMIDs.

export interface GregerSource {
  url: string;
  label: string;
}

// Nutritionfacts.org citation pages for Greger's major books
// Each page lists the referenced PubMed studies with PMIDs
export const GREGER_BOOK_SOURCES: GregerSource[] = [
  // How Not to Die — chapter citation pages
  { url: 'https://nutritionfacts.org/book/how-not-to-die/citations/', label: 'How Not to Die' },
  // How Not to Age
  { url: 'https://nutritionfacts.org/book/how-not-to-age/citations/', label: 'How Not to Age' },
  // How Not to Diet
  { url: 'https://nutritionfacts.org/book/how-not-to-diet/citations/', label: 'How Not to Diet' },
];

// Extract PMIDs from a single citation page HTML
export function extractPmidsFromHtml(html: string): string[] {
  const pmids = new Set<string>();

  // Pattern 1: Direct PubMed URLs  pubmed.ncbi.nlm.nih.gov/12345678
  const pubmedUrlMatches = html.matchAll(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{6,10})/g);
  for (const m of pubmedUrlMatches) pmids.add(m[1]);

  // Pattern 2: Old-style PubMed URLs  ncbi.nlm.nih.gov/pubmed/12345678
  const oldPubmedMatches = html.matchAll(/ncbi\.nlm\.nih\.gov\/pubmed\/(\d{6,10})/g);
  for (const m of oldPubmedMatches) pmids.add(m[1]);

  // Pattern 3: PMID: 12345678 text references
  const pmidTextMatches = html.matchAll(/PMID:\s*(\d{6,10})/gi);
  for (const m of pmidTextMatches) pmids.add(m[1]);

  // Pattern 4: data-pmid attributes
  const dataPmidMatches = html.matchAll(/data-pmid="(\d{6,10})"/g);
  for (const m of dataPmidMatches) pmids.add(m[1]);

  return Array.from(pmids);
}

// Fetch a citation page and extract all PMIDs
export async function scrapeCitationPage(
  url: string,
  options: { userAgent?: string; delayMs?: number } = {}
): Promise<string[]> {
  const { userAgent = 'Evidalife Research Bot (evidalife.com)', delayMs = 1000 } = options;

  if (delayMs > 0) {
    await new Promise(r => setTimeout(r, delayMs));
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!res.ok) {
    console.warn(`  Warning: ${url} returned ${res.status}`);
    return [];
  }

  const html = await res.text();
  return extractPmidsFromHtml(html);
}

// Scrape NutritionFacts.org video citation pages
// Videos are paginated — fetches multiple pages
export async function scrapeNutritionFactsVideos(options: {
  maxPages?: number;
  apiKey?: string;
  delayMs?: number;
} = {}): Promise<string[]> {
  const { maxPages = 50, delayMs = 1500 } = options;
  const allPmids = new Set<string>();

  // NutritionFacts.org video sources page (lists all videos with citations)
  // Each video has its own citation page at /video/[slug]/sources/
  const videoListUrl = 'https://nutritionfacts.org/videos/';

  console.log('Fetching NutritionFacts.org video list...');

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? videoListUrl : `${videoListUrl}page/${page}/`;
    await new Promise(r => setTimeout(r, delayMs));

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Evidalife Research Bot (evidalife.com)' },
      });
      if (res.status === 404) break; // No more pages
      if (!res.ok) { console.warn(`  Page ${page} failed: ${res.status}`); continue; }
      html = await res.text();
    } catch (e) {
      console.warn(`  Page ${page} error: ${e}`);
      continue;
    }

    // Extract video slugs from the page
    const slugMatches = html.matchAll(/href="https:\/\/nutritionfacts\.org\/video\/([^/"]+)\/"/g);
    const slugs = new Set<string>();
    for (const m of slugMatches) slugs.add(m[1]);

    if (slugs.size === 0) break;

    console.log(`  Page ${page}: found ${slugs.size} videos`);

    // For each video, fetch the sources/citations page
    for (const slug of slugs) {
      const sourcesUrl = `https://nutritionfacts.org/video/${slug}/sources/`;
      await new Promise(r => setTimeout(r, delayMs));

      try {
        const pmids = await scrapeCitationPage(sourcesUrl, { delayMs: 0 });
        for (const pmid of pmids) allPmids.add(pmid);
      } catch (e) {
        // Silently skip individual video failures
      }
    }
  }

  return Array.from(allPmids);
}

// Main function: collect PMIDs from all Greger sources
export async function collectGregerPmids(options: {
  includeVideos?: boolean;
  maxVideoPages?: number;
  delayMs?: number;
} = {}): Promise<{ pmids: string[]; stats: Record<string, number> }> {
  const { includeVideos = false, maxVideoPages = 20, delayMs = 1200 } = options;
  const allPmids = new Set<string>();
  const stats: Record<string, number> = {};

  // Scrape book citation pages
  for (const source of GREGER_BOOK_SOURCES) {
    console.log(`Scraping: ${source.label} (${source.url})`);
    try {
      const pmids = await scrapeCitationPage(source.url, { delayMs });
      for (const pmid of pmids) allPmids.add(pmid);
      stats[source.label] = pmids.length;
      console.log(`  Found ${pmids.length} PMIDs`);
    } catch (e) {
      console.error(`  Error scraping ${source.url}:`, e);
      stats[source.label] = 0;
    }
  }

  // Optionally scrape video citation pages
  if (includeVideos) {
    console.log('Scraping NutritionFacts.org video citations...');
    try {
      const videoPmids = await scrapeNutritionFactsVideos({
        maxPages: maxVideoPages,
        delayMs,
      });
      for (const pmid of videoPmids) allPmids.add(pmid);
      stats['nutritionfacts_videos'] = videoPmids.length;
      console.log(`  Found ${videoPmids.length} unique video PMIDs`);
    } catch (e) {
      console.error('  Error scraping videos:', e);
    }
  }

  return { pmids: Array.from(allPmids), stats };
}
