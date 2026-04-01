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

// ── MarkerCard — individual biomarker card (matches v1 key markers) ─────────

export function MarkerCard({ m, compact = false }: { m: MarkerDetail; compact?: boolean }) {
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
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className={`font-serif ${compact ? 'text-[1.4rem]' : 'text-[1.7rem]'} leading-none text-[#1c2a2b]`}>
              {m.value.toLocaleString('de-CH', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-[#1c2a2b]/40">{m.unit}</span>
          </div>
        )}
        <div className="mt-2 mb-1.5">
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
