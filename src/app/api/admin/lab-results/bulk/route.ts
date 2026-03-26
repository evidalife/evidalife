// src/app/api/admin/lab-results/bulk/route.ts
// POST bulk create lab results + update order test items
// Optional labReport param: { title, test_date, lab_address?, lab_email?, lab_phone?, user_id }
// When provided, creates a lab_reports record and links all results via lab_report_id.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transitionOrder } from '@/lib/order-fulfilment';
import { computeStatusFlag, checkPlausibility } from '@/lib/lab-results/flagging';
import { generateReportNumber } from '@/lib/lab-results/report-number';
import { computeAllCalculatedMarkers } from '@/lib/health-score';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { results, adminId, labReport, labReportId: existingReportId } = body;

    if (!results?.length) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 });
    }

    const supabase = adminClient();

    // Optionally create or update a lab_reports record to group these results
    let labReportId: string | null = existingReportId ?? null;

    if (labReportId) {
      // Update the existing draft report (created at AI extraction time) to confirmed.
      // Report number was already generated at extraction — do not overwrite it.
      await supabase
        .from('lab_reports')
        .update({
          title:         labReport?.title?.trim() ?? undefined,
          test_date:     labReport?.test_date ?? undefined,
          source:        'admin_import',
          status:        'confirmed',
          report_source: labReport?.report_source || undefined,
          lab_address:   labReport?.lab_address || null,
          lab_email:     labReport?.lab_email   || null,
          lab_phone:     labReport?.lab_phone   || null,
        })
        .eq('id', labReportId);
    } else if (labReport?.title && labReport?.test_date && labReport?.user_id) {
      // Legacy path: no existing draft, create a new report directly
      // Look up lab code if a lab was selected
      let labCode: string | null = null;
      if (labReport.lab_id) {
        const { data: labRecord } = await supabase
          .from('lab_partners')
          .select('lab_code')
          .eq('id', labReport.lab_id)
          .maybeSingle();
        labCode = labRecord?.lab_code ?? null;
      }
      const reportNumber = await generateReportNumber(
        supabase,
        labReport.report_source ?? 'external_upload',
        labCode,
        labReport.test_date,
      );
      const { data: reportRecord } = await supabase
        .from('lab_reports')
        .insert({
          user_id:       labReport.user_id,
          title:         labReport.title.trim(),
          test_date:     labReport.test_date,
          source:        'admin_import',
          status:        'confirmed',
          report_number: reportNumber,
          report_source: labReport.report_source || null,
          lab_id:        labReport.lab_id || null,
          lab_address:   labReport.lab_address || null,
          lab_email:     labReport.lab_email   || null,
          lab_phone:     labReport.lab_phone   || null,
        })
        .select('id')
        .single();
      labReportId = reportRecord?.id ?? null;
    }

    let created = 0;
    let warnings = 0;
    const ordersToCheck = new Set<string>();

    // Pre-fetch slugs for all biomarker IDs so we can build the slug→value map
    const allBiomarkerIds = [...new Set(results.map((r: any) => r.biomarkerDefinitionId).filter(Boolean))];
    const { data: allBiomarkerSlugs } = await supabase
      .from('biomarkers')
      .select('id, slug')
      .in('id', allBiomarkerIds);
    const biomarkerSlugMap = new Map<string, string>(
      (allBiomarkerSlugs ?? []).map((b: any) => [b.id, b.slug]),
    );

    // Collect slug→value for auto-computing calculated markers after the loop
    const savedValues: Record<string, number> = {};
    let savedUserId: string | null = null;
    let savedTestDate: string | null = null;

    for (const item of results) {
      const {
        orderId, orderTestItemId, biomarkerDefinitionId, userId,
        value, unit, testDate, notes, biomarkerName,
        refRangeLow, refRangeHigh, optimalRangeLow, optimalRangeHigh, rangeType,
        originalValue, originalUnit,
      } = item;

      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) continue;

      // Compute status flag
      const flag = computeStatusFlag(numericValue, {
        ref_range_low: refRangeLow ?? null,
        ref_range_high: refRangeHigh ?? null,
        optimal_range_low: optimalRangeLow ?? null,
        optimal_range_high: optimalRangeHigh ?? null,
        range_type: rangeType ?? null,
      });

      // Duplicate check
      if (userId && biomarkerDefinitionId && testDate) {
        const { data: existing } = await supabase
          .from('lab_results')
          .select('id, value_numeric')
          .eq('user_id', userId)
          .eq('biomarker_definition_id', biomarkerDefinitionId)
          .eq('test_date', testDate)
          .is('deleted_at', null)
          .limit(1);
        if (existing?.length) {
          // Create duplicate review item
          const existingLabResultId = existing[0].id;
          await supabase.from('lab_result_reviews').insert({
            lab_result_id: existingLabResultId,
            review_type: 'duplicate_detected',
            severity: 'warning',
            message: `Duplicate result for this biomarker on ${testDate}. Existing: ${existing[0].value_numeric}, New: ${numericValue}`,
            original_value: String(existing[0].value_numeric),
            suggested_value: String(numericValue),
          });
          warnings++;
          continue; // Skip saving duplicate — let review queue handle it
        }
      }

      // Insert lab_result
      const { data: newResult, error: insertError } = await supabase
        .from('lab_results')
        .insert({
          user_id:                 userId || null,
          order_id:                orderId || null,
          lab_report_id:           labReportId || null,
          biomarker_definition_id: biomarkerDefinitionId,
          value_numeric:           numericValue,
          unit:                    unit || null,
          status_flag:             flag,
          measured_at:             testDate ? new Date(testDate).toISOString() : new Date().toISOString(),
          test_date:               testDate || null,
          source:                  labReportId ? 'admin_import' : 'manual',
          entered_by:              adminId || null,
          is_reviewed:             true,
          notes:                   notes || null,
          original_value:          originalValue != null ? parseFloat(originalValue) : null,
          original_unit:           originalUnit || null,
        })
        .select('id')
        .single();

      if (insertError || !newResult) {
        console.error('Failed to insert lab result:', insertError?.message);
        continue;
      }

      created++;

      // Track saved values for post-loop calculated marker computation
      const slug = biomarkerSlugMap.get(biomarkerDefinitionId);
      if (slug) savedValues[slug] = numericValue;
      if (!savedUserId && userId) savedUserId = userId;
      if (!savedTestDate && testDate) savedTestDate = testDate;

      // Plausibility check
      const plausibility = checkPlausibility(numericValue, biomarkerName || '', {
        ref_range_low: refRangeLow ?? null,
        ref_range_high: refRangeHigh ?? null,
        optimal_range_low: optimalRangeLow ?? null,
        optimal_range_high: optimalRangeHigh ?? null,
        range_type: rangeType ?? null,
      });
      if (!plausibility.plausible) {
        await supabase.from('lab_result_reviews').insert({
          lab_result_id: newResult.id,
          review_type: 'plausibility_warning',
          severity: 'warning',
          message: plausibility.message || 'Plausibility check failed',
          original_value: String(numericValue),
        });
        warnings++;
      }

      // Update order_test_item
      if (orderTestItemId) {
        await supabase.from('order_test_items').update({
          status: 'completed',
          result_value: numericValue,
          result_unit: unit || null,
          status_flag: flag,
          lab_result_id: newResult.id,
          completed_at: new Date().toISOString(),
        }).eq('id', orderTestItemId);
      }

      if (orderId) ordersToCheck.add(orderId);
    }

    // ── Auto-compute calculated markers ──────────────────────────────────────
    if (labReportId && savedUserId && Object.keys(savedValues).length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('birthday, height_cm, sex')
        .eq('id', savedUserId)
        .single();

      const userAge = profileData?.birthday
        ? Math.floor(
            (Date.now() - new Date(profileData.birthday).getTime()) /
            (365.25 * 24 * 3600 * 1000),
          )
        : undefined;
      const heightCm = profileData?.height_cm ?? undefined;
      const userSex = profileData?.sex === 'male' ? 'male'
                    : profileData?.sex === 'female' ? 'female'
                    : null;

      const withCalc = computeAllCalculatedMarkers(savedValues, userAge, heightCm, userSex);

      const newCalcEntries = Object.entries(withCalc).filter(
        ([slug]) =>
          !(slug in savedValues) &&
          slug !== 'age_years' &&
          slug !== 'height_cm' &&
          slug !== 'sex_code',
      );

      if (newCalcEntries.length > 0) {
        const calcSlugs = newCalcEntries.map(([slug]) => slug);
        const { data: calcBiomarkers } = await supabase
          .from('biomarkers')
          .select('id, slug')
          .in('slug', calcSlugs)
          .eq('is_calculated', true);

        if (calcBiomarkers && calcBiomarkers.length > 0) {
          const calcBioMap = Object.fromEntries(calcBiomarkers.map((b: any) => [b.slug, b.id]));
          const calcRows = newCalcEntries
            .filter(([slug]) => calcBioMap[slug])
            .map(([slug, value]) => ({
              user_id:                 savedUserId,
              lab_report_id:           labReportId,
              biomarker_definition_id: calcBioMap[slug],
              value_numeric:           value,
              unit:                    '',
              source:                  'calculated',
              is_reviewed:             true,
              test_date:               savedTestDate ?? new Date().toISOString().split('T')[0],
              measured_at:             savedTestDate
                ? new Date(savedTestDate).toISOString()
                : new Date().toISOString(),
            }));
          if (calcRows.length > 0) {
            await supabase.from('lab_results').insert(calcRows);
          }
        }
      }
    }
    // ── End auto-compute ──────────────────────────────────────────────────────

    // Check if any orders are now 100% complete
    let orderCompleted = false;
    for (const orderId of ordersToCheck) {
      const { data: allItems } = await supabase
        .from('order_test_items')
        .select('status')
        .eq('order_id', orderId);

      if (allItems && allItems.every((i: any) => i.status === 'completed')) {
        try {
          await transitionOrder(orderId, 'lab_results_uploaded');
          orderCompleted = true;
        } catch (e) {
          console.error('Failed to transition order:', e);
        }
      }
    }

    return NextResponse.json({ success: true, created, warnings, orderCompleted, labReportId });
  } catch (err: any) {
    console.error('Bulk lab results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
