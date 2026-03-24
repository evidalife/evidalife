import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const fulfilmentStatus = searchParams.get('fulfilment_status');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('orders')
    .select(`
      order_number, status, fulfilment_status, total_amount, currency,
      created_at, paid_at, completed_at, cancelled_at,
      notes, internal_notes, tags, source,
      profiles(email, first_name, last_name),
      order_items(quantity, unit_price, products(name))
    `)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (status) query = query.eq('status', status);
  if (fulfilmentStatus) query = query.eq('fulfilment_status', fulfilmentStatus);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as any[];

  const headers = [
    'Order #', 'Email', 'Name', 'Status', 'Fulfilment', 'Total', 'Currency',
    'Products', 'Source', 'Tags', 'Notes', 'Created', 'Paid', 'Completed',
  ];

  function esc(v: string | null | undefined) {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function locName(f: any) {
    if (!f) return '';
    if (typeof f === 'string') return f;
    return f.de || f.en || '';
  }

  const lines = [
    headers.join(','),
    ...rows.map((o) => {
      const name = [o.profiles?.first_name, o.profiles?.last_name].filter(Boolean).join(' ');
      const products = (o.order_items ?? [])
        .map((i: any) => `${locName(i.products?.name)} x${i.quantity}`)
        .join('; ');
      return [
        esc(o.order_number),
        esc(o.profiles?.email),
        esc(name),
        esc(o.status),
        esc(o.fulfilment_status),
        esc(o.total_amount),
        esc(o.currency),
        esc(products),
        esc(o.source),
        esc((o.tags ?? []).join('; ')),
        esc(o.notes),
        esc(o.created_at?.slice(0, 10)),
        esc(o.paid_at?.slice(0, 10)),
        esc(o.completed_at?.slice(0, 10)),
      ].join(',');
    }),
  ].join('\n');

  return new NextResponse(lines, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
