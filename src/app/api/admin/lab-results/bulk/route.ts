// src/app/api/admin/lab-results/bulk/route.ts
// POST bulk create lab results + update order test items

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { transitionOrder } from '@/lib/order-fulfilment';
import { computeStatusFlag, checkPlausibility } from '@/lib/lab-results/flagging';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { results, adminId } = body;

    if (!results?.length) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 });
    }

    const supabase = adminClient();
    let created = 0;
    let warnings = 0;
    const ordersToCheck = new Set<string>();

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
          user_id: userId || null,
          order_id: orderId || null,
          biomarker_definition_id: biomarkerDefinitionId,
          value_numeric: numericValue,
          unit: unit || null,
          status_flag: flag,
          measured_at: testDate ? new Date(testDate).toISOString() : new Date().toISOString(),
          test_date: testDate || null,
          source: 'manual',
          entered_by: adminId || null,
          is_reviewed: true,
          notes: notes || null,
          original_value: originalValue != null ? parseFloat(originalValue) : null,
          original_unit: originalUnit || null,
        })
        .select('id')
        .single();

      if (insertError || !newResult) {
        console.error('Failed to insert lab result:', insertError?.message);
        continue;
      }

      created++;

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

    return NextResponse.json({ success: true, created, warnings, orderCompleted });
  } catch (err: any) {
    console.error('Bulk lab results error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
