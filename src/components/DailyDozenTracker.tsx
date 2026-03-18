'use client';

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

export type DDCategory = {
  id: string;
  slug: string;
  name: { de?: string; en?: string };
  target_servings: number;
  icon: string | null;
  sort_order: number;
};

export type DDEntry = {
  category_id: string;
  servings: number;
};

export type DDStreak = {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
};

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    today:    'Heute',
    streak:   (n: number) => `${n} Tag${n !== 1 ? 'e' : ''} Streak`,
    longest:  (n: number) => `Längste Serie: ${n} Tag${n !== 1 ? 'e' : ''}`,
    overall:  (done: number) => `${done} von 12 Kategorien erfüllt`,
    servings: (cur: number, tgt: number) => `${cur} / ${tgt}`,
    complete: 'Vollständig!',
    dayDone:  '🎉 Alle 12 Kategorien heute abgehakt!',
    noStreak: 'Noch kein Streak – leg los!',
  },
  en: {
    today:    'Today',
    streak:   (n: number) => `${n}-day streak`,
    longest:  (n: number) => `Longest: ${n} day${n !== 1 ? 's' : ''}`,
    overall:  (done: number) => `${done} of 12 categories complete`,
    servings: (cur: number, tgt: number) => `${cur} / ${tgt}`,
    complete: 'Done!',
    dayDone:  '🎉 All 12 categories checked off today!',
    noStreak: 'No streak yet — start today!',
  },
};

// ─── SVG progress ring ────────────────────────────────────────────────────────

const R = 28;
const CX = 36;
const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 175.9

