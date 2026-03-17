import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const bucket = formData.get('bucket') as string | null;
  const path = formData.get('path') as string | null;

  if (!file || !bucket || !path) {
    return NextResponse.json({ error: 'Missing file, bucket, or path' }, { status: 400 });
  }

  // Convert File → Buffer for reliable upload in Next.js server routes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = file.type || 'application/octet-stream';

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { upsert: true, contentType });

  if (error || !data) {
    const detail = error
      ? JSON.stringify({ message: error.message, name: error.name, cause: error.cause })
      : 'Upload failed';
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl });
}
