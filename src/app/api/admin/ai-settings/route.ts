import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return null;
  return { user, admin };
}

// GET — return all settings + API key status
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;

  const { data: settings } = await admin
    .from('ai_settings')
    .select('key, value, updated_at');

  // Key status — never expose actual key values
  const keyStatus = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    deepgram: !!process.env.DEEPGRAM_API_KEY,
  };

  return NextResponse.json({ settings: settings ?? [], keyStatus });
}

// PATCH — update one or more settings
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { user, admin } = auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ALLOWED_KEYS = [
    'briefing_model', 'chat_model', 'tts_provider', 'stt_provider',
    'elevenlabs_voice_id', 'openai_tts_voice',
    'briefing_enabled', 'companion_enabled', 'briefing_pregenerate',
    'domain_weights',
  ];

  const updates = Object.entries(body).filter(([k]) => ALLOWED_KEYS.includes(k));
  if (!updates.length) return NextResponse.json({ error: 'No valid keys' }, { status: 400 });

  const errors: string[] = [];
  for (const [key, value] of updates) {
    const { error } = await admin
      .from('ai_settings')
      .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user.id });
    if (error) errors.push(`${key}: ${error.message}`);
  }

  if (errors.length) return NextResponse.json({ error: errors.join('; ') }, { status: 500 });
  return NextResponse.json({ ok: true });
}
