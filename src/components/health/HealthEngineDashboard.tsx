'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import BiomarkerTrendChart from './BiomarkerTrendChart';
import { CATEGORY_DISPLAY } from '@/lib/health-score';

// ── Types ─────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
type MStatus = 'optimal' | 'good' | 'moderate' | 'risk';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  birthday: string | null;
  sex: string | null;
  height_cm: number | null;
}
interface Report { id: string; title: string | null; test_date: string; status: string }
interface LabResult {
  id: string;
  lab_report_id: string | null;
  biomarker_definition_id: string | null;
  value_numeric: number | null;
  unit: string | null;
  status_flag: string | null;
  measured_at: string;
  test_date: string | null;
}
interface BiomarkerDef {
  id: string; slug: string;
  name: Record<string, string> | null;
  unit: string | null;
  he_domain: string | null;
  ref_range_low: number | null;
  ref_range_high: number | null;
  optimal_range_low: number | null;
  optimal_range_high: number | null;
  item_type: string | null;
  sort_order: number | null;
}
interface Props {
  lang: Lang; userId: string;
  profile: Profile | null;
  reports: Report[];
  results: LabResult[];
  definitions: BiomarkerDef[];
}

interface ProcessedMarker {
  defId: string; slug: string; name: string; unit: string;
  values: (number | null)[];
  latest: number | null;
  latestScore: number;
  latestStatus: MStatus;
  refLow: number | null; refHigh: number | null;
  optLow: number | null; optHigh: number | null;
  delta: number | null;
  previousScore: number | null;
}
interface ProcessedDomain {
  key: string; icon: string; color: string; weight: number; weightLabel: string;
  name: Record<string, string>;
  scores: number[];
  markers: ProcessedMarker[];
}

// ── Domain Configuration ──────────────────────────────────────────────────────
const DOMAIN_ORDER = [
  'heart_vessels', 'metabolism', 'inflammation', 'organ_function',
  'nutrients', 'hormones', 'body_composition', 'fitness',
] as const;

