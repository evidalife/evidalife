'use client';

import { useState } from 'react';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

interface Lesson {
  id: string;
  slug: string;
  title_en: string;
  title_de: string | null;
  title_fr: string | null;
  title_es: string | null;
  title_it: string | null;
  framework: string;
  photo_url: string | null;
  caption_en: string;
  caption_de: string | null;
  caption_fr: string | null;
  caption_es: string | null;
  caption_it: string | null;
}

interface TodayLessonCardProps {
  lesson: Lesson;
  lang: Lang;
  onMarkComplete: () => void;
}

function getLessonTitle(lesson: Lesson, lang: Lang): string {
  const titleKey = ('title_' + lang) as keyof typeof lesson;
  return (lesson[titleKey] as string) || lesson.title_en || '';
}

function getLessonCaption(lesson: Lesson, lang: Lang): string {
  const captionKey = ('caption_' + lang) as keyof typeof lesson;
  return (lesson[captionKey] as string) || lesson.caption_en || '';
}

const frameworkBadges: Record<string, { label: string; color: string; icon: string }> = {
  foundation: { label: 'Foundation', color: 'bg-emerald-100 text-emerald-800', icon: '🟢' },
  daily_dozen: { label: 'Daily Dozen', color: 'bg-green-100 text-green-800', icon: '🔋' },
  '21_tweaks': { label: '21 Tweaks', color: 'bg-amber-100 text-amber-800', icon: '✨' },
  anti_aging: { label: 'Anti-Aging', color: 'bg-purple-100 text-purple-800', icon: '⏱️' },
};

const T: Record<Lang, Record<string, string>> = {
  en: { markComplete: 'Mark Complete', today: 'Today' },
  de: { markComplete: 'Als abgeschlossen markieren', today: 'Heute' },
  fr: { markComplete: 'Marquer comme terminé', today: 'Aujourd\'hui' },
  es: { markComplete: 'Marcar como completo', today: 'Hoy' },
  it: { markComplete: 'Segna come completato', today: 'Oggi' },
};

export default function TodayLessonCard({
  lesson,
  lang,
  onMarkComplete,
}: TodayLessonCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const t = T[lang] || T.en;
  const badge = frameworkBadges[lesson.framework] || frameworkBadges.foundation;

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      await onMarkComplete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden bg-white ring-1 ring-[#0e393d]/10 hover:ring-[#0e393d]/20 transition-all">
      {lesson.photo_url && (
        <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#0e393d]/10 to-[#ceab84]/10">
          <img
            src={lesson.photo_url}
            alt={getLessonTitle(lesson, lang)}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-[#ceab84] text-white">
              {t.today}
            </span>
          </div>
        </div>
      )}
      <div className="p-4">
        <p className={`text-xs font-semibold px-2 py-1 rounded-full inline-block mb-2 ${badge.color}`}>
          {badge.icon} {badge.label}
        </p>
        <h3 className="font-semibold text-[#0e393d] mb-1 leading-tight">
          {getLessonTitle(lesson, lang)}
        </h3>
        <p className="text-xs text-[#1c2a2b]/60 line-clamp-2 mb-4">
          {getLessonCaption(lesson, lang)}
        </p>
        <button
          onClick={handleMarkComplete}
          disabled={isLoading}
          className="w-full py-2 rounded-lg bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '...' : t.markComplete}
        </button>
      </div>
    </div>
  );
}
