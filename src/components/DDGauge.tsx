'use client';

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';

interface Props {
  current:             number;
  total:               number;
  lang:                Lang;
  streak:              { current_streak: number; longest_streak: number } | null;
  selectedDate:        string;
  today:               string;
  completedCategories: number;
  totalCategories:     number;
}

// ── Gauge geometry ──────────────────────────────────────────────────────────────
const CX = 130, CY = 115, SEGS = 12, GAP_DEG = 2.5, START_DEG = 135, ARC_SPAN = 270;
const SEG_ARC = (ARC_SPAN - (SEGS - 1) * GAP_DEG) / SEGS;
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

function tierColor(ratio: number): string {
  if (ratio >= 1)     return '#0C9C6C';
  if (ratio >= 0.667) return '#C4A96A';
  return '#FAEEDA';
}

function glowArcPath(): string {
  const [x1, y1] = gaugePx(R_MID, START_DEG);
  const [x2, y2] = gaugePx(R_MID, START_DEG + ARC_SPAN);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${R_MID},${R_MID} 0 1,1 ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

export default function DDGauge({
  current, total, lang, streak, selectedDate, today, completedCategories, totalCategories,
}: Props) {
  const ratio       = total > 0 ? Math.min(current / total, 1) : 0;
  const filledCount = Math.round(ratio * SEGS);
  const color       = tierColor(ratio);
  const isPerfect   = total > 0 && current >= total;
  const scorePct    = total > 0 ? Math.round((current / total) * 100) : 0;

  // Needle
  const needleDeg  = START_DEG + ratio * ARC_SPAN;
  const tipR       = R_MID - MIN_THICK / 2 + 4;
  const nRad       = toRad(needleDeg);
  const ndx        = Math.cos(nRad), ndy = Math.sin(nRad);
  const tipX       = CX + tipR * ndx,  tipY = CY + tipR * ndy;
  const lbX        = CX + 4 * (-ndy),  lbY  = CY + 4 * ndx;
  const rbX        = CX - 4 * (-ndy),  rbY  = CY - 4 * ndx;
  const tlX        = CX - 10 * ndx,    tlY  = CY - 10 * ndy;
  const needlePath =
    `M${tipX.toFixed(1)},${tipY.toFixed(1)} ` +
    `L${lbX.toFixed(1)},${lbY.toFixed(1)} ` +
    `L${tlX.toFixed(1)},${tlY.toFixed(1)} ` +
    `L${rbX.toFixed(1)},${rbY.toFixed(1)} Z`;

  // Endpoint labels
  const labelR      = R_MID + MAX_THICK / 2 + 12;
  const [l0x, l0y]  = gaugePx(labelR, START_DEG);
  const [lTx, lTy]  = gaugePx(labelR, START_DEG + ARC_SPAN);

  // Date logic
  const currentStreak = streak?.current_streak ?? 0;
  const selD          = new Date(selectedDate + 'T12:00:00');
  const todD          = new Date(today + 'T12:00:00');
  const daysDiff      = Math.round((todD.getTime() - selD.getTime()) / 86400000);
  const isToday       = daysDiff === 0;
  const locale        = lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-GB';

  const T = {
    de: {
      label:       'Portionen heute',
      yesterday:   'Gestern',
      lastWeekday: (w: string) => `Letzten ${w}`,
      allDone:     'Alle Portionen!',
      oneAway:     '1 Portion bis zum perfekten Tag',
      catLabel:    'Kategorien',
      scoreLabel:  '% Score',
      streakLabel: 'Streak',
      days:        (n: number) => `${n} Tag${n !== 1 ? 'e' : ''}`,
    },
    en: {
      label:       'Servings today',
      yesterday:   'Yesterday',
      lastWeekday: (w: string) => `Last ${w}`,
      allDone:     'All done!',
      oneAway:     '1 serving away from a perfect day',
      catLabel:    'categories',
      scoreLabel:  '% score',
      streakLabel: 'streak',
      days:        (n: number) => `${n} day${n !== 1 ? 's' : ''}`,
    },
    fr: {
      label:       'Portions aujourd\'hui',
      yesterday:   'Hier',
      lastWeekday: (w: string) => `${w} dernier`,
      allDone:     'Tout accompli !',
      oneAway:     'Plus qu\'une portion pour une journée parfaite',
      catLabel:    'catégories',
      scoreLabel:  '% score',
      streakLabel: 'série',
      days:        (n: number) => `${n} jour${n !== 1 ? 's' : ''}`,
    },
    es: {
      label:       'Porciones hoy',
      yesterday:   'Ayer',
      lastWeekday: (w: string) => `El ${w} pasado`,
      allDone:     '¡Todo listo!',
      oneAway:     '1 porción para un día perfecto',
      catLabel:    'categorías',
      scoreLabel:  '% puntuación',
      streakLabel: 'racha',
      days:        (n: number) => `${n} día${n !== 1 ? 's' : ''}`,
    },
    it: {
      label:       'Porzioni oggi',
      yesterday:   'Ieri',
      lastWeekday: (w: string) => `${w} scorso`,
      allDone:     'Tutto fatto!',
      oneAway:     '1 porzione per una giornata perfetta',
      catLabel:    'categorie',
      scoreLabel:  '% punteggio',
      streakLabel: 'serie',
      days:        (n: number) => `${n} giorno${n !== 1 ? 'i' : ''}`,
    },
  }[lang];

  // Smart sub-label
  let subLabel: string;
  if (isToday) {
    subLabel = T.label;
  } else if (daysDiff === 1) {
    subLabel = T.yesterday;
  } else if (daysDiff < 7) {
    const weekday = selD.toLocaleDateString(locale, { weekday: 'long' });
    subLabel = T.lastWeekday(weekday);
  } else {
    subLabel = selD.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Bottom message
  let message: string;
  if (isPerfect) {
    message = T.allDone;
  } else if (total - current === 1) {
    message = T.oneAway;
  } else {
    message = subLabel;
  }
  const messageColor = isPerfect ? '#0C9C6C' : '#888';

  return (
    <div className="flex flex-col items-center w-full h-full">

      {/* Gauge — grows to fill available height, SVG centered within */}
      <div className="flex flex-col items-center justify-center flex-1">
        <svg viewBox="0 0 260 210" width="100%" style={{ overflow: 'visible', maxWidth: 220 }}>
          {isPerfect && (
            <>
              <style>{`@keyframes ddPulseGlow{0%,100%{opacity:.06}50%{opacity:.2}}`}</style>
              <path
                d={glowArcPath()}
                fill="none"
                stroke="#0C9C6C"
                strokeWidth={MAX_THICK + 16}
                strokeLinecap="round"
                style={{ animation: 'ddPulseGlow 2.5s ease-in-out infinite' }}
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
            {current}
          </text>

          <text x={l0x.toFixed(1)} y={l0y.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#aaa">0</text>
          <text x={lTx.toFixed(1)} y={lTy.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#aaa">{total}</text>

          <path d={needlePath} fill="#1c2a2b" opacity={0.65} />
          <circle cx={CX} cy={CY} r={6}   fill="#1c2a2b" opacity={0.15} />
          <circle cx={CX} cy={CY} r={3.5} fill="white"   stroke="#1c2a2b" strokeWidth={1} opacity={0.8} />
        </svg>
      </div>

      {/* Message — centered between gauge bottom and pills top */}
      <div className="flex items-center justify-center py-3">
        <p style={{ fontSize: 12, color: messageColor, textAlign: 'center' }}>{message}</p>
      </div>

      {/* Stat pills — anchored to bottom */}
      <div className="flex gap-2.5 pb-1">
        <div className="text-center px-3 py-1.5 bg-[#f5f4f0] rounded-lg">
          <div className="text-[13px] font-medium text-[#C4A96A]">{completedCategories}/{totalCategories}</div>
          <div className="text-[10px] text-[#888] mt-0.5">{T.catLabel}</div>
        </div>
        <div className="text-center px-3 py-1.5 bg-[#f5f4f0] rounded-lg">
          <div className="text-[13px] font-medium text-[#0e393d]">{scorePct}%</div>
          <div className="text-[10px] text-[#888] mt-0.5">{T.scoreLabel}</div>
        </div>
        <div className="text-center px-3 py-1.5 bg-[#f5f4f0] rounded-lg">
          <div className="text-[13px] font-medium text-[#0e393d]">{T.days(currentStreak)}</div>
          <div className="text-[10px] text-[#888] mt-0.5">{T.streakLabel}</div>
        </div>
      </div>

    </div>
  );
}
