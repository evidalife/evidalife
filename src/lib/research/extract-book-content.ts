// src/lib/research/extract-book-content.ts
// Extracts prose content from Greger EPUB books for RAG ingestion.
// Strips endnotes/citations, keeps chapter structure, chunks by section.
//
// Output: ordered array of { chapter_title, section_title, content } chunks
// suitable for embedding and inserting into book_chunks table.

import type { EpubBookConfig } from './ingest-epub';

export interface BookChunk {
  chapter_title: string;
  section_title: string | null;
  content: string;          // prose text (stripped of HTML, endnotes, etc.)
  chunk_index: number;       // global ordering within the book
}

export interface ExtractionResult {
  book_key: string;
  book_label: string;
  chunks: BookChunk[];
  total_chars: number;
  total_chapters: number;
}

// ── HTML stripping ──────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── EPUB reading ────────────────────────────────────────────────────────────

interface EpubFile {
  path: string;
  content: string;
}

async function readEpubFiles(epubPath: string): Promise<EpubFile[]> {
  const { execSync } = await import('child_process');
  const { mkdtempSync, readdirSync, readFileSync, rmSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');

  const tmpDir = mkdtempSync(join(tmpdir(), 'epub-content-'));
  try {
    execSync(`unzip -o -q "${epubPath}" -d "${tmpDir}"`, { stdio: 'pipe' });

    const files: EpubFile[] = [];
    const walkDir = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.xhtml') || entry.name.endsWith('.html')) {
          const content = readFileSync(fullPath, 'utf-8');
          files.push({
            path: fullPath.replace(tmpDir + '/', ''),
            content,
          });
        }
      }
    };
    walkDir(tmpDir);

    // Sort files by path to maintain reading order
    files.sort((a, b) => a.path.localeCompare(b.path));
    return files;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Content classification ──────────────────────────────────────────────────

// Detect whether an XHTML file is a content chapter vs. front/back matter
function isContentChapter(path: string, html: string): boolean {
  const pathLower = path.toLowerCase();

  // Skip known non-content files
  const skipPatterns = [
    'toc', 'nav', 'cover', 'copyright', 'title', 'dedication',
    'acknowledgment', 'acknowledgement', 'index', 'about-the-author',
    'about_the_author', 'aboutauthor', 'also-by', 'also_by', 'alsoby',
    'praise', 'endorsement', 'blurb', 'halftitle', 'half-title',
    'frontmatter', 'backmatter', 'colophon', 'ads', 'newsletter',
    'opf', 'ncx', 'css', 'font',
  ];
  if (skipPatterns.some(p => pathLower.includes(p))) return false;

  // Skip endnotes/notes files
  if (/notes|endnote|footnote|bibliography|references/i.test(pathLower)) return false;

  // Must have substantial content (not just images or short boilerplate)
  const textContent = stripHtml(html);
  if (textContent.length < 200) return false;

  // Check for endnotes-only content (section with role="doc-endnotes" and little else)
  if (html.includes('role="doc-endnotes"')) {
    const withoutEndnotes = html.replace(
      /<section[^>]*role="doc-endnotes"[^>]*>[\s\S]*?<\/section>/g, ''
    );
    const cleanedText = stripHtml(withoutEndnotes);
    if (cleanedText.length < 200) return false;
  }

  return true;
}

// Extract chapter title from XHTML
function extractChapterTitle(html: string, filePath: string): string {
  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    const title = stripHtml(titleMatch[1]).trim();
    if (title.length > 2 && title.length < 200 && !title.toLowerCase().includes('untitled')) {
      return title;
    }
  }

  // Try first h1 or h2
  const headingMatch = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
  if (headingMatch) {
    const heading = stripHtml(headingMatch[1]).trim();
    if (heading.length > 2 && heading.length < 200) {
      return heading;
    }
  }

  // Fallback to filename
  const filename = filePath.split('/').pop() ?? filePath;
  return filename.replace(/\.(xhtml|html)$/, '').replace(/[-_]/g, ' ');
}

// ── Content extraction and chunking ─────────────────────────────────────────

