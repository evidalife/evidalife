'use client';

import { useMemo, useState } from 'react';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
type Framework = 'foundation' | 'daily_dozen' | '21_tweaks' | 'anti_aging';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type FilterType = 'all' | Framework;

interface Lesson {
  id: string;
  slug: string;
  title_en: string;
  title_de: string | null;
  title_fr: string | null;
  title_es: string | null;
  title_it: string | null;
  caption_en: string;
  caption_de: string | null;
  caption_fr: string | null;
  caption_es: string | null;
  caption_it: string | null;
  framework: Framework;
  category: string;
  difficulty: Difficulty;
  photo_url: string | null;
  estimated_minutes: number | null;
  sort_order: number | null;
}

interface ProgressEntry {
  status: string;
  completed_at?: string;
}

interface LessonLibraryProps {
  lang: Lang;
  lessons: Lesson[];
  progressMap: Record<string, ProgressEntry>;
  settings: {
    tweaks_enabled: boolean;
    anti_aging_enabled: boolean;
  };
}

const T: Record<Lang, Record<string, string>> = {
  en: {
    all: 'All',
    foundation: 'Foundation',
    daily_dozen: 'Daily Dozen',
    '21_tweaks': '21 Tweaks',
    anti_aging: 'Anti-Aging',
    unlockMore: 'Complete 12 days of Daily Dozen to unlock',
    beginnerLabel: 'Beginner',
    intermediateLabel: 'Intermediate',
    advancedLabel: 'Advanced',
    minutesLabel: 'min',
    completedLabel: 'Completed',
  },
  de: {
    all: 'Alle',
    foundation: 'Grundlagen',
    daily_dozen: 'Daily Dozen',
    '21_tweaks': '21 Tricks',
    anti_aging: 'Anti-Aging',
    unlockMore: 'Absolviere 12 Tage Daily Dozen zum Freischalten',
    beginnerLabel: 'Anfänger',
    intermediateLabel: 'Mittelstufe',
    advancedLabel: 'Fortgeschrittene',
    minutesLabel: 'Min',
    completedLabel: 'Abgeschlossen',
  },
  fr: {
    all: 'Tous',
    foundation: 'Fondation',
    daily_dozen: 'Daily Dozen',
    '21_tweaks': '21 Tweaks',
    anti_aging: 'Anti-Vieillissement',
    unlockMore: 'Complétez 12 jours de Daily Dozen pour débloquer',
    beginnerLabel: 'Débutant',
    intermediateLabel: 'Intermédiaire',
    advancedLabel: 'Avancé',
    minutesLabel: 'min',
    completedLabel: 'Terminé',
  },
  es: {
    all: 'Todos',
    foundation: 'Fundación',
    daily_dozen: 'Daily Dozen',
    '21_tweaks': '21 Trucos',
    anti_aging: 'Antienvejecimiento',
    unlockMore: 'Completa 12 días de Daily Dozen para desbloquear',
    beginnerLabel: 'Principiante',
    intermediateLabel: 'Intermedio',
    advancedLabel: 'Avanzado',
    minutesLabel: 'min',
    completedLabel: 'Completado',
  },
  it: {
    all: 'Tutti',
    foundation: 'Fondazione',
    daily_dozen: 'Daily Dozen',
    '21_tweaks': '21 Suggerimenti',
    anti_aging: 'Anti-Invecchiamento',
    unlockMore: 'Completa 12 giorni di Daily Dozen per sbloccare',
    beginnerLabel: 'Principiante',
    intermediateLabel: 'Intermedio',
    advancedLabel: 'Avanzato',
    minutesLabel: 'min',
    completedLabel: 'Completato',
  },
};

function getLessonTitle(lesson: Lesson, lang: Lang): string {
  const titleKey = ('title_' + lang) as keyof typeof lesson;
  return (lesson[titleKey] as string) || lesson.title_en || '';
}

