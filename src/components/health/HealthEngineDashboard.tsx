'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, Legend,
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
  date_of_birth: string | null;
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
  is_calculated: boolean | null;
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
  isCalculated: boolean;
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
  'nutrients', 'hormones', 'body_composition', 'fitness', 'epigenetics',
] as const;

const DOMAIN_META: Record<string, { icon: string; color: string; weight: number; weightLabel: string }> = {
  heart_vessels:    { icon: '❤️', color: '#dc2626', weight: 0.18, weightLabel: '18%' },
  metabolism:       { icon: '⚡', color: '#059669', weight: 0.16, weightLabel: '16%' },
  inflammation:     { icon: '🛡️', color: '#d97706', weight: 0.14, weightLabel: '14%' },
  organ_function:   { icon: '🫁', color: '#7c3aed', weight: 0.13, weightLabel: '13%' },
  nutrients:        { icon: '🥗', color: '#10b981', weight: 0.10, weightLabel: '10%' },
  hormones:         { icon: '🧬', color: '#f59e0b', weight: 0.09, weightLabel: '9%' },
  body_composition: { icon: '🏋️', color: '#0ea5e9', weight: 0.05, weightLabel: '5%' },
  fitness:          { icon: '🏃', color: '#16a34a', weight: 0.05, weightLabel: '5%' },
  epigenetics:      { icon: '🧪', color: '#8b5cf6', weight: 0.10, weightLabel: '10%' },
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
    longevityScore: 'LONGEVITY SCORE', basedOnDomains: 'Based on {n} health domains', epigeneticsSeparate: 'Epigenetics shown separately',
    bioAgeClocks: 'BIOLOGICAL AGE CLOCKS', topStrength: 'Top Strength', priorityAction: 'Priority Action', monthProgress: 'Month Progress', bioAgeDesc: 'Based on epigenetic markers',
    healthBriefing: 'Your Health Briefing', briefingSub: 'Personalized audio summary of your latest results', askAnything: 'Ask anything about your results...', listenNow: 'Listen now', comingSoon: 'Coming soon',
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
    longevityScore: 'LONGEVITY SCORE', basedOnDomains: 'Basiert auf {n} Gesundheitsbereichen', epigeneticsSeparate: 'Epigenetik separat angezeigt',
    bioAgeClocks: 'BIOLOGISCHE ALTERSUHREN', topStrength: 'Top-Stärke', priorityAction: 'Priorität', monthProgress: 'Monatlicher Fortschritt', bioAgeDesc: 'Basierend auf epigenetischen Markern',
    healthBriefing: 'Dein Gesundheitsbriefing', briefingSub: 'Personalisierte Audio-Zusammenfassung deiner neuesten Ergebnisse', askAnything: 'Frage alles zu deinen Ergebnissen...', listenNow: 'Jetzt anhören', comingSoon: 'Bald verfügbar',
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
    longevityScore: 'SCORE DE LONGÉVITÉ', basedOnDomains: 'Basé sur {n} domaines de santé', epigeneticsSeparate: 'Épigénétique affichée séparément',
    bioAgeClocks: 'HORLOGES ÂGE BIOLOGIQUE', topStrength: 'Force Top', priorityAction: 'Action Prioritaire', monthProgress: 'Progrès du Mois', bioAgeDesc: 'Basé sur les marqueurs épigénétiques',
    healthBriefing: 'Votre Briefing Santé', briefingSub: 'Résumé audio personnalisé de vos derniers résultats', askAnything: 'Posez une question sur vos résultats...', listenNow: 'Écouter', comingSoon: 'Bientôt disponible',
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
    longevityScore: 'SCORE DE LONGEVIDAD', basedOnDomains: 'Basado en {n} dominios de salud', epigeneticsSeparate: 'Epigenética mostrada por separado',
    bioAgeClocks: 'RELOJES DE EDAD BIOLÓGICA', topStrength: 'Fortaleza Superior', priorityAction: 'Acción Prioritaria', monthProgress: 'Progreso Mensual', bioAgeDesc: 'Basado en marcadores epigenéticos',
    healthBriefing: 'Tu Informe de Salud', briefingSub: 'Resumen de audio personalizado de tus últimos resultados', askAnything: 'Pregunta sobre tus resultados...', listenNow: 'Escuchar', comingSoon: 'Próximamente',
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
    longevityScore: 'SCORE DI LONGEVITÀ', basedOnDomains: 'Basato su {n} domini della salute', epigeneticsSeparate: 'Epigenetica mostrata separatamente',
    bioAgeClocks: 'OROLOGI DELL\'ETÀ BIOLOGICA', topStrength: 'Punto di Forza Principale', priorityAction: 'Azione Prioritaria', monthProgress: 'Progresso Mensile', bioAgeDesc: 'Basato su marcatori epigenetici',
    healthBriefing: 'Il Tuo Briefing Salute', briefingSub: 'Riepilogo audio personalizzato dei tuoi ultimi risultati', askAnything: 'Chiedi qualcosa sui tuoi risultati...', listenNow: 'Ascolta ora', comingSoon: 'Prossimamente',
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

// Tachometer gauge (matches the public health-engine design)
function Gauge({ score, max, dark = false }: { score: number; max: number; dark?: boolean }) {
  const CX = 130, CY = 115, R = 85, MT = 10, MX = 26, W = 260, H = 210, dW = 160;
  const fz = 42, sy = 180;
  const SEGS = 12, GAP = 2.5, START = 135, ARC = 270;
  const SA = (ARC - (SEGS - 1) * GAP) / SEGS;
  const rt = Math.min(Math.max(score / max, 0), 1);
  const filled = Math.round(rt * SEGS);
  const na = (START + rt * ARC) * Math.PI / 180;
  const pa = na + Math.PI / 2;
  const tr = R - MX / 2 + 2;
  const cl = scoreColor(score);
  const ef = dark ? 'rgba(255,255,255,0.04)' : 'rgba(14,57,61,0.06)';
  const nf = dark ? 'rgba(255,255,255,0.4)' : '#1c2a2b';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={dW} style={{ display: 'block' }}>
      {Array.from({ length: SEGS }, (_, i) => {
        const sa = (START + i * (SA + GAP)) * Math.PI / 180;
        const ea = (START + i * (SA + GAP) + SA) * Math.PI / 180;
        const thick = MT + (MX - MT) * (i / (SEGS - 1));
        const ri = R - thick / 2, ro = R + thick / 2;
        const d = `M${(CX+ro*Math.cos(sa)).toFixed(1)},${(CY+ro*Math.sin(sa)).toFixed(1)} A${ro},${ro} 0 0,1 ${(CX+ro*Math.cos(ea)).toFixed(1)},${(CY+ro*Math.sin(ea)).toFixed(1)} L${(CX+ri*Math.cos(ea)).toFixed(1)},${(CY+ri*Math.sin(ea)).toFixed(1)} A${ri},${ri} 0 0,0 ${(CX+ri*Math.cos(sa)).toFixed(1)},${(CY+ri*Math.sin(sa)).toFixed(1)} Z`;
        return <path key={i} d={d} fill={i < filled ? cl : ef} />;
      })}
      <path
        d={`M${(CX+tr*Math.cos(na)).toFixed(1)},${(CY+tr*Math.sin(na)).toFixed(1)} L${(CX+1.8*Math.cos(pa)).toFixed(1)},${(CY+1.8*Math.sin(pa)).toFixed(1)} L${(CX-9*Math.cos(na)).toFixed(1)},${(CY-9*Math.sin(na)).toFixed(1)} L${(CX-1.8*Math.cos(pa)).toFixed(1)},${(CY-1.8*Math.sin(pa)).toFixed(1)} Z`}
        fill={nf} opacity={dark ? 1 : 0.55}
      />
      <circle cx={CX} cy={CY} r={5} fill={dark ? 'rgba(255,255,255,0.1)' : '#1c2a2b'} opacity={dark ? 1 : 0.12} />
      <circle cx={CX} cy={CY} r={2.75} fill={dark ? 'rgba(255,255,255,0.6)' : 'white'} stroke={dark ? 'rgba(255,255,255,0.3)' : '#1c2a2b'} strokeWidth={0.7} />
      <text x={CX} y={sy} textAnchor="middle" fontFamily="'Instrument Serif',Georgia,serif" fontSize={fz} fill={cl}>{score}</text>
      <text x={26} y={174} textAnchor="middle" fontSize={8} fill="#5a6e6f">0</text>
      <text x={234} y={174} textAnchor="middle" fontSize={8} fill="#5a6e6f">{max}</text>
    </svg>
  );
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

// ── DEXA Body Silhouette ─────────────────────────────────────────────────────
// Premium SVG lean/athletic body with regional fat annotations
function BodySilhouette({ trunkFat, armsFat, legsFat, bodyFat, sex }: {
  trunkFat: number | null; armsFat: number | null; legsFat: number | null;
  bodyFat: number | null; sex: string | null;
}) {
  const fatColor = (pct: number | null) => {
    if (pct == null) return '#c8c3ba';
    if (pct < 15) return '#0C9C6C';
    if (pct < 25) return '#5ba37a';
    if (pct < 32) return '#C4A96A';
    return '#E06B5B';
  };

  const trunkC = fatColor(trunkFat);
  const armsC = fatColor(armsFat);
  const legsC = fatColor(legsFat);

  const isMale = sex !== 'female';

  /* ─── Anatomical reference (viewBox 200×440, ~8 head-units) ───
     Head:   y 14–54  (40px = 1 unit)    ellipse cy=34
     Neck:   y 54–68  (14px)
     Chest:  y 68–120 (shoulders at y=78)
     Waist:  y 155–170
     Hips:   y 190–210
     Crotch: y 222
     Knee:   y 330
     Ankle:  y 400
     Sole:   y 418

     Male:   shoulders 56px, waist 40px, hips 48px
     Female: shoulders 52px, waist 34px, hips 56px

     Arms: closed paths, ~20° out, reach to ~y=222 (mid-thigh)
           upper arm 14px wide → forearm 10px → wrist 6px
     Legs: closed paths, thigh 16px → knee 10px → calf 8px → ankle 6px
  */

  return (
    <div className="relative w-[240px] h-[420px] mx-auto flex-shrink-0">
      <svg viewBox="0 0 200 440" width="240" height="420">
        <defs>
          <filter id="bSh" x="-6%" y="-2%" width="112%" height="104%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0e393d" floodOpacity="0.06" />
          </filter>
        </defs>
        <g filter="url(#bSh)">
          {/* Head */}
          <ellipse cx="100" cy="34" rx="14" ry="20" fill="none" stroke="#1c2a2b" strokeWidth="1.2" opacity="0.2" />
          {/* Neck */}
          <path d="M93 54 L93 68 L107 68 L107 54" fill="none" stroke="#1c2a2b" strokeWidth="1" opacity="0.15" />

          {isMale ? (
            <>
              {/* ── MALE TORSO ── shoulders 56, waist 40, hips 48 */}
              <path d={`
                M93 68 Q80 68 72 78
                L73 100 L76 125 L80 148 L80 160
                L78 178 L76 195 L78 208
                Q78 220 88 222
                L94 222 L106 222 L112 222
                Q122 220 122 208
                L124 195 L122 178
                L120 160 L120 148 L124 125 L127 100
                L128 78 Q120 68 107 68 Z
              `} fill={trunkC} fillOpacity="0.12" stroke={trunkC} strokeWidth="1.1" />

              {/* Left Arm — closed shape, ~20° out from body */}
              <path d={`
                M68 76
                L48 126 L34 170 L22 204
                Q18 218 16 226 Q14 232 18 234
                Q22 232 24 224
                L34 198 L46 162 L58 122 L74 88
                Q72 76 68 76 Z
              `} fill={armsC} fillOpacity="0.08" stroke={armsC} strokeWidth="1.1" />

              {/* Right Arm */}
              <path d={`
                M132 76
                L152 126 L166 170 L178 204
                Q182 218 184 226 Q186 232 182 234
                Q178 232 176 224
                L166 198 L154 162 L142 122 L126 88
                Q128 76 132 76 Z
              `} fill={armsC} fillOpacity="0.08" stroke={armsC} strokeWidth="1.1" />

              {/* Left Leg — thigh 16px, knee 10px, ankle 6px */}
              <path d={`
                M78 208
                L76 240 L76 270 L76 300
                L78 330 L80 360 L82 388
                L80 406 Q80 418 86 418
                L90 418 Q92 412 90 404
                L88 388 L88 360 L90 330
                L92 300 L92 270 L92 240
                L94 222
                Q86 214 78 208 Z
              `} fill={legsC} fillOpacity="0.08" stroke={legsC} strokeWidth="1.1" />

              {/* Right Leg */}
              <path d={`
                M122 208
                L124 240 L124 270 L124 300
                L122 330 L120 360 L118 388
                L120 406 Q120 418 114 418
                L110 418 Q108 412 110 404
                L112 388 L112 360 L110 330
                L108 300 L108 270 L108 240
                L106 222
                Q114 214 122 208 Z
              `} fill={legsC} fillOpacity="0.08" stroke={legsC} strokeWidth="1.1" />

              {/* Crotch divider */}
              <line x1="100" y1="220" x2="100" y2="272" stroke={legsC} strokeWidth="0.5" opacity="0.12" />
            </>
          ) : (
            <>
              {/* ── FEMALE TORSO ── shoulders 52, waist 34, hips 56 */}
              <path d={`
                M93 68 Q82 68 74 78
                L75 100 L78 120
                Q80 132 83 142
                Q82 152 80 162
                L76 180 Q72 194 72 204
                Q74 218 86 224
                L94 226 L106 226 L114 224
                Q126 218 128 204
                Q128 194 124 180
                L120 162 Q118 152 117 142
                Q120 132 122 120
                L125 100 L126 78
                Q118 68 107 68 Z
              `} fill={trunkC} fillOpacity="0.12" stroke={trunkC} strokeWidth="1.1" />

              {/* Left Arm */}
              <path d={`
                M70 76
                L52 126 L38 170 L26 204
                Q22 218 20 226 Q18 232 22 234
                Q26 232 28 224
                L38 198 L50 162 L62 122 L74 88
                Q74 76 70 76 Z
              `} fill={armsC} fillOpacity="0.08" stroke={armsC} strokeWidth="1.1" />

              {/* Right Arm */}
              <path d={`
                M130 76
                L148 126 L162 170 L174 204
                Q178 218 180 226 Q182 232 178 234
                Q174 232 172 224
                L162 198 L150 162 L138 122 L126 88
                Q126 76 130 76 Z
              `} fill={armsC} fillOpacity="0.08" stroke={armsC} strokeWidth="1.1" />

              {/* Left Leg — wider thigh from wider hips */}
              <path d={`
                M72 204
                L70 240 L70 270 L72 300
                L74 330 L76 360 L80 388
                L78 406 Q78 418 84 418
                L88 418 Q90 412 88 404
                L86 388 L86 360 L88 330
                L90 300 L90 270 L90 240
                L94 226
                Q82 216 72 204 Z
              `} fill={legsC} fillOpacity="0.08" stroke={legsC} strokeWidth="1.1" />

              {/* Right Leg */}
              <path d={`
                M128 204
                L130 240 L130 270 L128 300
                L126 330 L124 360 L120 388
                L122 406 Q122 418 116 418
                L112 418 Q110 412 112 404
                L114 388 L114 360 L112 330
                L110 300 L110 270 L110 240
                L106 226
                Q118 216 128 204 Z
              `} fill={legsC} fillOpacity="0.08" stroke={legsC} strokeWidth="1.1" />

              {/* Crotch divider */}
              <line x1="100" y1="224" x2="100" y2="276" stroke={legsC} strokeWidth="0.5" opacity="0.12" />
            </>
          )}
        </g>
      </svg>

      {/* ── Floating Labels ── */}
      {bodyFat != null && (
        <div className="absolute" style={{ right: '0px', top: '1%' }}>
          <div className="bg-[#0e393d] rounded-xl shadow-lg px-3 py-1.5 text-center">
            <div className="text-[7px] text-white/50 uppercase tracking-[.1em]">Total Fat</div>
            <div className="text-lg font-bold text-white leading-tight">{bodyFat.toFixed(1)}%</div>
          </div>
        </div>
      )}
      {trunkFat != null && (
        <div className="absolute" style={{ left: '50%', top: '30%', transform: 'translateX(-50%)' }}>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow border border-[#0e393d]/[.08] px-2.5 py-1 text-center">
            <div className="text-[7px] text-[#1c2a2b]/35 uppercase tracking-[.1em]">Trunk</div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: trunkC }}>{trunkFat.toFixed(1)}%</div>
          </div>
        </div>
      )}
      {armsFat != null && (
        <div className="absolute" style={{ left: '0px', top: '24%' }}>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow border border-[#0e393d]/[.08] px-2 py-1 text-center">
            <div className="text-[7px] text-[#1c2a2b]/35 uppercase tracking-[.1em]">Arms</div>
            <div className="text-[11px] font-bold leading-tight" style={{ color: armsC }}>{armsFat.toFixed(1)}%</div>
          </div>
        </div>
      )}
      {legsFat != null && (
        <div className="absolute" style={{ left: '50%', top: '82%', transform: 'translateX(-50%)' }}>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow border border-[#0e393d]/[.08] px-2.5 py-1 text-center">
            <div className="text-[7px] text-[#1c2a2b]/35 uppercase tracking-[.1em]">Legs</div>
            <div className="text-[12px] font-bold leading-tight" style={{ color: legsC }}>{legsFat.toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composition Breakdown Bar ────────────────────────────────────────────────
function CompositionBar({ lean, fat, bone }: { lean: number | null; fat: number | null; bone: number | null }) {
  if (lean == null && fat == null && bone == null) return null;
  // bone is stored in grams, lean/fat in kg — normalize to kg
  const boneKg = bone != null ? (bone >= 100 ? bone / 1000 : bone) : 0;
  const leanKg = lean ?? 0;
  const fatKg = fat ?? 0;
  const total = leanKg + fatKg + boneKg;
  if (total === 0) return null;
  const pctLean = (leanKg / total) * 100;
  const pctFat = (fatKg / total) * 100;
  const pctBone = (boneKg / total) * 100;

  return (
    <div>
      <div className="flex h-6 rounded-full overflow-hidden shadow-inner">
        <div className="transition-all duration-700 flex items-center justify-center"
          style={{ width: `${pctLean}%`, background: 'linear-gradient(135deg, #0e393d, #16a34a)' }}>
          {pctLean > 12 && <span className="text-[9px] font-bold text-white">{pctLean.toFixed(0)}%</span>}
        </div>
        <div className="transition-all duration-700 flex items-center justify-center"
          style={{ width: `${pctFat}%`, background: 'linear-gradient(135deg, #C4A96A, #d97706)' }}>
          {pctFat > 6 && <span className="text-[9px] font-bold text-white">{pctFat.toFixed(0)}%</span>}
        </div>
        <div className="transition-all duration-700 flex items-center justify-center"
          style={{ width: `${Math.max(pctBone, 2)}%`, background: 'linear-gradient(135deg, #94a3b8, #64748b)' }}>
          {pctBone > 4 && <span className="text-[9px] font-bold text-white">{pctBone.toFixed(0)}%</span>}
        </div>
      </div>
      <div className="flex items-center gap-5 mt-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#0e393d' }} />
          <span className="text-[10px] text-[#1c2a2b]/50">Lean Mass</span>
          {lean != null && <span className="text-[10px] font-bold text-[#0e393d]">{leanKg.toFixed(1)} kg</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#C4A96A' }} />
          <span className="text-[10px] text-[#1c2a2b]/50">Fat Mass</span>
          {fat != null && <span className="text-[10px] font-bold text-[#d97706]">{fatKg.toFixed(1)} kg</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#94a3b8' }} />
          <span className="text-[10px] text-[#1c2a2b]/50">Bone</span>
          {bone != null && <span className="text-[10px] font-bold text-[#64748b]">{boneKg.toFixed(1)} kg</span>}
        </div>
      </div>
    </div>
  );
}

// ── Android/Gynoid Ratio Gauge ───────────────────────────────────────────────
function AGRatioGauge({ ratio }: { ratio: number | null }) {
  if (ratio == null) return null;
  // Healthy ratio: men ~0.8-1.0, women ~0.6-0.8; risk > 1.0
  const position = Math.min(100, Math.max(0, (ratio / 1.5) * 100));
  const color = ratio <= 0.85 ? '#0C9C6C' : ratio <= 1.0 ? '#5ba37a' : ratio <= 1.2 ? '#C4A96A' : '#E06B5B';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-[#1c2a2b]/40">Gynoid (pear)</span>
        <span className="text-[10px] text-[#1c2a2b]/40">Android (apple)</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden"
        style={{ background: 'linear-gradient(90deg, #0C9C6C, #5ba37a 40%, #C4A96A 65%, #E06B5B 90%)' }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-md border-2 transition-all duration-500"
          style={{ left: `${position}%`, borderColor: color }} />
      </div>
      <div className="text-center mt-2">
        <span className="text-xl font-bold" style={{ color }}>{ratio.toFixed(2)}</span>
        <span className="text-[10px] text-[#1c2a2b]/40 ml-1">A/G Ratio</span>
      </div>
    </div>
  );
}

// ── Training Zone Chart (VO2max) ─────────────────────────────────────────────
function TrainingZoneChart({ vo2max, vt1, vt1Hr, vt2, vt2Hr, maxHr, restHr }: {
  vo2max: number | null; vt1: number | null; vt1Hr: number | null;
  vt2: number | null; vt2Hr: number | null; maxHr: number | null; restHr: number | null;
}) {
  if (vo2max == null) return null;

  // Derive zone boundaries from VT1/VT2 or use defaults based on maxHR
  const mHr = maxHr ?? 190;
  const z1End = vt1Hr ? vt1Hr - 5 : Math.round(mHr * 0.6);
  const z2End = vt1Hr ?? Math.round(mHr * 0.7);
  const z3End = vt2Hr ? vt2Hr - 5 : Math.round(mHr * 0.8);
  const z4End = vt2Hr ?? Math.round(mHr * 0.9);
  const z5End = mHr;

  const zones = [
    { name: 'Zone 1', label: 'Recovery', hr: `< ${z1End}`, color: '#94a3b8', pct: 20 },
    { name: 'Zone 2', label: 'Aerobic Base', hr: `${z1End}–${z2End}`, color: '#0C9C6C', pct: 20 },
    { name: 'Zone 3', label: 'Tempo', hr: `${z2End}–${z3End}`, color: '#C4A96A', pct: 20 },
    { name: 'Zone 4', label: 'Threshold', hr: `${z3End}–${z4End}`, color: '#d97706', pct: 20 },
    { name: 'Zone 5', label: 'VO₂max', hr: `${z4End}–${z5End}`, color: '#E06B5B', pct: 20 },
  ];

  // VT markers relative positions
  const hrRange = z5End - (restHr ?? Math.round(mHr * 0.45));
  const vt1Pos = vt1Hr ? ((vt1Hr - (restHr ?? Math.round(mHr * 0.45))) / hrRange) * 100 : null;
  const vt2Pos = vt2Hr ? ((vt2Hr - (restHr ?? Math.round(mHr * 0.45))) / hrRange) * 100 : null;

  return (
    <div>
      {/* Zone bars */}
      <div className="flex h-12 rounded-xl overflow-hidden shadow-inner mb-3">
        {zones.map((z, i) => (
          <div key={i} className="relative flex-1 flex flex-col items-center justify-center transition-all hover:flex-[1.3]"
            style={{ background: z.color }}>
            <span className="text-[9px] font-bold text-white/90">{z.name}</span>
            <span className="text-[7px] text-white/60">{z.hr} bpm</span>
          </div>
        ))}
      </div>

      {/* VT markers on a continuous line */}
      <div className="relative h-8 mb-4">
        <div className="absolute top-3 left-0 right-0 h-[2px] bg-[#1c2a2b]/10 rounded-full" />
        {vt1Pos != null && (
          <div className="absolute -translate-x-1/2" style={{ left: `${Math.min(95, Math.max(5, vt1Pos))}%`, top: 0 }}>
            <div className="w-0.5 h-6 bg-[#0C9C6C] mx-auto" />
            <div className="text-[8px] font-bold text-[#0C9C6C] text-center whitespace-nowrap mt-0.5">
              VT1 {vt1Hr && `${vt1Hr} bpm`}
            </div>
          </div>
        )}
        {vt2Pos != null && (
          <div className="absolute -translate-x-1/2" style={{ left: `${Math.min(95, Math.max(5, vt2Pos))}%`, top: 0 }}>
            <div className="w-0.5 h-6 bg-[#d97706] mx-auto" />
            <div className="text-[8px] font-bold text-[#d97706] text-center whitespace-nowrap mt-0.5">
              VT2 {vt2Hr && `${vt2Hr} bpm`}
            </div>
          </div>
        )}
      </div>

      {/* Zone legend with descriptions */}
      <div className="grid grid-cols-5 gap-1.5">
        {zones.map((z, i) => (
          <div key={i} className="text-center">
            <div className="w-full h-1 rounded-full mb-1" style={{ background: z.color }} />
            <div className="text-[8px] font-semibold text-[#1c2a2b]/60">{z.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VO2max Percentile Gauge ──────────────────────────────────────────────────
function VO2maxGauge({ vo2max, sex }: { vo2max: number; sex: string | null }) {
  // Approximate percentile for age 30-39 (general reference)
  // Men: Poor <33, Fair 33-36, Good 37-41, Excellent 42-46, Superior >46
  // Women: Poor <28, Fair 28-31, Good 32-36, Excellent 37-41, Superior >41
  const isMale = sex !== 'female';
  const thresholds = isMale
    ? [33, 37, 42, 47]
    : [28, 32, 37, 42];
  const labels = ['Poor', 'Fair', 'Good', 'Excellent', 'Superior'];
  const colors = ['#E06B5B', '#C4A96A', '#5ba37a', '#0C9C6C', '#0e393d'];

  let level = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (vo2max >= thresholds[i]) level = i + 1;
  }

  const maxVal = isMale ? 60 : 55;
  const pct = Math.min(100, Math.max(0, (vo2max / maxVal) * 100));

  return (
    <div className="text-center">
      <div className="relative w-full max-w-[280px] mx-auto">
        {/* Semicircle gauge */}
        <svg viewBox="0 0 200 110" className="w-full">
          {/* Background arc segments */}
          {[0, 1, 2, 3, 4].map(i => {
            const startAngle = Math.PI + (i / 5) * Math.PI;
            const endAngle = Math.PI + ((i + 1) / 5) * Math.PI;
            const r = 85;
            const x1 = 100 + r * Math.cos(startAngle);
            const y1 = 100 + r * Math.sin(startAngle);
            const x2 = 100 + r * Math.cos(endAngle);
            const y2 = 100 + r * Math.sin(endAngle);
            return (
              <path key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                fill="none" stroke={colors[i]} strokeWidth="14"
                opacity={i <= level ? 0.9 : 0.15}
                strokeLinecap="butt" />
            );
          })}
          {/* Needle */}
          {(() => {
            const angle = Math.PI + (pct / 100) * Math.PI;
            const nx = 100 + 65 * Math.cos(angle);
            const ny = 100 + 65 * Math.sin(angle);
            return <line x1="100" y1="100" x2={nx} y2={ny}
              stroke="#0e393d" strokeWidth="2.5" strokeLinecap="round" />;
          })()}
          <circle cx="100" cy="100" r="5" fill="#0e393d" />
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className="font-serif text-3xl text-[#0e393d]">{vo2max.toFixed(1)}</div>
          <div className="text-[10px] text-[#1c2a2b]/40">ml/kg/min</div>
        </div>
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
        style={{ background: `${colors[level]}15`, color: colors[level] }}>
        <span className="text-xs font-bold">{labels[level]}</span>
      </div>
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
          isCalculated: def.is_calculated === true,
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

    // Longevity score: weighted score EXCLUDING epigenetics/genetic domains
    const nonEpiDomains = domains.filter(d => d.key !== 'epigenetics');
    const longevityScores = displayDates.map((_, di) => {
      let wSum = 0, wUsed = 0;
      for (const d of nonEpiDomains) {
        if (d.scores[di] > 0) {
          wSum += d.scores[di] * d.weight;
          wUsed += d.weight;
        }
      }
      return wUsed > 0 ? Math.round(wSum / wUsed) : 0;
    });
    const longevityLatest = longevityScores[longevityScores.length - 1] || 0;
    const longevityScoreData = displayDates
      .map((d, i) => {
        const domsWithData = nonEpiDomains.filter(dom => dom.scores[i] > 0).length;
        return { date: displayLabels[i], score: longevityScores[i], domsWithData };
      })
      .filter(d => d.domsWithData >= 3);

    const longevitySorted = [...nonEpiDomains].sort((a, b) =>
      (b.scores[b.scores.length - 1] || 0) - (a.scores[a.scores.length - 1] || 0));
    const longevityBest = longevitySorted[0];
    const longevityWorst = longevitySorted[longevitySorted.length - 1];

    // Top ranked markers by sort_order
    const topRankedMarkers = [...allMarkers]
      .map(m => {
        const def = defMap.get(m.defId);
        return { ...m, sort: def?.sort_order ?? 999 };
      })
      .sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999))
      .slice(0, 8);

    // Biological age clocks from epigenetics domain
    // DB slugs use underscores (pheno_age, grim_age_v2, dunedin_pace);
    // canonical keys used by the render section strip them (phenoage, grimage_v2, dunedinpace).
    const epiDomain = domains.find(d => d.key === 'epigenetics');
    const bioClocks: Record<string, { name: string; values: (number | null)[]; latest: number | null }> = {};
    if (epiDomain) {
      const clockSlugs = ['phenoage', 'grimage_v2', 'grimage', 'dunedinpace', 'pace_of_aging'] as const;
      for (const marker of epiDomain.markers) {
        const norm = marker.slug.toLowerCase().replace(/_/g, ''); // strip underscores
        for (const key of clockSlugs) {
          if (norm.includes(key.replace(/_/g, ''))) {
            const canonical = key === 'grimage' ? 'grimage_v2' : key === 'pace_of_aging' ? 'dunedinpace' : key;
            if (!bioClocks[canonical]) {
              bioClocks[canonical] = { name: marker.name, values: marker.values, latest: marker.latest };
            }
            break;
          }
        }
      }
    }

    return {
      displayDates, displayLabels,
      domains, overallScores, latestOverall, scoreData,
      best, worst, flags, flagTotal,
      borderline, improved, featured, allMarkers,
      radarData, markerCount, firstMeaningfulScore,
      longevityScores, longevityLatest, longevityScoreData, longevityBest, longevityWorst,
      topRankedMarkers, nonEpiDomainCount: nonEpiDomains.length,
      bioClocks, mData, defMap,
    };
  }, [reports, results, definitions, lang]);

  // ── DEXA & Fitness data extraction ─────────────────────────
  const dexaData = useMemo(() => {
    const defBySlug = new Map(definitions.map(d => [d.slug, d]));
    const latestVal = (slug: string): number | null => {
      const def = defBySlug.get(slug);
      if (!def) return null;
      const vals = results
        .filter(r => r.biomarker_definition_id === def.id && r.value_numeric != null)
        .sort((a, b) => (b.test_date || b.measured_at || '').localeCompare(a.test_date || a.measured_at || ''));
      return vals[0]?.value_numeric ?? null;
    };
    const defId = (slug: string) => defBySlug.get(slug)?.id ?? null;
    const defInfo = (slug: string) => {
      const d = defBySlug.get(slug);
      return d ? { id: d.id, unit: d.unit || '', refLow: d.ref_range_low, refHigh: d.ref_range_high, optLow: d.optimal_range_low, optHigh: d.optimal_range_high } : null;
    };

    return {
      bodyFatPct: latestVal('body_fat_pct'),
      muscleMassPct: latestVal('muscle_mass_pct'),
      visceralFat: latestVal('visceral_fat'),
      boneDensityTScore: latestVal('bone_density_t_score'),
      bmi: latestVal('bmi'),
      leanMass: latestVal('lean_mass'),
      fatMass: latestVal('fat_mass'),
      boneMineralContent: latestVal('bone_mineral_content'),
      trunkFatPct: latestVal('trunk_fat_pct'),
      armsFatPct: latestVal('arms_fat_pct'),
      legsFatPct: latestVal('legs_fat_pct'),
      androidGynoidRatio: latestVal('android_gynoid_ratio'),
      // For trend charts
      defs: {
        bodyFatPct: defInfo('body_fat_pct'),
        muscleMassPct: defInfo('muscle_mass_pct'),
        visceralFat: defInfo('visceral_fat'),
        leanMass: defInfo('lean_mass'),
      },
    };
  }, [definitions, results]);

  const fitnessData = useMemo(() => {
    const defBySlug = new Map(definitions.map(d => [d.slug, d]));
    const latestVal = (slug: string): number | null => {
      const def = defBySlug.get(slug);
      if (!def) return null;
      const vals = results
        .filter(r => r.biomarker_definition_id === def.id && r.value_numeric != null)
        .sort((a, b) => (b.test_date || b.measured_at || '').localeCompare(a.test_date || a.measured_at || ''));
      return vals[0]?.value_numeric ?? null;
    };
    const defInfo = (slug: string) => {
      const d = defBySlug.get(slug);
      return d ? { id: d.id, unit: d.unit || '', refLow: d.ref_range_low, refHigh: d.ref_range_high, optLow: d.optimal_range_low, optHigh: d.optimal_range_high } : null;
    };

    return {
      vo2max: latestVal('vo2max'),
      vo2maxAbsolute: latestVal('vo2max_absolute'),
      vt1: latestVal('vt1'),
      vt1HeartRate: latestVal('vt1_heart_rate'),
      vt2: latestVal('vt2'),
      vt2HeartRate: latestVal('vt2_heart_rate'),
      restingHeartRate: latestVal('resting_heart_rate'),
      maxHeartRate: latestVal('max_heart_rate'),
      hrv: latestVal('hrv'),
      maxPowerOutput: latestVal('max_power_output'),
      rerPeak: latestVal('rer_peak'),
      spo2: latestVal('spo2'),
      spo2Peak: latestVal('spo2_peak'),
      // For trend charts
      defs: {
        vo2max: defInfo('vo2max'),
        hrv: defInfo('hrv'),
        restingHeartRate: defInfo('resting_heart_rate'),
      },
    };
  }, [definitions, results]);

  const hasDexa = dexaData.bodyFatPct != null || dexaData.leanMass != null || dexaData.fatMass != null;
  const hasFitness = fitnessData.vo2max != null;

  // ── Sub-group definitions for mixed domains ─────────────────────
  const DOMAIN_SUBGROUPS: Record<string, { label: string; slugs: string[] }[]> = {
    fitness: [
      { label: 'VO₂max Test', slugs: ['vo2max', 'vo2max_absolute', 'vt1', 'vt2', 'vt1_heart_rate', 'vt2_heart_rate', 'max_heart_rate', 'max_power_output', 'rer_peak', 'spo2_peak'] },
      { label: 'Vitality Check', slugs: ['grip_strength', 'ages_skin_scan', 'spo2', 'resting_heart_rate', 'hrv'] },
    ],
    body_composition: [
      { label: 'DEXA Scan', slugs: ['body_fat_pct', 'muscle_mass_pct', 'lean_mass', 'fat_mass', 'bone_density_t_score', 'bone_mineral_content', 'trunk_fat_pct', 'arms_fat_pct', 'legs_fat_pct', 'android_gynoid_ratio', 'visceral_fat'] },
      { label: 'General', slugs: ['bmi', 'body_weight', 'wht_ratio'] },
    ],
  };

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
    epigenetics: {
      en: 'Epigenetic clocks measure biological aging at the molecular level. GrimAge and DunedinPACE predict healthspan and mortality better than any other biomarker.',
      de: 'Epigenetische Uhren messen das biologische Altern auf molekularer Ebene. GrimAge und DunedinPACE sagen Gesundheitsspanne und Sterblichkeit besser voraus als jeder andere Biomarker.',
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

        {/* ── AUDIO HEALTH BRIEFING ── */}
        <section className="mb-8">
          <div className="bg-gradient-to-r from-[#0e393d] to-[#13474c] rounded-2xl overflow-hidden shadow-lg">
            <div className="p-6 flex items-center gap-5">
              {/* Play button */}
              <button className="w-14 h-14 rounded-full bg-[#0C9C6C] hover:bg-[#0ab07a] transition-colors flex items-center justify-center shrink-0 shadow-lg shadow-[#0C9C6C]/20">
                <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
                  <path d="M2 1.5v19l16-9.5L2 1.5z" fill="white" />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[13px] font-semibold text-white">{t.healthBriefing}</h3>
                  <span className="text-[9px] font-semibold tracking-[.08em] uppercase px-2 py-0.5 rounded-full bg-[#ceab84]/15 text-[#ceab84]">{t.comingSoon}</span>
                </div>
                <p className="text-[11px] text-white/40 mb-3">{t.briefingSub}</p>
                {/* Waveform placeholder */}
                <div className="flex items-center gap-[2px] h-5">
                  {Array.from({ length: 48 }, (_, i) => {
                    const h = 4 + Math.sin(i * 0.4) * 8 + Math.random() * 6;
                    return <div key={i} className="w-[3px] rounded-full bg-white/15" style={{ height: h }} />;
                  })}
                  <span className="text-[10px] text-white/25 ml-2">1:12</span>
                </div>
              </div>
            </div>
            {/* Chat input */}
            <div className="px-6 pb-5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.askAnything}
                  disabled
                  className="flex-1 rounded-xl bg-white/[.06] border border-white/[.08] px-4 py-2.5 text-[12px] text-white/40 placeholder:text-white/25 outline-none"
                />
                <button disabled className="rounded-xl bg-white/[.06] border border-white/[.08] px-4 py-2.5 text-[11px] font-semibold text-white/25">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── TWO GAUGES: LONGEVITY SCORE + BIOLOGICAL AGE CLOCKS ── */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-3.5 mb-6">

            {/* ─── LEFT: LONGEVITY SCORE gauge card ─── */}
            <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
                <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#ceab84] mb-2 self-start">
                  {t.longevityScore}
                </div>
                <div className="mt-2 mb-1"><Gauge score={dash.longevityLatest} max={100} dark /></div>
                <div className="text-xs text-white/30 text-center">
                  {t.basedOnDomains.replace('{n}', String(dash.nonEpiDomainCount || 8))}
                </div>
                <div className="text-[10px] text-white/[.18] text-center leading-snug mt-1">
                  {t.epigeneticsSeparate}
                </div>
              </div>

              {/* Best Domain / Focus Area panels */}
              <div className="grid grid-cols-2 border-t border-white/[.06]">
                {dash.longevityBest && (
                  <div className="px-3.5 py-[11px] flex flex-col gap-0.5 border-r border-white/[.06]">
                    <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">{t.bestDomain}</div>
                    <div className="font-serif text-[1.3rem] leading-none text-[#0C9C6C]">
                      {dash.longevityBest.scores[dash.longevityBest.scores.length - 1]}
                    </div>
                    <div className="text-xs text-white/22">{getName(dash.longevityBest.name, lang).split(/\s*\(/)[0]}</div>
                  </div>
                )}
                {dash.longevityWorst && (
                  <div className="px-3.5 py-[11px] flex flex-col gap-0.5">
                    <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">{t.focusArea}</div>
                    <div className="font-serif text-[1.3rem] leading-none text-[#C4A96A]">
                      {dash.longevityWorst.scores[dash.longevityWorst.scores.length - 1]}
                    </div>
                    <div className="text-xs text-white/22">{getName(dash.longevityWorst.name, lang).split(/\s*\(/)[0]}</div>
                  </div>
                )}
              </div>

              {/* Score history chart */}
              {dash.longevityScoreData.length >= 2 && (
                <div className="border-t border-white/[.06] px-4 py-3 bg-black/[.12]">
                  <div className="text-[10px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5">{t.scoreHistory}</div>
                  <div className="h-[110px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dash.longevityScoreData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 3']} tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} tickCount={4} />
                        <RTooltip
                          formatter={(v: unknown) => [v as number, 'Score']}
                          contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }}
                          labelStyle={{ color: 'rgba(255,255,255,.6)' }}
                        />
                        <Line type="monotone" dataKey="score" stroke="#0C9C6C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* ─── RIGHT: BIOLOGICAL AGE CLOCKS gauge card ─── */}
            {(() => {
              const hasBioClocks = Object.keys(dash.bioClocks).length > 0 && profile?.date_of_birth;
              if (!hasBioClocks) return null;

              const birthDate = new Date(profile!.date_of_birth!);
              const today = new Date();
              const chronoAge = +(((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1));

              const paceRate = dash.bioClocks['dunedinpace']?.latest;
              const paceProjected = paceRate != null ? +(paceRate * chronoAge).toFixed(1) : null;

              // Compute average bio age
              const bioAgeValues: number[] = [];
              const phenoLatest = dash.bioClocks['phenoage']?.latest;
              const grimLatest = dash.bioClocks['grimage_v2']?.latest;
              if (phenoLatest != null) bioAgeValues.push(phenoLatest);
              if (grimLatest != null) bioAgeValues.push(grimLatest);
              if (paceProjected != null) bioAgeValues.push(paceProjected);
              const avgBioAge = bioAgeValues.length > 0 ? +(bioAgeValues.reduce((a, b) => a + b, 0) / bioAgeValues.length).toFixed(1) : null;
              const avgDiff = avgBioAge != null ? +(avgBioAge - chronoAge).toFixed(1) : null;
              const bioGaugeScore = avgDiff != null ? Math.max(0, Math.min(100, Math.round(50 - avgDiff * 5))) : 50;

              // Best / worst clock
              const CLOCK_SLUGS = [
                { slug: 'phenoage', label: 'PhenoAge', isDunedin: false },
                { slug: 'grimage_v2', label: 'GrimAge v2', isDunedin: false },
                { slug: 'dunedinpace', label: 'DunedinPACE', isDunedin: true },
              ];
              const clockEntries = CLOCK_SLUGS
                .map(c => {
                  const clock = dash.bioClocks[c.slug];
                  if (!clock) return null;
                  const age = c.isDunedin ? paceProjected : clock.latest;
                  const diff = age != null ? age - chronoAge : null;
                  return { ...c, age, diff };
                })
                .filter((x): x is NonNullable<typeof x> => x != null && x.diff != null);
              const best = clockEntries.length > 0 ? clockEntries.reduce((a, b) => (a.diff! < b.diff! ? a : b)) : null;
              const worst = clockEntries.length > 1 ? clockEntries.reduce((a, b) => (a.diff! > b.diff! ? a : b)) : null;

              // Bio age trend chart data
              const CLOCKS_META: { slug: string; color: string; isDunedin?: boolean }[] = [
                { slug: 'phenoage', color: '#0C9C6C' },
                { slug: 'grimage_v2', color: '#8b5cf6' },
                { slug: 'dunedinpace', color: '#ceab84', isDunedin: true },
              ];
              const chartData = dash.displayDates.map((_: string, di: number) => {
                const point: Record<string, string | number | null> = { date: dash.displayLabels[di], chron: chronoAge };
                for (const c of CLOCKS_META) {
                  const clock = dash.bioClocks[c.slug];
                  if (!clock || clock.values[di] == null) continue;
                  if (c.isDunedin) {
                    point['DunedinPACE×age'] = +((clock.values[di] as number) * chronoAge).toFixed(1);
                  } else {
                    point[c.slug === 'phenoage' ? 'PhenoAge' : 'GrimAge v2'] = clock.values[di];
                  }
                }
                return point;
              });
              const allAges = chartData.flatMap(d =>
                ['PhenoAge', 'GrimAge v2', 'DunedinPACE×age'].map(k => d[k] as number | null).filter((v): v is number => v != null)
              );
              const bioYMin = allAges.length > 0 ? Math.floor(Math.min(...allAges, chronoAge) / 5) * 5 - 2 : chronoAge - 10;
              const bioYMax = allAges.length > 0 ? Math.ceil(Math.max(...allAges, chronoAge) / 5) * 5 + 2 : chronoAge + 10;

              return (
                <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
                    <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#ceab84] mb-2 self-start">
                      {t.bioAgeClocks}
                    </div>
                    <div className="mt-2 mb-1"><Gauge score={bioGaugeScore} max={100} dark /></div>
                    {avgBioAge != null && (
                      <>
                        <div className="text-xs text-white/30 text-center">
                          {avgDiff != null && (avgDiff < 0
                            ? `↓ ${Math.abs(avgDiff).toFixed(1)} years younger than chronological age`
                            : `↑ ${avgDiff.toFixed(1)} years older than chronological age`
                          )}
                        </div>
                        <div className="text-[10px] text-white/[.18] text-center leading-snug mt-1">
                          {t.bioAgeDesc} · avg. across {bioAgeValues.length} clocks
                        </div>
                      </>
                    )}
                  </div>

                  {/* Best Clock / Focus Clock panels */}
                  <div className="grid grid-cols-2 border-t border-white/[.06]">
                    {best && (
                      <div className="px-3.5 py-[11px] flex flex-col gap-0.5 border-r border-white/[.06]">
                        <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">Best Clock</div>
                        <div className="font-serif text-[1.3rem] leading-none text-[#0C9C6C]">{best.age?.toFixed(1)}</div>
                        <div className="text-xs text-white/22">{best.label}</div>
                      </div>
                    )}
                    {worst && worst.slug !== best?.slug && (
                      <div className="px-3.5 py-[11px] flex flex-col gap-0.5">
                        <div className="text-xs font-semibold tracking-[.08em] uppercase text-white/28">Focus Clock</div>
                        <div className="font-serif text-[1.3rem] leading-none text-[#C4A96A]">{worst.age?.toFixed(1)}</div>
                        <div className="text-xs text-white/22">{worst.label}</div>
                      </div>
                    )}
                  </div>

                  {/* Bio age trend chart */}
                  {allAges.length > 0 && (
                    <div className="border-t border-white/[.06] px-4 py-3 bg-black/[.12]">
                      <div className="text-[10px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5">Bio Clocks vs Chronological</div>
                      <div className="h-[110px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[bioYMin, bioYMax]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} tickCount={4} />
                            <RTooltip
                              formatter={(v) => typeof v === 'number' ? v.toFixed(1) : String(v ?? '')}
                              contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }}
                              labelStyle={{ color: 'rgba(255,255,255,.5)' }}
                              itemStyle={{ fontSize: 11 }}
                            />
                            <Line name="Chronological" type="monotone" dataKey="chron" stroke="rgba(255,255,255,.2)" strokeWidth={1} strokeDasharray="5 4" dot={false} />
                            {dash.bioClocks['phenoage'] && <Line name="PhenoAge" type="monotone" dataKey="PhenoAge" stroke="#0C9C6C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                            {dash.bioClocks['grimage_v2'] && <Line name="GrimAge v2" type="monotone" dataKey="GrimAge v2" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />}
                            {dash.bioClocks['dunedinpace'] && <Line name="DunedinPACE×age" type="monotone" dataKey="DunedinPACE×age" stroke="#ceab84" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* YOUR PROGRESS bar below the two gauges */}
          <div className="bg-[#0e393d] rounded-2xl p-6 shadow-lg mb-6">
            <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-4">{t.yourProgress}</div>

            {(dash.borderline.length > 0 || dash.improved.length > 0) ? (
              <div className="grid md:grid-cols-2 gap-6">
                {dash.borderline.length > 0 && (
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-2">{t.borderlineHead.replace('{n}', String(dash.borderline.length))}</div>
                    <div className="h-1 rounded-full bg-[#C4A96A]/20 mb-3 overflow-hidden">
                      <div className="h-full bg-[#C4A96A]" style={{ width: `${Math.min(100, (dash.borderline.length / dash.flagTotal) * 100)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dash.borderline.slice(0, 6).map((m) => (
                        <span key={m.defId} className="text-[10px] px-2.5 py-1 rounded-full bg-[#C4A96A]/15 text-[#C4A96A] font-medium">{m.name}</span>
                      ))}
                      {dash.borderline.length > 6 && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-white/40">+{dash.borderline.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}
                {dash.improved.length > 0 && (
                  <div>
                    <div className="text-[13px] font-semibold text-white mb-2">{t.improvedHead.replace('{n}', String(dash.improved.length))}</div>
                    <div className="h-1 rounded-full bg-[#0C9C6C]/20 mb-3 overflow-hidden">
                      <div className="h-full bg-[#0C9C6C]" style={{ width: `${Math.min(100, (dash.improved.length / dash.flagTotal) * 100)}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dash.improved.slice(0, 6).map((m) => (
                        <span key={m.defId} className="text-[10px] px-2.5 py-1 rounded-full bg-[#0C9C6C]/15 text-[#0C9C6C] font-medium">{m.name}</span>
                      ))}
                      {dash.improved.length > 6 && (
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-white/40">+{dash.improved.length - 6}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                  { status: 'optimal' as MStatus, count: dash.flags.optimal, label: t.optLabel },
                  { status: 'good' as MStatus, count: dash.flags.good, label: t.goodLabel },
                  { status: 'moderate' as MStatus, count: dash.flags.moderate, label: t.modLabel },
                  { status: 'risk' as MStatus, count: dash.flags.risk, label: t.riskLabel },
                ]).map(row => (
                  <div key={row.status} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(row.status) }} />
                    <span className="text-[11px] text-white/40 w-16">{row.label}</span>
                    <div className="flex-1 h-[5px] rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${dash.flagTotal ? (row.count / dash.flagTotal * 100) : 0}%`, background: statusColor(row.status) }} />
                    </div>
                    <span className="text-sm font-semibold text-white/60 w-6 text-right">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {dash.longevityBest && (
              <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#0C9C6C]/60 mb-2">{t.topStrength}</div>
                <div className="text-[13px] font-semibold text-[#0e393d] mb-2">{getName(dash.longevityBest.name, lang).split(/\s*\(/)[0]}</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-xl" style={{ color: scoreColor(dash.longevityBest.scores[dash.longevityBest.scores.length - 1]) }}>
                    {dash.longevityBest.scores[dash.longevityBest.scores.length - 1]}
                  </span>
                  <span className="text-[10px] text-[#1c2a2b]/40">{dash.longevityBest.markers.length} {t.markers}</span>
                </div>
              </div>
            )}
            {dash.longevityWorst && (
              <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#C4A96A]/80 mb-2">{t.priorityAction}</div>
                <div className="text-[13px] font-semibold text-[#0e393d] mb-2">{getName(dash.longevityWorst.name, lang).split(/\s*\(/)[0]}</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-xl" style={{ color: scoreColor(dash.longevityWorst.scores[dash.longevityWorst.scores.length - 1]) }}>
                    {dash.longevityWorst.scores[dash.longevityWorst.scores.length - 1]}
                  </span>
                </div>
              </div>
            )}
            {dash.firstMeaningfulScore != null && (
              <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-2">{t.monthProgress}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-serif text-xl" style={{ color: scoreColor(dash.firstMeaningfulScore) }}>{dash.firstMeaningfulScore}</span>
                  <span className="text-[#1c2a2b]/25 mx-1">→</span>
                  <span className="font-serif text-xl" style={{ color: scoreColor(dash.longevityLatest) }}>{dash.longevityLatest}</span>
                </div>
                <div className="text-[11px] text-[#1c2a2b]/50">
                  {dash.longevityLatest - dash.firstMeaningfulScore >= 0 ? '+' : ''}{dash.longevityLatest - dash.firstMeaningfulScore} pts
                </div>
              </div>
            )}
          </div>
        </section>

        {/* KEY MARKERS SECTION */}
        {dash.topRankedMarkers.length > 0 && (
          <section className="mb-16">
            <SectionTag>{t.secKm}</SectionTag>
            <p className="text-sm text-[#1c2a2b]/40 mb-5">{t.impactful}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {dash.topRankedMarkers.map((m) => (
                <div key={m.defId} className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                  style={{ borderTop: `4px solid ${statusColor(m.latestStatus)}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] text-[#1c2a2b]/50 font-medium">{m.domainName}</span>
                    <StatusBadge status={m.latestStatus} t={t} />
                  </div>
                  <div className="text-[12px] font-semibold text-[#0e393d] mb-3 leading-snug">{m.name}</div>
                  {m.latest != null && (
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="font-serif text-[2rem] text-[#1c2a2b] leading-none">
                        {m.latest.toLocaleString('de-CH', { maximumFractionDigits: 1 })}
                      </span>
                      <span className="text-[11px] text-[#1c2a2b]/40">{m.unit}</span>
                    </div>
                  )}
                  <MiniRangeBar value={m.latest ?? 0} refLow={m.refLow} refHigh={m.refHigh}
                    optLow={m.optLow} optHigh={m.optHigh} status={m.latestStatus} />
                  {m.delta != null && (
                    <div className="mt-2 pt-2 border-t border-[#1c2a2b]/[.06]">
                      <div className="text-[10px] text-[#1c2a2b]/50">
                        vs previous: {m.delta >= 0 ? '+' : ''}{m.delta.toFixed(2)} {m.unit}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DOMAIN BALANCE SECTION */}
        <section className="mb-16">
          <SectionTag>{t.domainBalance}</SectionTag>

          <div className="bg-[#0e393d] rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-[1fr_1fr] gap-8">

              {/* LEFT: Radar chart */}
              <div>
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-4">{t.domainBalance}</div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={dash.radarData} cx="50%" cy="50%" outerRadius="65%">
                      <PolarGrid stroke="rgba(255,255,255,.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)' }} />
                      <Radar name="Current" dataKey="current" fill="rgba(12,156,108,.08)" stroke="#0C9C6C" strokeWidth={2.5}
                        animationBegin={200} animationDuration={800} />
                      <Radar name="Previous" dataKey="previous" fill="none" stroke="rgba(206,171,132,.25)" strokeWidth={1.5} strokeDasharray="4 3" />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RIGHT: Marker Status panel */}
              <div>
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-4">{t.markerStatus}</div>
                <div className="space-y-3">
                  {([
                    { status: 'optimal' as MStatus, count: dash.flags.optimal, label: t.optLabel },
                    { status: 'good' as MStatus, count: dash.flags.good, label: t.goodLabel },
                    { status: 'moderate' as MStatus, count: dash.flags.moderate, label: t.modLabel },
                    { status: 'risk' as MStatus, count: dash.flags.risk, label: t.riskLabel },
                  ]).map(row => (
                    <div key={row.status} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(row.status) }} />
                      <span className="text-[11px] text-white/40 w-20">{row.label}</span>
                      <div className="flex-1 h-[5px] rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${dash.flagTotal ? (row.count / dash.flagTotal * 100) : 0}%`, background: statusColor(row.status) }} />
                      </div>
                      <span className="text-sm font-semibold text-white/60 w-8 text-right">{row.count}</span>
                    </div>
                  ))}
                  <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/30">
                    {dash.flagTotal} {t.markers} {t.atAGlance}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ DEXA BODY COMPOSITION SECTION ═══════ */}
        {hasDexa && (
          <section className="mb-16">
            <SectionTag>BODY COMPOSITION</SectionTag>

            <div className="bg-white rounded-2xl border border-[#0e393d]/[.08] shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="bg-[#0e393d] px-8 py-5 flex items-center justify-between">
                <div>
                  <span className="font-serif text-white text-lg block">DEXA Body Composition</span>
                  <span className="text-[10px] text-white/35 tracking-[.1em] uppercase">Gold-standard measurement</span>
                </div>
                <div className="text-[10px] text-[#ceab84] font-semibold tracking-[.12em] uppercase">Body Scan</div>
              </div>

              <div className="p-6 md:p-8">
                <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start">

                  {/* LEFT: Body Silhouette with regional fat */}
                  <BodySilhouette
                    trunkFat={dexaData.trunkFatPct}
                    armsFat={dexaData.armsFatPct}
                    legsFat={dexaData.legsFatPct}
                    bodyFat={dexaData.bodyFatPct}
                    sex={profile?.sex ?? null}
                  />

                  {/* RIGHT: Metrics & Composition */}
                  <div className="flex-1 space-y-6">

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Body Fat', value: dexaData.bodyFatPct, unit: '%',
                          color: dexaData.bodyFatPct != null && dexaData.bodyFatPct < 20 ? '#0C9C6C' : dexaData.bodyFatPct != null && dexaData.bodyFatPct < 28 ? '#C4A96A' : '#E06B5B' },
                        { label: 'Muscle Mass', value: dexaData.muscleMassPct, unit: '%',
                          color: '#0e393d' },
                        { label: 'Visceral Fat', value: dexaData.visceralFat, unit: 'g',
                          color: dexaData.visceralFat != null && dexaData.visceralFat <= 100 ? '#0C9C6C' : '#E06B5B' },
                        { label: 'BMI', value: dexaData.bmi, unit: 'kg/m²',
                          color: dexaData.bmi != null && dexaData.bmi >= 18.5 && dexaData.bmi <= 25 ? '#0C9C6C' : '#C4A96A' },
                      ].filter(m => m.value != null).map((m, i) => (
                        <div key={i} className="bg-[#fafaf8] rounded-xl border border-[#0e393d]/[.06] p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="text-[9px] text-[#1c2a2b]/40 uppercase tracking-[.1em] font-semibold mb-1.5">{m.label}</div>
                          <div className="font-serif text-[1.6rem] leading-none" style={{ color: m.color }}>
                            {m.value!.toLocaleString('de-CH', { maximumFractionDigits: 1 })}
                          </div>
                          {m.unit && <div className="text-[10px] text-[#1c2a2b]/25 mt-0.5">{m.unit}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Bone Health */}
                    {(dexaData.boneDensityTScore != null || dexaData.boneMineralContent != null) && (
                      <div className="grid grid-cols-2 gap-3">
                        {dexaData.boneDensityTScore != null && (
                          <div className="bg-[#fafaf8] rounded-xl border border-[#0e393d]/[.06] p-4">
                            <div className="text-[9px] text-[#1c2a2b]/40 uppercase tracking-[.1em] font-semibold mb-2">Bone Density T-Score</div>
                            <div className="font-serif text-2xl" style={{
                              color: dexaData.boneDensityTScore >= -1 ? '#0C9C6C' : dexaData.boneDensityTScore >= -2.5 ? '#C4A96A' : '#E06B5B'
                            }}>
                              {dexaData.boneDensityTScore > 0 ? '+' : ''}{dexaData.boneDensityTScore.toFixed(1)}
                            </div>
                            <div className="text-[10px] text-[#1c2a2b]/35 mt-1">
                              {dexaData.boneDensityTScore >= -1 ? 'Normal' : dexaData.boneDensityTScore >= -2.5 ? 'Osteopenia' : 'Osteoporosis'}
                            </div>
                          </div>
                        )}
                        {dexaData.boneMineralContent != null && (
                          <div className="bg-[#fafaf8] rounded-xl border border-[#0e393d]/[.06] p-4">
                            <div className="text-[9px] text-[#1c2a2b]/40 uppercase tracking-[.1em] font-semibold mb-2">Bone Mineral Content</div>
                            <div className="font-serif text-2xl text-[#0e393d]">
                              {dexaData.boneMineralContent >= 1000
                                ? (dexaData.boneMineralContent / 1000).toFixed(2)
                                : dexaData.boneMineralContent.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-[#1c2a2b]/35 mt-1">
                              {dexaData.boneMineralContent >= 1000 ? 'kg' : 'g'}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Composition Breakdown Bar */}
                    <div>
                      <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-3">BODY COMPOSITION BREAKDOWN</div>
                      <CompositionBar lean={dexaData.leanMass} fat={dexaData.fatMass} bone={dexaData.boneMineralContent} />
                    </div>

                    {/* Android/Gynoid Ratio */}
                    {dexaData.androidGynoidRatio != null && (
                      <div>
                        <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-3">FAT DISTRIBUTION PATTERN</div>
                        <AGRatioGauge ratio={dexaData.androidGynoidRatio} />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── DEXA Trend Charts ── */}
                <div className="border-t border-[#1c2a2b]/[.06] px-8 py-6 bg-[#fafaf8]/50">
                  <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-4">KEY TRENDS</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {([
                      { label: 'Body Fat %', def: dexaData.defs.bodyFatPct },
                      { label: 'Muscle Mass %', def: dexaData.defs.muscleMassPct },
                      { label: 'Visceral Fat', def: dexaData.defs.visceralFat },
                      { label: 'Lean Mass', def: dexaData.defs.leanMass },
                    ]).filter(t => t.def != null).map((t, i) => (
                      <div key={i} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] p-3">
                        <div className="text-[10px] font-medium text-[#0e393d] mb-2">{t.label}</div>
                        <BiomarkerTrendChart
                          userId={userId} definitionId={t.def!.id} unit={t.def!.unit}
                          refLow={t.def!.refLow} refHigh={t.def!.refHigh}
                          optLow={t.def!.optLow} optHigh={t.def!.optHigh}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══════ FITNESS & VITALITY SECTION ═══════ */}
        {hasFitness && (
          <section className="mb-16">
            <SectionTag>FITNESS & VITALITY</SectionTag>

            <div className="bg-white rounded-2xl border border-[#0e393d]/[.08] shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="bg-[#0e393d] px-8 py-5 flex items-center justify-between">
                <div>
                  <span className="font-serif text-white text-lg block">Fitness & VO₂max Analysis</span>
                  <span className="text-[10px] text-white/35 tracking-[.1em] uppercase">Cardiopulmonary exercise test</span>
                </div>
                <div className="text-[10px] text-[#ceab84] font-semibold tracking-[.12em] uppercase">Performance</div>
              </div>

              <div className="p-6 md:p-8">
                <div className="grid md:grid-cols-[300px_1fr] gap-8 items-start">

                  {/* LEFT: VO2max gauge */}
                  <div className="space-y-6">
                    <VO2maxGauge vo2max={fitnessData.vo2max!} sex={profile?.sex ?? null} />

                    {/* Key vitals grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Resting HR', value: fitnessData.restingHeartRate, unit: 'bpm' },
                        { label: 'Max HR', value: fitnessData.maxHeartRate, unit: 'bpm' },
                        { label: 'HRV', value: fitnessData.hrv, unit: 'ms' },
                        { label: 'Max Power', value: fitnessData.maxPowerOutput, unit: 'W' },
                      ].filter(m => m.value != null).map((m, i) => (
                        <div key={i} className="bg-[#fafaf8] rounded-xl border border-[#0e393d]/[.06] p-3.5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="text-[8px] text-[#1c2a2b]/40 uppercase tracking-[.1em] font-semibold mb-1">{m.label}</div>
                          <div className="font-serif text-xl text-[#0e393d]">{m.value}</div>
                          <div className="text-[9px] text-[#1c2a2b]/25">{m.unit}</div>
                        </div>
                      ))}
                    </div>

                    {/* Additional metrics */}
                    <div className="space-y-2">
                      {[
                        { label: 'VO₂max (absolute)', value: fitnessData.vo2maxAbsolute, unit: 'L/min' },
                        { label: 'VT1 Power', value: fitnessData.vt1, unit: 'W' },
                        { label: 'VT2 Power', value: fitnessData.vt2, unit: 'W' },
                        { label: 'Peak RER', value: fitnessData.rerPeak, unit: '' },
                        { label: 'SpO₂ rest', value: fitnessData.spo2, unit: '%' },
                        { label: 'SpO₂ peak', value: fitnessData.spo2Peak, unit: '%' },
                      ].filter(m => m.value != null).map((m, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1c2a2b]/[.04]">
                          <span className="text-[11px] text-[#1c2a2b]/50">{m.label}</span>
                          <span className="text-[11px] font-bold text-[#0e393d]">
                            {m.value!.toLocaleString('de-CH', { maximumFractionDigits: 2 })} {m.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: Training Zones */}
                  <div className="space-y-6">
                    <div>
                      <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-4">HEART RATE TRAINING ZONES</div>
                      <TrainingZoneChart
                        vo2max={fitnessData.vo2max}
                        vt1={fitnessData.vt1}
                        vt1Hr={fitnessData.vt1HeartRate}
                        vt2={fitnessData.vt2}
                        vt2Hr={fitnessData.vt2HeartRate}
                        maxHr={fitnessData.maxHeartRate}
                        restHr={fitnessData.restingHeartRate}
                      />
                    </div>

                    {/* VT Thresholds Detail */}
                    {(fitnessData.vt1 != null || fitnessData.vt2 != null) && (
                      <div>
                        <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-3">VENTILATORY THRESHOLDS</div>
                        <div className="grid grid-cols-2 gap-4">
                          {fitnessData.vt1 != null && (
                            <div className="bg-[#0C9C6C]/[.04] border border-[#0C9C6C]/10 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-[#0C9C6C]" />
                                <span className="text-xs font-bold text-[#0C9C6C]">VT1 — Aerobic Threshold</span>
                              </div>
                              <div className="font-serif text-2xl text-[#0e393d] mb-1">
                                {fitnessData.vt1} <span className="text-sm font-normal text-[#1c2a2b]/40">W</span>
                              </div>
                              {fitnessData.vt1HeartRate != null && (
                                <div className="text-[11px] text-[#1c2a2b]/50">
                                  Heart rate: <span className="font-bold">{fitnessData.vt1HeartRate} bpm</span>
                                </div>
                              )}
                              <div className="text-[10px] text-[#1c2a2b]/35 mt-2 leading-snug">
                                Below this threshold you can sustain effort comfortably and burn primarily fat.
                              </div>
                            </div>
                          )}
                          {fitnessData.vt2 != null && (
                            <div className="bg-[#d97706]/[.04] border border-[#d97706]/10 rounded-xl p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full bg-[#d97706]" />
                                <span className="text-xs font-bold text-[#d97706]">VT2 — Anaerobic Threshold</span>
                              </div>
                              <div className="font-serif text-2xl text-[#0e393d] mb-1">
                                {fitnessData.vt2} <span className="text-sm font-normal text-[#1c2a2b]/40">W</span>
                              </div>
                              {fitnessData.vt2HeartRate != null && (
                                <div className="text-[11px] text-[#1c2a2b]/50">
                                  Heart rate: <span className="font-bold">{fitnessData.vt2HeartRate} bpm</span>
                                </div>
                              )}
                              <div className="text-[10px] text-[#1c2a2b]/35 mt-2 leading-snug">
                                Above this threshold lactate accumulates rapidly — maximum sustainable intensity.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Performance Summary */}
                    <div className="bg-[#0e393d] rounded-xl p-5">
                      <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-3">PERFORMANCE INSIGHT</div>
                      <p className="text-[12px] text-white/70 leading-relaxed">
                        {fitnessData.vo2max! >= 50
                          ? 'Your VO₂max places you in the elite fitness category. This level of cardiorespiratory fitness is associated with significantly reduced all-cause mortality risk.'
                          : fitnessData.vo2max! >= 40
                          ? 'Your VO₂max indicates strong cardiorespiratory fitness. Continuing to train at your VT1/VT2 thresholds will further improve your aerobic capacity and longevity outlook.'
                          : fitnessData.vo2max! >= 30
                          ? 'Your VO₂max shows moderate fitness. Consistent Zone 2 training (below VT1) is the most effective way to improve your aerobic base and health outcomes.'
                          : 'Building your aerobic base through regular Zone 2 training will be the single most impactful intervention for your cardiovascular health and longevity.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Fitness Trend Charts ── */}
                <div className="border-t border-[#1c2a2b]/[.06] px-8 py-6 bg-[#fafaf8]/50">
                  <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-4">KEY TRENDS</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {([
                      { label: 'VO₂max', def: fitnessData.defs.vo2max },
                      { label: 'HRV', def: fitnessData.defs.hrv },
                      { label: 'Resting HR', def: fitnessData.defs.restingHeartRate },
                    ]).filter(t => t.def != null).map((t, i) => (
                      <div key={i} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] p-3">
                        <div className="text-[10px] font-medium text-[#0e393d] mb-2">{t.label}</div>
                        <BiomarkerTrendChart
                          userId={userId} definitionId={t.def!.id} unit={t.def!.unit}
                          refLow={t.def!.refLow} refHigh={t.def!.refHigh}
                          optLow={t.def!.optLow} optHigh={t.def!.optHigh}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

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
                  {/* Sub-group labels for domains with mixed tests */}
                  {(() => {
                    const subGroups = DOMAIN_SUBGROUPS[d.key];
                    if (!subGroups) return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {d.markers.map((m) => renderMarkerCard(m, d.key))}
                      </div>
                    );
                    return subGroups.map((sg, sgi) => {
                      const sgMarkers = d.markers.filter(m => sg.slugs.includes(m.slug));
                      if (sgMarkers.length === 0) return null;
                      return (
                        <div key={sgi} className={sgi > 0 ? 'mt-6' : ''}>
                          <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84] mb-3">{sg.label}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sgMarkers.map((m) => renderMarkerCard(m, d.key))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );

            function renderMarkerCard(m: ProcessedMarker, domainKey: string) {
              const mKey = `${domainKey}-${m.defId}`;
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
                      <span className="text-[12px] font-semibold text-[#0e393d] flex items-center gap-1">
                        {m.name}
                        {m.isCalculated && (
                          <span title="Calculated value" className="inline-flex items-center justify-center px-1 py-[1px] rounded text-[8px] font-semibold leading-none bg-[#0e393d]/[.07] text-[#0e393d]/50" style={{ fontStyle: 'italic', letterSpacing: '0.01em' }}>ƒx</span>
                        )}
                      </span>
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
            }
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

          {showTable && (() => {
            // ── Helper: compute unique sorted dates for a set of markers (last 5) ──
            const getMarkerDates = (markers: ProcessedMarker[], maxDates = 5): string[] => {
              const dates = new Set<string>();
              for (const m of markers) {
                const hist = dash.mData.get(m.defId);
                if (hist) for (const d of hist.keys()) dates.add(d);
              }
              return [...dates].sort().slice(-maxDates);
            };

            // ── Helper: look up a marker value for a specific date ──
            const getVal = (m: ProcessedMarker, date: string): number | null => {
              return dash.mData.get(m.defId)?.get(date)?.value ?? null;
            };

            // ── Reusable table header row ──
            const renderTableHead = (dates: string[], showSubgroupLabel?: string) => (
              <thead>
                {showSubgroupLabel && (
                  <tr>
                    <td colSpan={3 + dates.length + 1} className="px-4 py-2 bg-[#0e393d]/[.03] border-b border-[#0e393d]/[.06]">
                      <span className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#ceab84]">{showSubgroupLabel}</span>
                    </td>
                  </tr>
                )}
                <tr className="border-b border-[#0e393d]/[.06] bg-[#fafaf8]">
                  <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2">Marker</th>
                  <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2">{t.refRange}</th>
                  <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#0C9C6C]/50 px-4 py-2">{t.longevityOpt}</th>
                  {dates.map((d, i) => (
                    <th key={i} className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2 text-right">{fmtDate(d, lang)}</th>
                  ))}
                  <th className="text-[9px] font-semibold tracking-[.1em] uppercase text-[#1c2a2b]/35 px-4 py-2 text-right">Score</th>
                </tr>
              </thead>
            );

            // ── Format range display: "X–Y", "< Y", "> X", or "—" ──
            const fmtRange = (lo: number | null, hi: number | null): string => {
              if (lo != null && hi != null) return `${lo}–${hi}`;
              if (hi != null) return `< ${hi}`;
              if (lo != null) return `> ${lo}`;
              return '—';
            };

            // ── Reusable marker rows ──
            const renderMarkerRows = (markers: ProcessedMarker[], dates: string[]) =>
              markers.map((m) => (
                <tr key={m.defId} className="border-b border-[#0e393d]/[.03] hover:bg-[#0e393d]/[.01] transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(m.latestStatus) }} />
                      <div>
                        <div className="text-[11px] font-medium text-[#0e393d] flex items-center gap-1">
                          {m.name}
                          {m.isCalculated && (
                            <span title="Calculated value" className="inline-flex items-center justify-center px-1 py-[1px] rounded text-[8px] font-semibold leading-none bg-[#0e393d]/[.07] text-[#0e393d]/50" style={{ fontStyle: 'italic', letterSpacing: '0.01em' }}>ƒx</span>
                          )}
                        </div>
                        <div className="text-[9px] text-[#1c2a2b]/30">{m.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-[#1c2a2b]/50">
                    {fmtRange(m.refLow, m.refHigh)}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-[#0C9C6C]/60 font-medium">
                    {fmtRange(m.optLow, m.optHigh)}
                  </td>
                  {dates.map((date, vi) => {
                    const val = getVal(m, date);
                    const isLast = vi === dates.length - 1;
                    return (
                      <td key={vi} className="px-4 py-2.5 text-right">
                        <span className="text-[11px] font-medium tabular-nums"
                          style={{ color: isLast && val != null ? statusColor(m.latestStatus) : 'rgba(28,42,43,.4)' }}>
                          {val != null ? val.toLocaleString('de-CH', { maximumFractionDigits: 2 }) : '—'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16">
                        {m.latest != null && (m.refLow != null || m.refHigh != null) && (
                          <MiniRangeBar value={m.latest} refLow={m.refLow} refHigh={m.refHigh}
                            optLow={m.optLow} optHigh={m.optHigh} status={m.latestStatus} />
                        )}
                      </div>
                      <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: scoreColor(m.latestScore) }}>
                        {m.latestScore}
                      </span>
                    </div>
                  </td>
                </tr>
              ));

            // ── Slugs extracted into the "Health Check" section ──
            const CHECKUP_SLUGS: Record<string, string[]> = {
              'Blood Pressure': ['mean_arterial_pressure', 'pulse_pressure', 'systolic_bp', 'diastolic_bp'],
              'Body Measurements': ['bmi', 'body_weight', 'wht_ratio', 'waist_circumference'],
              'Vitality Check': ['grip_strength', 'ages_skin_scan', 'spo2', 'resting_heart_rate', 'hrv'],
            };
            const allCheckupSlugs = new Set(Object.values(CHECKUP_SLUGS).flat());

            // ── Collect health-check markers from across domains ──
            const checkupGroups: { label: string; markers: ProcessedMarker[] }[] = [];
            for (const [label, slugs] of Object.entries(CHECKUP_SLUGS)) {
              const found: ProcessedMarker[] = [];
              for (const d of dash.domains) {
                for (const m of d.markers) {
                  if (slugs.includes(m.slug)) found.push(m);
                }
              }
              if (found.length > 0) checkupGroups.push({ label, markers: found });
            }

            // ── Blood domains (exclude checkup slugs from markers & date calculation) ──
            const bloodDomains = ['heart_vessels', 'metabolism', 'inflammation', 'organ_function', 'nutrients', 'hormones'];
            const bloodMarkersForDates = dash.domains
              .filter(d => bloodDomains.includes(d.key))
              .flatMap(d => d.markers)
              .filter(m => !allCheckupSlugs.has(m.slug));
            const bloodDates = getMarkerDates(bloodMarkersForDates, 5);

            // ── Domain header helper ──
            const renderDomainHeader = (d: ProcessedDomain) => (
              <div className="bg-[#0e393d] px-6 py-3.5 flex items-center gap-3">
                <span className="text-lg">{d.icon}</span>
                <span className="font-semibold text-white text-sm">{getName(d.name, lang)}</span>
                <span className="text-xs text-white/40">Score: <span className="font-bold" style={{ color: scoreColor(d.scores[d.scores.length - 1]) }}>{d.scores[d.scores.length - 1]}</span>/100</span>
              </div>
            );

            return (
              <div className="space-y-8">
                {/* ── Blood-test domains ── */}
                {dash.domains.filter(d => bloodDomains.includes(d.key)).map((d) => {
                  const domMarkers = d.markers.filter(m => !allCheckupSlugs.has(m.slug));
                  if (domMarkers.length === 0) return null;
                  return (
                    <div key={d.key} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                      {renderDomainHeader(d)}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          {renderTableHead(bloodDates)}
                          <tbody>{renderMarkerRows(domMarkers, bloodDates)}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* ── Health Check (blood pressure + body measurements + vitality) ── */}
                {checkupGroups.length > 0 && (
                  <div className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                    <div className="bg-[#0e393d] px-6 py-3.5 flex items-center gap-3">
                      <span className="text-lg">🩺</span>
                      <span className="font-semibold text-white text-sm">Health Check</span>
                    </div>
                    {checkupGroups.map((cg, cgi) => {
                      const cgDates = getMarkerDates(cg.markers, 5);
                      return (
                        <div key={cgi} className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            {renderTableHead(cgDates, cg.label)}
                            <tbody>{renderMarkerRows(cg.markers, cgDates)}</tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Body Composition (DEXA only, General markers moved to Health Check) ── */}
                {dash.domains.filter(d => d.key === 'body_composition').map((d) => {
                  const dexaSlugs = DOMAIN_SUBGROUPS.body_composition?.[0]?.slugs || [];
                  const dexaMarkers = d.markers.filter(m => dexaSlugs.includes(m.slug));
                  if (dexaMarkers.length === 0) return null;
                  const dexaDates = getMarkerDates(dexaMarkers, 5);
                  return (
                    <div key={d.key} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                      {renderDomainHeader(d)}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          {renderTableHead(dexaDates, 'DEXA Scan')}
                          <tbody>{renderMarkerRows(dexaMarkers, dexaDates)}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* ── Fitness (VO₂max only, Vitality Check moved to Health Check) ── */}
                {dash.domains.filter(d => d.key === 'fitness').map((d) => {
                  const vo2Slugs = DOMAIN_SUBGROUPS.fitness?.[0]?.slugs || [];
                  const vo2Markers = d.markers.filter(m => vo2Slugs.includes(m.slug));
                  if (vo2Markers.length === 0) return null;
                  const vo2Dates = getMarkerDates(vo2Markers, 5);
                  return (
                    <div key={d.key} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                      {renderDomainHeader(d)}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          {renderTableHead(vo2Dates, 'VO₂max Test')}
                          <tbody>{renderMarkerRows(vo2Markers, vo2Dates)}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* ── Epigenetics: own dates ── */}
                {dash.domains.filter(d => d.key === 'epigenetics').map((d) => {
                  const domDates = getMarkerDates(d.markers, 5);
                  return (
                    <div key={d.key} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                      {renderDomainHeader(d)}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          {renderTableHead(domDates)}
                          <tbody>{renderMarkerRows(d.markers, domDates)}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

      </div>
    </div>
  );
}
