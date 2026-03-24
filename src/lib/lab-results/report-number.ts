// src/lib/lab-results/report-number.ts
// Generates sequential report numbers: EV-LAB-XXXXXX (admin) / SR-XXXXXX (self-reported)

import type { SupabaseClient } from '@supabase/supabase-js';

export async function generateReportNumber(
  supabase: SupabaseClient,
  source: string,
): Promise<string> {
  const prefix = source === 'admin_import' ? 'EV-LAB-' : 'SR-';

  const { data } = await supabase
    .from('lab_reports')
    .select('report_number')
    .like('report_number', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = data?.report_number
    ? parseInt((data.report_number as string).replace(prefix, ''), 10)
    : 0;

  return `${prefix}${String(lastNum + 1).padStart(6, '0')}`;
}
