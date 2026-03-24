// src/app/api/lab-results/extract/route.ts
// POST { storagePath }  — user-facing PDF extraction (auth required)
// Calls Claude, matches biomarkers, returns extracted rows + lab metadata for review.
// Does NOT auto-save — user must confirm via /api/lab-results/save-report.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { callClaudeForPdf, matchAndConvertResults } from '@/lib/lab-results/extract-pdf';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { storagePath } = await req.json();
    if (!storagePath) return NextResponse.json({ error: 'storagePath is required' }, { status: 400 });

    const supabase = createAdminClient();

    // Generate signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('lab-pdfs')
      .createSignedUrl(storagePath, 300);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Could not access file in storage' }, { status: 400 });
    }

    // Fetch file
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) return NextResponse.json({ error: 'Could not fetch file' }, { status: 400 });

    const base64Data = Buffer.from(await fileRes.arrayBuffer()).toString('base64');
    const pathLower  = storagePath.toLowerCase();
    const mediaType  = pathLower.endsWith('.pdf')
      ? 'application/pdf'
      : pathLower.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    // Extract via Claude
    const { metadata, rawResults } = await callClaudeForPdf(base64Data, mediaType, ANTHROPIC_API_KEY);

    // Match + convert
    const matched = await matchAndConvertResults(rawResults, supabase);

    return NextResponse.json({ success: true, extracted: matched, metadata });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
