// src/app/api/cron/cleanup-pdfs/route.ts
// Deletes expired PDFs from storage (user uploads with delete_after < now).
// Called daily by Vercel cron or manually.
// Protected by CRON_SECRET header.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  // Verify cron secret (set in Vercel env)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find expired uploads
  const { data: expired, error: fetchErr } = await supabase
    .from('lab_pdf_uploads')
    .select('id, file_url, file_name, file_size_bytes')
    .not('delete_after', 'is', null)
    .lt('delete_after', new Date().toISOString());

  if (fetchErr || !expired?.length) {
    return NextResponse.json({
      success: true,
      deleted: 0,
      message: fetchErr ? fetchErr.message : 'No expired PDFs',
    });
  }

  let deletedFiles = 0;
  let deletedRecords = 0;
  let freedBytes = 0;
  const errors: string[] = [];

  for (const upload of expired) {
    // Delete file from storage
    if (upload.file_url) {
      const { error: storageErr } = await supabase.storage
        .from('lab-pdfs')
        .remove([upload.file_url]);

      if (storageErr) {
        errors.push(`Storage delete failed for ${upload.file_name}: ${storageErr.message}`);
        continue;
      }
      deletedFiles++;
      freedBytes += upload.file_size_bytes || 0;
    }

    // Clear file_url and mark as cleaned up (keep the record for audit trail)
    await supabase
      .from('lab_pdf_uploads')
      .update({
        file_url: null,
        delete_after: null,
        extraction_status: 'file_deleted',
      })
      .eq('id', upload.id);
    deletedRecords++;
  }

  return NextResponse.json({
    success: true,
    deleted: deletedFiles,
    records_updated: deletedRecords,
    freed_mb: (freedBytes / (1024 * 1024)).toFixed(2),
    errors: errors.length ? errors : undefined,
  });
}
