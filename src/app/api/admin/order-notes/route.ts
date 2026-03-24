import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const serviceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('orderId');
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('order_notes')
    .select('id, note_type, body, created_at, profiles(first_name, last_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { orderId, noteType = 'internal', body } = await req.json();
  if (!orderId || !body?.trim()) {
    return NextResponse.json({ error: 'orderId and body required' }, { status: 400 });
  }

  const supabase = serviceClient();

  // identify caller
  const authHeader = req.headers.get('authorization');
  let adminId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const { data } = await supabase.auth.getUser(authHeader.slice(7));
    adminId = data.user?.id ?? null;
  }

  const { data, error } = await supabase
    .from('order_notes')
    .insert({ order_id: orderId, admin_id: adminId, note_type: noteType, body: body.trim() })
    .select('id, note_type, body, created_at, profiles(first_name, last_name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}

export async function DELETE(req: NextRequest) {
  const noteId = req.nextUrl.searchParams.get('noteId');
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 });

  const supabase = serviceClient();
  const { error } = await supabase.from('order_notes').delete().eq('id', noteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
