// src/app/api/lab-results/self-report/route.ts
// POST  { biomarker_id, value, unit, test_date }
// Converts to canonical unit and inserts into lab_results as source=self_report.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { convertLabResult } from '@/lib/lab-results/convert-and-save';
import { computeStatusFlag } from '@/lib/lab-results/flagging';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller
    const cookieStore = await cookies();
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { biomarker_id, value, unit, test_date } = body;

    if (!biomarker_id || value == null || !unit) {
      return NextResponse.json({ error: 'biomarker_id, value, and unit are required' }, { status: 400 });
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      return NextResponse.json({ error: 'value must be a number' }, { status: 400 });
    }

    const supabase = adminClient();

    // Convert to canonical unit
    const converted = await convertLabResult(
      {
        biomarker_id,
        user_id: user.id,
        value: numericValue,
        unit,
        test_date: test_date || new Date().toISOString().slice(0, 10),
        source: 'self_report',
      },
      supabase,
    );

    // Fetch ranges for status flag
    const { data: bm } = await supabase
      .from('biomarkers')
      .select('ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, range_type')
      .eq('id', biomarker_id)
      .single();

    const flag = bm
      ? computeStatusFlag(converted.value_numeric, {
          ref_range_low:    bm.ref_range_low,
          ref_range_high:   bm.ref_range_high,
          optimal_range_low: bm.optimal_range_low,
          optimal_range_high: bm.optimal_range_high,
          range_type:       bm.range_type,
        })
      : null;

    const { error } = await supabase.from('lab_results').insert({
      user_id:                    converted.user_id,
      biomarker_definition_id:    converted.biomarker_id,
      value_numeric:              converted.value_numeric,
      unit:                       converted.unit,
      test_date:                  converted.test_date,
      source:                     'self_report',
      status_flag:                flag,
      original_value:             converted.was_converted ? converted.original_value : null,
      original_unit:              converted.was_converted ? converted.original_unit  : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      was_converted:  converted.was_converted,
      value_stored:   converted.value_numeric,
      unit_stored:    converted.unit,
      original_value: converted.original_value,
      original_unit:  converted.original_unit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
