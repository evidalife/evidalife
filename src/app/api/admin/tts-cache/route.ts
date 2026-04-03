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

/** GET — cache stats from tts_cache_files tracking table + storage sizes */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;

  // ── 1. Get actual storage files for size info ─────────────────
  const languages = ['en', 'de', 'fr', 'es', 'it'];
  let storageTotalFiles = 0;
  let storageTotalSize = 0;
  const byLang: Record<string, { files: number; size: number }> = {};

  for (const lang of languages) {
    const { data: files } = await admin.storage.from(TTS_BUCKET).list(lang, { limit: 1000 });
    const count = files?.length ?? 0;
    const size = (files ?? []).reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
    if (count > 0) {
      byLang[lang] = { files: count, size };
      storageTotalFiles += count;
      storageTotalSize += size;
    }
  }

  // ── 2. Query tracking table for linked/source stats ───────────
  let trackedFiles = 0;
  let linkedToBriefing = 0;
  let orphanedFiles = 0;
  let briefingCount = 0;
  const bySource: Record<string, number> = {};
  const userStats: Record<string, { name: string; email: string; files: number; sources: Record<string, number> }> = {};

  try {
    // Get all tracked files
    const { data: tracked } = await admin
      .from('tts_cache_files')
      .select('id, user_id, briefing_id, storage_path, lang, source, size_bytes');

    trackedFiles = tracked?.length ?? 0;

    for (const row of tracked ?? []) {
      // Count by source
      bySource[row.source] = (bySource[row.source] || 0) + 1;
      // Count linked to briefing
      if (row.briefing_id) linkedToBriefing++;

      // Per-user accumulation
      if (!userStats[row.user_id]) {
        userStats[row.user_id] = { name: '', email: '', files: 0, sources: {} };
      }
      userStats[row.user_id].files++;
      userStats[row.user_id].sources[row.source] = (userStats[row.user_id].sources[row.source] || 0) + 1;
    }

    // Orphaned = in storage but not in tracking table
    orphanedFiles = Math.max(0, storageTotalFiles - trackedFiles);

    // Briefing count
    const { count } = await admin
      .from('health_briefings')
      .select('id', { count: 'exact', head: true });
    briefingCount = count ?? 0;

    // Resolve user names/emails
    const userIds = Object.keys(userStats);
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      for (const p of profiles ?? []) {
        if (userStats[p.id]) {
          userStats[p.id].name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
          userStats[p.id].email = p.email || '';
        }
      }
    }
  } catch (e) {
    console.error('[tts-cache] Error querying tracking table:', e);
  }

  return NextResponse.json({
    totalFiles: storageTotalFiles,
    totalSize: storageTotalSize,
    byLang,
    trackedFiles,
    linkedFiles: linkedToBriefing,
    orphanedFiles,
    briefingCount,
    bySource,
    userStats,
  });
}

/** DELETE — purge cache (optionally by language) + clean up tracking rows */
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { admin } = auth;
  let body: { lang?: string } = {};
  try { body = await req.json(); } catch { /* empty body = purge all */ }

  const languages = body.lang ? [body.lang] : ['en', 'de', 'fr', 'es', 'it'];
  let deletedCount = 0;
  const allDeletedPaths: string[] = [];

  for (const lang of languages) {
    const { data: files } = await admin.storage.from(TTS_BUCKET).list(lang, { limit: 1000 });
    if (!files?.length) continue;

    const paths = files.map(f => `${lang}/${f.name}`);
    const { error } = await admin.storage.from(TTS_BUCKET).remove(paths);
    if (error) {
      console.error(`[tts-cache] Error purging ${lang}:`, error.message);
    } else {
      deletedCount += paths.length;
      allDeletedPaths.push(...paths);
    }
  }

  // Clean up tracking table rows for deleted files
  let trackingDeleted = 0;
  if (allDeletedPaths.length > 0) {
    try {
      const { count } = await admin
        .from('tts_cache_files')
        .delete({ count: 'exact' })
        .in('storage_path', allDeletedPaths);
      trackingDeleted = count ?? 0;
    } catch (e) {
      console.error('[tts-cache] Error cleaning tracking rows:', e);
    }
  }

  return NextResponse.json({ ok: true, deleted: deletedCount, trackingDeleted });
}
