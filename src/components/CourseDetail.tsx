'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

export type LessonWithProgress = {
  id: string;           // course_lesson id
  article_id: string;
  sort_order: number;
  is_free: boolean;
  is_completed: boolean;
  article_title: { de?: string; en?: string } | null;
  article_slug: string | null;
  article_reading_time_min: number | null;
};

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    progress: (done: number, total: number) => `${done} von ${total} abgeschlossen`,
    complete: 'Abgeschlossen',
    markDone: 'Als erledigt markieren',
    free: 'Kostenlos',
    read: 'Lesen',
    locked: 'Premium',
    loginPrompt: 'Melde dich an, um deinen Fortschritt zu speichern.',
    login: 'Anmelden',
    noLessons: 'Dieser Kurs hat noch keine Lektionen.',
  },
  en: {
    progress: (done: number, total: number) => `${done} of ${total} completed`,
    complete: 'Complete',
    markDone: 'Mark as done',
    free: 'Free',
    read: 'Read',
    locked: 'Premium',
    loginPrompt: 'Sign in to save your progress.',
    login: 'Sign in',
    noLessons: 'This course has no lessons yet.',
  },
  fr: {
    progress: (done: number, total: number) => `${done} sur ${total} terminé`,
    complete: 'Terminé',
    markDone: 'Marquer comme terminé',
    free: 'Gratuit',
    read: 'Lire',
    locked: 'Premium',
    loginPrompt: 'Connectez-vous pour sauvegarder votre progression.',
    login: 'Se connecter',
    noLessons: 'Ce cours n\'a pas encore de leçons.',
  },
  es: {
    progress: (done: number, total: number) => `${done} de ${total} completado`,
    complete: 'Completado',
    markDone: 'Marcar como hecho',
    free: 'Gratis',
    read: 'Leer',
    locked: 'Premium',
    loginPrompt: 'Inicia sesión para guardar tu progreso.',
    login: 'Iniciar sesión',
    noLessons: 'Este curso aún no tiene lecciones.',
  },
  it: {
    progress: (done: number, total: number) => `${done} di ${total} completato`,
    complete: 'Completato',
    markDone: 'Segna come fatto',
    free: 'Gratuito',
    read: 'Leggi',
    locked: 'Premium',
    loginPrompt: 'Accedi per salvare i tuoi progressi.',
    login: 'Accedi',
    noLessons: 'Questo corso non ha ancora lezioni.',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  lang: Lang;
  lessons: LessonWithProgress[];
  userId: string | null;
}

export default function CourseDetail({ lang, lessons: initialLessons, userId }: Props) {
  const t = T[lang];
  const supabase = createClient();

  const [lessons, setLessons] = useState<LessonWithProgress[]>(initialLessons);
  const [toggling, setToggling] = useState<string | null>(null);

  const totalCount    = lessons.length;
  const completedCount = lessons.filter((l) => l.is_completed).length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleToggle = async (lesson: LessonWithProgress) => {
    if (!userId || toggling) return;
    setToggling(lesson.id);

    const newVal = !lesson.is_completed;
    // Optimistic update
    setLessons((prev) => prev.map((l) => l.id === lesson.id ? { ...l, is_completed: newVal } : l));

    if (newVal) {
      await supabase.from('course_progress').upsert(
        { user_id: userId, lesson_id: lesson.id },
        { onConflict: 'user_id,lesson_id' }
      );
    } else {
      await supabase.from('course_progress').delete()
        .eq('user_id', userId).eq('lesson_id', lesson.id);
    }

    setToggling(null);
  };

  if (totalCount === 0) {
    return (
      <p className="text-sm text-[#1c2a2b]/40 py-8 text-center">{t.noLessons}</p>
    );
  }

  return (
    <div className="space-y-6">

      {/* Progress bar */}
      {userId && (
        <div className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1c2a2b]">{t.progress(completedCount, totalCount)}</span>
            <span className={`text-sm font-semibold ${allDone ? 'text-emerald-600' : 'text-[#0e393d]'}`}>{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#0e393d]/8 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-[#ceab84]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {allDone && (
            <p className="mt-2 text-xs text-emerald-600 font-medium">
              {lang === 'de' ? '🎉 Kurs abgeschlossen!' : lang === 'fr' ? '🎉 Cours terminé !' : lang === 'es' ? '🎉 ¡Curso completado!' : lang === 'it' ? '🎉 Corso completato!' : '🎉 Course completed!'}
            </p>
          )}
        </div>
      )}

      {/* Login nudge for guests */}
      {!userId && (
        <div className="rounded-xl border border-[#ceab84]/30 bg-[#ceab84]/8 px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-[#8a6a3e]">{t.loginPrompt}</p>
          <Link href="/login"
            className="shrink-0 text-xs font-medium text-[#0e393d] bg-white border border-[#0e393d]/20 px-3 py-1.5 rounded-lg hover:bg-[#0e393d]/5 transition">
            {t.login}
          </Link>
        </div>
      )}

      {/* Lesson list */}
      <ol className="space-y-2">
        {lessons.map((lesson, idx) => {
          const title = (lesson.article_title as Record<string, string> | null)?.[lang] || lesson.article_title?.en || lesson.article_title?.de || '';
          const href  = lesson.article_slug ? `/articles/${lesson.article_slug}` : null;
          const isToggling = toggling === lesson.id;

          return (
            <li key={lesson.id}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                lesson.is_completed
                  ? 'border-emerald-200/60 bg-emerald-50/40'
                  : 'border-[#0e393d]/10 bg-white hover:border-[#0e393d]/20'
              }`}
            >
              {/* Completion toggle */}
              <button
                type="button"
                onClick={() => handleToggle(lesson)}
                disabled={!userId || isToggling}
                title={lesson.is_completed ? t.complete : t.markDone}
                className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  lesson.is_completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-[#0e393d]/25 hover:border-[#0e393d]/60'
                } ${!userId ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${isToggling ? 'opacity-50' : ''}`}
              >
                {lesson.is_completed && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6.5l3 3 5-5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Lesson number */}
              <span className="shrink-0 w-5 text-center text-xs text-[#1c2a2b]/30 font-mono">{idx + 1}</span>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium leading-snug ${lesson.is_completed ? 'text-[#1c2a2b]/50 line-through decoration-[#1c2a2b]/25' : 'text-[#1c2a2b]'}`}>
                  {title}
                </span>
                {lesson.article_reading_time_min != null && (
                  <span className="ml-2 text-xs text-[#1c2a2b]/35">
                    {lesson.article_reading_time_min} min
                  </span>
                )}
              </div>

              {/* Badges + link */}
              <div className="shrink-0 flex items-center gap-2">
                {lesson.is_free && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ring-1 ring-emerald-200">
                    {t.free}
                  </span>
                )}
                {href ? (
                  <Link href={href}
                    className="text-xs font-medium text-[#0e393d] hover:text-[#0e393d]/70 transition"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t.read} →
                  </Link>
                ) : (
                  <span className="text-xs text-[#1c2a2b]/30">{t.locked}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
