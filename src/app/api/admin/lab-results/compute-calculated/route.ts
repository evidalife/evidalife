// POST { labReportId, userId, testDate? }
// Triggers auto-computation of derived biomarkers for a given lab report.
// Called after manual biomarker add in the admin panel.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeAndInsertCalculatedMarkers } from '@/lib/lab-results/compute-calculated';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { labReportId, userId, testDate } = await req.json();
    if (!labReportId || !userId) {
      return NextResponse.json({ error: 'labReportId and userId required' }, { status: 400 });
    }

    const adminDb = createAdminClient();
    const count = await computeAndInsertCalculatedMarkers({
      supabase: adminDb,
      userId,
      labReportId,
      testDate: testDate ?? null,
    });

    return NextResponse.json({ success: true, calculatedCount: count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
