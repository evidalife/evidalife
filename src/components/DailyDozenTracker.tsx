'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import DDProgressChart from './DDProgressChart';
import DDGauge         from './DDGauge';
import DDMiniCalendar  from './DDMiniCalendar';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

type DDCategoryDetails = {
  servings: { de: string[]; en: string[] };
  types:    { de: string[]; en: string[] };
};

export type DDCategory = {
  id:              string;
  slug:            string;
  name:            { de?: string; en?: string };
  target_servings: number;
  icon:            string | null;
  sort_order:      number;
  details:         DDCategoryDetails | null;
};

export type DDEntry = {
  category_id: string;
  servings:    number;
};

export type DDStreak = {
  current_streak:      number;
  longest_streak:      number;
  last_completed_date: string | null;
};

export type HistoricalEntry = {
  category_id: string;
  date:        string;
  servings:    number;
};

type CategoryStreakInfo = { streak: number; atRisk: boolean };

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    complete:        'Vollständig!',
    servings:        (cur: number, tgt: number) => `${cur} / ${tgt}`,
    servingSizes:    'Portionsgrössen (eine Portion)',
    qualifyingFoods: 'Geeignete Lebensmittel',
    streakAtRisk:    'Streak gefährdet',
    streakActive:    'Aktueller Streak',
    loading:         'Lade…',
  },
  en: {
    complete:        'Done!',
    servings:        (cur: number, tgt: number) => `${cur} / ${tgt}`,
    servingSizes:    'Serving Sizes (one serving)',
    qualifyingFoods: 'Qualifying Foods',
    streakAtRisk:    'Streak at risk',
    streakActive:    'Current streak',
    loading:         'Loading…',
  },
};

// ─── SVG progress ring ────────────────────────────────────────────────────────

const R             = 28;
const CX            = 36;
const CIRCUMFERENCE = 2 * Math.PI * R;

function ProgressRing({ progress, done, icon }: { progress: number; done: boolean; icon: string | null }) {
  const offset = CIRCUMFERENCE * (1 - Math.min(progress, 1));
  const color  = done ? '#10b981' : progress > 0 ? '#ceab84' : '#0e393d1a';

  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx={CX} cy={CX} r={R} fill="none" stroke="#0e393d12" strokeWidth="5" />
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
      {done ? (
        <text x={CX} y={CX + 1} textAnchor="middle" dominantBaseline="middle" fontSize="18">✓</text>
      ) : icon ? (
        <text x={CX} y={CX + 1} textAnchor="middle" dominantBaseline="middle" fontSize="20">{icon}</text>
      ) : null}
    </svg>
  );
}

// ─── Info modal ───────────────────────────────────────────────────────────────

