'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Lang = 'de' | 'en';
type Completion = 'full' | 'partial' | 'empty';

interface Props {
  userId:       string;
  categories:   Array<{ id: string; target_servings: number }>;
  today:        string;
  lang:         Lang;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  refreshKey?:  number;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function DDMiniCalendar({
  userId, categories, today, lang, selectedDate, onSelectDate, refreshKey = 0,
}: Props) {
  const supabase = createClient();

  // windowStart = first of the 7 primary visible dates; default = today - 3
  const [windowStart, setWindowStart] = useState(() => addDays(today, -3));
  const [completionMap, setCompletionMap] = useState<Record<string, Completion>>({});

  // Main 7 dates (always visible)
  const dates     = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i));
  const windowEnd = dates[6];

  // Extra 7 dates shown on desktop only (the 7 days before windowStart)
  const prevDates  = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i - 7));
  const fetchFrom  = prevDates[0];

  // Can go forward only if the next window's first day is on or before today
  const canGoNext = addDays(windowStart, 7) <= today;

  const fetchRange = useCallback(async (from: string, to: string) => {
    const { data } = await supabase
      .from('daily_dozen_entries')
      .select('entry_date, category_id, servings_completed')
      .eq('user_id', userId)
      .gte('entry_date', from)
      .lte('entry_date', to);

    const byDate: Record<string, Record<string, number>> = {};
    for (const e of (data ?? [])) {
      if (!byDate[e.entry_date]) byDate[e.entry_date] = {};
      byDate[e.entry_date][e.category_id] = e.servings_completed;
    }

    const map: Record<string, Completion> = {};
    for (const [date, catMap] of Object.entries(byDate)) {
      const done = categories.filter((c) => (catMap[c.id] ?? 0) >= c.target_servings).length;
      map[date] = done === 0 ? 'empty' : done === categories.length ? 'full' : 'partial';
    }
    // Merge so data from other windows persists while navigating
    setCompletionMap((prev) => ({ ...prev, ...map }));
  }, [supabase, userId, categories]);

  useEffect(() => {
    fetchRange(fetchFrom, windowEnd);
  }, [windowStart, fetchRange, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevWindow = () => setWindowStart((s) => addDays(s, -7));
  const nextWindow = () => { if (canGoNext) setWindowStart((s) => addDays(s, 7)); };

  const goToToday = () => {
    onSelectDate(today);
    setWindowStart(addDays(today, -3));
  };

  // Month label: derive from the middle date of the main 7
  const midDate = dates[3];
  const [my, mm] = midDate.split('-').map(Number);
  const monthLabel = new Date(my, mm - 1, 1).toLocaleDateString(
    lang === 'de' ? 'de-CH' : 'en-GB',
    { month: 'short', year: 'numeric' }
  );

  function renderDateButton(dateStr: string, extraCls?: string) {
    const isFuture = dateStr > today;
    const isSel    = dateStr === selectedDate;
    const isToday  = dateStr === today;
    const comp     = completionMap[dateStr];
    const day      = Number(dateStr.split('-')[2]);

    let cls = `w-[30px] h-[30px] items-center justify-center rounded-full text-[11px] font-medium transition-all ${extraCls ?? 'flex'} `;

    if (isFuture) {
      cls += 'text-[#1c2a2b]/20 cursor-default';
    } else if (comp === 'full') {
      cls += 'bg-[#1D9E75] text-white hover:bg-[#18875f] cursor-pointer';
    } else if (comp === 'partial') {
      cls += 'bg-[#ceab84]/25 text-[#8a6a3e] hover:bg-[#ceab84]/40 cursor-pointer';
    } else {
      cls += 'text-[#1c2a2b]/55 hover:bg-[#0e393d]/6 cursor-pointer';
    }

    // Selected: ring color matches the date's state (green for full, gold otherwise)
    if (isSel) {
      const ringColor = comp === 'full' ? 'ring-[#1D9E75]' : 'ring-[#ceab84]';
      cls += ` ring-2 ${ringColor} ring-offset-1`;
    } else if (isToday) {
      cls += ' ring-1 ring-[#ceab84]/50 ring-offset-1';
    }

    return (
      <button
        key={dateStr}
        className={cls}
        onClick={() => !isFuture && onSelectDate(dateStr)}
        disabled={isFuture}
        aria-label={dateStr}
        aria-pressed={isSel}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 min-w-0">

      {/* Title row: "CALENDAR" + "Today" pill */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">
          {lang === 'de' ? 'Kalender' : 'Calendar'}
        </p>
        <div className="rounded-full bg-[#0e393d]/6 p-0.5">
          <button
            onClick={goToToday}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              selectedDate === today
                ? 'bg-white text-[#0e393d] shadow-sm'
                : 'text-[#1c2a2b]/50 hover:text-[#0e393d]'
            }`}
          >
            {lang === 'de' ? 'Heute' : 'Today'}
          </button>
        </div>
      </div>

      {/* Strip: ← | date circles | month label | → */}
      <div className="flex items-center gap-2">

        {/* ← */}
        <button
          onClick={prevWindow}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#0e393d]/6 text-[#0e393d]/50 hover:text-[#0e393d] transition"
          aria-label={lang === 'de' ? 'Vorherige Woche' : 'Previous week'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Date circles — 7 on mobile, 14 on desktop */}
        <div className="flex gap-1">
          {/* Extra 7 — desktop only */}
          {prevDates.map((dateStr) => renderDateButton(dateStr, 'hidden sm:flex'))}
          {/* Main 7 — always visible */}
          {dates.map((dateStr) => renderDateButton(dateStr, 'flex'))}
        </div>

        {/* Month/year label */}
        <span className="shrink-0 text-[10px] font-semibold text-[#0e393d]/50 capitalize whitespace-nowrap">
          {monthLabel}
        </span>

        {/* → */}
        <button
          onClick={nextWindow}
          disabled={!canGoNext}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#0e393d]/6 text-[#0e393d]/50 hover:text-[#0e393d] transition disabled:opacity-25 disabled:cursor-default"
          aria-label={lang === 'de' ? 'Nächste Woche' : 'Next week'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

      </div>
    </div>
  );
}
