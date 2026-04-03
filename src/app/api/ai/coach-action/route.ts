import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 30;

// ── POST: Handle coach actions (complete lesson, unlock phase) ──────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    action: 'complete_lesson' | 'unlock_phase';
    lessonId?: string;
    phase?: 'tweaks' | 'anti_aging';
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body;
  const admin = createAdminClient();

  // ── Complete Lesson ─────────────────────────────────────────────────
  if (action === 'complete_lesson') {
    const { lessonId } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await admin
      .from('user_lesson_progress')
      .update({
        status: 'completed',
        completed_at: now,
      })
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('[coach-action] Complete lesson error:', error.message);
      return NextResponse.json(
        { error: 'Failed to update lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  }

  // ── Unlock Phase ────────────────────────────────────────────────────
  if (action === 'unlock_phase') {
    const { phase } = body;

    if (!phase || !['tweaks', 'anti_aging'].includes(phase)) {
      return NextResponse.json(
        { error: 'Invalid phase' },
        { status: 400 }
      );
    }

    const updateKey = phase === 'tweaks' ? 'tweaks_enabled' : 'anti_aging_enabled';

    const { data, error } = await admin
      .from('user_settings')
      .update({ [updateKey]: true })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[coach-action] Unlock phase error:', error.message);
      return NextResponse.json(
        { error: 'Failed to unlock phase' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
