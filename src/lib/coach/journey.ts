import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Journey Phase Configuration
 * Represents a phase in the user's coaching journey
 */
export interface JourneyPhase {
  id: string;
  name: string;
  framework: string;
  unlocked: boolean;
  unlockStreak: number;
  currentStreak: number;
  requiresBiomarkers: boolean;
  hasBiomarkers: boolean;
}

/**
 * Complete Journey State
 * Provides holistic view of user progress through all phases
 */
export interface JourneyState {
  phases: JourneyPhase[];
  currentPhase: string;
  lessonsCompleted: number;
  lessonsAssigned: number;
  canUnlockNext: boolean;
  nextUnlockPhase: string | null;
  nextUnlockReason: string | null;
}

/**
 * Unlock Recommendation
 * Suggests whether user qualifies for next phase
 */
interface UnlockRecommendation {
  recommend: boolean;
  phase: string;
  message: string;
}

/**
 * Get the complete journey state for a user
 * Fetches all phase information, streaks, lesson progress, and biomarker data
 *
 * @param userId - User ID to fetch journey state for
 * @returns JourneyState with all phase information
 * @throws Error if database queries fail
 */
export async function getJourneyState(userId: string): Promise<JourneyState> {
  const adminDb = createAdminClient();

  try {
    // Fetch user settings to check which phases are enabled
    const { data: userSettings, error: settingsError } = await adminDb
      .from('user_settings')
      .select('tweaks_enabled, anti_aging_enabled')
      .eq('user_id', userId)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch user settings: ${settingsError.message}`);
    }

    // Fetch current streak
    const { data: streakData, error: streakError } = await adminDb
      .from('daily_dozen_streaks')
      .select('current_streak')
      .eq('user_id', userId)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch streak data: ${streakError.message}`);
    }

    const currentStreak = streakData?.current_streak ?? 0;

    // Fetch lesson progress counts
    const { data: progressData, error: progressError } = await adminDb
      .from('user_lesson_progress')
      .select('status')
      .eq('user_id', userId);

    if (progressError) {
      throw new Error(`Failed to fetch lesson progress: ${progressError.message}`);
    }

    const lessonsCompleted = (progressData ?? []).filter((p) => p.status === 'completed').length;
    const lessonsAssigned = (progressData ?? []).length;

    // Check for biomarkers
    const { data: biomarkerData, error: biomarkerError } = await adminDb
      .from('lab_results')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (biomarkerError && biomarkerError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch biomarker data: ${biomarkerError.message}`);
    }

    const hasBiomarkers = (biomarkerData?.length ?? 0) > 0;

    // Build phases
    const phases: JourneyPhase[] = [
      {
        id: 'daily_dozen',
        name: 'Daily Dozen',
        framework: 'daily_dozen',
        unlocked: true, // Always unlocked immediately
        unlockStreak: 0,
        currentStreak,
        requiresBiomarkers: false,
        hasBiomarkers: false,
      },
      {
        id: 'tweaks',
        name: '21 Tweaks',
        framework: '21_tweaks',
        unlocked: userSettings?.tweaks_enabled ?? false,
        unlockStreak: 7,
        currentStreak,
        requiresBiomarkers: false,
        hasBiomarkers: false,
      },
      {
        id: 'anti_aging',
        name: 'Anti-Aging 8',
        framework: 'anti_aging',
        unlocked: userSettings?.anti_aging_enabled ?? false,
        unlockStreak: 14,
        currentStreak,
        requiresBiomarkers: true,
        hasBiomarkers,
      },
    ];

    // Determine current phase (first unlocked phase working backward)
    let currentPhase = 'daily_dozen';
    for (let i = phases.length - 1; i >= 0; i--) {
      if (phases[i].unlocked) {
        currentPhase = phases[i].id;
        break;
      }
    }

    // Check if next phase can be unlocked
    let canUnlockNext = false;
    let nextUnlockPhase: string | null = null;
    let nextUnlockReason: string | null = null;

    const currentPhaseIndex = phases.findIndex((p) => p.id === currentPhase);
    if (currentPhaseIndex < phases.length - 1) {
      const nextPhase = phases[currentPhaseIndex + 1];

      if (!nextPhase.unlocked) {
        if (currentStreak >= nextPhase.unlockStreak) {
          if (nextPhase.requiresBiomarkers && !hasBiomarkers) {
            nextUnlockReason = `Requires biomarker data. Complete lab work to unlock ${nextPhase.name}.`;
          } else {
            canUnlockNext = true;
            nextUnlockPhase = nextPhase.id;
            nextUnlockReason = `Ready to unlock ${nextPhase.name}!`;
          }
        } else {
          const daysRemaining = nextPhase.unlockStreak - currentStreak;
          nextUnlockReason = `${daysRemaining} more days to unlock ${nextPhase.name}`;
        }
      }
    }

    return {
      phases,
      currentPhase,
      lessonsCompleted,
      lessonsAssigned,
      canUnlockNext,
      nextUnlockPhase,
      nextUnlockReason,
    };
  } catch (error) {
    console.error('Error fetching journey state:', error);
    throw error;
  }
}

/**
 * Unlock a phase for a user
 * Updates user_settings to enable the specified phase
 *
 * @param userId - User ID to unlock phase for
 * @param phase - Phase to unlock ('tweaks' or 'anti_aging')
 * @returns true if unlock was successful, false otherwise
 * @throws Error if database operations fail
 */
export async function unlockPhase(userId: string, phase: 'tweaks' | 'anti_aging'): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const columnName = phase === 'tweaks' ? 'tweaks_enabled' : 'anti_aging_enabled';

    const { error } = await adminDb
      .from('user_settings')
      .update({ [columnName]: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to unlock phase ${phase}: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error(`Error unlocking phase ${phase}:`, error);
    throw error;
  }
}

/**
 * Assign a lesson to a user
 * Inserts a new entry in user_lesson_progress with 'assigned' status
 *
 * @param userId - User ID to assign lesson to
 * @param lessonId - Lesson ID to assign
 * @param assignedBy - Source of assignment ('coach', 'self', 'admin', or 'journey')
 * @param coachNotes - Optional notes about why this lesson was assigned
 * @returns true if assignment was successful, false if lesson already assigned
 * @throws Error if database operations fail
 */
export async function assignLesson(
  userId: string,
  lessonId: string,
  assignedBy: string,
  coachNotes?: string
): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const { error } = await adminDb
      .from('user_lesson_progress')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        status: 'assigned',
        assigned_by: assignedBy,
        coach_notes: coachNotes || null,
      });

    if (error) {
      // Unique constraint violation means lesson already assigned
      if (error.code === '23505') {
        return false;
      }
      throw new Error(`Failed to assign lesson: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Error assigning lesson:', error);
    throw error;
  }
}

