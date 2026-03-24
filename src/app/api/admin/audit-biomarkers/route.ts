import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type AuditIssue = {
  severity: 'error' | 'warning' | 'info';
  table: string;
  id: string;
  name: string;
  issue: string;
};

export async function GET() {
  // Auth check — admin only
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const issues: AuditIssue[] = [];

  // ── 1. Fetch biomarkers ──────────────────────────────────────
  const { data: pids } = await admin
    .from('biomarkers')
    .select('id, slug, name, item_type, unit, ref_range_low, ref_range_high, he_domain, is_active');

  const items = pids ?? [];

  for (const item of items) {
    const nameStr = (item.name as Record<string, string> | null)?.en ?? (item.name as Record<string, string> | null)?.de ?? item.id;

    // Disqualified item_types in biomarker context
    if (item.item_type === 'coaching_hour' || item.item_type === 'food_item') {
      issues.push({
        severity: 'error',
        table: 'biomarkers',
        id: item.id,
        name: nameStr,
        issue: `item_type "${item.item_type}" does not belong in a biomarker registry`,
      });
    }

    // Missing unit for numeric biomarker types
    const numericTypes = ['biomarker', 'clinical_assessment'];
    if (numericTypes.includes(item.item_type ?? '') && !item.unit) {
      issues.push({
        severity: 'warning',
        table: 'biomarkers',
        id: item.id,
        name: nameStr,
        issue: 'Missing unit (required for numeric biomarkers)',
      });
    }

    // Missing reference ranges for blood markers
    if (item.item_type === 'biomarker' && item.ref_range_low == null && item.ref_range_high == null) {
      issues.push({
        severity: 'warning',
        table: 'biomarkers',
        id: item.id,
        name: nameStr,
        issue: 'Missing reference ranges (ref_range_low / ref_range_high)',
      });
    }

    // Missing HE domain
    if (!item.he_domain && item.is_active) {
      issues.push({
        severity: 'info',
        table: 'biomarkers',
        id: item.id,
        name: nameStr,
        issue: 'No he_domain assigned',
      });
    }
  }

  // ── 2. Duplicate name check within biomarkers ───────────────
  const nameIndex = new Map<string, string[]>();
  for (const item of items) {
    const nameObj = item.name as Record<string, string> | null;
    if (!nameObj) continue;
    for (const [, v] of Object.entries(nameObj)) {
      const key = v.trim().toLowerCase();
      if (!key) continue;
      if (!nameIndex.has(key)) nameIndex.set(key, []);
      nameIndex.get(key)!.push(item.id);
    }
  }
  for (const [nameKey, ids] of nameIndex) {
    if (ids.length > 1) {
      issues.push({
        severity: 'error',
        table: 'biomarkers',
        id: ids.join(', '),
        name: nameKey,
        issue: `Duplicate name across ${ids.length} items (IDs: ${ids.join(', ')})`,
      });
    }
  }

  // ── 3. Cross-check with biomarker_definitions ─────────────────────────────
  const { data: bdefs } = await admin
    .from('biomarker_definitions')
    .select('id, slug, name, unit, reference_range_low, reference_range_high');

  const bdList = bdefs ?? [];

  for (const bd of bdList) {
    const nameStr = (bd.name as Record<string, string> | null)?.en ?? (bd.name as Record<string, string> | null)?.de ?? bd.id;

    if (!bd.unit) {
      issues.push({
        severity: 'warning',
        table: 'biomarker_definitions',
        id: bd.id,
        name: nameStr,
        issue: 'Missing unit',
      });
    }

    if (bd.reference_range_low == null && bd.reference_range_high == null) {
      issues.push({
        severity: 'info',
        table: 'biomarker_definitions',
        id: bd.id,
        name: nameStr,
        issue: 'Missing reference ranges',
      });
    }
  }

  // ── 4. Check for names in biomarker_definitions that also exist in biomarkers ──
  const pidNames = new Set<string>();
  for (const item of items) {
    const nameObj = item.name as Record<string, string> | null;
    if (!nameObj) continue;
    for (const v of Object.values(nameObj)) {
      if (v) pidNames.add(v.trim().toLowerCase());
    }
  }

  for (const bd of bdList) {
    const nameObj = bd.name as Record<string, string> | null;
    if (!nameObj) continue;
    for (const v of Object.values(nameObj)) {
      if (v && pidNames.has(v.trim().toLowerCase())) {
        const nameStr = (nameObj as Record<string, string>)?.en ?? bd.id;
        issues.push({
          severity: 'info',
          table: 'biomarker_definitions',
          id: bd.id,
          name: nameStr,
          issue: `Name "${v}" also exists in biomarkers — possible duplicate across tables`,
        });
        break;
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = {
    total: issues.length,
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    info: issues.filter((i) => i.severity === 'info').length,
    biomarkers_count: items.length,
    biomarker_definitions_count: bdList.length,
  };

  return NextResponse.json({ summary, issues });
}
