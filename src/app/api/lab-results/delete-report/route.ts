// src/app/api/lab-results/delete-report/route.ts
// POST { reportId }
// Hard-deletes a lab_report + all linked lab_results.
// Only the report owner can delete; admin_import reports cannot be deleted by users.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { reportId } = await req.json();
    if (!reportId) return NextResponse.json({ error: 'reportId is required' }, { status: 400 });

    const supabase = createAdminClient();

    // Verify ownership
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
      return NextResponse.json({ error: 'Admin-imported reports cannot be deleted' }, { status: 403 });
    }

    // Hard-delete all linked lab_results
    await supabase
      .from('lab_results')
      .delete()
      .eq('lab_report_id', reportId);

    // Hard-delete the report
    await supabase.from('lab_reports').delete().eq('id', reportId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
