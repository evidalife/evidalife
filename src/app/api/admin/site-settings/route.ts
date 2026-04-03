import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET /api/admin/site-settings — all rows */
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('site_settings')
    .select('key, value, description, updated_at')
    .order('key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** PUT /api/admin/site-settings — upsert one or more settings */
export async function PUT(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const entries: { key: string; value: unknown }[] = body.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: 'entries[] required' }, { status: 400 });
  }

  // Upsert each entry
  for (const { key, value } of entries) {
    const { error } = await admin
      .from('site_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);
    if (error) {
      return NextResponse.json({ error: `Failed to update ${key}: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
