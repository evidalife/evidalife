'use client';

type Lang = 'de' | 'en';

interface Props {
  current:       number;
  total:         number;
  lang:          Lang;
  streak:        { current_streak: number; longest_streak: number } | null;
  isToday:       boolean;
  formattedDate: string;
}

// ── Gauge geometry ─────────────────────────────────────────────────────────────
// 240° arc, gap at bottom (start bottom-left, sweep clockwise to bottom-right).
// Rotation=150° on the SVG circle aligns the dasharray start to the bottom-left.
const R             = 64;
const CX            = 90;
const CY            = 80;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAUGE_ARC     = (240 / 360) * CIRCUMFERENCE;
const ROTATION      = 150;

function gaugeColor(current: number, total: number): string {
  if (total === 0 || current === 0) return '#e5e7eb';
  if (current >= total)             return '#10b981';
  return '#ceab84';
}

export default function DDGauge({ current, total, lang, streak, isToday, formattedDate }: Props) {
  const pct     = total > 0 ? Math.min(current / total, 1) : 0;
  const fillArc = pct * GAUGE_ARC;
  const color   = gaugeColor(current, total);
  const allDone = total > 0 && current >= total;

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;

  const T = {
    de: {
      label:    'Portionen heute',
      past:     'am',
      done:     '🎉 Alle Portionen!',
      streak:   (n: number) => `🔥 ${n} Tag${n !== 1 ? 'e' : ''} Streak`,
      longest:  (n: number) => `Längste Serie: ${n} Tage`,
      noStreak: 'Starte deinen Streak!',
    },
    en: {
      label:    'Servings today',
      past:     'on',
      done:     '🎉 All servings done!',
      streak:   (n: number) => `🔥 ${n}-day streak`,
      longest:  (n: number) => `Longest: ${n} days`,
      noStreak: 'Start your streak!',
    },
  }[lang];

  // Short date for past-day label: just the day part e.g. "Mittwoch" or "Wednesday"
  const dayName = formattedDate.split(',')[0];

  return (
    <div className="flex flex-col items-center gap-1">

      {/* Title */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84]">
        {lang === 'de' ? 'Tagesportionen' : 'Daily Dozen Score'}
      </p>

      {/* Arc gauge */}
      <svg width="180" height="130" viewBox="0 0 180 130">
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#0e393d0d"
          strokeWidth="11"
          strokeDasharray={`${GAUGE_ARC} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          transform={`rotate(${ROTATION} ${CX} ${CY})`}
        />
        {/* Fill */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${fillArc} ${CIRCUMFERENCE}`}
          transform={`rotate(${ROTATION} ${CX} ${CY})`}
          style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
        />
        {/* Current value */}
        <text
          x={CX} y={CY - 9}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="30" fontWeight="700" fill="#0e393d"
        >
          {current}
        </text>
        {/* Slash + total */}
        <text
          x={CX} y={CY + 15}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="14" fill="#0e393d55"
        >
          / {total}
        </text>
      </svg>

      {/* Sub-label */}
      {allDone ? (
        <p className="text-[11px] font-semibold text-emerald-600 text-center">{T.done}</p>
      ) : (
        <p className="text-[11px] text-[#1c2a2b]/40 text-center">
          {isToday ? T.label : `${T.past} ${dayName}`}
        </p>
      )}

      {/* Streak — only when viewing today */}
      {isToday && (
        <div className="mt-2 text-center">
          {currentStreak > 0 ? (
            <>
              <p className="text-sm font-bold text-[#0e393d]">{T.streak(currentStreak)}</p>
              {longestStreak > currentStreak && (
                <p className="text-[10px] text-[#1c2a2b]/35 mt-0.5">{T.longest(longestStreak)}</p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-[#1c2a2b]/35">{T.noStreak}</p>
          )}
        </div>
      )}
    </div>
  );
}
