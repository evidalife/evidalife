import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(req: Request) {
  try {
    // Check admin auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query user lesson progress with joins
    const { data, error } = await supabase
      .from('user_lesson_progress')
      .select(`
        id,
        user_id,
        lesson_id,
        status,
        assigned_by,
        assigned_at,
        completed_at,
        profiles!user_lesson_progress_user_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        lifestyle_lessons!user_lesson_progress_lesson_id_fkey (
          id,
          title_en,
          framework
        )
      `)
      .order('assigned_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[ai-coach-progress] query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      progress: data || [],
    });
  } catch (err) {
    console.error('[ai-coach-progress] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
