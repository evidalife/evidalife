'use client';

import { useState } from 'react';
import VoiceConversation from '@/components/voice/VoiceConversation';
import TodayLessonCard from './TodayLessonCard';
import HealthGauge from '@/components/health/HealthGauge';
import Link from 'next/link';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
type Tab = 'talk' | 'lessons' | 'progress';

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

interface LessonProgress {
  id: string;
  lesson_id: string;
  status: string;
  assigned_at?: string;
  completed_at?: string;
  lifestyle_lessons: Lesson | null;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  date_of_birth?: string | null;
}

interface Streak {
  current_streak: number;
  best_streak: number;
  last_checked_date: string | null;
}

interface Settings {
  tweaks_enabled: boolean;
  anti_aging_enabled: boolean;
}

interface TrackerProgress {
  done: number;
  total: number;
  pct: number;
}

interface HealthSnapshot {
  longevityScore: number | null;
  bioAgeScore: number | null;
  dailyDozen: TrackerProgress;
  tweaks: TrackerProgress | null;
  antiAging: TrackerProgress | null;
}

interface CoachPageProps {
  lang: Lang;
  userId: string;
  profile: Profile | null;
  streak: Streak;
  settings: Settings;
  todayLesson: LessonProgress | null;
  recentLessons: LessonProgress[];
  totalCompleted: number;
  healthSnapshot: HealthSnapshot;
}

