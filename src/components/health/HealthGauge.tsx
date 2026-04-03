// ── HealthGauge ───────────────────────────────────────────────────────────────
// Reusable tachometer-style gauge — extracted from DDGauge geometry.
// Pure SVG, no hooks needed.

const CX = 130, CY = 115;
const SEGS = 12, GAP_DEG = 2.5, START_DEG = 135, ARC_SPAN = 270;
const SEG_ARC = (ARC_SPAN - (SEGS - 1) * GAP_DEG) / SEGS;
const R_MID = 85, MIN_THICK = 10, MAX_THICK = 26;

function toRad(d: number) { return (d * Math.PI) / 180; }

function gaugePx(r: number, deg: number): [number, number] {
  const a = toRad(deg);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function segPath(i: number): string {
  const s = START_DEG + i * (SEG_ARC + GAP_DEG);
  const e = s + SEG_ARC;
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

// Health-appropriate tier colors
function tierColor(ratio: number): string {
  if (ratio >= 0.75) return '#0C9C6C'; // green — optimal/good
  if (ratio >= 0.50) return '#C4A96A'; // gold — moderate
  return '#E06B5B';                     // red — risk
}

function glowPath(): string {
  const [x1, y1] = gaugePx(R_MID, START_DEG);
  const [x2, y2] = gaugePx(R_MID, START_DEG + ARC_SPAN);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R_MID},${R_MID} 0 1,1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 110,
  md: 170,
  lg: 220,
};

interface Props {
  score: number;   // 0–100
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  subLabel?: string;
  delta?: number | null;
  /** When true, renders for dark backgrounds (white text, lighter unfilled segments) */
  dark?: boolean;
}

export default function HealthGauge({ score, size = 'lg', label, subLabel, delta, dark }: Props) {
  const ratio = Math.min(Math.max(score, 0), 100) / 100;
  const filledCount = Math.round(ratio * SEGS);
  const color = tierColor(ratio);
  const isPerfect = score >= 100;
  const maxPx = SIZE_PX[size];

  // Needle
  const needleDeg = START_DEG + ratio * ARC_SPAN;
  const tipR = R_MID - MIN_THICK / 2 + 4;
  const nRad = toRad(needleDeg);
  const ndx = Math.cos(nRad), ndy = Math.sin(nRad);
  const tipX = CX + tipR * ndx, tipY = CY + tipR * ndy;
  const lbX = CX + 4 * (-ndy), lbY = CY + 4 * ndx;
  const rbX = CX - 4 * (-ndy), rbY = CY - 4 * ndx;
  const tlX = CX - 10 * ndx, tlY = CY - 10 * ndy;
  const needlePath =
    `M${tipX.toFixed(1)},${tipY.toFixed(1)} ` +
    `L${lbX.toFixed(1)},${lbY.toFixed(1)} ` +
    `L${tlX.toFixed(1)},${tlY.toFixed(1)} ` +
    `L${rbX.toFixed(1)},${rbY.toFixed(1)} Z`;

  // End labels
  const labelR = R_MID + MAX_THICK / 2 + 12;
  const [l0x, l0y] = gaugePx(labelR, START_DEG);
  const [lTx, lTy] = gaugePx(labelR, START_DEG + ARC_SPAN);

  const fontSize = size === 'sm' ? 38 : size === 'md' ? 42 : 46;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 260 210"
        width="100%"
        style={{ overflow: 'visible', maxWidth: maxPx }}
      >
        {isPerfect && (
          <>
            <style>{`@keyframes hgPulse{0%,100%{opacity:.06}50%{opacity:.18}}`}</style>
            <path
              d={glowPath()}
              fill="none"
              stroke="#0C9C6C"
              strokeWidth={MAX_THICK + 16}
              strokeLinecap="round"
              style={{ animation: 'hgPulse 2.5s ease-in-out infinite' }}
            />
          </>
        )}

        {Array.from({ length: SEGS }, (_, i) => (
          <path
            key={i}
            d={segPath(i)}
            fill={i < filledCount ? color : dark ? 'rgba(255,255,255,0.08)' : 'rgba(14,57,61,0.06)'}
          />
        ))}

        <text
          x={CX}
          y={CY + 58}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight={700}
          fill={isPerfect ? '#0C9C6C' : dark ? '#ffffff' : '#0e393d'}
          style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}
        >
          {score}
        </text>

        {delta != null && delta !== 0 && (
          <g>
            <text
              x={CX}
              y={CY + 78}
              textAnchor="middle"
              fontSize={size === 'sm' ? 11 : 13}
              fontWeight={600}
              fill={delta > 0 ? '#0C9C6C' : '#E06B5B'}
            >
              {delta > 0 ? '▲' : '▼'} {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </text>
          </g>
        )}

        <text
          x={l0x.toFixed(1)}
          y={l0y.toFixed(1)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill={dark ? 'rgba(255,255,255,0.35)' : '#aaa'}
        >
          0
        </text>
        <text
          x={lTx.toFixed(1)}
          y={lTy.toFixed(1)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fill={dark ? 'rgba(255,255,255,0.35)' : '#aaa'}
        >
          100
        </text>

        <path d={needlePath} fill={dark ? '#ffffff' : '#1c2a2b'} opacity={dark ? 0.5 : 0.65} />
        <circle cx={CX} cy={CY} r={6} fill={dark ? '#ffffff' : '#1c2a2b'} opacity={0.15} />
        <circle cx={CX} cy={CY} r={3.5} fill="white" stroke={dark ? 'rgba(255,255,255,0.4)' : '#1c2a2b'} strokeWidth={1} opacity={0.8} />
      </svg>

      {label && (
        <p className="text-center font-medium text-[#0e393d] mt-1" style={{ fontSize: size === 'sm' ? 11 : 13 }}>
          {label}
        </p>
      )}
      {subLabel && (
        <p className="text-center text-[#1c2a2b]/40 mt-0.5" style={{ fontSize: size === 'sm' ? 10 : 11 }}>
          {subLabel}
        </p>
      )}
    </div>
  );
}
