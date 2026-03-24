// src/app/api/lab-results/update-report/route.ts
// POST { reportId, title, test_date, lab_address?, lab_email?, lab_phone?,
//        results: [{biomarker_id, value, unit}] }
// Updates metadata + replaces all results for a manual_entry report.
// Only works for reports owned by the authenticated user with source = 'manual_entry'.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { convertLabResultsBatch } from '@/lib/lab-results/convert-and-save';
import { computeStatusFlag } from '@/lib/lab-results/flagging';

export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const { reportId, title, test_date, lab_address, lab_email, lab_phone, results } = body;

    if (!reportId)        return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    if (!title?.trim())   return NextResponse.json({ error: 'title is required' }, { status: 400 });
    if (!test_date)       return NextResponse.json({ error: 'test_date is required' }, { status: 400 });
    if (!results?.length) return NextResponse.json({ error: 'results are required' }, { status: 400 });

    const supabase = createAdminClient();

    // Verify ownership + editability
    const { data: report } = await supabase
      .from('lab_reports')
      .select('id, user_id, source')
      .eq('id', reportId)
      .is('deleted_at', null)
      .single();

    if (!report || report.user_id !== user.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    if (report.source === 'admin_import') {
      return NextResponse.json({ error: 'Admin-imported reports cannot be edited' }, { status: 403 });
    }

    // 1. Soft-delete existing lab_results for this report
    await supabase
      .from('lab_results')
      .update({ deleted_at: new Date().toISOString() })
      .eq('lab_report_id', reportId)
      .is('deleted_at', null);

    // 2. Update report metadata
    await supabase
      .from('lab_reports')
      .update({
        title:       title.trim(),
        test_date,
        lab_address: lab_address || null,
        lab_email:   lab_email   || null,
        lab_phone:   lab_phone   || null,
      })
      .eq('id', reportId);

    // 3. Convert + insert new results
    const converted = await convertLabResultsBatch(
      results.map((r: any) => ({ biomarker_id: r.biomarker_id, value: parseFloat(r.value), unit: r.unit })),
      supabase,
    );

    const biomarkerIds = [...new Set(converted.map((c) => c.biomarker_id))];
    const { data: bmRanges } = await supabase
      .from('biomarkers')
      .select('id, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .in('id', biomarkerIds);

    const rangeMap = new Map((bmRanges ?? []).map((b: any) => [b.id, b]));

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
        lab_report_id:           reportId,
        biomarker_definition_id: c.biomarker_id,
        value_numeric:           c.value_numeric,
        unit:                    c.unit,
        test_date,
        source:                  report.source,
        status_flag:             flag,
        original_value:          c.was_converted ? c.original_value : null,
        original_unit:           c.was_converted ? c.original_unit  : null,
      };
    });

    const { error: insertErr } = await supabase.from('lab_results').insert(inserts);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true, count: inserts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
