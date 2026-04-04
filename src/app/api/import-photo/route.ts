import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/import-photo
 *
 * Downloads an image from a URL (e.g. Unsplash) and returns it as a base64
 * data URL for client-side cropping. Also attempts to extract photo credit
 * information from Unsplash URLs.
 *
 * Body: { url: string }
 * Response: { dataUrl: string, credit: string | null }
 */

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB max download

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'URL must use http or https' }, { status: 400 });
  }

  try {
    // ─── Download the image ─────────────────────────────────────────
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EvidaLife/1.0 (Photo Import)',
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download image: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: `URL does not point to an image (got ${contentType})` },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image too large (${Math.round(arrayBuffer.byteLength / 1024 / 1024)}MB). Max is 15 MB.` },
        { status: 400 }
      );
    }

    // Convert to base64 data URL
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = contentType.split(';')[0].trim();
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // ─── Extract Unsplash credit ────────────────────────────────────
    let credit: string | null = null;

    if (
      parsedUrl.hostname === 'images.unsplash.com' ||
      parsedUrl.hostname === 'unsplash.com'
    ) {
      credit = await extractUnsplashCredit(url);
    }

    return NextResponse.json({ dataUrl, credit });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[import-photo] Error:', msg);
    return NextResponse.json({ error: `Import failed: ${msg}` }, { status: 500 });
  }
}

/**
 * Attempt to extract photographer credit from an Unsplash image URL.
 * Uses the Unsplash API if an access key is configured, otherwise
 * falls back to a best-effort parse of the URL.
 */
async function extractUnsplashCredit(imageUrl: string): Promise<string | null> {
  // Try to extract photo ID from the URL
  // Format: https://images.unsplash.com/photo-{id}?...
  const match = imageUrl.match(/photo-([a-zA-Z0-9_-]+)/);
  if (!match) return null;

  const photoId = match[1];
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (accessKey) {
    try {
      const res = await fetch(`https://api.unsplash.com/photos/photo-${photoId}`, {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const data = await res.json();
        const name = data?.user?.name;
        const username = data?.user?.username;
        if (name && username) {
          return `Photo by ${name} on Unsplash (unsplash.com/@${username})`;
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: provide generic Unsplash credit
  return 'Photo from Unsplash';
}
