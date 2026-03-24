import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TABLES = new Set([
  // Shop
  'products', 'product_item_definitions', 'product_items',
  'orders', 'order_vouchers', 'order_test_items', 'order_status_log',
  'order_notes', 'order_refunds', 'discount_codes',
  // Health
  'lab_results', 'lab_result_reviews', 'lab_pdf_uploads',
  // System
  'profiles', 'email_log',
]);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const table    = searchParams.get('table') ?? '';
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)));
  const sort     = searchParams.get('sort') ?? 'created_at';
  const order    = searchParams.get('order') === 'asc' ? true : false;
  const search   = (searchParams.get('search') ?? '').trim();

  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: 'Table not allowed' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;

  let query = supabase.from(table).select('*', { count: 'exact' });

  // Text search: Supabase textSearch only works on text columns.
  // We use ilike across common text columns via OR filter.
  if (search) {
    // Generic search: try id, name, email, slug, status, order_number
    const textCols = ['id', 'email', 'first_name', 'last_name', 'display_name', 'slug',
      'name', 'status', 'order_number', 'sku', 'code', 'type', 'item_type'];
    const orFilter = textCols.map((c) => `${c}.ilike.%${search}%`).join(',');
    query = query.or(orFilter);
  }

  query = query.order(sort, { ascending: order }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    // If the sort column doesn't exist on this table, retry without sort
    if (error.code === '42703') {
      const fallback = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .range(from, to);
      if (fallback.error) return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      const columns = fallback.data && fallback.data.length > 0 ? Object.keys(fallback.data[0]) : [];
      return NextResponse.json({ data: fallback.data ?? [], count: fallback.count ?? 0, columns });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
  return NextResponse.json({ data: data ?? [], count: count ?? 0, columns });
}