// Remove endnote sections and references from HTML before extracting prose
function removeEndnotes(html: string): string {
  // Remove <section role="doc-endnotes">...</section>
  let cleaned = html.replace(
    /<section[^>]*role="doc-endnotes"[^>]*>[\s\S]*?<\/section>/g, ''
  );

  // Remove endnote reference links (superscript numbers linking to endnotes)
  // Pattern: <a href="#endnote-xxx" ...>NNN</a> or <a epub:type="noteref" ...>NNN</a>
  cleaned = cleaned.replace(
    /<a[^>]*(?:noteref|endnote|footnote)[^>]*>[\s\S]*?<\/a>/gi, ''
  );

  // Remove standalone superscript note refs: <sup><a...>N</a></sup>
  cleaned = cleaned.replace(
    /<sup[^>]*>\s*<a[^>]*>\d+<\/a>\s*<\/sup>/gi, ''
  );

  return cleaned;
}

// Split chapter content into sections based on headings
interface RawSection {
  title: string | null;
  html: string;
}

function splitIntoSections(html: string): RawSection[] {
  // Split on h2/h3 headings (subheadings within a chapter)
  const parts = html.split(/(?=<h[23][^>]*>)/i);
  const sections: RawSection[] = [];

  for (const part of parts) {
    const headingMatch = part.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/i);
    const title = headingMatch ? stripHtml(headingMatch[1]).trim() : null;

    // Remove the heading from content to avoid duplication
    const content = headingMatch
      ? part.replace(/<h[23][^>]*>[\s\S]*?<\/h[23]>/i, '')
      : part;

    const text = stripHtml(content).trim();
    if (text.length > 50) {  // Skip trivially short sections
      sections.push({ title, html: text });
    }
  }

  return sections;
}

// Target chunk size: ~1500 chars (~300-400 words) — enough context for RAG
// but small enough for precise retrieval
const TARGET_CHUNK_SIZE = 1500;
const MAX_CHUNK_SIZE = 2500;
const MIN_CHUNK_SIZE = 200;

// Split a long text into chunks at paragraph boundaries
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_SIZE) return [text];

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > MAX_CHUNK_SIZE && current.length >= MIN_CHUNK_SIZE) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }

  if (current.trim().length >= MIN_CHUNK_SIZE) {
    chunks.push(current.trim());
  } else if (chunks.length > 0 && current.trim().length > 0) {
    // Merge short trailing text into last chunk
    chunks[chunks.length - 1] += '\n\n' + current.trim();
  }

  return chunks;
}

// ── Main extraction function ────────────────────────────────────────────────

export async function extractBookContent(
  bookConfig: EpubBookConfig,
  onProgress?: (msg: string) => void
): Promise<ExtractionResult> {
  const log = onProgress ?? console.log;
  log(`  Reading EPUB: ${bookConfig.label}...`);

  const files = await readEpubFiles(bookConfig.path);
  log(`    ${files.length} XHTML files found`);

  const allChunks: BookChunk[] = [];
  let chunkIndex = 0;
  let totalChapters = 0;

  for (const file of files) {
    if (!isContentChapter(file.path, file.content)) continue;

    totalChapters++;
    const chapterTitle = extractChapterTitle(file.content, file.path);

    // Clean content: remove endnotes, then extract body
    const bodyMatch = file.content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : file.content;
    const cleanedHtml = removeEndnotes(bodyHtml);

    // Split into sections by sub-headings
    const sections = splitIntoSections(cleanedHtml);

    if (sections.length === 0) {
      // No sub-sections — chunk the whole chapter
      const text = stripHtml(cleanedHtml).trim();
      if (text.length >= MIN_CHUNK_SIZE) {
        const textChunks = chunkText(text);
        for (const tc of textChunks) {
          allChunks.push({
            chapter_title: chapterTitle,
            section_title: null,
            content: tc,
            chunk_index: chunkIndex++,
          });
        }
      }
      continue;
    }

    for (const section of sections) {
      const textChunks = chunkText(section.html);
      for (const tc of textChunks) {
        allChunks.push({
          chapter_title: chapterTitle,
          section_title: section.title,
          content: tc,
          chunk_index: chunkIndex++,
        });
      }
    }
  }

  const totalChars = allChunks.reduce((sum, c) => sum + c.content.length, 0);
  log(`    ${totalChapters} chapters → ${allChunks.length} chunks (${(totalChars / 1000).toFixed(0)}k chars)`);

  return {
    book_key: bookConfig.key,
    book_label: bookConfig.label,
    chunks: allChunks,
    total_chars: totalChars,
    total_chapters: totalChapters,
  };
}
