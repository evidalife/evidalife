import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Public endpoint: fetch active voice briefings for a given page.
 * GET /api/voice-briefings?page=home
 */
export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') ?? 'home';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('voice_briefings')
    .select('slug, title, page, audio_url_en, audio_url_de, audio_url_fr, audio_url_es, audio_url_it, script_en, script_de, script_fr, script_es, script_it')
    .eq('page', page)
    .eq('is_active', true)
    .eq('status', 'ready')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ briefings: data ?? [] });
}
