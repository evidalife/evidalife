/**
 * Returns a lightweight biomarker context string for the AI companion.
 * Reuses the same data-fetch + scoring logic as the briefing route,
 * but skips Claude generation — just returns the text summary.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ context: null });

  const [profileRes, reportsRes, resultsRes, defsRes] = await Promise.all([
    supabase.from('profiles').select('first_name, date_of_birth').eq('id', user.id).single(),
    supabase.from('lab_reports').select('id, test_date').eq('user_id', user.id)
      .in('status', ['confirmed', 'completed']).order('test_date', { ascending: true }),
    supabase.from('lab_results')
      .select('biomarker_definition_id, value_numeric, status_flag, measured_at, test_date, lab_report_id')
      .eq('user_id', user.id).is('deleted_at', null),
    supabase.from('biomarkers')
      .select('id, slug, name, unit, he_domain, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high, is_calculated')
      .eq('is_active', true),
  ]);

  const profile = profileRes.data;
  const reports = reportsRes.data ?? [];
  const results = resultsRes.data ?? [];
  const definitions = defsRes.data ?? [];

  if (!reports.length || !results.length) {
    return NextResponse.json({
      context: `User: ${profile?.first_name ?? 'User'}. No lab results uploaded yet.`,
    });
  }

  const reportDateMap = new Map(reports.map(r => [r.id, r.test_date]));
  const mData = new Map<string, Map<string, number>>();
  for (const r of results) {
    if (!r.biomarker_definition_id || r.value_numeric == null) continue;
    const date = r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0];
    if (!date) continue;
    if (!mData.has(r.biomarker_definition_id)) mData.set(r.biomarker_definition_id, new Map());
    if (!mData.get(r.biomarker_definition_id)!.has(date)) {
      mData.get(r.biomarker_definition_id)!.set(date, r.value_numeric);
    }
  }

  const allDates = [...new Set(results.map(r =>
    r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0]
  ).filter(Boolean))].sort() as string[];
  const latestDate = allDates[allDates.length - 1];

  const getName = (obj: Record<string, string> | string | null): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj['en'] ?? obj['de'] ?? '';
  };

  function score(v: number, rL: number | null, rH: number | null, oL: number | null, oH: number | null): number {
    if (rL != null && rH != null) {
      if (oL != null && oH != null && v >= oL && v <= oH) return 95;
      if (v >= rL && v <= rH) return 70;
      const span = rH - rL || 1;
      return Math.max(5, 50 - (v < rL ? (rL - v) : (v - rH)) / span * 100);
    }
    if (rH != null) { if (v <= rH) return 75; return Math.max(5, 75 - (v - rH) / (rH || 1) * 50); }
    if (rL != null) { if (v >= rL) return 75; return Math.max(5, 75 - (rL - v) / (rL || 1) * 50); }
    return 50;
  }

  // Build compact marker list (risk/borderline only, max 8)
  const attention: string[] = [];
  for (const def of definitions) {
    if (def.is_calculated) continue;
    const latest = mData.get(def.id)?.get(latestDate);
    if (!latest) continue;
    const s = score(latest, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
    if (s < 65) {
      const status = s < 40 ? 'Risk' : 'Borderline';
      attention.push(`${getName(def.name)}: ${latest} ${def.unit ?? ''} [${status}]`);
    }
  }

  const firstName = profile?.first_name ?? 'User';
  const chronAge = profile?.date_of_birth
    ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
    : null;

  const context = [
    `User: ${firstName}${chronAge ? `, age ${chronAge}` : ''}`,
    `Latest test: ${latestDate}`,
    `Total tests: ${reports.length}`,
    attention.length
      ? `Markers needing attention (${attention.length}): ${attention.slice(0, 6).join('; ')}`
      : 'All measured markers within reference range.',
  ].join('\n');

  return NextResponse.json({ context });
}
