// src/lib/lab-results/compute-calculated.ts
// Shared utility: after lab results are saved for a report, compute all derivable
// calculated biomarkers (PhenoAge, De Ritis, FIB-4, AIP, Castelli, etc.) and
// insert them as new lab_result rows with source='calculated'.
//
// Call this from any import path: save-report, parse-lab-results, bulk, or manual add.

import { computeAllCalculatedMarkers } from '@/lib/health-score';
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

  // 6. Look up biomarker IDs for calculated slugs
  const calcSlugs = newCalcEntries.map(([slug]) => slug);
  const { data: calcBiomarkers } = await supabase
    .from('biomarkers')
    .select('id, slug, unit, ref_range_low, ref_range_high, optimal_range_low, optimal_range_high')
    .in('slug', calcSlugs);

  if (!calcBiomarkers || calcBiomarkers.length === 0) return 0;

  const calcBioMap = Object.fromEntries(
    calcBiomarkers.map((b: any) => [b.slug, b]),
  );

  // 7. Build insert rows with status_flag computation
  const measuredAt = testDate
    ? new Date(testDate).toISOString()
    : new Date().toISOString();

  const calcRows = newCalcEntries
    .filter(([slug]) => calcBioMap[slug])
    .map(([slug, value]) => {
      const bio = calcBioMap[slug];
      let statusFlag: string = 'moderate';
      const optLow = bio.optimal_range_low;
      const optHigh = bio.optimal_range_high;
      const refLow = bio.ref_range_low;
      const refHigh = bio.ref_range_high;
      if (optLow != null && optHigh != null && value >= optLow && value <= optHigh) {
        statusFlag = 'optimal';
      } else if (refLow != null && refHigh != null && value >= refLow && value <= refHigh) {
        statusFlag = 'good';
      } else if (
        (refLow != null && value < refLow) ||
        (refHigh != null && value > refHigh)
      ) {
        statusFlag = 'risk';
      }

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
