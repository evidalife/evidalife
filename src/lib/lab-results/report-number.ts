// src/lib/lab-results/report-number.ts
// Generates report numbers:
//   EL-{CODE}-{YYYYMMDD}-{SEQ}  — Evida Life lab
//   PL-{CODE}-{YYYYMMDD}-{SEQ}  — Partner lab
//   EU-{YYYYMMDD}-{SEQ}         — External upload or user self-report

import type { SupabaseClient } from '@supabase/supabase-js';

type ReportSource = 'evida_life' | 'partner_lab' | 'external_upload';

function mapLegacySource(source: string): ReportSource {
  if (source === 'evida_life') return 'evida_life';
  if (source === 'partner_lab') return 'partner_lab';
  // admin_import, manual_entry, pdf_upload, external_upload → EU
  return 'external_upload';
}

export async function generateReportNumber(
  supabase: SupabaseClient,
  source: string,
  labCode?: string | null,
  testDate?: string | null,
): Promise<string> {
  const mapped = mapLegacySource(source);
  const prefix = mapped === 'evida_life' ? 'EL' : mapped === 'partner_lab' ? 'PL' : 'EU';

  // Date part: use testDate if provided, otherwise today
  const dateStr = (testDate ?? new Date().toISOString()).slice(0, 10).replace(/-/g, '');

  // Build the base portion of the number
  const base = labCode ? `${prefix}-${labCode}-${dateStr}` : `${prefix}-${dateStr}`;

  // Count existing reports with this base to get the next sequence
  const { count } = await supabase
    .from('lab_reports')
    .select('id', { count: 'exact', head: true })
    .like('report_number', `${base}-%`);

  const seq = String((count ?? 0) + 1).padStart(3, '0');
  return `${base}-${seq}`;
}

export function displayReportId(
  report: { report_number: string | null; order_id?: string | null },
  order?: { order_number?: string | null },
): string {
  if (report.report_number) return report.report_number;
  if (order?.order_number) return `ORD-${order.order_number}`;
  return 'Pending';
}
