'use client';

type Lang = 'de' | 'en';

interface Props {
  current:              number;
  total:                number;
  lang:                 Lang;
  streak:               { current_streak: number; longest_streak: number } | null;
  selectedDate:         string;
  today:                string;
  completedCategories?: number;
  totalCategories?:     number;
}

// ── Tachometer geometry (clock convention: 0 = top, clockwise) ─────────────
const CX        = 110;
const CY        = 115;
const R_OUTER   = 86;
const R_INNER   = 56;
const START_DEG = 240;    // 8 o'clock
const TOTAL_ARC = 240;
const N_SEGS    = 12;
const GAP_DEG   = 2;
const SEG_DEG   = (TOTAL_ARC - (N_SEGS - 1) * GAP_DEG) / N_SEGS; // ≈18.17°
const TAPER     = 1.5;    // inner arc narrower by this many degrees on each side

// Per-segment base color: segs 0–6 cream, 7–10 gold, 11 green
const SEG_COLORS = [
  '#FAEEDA', '#FAEEDA', '#FAEEDA', '#FAEEDA', '#FAEEDA', '#FAEEDA', '#FAEEDA',
  '#C4A96A', '#C4A96A', '#C4A96A', '#C4A96A',
  '#0C9C6C',
];

const f = (n: number) => n.toFixed(2);