function ProgressRing({
  progress,   // 0–1
  done,
  icon,
}: {
  progress: number;
  done: boolean;
  icon: string | null;
}) {
  const offset = CIRCUMFERENCE * (1 - Math.min(progress, 1));
  const color  = done ? '#10b981' : progress > 0 ? '#ceab84' : '#0e393d1a';

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      {/* Track */}
      <circle
        cx={CX} cy={CX} r={R}
        fill="none"
        stroke="#0e393d12"
        strokeWidth="5"
      />
      {/* Progress arc */}
      <circle
        cx={CX} cy={CX} r={R}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${CX} ${CX})`}
        style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.3s ease' }}
      />
      {/* Icon or checkmark */}
      {done ? (
        <text x={CX} y={CX + 1} textAnchor="middle" dominantBaseline="middle" fontSize="18">✓</text>
      ) : icon ? (
        <text x={CX} y={CX + 1} textAnchor="middle" dominantBaseline="middle" fontSize="20">{icon}</text>
      ) : null}
    </svg>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  servings,
  lang,
  onIncrement,
  onDecrement,
  pending,
}: {
  category:    DDCategory;
  servings:    number;
  lang:        Lang;
  onIncrement: () => void;
  onDecrement: () => void;
  pending:     boolean;
}) {
  const t       = T[lang];
  const target  = category.target_servings;
  const done    = servings >= target;
  const progress = target > 0 ? servings / target : 0;
  const name    = category.name[lang] || category.name.de || category.slug;

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-4 transition-all duration-200 ${
        done
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-[#0e393d]/10 bg-white hover:border-[#0e393d]/20'
      }`}
    >
      {/* Progress ring + icon */}
      <ProgressRing progress={progress} done={done} icon={category.icon} />

      {/* Name */}
      <p className={`mt-2 text-center text-xs font-semibold leading-tight ${done ? 'text-emerald-700' : 'text-[#0e393d]'}`}>
        {name}
      </p>

      {/* Serving count */}
      <p className={`mt-0.5 text-[11px] ${done ? 'text-emerald-600' : 'text-[#1c2a2b]/45'}`}>
        {done ? t.complete : t.servings(servings, target)}
      </p>

      {/* +/- controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          disabled={servings === 0 || pending}
          aria-label="Remove serving"
          className="w-7 h-7 rounded-full border border-[#0e393d]/15 bg-white flex items-center justify-center text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d] transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        <span className={`w-5 text-center text-sm font-bold tabular-nums ${done ? 'text-emerald-600' : 'text-[#0e393d]'}`}>
          {servings}
        </span>

        <button
          type="button"
          onClick={onIncrement}
          disabled={pending}
          aria-label="Add serving"
          className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
            done
              ? 'border border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'border border-[#0e393d]/20 bg-[#0e393d] text-white hover:bg-[#0e393d]/85'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Pending spinner */}
      {pending && (
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-white/50">
          <svg className="w-4 h-4 text-[#0e393d]/40 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  userId:     string;
  categories: DDCategory[];
  entries:    DDEntry[];       // today's entries from server
  streak:     DDStreak | null;
  lang:       Lang;
  today:      string;         // ISO date string YYYY-MM-DD
}

export default function DailyDozenTracker({
  userId, categories, entries, streak: initialStreak, lang, today,
}: Props) {
  const t       = T[lang];
  const supabase = createClient();

  // servings map: category_id → count
  const [servingsMap, setServingsMap] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const cat of categories) m[cat.id] = 0;
    for (const e of entries) m[e.category_id] = e.servings;
    return m;
  });

  const [streak,   setStreak]   = useState<DDStreak | null>(initialStreak);
  const [pending,  setPending]  = useState<Record<string, boolean>>({});

  // Debounce writes per category
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Overall stats ─────────────────────────────────────────────────────────

  const completedCount = categories.filter(
    (c) => (servingsMap[c.id] ?? 0) >= c.target_servings
  ).length;
  const totalCategories = categories.length;
  const allDone = completedCount === totalCategories && totalCategories > 0;
  const overallPct = totalCategories > 0 ? Math.round((completedCount / totalCategories) * 100) : 0;

  // ── Streak update ─────────────────────────────────────────────────────────

  const updateStreak = useCallback(async (newServingsMap: Record<string, number>) => {
    const nowComplete = categories.every(
      (c) => (newServingsMap[c.id] ?? 0) >= c.target_servings
    );
    if (!nowComplete) return;

    // Build new streak values
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    let newCurrent = 1;
    if (streak?.last_completed_date === yStr) {
      newCurrent = (streak.current_streak ?? 0) + 1;
    } else if (streak?.last_completed_date === today) {
      return; // already recorded today
    }

    const newLongest = Math.max(newCurrent, streak?.longest_streak ?? 0);
    const updated: DDStreak = {
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_completed_date: today,
    };
    setStreak(updated);

    await supabase.from('daily_dozen_streaks').upsert(
      { user_id: userId, ...updated, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }, [categories, streak, supabase, today, userId]);

  // ── Upsert serving to DB (debounced) ─────────────────────────────────────

  const upsertEntry = useCallback(async (categoryId: string, newServings: number) => {
    setPending((p) => ({ ...p, [categoryId]: true }));

    await supabase.from('daily_dozen_entries').upsert(
      { user_id: userId, category_id: categoryId, date: today, servings: newServings, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,category_id,date' }
    );

    setPending((p) => ({ ...p, [categoryId]: false }));
  }, [supabase, today, userId]);

  // ── Change handler ────────────────────────────────────────────────────────

  const changeServings = useCallback((categoryId: string, delta: number) => {
    setServingsMap((prev) => {
      const next = Math.max(0, (prev[categoryId] ?? 0) + delta);
      const newMap = { ...prev, [categoryId]: next };

      // Debounce DB write
      clearTimeout(debounceRef.current[categoryId]);
      debounceRef.current[categoryId] = setTimeout(async () => {
        await upsertEntry(categoryId, next);
        updateStreak(newMap);
      }, 400);

      return newMap;
    });
  }, [upsertEntry, updateStreak]);

  // ── Render ────────────────────────────────────────────────────────────────

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Streak + date header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-0.5">{t.today}</p>
          <p className="text-sm font-medium text-[#1c2a2b]">
            {new Date(today + 'T12:00:00').toLocaleDateString(
              lang === 'de' ? 'de-DE' : 'en-US',
              { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            )}
          </p>
        </div>

        <div className="text-right">
          {currentStreak > 0 ? (
            <>
              <p className="text-lg font-bold text-[#0e393d]">🔥 {t.streak(currentStreak)}</p>
              {longestStreak > currentStreak && (
                <p className="text-[11px] text-[#1c2a2b]/40">{t.longest(longestStreak)}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#1c2a2b]/40">{t.noStreak}</p>
          )}
        </div>
      </div>

      {/* ── Overall progress bar ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#1c2a2b]">{t.overall(completedCount)}</span>
          <span className={`text-sm font-bold ${allDone ? 'text-emerald-600' : 'text-[#0e393d]'}`}>
            {overallPct}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-[#0e393d]/8 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-[#ceab84]'}`}
            style={{ width: `${overallPct}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-2 text-xs font-medium text-emerald-600">{t.dayDone}</p>
        )}
      </div>

      {/* ── Category grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            servings={servingsMap[cat.id] ?? 0}
            lang={lang}
            onIncrement={() => changeServings(cat.id, +1)}
            onDecrement={() => changeServings(cat.id, -1)}
            pending={!!pending[cat.id]}
          />
        ))}
      </div>

    </div>
  );
}
