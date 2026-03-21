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

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    complete:        'Vollständig!',
    servings:        (cur: number, tgt: number) => `${cur} / ${tgt}`,
    servingSizes:    'Portionsgrössen (eine Portion)',
    qualifyingFoods: 'Geeignete Lebensmittel',
    loading:         'Lade…',
  },
  en: {
    complete:        'Done!',
    servings:        (cur: number, tgt: number) => `${cur} / ${tgt}`,
    servingSizes:    'Serving Sizes (one serving)',
    qualifyingFoods: 'Qualifying Foods',
    loading:         'Loading…',
  },
};

// ─── SVG progress ring (compact 52px) ─────────────────────────────────────────

const R             = 20;
const CX            = 26;
const CIRCUMFERENCE = 2 * Math.PI * R;

// ringStroke / trackColor drive the three color states from the spec
function ringColors(done: boolean, partial: boolean) {
  if (done)    return { stroke: '#1D9E75', track: '#E1F5EE' };
  if (partial) return { stroke: '#BA7517', track: '#FAEEDA' };
  return { stroke: null, track: '#F1EFE8' };
}

function ProgressRing({ progress, done, icon }: { progress: number; done: boolean; icon: string | null }) {
  const partial  = progress > 0 && !done;
  const colors   = ringColors(done, partial);
  const offset   = CIRCUMFERENCE * (1 - Math.min(progress, 1));

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      {/* Track */}
      <circle cx={CX} cy={CX} r={R} fill="none" stroke={colors.track} strokeWidth="5" />
      {/* Progress arc — only when there's something to show */}
      {colors.stroke && (
        <circle
          cx={CX} cy={CX} r={R}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CX})`}
          style={{ transition: 'stroke-dashoffset 0.35s ease, stroke 0.3s ease' }}
        />
      )}
      {/* Emoji always visible (spec: never replace with checkmark) */}
      {icon && (
        <text x={CX} y={CX + 1} textAnchor="middle" dominantBaseline="middle" fontSize="20">{icon}</text>
      )}
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

// ─── Category card (compact horizontal) ───────────────────────────────────────

function CategoryCard({
  category, servings, lang, onIncrement, onDecrement, pending, onInfoClick,
}: {
  category:    DDCategory;
  servings:    number;
  lang:        Lang;
  onIncrement: () => void;
  onDecrement: () => void;
  pending:     boolean;
  onInfoClick: () => void;
}) {
  const target   = category.target_servings;
  const done     = servings >= target;
  const partial  = servings > 0 && !done;
  const progress = target > 0 ? servings / target : 0;
  const name     = category.name[lang] || category.name.de || category.slug;

  // ── Color tokens per state ─────────────────────────────────────────────────
  const cardCls   = done
    ? 'border-[#9FE1CB] bg-[#f0faf5]'
    : 'border-[#0e393d]/10 bg-white hover:border-[#0e393d]/20';

  const infoCls   = done
    ? 'text-[#5DCAA5] bg-[#E1F5EE] hover:bg-[#c8f0e1]'
    : 'text-[#0e393d]/35 bg-[#0e393d]/6 hover:bg-[#0e393d]/12 hover:text-[#0e393d]/65';

  const counterCls = done    ? 'text-[#1D9E75]'
    : partial ? 'text-[#BA7517]'
    : 'text-[#1c2a2b]/40';

  const minusCls = done
    ? 'border-[#5DCAA5] bg-[#E1F5EE] text-[#1D9E75] hover:bg-[#c8f0e1]'
    : 'border-[#0e393d]/15 bg-white text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d]';

  const plusCls = done
    ? 'border-[#5DCAA5] bg-[#E1F5EE] text-[#1D9E75] hover:bg-[#c8f0e1]'
    : partial
      ? 'border-[#BA7517]/40 bg-[#FAEEDA] text-[#BA7517] hover:bg-[#f5e1c0]'
      : 'border-[#0e393d]/20 bg-[#0e393d] text-white hover:bg-[#0e393d]/85';

  return (
    <div
      className={`relative flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200 ${cardCls}`}
    >
      {/* ① Info button — far left */}
      <button
        type="button"
        onClick={onInfoClick}
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition ${infoCls}`}
        aria-label={lang === 'de' ? 'Details anzeigen' : 'Show details'}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8" strokeLinecap="round" strokeWidth="3"/>
          <line x1="12" y1="11" x2="12" y2="16"/>
        </svg>
      </button>

      {/* ② Progress ring 52px — emoji always inside */}
      <ProgressRing progress={progress} done={done} icon={category.icon} />

      {/* ③ Category name + optional ✓ */}
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-medium text-[#0e393d] leading-tight">
          {name}
        </span>
        {done && (
          <span className="ml-1 text-[#1D9E75] text-[13px] font-semibold">✓</span>
        )}
      </div>

      {/* ④ Counter: minus | X / Y | plus */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onDecrement}
          disabled={servings === 0 || pending}
          aria-label="Remove serving"
          className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition disabled:opacity-30 disabled:cursor-default ${minusCls}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>

        <span className={`text-[13px] font-semibold tabular-nums text-center w-9 ${counterCls}`}>
          {servings}&thinsp;/&thinsp;{target}
        </span>

        <button
          type="button"
          onClick={onIncrement}
          disabled={pending}
          aria-label="Add serving"
          className={`w-[30px] h-[30px] rounded-full border flex items-center justify-center transition disabled:opacity-50 disabled:cursor-default ${plusCls}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Pending overlay */}
      {pending && (
        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-white/50">
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

  // ── Totals for gauge ───────────────────────────────────────────────────────

  const totalServings = categories.reduce((sum, c) => sum + (servingsMap[c.id] ?? 0), 0);
  const totalTarget   = categories.reduce((sum, c) => sum + c.target_servings, 0);

  // ── Streak update ──────────────────────────────────────────────────────────
  // Recalculates the streak from scratch on every upsert, handling both
  // increments and decrements, and past-date edits.

  const updateStreak = useCallback(async (newMap: Record<string, number>, date: string) => {
    // Step 1: determine whether TODAY is fully complete.
    // If editing today, use newMap. If editing a past date, query today from the DB
    // (upsertEntry was already awaited so DB reflects the latest value for `date`).
    let todayComplete: boolean;
    if (date === today) {
      todayComplete = categories.every((c) => (newMap[c.id] ?? 0) >= c.target_servings);
    } else {
      const { data: todayData } = await supabase
        .from('daily_dozen_entries')
        .select('category_id, servings_completed')
        .eq('user_id', userId)
        .eq('entry_date', today);
      const todayMap: Record<string, number> = {};
      for (const cat of categories) todayMap[cat.id] = 0;
      for (const e of (todayData ?? [])) todayMap[e.category_id] = e.servings_completed;
      todayComplete = categories.every((c) => (todayMap[c.id] ?? 0) >= c.target_servings);
    }

    // Step 2: if today isn't complete, current streak is 0 — no need to query history.
    if (!todayComplete) {
      const newLongest = streak?.longest_streak ?? 0;
      const updated: DDStreak = { current_streak: 0, longest_streak: newLongest, last_completed_date: streak?.last_completed_date ?? null };
      setStreak(updated);
      await supabase.from('daily_dozen_streaks').upsert(
        { user_id: userId, current_streak_days: 0, longest_streak_days: newLongest, last_completed_date: updated.last_completed_date },
        { onConflict: 'user_id' }
      );
      return;
    }

    // Step 3: today is complete — query up to 365 days of history to count the streak.
    const limitD = new Date(today + 'T12:00:00');
    limitD.setDate(limitD.getDate() - 365);
    const fromStr = limitD.toISOString().split('T')[0];

    const { data: histData } = await supabase
      .from('daily_dozen_entries')
      .select('entry_date, category_id, servings_completed')
      .eq('user_id', userId)
      .gte('entry_date', fromStr)
      .lte('entry_date', today);

    const byDate: Record<string, Record<string, number>> = {};
    for (const e of (histData ?? [])) {
      if (!byDate[e.entry_date]) byDate[e.entry_date] = {};
      byDate[e.entry_date][e.category_id] = e.servings_completed;
    }
    // Overlay in-flight changes (DB was already updated, but this is a safety net)
    byDate[date] = { ...(byDate[date] ?? {}), ...newMap };

    // Walk backwards from today counting consecutive complete days
    let newCurrent = 0;
    let checkDate  = today;
    while (checkDate >= fromStr) {
      const dayMap   = byDate[checkDate] ?? {};
      const complete = categories.every((c) => (dayMap[c.id] ?? 0) >= c.target_servings);
      if (!complete) break;
      newCurrent++;
      const d = new Date(checkDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
    }

    const newLongest = Math.max(newCurrent, streak?.longest_streak ?? 0);
    const updated: DDStreak = { current_streak: newCurrent, longest_streak: newLongest, last_completed_date: today };
    setStreak(updated);
    await supabase.from('daily_dozen_streaks').upsert(
      { user_id: userId, current_streak_days: newCurrent, longest_streak_days: newLongest, last_completed_date: today },
      { onConflict: 'user_id' }
    );
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
    const date = selectedDate;
    const cat  = categories.find((c) => c.id === categoryId);
    const max  = cat?.target_servings ?? Infinity;
    setServingsMap((prev) => {
      const next   = Math.min(max, Math.max(0, (prev[categoryId] ?? 0) + delta));
      const newMap = { ...prev, [categoryId]: next };

      clearTimeout(debounceRef.current[categoryId]);
      debounceRef.current[categoryId] = setTimeout(async () => {
        await upsertEntry(categoryId, next, date);
        setRefreshKey((k) => k + 1); // refresh calendar + chart immediately after upsert
        updateStreak(newMap, date);   // fire-and-forget — doesn't block the calendar update
      }, 400);

      return newMap;
    });
  }, [upsertEntry, updateStreak, selectedDate, today]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const modalCat = modalCatId ? categories.find((c) => c.id === modalCatId) ?? null : null;
  // Stable reference — prevents DDMiniCalendar/DDProgressChart from re-fetching on every render
  const catSlim  = useMemo(
    () => categories.map((c) => ({ id: c.id, target_servings: c.target_servings })),
    [categories]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Dashboard header: Row 1 (Gauge + Chart) + Row 2 (Calendar strip) ── */}
      <div className="space-y-2">

        {/* Row 1 — Gauge | Chart */}
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2">

            {/* Gauge */}
            <div className="flex flex-col px-6 py-5 border-b sm:border-b-0 sm:border-r border-[#0e393d]/8">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">
                {lang === 'de' ? 'Tagesportionen' : 'Daily Dozen Score'}
              </p>
              <div className="flex-1 flex items-center justify-center">
                <DDGauge
                  current={totalServings}
                  total={totalTarget}
                  lang={lang}
                  streak={streak}
                  selectedDate={selectedDate}
                  today={today}
                />
              </div>
            </div>

            {/* Chart */}
            <div className="flex flex-col px-5 py-5">
              <DDProgressChart
                userId={userId}
                categories={catSlim}
                today={today}
                lang={lang}
                compact
                refreshKey={refreshKey}
              />
            </div>

          </div>
        </div>

        {/* Row 2 — Calendar strip */}
        <div className="rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4">
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

      {/* ── Category grid ──────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 transition-opacity duration-200 ${
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
            onInfoClick={() => setModalCatId(cat.id)}
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
