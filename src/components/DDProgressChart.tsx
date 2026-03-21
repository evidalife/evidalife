'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year';
type Lang   = 'de' | 'en';

type RawEntry = { category_id: string; entry_date: string; servings_completed: number };
type ChartPoint = {
  label:        string;
  date:         string;
  servings:     number;   // actual capped servings
  categories:   number;   // completed categories count
  pct:          number;   // servings %
  totalServings:number;
  totalCats:    number;
};

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

function tierColor(pct: number): string {
  if (pct >= 100) return '#0C9C6C';
  if (pct >= 67)  return '#C4A96A';
  if (pct > 0)    return '#FAEEDA';
  return 'transparent';
}

// ─── Custom dot (colored by tier) ────────────────────────────────────────────

function ServingsDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload || payload.servings === 0) return null;
  const color = tierColor(payload.pct);
  if (color === 'transparent') return null;
  return (
    <circle
      cx={cx} cy={cy} r={3}
      fill={color}
      stroke={payload.pct >= 100 ? '#0C9C6C' : payload.pct >= 67 ? '#C4A96A' : '#ceab84'}
      strokeWidth={1}
    />
  );
}

function CatsDot(props: { cx?: number; cy?: number; payload?: ChartPoint }) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload || payload.categories === 0) return null;
  return <circle cx={cx} cy={cy} r={2.5} fill="#0e393d66" stroke="none" />;
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, lang,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  lang: Lang;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-[#0e393d] px-2.5 py-1.5 text-white text-[10px] shadow-lg whitespace-nowrap space-y-0.5">
      <div>
        <span className="font-semibold">{d.servings}</span>
        <span className="text-white/50"> / {d.totalServings} {lang === 'de' ? 'Port.' : 'serv.'}</span>
      </div>
      <div>
        <span className="font-semibold">{d.categories}</span>
        <span className="text-white/50"> / {d.totalCats} {lang === 'de' ? 'Kat.' : 'cat.'}</span>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DDProgressChart({
  userId, categories, today, lang, compact = false, refreshKey = 0,
}: Props) {
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

  const chartData = useMemo((): ChartPoint[] => {
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

    // Index entries
    const byDate: Record<string, Record<string, number>> = {};
    for (const e of entries) {
      if (!byDate[e.entry_date]) byDate[e.entry_date] = {};
      byDate[e.entry_date][e.category_id] = e.servings_completed;
    }

    const daily = dateRange.map((date) => {
      const day = byDate[date] ?? {};
      const servings      = categories.reduce((s, c) => s + Math.min(day[c.id] ?? 0, c.target_servings), 0);
      const completedCats = categories.filter((c) => (day[c.id] ?? 0) >= c.target_servings).length;
      const pct           = totalTarget > 0 ? Math.round((servings / totalTarget) * 100) : 0;
      return { date, servings, categories: completedCats, pct };
    });

    if (period === 'year') {
      const months: Record<string, { sumServ: number; sumCats: number; sumPct: number; days: number }> = {};
      for (const d of daily) {
        const key = d.date.substring(0, 7);
        if (!months[key]) months[key] = { sumServ: 0, sumCats: 0, sumPct: 0, days: 0 };
        months[key].sumServ += d.servings;
        months[key].sumCats += d.categories;
        months[key].sumPct  += d.pct;
        months[key].days++;
      }
      return Object.entries(months).map(([key, v]) => {
        const mo  = Number(key.split('-')[1]);
        const avg = v.days > 0;
        return {
          label:         String(mo),
          date:          key,
          servings:      avg ? Math.round(v.sumServ / v.days) : 0,
          categories:    avg ? Math.round(v.sumCats / v.days) : 0,
          pct:           avg ? Math.round(v.sumPct  / v.days) : 0,
          totalServings: totalTarget,
          totalCats,
        };
      });
    }

    if (period === 'month') {
      return daily.map(({ date, servings, categories: cats, pct }) => ({
        label:         String(new Date(date + 'T12:00:00').getDate()),
        date, servings, categories: cats, pct,
        totalServings: totalTarget, totalCats,
      }));
    }

    // Week — day names
    return daily.map(({ date, servings, categories: cats, pct }) => ({
      label: new Date(date + 'T12:00:00').toLocaleDateString(
        lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' }
      ),
      date, servings, categories: cats, pct,
      totalServings: totalTarget, totalCats,
    }));
  }, [entries, categories, period, today, lang]);

  const totalTarget = categories.reduce((s, c) => s + c.target_servings, 0);
  const totalCats   = categories.length;

  const T = {
    de: { week: 'Woche', month: 'Monat', year: 'Jahr', heading: 'Verlauf', empty: 'Noch keine Daten' },
    en: { week: 'Week',  month: 'Month', year: 'Year',  heading: 'Progress', empty: 'No data yet' },
  };
  const t = T[lang];

  const chartH  = compact ? 120 : 112;
  const emptyH  = 'h-28';
  const hasData = chartData.some((d) => d.servings > 0);
  const showDots = period !== 'month';

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
    <div className={compact ? 'flex flex-col flex-1' : 'rounded-2xl border border-[#0e393d]/10 bg-white px-5 py-4'}>

      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">{t.heading}</p>
          {periodToggle}
        </div>
      )}
      {compact && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-4">{t.heading}</p>
      )}

      {/* Legend — non-compact only */}
      {!compact && (
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-[#C4A96A] rounded" />
            <span className="text-[10px] text-[#1c2a2b]/45">{lang === 'de' ? 'Portionen' : 'Servings'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="16" height="4" viewBox="0 0 16 4">
              <line x1="0" y1="2" x2="16" y2="2" stroke="#0e393d66" strokeWidth="1.5" strokeDasharray="3 2" />
            </svg>
            <span className="text-[10px] text-[#1c2a2b]/45">{lang === 'de' ? 'Kategorien' : 'Categories'}</span>
          </div>
        </div>
      )}

      {/* Chart area */}
      {loading ? (
        <div className={`${emptyH} flex items-center justify-center`}>
          <svg className="w-5 h-5 text-[#0e393d]/25 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      ) : !hasData ? (
        <div className={`${emptyH} flex items-center justify-center`}>
          <p className="text-sm text-[#1c2a2b]/30">{t.empty}</p>
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={chartH}>
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="servingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#C4A96A" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="#C4A96A" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#1c2a2b55' }}
                axisLine={false}
                tickLine={false}
              />
              {/* Left axis: servings (hidden, just for scale) */}
              <YAxis yAxisId="left"  domain={[0, totalTarget]} hide width={0} />
              {/* Right axis: categories (hidden, just for scale) */}
              <YAxis yAxisId="right" domain={[0, totalCats]}   hide width={0} orientation="right" />

              <Tooltip
                content={<ChartTooltip lang={lang} />}
                cursor={{ stroke: '#0e393d18', strokeWidth: 1 }}
              />

              {/* Servings area — solid line, gradient fill */}
              <Area
                yAxisId="left"
                dataKey="servings"
                stroke="#C4A96A"
                strokeWidth={1.5}
                fill="url(#servingsGrad)"
                dot={showDots ? <ServingsDot /> : false}
                activeDot={{ r: 4, fill: '#C4A96A', stroke: 'white', strokeWidth: 1.5 }}
                isAnimationActive={false}
              />

              {/* Categories line — dashed */}
              <Line
                yAxisId="right"
                dataKey="categories"
                stroke="#0e393d55"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={showDots ? <CatsDot /> : false}
                activeDot={{ r: 3, fill: '#0e393d66', stroke: 'none' }}
                isAnimationActive={false}
              />
            </ComposedChart>
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
