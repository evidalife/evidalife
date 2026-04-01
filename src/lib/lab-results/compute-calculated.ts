// src/lib/lab-results/compute-calculated.ts
// Shared utility: after lab results are saved for a report, compute all derivable
// calculated biomarkers (PhenoAge, De Ritis, FIB-4, AIP, Castelli, etc.) and
// insert them as new lab_result rows with source='calculated'.
//
// Call this from any import path: save-report, parse-lab-results, bulk, or manual add.

import { computeAllCalculatedMarkers } from '@/lib/health-score';
import { computeStatusFlag } from '@/lib/lab-results/flagging';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ComputeCalcOpts {
  supabase: SupabaseClient;
  userId: string;
  labReportId: string;
  testDate: string | null;
}

/**
 * Reads all measured results for the given report, computes derived markers,
 * and inserts any new calculated values that don't already exist.
 *
 * @returns number of calculated markers inserted
 */
export async function computeAndInsertCalculatedMarkers({
  supabase,
  userId,
  labReportId,
  testDate,
}: ComputeCalcOpts): Promise<number> {
  // 1. Delete any previously-calculated results for this report (so formulas re-run cleanly)
  await supabase
    .from('lab_results')
    .delete()
    .eq('lab_report_id', labReportId)
    .eq('source', 'calculated');

  // 2. Fetch all remaining (measured) results for this report
  const { data: existingResults } = await supabase
    .from('lab_results')
    .select('biomarker_definition_id, value_numeric, biomarkers:biomarker_definition_id(slug)')
    .eq('lab_report_id', labReportId)
    .is('deleted_at', null);

  if (!existingResults || existingResults.length === 0) return 0;

  // Build slug→value map from measured results only
  const measured: Record<string, number> = {};
  for (const r of existingResults) {
    const bio = r.biomarkers as unknown as { slug: string } | null;
    if (bio?.slug && r.value_numeric != null) {
      measured[bio.slug] = Number(r.value_numeric);
    }
  }

  // 3. Get user profile for age, height, sex
  const { data: profile } = await supabase
    .from('profiles')
    .select('date_of_birth, height_cm, sex')
    .eq('id', userId)
    .single();

  const userAge = profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : undefined;
  const heightCm = profile?.height_cm ?? undefined;
  const userSex = profile?.sex === 'male' ? 'male' as const
                : profile?.sex === 'female' ? 'female' as const
                : null;

  // 4. Compute all derivable calculated markers
  const withCalc = computeAllCalculatedMarkers(measured, userAge, heightCm, userSex);

  // 5. Filter to only NEW calculated values (not already in measured)
  const newCalcEntries = Object.entries(withCalc).filter(
    ([slug]) =>
      !(slug in measured) &&
      slug !== 'age_years' &&
      slug !== 'height_cm' &&
      slug !== 'sex_code',
  );

  if (newCalcEntries.length === 0) return 0;

  // 6. Look up biomarker IDs for calculated slugs (including range_type)
  const calcSlugs = newCalcEntries.map(([slug]) => slug);
  const { data: calcBiomarkers } = await supabase
    .from('biomarkers')
    .select('id, slug, unit, range_type, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high')
    .in('slug', calcSlugs);

  if (!calcBiomarkers || calcBiomarkers.length === 0) return 0;

  const calcBioMap = Object.fromEntries(
    calcBiomarkers.map((b: any) => [b.slug, b]),
  );

  // 6b. Look up age/sex-stratified range overrides (if any)
  const bioIds = calcBiomarkers.map((b: any) => b.id);
  const { data: rangeOverrides } = await supabase
    .from('biomarker_range_overrides')
    .select('biomarker_id, sex, age_min, age_max, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high')
    .in('biomarker_id', bioIds);

  // Build a lookup: biomarker_id → best-matching override for this user's age/sex
  const overrideMap = new Map<string, typeof rangeOverrides extends (infer T)[] | null ? T : never>();
  if (rangeOverrides && userAge != null) {
    const sexCode = userSex === 'male' ? 'M' : userSex === 'female' ? 'F' : null;
    for (const ov of rangeOverrides) {
      // Check age match
      if (ov.age_min != null && userAge < ov.age_min) continue;
      if (ov.age_max != null && userAge > ov.age_max) continue;
      // Check sex match (null sex in override = applies to all)
      if (ov.sex != null && ov.sex !== sexCode) continue;
      // Prefer sex-specific over generic, narrower age band over wider
      const existing = overrideMap.get(ov.biomarker_id);
      if (!existing || (ov.sex != null && existing.sex == null)) {
        overrideMap.set(ov.biomarker_id, ov);
      }
    }
  }

  // 7. Build insert rows with status_flag computation (using computeStatusFlag + overrides)
  const measuredAt = testDate
    ? new Date(testDate).toISOString()
    : new Date().toISOString();

  const calcRows = newCalcEntries
    .filter(([slug]) => calcBioMap[slug])
    .map(([slug, value]) => {
      const bio = calcBioMap[slug];
      // Use age/sex override ranges if available, otherwise fall back to base ranges
      const ov = overrideMap.get(bio.id);
      const ranges = {
        ref_range_low:     ov?.ref_range_low     ?? bio.ref_range_low     ?? null,
        ref_range_high:    ov?.ref_range_high    ?? bio.ref_range_high    ?? null,
        optimal_range_low: ov?.optimal_range_low ?? bio.optimal_range_low ?? null,
        optimal_range_high: ov?.optimal_range_high ?? bio.optimal_range_high ?? null,
        range_type:        bio.range_type ?? null,
      };

      const statusFlag = (ranges.ref_range_low != null || ranges.ref_range_high != null
                       || ranges.optimal_range_low != null || ranges.optimal_range_high != null)
        ? computeStatusFlag(value, ranges)
        : 'moderate';

      return {
        user_id:                 userId,
        lab_report_id:           labReportId,
        biomarker_definition_id: bio.id,
        value_numeric:           value,
        unit:                    bio.unit || '',
        status_flag:             statusFlag,
        source:                  'calculated',
        is_reviewed:             true,
        test_date:               testDate ?? new Date().toISOString().split('T')[0],
        measured_at:             measuredAt,
      };
    });

  if (calcRows.length === 0) return 0;

  const { error } = await supabase.from('lab_results').insert(calcRows);
  if (error) {
    console.error('[compute-calculated] insert error:', error.message);
    return 0;
  }

  return calcRows.length;
}
