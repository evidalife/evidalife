'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year';
type Lang = 'de' | 'en';

type RawEntry = { category_id: string; entry_date: string; servings_completed: number };
type ChartBar = { x: number; label: string; date: string; servings: number; catsDone: number; total: number; totalCats: number };

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

function dayFill(d: ChartBar): string {
  if (d.servings >= d.total && d.catsDone >= d.totalCats) return 'rgba(12,156,108,0.18)';
  if (d.total > 0 && d.servings / d.total >= 0.667)       return 'rgba(196,169,106,0.15)';
  return 'rgba(250,238,218,0.35)';
}

function dotColor(v: number, max: number): string {
  if (v >= max)        return '#0C9C6C';
  if (v / max >= 0.67) return '#C4A96A';
  return '#FAEEDA';
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
    const totalTarget = categories.reduce((s, c) => s + c.target_servings, 0);
    const totalCats   = categories.length;
    const days        = PERIOD_DAYS[period];

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

    const dailyData = dateRange.map((date, i) => {
      const day      = byDate[date] ?? {};
      const servings = categories.reduce((s, c) => s + Math.min(day[c.id] ?? 0, c.target_servings), 0);
      const catsDone = categories.filter((c) => (day[c.id] ?? 0) >= c.target_servings).length;
      return { date, i, servings, catsDone };
    });

    if (period === 'year') {
      const months: Record<string, { sumServings: number; sumCatsDone: number; days: number }> = {};
      for (const d of dailyData) {
        const key = d.date.substring(0, 7);
        if (!months[key]) months[key] = { sumServings: 0, sumCatsDone: 0, days: 0 };
        months[key].sumServings += d.servings;
        months[key].sumCatsDone += d.catsDone;
        months[key].days++;
      }
      const monthNames = lang === 'de'
        ? ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return Object.entries(months).map(([key, { sumServings, sumCatsDone, days }], i) => {
        const mo       = Number(key.split('-')[1]);
        const label    = monthNames[mo - 1] ?? String(mo);
        const servings = days > 0 ? Math.round(sumServings / days) : 0;
        const catsDone = days > 0 ? Math.round(sumCatsDone / days) : 0;
        return { x: i, label, date: key, servings, catsDone, total: totalTarget, totalCats };
      });
    }

    if (period === 'month') {
      return dailyData.map(({ date, i, servings, catsDone }) => {
        const label = String(new Date(date + 'T12:00:00').getDate());
        return { x: i, label, date, servings, catsDone, total: totalTarget, totalCats };
      });
    }

    // Week — day names
    return dailyData.map(({ date, i, servings, catsDone }) => {
      const label = new Date(date + 'T12:00:00').toLocaleDateString(
        lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' }
      );
      return { x: i, label, date, servings, catsDone, total: totalTarget, totalCats };
    });
  }, [entries, categories, period, today, lang]);

  const T = {
    de: { week: 'Woche', month: 'Monat', year: 'Jahr', heading: 'Verlauf', empty: 'Noch keine Daten', servings: 'Portionen',  categories: 'Kategorien' },
    en: { week: 'Week',  month: 'Month', year: 'Year',  heading: 'Progress', empty: 'No data yet',    servings: 'Servings',   categories: 'Categories' },
  };
  const t = T[lang];

  const totalTarget = categories.reduce((s, c) => s + c.target_servings, 0);
  const totalCats   = categories.length;

  const lastX                    = chartData.length > 0 ? chartData[chartData.length - 1].x : 0;
  const xDomain: [number,number] = [-0.5, lastX + 0.5];
  const xTicks                   = period === 'month'
    ? [0, 4, 9, 14, 19, 24, 29]
    : chartData.map((d) => d.x);
  const showDots                 = period !== 'month';
  const labelByX                 = Object.fromEntries(chartData.map((d) => [d.x, d.label]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeDot = (key: string, dataKey: 'servings' | 'catsDone', max: number) => (props: any) => {
    const { cx, cy, index, payload } = props;
    return (
      <circle
        key={`${key}${index}`}
        cx={cx} cy={cy} r={4.5}
        fill={dotColor(payload[dataKey], max)}
        stroke="white" strokeWidth={1.5}
      />
    );
  };

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

  const emptyH = 'h-28';

  const chartContent = loading ? (
    <div className={`${emptyH} flex items-center justify-center`}>
      <svg className="w-5 h-5 text-[#0e393d]/25 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
    </div>
  ) : chartData.every((d) => d.servings === 0 && d.catsDone === 0) ? (
    <div className={`${emptyH} flex items-center justify-center`}>
      <p className="text-sm text-[#1c2a2b]/30">{t.empty}</p>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* Left Y-axis title — Servings */}
      <div style={{
        writingMode: 'vertical-lr',
        transform: 'rotate(180deg)',
        fontSize: 10,
        fontWeight: 500,
        color: '#888780',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 4px',
        userSelect: 'none',
      }}>
        <svg width="4" height="12" style={{ display: 'block' }}>
          <line x1="2" y1="0" x2="2" y2="12" stroke="#888780" strokeWidth="1.5" />
        </svg>
        {t.servings}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 17, right: -10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,57,61,0.06)" vertical={false} />

            {chartData.map((d, i) => (
              <ReferenceArea
                key={i}
                x1={d.x - 0.5}
                x2={d.x + 0.5}
                yAxisId="left"
                fill={dayFill(d)}
                stroke="none"
              />
            ))}

            <XAxis
              dataKey="x"
              type="number"
              domain={xDomain}
              ticks={xTicks}
              tickFormatter={(v: number) => labelByX[v] ?? ''}
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, totalTarget]}
              ticks={[0, Math.round(totalTarget / 3), Math.round(totalTarget * 2 / 3), totalTarget]}
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, totalCats]}
              ticks={[0, Math.round(totalCats / 3), Math.round(totalCats * 2 / 3), totalCats]}
              tick={{ fontSize: 10, fill: '#888' }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(14,57,61,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [value, name === 'servings' ? t.servings : t.categories]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => labelByX[label as number] ?? String(label)}
            />

            <Area
              yAxisId="left"
              type="monotone"
              dataKey="servings"
              stroke="#888780"
              strokeWidth={1.5}
              fill="transparent"
              dot={showDots ? makeDot('s', 'servings', totalTarget) : false}
              activeDot={showDots ? { r: 6, strokeWidth: 0 } : false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="catsDone"
              stroke="#888780"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={showDots ? makeDot('c', 'catsDone', totalCats) : false}
              activeDot={showDots ? { r: 6, strokeWidth: 0 } : false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Right Y-axis title — Categories */}
      <div style={{
        writingMode: 'vertical-lr',
        fontSize: 10,
        fontWeight: 500,
        color: '#888780',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 4px',
        userSelect: 'none',
      }}>
        {t.categories}
        <svg width="4" height="12" style={{ display: 'block' }}>
          <line x1="2" y1="0" x2="2" y2="12" stroke="#888780" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      </div>
    </div>
  );

  return (
    <div className={compact ? 'flex flex-col flex-1' : 'rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4'}>

      {/* Header — toggle at top in non-compact mode */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">{t.heading}</p>
          {periodToggle}
        </div>
      )}

      {/* Compact: heading only at top */}
      {compact && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.heading}</p>
      )}

      {chartContent}

      {/* Toggle at bottom in compact mode */}
      {compact && (
        <div className="flex justify-center mt-2">
          {periodToggle}
        </div>
      )}
    </div>
  );
}
