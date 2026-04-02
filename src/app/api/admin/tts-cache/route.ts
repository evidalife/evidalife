import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TTS_BUCKET } from '@/lib/tts-cache';

async function requireAdmin() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return null;
  return { user, admin };
}

/** GET — cache stats: file count + total size per language folder */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;
  const languages = ['en', 'de', 'fr', 'es', 'it'];
  let totalFiles = 0;
  let totalSize = 0;
  const byLang: Record<string, { files: number; size: number }> = {};

  for (const lang of languages) {
    const { data: files } = await admin.storage.from(TTS_BUCKET).list(lang, { limit: 1000 });
    const count = files?.length ?? 0;
    const size = (files ?? []).reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
    if (count > 0) {
      byLang[lang] = { files: count, size };
      totalFiles += count;
      totalSize += size;
    }
  }

  return NextResponse.json({ totalFiles, totalSize, byLang });
}

/** DELETE — purge cache (optionally by language) */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;
  let body: { lang?: string } = {};
  try { body = await req.json(); } catch { /* empty body = purge all */ }

  const languages = body.lang ? [body.lang] : ['en', 'de', 'fr', 'es', 'it'];
  let deletedCount = 0;

  for (const lang of languages) {
    const { data: files } = await admin.storage.from(TTS_BUCKET).list(lang, { limit: 1000 });
    if (!files?.length) continue;

    const paths = files.map(f => `${lang}/${f.name}`);
    const { error } = await admin.storage.from(TTS_BUCKET).remove(paths);
    if (error) {
      console.error(`[tts-cache] Error purging ${lang}:`, error.message);
    } else {
      deletedCount += paths.length;
    }
  }

  return NextResponse.json({ ok: true, deleted: deletedCount });
}
