'use client';

import React from 'react';
import type { MarkerStatus, MarkerDetail } from '@/lib/health-engine-v2-types';

// ── Color utilities (exact v1 match) ────────────────────────────────────────

export function scoreColor(score: number): string {
  if (score >= 88) return '#0C9C6C';
  if (score >= 70) return '#5ba37a';
  if (score >= 50) return '#C4A96A';
  return '#E06B5B';
}

export function statusColor(s: MarkerStatus): string {
  return s === 'optimal' ? '#0C9C6C' : s === 'good' ? '#5ba37a' : s === 'borderline' ? '#C4A96A' : '#E06B5B';
}

export function statusBg(s: MarkerStatus): string {
  return s === 'optimal' ? 'rgba(12,156,108,.08)' : s === 'good' ? 'rgba(91,163,122,.08)' : s === 'borderline' ? 'rgba(196,169,106,.08)' : 'rgba(224,107,91,.08)';
}

const STATUS_LABEL: Record<MarkerStatus, string> = {
  optimal: 'Optimal', good: 'Good', borderline: 'Moderate', risk: 'Risk',
};

// ── StatusBadge — colored pill (matches v1 dashboard) ───────────────────────

export function StatusBadge({ status }: { status: MarkerStatus }) {
  return (
    <span
      className="text-[10px] font-semibold px-2.5 py-[3px] rounded-full inline-flex items-center gap-1 whitespace-nowrap"
      style={{ color: statusColor(status), background: statusBg(status) }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(status) }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── ScorePill — numeric score in colored circle ─────────────────────────────

export function ScorePill({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-[11px]';
  return (
    <span
      className={`${dim} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ background: scoreColor(score) }}
    >
      {score}
    </span>
  );
}

// ── MiniRangeBar — reference + optimal range bar (matches v1 dashboard) ─────

function rPct(v: number, rL: number | null, rH: number | null): number {
  const lo = (rL ?? 0) * 0.7;
  const hi = (rH ?? v * 2) * 1.3;
  if (hi === lo) return 50;
  return Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100));
}

export function MiniRangeBar({ value, refLow, refHigh, optLow, optHigh, status }: {
  value: number; refLow: number | null; refHigh: number | null;
  optLow: number | null; optHigh: number | null; status: MarkerStatus;
}) {
  const pct = rPct(value, refLow, refHigh);
  const lo = (refLow ?? 0) * 0.7;
  const hi = (refHigh ?? value * 2) * 1.3;
  const range = hi - lo || 1;
  const oL = optLow != null ? Math.max(0, ((optLow - lo) / range) * 100) : 0;
  const oW = optLow != null && optHigh != null ? Math.max(4, ((optHigh - optLow) / range) * 100) : 0;

  return (
    <div className="relative h-[6px] rounded-full bg-[#f0ede8] overflow-hidden">
      {oW > 0 && (
        <div className="absolute top-0 h-full rounded-full bg-[#0C9C6C]/[.12]"
          style={{ left: `${oL}%`, width: `${Math.min(oW, 100 - oL)}%` }} />
      )}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm border-[1.5px] border-white z-10"
        style={{ left: `${pct}%`, background: statusColor(status) }}
      />
    </div>
  );
}

// ── Sparkline — smooth SVG curve (matches v1 dashboard) ─────────────────────

export function Sparkline({ vals, color, height = 28 }: { vals: (number | null)[]; color: string; height?: number }) {
  const filtered = vals.filter((v): v is number => v !== null);
  if (filtered.length < 2) return <div style={{ height }} />;
  const W = 100, H = height;
  const mn = Math.min(...filtered), mx = Math.max(...filtered);
  const rng = mx - mn || 1;
  const pad = 4;
  const pts = filtered.map((v, i) => ({
    x: (i / (filtered.length - 1)) * (W - pad * 2) + pad,
    y: H - pad - (((v - mn) / rng) * (H - pad * 2)),
  }));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx2 = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${mx2},${pts[i - 1].y} ${mx2},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
      <circle cx={last.x} cy={last.y} r={3} fill={color} />
    </svg>
  );
}

// ── SectionTag — gold label with line (matches v1 dashboard) ────────────────

export function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84]">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-[#ceab84]/20 to-transparent" />
    </div>
  );
}

// ── TrendChart — marker value over time with reference/optimal bands ────────

function TrendChart({ m, height = 80 }: { m: MarkerDetail; height?: number }) {
  const { dates, values } = m.trend;
  if (!dates || values.length < 2) return null;

  const W = 200, H = height, padX = 6, padY = 8;

  // Determine Y-axis range including reference bounds
  const allVals = [...values];
  if (m.refLow != null) allVals.push(m.refLow);
  if (m.refHigh != null) allVals.push(m.refHigh);
  if (m.optLow != null) allVals.push(m.optLow);
  if (m.optHigh != null) allVals.push(m.optHigh);
  const mn = Math.min(...allVals);
  const mx = Math.max(...allVals);
  const rng = mx - mn || 1;
  const yPad = rng * 0.12;
  const yMin = mn - yPad;
  const yMax = mx + yPad;
  const yRange = yMax - yMin;

  const toY = (v: number) => H - padY - ((v - yMin) / yRange) * (H - padY * 2);
  const toX = (i: number) => padX + (i / (values.length - 1)) * (W - padX * 2);

  // Build data points
  const pts = values.map((v, i) => ({ x: toX(i), y: toY(v) }));

  // Smooth path
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx2 = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${mx2},${pts[i - 1].y} ${mx2},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }

  // Reference and optimal range band Y-coordinates
  const refLowY = m.refLow != null ? toY(m.refLow) : null;
  const refHighY = m.refHigh != null ? toY(m.refHigh) : null;
  const optLowY = m.optLow != null ? toY(m.optLow) : null;
  const optHighY = m.optHigh != null ? toY(m.optHigh) : null;

  // Date labels
  const fmtDate = (d: string) => {
    const p = d.split('-');
    return p.length >= 2 ? `${p[2]}.${p[1]}.${p[0]?.slice(2)}` : d;
  };

  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      {/* Optimal range band */}
      {optLowY != null && optHighY != null && (
        <rect x={padX} y={optHighY} width={W - padX * 2} height={optLowY - optHighY}
          fill="#0C9C6C" opacity={0.06} rx={2} />
      )}
      {/* Reference range dashed lines */}
      {refHighY != null && (
        <line x1={padX} y1={refHighY} x2={W - padX} y2={refHighY}
          stroke="#0C9C6C" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
      )}
      {refLowY != null && (
        <line x1={padX} y1={refLowY} x2={W - padX} y2={refLowY}
          stroke="#0C9C6C" strokeWidth={0.5} strokeDasharray="3,3" opacity={0.35} />
      )}
      {/* Trend line */}
      <path d={d} fill="none" stroke="#0e393d" strokeWidth={1.5} />
      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#0e393d" />
      ))}
      {/* Highlight last point */}
      <circle cx={last.x} cy={last.y} r={3.5} fill="#0C9C6C" />
      {/* Date labels — first and last only */}
      {dates.length >= 2 && (
        <>
          <text x={pts[0].x} y={H - 1} fontSize="6" fill="#1c2a2b" opacity={0.3} textAnchor="start">{fmtDate(dates[0])}</text>
          <text x={last.x} y={H - 1} fontSize="6" fill="#1c2a2b" opacity={0.3} textAnchor="end">{fmtDate(dates[dates.length - 1])}</text>
        </>
      )}
    </svg>
  );
}

// ── MarkerCard — individual biomarker card (matches v1 key markers) ─────────

export function MarkerCard({ m, compact = false }: { m: MarkerDetail; compact?: boolean }) {
  const hasTrend = m.trend?.values?.length >= 2;

  return (
    <div
      className="bg-white rounded-xl border border-[#1c2a2b]/[.06] shadow-sm transition-all hover:shadow-md"
      style={{ borderTop: `3px solid ${statusColor(m.status)}` }}
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-center justify-between mb-1">
          <span className={`${compact ? 'text-[11px]' : 'text-[12px]'} font-semibold text-[#0e393d] leading-snug truncate mr-2`}>{m.name}</span>
          <StatusBadge status={m.status} />
        </div>
        {m.value != null && (
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-serif ${compact ? 'text-[1.15rem]' : 'text-[1.4rem]'} leading-none text-[#1c2a2b]`}>
              {m.value.toLocaleString('de-CH', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-[#1c2a2b]/40">{m.unit}</span>
          </div>
        )}
        <div className="mt-1.5 mb-1">
          <MiniRangeBar value={m.value ?? 0} refLow={m.refLow} refHigh={m.refHigh}
            optLow={m.optLow} optHigh={m.optHigh} status={m.status} />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#1c2a2b]/35">
            Score: <span className="font-bold" style={{ color: scoreColor(m.score) }}>{m.score}</span>
          </span>
          {m.delta != null && (
            <span style={{ color: m.delta >= 0 ? '#0C9C6C' : '#C4A96A' }}>
              {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(1)} {m.unit}
            </span>
          )}
        </div>
        {/* Trend chart */}
        {hasTrend && (
          <div className="mt-2 pt-2 border-t border-[#0e393d]/[.04]">
            <p className="text-[8px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-1">Trend</p>
            <TrendChart m={m} height={compact ? 55 : 70} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── MarkerRow — compact horizontal row for all-markers list ─────────────────

export function MarkerRow({ m }: { m: MarkerDetail }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-[#fafaf8] hover:bg-[#f5f3ee] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium text-[#0e393d] truncate">{m.name}</div>
        <div className="flex items-center gap-2 text-[10px] text-[#1c2a2b]/45">
          <span>{m.value?.toLocaleString('de-CH', { maximumFractionDigits: 2 })} {m.unit}</span>
          {m.delta != null && (
            <span style={{ color: m.delta >= 0 ? '#0C9C6C' : '#C4A96A' }}>
              (&Delta;: {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(1)})
            </span>
          )}
        </div>
      </div>
      <ScorePill score={m.score} />
    </div>
  );
}

// ── DeltaTag — trend arrow with delta value ─────────────────────────────────

export function DeltaTag({ current, previous }: { current: number; previous: number | null }) {
  if (previous == null) return null;
  const d = current - previous;
  const positive = d >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${positive ? 'text-[#0C9C6C]' : 'text-[#E06B5B]'}`}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
        {positive
          ? <path d="M5 2l4 6H1z" />
          : <path d="M5 8L1 2h8z" />
        }
      </svg>
      {positive ? '+' : ''}{d.toFixed(1)}
    </span>
  );
}