function toXY(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function segPath(i: number): string {
  const a1 = START_DEG + i * (SEG_DEG + GAP_DEG);
  const a2 = a1 + SEG_DEG;
  const [ox1, oy1] = toXY(CX, CY, R_OUTER, a1);
  const [ox2, oy2] = toXY(CX, CY, R_OUTER, a2);
  const [ix2, iy2] = toXY(CX, CY, R_INNER, a2 - TAPER);
  const [ix1, iy1] = toXY(CX, CY, R_INNER, a1 + TAPER);
  return [
    `M${f(ox1)},${f(oy1)}`,
    `A${R_OUTER},${R_OUTER},0,0,1,${f(ox2)},${f(oy2)}`,
    `L${f(ix2)},${f(iy2)}`,
    `A${R_INNER},${R_INNER},0,0,0,${f(ix1)},${f(iy1)}`,
    'Z',
  ].join(' ');
}

export default function DDGauge({
  current, total, lang, streak, selectedDate, today,
  completedCategories, totalCategories = 12,
}: Props) {
  const pct   = total > 0 ? Math.min(current / total, 1) : 0;
  const all   = total > 0 && current >= total;
  const score = Math.round(pct * 100);

  // Needle angle & polygon points
  const needleDeg        = START_DEG + pct * TOTAL_ARC;
  const [tipX, tipY]     = toXY(CX, CY, R_OUTER - 6, needleDeg);
  const [b1X,  b1Y]      = toXY(CX, CY, 9, needleDeg + 90);
  const [b2X,  b2Y]      = toXY(CX, CY, 9, needleDeg - 90);
  const [tailX, tailY]   = toXY(CX, CY, 13, needleDeg + 180);

  // Relative date label
  const selD   = new Date(selectedDate + 'T12:00:00');
  const todD   = new Date(today + 'T12:00:00');
  const diff   = Math.round((todD.getTime() - selD.getTime()) / 86400000);
  const isToday = diff === 0;
  const locale  = lang === 'de' ? 'de-CH' : 'en-GB';

  const T = {
    de: {
      today:    'Portionen heute',
      yesterday:'Gestern',
      lastDay:  (w: string) => `Letzten ${w}`,
      done:     'Alle Portionen geschafft!',
      streakLbl:(n: number) => `${n} Tag${n !== 1 ? 'e' : ''} Streak`,
      noStreak: 'Starte deinen Streak',
    },
    en: {
      today:    'Servings today',
      yesterday:'Yesterday',
      lastDay:  (w: string) => `Last ${w}`,
      done:     'All servings complete!',
      streakLbl:(n: number) => `${n}-day streak`,
      noStreak: 'Start your streak',
    },
  }[lang];

  let dateLabel: string;
  if (isToday)         dateLabel = T.today;
  else if (diff === 1) dateLabel = T.yesterday;
  else if (diff < 7)   dateLabel = T.lastDay(selD.toLocaleDateString(locale, { weekday: 'long' }));
  else                 dateLabel = selD.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">

      {/* Tachometer SVG */}
      <svg width="100%" viewBox="0 0 220 162" style={{ maxWidth: 240, overflow: 'visible' }}>

        {/* Pulse glow ring at 24/24 */}
        {all && (
          <circle
            cx={CX} cy={CY} r={(R_OUTER + R_INNER) / 2}
            fill="none"
            stroke="#0C9C6C"
            strokeWidth={R_OUTER - R_INNER}
            className="animate-pulse"
            style={{ opacity: 0.15 }}
          />
        )}

        {/* Track segments */}
        {Array.from({ length: N_SEGS }, (_, i) => (
          <path key={`t${i}`} d={segPath(i)} fill="#0e393d0d" />
        ))}

        {/* Active segments */}
        {Array.from({ length: N_SEGS }, (_, i) => {
          const threshold = (i + 1) * (total / N_SEGS);
          if (current < threshold) return null;
          return (
            <path
              key={`a${i}`}
              d={segPath(i)}
              fill={SEG_COLORS[i]}
              style={{ transition: 'fill 0.3s ease' }}
            />
          );
        })}

        {/* Needle */}
        <polygon
          points={`${f(tipX)},${f(tipY)} ${f(b1X)},${f(b1Y)} ${f(tailX)},${f(tailY)} ${f(b2X)},${f(b2Y)}`}
          fill="#1c2a2b"
          style={{ transition: 'points 0.5s cubic-bezier(.34,1.56,.64,1)' }}
        />
        <circle cx={CX} cy={CY} r={5}   fill="#1c2a2b" />
        <circle cx={CX} cy={CY} r={2.5} fill="white" />

        {/* Current value */}
        <text
          x={CX} y={CY - 20}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="30" fontWeight="700" fill="#0e393d"
          style={{ transition: 'all 0.3s ease' }}
        >
          {current}
        </text>
        <text x={CX} y={CY - 3} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill="#0e393d55">
          / {total}
        </text>

      </svg>

      {/* Stats row */}
      <div className="flex items-center gap-1.5">
        {completedCategories !== undefined && (
          <span className="flex items-center gap-0.5 rounded-full bg-[#0e393d]/6 px-2.5 py-0.5 text-[10px] font-medium text-[#1c2a2b]/60">
            {completedCategories}
            <span className="text-[#1c2a2b]/30">/{totalCategories}</span>
          </span>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
          all          ? 'bg-[#0C9C6C]/12 text-[#0C9C6C]' :
          score >= 50  ? 'bg-[#C4A96A]/15 text-[#8a6a3e]' :
                         'bg-[#0e393d]/6 text-[#1c2a2b]/55'
        }`}>
          {score}%
        </span>
        {isToday && currentStreak > 0 && (
          <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-500">
            {lang === 'de' ? `${currentStreak}T` : `${currentStreak}d`}
          </span>
        )}
      </div>

      {/* Message zone — fixed 20px height */}
      <div className="h-5 flex items-center justify-center">
        {all ? (
          <p className="text-[11px] font-semibold text-[#0C9C6C]">{T.done}</p>
        ) : isToday && currentStreak > 0 ? (
          <p className="text-[10px] text-[#1c2a2b]/40">
            {T.streakLbl(currentStreak)}
            {longestStreak > currentStreak && (
              <span className="text-[#1c2a2b]/25"> · best {longestStreak}</span>
            )}
          </p>
        ) : (
          <p className="text-[10px] text-[#1c2a2b]/40">{dateLabel}</p>
        )}
      </div>

    </div>
  );
}