const T: Record<Lang, Record<string, string>> = {
  en: {
    hello: "Hello",
    todaysPlan: "Today's Plan",
    yourJourney: "Your Journey",
    healthSnapshot: "Health Snapshot",
    talk: "Talk",
    lessons: "Lessons",
    progress: "Progress",
    markComplete: "Mark Complete",
    recentCompleted: "Recently Completed",
    phaseFoundation: "Daily Dozen",
    phaseTweaks: "21 Tweaks",
    phaseAntiAging: "Anti-Aging",
    unlockMore: "Complete more days to unlock",
    morningCheckIn: "Morning Check-in",
    completed: "Completed",
    dayStreak: "day streak",
    best: "Best",
    days: "days",
    noLessonToday: "No lesson assigned today",
    longevityScore: "Longevity Score",
    bioAgeScore: "Bio Age Score",
    viewDetails: "View details",
    dailyDozen: "Daily Dozen",
    tweaks: "21 Tweaks",
    antiAging: "Anti-Aging 8",
    servings: "servings",
    noLabData: "Upload lab results to see your score",
    trackToday: "Track today",
    quickLinks: "Quick Actions",
    labResults: "Lab Results",
    research: "Research",
    recipes: "Recipes",
    shop: "Shop",
    currentStreak: "Current Streak",
    bestStreak: "Best Streak",
    lessonsCompleted: "Lessons Completed",
  },
  de: {
    hello: "Hallo",
    todaysPlan: "Dein Plan",
    yourJourney: "Deine Reise",
    healthSnapshot: "Gesundheits-Überblick",
    talk: "Sprechen",
    lessons: "Lektionen",
    progress: "Fortschritt",
    markComplete: "Abgeschlossen",
    recentCompleted: "Kürzlich abgeschlossen",
    phaseFoundation: "Daily Dozen",
    phaseTweaks: "21 Tricks",
    phaseAntiAging: "Anti-Aging",
    unlockMore: "Weitere Tage zum Entsperren",
    morningCheckIn: "Morgencheck",
    completed: "Abgeschlossen",
    dayStreak: "Tage Streak",
    best: "Beste",
    days: "Tage",
    noLessonToday: "Heute keine Lektion",
    longevityScore: "Langlebigkeits-Score",
    bioAgeScore: "Bio-Alter Score",
    viewDetails: "Details ansehen",
    dailyDozen: "Daily Dozen",
    tweaks: "21 Tricks",
    antiAging: "Anti-Aging 8",
    servings: "Portionen",
    noLabData: "Laborwerte hochladen",
    trackToday: "Heute tracken",
    quickLinks: "Schnellzugriff",
    labResults: "Laborwerte",
    research: "Forschung",
    recipes: "Rezepte",
    shop: "Shop",
    currentStreak: "Aktueller Streak",
    bestStreak: "Bester Streak",
    lessonsCompleted: "Lektionen abgeschlossen",
  },
  fr: {
    hello: "Bonjour",
    todaysPlan: "Plan du jour",
    yourJourney: "Votre parcours",
    healthSnapshot: "Aperçu santé",
    talk: "Parler",
    lessons: "Leçons",
    progress: "Progrès",
    markComplete: "Terminé",
    recentCompleted: "Récemment terminé",
    phaseFoundation: "Daily Dozen",
    phaseTweaks: "21 Tweaks",
    phaseAntiAging: "Anti-Vieillissement",
    unlockMore: "Complétez plus de jours",
    morningCheckIn: "Vérification du matin",
    completed: "Terminé",
    dayStreak: "jours d'affilée",
    best: "Meilleur",
    days: "jours",
    noLessonToday: "Aucune leçon aujourd'hui",
    longevityScore: "Score de longévité",
    bioAgeScore: "Score âge bio",
    viewDetails: "Voir les détails",
    dailyDozen: "Daily Dozen",
    tweaks: "21 Tweaks",
    antiAging: "Anti-Aging 8",
    servings: "portions",
    noLabData: "Téléchargez vos résultats",
    trackToday: "Suivre aujourd'hui",
    quickLinks: "Actions rapides",
    labResults: "Résultats labo",
    research: "Recherche",
    recipes: "Recettes",
    shop: "Boutique",
    currentStreak: "Série actuelle",
    bestStreak: "Meilleure série",
    lessonsCompleted: "Leçons terminées",
  },
  es: {
    hello: "Hola",
    todaysPlan: "Plan de hoy",
    yourJourney: "Tu viaje",
    healthSnapshot: "Resumen de salud",
    talk: "Hablar",
    lessons: "Lecciones",
    progress: "Progreso",
    markComplete: "Completar",
    recentCompleted: "Completado recientemente",
    phaseFoundation: "Daily Dozen",
    phaseTweaks: "21 Trucos",
    phaseAntiAging: "Antienvejecimiento",
    unlockMore: "Completa más días",
    morningCheckIn: "Verificación matutina",
    completed: "Completo",
    dayStreak: "días seguidos",
    best: "Mejor",
    days: "días",
    noLessonToday: "Sin lección hoy",
    longevityScore: "Puntuación longevidad",
    bioAgeScore: "Puntuación edad bio",
    viewDetails: "Ver detalles",
    dailyDozen: "Daily Dozen",
    tweaks: "21 Trucos",
    antiAging: "Anti-Aging 8",
    servings: "porciones",
    noLabData: "Sube resultados de laboratorio",
    trackToday: "Seguir hoy",
    quickLinks: "Acciones rápidas",
    labResults: "Laboratorio",
    research: "Investigación",
    recipes: "Recetas",
    shop: "Tienda",
    currentStreak: "Racha actual",
    bestStreak: "Mejor racha",
    lessonsCompleted: "Lecciones completadas",
  },
  it: {
    hello: "Ciao",
    todaysPlan: "Piano di oggi",
    yourJourney: "Il tuo viaggio",
    healthSnapshot: "Panoramica salute",
    talk: "Parla",
    lessons: "Lezioni",
    progress: "Progresso",
    markComplete: "Completato",
    recentCompleted: "Completato di recente",
    phaseFoundation: "Daily Dozen",
    phaseTweaks: "21 Suggerimenti",
    phaseAntiAging: "Anti-Invecchiamento",
    unlockMore: "Completa altri giorni",
    morningCheckIn: "Controllo mattutino",
    completed: "Completato",
    dayStreak: "giorni di fila",
    best: "Miglior",
    days: "giorni",
    noLessonToday: "Nessuna lezione oggi",
    longevityScore: "Punteggio longevità",
    bioAgeScore: "Punteggio età bio",
    viewDetails: "Vedi dettagli",
    dailyDozen: "Daily Dozen",
    tweaks: "21 Suggerimenti",
    antiAging: "Anti-Aging 8",
    servings: "porzioni",
    noLabData: "Carica risultati di laboratorio",
    trackToday: "Segui oggi",
    quickLinks: "Azioni rapide",
    labResults: "Laboratorio",
    research: "Ricerca",
    recipes: "Ricette",
    shop: "Negozio",
    currentStreak: "Serie attuale",
    bestStreak: "Miglior serie",
    lessonsCompleted: "Lezioni completate",
  },
};

function getLessonTitle(lesson: Lesson | null, lang: Lang): string {
  if (!lesson) return '';
  const titleKey = ('title_' + lang) as keyof typeof lesson;
  return (lesson[titleKey] as string) || lesson.title_en || '';
}