const DOMAIN_META: Record<string, { icon: string; color: string; weight: number; weightLabel: string }> = {
  heart_vessels:    { icon: '❤️', color: '#dc2626', weight: 0.20, weightLabel: '20%' },
  metabolism:       { icon: '⚡', color: '#059669', weight: 0.18, weightLabel: '18%' },
  inflammation:     { icon: '🛡️', color: '#d97706', weight: 0.15, weightLabel: '15%' },
  organ_function:   { icon: '🫁', color: '#7c3aed', weight: 0.15, weightLabel: '15%' },
  nutrients:        { icon: '🥗', color: '#10b981', weight: 0.12, weightLabel: '12%' },
  hormones:         { icon: '🧬', color: '#f59e0b', weight: 0.10, weightLabel: '10%' },
  body_composition: { icon: '🏋️', color: '#0ea5e9', weight: 0.05, weightLabel: '5%' },
  fitness:          { icon: '🏃', color: '#16a34a', weight: 0.05, weightLabel: '5%' },
};

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<Lang, Record<string, string>> = {
  en: {
    tag: 'HEALTH ENGINE', title: 'Your Health Score', sub: 'Track your biomarkers across health domains. See what improves and know exactly what to focus on.',
    secScore: 'OVERALL SCORE', secDom: 'HEALTH DOMAINS', secBm: 'ALL BIOMARKERS', secKm: 'KEY MARKERS',
    optLabel: 'Optimal', goodLabel: 'Good', modLabel: 'Borderline', riskLabel: 'Risk',
    refRange: 'Reference', longevityOpt: 'Optimal',
    viewMarkers: 'View details', close: 'Close',
    scoreHistory: 'Score over time', basedOn: 'Based on {n} domains',
    yourProgress: 'YOUR PROGRESS',
    borderlineHead: '{n} markers need attention',
    borderlineBody: 'Within reference range but below longevity optimal.',
    improvedHead: '{n} markers improved',
    improvedBody: 'Your interventions are working — keep it up.',
    lastTested: 'Last tested', testsCompleted: 'tests', markers: 'markers',
    bestDomain: 'Strongest', focusArea: 'Focus area', progress: 'Progress',
    trend: 'Trend', vsLast: 'vs previous', shopCta: 'Browse tests',
    noResults: 'No results yet', noResultsSub: 'Upload or order your first blood test to see your health score.',
    impactful: 'Your most impactful biomarkers', clickDomain: 'Click any domain to explore',
    allValues: 'All measured values across tests', domainBalance: 'DOMAIN BALANCE',
    markerStatus: 'MARKER STATUS', overallScore: 'LONGEVITY SCORE',
    atAGlance: 'at a glance',
  },
  de: {
    tag: 'HEALTH ENGINE', title: 'Dein Gesundheits-Score', sub: 'Verfolge deine Biomarker in 8 Gesundheitsbereichen.',
    secScore: 'GESAMT-SCORE', secDom: 'GESUNDHEITSBEREICHE', secBm: 'ALLE BIOMARKER', secKm: 'SCHLÜSSEL-MARKER',
    optLabel: 'Optimal', goodLabel: 'Gut', modLabel: 'Grenzwertig', riskLabel: 'Risiko',
    refRange: 'Referenz', longevityOpt: 'Optimal',
    viewMarkers: 'Details anzeigen', close: 'Schliessen',
    scoreHistory: 'Score-Verlauf', basedOn: 'Basiert auf {n} Bereichen',
    yourProgress: 'DEIN FORTSCHRITT',
    borderlineHead: '{n} Marker im Grenzbereich',
    borderlineBody: 'Im Referenzbereich, aber unter dem Longevity-Optimum.',
    improvedHead: '{n} Marker verbessert',
    improvedBody: 'Deine Massnahmen wirken — weiter so.',
    lastTested: 'Zuletzt getestet', testsCompleted: 'Tests', markers: 'Marker',
    bestDomain: 'Stärkster', focusArea: 'Fokusbereich', progress: 'Fortschritt',
    trend: 'Verlauf', vsLast: 'vs vorherig', shopCta: 'Tests entdecken',
    noResults: 'Noch keine Ergebnisse', noResultsSub: 'Lade deinen ersten Bluttest hoch.',
    impactful: 'Deine wichtigsten Biomarker', clickDomain: 'Klicke auf einen Bereich',
    allValues: 'Alle Werte aus jedem Test', domainBalance: 'DOMÄNEN-BALANCE',
    markerStatus: 'MARKER-STATUS', overallScore: 'LONGEVITY SCORE',
    atAGlance: 'im Überblick',
  },
  fr: {
    tag: 'HEALTH ENGINE', title: 'Votre Score Santé', sub: 'Suivez vos biomarqueurs dans 8 domaines de santé.',
    secScore: 'SCORE GLOBAL', secDom: 'DOMAINES DE SANTÉ', secBm: 'TOUS LES BIOMARQUEURS', secKm: 'MARQUEURS CLÉS',
    optLabel: 'Optimal', goodLabel: 'Bon', modLabel: 'Limite', riskLabel: 'Risque',
    refRange: 'Référence', longevityOpt: 'Optimal',
    viewMarkers: 'Voir détails', close: 'Fermer',
    scoreHistory: 'Historique', basedOn: 'Basé sur {n} domaines',
    yourProgress: 'VOS PROGRÈS',
    borderlineHead: '{n} marqueurs à surveiller',
    borderlineBody: 'Dans la plage de référence mais sous l\'optimal.',
    improvedHead: '{n} marqueurs améliorés',
    improvedBody: 'Vos interventions fonctionnent.',
    lastTested: 'Dernier test', testsCompleted: 'tests', markers: 'marqueurs',
    bestDomain: 'Meilleur', focusArea: 'Zone de focus', progress: 'Progrès',
    trend: 'Tendance', vsLast: 'vs précédent', shopCta: 'Voir boutique',
    noResults: 'Aucun résultat', noResultsSub: 'Faites votre premier bilan sanguin.',
    impactful: 'Vos biomarqueurs les plus significatifs', clickDomain: 'Cliquez sur un domaine',
    allValues: 'Toutes les valeurs', domainBalance: 'ÉQUILIBRE', markerStatus: 'STATUT',
    overallScore: 'SCORE DE LONGÉVITÉ', atAGlance: 'en un coup d\'œil',
  },
  es: {
    tag: 'HEALTH ENGINE', title: 'Tu Score de Salud', sub: 'Sigue tus biomarcadores en 8 dominios de salud.',
    secScore: 'SCORE GLOBAL', secDom: 'DOMINIOS DE SALUD', secBm: 'TODOS LOS BIOMARCADORES', secKm: 'MARCADORES CLAVE',
    optLabel: 'Óptimo', goodLabel: 'Bueno', modLabel: 'Límite', riskLabel: 'Riesgo',
    refRange: 'Referencia', longevityOpt: 'Óptimo',
    viewMarkers: 'Ver detalles', close: 'Cerrar',
    scoreHistory: 'Historial', basedOn: 'Basado en {n} dominios',
    yourProgress: 'TU PROGRESO',
    borderlineHead: '{n} marcadores a vigilar',
    borderlineBody: 'Dentro del rango de referencia pero bajo el óptimo.',
    improvedHead: '{n} marcadores mejorados',
    improvedBody: 'Tus intervenciones funcionan.',
    lastTested: 'Último test', testsCompleted: 'tests', markers: 'marcadores',
    bestDomain: 'Más fuerte', focusArea: 'Área de enfoque', progress: 'Progreso',
    trend: 'Tendencia', vsLast: 'vs anterior', shopCta: 'Ver tienda',
    noResults: 'Sin resultados', noResultsSub: 'Haz tu primer análisis.',
    impactful: 'Tus biomarcadores más significativos', clickDomain: 'Haz clic en un dominio',
    allValues: 'Todos los valores', domainBalance: 'BALANCE', markerStatus: 'ESTADO',
    overallScore: 'SCORE DE LONGEVIDAD', atAGlance: 'de un vistazo',
  },
  it: {
    tag: 'HEALTH ENGINE', title: 'Il Tuo Score Salute', sub: 'Segui i tuoi biomarcatori in 8 domini della salute.',
    secScore: 'SCORE GLOBALE', secDom: 'DOMINI DELLA SALUTE', secBm: 'TUTTI I BIOMARCATORI', secKm: 'MARCATORI CHIAVE',
    optLabel: 'Ottimale', goodLabel: 'Buono', modLabel: 'Limite', riskLabel: 'Rischio',
    refRange: 'Riferimento', longevityOpt: 'Ottimale',
    viewMarkers: 'Vedi dettagli', close: 'Chiudi',
    scoreHistory: 'Storico', basedOn: 'Basato su {n} domini',
    yourProgress: 'I TUOI PROGRESSI',
    borderlineHead: '{n} marcatori da monitorare',
    borderlineBody: 'Nel range di riferimento ma sotto l\'ottimale.',
    improvedHead: '{n} marcatori migliorati',
    improvedBody: 'I tuoi interventi funzionano.',
    lastTested: 'Ultimo test', testsCompleted: 'test', markers: 'marcatori',
    bestDomain: 'Più forte', focusArea: 'Area di focus', progress: 'Progresso',
    trend: 'Andamento', vsLast: 'vs precedente', shopCta: 'Visita negozio',
    noResults: 'Nessun risultato', noResultsSub: 'Fai il tuo primo esame.',
    impactful: 'I tuoi biomarcatori più significativi', clickDomain: 'Clicca su un dominio',
    allValues: 'Tutti i valori', domainBalance: 'EQUILIBRIO', markerStatus: 'STATO',
    overallScore: 'SCORE DI LONGEVITÀ', atAGlance: 'a colpo d\'occhio',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getName(obj: Record<string, string> | string | null, lang: string): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] ?? obj['en'] ?? obj['de'] ?? '';
}

