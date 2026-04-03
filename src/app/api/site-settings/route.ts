import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 300; // cache for 5 minutes

/** GET /api/site-settings — returns all site_settings rows as a key→value map */
export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('site_settings')
    .select('key, value');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings: Record<string, unknown> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}
