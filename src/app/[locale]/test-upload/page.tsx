'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

// ── Gauge constants ─────────────────────────────────────────────────────────────
const CX = 130, CY = 115, SEGS = 12, GAP_DEG = 2.5, START_DEG = 135, ARC_SPAN = 270;
const SEG_ARC = (ARC_SPAN - (SEGS - 1) * GAP_DEG) / SEGS; // ≈ 20.208°
const R_MID = 85, MIN_THICK = 10, MAX_THICK = 26;

function toRad(d: number) { return d * Math.PI / 180; }

function gaugePx(r: number, d: number): [number, number] {
  const a = toRad(d);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function segStartDeg(i: number) { return START_DEG + i * (SEG_ARC + GAP_DEG); }

function segPath(i: number): string {
  const s = segStartDeg(i), e = s + SEG_ARC;
  const t = i / (SEGS - 1);
  const thick = MIN_THICK + t * (MAX_THICK - MIN_THICK);
  const rO = R_MID + thick / 2, rI = R_MID - thick / 2;
  const [x1, y1] = gaugePx(rO, s), [x2, y2] = gaugePx(rO, e);
  const [x3, y3] = gaugePx(rI, e), [x4, y4] = gaugePx(rI, s);
  return (
    `M${x1.toFixed(1)},${y1.toFixed(1)} ` +
    `A${rO},${rO} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} ` +
    `L${x3.toFixed(1)},${y3.toFixed(1)} ` +
    `A${rI},${rI} 0 0,0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`
  );
}

function tierColor(score: number): string {
  if (score >= 24) return '#0C9C6C';
  if (score >= 16) return '#C4A96A';
  return '#FAEEDA';
}

function glowArcPath(): string {
  const [x1, y1] = gaugePx(R_MID, START_DEG);
  const [x2, y2] = gaugePx(R_MID, START_DEG + ARC_SPAN);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R_MID},${R_MID} 0 1,1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

// ── TestGauge component ──────────────────────────────────────────────────────────
function TestGauge({ score, perfect }: { score: number; perfect?: boolean }) {
  const filledCount = Math.round((score / 24) * SEGS);
  const color = tierColor(score);
  const isPerfect = perfect || score >= 24;

  const needleDeg = START_DEG + (score / 24) * ARC_SPAN;
  const tipR = R_MID - MIN_THICK / 2 + 4;
  const nRad = toRad(needleDeg);
  const ndx = Math.cos(nRad), ndy = Math.sin(nRad);

  const tipX  = CX + tipR * ndx,  tipY  = CY + tipR * ndy;
  const lbX   = CX + 4 * (-ndy), lbY   = CY + 4 * ndx;
  const rbX   = CX - 4 * (-ndy), rbY   = CY - 4 * ndx;
  const tlX   = CX - 10 * ndx,   tlY   = CY - 10 * ndy;
  const needlePath =
    `M${tipX.toFixed(1)},${tipY.toFixed(1)} ` +
    `L${lbX.toFixed(1)},${lbY.toFixed(1)} ` +
    `L${tlX.toFixed(1)},${tlY.toFixed(1)} ` +
    `L${rbX.toFixed(1)},${rbY.toFixed(1)} Z`;

  const labelR = R_MID + MAX_THICK / 2 + 12;
  const [l0x,  l0y]  = gaugePx(labelR, START_DEG);
  const [l24x, l24y] = gaugePx(labelR, START_DEG + ARC_SPAN);

  return (
    <svg viewBox="0 0 260 210" width="100%" style={{ overflow: 'visible' }}>
      {isPerfect && (
        <>
          <style>{`@keyframes pulseGlow{0%,100%{opacity:.06}50%{opacity:.2}}`}</style>
          <path
            d={glowArcPath()}
            fill="none"
            stroke="#0C9C6C"
            strokeWidth={MAX_THICK + 16}
            strokeLinecap="round"
            style={{ animation: 'pulseGlow 2.5s ease-in-out infinite' }}
          />
        </>
      )}

      {Array.from({ length: SEGS }, (_, i) => (
        <path key={i} d={segPath(i)} fill={i < filledCount ? color : 'rgba(14,57,61,0.06)'} />
      ))}

      <text
        x={CX}
        y={CY + 58}
        textAnchor="middle"
        fontSize={46}
        fontWeight={700}
        fill={isPerfect ? '#0C9C6C' : '#0e393d'}
        style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}
      >
        {score}
      </text>

      <text x={l0x.toFixed(1)}  y={l0y.toFixed(1)}  textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#aaa">0</text>
      <text x={l24x.toFixed(1)} y={l24y.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#aaa">24</text>

      <path d={needlePath} fill="#1c2a2b" opacity={0.65} />
      <circle cx={CX} cy={CY} r={6}   fill="#1c2a2b" opacity={0.15} />
      <circle cx={CX} cy={CY} r={3.5} fill="white"   stroke="#1c2a2b" strokeWidth={1} opacity={0.8} />
    </svg>
  );
}

// ── Chart data ───────────────────────────────────────────────────────────────────
type ChartPoint = { x: number; label: string; servings: number; categories: number };

const WEEK_DATA: ChartPoint[] = [
  { x: 0, label: 'Sun', servings: 24, categories: 12 },
  { x: 1, label: 'Mon', servings: 24, categories: 12 },
  { x: 2, label: 'Tue', servings: 22, categories: 10 },
  { x: 3, label: 'Wed', servings: 24, categories: 12 },
  { x: 4, label: 'Thu', servings: 24, categories: 12 },
  { x: 5, label: 'Fri', servings: 23, categories: 11 },
  { x: 6, label: 'Sat', servings: 18, categories:  8 },
];

const MONTH_DATA: ChartPoint[] = [
  { x:  0, label:  '1', servings: 20, categories: 10 },
  { x:  1, label:  '2', servings: 24, categories: 12 },
  { x:  2, label:  '3', servings: 24, categories: 12 },
  { x:  3, label:  '4', servings: 18, categories:  9 },
  { x:  4, label:  '5', servings: 22, categories: 11 },
  { x:  5, label:  '6', servings: 24, categories: 12 },
  { x:  6, label:  '7', servings: 16, categories:  8 },
  { x:  7, label:  '8', servings: 24, categories: 12 },
  { x:  8, label:  '9', servings: 20, categories: 10 },
  { x:  9, label: '10', servings: 12, categories:  6 },
  { x: 10, label: '11', servings: 24, categories: 12 },
  { x: 11, label: '12', servings: 22, categories: 11 },
  { x: 12, label: '13', servings: 24, categories: 12 },
  { x: 13, label: '14', servings: 20, categories: 10 },
  { x: 14, label: '15', servings: 18, categories:  9 },
  { x: 15, label: '16', servings: 24, categories: 12 },
  { x: 16, label: '17', servings: 22, categories: 11 },
  { x: 17, label: '18', servings:  8, categories:  4 },
  { x: 18, label: '19', servings: 24, categories: 12 },
  { x: 19, label: '20', servings: 24, categories: 12 },
  { x: 20, label: '21', servings: 20, categories: 10 },
  { x: 21, label: '22', servings: 16, categories:  8 },
  { x: 22, label: '23', servings: 24, categories: 12 },
  { x: 23, label: '24', servings: 22, categories: 11 },
  { x: 24, label: '25', servings: 24, categories: 12 },
  { x: 25, label: '26', servings: 18, categories:  9 },
  { x: 26, label: '27', servings: 24, categories: 12 },
  { x: 27, label: '28', servings: 20, categories: 10 },
  { x: 28, label: '29', servings: 22, categories: 11 },
  { x: 29, label: '30', servings: 24, categories: 12 },
];

const YEAR_DATA: ChartPoint[] = [
  { x:  0, label: 'Jan', servings: 18, categories:  9 },
  { x:  1, label: 'Feb', servings: 20, categories: 10 },
  { x:  2, label: 'Mar', servings: 22, categories: 11 },
  { x:  3, label: 'Apr', servings: 14, categories:  7 },
  { x:  4, label: 'May', servings: 24, categories: 12 },
  { x:  5, label: 'Jun', servings: 22, categories: 11 },
  { x:  6, label: 'Jul', servings: 20, categories: 10 },
  { x:  7, label: 'Aug', servings: 12, categories:  6 },
  { x:  8, label: 'Sep', servings: 18, categories:  9 },
  { x:  9, label: 'Oct', servings: 22, categories: 11 },
  { x: 10, label: 'Nov', servings: 24, categories: 12 },
  { x: 11, label: 'Dec', servings: 20, categories: 10 },
];

function dayFill(s: number, c: number): string {
  if (s >= 24 && c >= 12) return 'rgba(12,156,108,0.18)';
  if (s >= 16)             return 'rgba(196,169,106,0.15)';
  return 'rgba(250,238,218,0.35)';
}

function dotColor(v: number, max: number): string {
  if (v >= max)        return '#0C9C6C';
  if (v / max >= 0.67) return '#C4A96A';
  return '#FAEEDA';
}

// ── Page ─────────────────────────────────────────────────────────────────────────
export default function TestGaugePage() {
  const [tab, setTab] = useState<'week' | 'month' | 'year'>('week');

  const tiers = [
    { label: 'GETTING STARTED', range: '0 – 15 servings', score: 10, msg: 'Keep going!',   msgColor: '#C4A96A', perfect: false },
    { label: 'ALMOST THERE',    range: '16 – 23 servings', score: 23, msg: 'Almost there!', msgColor: '#C4A96A', perfect: false },
    { label: 'PERFECT DAY',     range: '24 / 24 servings', score: 24, msg: 'All done!',     msgColor: '#0C9C6C', perfect: true  },
  ];

  // ── Per-tab chart config ──────────────────────────────────────────────────────
  const chartData    = tab === 'week' ? WEEK_DATA : tab === 'month' ? MONTH_DATA : YEAR_DATA;
  const lastX        = chartData[chartData.length - 1].x;
  const xDomain: [number, number] = [-0.5, lastX + 0.5];
  const xTicks       = tab === 'month'
    ? [0, 4, 9, 14, 19, 24, 29]   // every ~5 days: 1, 5, 10, 15, 20, 25, 30
    : chartData.map((d) => d.x);
  const showDots     = tab !== 'month';

  const labelByX = Object.fromEntries(chartData.map((d) => [d.x, d.label]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeDot = (key: string, dataKey: 'servings' | 'categories', max: number) => (props: any) => {
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

  return (
    <div style={{ fontFamily: '-apple-system, system-ui, sans-serif', background: '#fafaf8', padding: 30, maxWidth: 900, margin: '0 auto' }}>

      {/* ── Three tier previews ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        {tiers.map((tier) => (
          <div
            key={tier.label}
            style={{
              background: 'white',
              border: `1px solid ${tier.perfect ? 'rgba(12,156,108,0.25)' : 'rgba(14,57,61,0.1)'}`,
              borderRadius: 12,
              padding: 10,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: '#888', marginBottom: 2 }}>
              {tier.label}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>{tier.range}</div>
            <TestGauge score={tier.score} perfect={tier.perfect} />
            <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, color: tier.msgColor }}>{tier.msg}</div>
          </div>
        ))}
      </div>

      {/* ── Main gauge + chart ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'stretch' }}>

        {/* Gauge card */}
        <div style={{ background: 'white', border: '1px solid rgba(14,57,61,0.1)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#CEAB84', marginBottom: 10 }}>
            DAILY DOZEN SCORE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: 260 }}>
              <TestGauge score={23} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              {[
                { value: '11/12',  label: 'categories', color: '#C4A96A' },
                { value: '96%',    label: 'score',      color: '#0e393d' },
                { value: '5 days', label: 'streak',     color: '#0e393d' },
              ].map((stat) => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '5px 12px', background: '#f5f4f0', borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8, fontSize: 12, color: '#888' }}>
              1 serving away from a perfect day
            </div>
          </div>
        </div>

        {/* Chart card */}
        <div style={{ background: 'white', border: '1px solid rgba(14,57,61,0.1)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#CEAB84', marginBottom: 10 }}>
            Progress
          </div>

          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            {/* Left Y-axis title */}
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
              Servings
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 17, right: -10, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,57,61,0.06)" vertical={false} />

                  {chartData.map((d, i) => (
                    <ReferenceArea
                      key={i}
                      x1={i - 0.5}
                      x2={i + 0.5}
                      yAxisId="left"
                      fill={dayFill(d.servings, d.categories)}
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
                    domain={[0, 24]}
                    ticks={[0, 8, 16, 24]}
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 12]}
                    ticks={[0, 4, 8, 12]}
                    tick={{ fontSize: 10, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid rgba(14,57,61,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => [value, name === 'servings' ? 'Servings' : 'Categories']}
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
                    dot={showDots ? makeDot('s', 'servings', 24) : false}
                    activeDot={showDots ? { r: 6, strokeWidth: 0 } : false}
                  />

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="categories"
                    stroke="#888780"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    dot={showDots ? makeDot('c', 'categories', 12) : false}
                    activeDot={showDots ? { r: 6, strokeWidth: 0 } : false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Right Y-axis title */}
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
              Categories
              <svg width="4" height="12" style={{ display: 'block' }}>
                <line x1="2" y1="0" x2="2" y2="12" stroke="#888780" strokeWidth="1.5" strokeDasharray="3 2" />
              </svg>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex justify-center mt-3">
            <div className="flex rounded-full bg-[#0e393d]/[0.06] p-0.5 gap-0.5">
              {(['week', 'month', 'year'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    tab === t
                      ? 'bg-white text-[#0e393d] shadow-sm'
                      : 'text-[#1c2a2b]/50 hover:text-[#0e393d]'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
