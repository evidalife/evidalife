import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkCredits, debitCredits, debitVoiceMinutes } from '@/lib/credits/credit-manager';
import { CONVERSATION_MODES, type ConversationMode } from '@/lib/voice/conversation-types';

export const maxDuration = 30;

// ── POST: Start a new voice session ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { mode: ConversationMode; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mode, lang = 'en' } = body;
  const modeConfig = CONVERSATION_MODES[mode];
  if (!modeConfig) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  // ── Credit check ────────────────────────────────────────────────
  const creditCheck = await checkCredits(user.id, 'voice_conversation', modeConfig.creditsPerSession);
  if (!creditCheck.allowed) {
    return NextResponse.json({
      error: 'Insufficient credits',
      required: modeConfig.creditsPerSession,
      remaining: creditCheck.remainingCredits,
      reason: creditCheck.reason,
    }, { status: 402 });
  }

  // ── Create session record ──────────────────────────────────────
  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from('voice_sessions')
    .insert({
      user_id: user.id,
      mode,
      status: 'active',
      lang,
      max_duration_seconds: modeConfig.maxDurationSeconds,
      credits_reserved: modeConfig.creditsPerSession,
    })
    .select()
    .single();

  if (error) {
    console.error('[voice-session] Create error:', error.message);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  return NextResponse.json({
    sessionId: session.id,
    mode,
    maxDurationSeconds: modeConfig.maxDurationSeconds,
    lang,
  });
}

// ── PATCH: End/update a voice session ────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { sessionId: string; action: 'end' | 'pause' | 'resume'; durationSeconds?: number; turnCount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, action, durationSeconds, turnCount } = body;
  const admin = createAdminClient();

  // Verify ownership
  const { data: session } = await admin
    .from('voice_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  if (action === 'end') {
    const finalDuration = durationSeconds ?? session.duration_seconds ?? 0;
    const voiceMinutes = finalDuration / 60;

    // Update session
    await admin
      .from('voice_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_seconds: finalDuration,
        turn_count: turnCount ?? session.turn_count ?? 0,
        voice_minutes_used: voiceMinutes,
      })
      .eq('id', sessionId);

    // Debit credits and voice minutes
    const modeConfig = CONVERSATION_MODES[session.mode as ConversationMode];
    if (modeConfig) {
      await debitCredits(user.id, 'voice_conversation', modeConfig.creditsPerSession, `Voice ${session.mode}: ${Math.round(voiceMinutes)}min`);
      await debitVoiceMinutes(user.id, voiceMinutes);
    }

    return NextResponse.json({ ok: true, durationSeconds: finalDuration, voiceMinutesUsed: voiceMinutes });
  }

  if (action === 'pause') {
    await admin.from('voice_sessions').update({ status: 'paused' }).eq('id', sessionId);
    return NextResponse.json({ ok: true });
  }

  if (action === 'resume') {
    await admin.from('voice_sessions').update({ status: 'active' }).eq('id', sessionId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
