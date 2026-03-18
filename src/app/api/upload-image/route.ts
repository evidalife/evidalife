import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const bucket = formData.get('bucket') as string | null;
  const path = formData.get('path') as string | null;

  if (!file || !bucket) {
    return NextResponse.json({ error: 'Missing file or bucket' }, { status: 400 });
  }

  // Log for debugging
  console.log('[upload-image] typeof file:', typeof file, '| constructor:', file.constructor?.name);
  console.log('[upload-image] file.type:', file.type, '| file.size:', file instanceof Blob ? file.size : 'n/a');

  // Convert File/Blob → Buffer for reliable upload in Next.js server routes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = file.type || 'application/octet-stream';

  // Use a flat UUID-based path (no nested folders — avoids Supabase path pattern errors)
  const ext = (file instanceof File ? file.name : path ?? 'file').split('.').pop() ?? 'bin';
  const uploadPath = `${crypto.randomUUID()}.${ext}`;

  console.log('[upload-image] bucket:', bucket, '| path:', uploadPath, '| contentType:', contentType, '| bufferLen:', buffer.length);

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uploadPath, buffer, { upsert: true, contentType });

  if (error || !data) {
    const detail = error
      ? JSON.stringify({ message: error.message, name: (error as NodeJS.ErrnoException).name, statusCode: (error as {statusCode?: string}).statusCode, error: (error as {error?: string}).error })
      : 'Upload failed';
    console.error('[upload-image] Supabase error:', detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl });
}
