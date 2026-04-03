// ── Coach Context Builder ────────────────────────────────────────────────────
// Builds enriched context for the AI health coach by pulling in:
// - User's recent Daily Dozen entries (nutrition tracking)
// - Active daily checklist items (21 Tweaks, Anti-Aging)
// - Relevant lifestyle lessons
// - Journey progress (phase status, streak data)
// - Lesson progress (completed and assigned lessons)
// This gives the coach real data about the user's habits and goals.

import { createAdminClient } from '@/lib/supabase/admin';

interface DailyDozenEntry {
  category_slug: string;
  servings: number;
  target: number;
  date: string;
}

interface LessonProgressRow {
  id: string;
  status: string;
  completed_at: string | null;
  assigned_at: string;
  lesson: {
    id: string;
    title_en: string;
    title_de: string;
    title_fr: string;
    title_es: string;
    title_it: string;
    framework: string;
    category: string;
  };
}

/**
 * Build a compact context string with the user's Daily Dozen data
 * and active checklist items for the AI coach.
 */
export async function buildCoachContext(userId: string, lang: string = 'en'): Promise<string> {
  const admin = createAdminClient();
  const parts: string[] = [];

  // 1. Recent Daily Dozen entries (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: recentEntries } = await admin
    .from('daily_dozen_entries')
    .select('category_slug, servings, target, date')
    .eq('user_id', userId)
    .gte('date', weekAgo)
    .order('date', { ascending: false });

  if (recentEntries && recentEntries.length > 0) {
    // Get category names
    const { data: categories } = await admin
      .from('daily_dozen_categories')
      .select('slug, name_en, name_de, name_fr, name_es, name_it');

    const nameField = `name_${lang}` as keyof typeof categories extends Array<infer U> ? keyof U : string;
    const catNames: Record<string, string> = {};
    categories?.forEach((c: Record<string, unknown>) => {
      catNames[c.slug as string] = (c[nameField] as string) || (c.name_en as string) || (c.slug as string);
    });

    // Group by date, show last 3 days
    const byDate: Record<string, DailyDozenEntry[]> = {};
    recentEntries.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    const dates = Object.keys(byDate).sort().reverse().slice(0, 3);
    const dailyDozenLines: string[] = ['DAILY DOZEN TRACKING (last 3 days):'];

    for (const date of dates) {
      const entries = byDate[date];
      const completed = entries.filter(e => e.servings >= e.target).length;
      const total = entries.length;
      const missed = entries.filter(e => e.servings < e.target).map(e => catNames[e.category_slug] || e.category_slug);

      dailyDozenLines.push(`  ${date}: ${completed}/${total} categories completed${missed.length > 0 ? ` — missed: ${missed.join(', ')}` : ' — all completed!'}`);
    }

    parts.push(dailyDozenLines.join('\n'));
  }

  // 2. Active checklist items (21 Tweaks + Anti-Aging)
  const nameCol = `name_${lang}`;
  const { data: rawChecklistItems } = await admin
    .from('daily_checklist_items')
    .select('name_en, name_de, name_fr, name_es, name_it, category, target_servings, unit, framework')
    .eq('is_active', true)
    .in('framework', ['21_tweaks', 'anti_aging'])
    .order('framework')
    .order('sort_order');

  if (rawChecklistItems && rawChecklistItems.length > 0) {
    const getName = (item: Record<string, unknown>) => (item[nameCol] as string) || (item.name_en as string) || 'unnamed';
    const tweaks = rawChecklistItems.filter(i => i.framework === '21_tweaks');
    const antiAging = rawChecklistItems.filter(i => i.framework === 'anti_aging');

    const lines: string[] = ['ACTIVE CHECKLIST ITEMS:'];
    if (tweaks.length > 0) {
      lines.push(`  21 Tweaks (${tweaks.length} items): ${tweaks.map(t => getName(t as Record<string, unknown>)).join(', ')}`);
    }
    if (antiAging.length > 0) {
      lines.push(`  Anti-Aging (${antiAging.length} items): ${antiAging.map(t => getName(t as Record<string, unknown>)).join(', ')}`);
    }
    parts.push(lines.join('\n'));
  }

  // 3. Available lifestyle lessons (published, relevant to user's gaps)
  const titleCol = `title_${lang}`;
  const { data: rawLessons } = await admin
    .from('lifestyle_lessons')
    .select('title_en, title_de, title_fr, title_es, title_it, framework, category, difficulty')
    .eq('is_published', true)
    .order('sort_order')
    .limit(20);

  if (rawLessons && rawLessons.length > 0) {
    const getTitle = (l: Record<string, unknown>) => (l[titleCol] as string) || (l.title_en as string) || 'Untitled';
    const lessonSummary = rawLessons.map(l =>
      `${getTitle(l as Record<string, unknown>)} (${l.framework}, ${l.difficulty})`
    ).join('; ');
    parts.push(`AVAILABLE LIFESTYLE LESSONS: ${lessonSummary}`);
  }

  // 4. User's streak info
  const { data: streak } = await admin
    .from('daily_dozen_streaks')
    .select('current_streak, longest_streak, last_completed_date')
    .eq('user_id', userId)
    .single();

  if (streak) {
    parts.push(`DAILY DOZEN STREAK: Current ${streak.current_streak} days, Longest ${streak.longest_streak} days (last completed: ${streak.last_completed_date || 'never'})`);
  }

  if (parts.length === 0) {
    return 'No daily tracking data available yet. The user has not started Daily Dozen tracking.';
  }

  return parts.join('\n\n');
}

