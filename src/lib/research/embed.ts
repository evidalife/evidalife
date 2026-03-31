// src/lib/research/embed.ts
// OpenAI text-embedding-3-small wrapper for generating study embeddings
// Dimensions: 1536, Cost: ~$0.02 / 1M tokens

const OPENAI_EMBEDDING_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Generate embedding for a single text string
export async function embedText(
  text: string,
  apiKey: string
): Promise<number[]> {
  const res = await fetch(OPENAI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000), // safety trim — well within 8191 token limit
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embedding error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding as number[];
}

// Generate embeddings for a batch of texts (up to 2048 per request)
export async function embedBatch(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(OPENAI_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts.map(t => t.slice(0, 8000)),
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI batch embedding error ${res.status}: ${err}`);
  }

  const data = await res.json();
  // Sort by index to ensure order is preserved
  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((d: any) => d.embedding as number[]);
}

// Build the text to embed for a study (title + abstract is most informative)
export function buildStudyEmbeddingText(study: {
  title: string;
  abstract: string;
  mesh_terms?: string[];
  journal?: string;
}): string {
  const parts: string[] = [study.title];
  if (study.abstract) parts.push(study.abstract);
  if (study.mesh_terms?.length) parts.push(`MeSH: ${study.mesh_terms.join(', ')}`);
  return parts.join('\n\n');
}
