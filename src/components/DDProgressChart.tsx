'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year';
type Lang = 'de' | 'en';

type RawEntry = { category_id: string; entry_date: string; servings_completed: number };
type ChartBar = { label: string; date: string; pct: number; count: number; total: number };

interface Props {
  userId:      string;
  categories:  Array<{ id: string; target_servings: number }>;
  today:       string;
  lang:        Lang;
  compact?:    boolean;
  refreshKey?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, year: 365 };

function barFill(pct: number): string {
  if (pct >= 100) return '#10b981';   // emerald — full
  if (pct >= 50)  return '#ceab84';   // gold — mostly done
  if (pct > 0)    return '#d4c4a8';   // faded gold — partial
  return '#e5e7eb';                   // gray — nothing
}

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartBar }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-[#0e393d] px-2.5 py-1.5 text-white text-xs shadow-lg whitespace-nowrap">
      <span className="font-semibold">{d.pct}%</span>
      {d.total > 0 && d.count >= 0 && (
        <span className="text-white/60"> · {d.count}/{d.total}</span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DDProgressChart({ userId, categories, today, lang, compact = false, refreshKey = 0 }: Props) {
  const [period, setPeriod]   = useState<Period>('week');
  const [entries, setEntries] = useState<RawEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    const from = new Date(today + 'T12:00:00');
    from.setDate(from.getDate() - PERIOD_DAYS[p] + 1);
    const fromStr = from.toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_dozen_entries')
      .select('category_id, entry_date, servings_completed')
      .eq('user_id', userId)
      .gte('entry_date', fromStr)
      .lte('entry_date', today)
      .order('entry_date');

    setEntries(data ?? []);
    setLoading(false);
  }, [supabase, userId, today]);

  useEffect(() => { fetchData(period); }, [fetchData, period, refreshKey]);

  const chartData = useMemo((): ChartBar[] => {
    const total = categories.length;
    const days  = PERIOD_DAYS[period];

    // Build date range (oldest → newest)
    const dateRange: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today + 'T12:00:00');
      d.setDate(d.getDate() - i);
      dateRange.push(d.toISOString().split('T')[0]);
    }

    // Index entries by entry_date → category_id → servings_completed
    const byDate: Record<string, Record<string, number>> = {};
    for (const e of entries) {
      if (!byDate[e.entry_date]) byDate[e.entry_date] = {};
      byDate[e.entry_date][e.category_id] = e.servings_completed;
    }

    // Total target servings across all categories
    const totalTarget = categories.reduce((s, c) => s + c.target_servings, 0);

    const completionByDate = dateRange.map((date) => {
      const day = byDate[date] ?? {};
      // Sum actual servings completed across all categories
      const count = categories.reduce((s, c) => s + Math.min(day[c.id] ?? 0, c.target_servings), 0);
      const pct = totalTarget > 0 ? Math.round((count / totalTarget) * 100) : 0;
      return { date, count, pct };
    });

    if (period === 'year') {
      // Aggregate by month
      const months: Record<string, { sumPct: number; days: number; count: number }> = {};
      for (const d of completionByDate) {
        const key = d.date.substring(0, 7);
        if (!months[key]) months[key] = { sumPct: 0, days: 0, count: 0 };
        months[key].sumPct += d.pct;
        months[key].count  += d.count;
        months[key].days++;
      }
      return Object.entries(months).map(([key, { sumPct, days, count }]) => {
        const mo  = Number(key.split('-')[1]);
        const pct = days > 0 ? Math.round(sumPct / days) : 0;
        return { label: String(mo), date: key, pct, count: Math.round(count / days), total: totalTarget };
      });
    }

    if (period === 'month') {
      return completionByDate.map(({ date, count, pct }) => {
        const label = String(new Date(date + 'T12:00:00').getDate());
        return { label, date, pct, count, total: totalTarget };
      });
    }

    // Week — day names
    return completionByDate.map(({ date, count, pct }) => {
      const label = new Date(date + 'T12:00:00').toLocaleDateString(
        lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' }
      );
      return { label, date, pct, count, total: totalTarget };
    });
  }, [entries, categories, period, today, lang]);

  const T = {
    de: { week: 'Woche', month: 'Monat', year: 'Jahr', heading: 'Verlauf', empty: 'Noch keine Daten' },
    en: { week: 'Week',  month: 'Month', year: 'Year',  heading: 'Progress', empty: 'No data yet' },
  };
  const t = T[lang];

  const chartH  = compact ? 120 : 112;
  const emptyH  = compact ? 'h-28' : 'h-28';

  // Period toggle — shared between top (non-compact) and bottom (compact)
  const periodToggle = (
    <div className="flex rounded-full bg-[#0e393d]/6 p-0.5 gap-0.5">
      {(['week', 'month', 'year'] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
            period === p
              ? 'bg-white text-[#0e393d] shadow-sm'
              : 'text-[#1c2a2b]/50 hover:text-[#0e393d]'
          }`}
        >
          {t[p]}
        </button>
      ))}
    </div>
  );

  return (
    <div className={compact ? 'flex flex-col h-full' : 'rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4'}>

      {/* Header — toggle at top in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">{t.heading}</p>
          {periodToggle}
        </div>
      )}

      {/* Compact: heading only at top */}
      {compact && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.heading}</p>
      )}

      {/* Legend — non-compact only */}
      {!compact && (
        <div className="flex items-center gap-4 mb-3">
          {[
            { color: '#10b981', label: lang === 'de' ? 'Vollständig' : 'Complete' },
            { color: '#ceab84', label: lang === 'de' ? 'Teilweise' : 'Partial' },
            { color: '#e5e7eb', label: lang === 'de' ? 'Kein Eintrag' : 'No entry' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />
              <span className="text-[10px] text-[#1c2a2b]/45">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart area */}
      {loading ? (
        <div className={`${compact ? 'flex-1' : emptyH} flex items-center justify-center`}>
          <svg className="w-5 h-5 text-[#0e393d]/25 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
        </div>
      ) : chartData.every((d) => d.pct === 0) ? (
        <div className={`${compact ? 'flex-1' : emptyH} flex items-center justify-center`}>
          <p className="text-sm text-[#1c2a2b]/30">{t.empty}</p>
        </div>
      ) : (
        <div className={compact ? 'flex-1 min-h-0' : ''}>
          <ResponsiveContainer width="100%" height={compact ? '100%' : chartH}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              barCategoryGap={period === 'week' ? '30%' : '12%'}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#1c2a2b55' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[0, 100]} hide width={0} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#0e393d08' }} />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={period === 'week' ? 40 : 20}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={barFill(d.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Toggle at bottom in compact mode */}
      {compact && (
        <div className="flex justify-center mt-2">
          {periodToggle}
        </div>
      )}
    </div>
  );
}
