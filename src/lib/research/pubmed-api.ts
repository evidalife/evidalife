// src/lib/research/pubmed-api.ts
// PubMed E-utilities API client
// Fetches study metadata (title, authors, journal, year, abstract, MeSH terms, DOI)
// API docs: https://www.ncbi.nlm.nih.gov/books/NBK25497/

export interface PubMedStudy {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  publication_year: number | null;
  abstract: string;
  mesh_terms: string[];
  doi: string | null;
}

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Fetch metadata for a batch of PMIDs (max 200 per request)
export async function fetchPubMedStudies(
  pmids: string[],
  apiKey?: string
): Promise<PubMedStudy[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    rettype: 'xml',
    retmode: 'xml',
  });
  if (apiKey) params.set('api_key', apiKey);

  const url = `${PUBMED_BASE}/efetch.fcgi?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PubMed fetch failed: ${res.status} ${res.statusText}`);

  const xml = await res.text();
  return parsePubMedXml(xml);
}

// Fetch a single study by PMID
export async function fetchPubMedStudy(
  pmid: string,
  apiKey?: string
): Promise<PubMedStudy | null> {
  const results = await fetchPubMedStudies([pmid], apiKey);
  return results[0] ?? null;
}

// Search PubMed with a query string, returns PMIDs
export async function searchPubMed(
  query: string,
  options: { maxResults?: number; apiKey?: string; minYear?: number } = {}
): Promise<string[]> {
  const { maxResults = 500, apiKey, minYear } = options;

  const searchQuery = minYear ? `${query} AND ${minYear}:3000[pdat]` : query;

  const params = new URLSearchParams({
    db: 'pubmed',
    term: searchQuery,
    retmax: String(maxResults),
    retmode: 'json',
    usehistory: 'y',
  });
  if (apiKey) params.set('api_key', apiKey);

  const res = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`);
  if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`);

  const data = await res.json();
  return data.esearchresult?.idlist ?? [];
}

// Parse PubMed XML response into structured study objects
function parsePubMedXml(xml: string): PubMedStudy[] {
  const studies: PubMedStudy[] = [];

  // Split by article — simple regex-based parser (no DOM dependency for Node.js scripts)
  const articleMatches = xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g);

  for (const match of articleMatches) {
    const article = match[1];

    const pmid = extractFirst(article, 'PMID');
    if (!pmid) continue;

    const title = cleanText(extractFirst(article, 'ArticleTitle') ?? '');
    const abstract = extractAbstract(article);
    const authors = extractAuthors(article);
    const journal = cleanText(extractFirst(article, 'Title') ?? extractFirst(article, 'MedlineTA') ?? '');
    const year = extractYear(article);
    const meshTerms = extractMeshTerms(article);
    const doi = extractDoi(article);

    studies.push({
      pmid,
      title,
      authors,
      journal,
      publication_year: year,
      abstract,
      mesh_terms: meshTerms,
      doi,
    });
  }

  return studies;
}

function extractFirst(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'm'));
  return match ? cleanText(match[1]) : null;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // strip XML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAbstract(article: string): string {
  // AbstractText can have multiple sections with Label attributes
  const abstractBlock = article.match(/<Abstract>([\s\S]*?)<\/Abstract>/)?.[1] ?? '';
  if (!abstractBlock) return '';

  const sections: string[] = [];
  const sectionMatches = abstractBlock.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g);
  for (const m of sectionMatches) {
    const attrs = m[1];
    const text = cleanText(m[2]);
    const labelMatch = attrs.match(/Label="([^"]+)"/);
    if (labelMatch) {
      sections.push(`${labelMatch[1]}: ${text}`);
    } else {
      sections.push(text);
    }
  }

  return sections.join(' ').trim();
}

function extractAuthors(article: string): string[] {
  const authorList = article.match(/<AuthorList[^>]*>([\s\S]*?)<\/AuthorList>/)?.[1] ?? '';
  const authors: string[] = [];
  const authorMatches = authorList.matchAll(/<Author[^>]*>([\s\S]*?)<\/Author>/g);

  for (const m of authorMatches) {
    const block = m[1];
    const lastName = extractFirst(block, 'LastName');
    const initials = extractFirst(block, 'Initials');
    const collectiveName = extractFirst(block, 'CollectiveName');

    if (collectiveName) {
      authors.push(collectiveName);
    } else if (lastName) {
      authors.push(initials ? `${lastName} ${initials}` : lastName);
    }
  }

  return authors;
}

function extractYear(article: string): number | null {
  // Try PubDate > Year first, then MedlineDate
  const yearMatch = article.match(/<PubDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  const medlineMatch = article.match(/<MedlineDate>(\d{4})/);
  if (medlineMatch) return parseInt(medlineMatch[1], 10);

  return null;
}

function extractMeshTerms(article: string): string[] {
  const meshList = article.match(/<MeshHeadingList>([\s\S]*?)<\/MeshHeadingList>/)?.[1] ?? '';
  const terms: string[] = [];
  const descriptorMatches = meshList.matchAll(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g);
  for (const m of descriptorMatches) {
    terms.push(cleanText(m[1]));
  }
  return terms;
}

function extractDoi(article: string): string | null {
  const doiMatch = article.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);
  return doiMatch ? cleanText(doiMatch[1]) : null;
}

// Utility: sleep between API calls to respect rate limits
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Chunk array into batches
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