function InfoModal({ category, lang, onClose }: { category: DDCategory; lang: Lang; onClose: () => void }) {
  const t       = T[lang];
  const details = category.details;
  const name    = category.name[lang] || category.name.de || category.slug;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#0e393d]/10 px-5 py-4">
          {category.icon && <span className="text-3xl leading-none">{category.icon}</span>}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-0.5">Daily Dozen</p>
            <h2 className="font-serif text-xl text-[#0e393d] leading-tight truncate">{name}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-[#0e393d]/6 flex items-center justify-center text-[#1c2a2b]/50 hover:bg-[#0e393d]/12 hover:text-[#1c2a2b] transition"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {details && details.servings[lang].length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.servingSizes}</p>
              <ul className="space-y-2">
                {details.servings[lang].map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#0e393d]/8 flex items-center justify-center text-[10px] font-semibold text-[#0e393d]/60 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[#1c2a2b]/70 leading-snug">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {details && details.servings[lang].length > 0 && details.types[lang].length > 0 && (
            <div className="h-px bg-[#0e393d]/8" />
          )}
          {details && details.types[lang].length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.qualifyingFoods}</p>
              <div className="flex flex-wrap gap-2">
                {details.types[lang].map((type) => (
                  <span key={type} className="rounded-full bg-[#0e393d]/6 px-3 py-1 text-xs font-medium text-[#0e393d]/70">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!details && (
            <p className="text-sm text-[#1c2a2b]/40 text-center py-8">
              {lang === 'de' ? 'Keine Details verfügbar.' : 'No details available.'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({
  category, servings, lang, onIncrement, onDecrement, pending, streakInfo, onInfoClick, isToday,
}: {
  category:    DDCategory;
  servings:    number;
  lang:        Lang;
  onIncrement: () => void;
  onDecrement: () => void;
  pending:     boolean;
  streakInfo:  CategoryStreakInfo;
  onInfoClick: () => void;
  isToday:     boolean;
}) {
  const t        = T[lang];
  const target   = category.target_servings;
  const done     = servings >= target;
  const progress = target > 0 ? servings / target : 0;
  const name     = category.name[lang] || category.name.de || category.slug;

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-4 transition-all duration-200 ${
        done
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-[#0e393d]/10 bg-white hover:border-[#0e393d]/20'
      }`}
    >
      {/* Streak badge — absolute top-left, today only */}
      {isToday && streakInfo.streak > 0 && (
        <div
          className={`absolute top-2 left-2 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
            streakInfo.atRisk ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600'
          }`}
          title={streakInfo.atRisk ? t.streakAtRisk : t.streakActive}
        >
          🔥{streakInfo.streak}
        </div>
      )}

      {/* Info button — absolute top-right */}
      <button
        type="button"
        onClick={onInfoClick}
        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0e393d]/6 flex items-center justify-center text-[#0e393d]/35 hover:bg-[#0e393d]/12 hover:text-[#0e393d]/65 transition"
        aria-label={lang === 'de' ? 'Details anzeigen' : 'Show details'}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8" strokeLinecap="round" strokeWidth="3"/>
          <line x1="12" y1="11" x2="12" y2="16"/>
        </svg>
      </button>

      {/* Progress ring — mt-5 clears both absolute buttons */}
      <div className="mt-5">
        <ProgressRing progress={progress} done={done} icon={category.icon} />
      </div>

      <p className={`mt-2 text-center text-xs font-semibold leading-tight ${done ? 'text-emerald-700' : 'text-[#0e393d]'}`}>
        {name}
      </p>
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
  userId:            string;
  categories:        DDCategory[];
  entries:           DDEntry[];
  streak:            DDStreak | null;
  lang:              Lang;
  today:             string;
  historicalEntries: HistoricalEntry[];
}

export default function DailyDozenTracker({
  userId, categories, entries, streak: initialStreak, lang, today, historicalEntries,
}: Props) {
  const t        = T[lang];
  const supabase = createClient();

  // ── State ──────────────────────────────────────────────────────────────────

  const [servingsMap,   setServingsMap]  = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const cat of categories) m[cat.id] = 0;
    for (const e of entries) m[e.category_id] = e.servings;
    return m;
  });

  // todayServings always tracks TODAY's data, even when the user browses a past date.
  // Used exclusively for streak calculations so they stay live.
  const [todayServings, setTodayServings] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const cat of categories) m[cat.id] = 0;
    for (const e of entries) m[e.category_id] = e.servings;
    return m;
  });

  const [streak,       setStreak]       = useState<DDStreak | null>(initialStreak);
  const [pending,      setPending]      = useState<Record<string, boolean>>({});
  const [modalCatId,   setModalCatId]   = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [loadingDate,  setLoadingDate]  = useState(false);
  const [refreshKey,   setRefreshKey]   = useState(0);

  const debounceRef    = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const isInitialMount = useRef(true);

  // ── Fetch entries on date change (skip mount — use SSR data for today) ──────

  const fetchEntriesForDate = useCallback(async (date: string) => {
    setLoadingDate(true);
    const { data } = await supabase
      .from('daily_dozen_entries')
      .select('category_id, servings_completed')
      .eq('user_id', userId)
      .eq('entry_date', date);

    const newMap: Record<string, number> = {};
    for (const cat of categories) newMap[cat.id] = 0;
    for (const e of (data ?? [])) newMap[e.category_id] = e.servings_completed;
    setServingsMap(newMap);
    setLoadingDate(false);
  }, [supabase, userId, categories]);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    fetchEntriesForDate(selectedDate);
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-category streak (always relative to real today) ───────────────────

  const categoryStreaks = useMemo((): Record<string, CategoryStreakInfo> => {
    const pastCompleted: Record<string, Set<string>> = {};
    for (const cat of categories) pastCompleted[cat.id] = new Set();

    for (const e of historicalEntries) {
      if (e.date === today) continue;
      const cat = categories.find((c) => c.id === e.category_id);
      if (cat && e.servings >= cat.target_servings) pastCompleted[e.category_id].add(e.date);
    }

    // Always use todayServings (live state) for today's done-check — never SSR historical
    const todayDoneMap: Record<string, boolean> = {};
    for (const cat of categories) {
      todayDoneMap[cat.id] = (todayServings[cat.id] ?? 0) >= cat.target_servings;
    }

    const result: Record<string, CategoryStreakInfo> = {};
    for (const cat of categories) {
      const past      = pastCompleted[cat.id];
      const todayDone = todayDoneMap[cat.id];

      if (todayDone) {
        let s = 1;
        const cursor = new Date(today + 'T12:00:00');
        cursor.setDate(cursor.getDate() - 1);
        while (past.has(cursor.toISOString().split('T')[0])) { s++; cursor.setDate(cursor.getDate() - 1); }
        result[cat.id] = { streak: s, atRisk: false };
      } else {
        const yesterday = new Date(today + 'T12:00:00');
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        if (past.has(yStr)) {
          let s = 1;
          yesterday.setDate(yesterday.getDate() - 1);
          while (past.has(yesterday.toISOString().split('T')[0])) { s++; yesterday.setDate(yesterday.getDate() - 1); }
          result[cat.id] = { streak: s, atRisk: true };
        } else {
          result[cat.id] = { streak: 0, atRisk: false };
        }
      }
    }
    return result;
  }, [categories, historicalEntries, todayServings, today]);

  // ── Totals for gauge ───────────────────────────────────────────────────────

  const totalServings = categories.reduce((sum, c) => sum + (servingsMap[c.id] ?? 0), 0);
  const totalTarget   = categories.reduce((sum, c) => sum + c.target_servings, 0);

  // ── Streak update ──────────────────────────────────────────────────────────

  const updateStreak = useCallback(async (newMap: Record<string, number>, date: string) => {
    if (date !== today) return;
    const nowComplete = categories.every((c) => (newMap[c.id] ?? 0) >= c.target_servings);
    if (!nowComplete) return;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    let newCurrent = 1;
    if (streak?.last_completed_date === yStr) {
      newCurrent = (streak.current_streak ?? 0) + 1;
    } else if (streak?.last_completed_date === today) {
      return;
    }

    const newLongest = Math.max(newCurrent, streak?.longest_streak ?? 0);
    const updated: DDStreak = { current_streak: newCurrent, longest_streak: newLongest, last_completed_date: today };
    setStreak(updated);
    await supabase.from('daily_dozen_streaks').upsert({ user_id: userId, ...updated }, { onConflict: 'user_id' });
  }, [categories, streak, supabase, today, userId]);

  // ── Upsert entry ───────────────────────────────────────────────────────────

  const upsertEntry = useCallback(async (categoryId: string, newServings: number, date: string) => {
    setPending((p) => ({ ...p, [categoryId]: true }));
    await supabase.from('daily_dozen_entries').upsert(
      { user_id: userId, category_id: categoryId, entry_date: date, servings_completed: newServings },
      { onConflict: 'user_id,entry_date,category_id' }
    );
    setPending((p) => ({ ...p, [categoryId]: false }));
  }, [supabase, userId]);

  // ── Change handler ─────────────────────────────────────────────────────────

  const changeServings = useCallback((categoryId: string, delta: number) => {
    const date    = selectedDate;
    const isToday = date === today;
    const cat     = categories.find((c) => c.id === categoryId);
    const max     = cat?.target_servings ?? Infinity;
    setServingsMap((prev) => {
      const next   = Math.min(max, Math.max(0, (prev[categoryId] ?? 0) + delta));
      const newMap = { ...prev, [categoryId]: next };

      // Keep todayServings in sync for immediate streak updates
      if (isToday) setTodayServings(newMap);

      clearTimeout(debounceRef.current[categoryId]);
      debounceRef.current[categoryId] = setTimeout(async () => {
        await upsertEntry(categoryId, next, date);
        await updateStreak(newMap, date);
        setRefreshKey((k) => k + 1); // refresh chart + calendar
      }, 400);

      return newMap;
    });
  }, [upsertEntry, updateStreak, selectedDate, today]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const modalCat  = modalCatId ? categories.find((c) => c.id === modalCatId) ?? null : null;
  const isToday   = selectedDate === today;

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString(
    lang === 'de' ? 'de-CH' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  const catSlim = categories.map((c) => ({ id: c.id, target_servings: c.target_servings }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── 3-column dashboard header ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3">

          {/* Col 1 — Gauge */}
          <div className="flex flex-col px-6 py-5 border-b md:border-b-0 md:border-r border-[#0e393d]/8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">
              {lang === 'de' ? 'Tagesportionen' : 'Daily Dozen Score'}
            </p>
            <div className="flex-1 flex items-center justify-center">
              <DDGauge
                current={totalServings}
                total={totalTarget}
                lang={lang}
                streak={streak}
                isToday={isToday}
                formattedDate={formattedDate}
              />
            </div>
          </div>

          {/* Col 2 — Chart */}
          <div className="flex flex-col px-5 py-5 border-b md:border-b-0 md:border-r border-[#0e393d]/8">
            <DDProgressChart
              userId={userId}
              categories={catSlim}
              today={today}
              lang={lang}
              compact
              refreshKey={refreshKey}
            />
          </div>

          {/* Col 3 — Calendar */}
          <div className="px-5 py-5">
            <DDMiniCalendar
              userId={userId}
              categories={catSlim}
              today={today}
              lang={lang}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              refreshKey={refreshKey}
            />
          </div>

        </div>
      </div>

      {/* ── Category grid ──────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 transition-opacity duration-200 ${
        loadingDate ? 'opacity-40 pointer-events-none' : ''
      }`}>
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            servings={servingsMap[cat.id] ?? 0}
            lang={lang}
            onIncrement={() => changeServings(cat.id, +1)}
            onDecrement={() => changeServings(cat.id, -1)}
            pending={!!pending[cat.id]}
            streakInfo={categoryStreaks[cat.id] ?? { streak: 0, atRisk: false }}
            onInfoClick={() => setModalCatId(cat.id)}
            isToday={isToday}
          />
        ))}
      </div>

      {/* ── Info modal ─────────────────────────────────────────────────────── */}
      {modalCat && (
        <InfoModal
          category={modalCat}
          lang={lang}
          onClose={() => setModalCatId(null)}
        />
      )}

    </div>
  );
}