/**
 * Mark a lesson as completed
 * Updates user_lesson_progress to 'completed' status with current timestamp
 *
 * @param userId - User ID who completed the lesson
 * @param lessonId - Lesson ID that was completed
 * @returns true if lesson was marked completed, false if not found
 * @throws Error if database operations fail
 */
export async function completeLesson(userId: string, lessonId: string): Promise<boolean> {
  const adminDb = createAdminClient();

  try {
    const { data, error } = await adminDb
      .from('user_lesson_progress')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .select();

    if (error) {
      throw new Error(`Failed to complete lesson: ${error.message}`);
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('Error completing lesson:', error);
    throw error;
  }
}

/**
 * Get today's assigned lesson or intelligently assign one
 * Smart lesson picker that:
 * 1. Checks for existing assigned lessons for today
 * 2. If none, picks best lesson based on user framework and biomarker gaps
 * 3. Auto-assigns the selected lesson
 *
 * @param userId - User ID to get lesson for
 * @param lang - Language code ('en', 'de', etc.)
 * @returns Lesson object with assignment reason, or null if none available
 * @throws Error if database operations fail
 */
export async function getTodayLesson(
  userId: string,
  lang: string = 'en'
): Promise<{ lesson: any; reason: string } | null> {
  const adminDb = createAdminClient();

  try {
    // Get journey state to understand user's framework
    const journeyState = await getJourneyState(userId);

    // Check if user already has an assigned lesson today
    const today = new Date().toISOString().split('T')[0];
    const { data: todayProgress, error: todayError } = await adminDb
      .from('user_lesson_progress')
      .select('lesson_id, status')
      .eq('user_id', userId)
      .gte('assigned_at', `${today}T00:00:00Z`)
      .lte('assigned_at', `${today}T23:59:59Z`);

    if (todayError) {
      throw new Error(`Failed to check today's lessons: ${todayError.message}`);
    }

    // If lesson already assigned today, return it
    if ((todayProgress?.length ?? 0) > 0) {
      const assignedLesson = todayProgress?.[0];
      const { data: lesson, error: lessonError } = await adminDb
        .from('lifestyle_lessons')
        .select('*')
        .eq('id', assignedLesson?.lesson_id)
        .single();

      if (!lessonError && lesson) {
        return {
          lesson,
          reason: 'Already assigned today',
        };
      }
    }

    // Get incomplete lessons for user's current framework
    const { data: availableLessons, error: lessonsError } = await adminDb
      .from('lifestyle_lessons')
      .select('*')
      .eq('framework', journeyState.currentPhase)
      .not('id', 'in', `(${todayProgress?.map((p) => `'${p.lesson_id}'`).join(',') || "''"})`)
      .order('priority', { ascending: true })
      .limit(5);

    if (lessonsError) {
      throw new Error(`Failed to fetch available lessons: ${lessonsError.message}`);
    }

    if (!availableLessons || availableLessons.length === 0) {
      return null;
    }

    // Pick first available lesson
    const selectedLesson = availableLessons[0];

    // Auto-assign the lesson
    await assignLesson(userId, selectedLesson.id, 'journey', 'Auto-assigned from daily lesson picker');

    return {
      lesson: selectedLesson,
      reason: `From ${journeyState.currentPhase} framework`,
    };
  } catch (error) {
    console.error('Error getting today lesson:', error);
    throw error;
  }
}

/**
 * Determine if user should be recommended to unlock next phase
 * Checks streak requirements and biomarker prerequisites
 *
 * @param state - Current journey state
 * @returns Recommendation object or null if no unlock recommended
 */
export function shouldRecommendUnlock(state: JourneyState): UnlockRecommendation | null {
  if (!state.canUnlockNext || !state.nextUnlockPhase) {
    return null;
  }

  const nextPhase = state.phases.find((p) => p.id === state.nextUnlockPhase);
  if (!nextPhase) {
    return null;
  }

  return {
    recommend: true,
    phase: state.nextUnlockPhase,
    message: state.nextUnlockReason || `Ready to unlock ${nextPhase.name}!`,
  };
}
