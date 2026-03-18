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

export default function DDMiniCalendar({
  userId, categories, today, lang, selectedDate, onSelectDate, refreshKey = 0,
}: Props) {
  const supabase = createClient();

  // viewMonth: "YYYY-MM"
  const [viewMonth,      setViewMonth]      = useState(() => today.substring(0, 7));
  const [completionMap,  setCompletionMap]  = useState<Record<string, Completion>>({});

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

    // Group by date
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

  // ── Calendar math ────────────────────────────────────────────────────────────
  const [y, m]       = viewMonth.split('-').map(Number);
  const daysInMonth  = new Date(y, m, 0).getDate();
  const firstDow     = new Date(y, m - 1, 1).getDay(); // 0=Sun
  const startOffset  = firstDow === 0 ? 6 : firstDow - 1; // Mon-based

  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null); // always 6 rows → fixed height

  const todayYM      = today.substring(0, 7);
  const canGoNext    = viewMonth < todayYM;

  const prevMonth = () => {
    const d = new Date(y, m - 2, 1); // m is 1-based, so m-2 = previous month (0-based)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    if (!canGoNext) return;
    const d = new Date(y, m, 1); // m is 1-based, so m = next month (0-based)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString(
    lang === 'de' ? 'de-CH' : 'en-GB',
    { month: 'long', year: 'numeric' }
  );
  const dayHeaders = lang === 'de'
    ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">
        {lang === 'de' ? 'Kalender' : 'Calendar'}
      </p>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#0e393d]/6 text-[#0e393d]/50 hover:text-[#0e393d] transition"
          aria-label={lang === 'de' ? 'Vorheriger Monat' : 'Previous month'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span className="text-xs font-semibold text-[#0e393d] capitalize">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#0e393d]/6 text-[#0e393d]/50 hover:text-[#0e393d] transition disabled:opacity-25 disabled:cursor-not-allowed"
          aria-label={lang === 'de' ? 'Nächster Monat' : 'Next month'}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {/* Day headers */}
        {dayHeaders.map((h) => (
          <div key={h} className="text-center text-[9px] font-semibold text-[#1c2a2b]/35 py-0.5">
            {h}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const dateStr   = `${viewMonth}-${String(day).padStart(2, '0')}`;
          const isFuture  = dateStr > today;
          const isToday   = dateStr === today;
          const isSel     = dateStr === selectedDate;
          const comp      = completionMap[dateStr];

          let base = 'w-full aspect-square flex items-center justify-center rounded-full text-[10px] font-medium transition-all ';

          if (isFuture) {
            base += 'text-[#1c2a2b]/20 cursor-default';
          } else if (comp === 'full') {
            base += 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer';
          } else if (comp === 'partial') {
            base += 'bg-[#ceab84]/20 text-[#8a6a3e] hover:bg-[#ceab84]/35 cursor-pointer';
          } else {
            base += 'text-[#1c2a2b]/55 hover:bg-[#0e393d]/6 cursor-pointer';
          }

          // Selection ring
          if (isSel && isToday) {
            base += ' ring-2 ring-[#ceab84] ring-offset-1';
          } else if (isSel) {
            base += ' ring-2 ring-[#0e393d]/50 ring-offset-1';
          } else if (isToday) {
            base += ' ring-1 ring-[#ceab84]/60 ring-offset-1';
          }

          return (
            <div key={dateStr} className="p-px">
              <button
                className={base}
                onClick={() => !isFuture && onSelectDate(dateStr)}
                disabled={isFuture}
                aria-label={dateStr}
                aria-pressed={isSel}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* Jump to today */}
      <div className="flex justify-center mt-2">
        <div className="flex rounded-full bg-[#0e393d]/6 p-0.5">
          <button
            onClick={() => {
              onSelectDate(today);
              setViewMonth(today.substring(0, 7));
            }}
            className={`px-3 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              selectedDate === today && viewMonth === today.substring(0, 7)
                ? 'bg-white text-[#0e393d] shadow-sm'
                : 'text-[#1c2a2b]/50 hover:text-[#0e393d]'
            }`}
          >
            {lang === 'de' ? 'Heute' : 'Today'}
          </button>
        </div>
      </div>
    </div>
  );
}
