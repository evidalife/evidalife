'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

export default function DDMiniCalendar({
  userId, categories, today, lang, selectedDate, onSelectDate, refreshKey = 0,
}: Props) {
  const supabase  = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [viewMonth,     setViewMonth]     = useState(() => today.substring(0, 7));
  const [completionMap, setCompletionMap] = useState<Record<string, Completion>>({});

  const fetchMonth = useCallback(async (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    const firstDay = `${ym}-01`;
    const lastDay  = new Date(y, m, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_dozen_entries')
      .select('entry_date, category_id, servings_completed')
      .eq('user_id', userId)
      .gte('entry_date', firstDay)
      .lte('entry_date', lastDay);

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
    setCompletionMap(map);
  }, [supabase, userId, categories]);

  useEffect(() => { fetchMonth(viewMonth); }, [viewMonth, fetchMonth, refreshKey]);

  // Scroll selected date into view when selection or month changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const btn = scrollRef.current.querySelector('[aria-pressed="true"]') as HTMLElement | null;
    if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [viewMonth, selectedDate]);

  const [y, m]      = viewMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayYM     = today.substring(0, 7);
  const canGoNext   = viewMonth < todayYM;

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    if (!canGoNext) return;
    const d = new Date(y, m, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(
    lang === 'de' ? 'de-CH' : 'en-GB',
    { month: 'short', year: 'numeric' }
  );

  const isOnToday = selectedDate === today && viewMonth === todayYM;

  return (
    <div className="flex flex-col gap-2.5 min-w-0">

      {/* Title row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">
          {lang === 'de' ? 'Kalender' : 'Calendar'}
        </p>
        <button
          onClick={() => { onSelectDate(today); setViewMonth(todayYM); }}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
            isOnToday
              ? 'bg-[#0e393d] text-[#ceab84]'
              : 'bg-[#0e393d]/8 text-[#1c2a2b]/55 hover:bg-[#0e393d]/15 hover:text-[#0e393d]'
          }`}
        >
          {lang === 'de' ? 'Heute' : 'Today'}
        </button>
      </div>

      {/* Strip row: ← | scrollable dates | month label | → */}
      <div className="flex items-center gap-1.5">

        {/* ← */}
        <button
          onClick={prevMonth}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#0e393d]/6 text-[#0e393d]/50 hover:text-[#0e393d] transition"
          aria-label={lang === 'de' ? 'Vorheriger Monat' : 'Previous month'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Scrollable date pills */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-1 py-0.5">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr  = `${viewMonth}-${String(day).padStart(2, '0')}`;
              const isFuture = dateStr > today;
              const isSel    = dateStr === selectedDate;
              const isToday  = dateStr === today;
              const comp     = completionMap[dateStr];

              let cls = 'shrink-0 w-[26px] h-[26px] flex items-center justify-center rounded-full text-[10px] font-medium transition-all ';

              if (isSel) {
                cls += 'bg-[#0e393d] text-[#ceab84] ring-1 ring-[#ceab84]';
              } else if (isFuture) {
                cls += 'text-[#1c2a2b]/20 cursor-default';
              } else if (comp === 'full') {
                cls += 'bg-[#1D9E75] text-white hover:bg-[#18875f] cursor-pointer';
              } else if (comp === 'partial') {
                cls += 'bg-[#ceab84]/25 text-[#8a6a3e] hover:bg-[#ceab84]/40 cursor-pointer';
              } else {
                cls += 'text-[#1c2a2b]/55 hover:bg-[#0e393d]/6 cursor-pointer';
                if (isToday) cls += ' ring-1 ring-[#ceab84]/60';
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
            })}
          </div>
        </div>

        {/* Month/year label */}
        <span className="shrink-0 text-[10px] font-semibold text-[#0e393d]/55 capitalize whitespace-nowrap">
          {monthLabel}
        </span>

        {/* → */}
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#0e393d]/6 text-[#0e393d]/50 hover:text-[#0e393d] transition disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label={lang === 'de' ? 'Nächster Monat' : 'Next month'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

      </div>
    </div>
  );
}
