'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Dot,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

type DataPoint = {
  date: string;
  value: number;
  statusFlag: string | null;
};

interface Props {
  userId: string;
  definitionId: string;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  optLow: number | null;
  optHigh: number | null;
}

function dotColor(flag: string | null): string {
  switch (flag) {
    case 'optimal': return '#0C9C6C';
    case 'good': return '#2ecc71';
    case 'moderate': return '#C4A96A';
    case 'risk': return '#E06B5B';
    default: return '#0e393d';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={5}
      fill={dotColor(payload?.statusFlag)}
      stroke="white"
      strokeWidth={1.5}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BiomarkerTrendChart({
  userId,
  definitionId,
  unit,
  refLow,
  refHigh,
  optLow,
  optHigh,
}: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('lab_results')
      .select('value_numeric, status_flag, measured_at')
      .eq('user_id', userId)
      .eq('biomarker_definition_id', definitionId)
      .is('deleted_at', null)
      .order('measured_at', { ascending: true })
      .then(({ data: rows }) => {
        setData(
          (rows ?? [])
            .filter((r) => r.value_numeric != null)
            .map((r) => ({
              date: new Date(r.measured_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' }),
              value: Number(r.value_numeric),
              statusFlag: r.status_flag,
            })),
        );
        setLoading(false);
      });
  }, [userId, definitionId]);

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#0e393d]/20 border-t-[#0e393d] animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center text-sm text-[#1c2a2b]/40">
        No historical data yet.
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className="h-20 flex items-center justify-center text-sm text-[#1c2a2b]/40">
        Only one measurement — more data needed for a trend.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, refLow ?? Infinity, optLow ?? Infinity);
  const maxVal = Math.max(...values, refHigh ?? -Infinity, optHigh ?? -Infinity);
  const pad = (maxVal - minVal) * 0.2 || 1;
  const yMin = Math.floor(minVal - pad);
  const yMax = Math.ceil(maxVal + pad);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,57,61,0.06)" />

        {/* Normal range band */}
        {refLow != null && refHigh != null && (
          <ReferenceArea
            y1={refLow}
            y2={refHigh}
            fill="rgba(12,156,108,0.08)"
            stroke="rgba(12,156,108,0.20)"
            strokeWidth={1}
          />
        )}

        {/* Optimal range band */}
        {optLow != null && optHigh != null && (
          <ReferenceArea
            y1={optLow}
            y2={optHigh}
            fill="rgba(196,169,106,0.15)"
            stroke="rgba(196,169,106,0.30)"
            strokeWidth={1}
          />
        )}

        {/* Range boundary lines */}
        {refLow != null && (
          <ReferenceLine y={refLow} stroke="rgba(12,156,108,0.4)" strokeDasharray="4 2" />
        )}
        {refHigh != null && (
          <ReferenceLine y={refHigh} stroke="rgba(12,156,108,0.4)" strokeDasharray="4 2" />
        )}

        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#888' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: '#888' }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v) => `${v} ${unit}`}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(14,57,61,0.12)' }}
          formatter={(value) => [`${value} ${unit}`, 'Value']}
        />

        <Line
          type="monotone"
          dataKey="value"
          stroke="#0e393d"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