function fmtDate(iso: string, lang: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(
    lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-GB',
    { month: 'short', year: 'numeric' },
  );
}
function fmtDateFull(iso: string, lang: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString(
    lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'it' ? 'it-IT' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

// ── Continuous Scoring ────────────────────────────────────────────────────────
// Returns 0–100 with realistic granularity (not just 100/75/50/25)
function continuousScore(
  value: number,
  refLow: number | null, refHigh: number | null,
  optLow: number | null, optHigh: number | null,
): number {
  const hRL = refLow != null, hRH = refHigh != null;
  const hOL = optLow != null, hOH = optHigh != null;

  // Both ref bounds (range type)
  if (hRL && hRH) {
    const rL = refLow!, rH = refHigh!;
    const span = rH - rL || 1;

    if (hOL && hOH) {
      const oL = optLow!, oH = optHigh!;
      const oMid = (oL + oH) / 2;
      const oHalf = (oH - oL) / 2 || 1;

      if (value >= oL && value <= oH) {
        // In optimal: 82–100 based on centering (wider spread for realism)
        const dist = Math.abs(value - oMid) / oHalf;
        return Math.round(100 - 18 * dist);
      }
      if (value >= rL && value <= rH) {
        // In reference, not optimal: 55–81
        if (value < oL) {
          const pct = (oL - value) / (oL - rL || 1);
          return Math.round(81 - 26 * pct);
        } else {
          const pct = (value - oH) / (rH - oH || 1);
          return Math.round(81 - 26 * pct);
        }
      }
    } else {
      // No optimal range, just reference
      const mid = (rL + rH) / 2;
      const half = span / 2;
      if (value >= rL && value <= rH) {
        const dist = Math.abs(value - mid) / half;
        return Math.round(90 - 22 * dist);
      }
    }

    // Out of reference
    const overshoot = value < rL ? (rL - value) / span : (value - rH) / span;
    if (overshoot <= 0.15) return Math.round(50 - overshoot * 80);
    if (overshoot <= 0.5) return Math.round(42 - overshoot * 50);
    return Math.max(0, Math.round(25 - overshoot * 30));
  }

  // Only upper bound (lower is better)
  if (!hRL && hRH) {
    const rH = refHigh!;
    const opt = hOH ? optHigh! : rH * 0.8;
    if (value <= opt * 0.5) {
      return Math.round(98 - 4 * (value / (opt * 0.5 || 1)));
    }
    if (value <= opt) {
      const ratio = (value - opt * 0.5) / (opt * 0.5 || 1);
      return Math.round(94 - 12 * ratio);
    }
    if (value <= rH) {
      const pct = (value - opt) / (rH - opt || 1);
      return Math.round(81 - 26 * pct);
    }
    const overshoot = (value - rH) / (rH || 1);
    return Math.max(0, Math.round(50 - overshoot * 65));
  }

  // Only lower bound (higher is better)
  if (hRL && !hRH) {
    const rL = refLow!;
    const opt = hOL ? optLow! : rL * 1.2;
    if (value >= opt * 1.5) {
      return Math.round(94 - 6 * Math.min(1, (value - opt * 1.5) / (opt || 1)));
    }
    if (value >= opt) {
      const excess = (value - opt) / (opt * 0.5 || 1);
      return Math.round(98 - 4 * Math.min(1, excess));
    }
    if (value >= rL) {
      const pct = (opt - value) / (opt - rL || 1);
      return Math.round(81 - 26 * pct);
    }
    const undershoot = (rL - value) / (rL || 1);
    return Math.max(0, Math.round(50 - undershoot * 65));
  }

  return 70; // No ranges available
}

function scoreToStatus(s: number): MStatus {
  if (s >= 90) return 'optimal';
  if (s >= 75) return 'good';
  if (s >= 55) return 'moderate';
  return 'risk';
}

function statusColor(s: MStatus): string {
  return s === 'optimal' ? '#0C9C6C' : s === 'good' ? '#5ba37a' : s === 'moderate' ? '#C4A96A' : '#E06B5B';
}

function statusBg(s: MStatus): string {
  return s === 'optimal' ? 'rgba(12,156,108,.08)' : s === 'good' ? 'rgba(91,163,122,.08)' : s === 'moderate' ? 'rgba(196,169,106,.08)' : 'rgba(224,107,91,.08)';
}

function scoreColor(score: number): string {
  if (score >= 88) return '#0C9C6C';
  if (score >= 70) return '#5ba37a';
  if (score >= 50) return '#C4A96A';
  return '#E06B5B';
}

function rPct(v: number, rL: number | null, rH: number | null): number {
  const lo = (rL ?? 0) * 0.7;
  const hi = (rH ?? v * 2) * 1.3;
  if (hi === lo) return 50;
  return Math.max(2, Math.min(98, ((v - lo) / (hi - lo)) * 100));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84]">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-[#ceab84]/20 to-transparent" />
    </div>
  );
}

function StatusBadge({ status, t }: { status: MStatus; t: Record<string, string> }) {
  const label = status === 'optimal' ? t.optLabel : status === 'good' ? t.goodLabel : status === 'moderate' ? t.modLabel : t.riskLabel;
  return (
    <span
      className="text-[10px] font-semibold px-2.5 py-[3px] rounded-full inline-flex items-center gap-1"
      style={{ color: statusColor(status), background: statusBg(status) }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(status) }} />
      {label}
    </span>
  );
}