function getLessonCaption(lesson: Lesson, lang: Lang): string {
  const captionKey = ('caption_' + lang) as keyof typeof lesson;
  return (lesson[captionKey] as string) || lesson.caption_en || '';
}

const frameworkConfig: Record<Framework, { label: string; color: string; icon: string }> = {
  foundation: { label: 'Foundation', color: 'bg-emerald-100 text-emerald-800', icon: '🟢' },
  daily_dozen: { label: 'Daily Dozen', color: 'bg-green-100 text-green-800', icon: '🔋' },
  '21_tweaks': { label: '21 Tweaks', color: 'bg-amber-100 text-amber-800', icon: '✨' },
  anti_aging: { label: 'Anti-Aging', color: 'bg-purple-100 text-purple-800', icon: '⏱️' },
};

const difficultyConfig: Record<Difficulty, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: 'Intermediate', color: 'bg-orange-100 text-orange-800' },
  advanced: { label: 'Advanced', color: 'bg-red-100 text-red-800' },
};

export default function LessonLibrary({
  lang,
  lessons,
  progressMap,
  settings,
}: LessonLibraryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const t = T[lang] || T.en;

  const frameworks: Array<{ key: FilterType; label: string; locked: boolean }> = [
    { key: 'all', label: t.all, locked: false },
    { key: 'foundation', label: t.foundation, locked: false },
    { key: 'daily_dozen', label: t.daily_dozen, locked: false },
    { key: '21_tweaks', label: t['21_tweaks'], locked: !settings.tweaks_enabled },
    { key: 'anti_aging', label: t.anti_aging, locked: !settings.anti_aging_enabled },
  ];

  const filteredLessons = useMemo(() => {
    if (activeFilter === 'all') {
      return lessons;
    }
    return lessons.filter((lesson) => lesson.framework === activeFilter);
  }, [lessons, activeFilter]);

  const groupedByFramework = useMemo(() => {
    const groups: Record<Framework, Lesson[]> = {
      foundation: [],
      daily_dozen: [],
      '21_tweaks': [],
      anti_aging: [],
    };

    lessons.forEach((lesson) => {
      groups[lesson.framework].push(lesson);
    });

    return groups;
  }, [lessons]);

  const getLessonCard = (lesson: Lesson) => {
    const progress = progressMap[lesson.id];
    const isCompleted = progress?.status === 'completed';
    const isAssigned = progress?.status === 'assigned';
    const isLocked =
      (lesson.framework === '21_tweaks' && !settings.tweaks_enabled) ||
      (lesson.framework === 'anti_aging' && !settings.anti_aging_enabled);

    const frameworkInfo = frameworkConfig[lesson.framework];
    const difficultyInfo = difficultyConfig[lesson.difficulty];

    return (
      <div
        key={lesson.id}
        className={`rounded-xl overflow-hidden bg-white ring-1 ring-[#0e393d]/8 hover:ring-[#0e393d]/20 hover:shadow-lg transition-all ${
          isLocked ? 'opacity-60' : ''
        }`}
      >
        {/* Photo / Placeholder */}
        <div className="relative h-48 bg-gradient-to-br from-[#0e393d]/10 to-[#ceab84]/10 overflow-hidden">
          {lesson.photo_url ? (
            <img
              src={lesson.photo_url}
              alt={getLessonTitle(lesson, lang)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl opacity-30">📚</span>
            </div>
          )}

          {/* Overlays */}
          {isCompleted && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="text-5xl">✓</div>
            </div>
          )}
          {isLocked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-4xl">🔒</div>
            </div>
          )}
          {isAssigned && (
            <div className="absolute top-2 right-2">
              <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-[#ceab84] text-white">
                Today
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Framework & Difficulty Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${frameworkInfo.color}`}
            >
              {frameworkInfo.icon} {frameworkInfo.label}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${difficultyInfo.color}`}
            >
              {difficultyInfo.label}
            </span>
            {isCompleted && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
                ✓ {t.completedLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-[#0e393d] mb-2 leading-tight line-clamp-2">
            {getLessonTitle(lesson, lang)}
          </h3>

          {/* Caption */}
          <p className="text-sm text-[#1c2a2b]/60 line-clamp-3 mb-3">
            {getLessonCaption(lesson, lang)}
          </p>

          {/* Estimated Time */}
          {lesson.estimated_minutes && (
            <p className="text-xs text-[#1c2a2b]/50">
              ⏱️ {lesson.estimated_minutes} {t.minutesLabel}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Render based on filter
  if (activeFilter !== 'all') {
    const isFilterLocked =
      (activeFilter === '21_tweaks' && !settings.tweaks_enabled) ||
      (activeFilter === 'anti_aging' && !settings.anti_aging_enabled);

    if (isFilterLocked) {
      return (
        <div>
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {frameworks.map((fw) => (
              <button
                key={fw.key}
                onClick={() => !fw.locked && setActiveFilter(fw.key as FilterType)}
                disabled={fw.locked}
                className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                  activeFilter === fw.key
                    ? 'bg-[#0e393d] text-white'
                    : fw.locked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white ring-1 ring-[#0e393d]/20 text-[#0e393d] hover:bg-[#f5f5f0]'
                }`}
              >
                {fw.label}
                {fw.locked && ' 🔒'}
              </button>
            ))}
          </div>

          {/* Locked Message */}
          <div className="rounded-xl p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-2xl font-serif text-[#0e393d] mb-2">
              {frameworks.find((fw) => fw.key === activeFilter)?.label}
            </h3>
            <p className="text-[#1c2a2b]/60 mb-4 max-w-sm mx-auto">
              {t.unlockMore}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {frameworks.map((fw) => (
            <button
              key={fw.key}
              onClick={() => !fw.locked && setActiveFilter(fw.key as FilterType)}
              disabled={fw.locked}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                activeFilter === fw.key
                  ? 'bg-[#0e393d] text-white'
                  : fw.locked
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white ring-1 ring-[#0e393d]/20 text-[#0e393d] hover:bg-[#f5f5f0]'
              }`}
            >
              {fw.label}
              {fw.locked && ' 🔒'}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLessons.map(getLessonCard)}
        </div>
      </div>
    );
  }

  // Show all frameworks grouped
  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-12">
        {frameworks.map((fw) => (
          <button
            key={fw.key}
            onClick={() => !fw.locked && setActiveFilter(fw.key as FilterType)}
            disabled={fw.locked}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-colors ${
              activeFilter === fw.key
                ? 'bg-[#0e393d] text-white'
                : fw.locked
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white ring-1 ring-[#0e393d]/20 text-[#0e393d] hover:bg-[#f5f5f0]'
            }`}
          >
            {fw.label}
            {fw.locked && ' 🔒'}
          </button>
        ))}
      </div>

      {/* Framework Sections */}
      <div className="space-y-16">
        {(Object.entries(groupedByFramework) as Array<
          [Framework, Lesson[]]
        >).map(([framework, lessonsInFramework]) => {
          if (lessonsInFramework.length === 0) return null;

          const isLocked =
            (framework === '21_tweaks' && !settings.tweaks_enabled) ||
            (framework === 'anti_aging' && !settings.anti_aging_enabled);

          const frameworkInfo = frameworkConfig[framework];

          return (
            <div key={framework}>
              <div className="flex items-center gap-3 mb-6">
                <span className={isLocked ? 'opacity-40' : ''}>
                  {frameworkInfo.icon}
                </span>
                <h2
                  className={`text-2xl font-serif ${
                    isLocked ? 'text-[#1c2a2b]/40' : 'text-[#0e393d]'
                  }`}
                >
                  {frameworkInfo.label}
                </h2>
                {isLocked && (
                  <span className="text-sm text-[#1c2a2b]/40">🔒 Locked</span>
                )}
              </div>

              {isLocked ? (
                <div className="rounded-xl p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
                  <p className="text-[#1c2a2b]/60">{t.unlockMore}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lessonsInFramework.map(getLessonCard)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
