import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Accepts JSON body: { base64: string, filename: string, bucket: string, contentType: string }
// Using base64 JSON instead of FormData avoids Next.js multipart serialization issues.

export async function POST(req: NextRequest) {
  let body: { base64?: string; filename?: string; bucket?: string; contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { base64, filename, bucket, contentType } = body;

  if (!base64 || !bucket || !filename) {
    return NextResponse.json({ error: 'Missing base64, bucket, or filename' }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch (e) {
    return NextResponse.json({ error: `Failed to decode base64: ${e}` }, { status: 400 });
  }

  const ext = filename.split('.').pop() ?? 'bin';
  const uploadPath = `${crypto.randomUUID()}.${ext}`;
  const mimeType = contentType || 'application/octet-stream';

  console.log('[upload-image] bucket:', bucket, '| path:', uploadPath, '| contentType:', mimeType, '| bufferLen:', buffer.length);

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uploadPath, buffer, { upsert: true, contentType: mimeType });

  if (error || !data) {
    const detail = error
      ? JSON.stringify({
          message: error.message,
          statusCode: (error as { statusCode?: string }).statusCode,
          error: (error as { error?: string }).error,
        })
      : 'Upload failed';
    console.error('[upload-image] Supabase error:', detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl });
}
