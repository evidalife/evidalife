// src/app/api/admin/lab-results/export/route.ts
// GET ?format=csv&source=...&status_flag=...&domain=...&dateFrom=...&dateTo=...

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const source = p.get('source');
    const statusFlag = p.get('status_flag');
    const domain = p.get('domain');
    const dateFrom = p.get('dateFrom');
    const dateTo = p.get('dateTo');

    const supabase = adminClient();

    let query = supabase
      .from('lab_results')
      .select(`
        id, value_numeric, unit, status_flag, test_date, measured_at, source, is_reviewed, notes,
        biomarkers:biomarker_definition_id ( name, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, unit ),
        profiles:user_id ( email, first_name, last_name ),
        orders:order_id ( order_number )
      `)
      .is('deleted_at', null)
      .order('measured_at', { ascending: false })
      .limit(5000);

    if (source) query = query.eq('source', source);
    if (statusFlag) query = query.eq('status_flag', statusFlag);
    if (dateFrom) query = query.gte('test_date', dateFrom);
    if (dateTo) query = query.lte('test_date', dateTo);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Filter by domain (can't easily do in query with joined data)
    let rows = (data ?? []) as any[];
    if (domain) {
      rows = rows.filter((r) => r.biomarkers?.he_domain === domain);
    }

    // Build CSV
    const headers = [
      'user_email', 'user_name', 'biomarker_name', 'value', 'unit',
      'status_flag', 'ref_range_low', 'ref_range_high', 'optimal_range_low', 'optimal_range_high',
      'domain', 'source', 'test_date', 'order_number', 'reviewed', 'notes',
    ];

    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const pid = r.biomarkers;
      const prof = r.profiles;
      const bmName = typeof pid?.name === 'object' ? (pid.name?.en || '') : (pid?.name || '');
      const userEmail = prof?.email || '';
      const userName = [prof?.first_name, prof?.last_name].filter(Boolean).join(' ');
      const testDate = r.test_date || (r.measured_at ? r.measured_at.slice(0, 10) : '');
      const row = [
        userEmail, userName, bmName,
        r.value_numeric ?? '', r.unit || pid?.unit || '',
        r.status_flag || '',
        pid?.ref_range_low ?? '', pid?.ref_range_high ?? '',
        pid?.optimal_range_low ?? '', pid?.optimal_range_high ?? '',
        pid?.he_domain || '', r.source || '',
        testDate, r.orders?.order_number || '',
        r.is_reviewed ? 'yes' : 'no',
        (r.notes || '').replace(/,/g, ';'),
      ].map((v) => `"${v}"`);
      csvLines.push(row.join(','));
    }

    const csv = csvLines.join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="lab-results-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