function MiniRangeBar({ value, refLow, refHigh, optLow, optHigh, status }: {
  value: number; refLow: number | null; refHigh: number | null;
  optLow: number | null; optHigh: number | null; status: MStatus;
}) {
  const pct = rPct(value, refLow, refHigh);
  // Optimal zone positioning
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

function Sparkline({ vals, color, height = 28 }: { vals: (number | null)[]; color: string; height?: number }) {
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

// ── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 180, strokeWidth = 10, label }: {
  score: number; size?: number; strokeWidth?: number; label?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = circ * (1 - pct);
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#f0ede8" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-[2.8rem] leading-none" style={{ color }}>{score}</span>
        {label && <span className="text-[11px] text-[#1c2a2b]/40 mt-1">{label}</span>}
      </div>
    </div>
  );
}

function MiniScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const sw = 3.5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color = scoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0ede8" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[12px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HealthEngineDashboard({ lang, userId, profile, reports, results, definitions }: Props) {
  const t = T[lang];

  const dash = useMemo(() => {
    const defMap = new Map(definitions.map(d => [d.id, d]));
    const reportDateMap = new Map(reports.map(r => [r.id, r.test_date]));

    // Collect unique dates
    const dateSet = new Set<string>();
    for (const r of results) {
      const d = r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0];
      if (d) dateSet.add(d);
    }
    const allDates = [...dateSet].sort();
    const displayDates = allDates.slice(-6);
    const displayLabels = displayDates.map(d => fmtDate(d, lang));

    // Map: defId → date → { value, flag }
    const mData = new Map<string, Map<string, { value: number; flag: string | null }>>();
    for (const r of results) {
      if (!r.biomarker_definition_id || r.value_numeric == null) continue;
      const date = r.test_date || (r.lab_report_id ? reportDateMap.get(r.lab_report_id) : null) || r.measured_at?.split('T')[0];
      if (!date) continue;
      if (!mData.has(r.biomarker_definition_id)) mData.set(r.biomarker_definition_id, new Map());
      const existing = mData.get(r.biomarker_definition_id)!.get(date);
      if (!existing) {
        mData.get(r.biomarker_definition_id)!.set(date, { value: r.value_numeric, flag: r.status_flag });
      }
    }

    // Build domains
    const domains: ProcessedDomain[] = DOMAIN_ORDER.map(key => {
      const meta = DOMAIN_META[key];
      const domDefs = definitions
        .filter(d => d.he_domain === key && mData.has(d.id))
        .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

      const markers: ProcessedMarker[] = domDefs.map(def => {
        const history = mData.get(def.id)!;
        const values = displayDates.map(d => history.get(d)?.value ?? null);

        // Latest + previous values
        let latest: number | null = null;
        let previous: number | null = null;
        for (let i = displayDates.length - 1; i >= 0; i--) {
          const entry = history.get(displayDates[i]);
          if (entry) {
            if (latest === null) { latest = entry.value; }
            else if (previous === null) { previous = entry.value; break; }
          }
        }

        // Continuous score (always range-based for realism)
        const latestScore = latest != null
          ? continuousScore(latest, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high)
          : 50;

        const previousScore = previous != null
          ? continuousScore(previous, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high)
          : null;

        const delta = latest != null && previous != null ? +(latest - previous).toFixed(2) : null;

        return {
          defId: def.id, slug: def.slug,
          name: getName(def.name, lang), unit: def.unit || '',
          values, latest, latestScore,
          latestStatus: scoreToStatus(latestScore),
          refLow: def.ref_range_low, refHigh: def.ref_range_high,
          optLow: def.optimal_range_low, optHigh: def.optimal_range_high,
          delta, previousScore,
        };
      });

      // Domain scores per display date
      const scores = displayDates.map(date => {
        const mScores = markers
          .map(m => {
            const entry = mData.get(m.defId)?.get(date);
            if (!entry) return null;
            const def = defMap.get(m.defId)!;
            return continuousScore(entry.value, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high);
          })
          .filter((s): s is number => s !== null);
        return mScores.length > 0 ? Math.round(mScores.reduce((a, b) => a + b, 0) / mScores.length) : 0;
      });

      return {
        key, ...meta,
        name: CATEGORY_DISPLAY[key] || {},
        scores, markers,
      };
    }).filter(d => d.markers.length > 0);

    // Overall scores per date (weighted)
    const overallScores = displayDates.map((_, di) => {
      let wSum = 0, wUsed = 0;
      for (const d of domains) {
        if (d.scores[di] > 0) {
          wSum += d.scores[di] * d.weight;
          wUsed += d.weight;
        }
      }
      return wUsed > 0 ? Math.round(wSum / wUsed) : 0;
    });
    const latestOverall = overallScores[overallScores.length - 1] || 0;

    // Best / worst
    const sorted = [...domains].sort((a, b) =>
      (b.scores[b.scores.length - 1] || 0) - (a.scores[a.scores.length - 1] || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    // Flag counts
    const flags = { optimal: 0, good: 0, moderate: 0, risk: 0 };
    const allMarkers: (ProcessedMarker & { domainName: string; domainKey: string })[] = [];
    for (const d of domains) {
      for (const m of d.markers) {
        flags[m.latestStatus]++;
        allMarkers.push({ ...m, domainName: getName(d.name, lang), domainKey: d.key });
      }
    }
    const flagTotal = flags.optimal + flags.good + flags.moderate + flags.risk;

    // Borderline / improved
    const borderline = allMarkers.filter(m => m.latestStatus === 'moderate' || m.latestStatus === 'risk');
    const improved = allMarkers.filter(m => {
      if (m.previousScore == null) return false;
      return m.latestScore > m.previousScore + 2;
    });

    // Featured markers: worst-scoring first
    const featured = [...allMarkers]
      .sort((a, b) => a.latestScore - b.latestScore)
      .slice(0, 6);

    const markerCount = new Set(results.filter(r => r.value_numeric != null).map(r => r.biomarker_definition_id)).size;

    // Score history — only include dates where at least 3 domains had data (meaningful score)
    const scoreData = displayDates
      .map((d, i) => {
        const domsWithData = domains.filter(dom => dom.scores[i] > 0).length;
        return { date: displayLabels[i], score: overallScores[i], domsWithData };
      })
      .filter(d => d.domsWithData >= 3);

    // First meaningful score (for progress display)
    const firstMeaningfulScore = scoreData.length >= 2 ? scoreData[0].score : null;

    // Radar data — use domain 60-100 scale for visual spread
    const radarData = domains.map(d => ({
      subject: getName(d.name, lang).replace(/\s*[(&].*/, '').split(' ')[0],
      current: d.scores[d.scores.length - 1] || 0,
      previous: d.scores.length >= 2 ? (d.scores[d.scores.length - 2] || 0) : 0,
    }));

    return {
      displayDates, displayLabels,
      domains, overallScores, latestOverall, scoreData,
      best, worst, flags, flagTotal,
      borderline, improved, featured, allMarkers,
      radarData, markerCount, firstMeaningfulScore,
    };
  }, [reports, results, definitions, lang]);

  // ── Domain descriptions ───────────────────────────────────────
  const DOMAIN_DESC: Record<string, Record<string, string>> = {
    heart_vessels: {
      en: 'Cardiovascular markers predict heart attack and stroke risk — the #1 cause of death globally. Optimizing these biomarkers is the single most impactful step for extending healthspan.',
      de: 'Kardiovaskuläre Marker sagen Herzinfarkt- und Schlaganfallrisiko voraus. Die Optimierung dieser Biomarker ist der wirkungsvollste Schritt für ein längeres, gesundes Leben.',
    },
    metabolism: {
      en: 'Blood sugar regulation and insulin sensitivity are central drivers of aging. Metabolic dysfunction accelerates every chronic disease — from diabetes to dementia.',
      de: 'Blutzuckerregulation und Insulinsensitivität sind zentrale Treiber des Alterns. Stoffwechselstörungen beschleunigen jede chronische Krankheit.',
    },
    inflammation: {
      en: 'Chronic low-grade inflammation ("inflammaging") silently damages tissue for decades. These markers detect it early, when lifestyle interventions are most effective.',
      de: 'Chronische niedriggradige Entzündung schädigt still das Gewebe über Jahrzehnte. Diese Marker erkennen sie früh, wenn Lebensstilmassnahmen am effektivsten sind.',
    },
    organ_function: {
      en: 'Kidney, liver, and thyroid function decline with age but respond well to early intervention. Catching subtle changes here prevents irreversible damage.',
      de: 'Nieren-, Leber- und Schilddrüsenfunktion nehmen mit dem Alter ab, sprechen aber gut auf frühe Intervention an.',
    },
    nutrients: {
      en: 'Even mild deficiencies in key micronutrients impair immune function, energy, cognition, and DNA repair. Targeted supplementation can close gaps within weeks.',
      de: 'Selbst leichte Defizite bei Mikronährstoffen beeinträchtigen Immunfunktion, Energie und DNA-Reparatur. Gezielte Supplementierung schliesst Lücken innerhalb von Wochen.',
    },
    hormones: {
      en: 'Hormonal balance affects energy, mood, body composition, and cognitive performance. Age-related decline is measurable — and often reversible with the right approach.',
      de: 'Hormonales Gleichgewicht beeinflusst Energie, Stimmung und kognitive Leistung. Altersbedingte Veränderungen sind messbar und oft umkehrbar.',
    },
    body_composition: {
      en: 'Visceral fat, lean mass, and bone density are independent predictors of mortality. DEXA scanning provides gold-standard measurement accuracy.',
      de: 'Viszeralfett, Muskelmasse und Knochendichte sind unabhängige Sterblichkeitsprädiktoren.',
    },
    fitness: {
      en: 'VO₂max is the strongest single predictor of all-cause mortality. A 1 MET increase in fitness reduces mortality risk by 12%.',
      de: 'VO₂max ist der stärkste einzelne Prädiktor für die Gesamtsterblichkeit.',
    },
  };

  // ── State ─────────────────────────────────────────────────────
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [expandedMarker, setExpandedMarker] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);

  const lastDate = dash.displayDates[dash.displayDates.length - 1];

  // ── Empty state ───────────────────────────────────────────────
  if (dash.allMarkers.length === 0) {
    return (
      <div className="min-h-[60vh] bg-[#fafaf8] flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-[#0e393d]/[.04] flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round" opacity="0.25">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h2 className="font-serif text-2xl text-[#0e393d] mb-2">{t.noResults}</h2>
        <p className="text-sm text-[#1c2a2b]/45 mb-8 max-w-xs">{t.noResultsSub}</p>
      </div>
    );
  }

  // ── Premium Rendering ──────────────────────────────────────────
  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b]">

      {/* HERO SECTION */}
      <div className="bg-[#0e393d]">
        <div className="max-w-[1040px] mx-auto px-6 md:px-10 pt-28 pb-20">
          <p className="text-[10px] font-semibold tracking-[.2em] uppercase text-[#ceab84] mb-3">{t.tag}</p>
          <h1 className="font-serif text-[clamp(2.2rem,4vw,3rem)] text-white leading-[1.1] mb-4">{t.title}</h1>
          <p className="text-[15px] text-white/50 max-w-2xl leading-relaxed font-light mb-8">{t.sub}</p>
          <div className="flex flex-wrap gap-8 text-[11px] text-white/40">
            <span className="flex items-center gap-1"><span className="text-white/30">•</span> {t.lastTested}: {fmtDateFull(lastDate, lang)}</span>
            <span className="flex items-center gap-1"><span className="text-white/30">•</span> {reports.length} {t.testsCompleted}</span>
            <span className="flex items-center gap-1"><span className="text-white/30">•</span> {dash.markerCount} {t.markers}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1040px] mx-auto px-6 md:px-10 py-16">

        {/* OVERALL SCORE SECTION */}
        <section className="mb-16">
          <SectionTag>{t.overallScore}</SectionTag>

          {/* Dark teal panel with score, history, and marker status */}
          <div className="bg-[#0e393d] rounded-3xl p-8 md:p-10 shadow-lg">
            <div className="grid md:grid-cols-[auto_1fr_1fr] gap-8 items-start">

              {/* LEFT: Large score ring + best/focus mini stats */}
              <div className="flex flex-col items-center">
                <ScoreRing score={dash.latestOverall} size={220} strokeWidth={12} />

                <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-[240px]">
                  {dash.best && (
                    <div className="text-center">
                      <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-white/40 mb-1">{t.bestDomain}</div>
                      <div className="font-serif text-2xl text-white mb-1" style={{ color: scoreColor(dash.best.scores[dash.best.scores.length - 1]) }}>
                        {dash.best.scores[dash.best.scores.length - 1]}
                      </div>
                      <div className="text-[10px] text-white/50">{getName(dash.best.name, lang)}</div>
                    </div>
                  )}
                  {dash.worst && (
                    <div className="text-center">
                      <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-white/40 mb-1">{t.focusArea}</div>
                      <div className="font-serif text-2xl text-white mb-1" style={{ color: scoreColor(dash.worst.scores[dash.worst.scores.length - 1]) }}>
                        {dash.worst.scores[dash.worst.scores.length - 1]}
                      </div>
                      <div className="text-[10px] text-white/50">{getName(dash.worst.name, lang)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* MIDDLE: Score history chart */}
              {dash.scoreData.length >= 2 && (
                <div className="min-h-[180px] flex items-center">
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={dash.scoreData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 3']} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.25)' }} axisLine={false} tickLine={false} tickCount={4} />
                        <RTooltip
                          formatter={(v: unknown) => [v as number, 'Score']}
                          contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}
                          labelStyle={{ color: 'rgba(255,255,255,.7)' }}
                        />
                        <Line type="monotone" dataKey="score" stroke="#0C9C6C" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* RIGHT: Marker status bars */}
              <div>
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-4 block">{t.markerStatus}</div>
                {([
                  { status: 'optimal' as MStatus, count: dash.flags.optimal, label: t.optLabel },
                  { status: 'good' as MStatus, count: dash.flags.good, label: t.goodLabel },
                  { status: 'moderate' as MStatus, count: dash.flags.moderate, label: t.modLabel },
                  { status: 'risk' as MStatus, count: dash.flags.risk, label: t.riskLabel },
                ]).map(row => (
                  <div key={row.status} className="flex items-center gap-2.5 mb-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(row.status) }} />
                    <span className="text-xs text-white/40 w-16">{row.label}</span>
                    <div className="flex-1 h-[4px] rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${dash.flagTotal ? (row.count / dash.flagTotal * 100) : 0}%`, background: statusColor(row.status) }} />
                    </div>
                    <span className="text-sm font-semibold text-white/60 w-6 text-right">{row.count}</span>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/30">
                  {dash.flagTotal} {t.markers} {t.atAGlance}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PROGRESS SECTION */}
        {(dash.improved.length > 0 || dash.borderline.length > 0 || dash.firstMeaningfulScore != null) && (
          <section className="mb-16">
            <SectionTag>{t.yourProgress}</SectionTag>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dash.firstMeaningfulScore != null && (
                <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                  <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-2">{t.progress}</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-serif text-2xl" style={{ color: scoreColor(dash.firstMeaningfulScore) }}>{dash.firstMeaningfulScore}</span>
                    <span className="text-[#1c2a2b]/25 mx-1">→</span>
                    <span className="font-serif text-2xl" style={{ color: scoreColor(dash.latestOverall) }}>{dash.latestOverall}</span>
                  </div>
                  <div className="text-[11px] text-[#1c2a2b]/40">
                    {dash.latestOverall - dash.firstMeaningfulScore >= 0 ? '+' : ''}{dash.latestOverall - dash.firstMeaningfulScore} pts
                  </div>
                </div>
              )}

              {dash.improved.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                  <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#0C9C6C]/60 mb-2">{dash.improved.length} {t.improvedBody.split(' ')[0]}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dash.improved.slice(0, 3).map((m) => (
                      <span key={m.defId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#0C9C6C]/10 text-[10px] text-[#0C9C6C] font-medium">
                        {m.name}
                      </span>
                    ))}
                    {dash.improved.length > 3 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1c2a2b]/5 text-[10px] text-[#1c2a2b]/40 font-medium">
                        +{dash.improved.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {dash.borderline.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                  <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#C4A96A]/80 mb-2">{dash.borderline.length} need attention</div>
                  <div className="flex flex-wrap gap-1.5">
                    {dash.borderline.slice(0, 3).map((m) => (
                      <span key={m.defId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#C4A96A]/10 text-[10px] text-[#C4A96A] font-medium">
                        {m.name}
                      </span>
                    ))}
                    {dash.borderline.length > 3 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1c2a2b]/5 text-[10px] text-[#1c2a2b]/40 font-medium">
                        +{dash.borderline.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* KEY MARKERS SECTION */}
        {dash.featured.length > 0 && (
          <section className="mb-16">
            <SectionTag>{t.secKm}</SectionTag>
            <p className="text-sm text-[#1c2a2b]/40 -mt-3 mb-5">{t.impactful}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dash.featured.map((m) => (
                <div key={m.defId} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ borderTop: `3px solid ${statusColor(m.latestStatus)}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-[#1c2a2b]/40 font-medium">{m.domainName}</span>
                    <StatusBadge status={m.latestStatus} t={t} />
                  </div>
                  <div className="text-[13px] font-semibold text-[#0e393d] mb-2">{m.name}</div>
                  {m.latest != null && (
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="font-serif text-[1.8rem] text-[#1c2a2b] leading-none">
                        {m.latest.toLocaleString('de-CH', { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-[#1c2a2b]/35">{m.unit}</span>
                    </div>
                  )}
                  <MiniRangeBar value={m.latest ?? 0} refLow={m.refLow} refHigh={m.refHigh}
                    optLow={m.optLow} optHigh={m.optHigh} status={m.latestStatus} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DOMAIN BALANCE SECTION */}
        <section className="mb-16">
          <SectionTag>{t.domainBalance}</SectionTag>

          <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-8 shadow-sm">
            <div className="grid md:grid-cols-[1fr_1fr] gap-8">

              {/* LEFT: Radar chart */}
              <div>
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-4">{t.domainBalance}</div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={dash.radarData} cx="50%" cy="50%" outerRadius="65%">
                      <PolarGrid stroke="rgba(14,57,61,.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'rgba(28,42,43,.5)' }} />
                      <Radar name="Current" dataKey="current" fill="rgba(12,156,108,.08)" stroke="#0C9C6C" strokeWidth={2.5}
                        animationBegin={200} animationDuration={800} />
                      <Radar name="Previous" dataKey="previous" fill="none" stroke="rgba(206,171,132,.35)" strokeWidth={1.5} strokeDasharray="4 3" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RIGHT: Domain mini scores + sparklines */}
              <div>
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-4">Domain Scores</div>
                <div className="space-y-3">
                  {dash.domains.map(d => {
                    const s = d.scores[d.scores.length - 1] || 0;
                    return (
                      <div key={d.key} className="flex items-center gap-3 pb-3 border-b border-[#1c2a2b]/[.04]">
                        <span className="text-lg">{d.icon}</span>
                        <div className="flex-1">
                          <div className="text-[11px] font-medium text-[#0e393d] mb-1">{getName(d.name, lang)}</div>
                          <div className="h-5 w-16">
                            <Sparkline vals={d.scores} color={scoreColor(s)} height={16} />
                          </div>
                        </div>
                        <MiniScoreRing score={s} size={40} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DOMAIN TILES SECTION */}
        <section className="mb-16">
          <SectionTag>{t.secDom}</SectionTag>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {dash.domains.map((d) => {
              const s = d.scores[d.scores.length - 1] || 0;
              const st = scoreToStatus(s);
              const isExpanded = expandedDomain === d.key;
              const prevScores = d.scores.slice(0, -1).filter(sc => sc > 0);
              const prev = prevScores.length > 0 ? prevScores[prevScores.length - 1] : null;
              const delta = prev != null ? s - prev : 0;

              return (
                <div key={d.key}
                  className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border ${
                    isExpanded ? 'border-[#0e393d]/20 shadow-md ring-1 ring-[#0e393d]/5' : 'border-[#1c2a2b]/[.06] shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                  onClick={() => setExpandedDomain(isExpanded ? null : d.key)}
                  style={{ borderTop: isExpanded ? '3px solid #0e393d' : `3px solid ${statusColor(st)}` }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{d.icon}</span>
                        <span className="text-[12px] font-semibold text-[#0e393d]">{getName(d.name, lang)}</span>
                      </div>
                      <StatusBadge status={st} t={t} />
                    </div>

                    <div className="flex items-end justify-between mb-3">
                      <div className="flex items-baseline gap-1.5">
                        <MiniScoreRing score={s} size={48} />
                        {delta !== 0 && (
                          <span className={`text-[10px] font-bold ${delta > 0 ? 'text-[#0C9C6C]' : 'text-[#E06B5B]'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        )}
                      </div>
                      <div className="w-16 h-6">
                        <Sparkline vals={d.scores} color={scoreColor(s)} height={20} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#1c2a2b]/[.05]">
                      <span className="text-[9px] text-[#1c2a2b]/35">{d.markers.length} {t.markers} · {d.weightLabel}</span>
                      <span className={`text-[10px] text-[#1c2a2b]/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                    </div>

                    {/* Domain description (always shown, small italic) */}
                    <div className="mt-2.5 pt-2.5 border-t border-[#1c2a2b]/[.05]">
                      <p className="text-[9px] text-[#1c2a2b]/35 italic leading-snug">{DOMAIN_DESC[d.key]?.[lang] || ''}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* EXPANDED DOMAIN DETAIL */}
          {expandedDomain && (() => {
            const d = dash.domains.find(dom => dom.key === expandedDomain);
            if (!d) return null;
            const domDesc = DOMAIN_DESC[d.key]?.[lang] || '';

            return (
              <div className="bg-white rounded-2xl border border-[#0e393d]/10 shadow-lg overflow-hidden animate-in">
                {/* Header */}
                <div className="bg-[#0e393d] px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{d.icon}</span>
                    <div>
                      <span className="font-serif text-white text-lg block">{getName(d.name, lang)}</span>
                      <span className="text-xs text-white/40">{d.scores[d.scores.length - 1]}/100</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedDomain(null); }}
                    className="w-8 h-8 rounded-full border border-white/20 text-white/50 hover:bg-white/10 hover:text-white transition flex items-center justify-center text-sm font-bold"
                  >✕</button>
                </div>

                {/* Description */}
                <div className="px-6 py-4 bg-[#0e393d]/[.02] border-b border-[#1c2a2b]/[.05]">
                  <p className="text-xs text-[#1c2a2b]/60 leading-relaxed">{domDesc}</p>
                </div>

                {/* Marker cards grid */}
                <div className="p-6 bg-[#fafaf8]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {d.markers.map((m) => {
                      const mKey = `${d.key}-${m.defId}`;
                      const isOpen = expandedMarker === mKey;
                      return (
                        <div key={m.defId}
                          className={`bg-white rounded-xl border transition-all cursor-pointer ${
                            isOpen ? 'border-[#0e393d]/15 shadow-md' : 'border-[#1c2a2b]/[.06] hover:shadow-md hover:-translate-y-0.5'
                          }`}
                          onClick={() => setExpandedMarker(isOpen ? null : mKey)}
                          style={{ borderTop: isOpen ? '3px solid #0e393d' : `3px solid ${statusColor(m.latestStatus)}` }}
                        >
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-semibold text-[#0e393d]">{m.name}</span>
                              <StatusBadge status={m.latestStatus} t={t} />
                            </div>

                            {m.latest != null && (
                              <div className="flex items-baseline gap-1.5 mt-2">
                                <span className="font-serif text-[1.7rem] leading-none text-[#1c2a2b]">
                                  {m.latest.toLocaleString('de-CH', { maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-[#1c2a2b]/40">{m.unit}</span>
                              </div>
                            )}

                            <div className="mt-2.5 mb-2">
                              <MiniRangeBar value={m.latest ?? 0} refLow={m.refLow} refHigh={m.refHigh}
                                optLow={m.optLow} optHigh={m.optHigh} status={m.latestStatus} />
                            </div>

                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#1c2a2b]/35">Score: <span className="font-bold" style={{ color: scoreColor(m.latestScore) }}>{m.latestScore}</span></span>
                              {m.delta != null && (
                                <span style={{
                                  color: m.previousScore != null && m.latestScore >= m.previousScore ? '#0C9C6C' : '#C4A96A'
                                }}>
                                  {m.delta >= 0 ? '+' : ''}{m.delta} {m.unit}
                                </span>
                              )}
                            </div>
                          </div>

                          {isOpen && (
                            <div className="border-t border-[#1c2a2b]/[.05] p-4 bg-[#fafaf8]/50">
                              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#ceab84] mb-3">{t.trend}</div>
                              <BiomarkerTrendChart userId={userId} definitionId={m.defId} unit={m.unit}
                                refLow={m.refLow} refHigh={m.refHigh} optLow={m.optLow} optHigh={m.optHigh} />
                              <div className="flex gap-4 text-[10px] text-[#1c2a2b]/45 mt-3">
                                {m.refLow != null && m.refHigh != null && (
                                  <div><span className="text-[8px] font-semibold uppercase tracking-wider text-[#1c2a2b]/35">{t.refRange}</span> {m.refLow}–{m.refHigh} {m.unit}</div>
                                )}
                                {m.optLow != null && m.optHigh != null && (
                                  <div><span className="text-[8px] font-semibold uppercase tracking-wider text-[#0C9C6C]/60">{t.longevityOpt}</span> {m.optLow}–{m.optHigh} {m.unit}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>

        {/* ALL BIOMARKERS TABLE */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <SectionTag>{t.secBm}</SectionTag>
            <button
              onClick={() => setShowTable(!showTable)}
              className="text-[11px] font-medium text-[#0e393d]/60 hover:text-[#0e393d] transition px-3 py-1.5 rounded-full border border-[#1c2a2b]/[.08] hover:border-[#0e393d]/20 hover:bg-[#0e393d]/[.02]"
            >
              {showTable ? t.close : t.allValues}
            </button>
          </div>

          {showTable && (
            <div className="space-y-8">
              {dash.domains.map((d) => (
                <div key={d.key} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                  {/* Domain header */}
                  <div className="bg-[#0e393d] px-6 py-3.5 flex items-center gap-3">
                    <span className="text-lg">{d.icon}</span>
                    <span className="font-semibold text-white text-sm">{getName(d.name, lang)}</span>
                    <span className="text-xs text-white/40">Score: <span className="font-bold" style={{ color: scoreColor(d.scores[d.scores.length - 1]) }}>{d.scores[d.scores.length - 1]}</span>/100</span>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#0e393d]/[.06] bg-[#fafaf8]">
                          <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2">Marker</th>
                          <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2">{t.refRange}</th>
                          <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#0C9C6C]/50 px-4 py-2">{t.longevityOpt}</th>
                          {dash.displayLabels.slice(-3).map(label => (
                            <th key={label} className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2 text-right">{label}</th>
                          ))}
                          <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.markers.map((m) => {
                          const last3 = m.values.slice(-3);
                          return (
                            <tr key={m.defId} className="border-b border-[#0e393d]/[.03] hover:bg-[#0e393d]/[.01] transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(m.latestStatus) }} />
                                  <div>
                                    <div className="text-[11px] font-medium text-[#0e393d]">{m.name}</div>
                                    <div className="text-[9px] text-[#1c2a2b]/30">{m.unit}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-[11px] text-[#1c2a2b]/50">
                                {m.refLow != null && m.refHigh != null ? `${m.refLow}–${m.refHigh}` : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-[11px] text-[#0C9C6C]/60 font-medium">
                                {m.optLow != null && m.optHigh != null ? `${m.optLow}–${m.optHigh}` : '—'}
                              </td>
                              {last3.map((val, vi) => (
                                <td key={vi} className="px-4 py-2.5 text-right">
                                  <span className="text-[11px] font-medium tabular-nums"
                                    style={{ color: vi === last3.length - 1 && val != null ? statusColor(m.latestStatus) : 'rgba(28,42,43,.4)' }}>
                                    {val != null ? val.toLocaleString('de-CH', { maximumFractionDigits: 2 }) : '—'}
                                  </span>
                                </td>
                              ))}
                              <td className="px-4 py-2.5 text-right">
                                <span className="text-[11px] font-bold tabular-nums" style={{ color: scoreColor(m.latestScore) }}>
                                  {m.latestScore}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
