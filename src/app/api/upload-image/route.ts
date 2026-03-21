import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Accepts JSON body: { base64: string, filename: string, bucket: string, contentType: string }

export async function POST(req: NextRequest) {
  // S2 — parse JSON
  let body: { base64?: string; filename?: string; bucket?: string; contentType?: string };
  try {
    body = await req.json();
  } catch (e) {
    console.error('[upload-image] JSON parse failed —', e);
    return NextResponse.json({ error: `Invalid JSON body: ${e}` }, { status: 400 });
  }

  const { base64, filename, bucket, contentType } = body;

  if (!base64 || !bucket || !filename) {
    const missing = [!base64 && 'base64', !bucket && 'bucket', !filename && 'filename'].filter(Boolean).join(', ');
    console.error('[upload-image] missing fields —', missing);
    return NextResponse.json({ error: `Missing required fields: ${missing}` }, { status: 400 });
  }

  // S3 — decode base64
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch (e) {
    console.error('[upload-image] base64 decode failed —', e);
    return NextResponse.json({ error: `Failed to decode base64: ${e}` }, { status: 400 });
  }

  if (buffer.length === 0) {
    console.error('[upload-image] buffer is empty after decode');
    return NextResponse.json({ error: 'Decoded buffer is empty — base64 string may be malformed' }, { status: 400 });
  }

  // S4 — build upload path
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
  const uploadPath = `${crypto.randomUUID()}.${ext}`;
  const mimeType = contentType || 'application/octet-stream';

  // S5 — create Supabase admin client
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (e) {
    console.error('[upload-image] Supabase client init failed —', e);
    return NextResponse.json({ error: `Supabase client init failed: ${e}` }, { status: 500 });
  }

  // S6 — upload to storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uploadPath, buffer, { upsert: true, contentType: mimeType });

  if (error || !data) {
    const detail = {
      message: error?.message,
      statusCode: (error as { statusCode?: string } | null)?.statusCode,
      error: (error as { error?: string } | null)?.error,
      name: error?.name,
    };
    console.error('[upload-image] Supabase storage error —', JSON.stringify(detail));
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  // S7 — get public URL
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