// ── Mini Progress Bar ────────────────────────────────────────────────────────
function MiniProgressBar({ label, pct, done, total, suffix }: {
  label: string; pct: number; done: number; total: number; suffix: string;
}) {
  const allDone = total > 0 && done >= total;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[#1c2a2b]">{label}</span>
        <span className={`text-xs font-bold tabular-nums ${allDone ? 'text-emerald-600' : 'text-[#0e393d]'}`}>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[#0e393d]/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-[#ceab84]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-[#1c2a2b]/35 mt-0.5">{done}/{total} {suffix}</p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function CoachPage({
  lang,
  userId,
  profile,
  streak,
  settings,
  todayLesson,
  recentLessons,
  totalCompleted,
  healthSnapshot,
}: CoachPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('talk');
  const t = T[lang] || T.en;

  const firstName = profile?.first_name || 'there';
  const frameworkBadges: Record<string, { label: string; color: string }> = {
    foundation: { label: 'Foundation', color: 'bg-emerald-100 text-emerald-800' },
    daily_dozen: { label: 'Daily Dozen', color: 'bg-green-100 text-green-800' },
    '21_tweaks': { label: '21 Tweaks', color: 'bg-amber-100 text-amber-800' },
    anti_aging: { label: 'Anti-Aging', color: 'bg-purple-100 text-purple-800' },
  };

  const phases = [
    { name: t.phaseFoundation, key: 'foundation', icon: '🟢', locked: false },
    { name: t.phaseTweaks, key: 'tweaks', icon: '✨', locked: !settings.tweaks_enabled },
    { name: t.phaseAntiAging, key: 'anti_aging', icon: '⏱️', locked: !settings.anti_aging_enabled },
  ];

  const quickLinks = [
    { href: `/${lang}/health-engine`, label: '❤️ ' + t.viewDetails, key: 'he' },
    { href: `/${lang}/daily-dozen`, label: '🥗 ' + t.trackToday, key: 'dd' },
    { href: `/${lang}/research`, label: '🔬 ' + t.research, key: 'research' },
    { href: `/${lang}/recipes`, label: '👨‍🍳 ' + t.recipes, key: 'recipes' },
  ];

  return (
    <div className="bg-[#fafaf8]">
      {/* Hero header */}
      <section className="w-full bg-[#0e393d] pt-28 pb-14">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">Evida Coach</p>
          <h1 className="font-serif font-normal text-4xl md:text-5xl text-white leading-tight mb-3">
            {t.hello}, {firstName}
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            {streak.current_streak}-{t.dayStreak} · {t.best}: {streak.best_streak} {t.days}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <aside className="space-y-5">

            {/* Health Snapshot */}
            <div className="bg-white rounded-xl p-5 border border-[#0e393d]/8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#ceab84]">{t.healthSnapshot}</h2>
                <Link href={`/${lang}/health-engine`} className="text-[10px] text-[#0e393d]/40 hover:text-[#0e393d] transition">
                  {t.viewDetails} →
                </Link>
              </div>

              {healthSnapshot.longevityScore != null || healthSnapshot.bioAgeScore != null ? (
                <div className="flex justify-center gap-6 mb-4">
                  {healthSnapshot.longevityScore != null && (
                    <HealthGauge score={healthSnapshot.longevityScore} size="sm" label={t.longevityScore} />
                  )}
                  {healthSnapshot.bioAgeScore != null && (
                    <HealthGauge score={healthSnapshot.bioAgeScore} size="sm" label={t.bioAgeScore} />
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#1c2a2b]/35 text-center mb-4">{t.noLabData}</p>
              )}

              {/* Daily Tracker Mini-Bars */}
              <div className="space-y-3 pt-3 border-t border-[#0e393d]/8">
                <MiniProgressBar label={t.dailyDozen} pct={healthSnapshot.dailyDozen.pct} done={healthSnapshot.dailyDozen.done} total={healthSnapshot.dailyDozen.total} suffix={t.servings} />
                {healthSnapshot.tweaks && (
                  <MiniProgressBar label={t.tweaks} pct={healthSnapshot.tweaks.pct} done={healthSnapshot.tweaks.done} total={healthSnapshot.tweaks.total} suffix={t.completed} />
                )}
                {healthSnapshot.antiAging && (
                  <MiniProgressBar label={t.antiAging} pct={healthSnapshot.antiAging.pct} done={healthSnapshot.antiAging.done} total={healthSnapshot.antiAging.total} suffix={t.completed} />
                )}
              </div>
            </div>

            {/* Today's Plan */}
            <div className="bg-white rounded-xl p-5 border border-[#0e393d]/8 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#ceab84] mb-3">{t.todaysPlan}</h2>
              {todayLesson?.lifestyle_lessons ? (
                <TodayLessonCard lesson={todayLesson.lifestyle_lessons} lang={lang} onMarkComplete={() => {}} />
              ) : (
                <p className="text-xs text-[#1c2a2b]/40">{t.noLessonToday}</p>
              )}
            </div>

            {/* Journey Phases */}
            <div className="bg-white rounded-xl p-5 border border-[#0e393d]/8 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#ceab84] mb-3">{t.yourJourney}</h2>
              <div className="space-y-2.5">
                {phases.map((phase) => (
                  <div key={phase.key} className="flex items-center gap-3">
                    <div className={`text-lg ${phase.locked ? 'opacity-40' : ''}`}>
                      {phase.locked ? '🔒' : phase.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${phase.locked ? 'text-[#1c2a2b]/40' : 'text-[#0e393d]'}`}>
                        {phase.name}
                      </p>
                      {phase.locked && (
                        <p className="text-[10px] text-[#1c2a2b]/30">{t.unlockMore}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map((ql) => (
                <Link key={ql.key} href={ql.href}
                  className="flex items-center gap-2 rounded-lg border border-[#0e393d]/8 bg-white px-3 py-2.5 shadow-sm hover:border-[#ceab84]/40 hover:shadow transition text-xs font-medium text-[#0e393d]">
                  {ql.label}
                </Link>
              ))}
            </div>
          </aside>

          {/* ── Main Area with Tabs ───────────────────────────────────── */}
          <main>
            <div className="flex gap-2 mb-6 border-b border-[#0e393d]/10">
              {(['talk', 'lessons', 'progress'] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tabKey
                      ? 'border-[#0e393d] text-[#0e393d]'
                      : 'border-transparent text-[#1c2a2b]/60 hover:text-[#0e393d]'
                  }`}
                >
                  {tabKey === 'talk' && t.talk}
                  {tabKey === 'lessons' && t.lessons}
                  {tabKey === 'progress' && t.progress}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl p-8 border border-[#0e393d]/8 shadow-sm min-h-[500px]">
              {activeTab === 'talk' && (
                <VoiceConversation lang={lang} />
              )}

              {activeTab === 'lessons' && (
                <div className="space-y-6">
                  {todayLesson?.lifestyle_lessons && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#0e393d] mb-4">
                        {t.todaysPlan}
                      </h3>
                      <TodayLessonCard lesson={todayLesson.lifestyle_lessons} lang={lang} onMarkComplete={() => {}} />
                    </div>
                  )}

                  {recentLessons.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-[#0e393d] mb-4">{t.recentCompleted}</h3>
                      <div className="space-y-3">
                        {recentLessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center gap-4 p-4 rounded-lg bg-[#f5f5f0] hover:bg-[#efefea] transition-colors">
                            {lesson.lifestyle_lessons?.photo_url && (
                              <img src={lesson.lifestyle_lessons.photo_url} alt={getLessonTitle(lesson.lifestyle_lessons, lang)}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#0e393d] truncate">{getLessonTitle(lesson.lifestyle_lessons, lang)}</p>
                              {lesson.lifestyle_lessons && (
                                <div className="flex gap-2 mt-2">
                                  <span className={`text-xs px-2 py-1 rounded-full ${frameworkBadges[lesson.lifestyle_lessons.framework]?.color || 'bg-gray-100'}`}>
                                    {frameworkBadges[lesson.lifestyle_lessons.framework]?.label || 'Framework'}
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{t.completed}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-5 rounded-lg bg-[#f5f5f0] text-center">
                      <p className="text-3xl font-serif text-[#0e393d]">{streak.current_streak}</p>
                      <p className="text-xs text-[#1c2a2b]/50 mt-1">{t.currentStreak}</p>
                    </div>
                    <div className="p-5 rounded-lg bg-[#f5f5f0] text-center">
                      <p className="text-3xl font-serif text-[#0e393d]">{streak.best_streak}</p>
                      <p className="text-xs text-[#1c2a2b]/50 mt-1">{t.bestStreak}</p>
                    </div>
                    <div className="p-5 rounded-lg bg-[#f5f5f0] text-center">
                      <p className="text-3xl font-serif text-[#0e393d]">{totalCompleted}</p>
                      <p className="text-xs text-[#1c2a2b]/50 mt-1">{t.lessonsCompleted}</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg bg-[#f5f5f0]">
                    <h3 className="font-semibold text-[#0e393d] mb-4">{t.yourJourney}</h3>
                    <div className="space-y-4">
                      {phases.map((phase) => (
                        <div key={phase.key}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[#0e393d]">{phase.icon} {phase.name}</span>
                            {phase.locked && <span className="text-xs text-[#1c2a2b]/50">🔒</span>}
                          </div>
                          <div className="w-full bg-white rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all duration-300 ${phase.locked ? 'bg-[#0e393d]/20' : 'bg-emerald-500'}`}
                              style={{ width: phase.locked ? '0%' : '100%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
