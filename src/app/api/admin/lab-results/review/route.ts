// src/app/api/admin/lab-results/review/route.ts
// POST { reviewId, action, newValue?, notes? }

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const { reviewId, action, newValue, notes, adminId } = await req.json();
    if (!reviewId || !action) {
      return NextResponse.json({ error: 'reviewId and action are required' }, { status: 400 });
    }

    const supabase = adminClient();
    const now = new Date().toISOString();

    // Fetch the review
    const { data: review } = await supabase
      .from('lab_result_reviews')
      .select('id, lab_result_id, is_resolved')
      .eq('id', reviewId)
      .single();

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    switch (action) {
      case 'approve': {
        await supabase.from('lab_results').update({ is_reviewed: true }).eq('id', review.lab_result_id);
        await supabase.from('lab_result_reviews').update({
          is_resolved: true, resolved_by: adminId || null,
          resolved_at: now, resolution_notes: notes || null,
        }).eq('id', reviewId);
        break;
      }
      case 'edit_approve': {
        if (newValue == null) return NextResponse.json({ error: 'newValue required for edit_approve' }, { status: 400 });
        await supabase.from('lab_results').update({ value_numeric: parseFloat(newValue), is_reviewed: true }).eq('id', review.lab_result_id);
        await supabase.from('lab_result_reviews').update({
          is_resolved: true, resolved_by: adminId || null,
          resolved_at: now, resolution_notes: notes || `Value corrected to ${newValue}`,
        }).eq('id', reviewId);
        break;
      }
      case 'reject': {
        // Get order_test_item linked to this lab result
        const { data: testItem } = await supabase
          .from('order_test_items')
          .select('id, order_id')
          .eq('lab_result_id', review.lab_result_id)
          .maybeSingle();

        // Reset test item to pending
        if (testItem) {
          await supabase.from('order_test_items').update({
            status: 'pending', lab_result_id: null,
            result_value: null, result_unit: null, status_flag: null, completed_at: null,
          }).eq('id', testItem.id);
        }

        // Soft delete the lab result
        await supabase.from('lab_results').update({ deleted_at: now }).eq('id', review.lab_result_id);
        await supabase.from('lab_result_reviews').update({
          is_resolved: true, resolved_by: adminId || null,
          resolved_at: now, resolution_notes: notes || 'Rejected',
        }).eq('id', reviewId);
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, action });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
