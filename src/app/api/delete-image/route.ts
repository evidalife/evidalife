import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Accepts JSON body: { url: string, bucket: string }

export async function POST(req: NextRequest) {
  let body: { url?: string; bucket?: string };
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: `Invalid JSON body: ${e}` }, { status: 400 });
  }

  const { url, bucket } = body;

  if (!url || !bucket) {
    const missing = [!url && 'url', !bucket && 'bucket'].filter(Boolean).join(', ');
    return NextResponse.json({ error: `Missing required fields: ${missing}` }, { status: 400 });
  }

  // Extract storage path: everything after /{bucket}/
  const marker = `/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return NextResponse.json({ error: `Could not extract storage path from URL` }, { status: 400 });
  }
  const storagePath = url.slice(idx + marker.length);

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket).remove([storagePath]);

  if (error) {
    console.error('[delete-image] storage delete error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: storagePath });
}
