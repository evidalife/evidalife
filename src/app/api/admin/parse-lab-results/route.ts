// src/app/api/admin/parse-lab-results/route.ts
// POST { storagePath, uploadId }
// Fetches PDF/image from lab-pdfs storage, extracts biomarkers via Claude,
// matches to DB biomarkers and applies unit conversions.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callClaudeForPdf, matchAndConvertResults } from '@/lib/lab-results/extract-pdf';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { storagePath, uploadId } = await req.json();
    if (!storagePath || !uploadId) {
      return NextResponse.json({ error: 'storagePath and uploadId are required' }, { status: 400 });
    }

    console.log('[parse-lab] storagePath:', storagePath);

    const supabase = createAdminClient();

    // Mark upload as processing
    await supabase.from('lab_pdf_uploads').update({ extraction_status: 'processing' }).eq('id', uploadId);

    // Generate a fresh signed URL from the storage path (service role can always do this)
    const { data: signedData, error: signError } = await supabase.storage
      .from('lab-pdfs')
      .createSignedUrl(storagePath, 300);

    if (signError || !signedData?.signedUrl) {
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: 'Could not generate signed URL for file',
      }).eq('id', uploadId);
      return NextResponse.json({ error: 'Could not access file in storage' }, { status: 400 });
    }

    // Fetch the file
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) {
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: 'Could not fetch file',
      }).eq('id', uploadId);
      return NextResponse.json({ error: 'Could not fetch file' }, { status: 400 });
    }
    const base64Data = Buffer.from(await fileRes.arrayBuffer()).toString('base64');

    // Determine media type from path
    const pathLower = storagePath.toLowerCase();
    const mediaType = pathLower.endsWith('.pdf')
      ? 'application/pdf'
      : pathLower.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    // Call Claude + parse
    let metadata: any;
    let rawResults: any[];
    try {
      const result = await callClaudeForPdf(base64Data, mediaType, ANTHROPIC_API_KEY);
      metadata    = result.metadata;
      rawResults  = result.rawResults;
    } catch (err: any) {
      await supabase.from('lab_pdf_uploads').update({
        extraction_status: 'failed',
        error_message: err.message,
      }).eq('id', uploadId);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.log('[parse-lab] Extracted items:', rawResults.length);

    // Match + convert
    const matched = await matchAndConvertResults(rawResults, supabase);

    console.log('[parse-lab] Matched:', matched.filter((m) => m.matched_id).length, 'of', matched.length);
    console.log('[parse-lab] Converted:', matched.filter((m) => m.was_converted).length);

    // Save extraction results to upload record
    await supabase.from('lab_pdf_uploads').update({
      extraction_status: 'completed',
      extracted_data: matched,
    }).eq('id', uploadId);

    return NextResponse.json({ success: true, extracted: matched, metadata, uploadId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