/**
 * Build an enhanced context string that includes journey progress, lesson data,
 * and today's focus lesson for the AI coach.
 */
export async function buildEnhancedCoachContext(userId: string, lang: string = 'en'): Promise<string> {
  const admin = createAdminClient();
  const baseParts: string[] = [];

  // Start with the original coach context
  const baseContext = await buildCoachContext(userId, lang);
  baseParts.push(baseContext);

  // 1. Journey Progress Section
  const { data: userSettings } = await admin
    .from('user_settings')
    .select('tweaks_enabled, anti_aging_enabled')
    .eq('user_id', userId)
    .single();

  const { data: streakData } = await admin
    .from('daily_dozen_streaks')
    .select('current_streak, longest_streak')
    .eq('user_id', userId)
    .single();

  if (streakData || userSettings) {
    const journeyLines: string[] = ['=== JOURNEY PROGRESS ==='];

    const currentStreak = streakData?.current_streak || 0;
    journeyLines.push(`Current phase: Daily Dozen (Day ${currentStreak}, streak: ${currentStreak} days)`);

    // 21 Tweaks unlock logic
    if (!userSettings?.tweaks_enabled) {
      const daysUntilTweaks = 7 - currentStreak;
      if (daysUntilTweaks > 0) {
        journeyLines.push(`21 Tweaks: LOCKED (unlocks at 7-day streak — user is ${daysUntilTweaks} ${daysUntilTweaks === 1 ? 'day' : 'days'} away!)`);
      } else {
        journeyLines.push(`21 Tweaks: LOCKED (eligible to unlock — recommend unlocking!)`);
      }
    } else {
      journeyLines.push(`21 Tweaks: UNLOCKED`);
    }

    // Anti-Aging unlock logic (requires 14-day streak)
    if (!userSettings?.anti_aging_enabled) {
      const daysUntilAntiAging = 14 - currentStreak;
      if (daysUntilAntiAging > 0) {
        journeyLines.push(`Anti-Aging: LOCKED (unlocks at 14-day streak — user is ${daysUntilAntiAging} ${daysUntilAntiAging === 1 ? 'day' : 'days'} away!)`);
      } else {
        journeyLines.push(`Anti-Aging: LOCKED (eligible to unlock — recommend unlocking!)`);
      }
    } else {
      journeyLines.push(`Anti-Aging: UNLOCKED`);
    }

    // Get lesson completion count
    const { count: completedCount } = await admin
      .from('user_lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    journeyLines.push(`Lessons completed: ${completedCount || 0} total`);
    baseParts.push(journeyLines.join('\n'));
  }

  // 2. Today's Lesson Section
  const today = new Date().toISOString().split('T')[0];
  const titleCol = `title_${lang}`;

  const { data: assignedLesson } = await admin
    .from('user_lesson_progress')
    .select(`
      id,
      assigned_at,
      lesson:lesson_id (
        id,
        title_en,
        title_de,
        title_fr,
        title_es,
        title_it,
        framework,
        category
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'assigned')
    .order('assigned_at', { ascending: false })
    .limit(1)
    .single();

  if (assignedLesson && assignedLesson.lesson) {
    const lessonData = assignedLesson.lesson as any;
    const lessonTitle = (lessonData[titleCol] as string) || (lessonData.title_en as string) || 'Untitled Lesson';
    const framework = lessonData.framework || 'unknown';

    const todayLines: string[] = ['=== TODAY\'S LESSON ==='];
    todayLines.push(`Assigned: "${lessonTitle}" (${framework})`);

    // Try to fetch reason from coach_notes if available
    if (assignedLesson.id) {
      const { data: noteData } = await admin
        .from('user_lesson_progress')
        .select('coach_notes')
        .eq('id', assignedLesson.id)
        .single();

      if (noteData?.coach_notes) {
        todayLines.push(`Reason: ${noteData.coach_notes}`);
      }
    }

    baseParts.push(todayLines.join('\n'));
  }

  // 3. Recent Lessons Section
  const { data: recentLessons } = await admin
    .from('user_lesson_progress')
    .select(`
      id,
      status,
      completed_at,
      lesson:lesson_id (
        id,
        title_en,
        title_de,
        title_fr,
        title_es,
        title_it,
        framework,
        category
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(5);

  if (recentLessons && recentLessons.length > 0) {
    const recentLines: string[] = ['=== RECENT LESSONS ==='];

    for (const lesson of recentLessons) {
      if (lesson.lesson) {
        const lessonData = lesson.lesson as any;
        const lessonTitle = (lessonData[titleCol] as string) || (lessonData.title_en as string) || 'Untitled';

        let daysAgo = '';
        if (lesson.completed_at) {
          const completedDate = new Date(lesson.completed_at);
          const now = new Date();
          const diffMs = now.getTime() - completedDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            daysAgo = 'today';
          } else if (diffDays === 1) {
            daysAgo = '1 day ago';
          } else {
            daysAgo = `${diffDays} days ago`;
          }
        }

        recentLines.push(`- "${lessonTitle}" — completed ${daysAgo}`);
      }
    }

    baseParts.push(recentLines.join('\n'));
  }

  return baseParts.join('\n\n');
}
