import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof LANGS)[number];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin ? user.id : null;
}

async function generateElevenLabsTTS(text: string, voiceId: string): Promise<Buffer | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.78,
        style: 0.15,          // slightly more expressive for marketing
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    console.error('[VoiceBriefing TTS] ElevenLabs error:', res.status, await res.text());
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Generates audio for all languages of a voice briefing.
 * Body: { id: string, langs?: string[] }
 * If langs is omitted, generates for all 5 languages.
 */
export async function POST(req: NextRequest) {
  const uid = await requireAdmin();
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, langs: requestedLangs } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: briefing } = await admin.from('voice_briefings').select('*').eq('id', id).single();
  if (!briefing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const langsToGenerate: Lang[] = requestedLangs
    ? (requestedLangs as string[]).filter((l): l is Lang => LANGS.includes(l as Lang))
    : [...LANGS];

  // Mark as generating
  await admin.from('voice_briefings').update({ status: 'generating', updated_at: new Date().toISOString() }).eq('id', id);

  const results: Record<string, { success: boolean; url?: string; error?: string }> = {};

  // Delete old audio files first
  const oldFiles: string[] = [];
  for (const lang of langsToGenerate) {
    const oldUrl = briefing[`audio_url_${lang}`] as string | null;
    if (oldUrl) {
      const path = oldUrl.split('/voice-briefings/').pop();
      if (path) oldFiles.push(path);
    }
  }
  if (oldFiles.length > 0) {
    await admin.storage.from('voice-briefings').remove(oldFiles);
  }

  // Generate audio for each language
  const updates: Record<string, string | null> = { updated_at: new Date().toISOString() };
  let allSuccess = true;

  for (const lang of langsToGenerate) {
    const script = briefing[`script_${lang}`] as string;
    if (!script?.trim()) {
      results[lang] = { success: false, error: 'No script' };
      allSuccess = false;
      continue;
    }

    try {
      const audioBuffer = await generateElevenLabsTTS(script, briefing.voice_id);
      if (!audioBuffer) {
        results[lang] = { success: false, error: 'TTS generation failed' };
        allSuccess = false;
        continue;
      }

      // Upload to Supabase storage
      const storagePath = `${briefing.slug}/${lang}-${Date.now()}.mp3`;
      const { error: uploadErr } = await admin.storage
        .from('voice-briefings')
        .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

      if (uploadErr) {
        results[lang] = { success: false, error: uploadErr.message };
        allSuccess = false;
        continue;
      }

      const { data: urlData } = admin.storage.from('voice-briefings').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      updates[`audio_url_${lang}`] = publicUrl;
      results[lang] = { success: true, url: publicUrl };
    } catch (e) {
      results[lang] = { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
      allSuccess = false;
    }
  }

  // Update DB with new audio URLs and status
  updates.status = allSuccess ? 'ready' : 'error';
  await admin.from('voice_briefings').update(updates).eq('id', id);

  return NextResponse.json({ success: allSuccess, results });
}
