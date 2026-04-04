import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const LANG_NAMES: Record<string, string> = {
  de: 'German', en: 'English', fr: 'French', es: 'Spanish', it: 'Italian',
};

/**
 * SEO title and description autofill endpoint.
 * Generates SEO-optimized title and meta description from article content.
 *
 * Body: { title: string, excerpt: string, content: string, language: string }
 * Returns: { seo_title: string, seo_description: string }
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let body: { title?: string; excerpt?: string; content?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title = '', excerpt = '', content = '', language = 'en' } = body;

  if (!title?.trim() && !excerpt?.trim() && !content?.trim()) {
    return NextResponse.json(
      { error: 'At least one of title, excerpt, or content is required' },
      { status: 400 }
    );
  }

  const langName = LANG_NAMES[language] ?? 'English';

  const client = new Anthropic({ apiKey });

  const prompt = `You are an SEO expert for a health, nutrition, and longevity platform. Generate an SEO-optimized title and meta description based on the following article content.

Article Title: ${title}
Excerpt: ${excerpt}
Content: ${content}

Generate:
1. An SEO-optimized title (maximum 60 characters) - should be compelling, include primary keywords, and match the language ${langName}
2. A meta description (maximum 155 characters) - should be engaging, include relevant keywords, and encourage clicks - match the language ${langName}

Consider the health/nutrition/longevity context and create descriptions that appeal to this audience.

Return ONLY valid JSON:
{
  "seo_title": "title here",
  "seo_description": "description here"
}

Return ONLY the JSON object, no markdown fences, no explanation.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
    }

    const raw = responseContent.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(raw);

    // Validate response structure
    if (!result.seo_title || !result.seo_description) {
      return NextResponse.json(
        { error: 'Response missing seo_title or seo_description' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
