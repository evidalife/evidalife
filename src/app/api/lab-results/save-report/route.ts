// src/app/api/lab-results/save-report/route.ts
// POST { title, test_date, source, lab_address?, lab_email?, lab_phone?,
//        results: [{biomarker_id, value, unit}], storagePath?, fileName?, fileSize? }
// Creates lab_report + inserts lab_results with canonical-unit conversion.
// If storagePath provided (PDF upload), keeps the file for 7 days then auto-deletes.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { convertLabResultsBatch } from '@/lib/lab-results/convert-and-save';
import { computeStatusFlag } from '@/lib/lab-results/flagging';
import { generateReportNumber } from '@/lib/lab-results/report-number';
import { computeAndInsertCalculatedMarkers } from '@/lib/lab-results/compute-calculated';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const {
      title, test_date, source = 'manual_entry',
      lab_address, lab_email, lab_phone,
      results, storagePath, fileName, fileSize,
    } = body;

    if (!title?.trim())  return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!test_date)      return NextResponse.json({ error: 'test_date is required' }, { status: 400 });
    if (!results?.length) return NextResponse.json({ error: 'results are required' }, { status: 400 });

    const supabase = createAdminClient();

    // 1. Create lab_report
    // User self-reports always get EU prefix (external_upload)
    const reportNumber = await generateReportNumber(supabase, 'external_upload', null, test_date);
    const { data: report, error: reportErr } = await supabase
      .from('lab_reports')
      .insert({
        user_id:       user.id,
        title:         title.trim(),
        test_date,
        source,
        report_number: reportNumber,
        lab_address:   lab_address || null,
        lab_email:     lab_email   || null,
        lab_phone:     lab_phone   || null,
      })
      .select('id')
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: reportErr?.message ?? 'Failed to create report' }, { status: 500 });
    }

    // 2. Convert all values to canonical units
    const converted = await convertLabResultsBatch(
      results.map((r: any) => ({ biomarker_id: r.biomarker_id, value: parseFloat(r.value), unit: r.unit })),
      supabase,
    );

    // 3. Fetch biomarker range data for status flags (one query)
    const biomarkerIds = [...new Set(converted.map((c) => c.biomarker_id))];
    const { data: bmRanges } = await supabase
      .from('biomarkers')
      .select('id, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .in('id', biomarkerIds);

    const rangeMap = new Map((bmRanges ?? []).map((b: any) => [b.id, b]));

    // 4. Insert lab_results
    const inserts = converted.map((c) => {
      const ranges = rangeMap.get(c.biomarker_id) as any;
      const flag = ranges
        ? computeStatusFlag(c.value_numeric, {
            ref_range_low:    ranges.ref_range_low,
            ref_range_high:   ranges.ref_range_high,
            optimal_range_low: ranges.optimal_range_low,
            optimal_range_high: ranges.optimal_range_high,
            range_type:       ranges.range_type,
          })
        : null;

      return {
        user_id:                 user.id,
        lab_report_id:           report.id,
        biomarker_definition_id: c.biomarker_id,
        value_numeric:           c.value_numeric,
        unit:                    c.unit,
        test_date,
        source,
        status_flag:             flag,
        original_value:          c.was_converted ? c.original_value : null,
        original_unit:           c.was_converted ? c.original_unit  : null,
      };
    });

    const { error: insertErr } = await supabase.from('lab_results').insert(inserts);
    if (insertErr) {
      // Roll back the report
      await supabase.from('lab_reports').delete().eq('id', report.id);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 5. Auto-compute calculated biomarkers (PhenoAge, De Ritis, FIB-4, etc.)
    const adminDb = createAdminClient();
    const calcCount = await computeAndInsertCalculatedMarkers({
      supabase: adminDb,
      userId: user.id,
      labReportId: report.id,
      testDate: test_date,
    });

    // 6. Track PDF upload — keep file for 7 days for re-extraction, then auto-delete
    if (storagePath) {
      const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('lab_pdf_uploads').insert({
        uploaded_by:       user.id,
        user_id:           user.id,
        file_name:         fileName || storagePath.split('/').pop() || 'upload.pdf',
        file_url:          storagePath,
        extraction_status: 'completed',
        results_created:   inserts.length,
        lab_report_id:     report.id,
        upload_source:     'user',
        delete_after:      deleteAfter,
        file_size_bytes:   fileSize || null,
      });
    }

    return NextResponse.json({ success: true, reportId: report.id, count: inserts.length, calculatedCount: calcCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
