import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof LANGS)[number];

const LANG_NAMES: Record<Lang, string> = {
  en: 'English', de: 'German (Swiss/DACH)', fr: 'French', es: 'Spanish', it: 'Italian',
};

// ── Auth helper ──────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user.id : null;
}

// ── GET: list all voice briefings ────────────────────────────────
export async function GET() {
  const uid = await requireAdmin();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('voice_briefings')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ briefings: data });
}

// ── POST: create or update a voice briefing ──────────────────────
export async function POST(req: NextRequest) {
  const uid = await requireAdmin();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...fields } = body;

  const admin = createAdminClient();

  if (id) {
    // Update
    const { error } = await admin
      .from('voice_briefings')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } else {
    // Insert
    const { data, error } = await admin
      .from('voice_briefings')
      .insert(fields)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ briefing: data });
  }
}

// ── DELETE: remove a voice briefing + its audio files ────────────
export async function DELETE(req: NextRequest) {
  const uid = await requireAdmin();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();

  // Get briefing to find audio files
  const { data: briefing } = await admin.from('voice_briefings').select('*').eq('id', id).single();
  if (!briefing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete audio files from storage
  const filesToDelete: string[] = [];
  for (const lang of LANGS) {
    const url = briefing[`audio_url_${lang}`];
    if (url) {
      const path = url.split('/voice-briefings/').pop();
      if (path) filesToDelete.push(path);
    }
  }
  if (filesToDelete.length > 0) {
    await admin.storage.from('voice-briefings').remove(filesToDelete);
  }

  // Delete DB record
  const { error } = await admin.from('voice_briefings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
