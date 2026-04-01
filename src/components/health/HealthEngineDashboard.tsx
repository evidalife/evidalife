'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import BiomarkerTrendChart from './BiomarkerTrendChart';
import BriefingPlayer from './BriefingPlayer';
import { CATEGORY_DISPLAY } from '@/lib/health-score';
import { createClient } from '@/lib/supabase/client';
import ResearchChat from '@/components/research/ResearchChat';
import { buildBiomarkerContext, buildResearchSuggestions } from '@/lib/research/biomarker-mapper';

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
  isSample?: boolean;
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
    secScore: 'OVERALL SCORE', secDom: 'HEALTH DOMAINS', secBm: 'LAB RESULTS', secKm: 'KEY MARKERS',
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
    bioAgeClocks: 'BIOLOGICAL AGE SCORE', topStrength: 'Top Strength', priorityAction: 'Priority Action', monthProgress: 'Progress', bioAgeDesc: 'Based on epigenetic markers',
    healthBriefing: 'Your Health Briefing', briefingSub: 'Personalized audio summary of your latest results', askAnything: 'Ask anything about your results...', listenNow: 'Listen now', comingSoon: 'Coming soon',
  },
  de: {
    tag: 'HEALTH ENGINE', title: 'Dein Gesundheits-Score', sub: 'Verfolge deine Biomarker in 9 Gesundheitsbereichen.',
    secScore: 'GESAMT-SCORE', secDom: 'GESUNDHEITSBEREICHE', secBm: 'LABORERGEBNISSE', secKm: 'SCHLÜSSEL-MARKER',
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
    bioAgeClocks: 'BIOLOGISCHES ALTER SCORE', topStrength: 'Top-Stärke', priorityAction: 'Priorität', monthProgress: 'Fortschritt', bioAgeDesc: 'Basierend auf epigenetischen Markern',
    healthBriefing: 'Dein Gesundheitsbriefing', briefingSub: 'Personalisierte Audio-Zusammenfassung deiner neuesten Ergebnisse', askAnything: 'Frage alles zu deinen Ergebnissen...', listenNow: 'Jetzt anhören', comingSoon: 'Bald verfügbar',
  },
  fr: {
    tag: 'HEALTH ENGINE', title: 'Votre Score Santé', sub: 'Suivez vos biomarqueurs dans 9 domaines de santé.',
    secScore: 'SCORE GLOBAL', secDom: 'DOMAINES DE SANTÉ', secBm: 'RÉSULTATS DE LABORATOIRE', secKm: 'MARQUEURS CLÉS',
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
    bioAgeClocks: 'SCORE ÂGE BIOLOGIQUE', topStrength: 'Force Top', priorityAction: 'Action Prioritaire', monthProgress: 'Progrès', bioAgeDesc: 'Basé sur les marqueurs épigénétiques',
    healthBriefing: 'Votre Briefing Santé', briefingSub: 'Résumé audio personnalisé de vos derniers résultats', askAnything: 'Posez une question sur vos résultats...', listenNow: 'Écouter', comingSoon: 'Bientôt disponible',
  },
  es: {
    tag: 'HEALTH ENGINE', title: 'Tu Score de Salud', sub: 'Sigue tus biomarcadores en 9 dominios de salud.',
    secScore: 'SCORE GLOBAL', secDom: 'DOMINIOS DE SALUD', secBm: 'RESULTADOS DE LABORATORIO', secKm: 'MARCADORES CLAVE',
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
    bioAgeClocks: 'SCORE EDAD BIOLÓGICA', topStrength: 'Fortaleza Superior', priorityAction: 'Acción Prioritaria', monthProgress: 'Progreso', bioAgeDesc: 'Basado en marcadores epigenéticos',
    healthBriefing: 'Tu Informe de Salud', briefingSub: 'Resumen de audio personalizado de tus últimos resultados', askAnything: 'Pregunta sobre tus resultados...', listenNow: 'Escuchar', comingSoon: 'Próximamente',
  },
  it: {
    tag: 'HEALTH ENGINE', title: 'Il Tuo Score Salute', sub: 'Segui i tuoi biomarcatori in 9 domini della salute.',
    secScore: 'SCORE GLOBALE', secDom: 'DOMINI DELLA SALUTE', secBm: 'RISULTATI DI LABORATORIO', secKm: 'MARCATORI CHIAVE',
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
    bioAgeClocks: 'SCORE ETÀ BIOLOGICA', topStrength: 'Punto di Forza Principale', priorityAction: 'Azione Prioritaria', monthProgress: 'Progresso', bioAgeDesc: 'Basato su marcatori epigenetici',
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

// ── InfoTooltip ─────────────────────────────────────────────────────────────
function InfoTooltip({ lines }: { lines: { label: string; value: string }[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className="relative inline-block align-middle">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="w-[18px] h-[18px] rounded-full border border-white/20 text-white/35 flex items-center justify-center text-[10px] font-bold leading-none hover:border-white/40 hover:text-white/60 transition-colors cursor-help"
        aria-label="Info"
      >
        i
      </button>
      {open && (
        <div className="absolute z-50 right-0 top-7 w-56 bg-[#0b2e31] border border-white/15 rounded-xl shadow-xl p-3 text-left">
          <div className="absolute -top-1.5 right-2 w-3 h-3 rotate-45 bg-[#0b2e31] border-l border-t border-white/15" />
          {lines.map((l, i) => (
            <div key={i} className="flex justify-between text-[10px] leading-relaxed">
              <span className="text-white/50">{l.label}</span>
              <span className="text-white/80 font-medium">{l.value}</span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
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
export default function HealthEngineDashboard({ lang, userId, profile, reports, results, definitions, isSample }: Props) {
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

    // Bio-clock ratio scoring: score pheno_age / grim_age_v2 as (value / chronoAge)
    // with ref_high=1.0 and opt_high=0.8 — same logic as DunedinPACE.
    // Ratio < 0.8 → optimal, 0.8–1.0 → good, > 1.0 → risk.
    const birthDate = profile?.date_of_birth ? new Date(profile.date_of_birth) : null;
    const BIO_CLOCK_RATIO_SLUGS = new Set(['pheno_age', 'grim_age_v2']);
    const bioClockRatioScore = (value: number, testDateStr: string): number => {
      if (!birthDate) return 70;
      const testDate = new Date(testDateStr + 'T00:00:00');
      const chronoAge = (testDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (chronoAge <= 0) return 70;
      const ratio = value / chronoAge;
      return continuousScore(ratio, null, 1.0, null, 0.8);
    };

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

        // Continuous score — bio-clock markers scored as ratio to chronological age
        const isBioClockRatio = BIO_CLOCK_RATIO_SLUGS.has(def.slug);
        const latestDate = displayDates[displayDates.length - 1] ?? '';
        const latestScore = latest != null
          ? (isBioClockRatio
              ? bioClockRatioScore(latest, latestDate)
              : continuousScore(latest, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high))
          : 50;

        const previousScore = previous != null
          ? (isBioClockRatio
              ? bioClockRatioScore(previous, latestDate)
              : continuousScore(previous, def.ref_range_low, def.ref_range_high, def.optimal_range_low, def.optimal_range_high))
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
            if (BIO_CLOCK_RATIO_SLUGS.has(def.slug)) {
              return bioClockRatioScore(entry.value, date);
            }
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

    // Slugs removed from packages (not offered as part of Core/Pro/Complete)
    const EXCLUDED_SLUGS = new Set([
      'grip_strength', 'ages_skin_scan',
      'bone_density_t_score', 'bone_mineral_content',
      'trunk_fat_pct', 'arms_fat_pct', 'legs_fat_pct', 'android_gynoid_ratio',
      'lpa',
    ]);

    // Flag counts (exclude removed markers from counts)
    const flags = { optimal: 0, good: 0, moderate: 0, risk: 0 };
    const allMarkers: (ProcessedMarker & { domainName: string; domainKey: string })[] = [];
    for (const d of domains) {
      for (const m of d.markers) {
        allMarkers.push({ ...m, domainName: getName(d.name, lang), domainKey: d.key });
        if (!EXCLUDED_SLUGS.has(m.slug)) {
          flags[m.latestStatus]++;
        }
      }
    }
    const flagTotal = flags.optimal + flags.good + flags.moderate + flags.risk;

    // Borderline / improved (exclude removed markers)
    const borderline = allMarkers.filter(m => !EXCLUDED_SLUGS.has(m.slug) && (m.latestStatus === 'moderate' || m.latestStatus === 'risk'));
    const improved = allMarkers.filter(m => {
      if (EXCLUDED_SLUGS.has(m.slug)) return false;
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

    // First meaningful score (for progress display) + time label
    const firstMeaningfulScore = scoreData.length >= 2 ? scoreData[0].score : null;
    // Compute time span between first and last meaningful score dates
    const meaningfulDates = displayDates.filter((_, i) => {
      const domsWithData = domains.filter(dom => dom.scores[i] > 0).length;
      return domsWithData >= 3;
    });
    let progressLabel = '';
    if (meaningfulDates.length >= 2) {
      const d1 = new Date(meaningfulDates[0] + 'T00:00:00');
      const d2 = new Date(meaningfulDates[meaningfulDates.length - 1] + 'T00:00:00');
      const diffMs = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 45) progressLabel = `${diffDays}-Day`;
      else {
        const months = Math.round(diffDays / 30.44);
        progressLabel = months === 1 ? '1-Month' : `${months}-Month`;
      }
    }

    // Radar data — use domain 60-100 scale for visual spread, show last 3 tests
    // Find latest 3 date indices that have meaningful data (at least 3 domains with scores)
    const radarDateIndices: number[] = [];
    for (let i = displayDates.length - 1; i >= 0 && radarDateIndices.length < 3; i--) {
      const domsWithData = domains.filter(dom => dom.scores[i] > 0).length;
      if (domsWithData >= 3) radarDateIndices.unshift(i);
    }
    const radarData = domains.map(d => {
      const cur = radarDateIndices.length >= 1 ? (d.scores[radarDateIndices[radarDateIndices.length - 1]] || 0) : 0;
      const prev = radarDateIndices.length >= 2 ? (d.scores[radarDateIndices[radarDateIndices.length - 2]] || 0) : 0;
      const prev2 = radarDateIndices.length >= 3 ? (d.scores[radarDateIndices[radarDateIndices.length - 3]] || 0) : 0;
      return {
        subject: getName(d.name, lang).replace(/\s*[(&].*/, '').split(' ')[0],
        current: cur,
        previous: prev,
        oldest: prev2,
      };
    });
    const hasRadarPrev = radarDateIndices.length >= 2;
    const hasRadarOldest = radarDateIndices.length >= 3;
    const radarLabels = radarDateIndices.map(i => displayLabels[i]);

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

    // Top ranked markers by sort_order — only package biomarkers, excluding epigenetics
    const topRankedMarkers = [...allMarkers]
      .filter(m => !EXCLUDED_SLUGS.has(m.slug) && m.domainKey !== 'epigenetics')
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
      radarData, hasRadarPrev, hasRadarOldest, radarLabels, markerCount, firstMeaningfulScore, progressLabel,
      longevityScores, longevityLatest, longevityScoreData, longevityBest, longevityWorst,
      topRankedMarkers, nonEpiDomainCount: nonEpiDomains.length,
      bioClocks, mData, defMap, EXCLUDED_SLUGS,
    };
  }, [reports, results, definitions, lang, profile]);

  // DEXA & Fitness data extraction removed — values shown only in ALL BIOMARKERS table

  // Sub-group definitions removed — all markers shown in their original domain

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
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Scroll highlighted section into view during briefing
  React.useEffect(() => {
    if (!highlightedSection) return;
    const sectionMap: Record<string, string> = {
      longevity: 'section-score', score: 'section-score',
      domains: 'section-domains', markers: 'section-markers',
    };
    const id = sectionMap[highlightedSection];
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [highlightedSection]);

  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [expandedMarker, setExpandedMarker] = useState<string | null>(null);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(() => {
    const newest = [...reports].sort((a, b) => b.test_date.localeCompare(a.test_date))[0]?.test_date;
    return newest ? new Set([newest]) : new Set();
  });

  const lastDate = dash.displayDates[dash.displayDates.length - 1];

  // ── Height onboarding gate ────────────────────────────────────
  const [heightInput, setHeightInput] = useState('');
  const [heightSaving, setHeightSaving] = useState(false);
  const [heightSaved, setHeightSaved] = useState(false);
  const needsHeight = profile?.height_cm == null && !heightSaved;

  const saveHeight = useCallback(async () => {
    const cm = parseFloat(heightInput);
    if (isNaN(cm) || cm < 50 || cm > 250) return;
    setHeightSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('profiles').update({ height_cm: cm }).eq('id', userId);
      setHeightSaved(true);
    } finally {
      setHeightSaving(false);
    }
  }, [heightInput, userId]);

  if (needsHeight && dash.allMarkers.length > 0) {
    return (
      <div className="min-h-[60vh] bg-[#fafaf8] flex items-center justify-center py-20 px-6">
        <div className="bg-white rounded-2xl shadow-lg border border-[#0e393d]/[.06] max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0e393d]/[.05] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 2v20M9 5h6M9 9h6M10 13h4M10 17h4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#0e393d] mb-2">
            {lang === 'de' ? 'Körpergrösse eingeben' : lang === 'fr' ? 'Entrez votre taille' : lang === 'es' ? 'Ingrese su estatura' : lang === 'it' ? 'Inserisci la tua altezza' : 'Enter Your Height'}
          </h2>
          <p className="text-sm text-[#1c2a2b]/50 mb-6">
            {lang === 'de' ? 'Wir benötigen Ihre Körpergrösse, um BMI, Taille-zu-Grösse-Verhältnis und weitere Gesundheitswerte korrekt zu berechnen.' :
             lang === 'fr' ? 'Nous avons besoin de votre taille pour calculer correctement l\'IMC, le rapport taille/taille et d\'autres valeurs de santé.' :
             lang === 'es' ? 'Necesitamos su estatura para calcular correctamente el IMC, la relación cintura-estatura y otros valores de salud.' :
             lang === 'it' ? 'Abbiamo bisogno della tua altezza per calcolare correttamente BMI, rapporto vita-altezza e altri valori di salute.' :
             'We need your height to correctly calculate BMI, waist-to-height ratio, and other health metrics.'}
          </p>
          <div className="flex items-center gap-3 justify-center mb-5">
            <input
              type="number"
              min={50} max={250} step={0.1}
              placeholder="175"
              value={heightInput}
              onChange={e => setHeightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveHeight()}
              className="w-28 px-4 py-2.5 rounded-lg border border-[#0e393d]/15 text-center text-lg font-semibold text-[#0e393d] focus:outline-none focus:ring-2 focus:ring-[#0C9C6C]/30 focus:border-[#0C9C6C]"
            />
            <span className="text-sm text-[#1c2a2b]/40 font-medium">cm</span>
          </div>
          <button
            onClick={saveHeight}
            disabled={heightSaving || !heightInput || parseFloat(heightInput) < 50 || parseFloat(heightInput) > 250}
            className="w-full py-3 rounded-xl bg-[#0e393d] text-white font-semibold text-sm hover:bg-[#0e393d]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {heightSaving ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {lang === 'de' ? 'Speichern…' : lang === 'fr' ? 'Enregistrement…' : 'Saving…'}
              </span>
            ) : (
              lang === 'de' ? 'Weiter zum Dashboard' : lang === 'fr' ? 'Continuer vers le tableau de bord' : lang === 'es' ? 'Continuar al panel' : lang === 'it' ? 'Continua alla dashboard' : 'Continue to Dashboard'
            )}
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="font-serif text-[clamp(2.2rem,4vw,3rem)] text-white leading-[1.1] mb-4">
            {isSample && profile?.first_name
              ? `${profile.first_name}'s Health Score`
              : t.title}
          </h1>
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
          <BriefingPlayer
            lang={lang}
            firstName={profile?.first_name ?? ''}
            onHighlight={setHighlightedSection}
          />
        </section>

        {/* ── TWO GAUGES: LONGEVITY SCORE + BIOLOGICAL AGE CLOCKS ── */}
        <section id="section-score" className={`mb-16 rounded-2xl transition-all duration-500 ${highlightedSection === 'longevity' || highlightedSection === 'score' ? 'ring-2 ring-[#0C9C6C]/40 ring-offset-4 ring-offset-[#fafaf8]' : ''}`}>
          <SectionTag>{t.secScore}</SectionTag>
          <div className="grid md:grid-cols-2 gap-3.5 mb-6">

            {/* ─── LEFT: LONGEVITY SCORE gauge card ─── */}
            <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col relative">
              <div className="absolute top-4 right-4 z-10">
                <InfoTooltip lines={dash.domains.filter(d => d.key !== 'epigenetics').map(d => ({
                  label: getName(d.name, lang).split(/\s*\(/)[0],
                  value: d.weightLabel,
                }))} />
              </div>
              <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
                <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#ceab84] mb-2 self-start">
                  {t.longevityScore}
                </div>
                <div className="mt-2 mb-1"><Gauge score={dash.longevityLatest} max={100} dark /></div>
                <div className="text-[11px] text-white/30 text-center">
                  {t.basedOnDomains.replace('{n}', String(dash.nonEpiDomainCount || 8))}
                </div>
                <div className="text-[10px] text-white/[.18] text-center leading-snug mt-0.5">
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
                  <div className="h-[150px]">
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
              // Use last test date instead of Date.now() to avoid SSR/client hydration mismatch
              const refDate = new Date(lastDate + 'T00:00:00');
              const chronoAge = +(((refDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1));

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

              // Combined average bio age chart data (single line)
              const CLOCKS_META: { slug: string; isDunedin?: boolean }[] = [
                { slug: 'phenoage' },
                { slug: 'grimage_v2' },
                { slug: 'dunedinpace', isDunedin: true },
              ];
              const chartData = dash.displayDates.map((dateStr: string, di: number) => {
                // Chronological age at each test date (increases over time)
                const testDate = new Date(dateStr + 'T00:00:00');
                const chronAtDate = +((testDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
                const ages: number[] = [];
                for (const c of CLOCKS_META) {
                  const clock = dash.bioClocks[c.slug];
                  if (!clock || clock.values[di] == null) continue;
                  if (c.isDunedin) {
                    ages.push(+((clock.values[di] as number) * chronAtDate).toFixed(1));
                  } else {
                    ages.push(clock.values[di] as number);
                  }
                }
                const avg = ages.length > 0 ? +(ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : null;
                return { date: dash.displayLabels[di], avg, chron: chronAtDate };
              });
              const allAvgs = chartData.map(d => d.avg).filter((v): v is number => v != null);
              const allChrons = chartData.map(d => d.chron);
              const bioYMin = allAvgs.length > 0 ? Math.floor(Math.min(...allAvgs, ...allChrons) / 5) * 5 - 2 : chronoAge - 10;
              const bioYMax = allAvgs.length > 0 ? Math.ceil(Math.max(...allAvgs, ...allChrons) / 5) * 5 + 2 : chronoAge + 10;

              // Clock weights for info tooltip
              const clockWeights = [
                { label: 'PhenoAge', value: phenoLatest != null ? '33%' : '—' },
                { label: 'GrimAge v2', value: grimLatest != null ? '33%' : '—' },
                { label: 'DunedinPACE', value: paceProjected != null ? '33%' : '—' },
              ].filter(c => c.value !== '—');
              // Redistribute weights equally among available clocks
              const pctEach = clockWeights.length > 0 ? `${Math.round(100 / clockWeights.length)}%` : '—';
              clockWeights.forEach(c => c.value = pctEach);

              return (
                <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col relative">
                  <div className="absolute top-4 right-4 z-10">
                    <InfoTooltip lines={clockWeights} />
                  </div>
                  <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
                    <div className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#ceab84] mb-2 self-start">
                      {t.bioAgeClocks}
                    </div>
                    <div className="mt-2 mb-1"><Gauge score={bioGaugeScore} max={100} dark /></div>
                    {avgBioAge != null && (
                      <>
                        <div className="text-[11px] text-white/30 text-center">
                          {avgDiff != null && (avgDiff < 0
                            ? `↓ ${Math.abs(avgDiff).toFixed(1)} years younger than chronological age`
                            : `↑ ${avgDiff.toFixed(1)} years older than chronological age`
                          )}
                        </div>
                        <div className="text-[10px] text-white/[.18] text-center leading-snug mt-0.5">
                          avg. across {bioAgeValues.length} clocks
                        </div>
                      </>
                    )}
                  </div>

                  {/* Summary: Best / Focus clock panels */}
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

                  {/* Combined avg bio age trend chart */}
                  {allAvgs.length > 0 && (
                    <div className="border-t border-white/[.06] px-4 py-3 bg-black/[.12]">
                      <div className="text-[10px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5">Avg Bio Age vs Chronological</div>
                      <div className="h-[150px]">
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
                            <Line name="Avg Bio Age" type="monotone" dataKey="avg" stroke="#0C9C6C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-2">
                  {dash.progressLabel ? `${dash.progressLabel} ${t.monthProgress}` : t.monthProgress}
                </div>
                <div className="text-[13px] font-semibold text-[#0e393d] mb-2">Longevity</div>
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
            {/* Bio Age progress card */}
            {(() => {
              const hasBio = Object.keys(dash.bioClocks).length > 0 && profile?.date_of_birth;
              if (!hasBio) return null;
              const birthDate = new Date(profile!.date_of_birth!);
              // Find earliest and latest bio age averages from display dates
              const bioAvgs: { di: number; avg: number }[] = [];
              dash.displayDates.forEach((dateStr: string, di: number) => {
                const testDate = new Date(dateStr + 'T00:00:00');
                const chron = (testDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
                const ages: number[] = [];
                for (const slug of ['phenoage', 'grimage_v2', 'dunedinpace']) {
                  const clock = dash.bioClocks[slug];
                  if (!clock || clock.values[di] == null) continue;
                  if (slug === 'dunedinpace') ages.push((clock.values[di] as number) * chron);
                  else ages.push(clock.values[di] as number);
                }
                if (ages.length > 0) bioAvgs.push({ di, avg: ages.reduce((a, b) => a + b, 0) / ages.length });
              });
              if (bioAvgs.length < 2) return null;
              const first = bioAvgs[0];
              const last = bioAvgs[bioAvgs.length - 1];
              const firstChron = (new Date(dash.displayDates[first.di] + 'T00:00:00').getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
              const lastChron = (new Date(dash.displayDates[last.di] + 'T00:00:00').getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
              const firstDiff = +(first.avg - firstChron).toFixed(1);
              const lastDiff = +(last.avg - lastChron).toFixed(1);
              const delta = +(lastDiff - firstDiff).toFixed(1);
              return (
                <div className="bg-white rounded-2xl border border-[#1c2a2b]/[.06] p-5 shadow-sm">
                  <div className="text-[9px] font-semibold tracking-[.12em] uppercase text-[#1c2a2b]/35 mb-2">
                    {dash.progressLabel ? `${dash.progressLabel} ${t.monthProgress}` : t.monthProgress}
                  </div>
                  <div className="text-[13px] font-semibold text-[#0e393d] mb-2">Bio Age</div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="font-serif text-xl" style={{ color: firstDiff < 0 ? '#0C9C6C' : '#C4A96A' }}>{firstDiff > 0 ? '+' : ''}{firstDiff}</span>
                    <span className="text-[#1c2a2b]/25 mx-1">→</span>
                    <span className="font-serif text-xl" style={{ color: lastDiff < 0 ? '#0C9C6C' : '#C4A96A' }}>{lastDiff > 0 ? '+' : ''}{lastDiff}</span>
                  </div>
                  <div className="text-[11px] text-[#1c2a2b]/50">
                    {delta <= 0 ? '' : '+'}{delta} yrs vs chrono
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* ── BIOLOGICAL AGE CLOCKS — Detailed Section ── */}
        {(() => {
          const hasBioClocks = Object.keys(dash.bioClocks).length > 0 && profile?.date_of_birth;
          if (!hasBioClocks) return null;

          const birthDate = new Date(profile!.date_of_birth!);
          const refDate = new Date(lastDate + 'T00:00:00');
          const chronoAge = +(((refDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1));

          const CLOCKS_DETAIL: { slug: string; label: string; color: string; isDunedin: boolean; desc: Record<string, string> }[] = [
            {
              slug: 'phenoage', label: 'PhenoAge', color: '#0C9C6C', isDunedin: false,
              desc: {
                en: 'Calculated from 9 standard blood markers. Each year above chronological age ≈ +6% mortality risk.',
                de: 'Berechnet aus 9 Standard-Blutmarkern. Jedes Jahr über dem chronologischen Alter ≈ +6% Sterblichkeitsrisiko.',
              },
            },
            {
              slug: 'grimage_v2', label: 'GrimAge v2', color: '#8b5cf6', isDunedin: false,
              desc: {
                en: 'Gold-standard DNA methylation clock. Most accurate predictor of healthspan and lifespan.',
                de: 'Gold-Standard DNA-Methylierungsuhr. Genauester Prädiktor für Gesundheits- und Lebensspanne.',
              },
            },
            {
              slug: 'dunedinpace', label: 'DunedinPACE', color: '#ceab84', isDunedin: true,
              desc: {
                en: 'Speed of aging — population average is 1.0 yr/yr. Below 1.0 means you age slower than average.',
                de: 'Alterungsgeschwindigkeit — Bevölkerungsdurchschnitt ist 1.0 J/J. Unter 1.0 bedeutet langsameres Altern.',
              },
            },
          ];

          const paceRate = dash.bioClocks['dunedinpace']?.latest;
          const paceProjected = paceRate != null ? +(paceRate * chronoAge).toFixed(1) : null;

          // Build individual chart data for each clock — always show all 3, grey out if no data
          const clockCards = CLOCKS_DETAIL.map(c => {
            const clock = dash.bioClocks[c.slug];
            const hasAnyData = clock != null && clock.values.some(v => v != null);
            const hasCurrent = clock?.latest != null;

            const latestVal = c.isDunedin ? paceRate : clock?.latest ?? null;
            const projectedAge = c.isDunedin ? paceProjected : clock?.latest ?? null;
            const diff = projectedAge != null ? +(projectedAge - chronoAge).toFixed(1) : null;
            const gaugeScore = diff != null ? Math.max(0, Math.min(100, Math.round(50 - diff * 5))) : null;

            // Individual trend data (chronological age increases at each test date)
            const trendData = dash.displayDates.map((dateStr: string, di: number) => {
              const testDate = new Date(dateStr + 'T00:00:00');
              const chronAtDate = +((testDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
              const v = clock?.values[di] ?? null;
              if (v == null) return { date: dash.displayLabels[di], value: null, chron: chronAtDate };
              const displayVal = c.isDunedin ? +((v as number) * chronAtDate).toFixed(1) : v;
              return { date: dash.displayLabels[di], value: displayVal, chron: chronAtDate };
            });
            const trendVals = trendData.map(d => d.value).filter((v): v is number => v != null);
            const trendChrons = trendData.map(d => d.chron);
            const yMin = trendVals.length > 0 ? Math.floor(Math.min(...trendVals, ...trendChrons) / 5) * 5 - 2 : chronoAge - 10;
            const yMax = trendVals.length > 0 ? Math.ceil(Math.max(...trendVals, ...trendChrons) / 5) * 5 + 2 : chronoAge + 10;

            return { ...c, latestVal, projectedAge, diff, gaugeScore, trendData, trendVals, yMin, yMax, hasAnyData, hasCurrent };
          });

          // Show section if at least one clock has any data (current or historical)
          if (!clockCards.some(c => c.hasAnyData)) return null;

          return (
            <section className="mb-16">
              <SectionTag>{t.bioAgeClocks}</SectionTag>

              <div className="bg-[#0e393d] rounded-2xl overflow-hidden">
                {/* 3 clock gauges side by side */}
                <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[.06]`}>
                  {clockCards.map((c) => (
                    <div key={c.slug} className={`p-5 flex flex-col items-center ${!c.hasCurrent ? 'opacity-35' : ''}`}>
                      <div className="text-[10px] font-semibold tracking-[.12em] uppercase mb-3 self-start" style={{ color: c.hasCurrent ? c.color : 'rgba(255,255,255,.25)' }}>
                        {c.label}
                      </div>
                      {c.gaugeScore != null ? (
                        <Gauge score={c.gaugeScore} max={100} dark />
                      ) : (
                        <div className="w-[130px] h-[100px] flex items-center justify-center">
                          <span className="text-white/15 text-[11px]">No current data</span>
                        </div>
                      )}
                      <div className="mt-2 text-center">
                        {c.hasCurrent ? (
                          <>
                            {c.isDunedin ? (
                              <>
                                <div className="text-xs text-white/30">
                                  Rate: <span className="font-semibold text-white/60">{c.latestVal?.toFixed(2)}</span> yr/yr
                                </div>
                                <div className="text-xs text-white/30 mt-0.5">
                                  Projected: <span className="font-serif text-lg" style={{ color: c.color }}>{c.projectedAge?.toFixed(1)}</span> years
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-white/30">
                                Bio age: <span className="font-serif text-lg" style={{ color: c.color }}>{c.projectedAge?.toFixed(1)}</span> years
                              </div>
                            )}
                            <div className="text-[10px] text-white/20 mt-0.5">
                              Chronological: {chronoAge.toFixed(1)}
                            </div>
                            {c.diff != null && (
                              <div className="text-xs font-semibold mt-1" style={{ color: c.diff < 0 ? '#0C9C6C' : '#C4A96A' }}>
                                {c.diff < 0 ? `↓ ${Math.abs(c.diff).toFixed(1)} years younger` : `↑ ${c.diff.toFixed(1)} years older`}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-[10px] text-white/15 mt-1">
                            {c.slug === 'phenoage' ? 'Available in all packages' : 'Complete package only'}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] text-white/20 text-center leading-snug mt-3 px-2">
                        {c.desc[lang] || c.desc['en']}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Individual trend charts for each clock */}
                <div className={`grid grid-cols-1 md:grid-cols-3 border-t border-white/[.06]`}>
                  {clockCards.map((c) => (
                    <div key={c.slug} className={`px-4 py-3 bg-black/[.12] border-b md:border-b-0 md:border-r border-white/[.06] last:border-r-0 last:border-b-0 ${!c.hasCurrent && !c.hasAnyData ? 'opacity-25' : ''}`}>
                      <div className="text-[9px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5" style={{ color: c.hasCurrent ? `${c.color}66` : 'rgba(255,255,255,.15)' }}>
                        {c.label} trend
                      </div>
                      <div className="h-[200px]">
                        {c.trendVals.length >= 2 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={c.trendData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,.3)' }} axisLine={false} tickLine={false} />
                              <YAxis domain={[c.yMin, c.yMax]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,.3)' }} axisLine={false} tickLine={false} tickCount={4} />
                              <RTooltip
                                formatter={(v) => typeof v === 'number' ? v.toFixed(1) : String(v ?? '')}
                                contentStyle={{ fontSize: 10, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 6 }}
                                labelStyle={{ color: 'rgba(255,255,255,.5)' }}
                              />
                              <Line name="Chronological" type="monotone" dataKey="chron" stroke="rgba(255,255,255,.15)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                              <Line name={c.label} type="monotone" dataKey="value" stroke={c.hasCurrent ? c.color : 'rgba(255,255,255,.2)'} strokeWidth={2} dot={{ r: 3, fill: c.hasCurrent ? c.color : 'rgba(255,255,255,.2)' }} activeDot={{ r: 5 }} connectNulls />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : c.trendVals.length === 1 ? (
                          <div className="h-full flex items-center justify-center text-[10px] text-white/15">Single data point</div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[10px] text-white/15">No data yet</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* KEY MARKERS SECTION */}
        {dash.topRankedMarkers.length > 0 && (
          <section className="mb-16">
            <SectionTag>{t.secKm}</SectionTag>

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

                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={dash.radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'rgba(255,255,255,.4)' }} />
                      {dash.hasRadarOldest && (
                        <Radar name="2 Tests Ago" dataKey="oldest" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={1} strokeDasharray="3 3"
                          dot={{ r: 2.5, fill: 'rgba(255,255,255,.15)', stroke: 'none' }} />
                      )}
                      {dash.hasRadarPrev && (
                        <Radar name="Previous" dataKey="previous" fill="none" stroke="rgba(206,171,132,.25)" strokeWidth={1.5} strokeDasharray="4 3"
                          dot={{ r: 2.5, fill: 'rgba(206,171,132,.3)', stroke: 'none' }} />
                      )}
                      <Radar name="Current" dataKey="current" fill="rgba(12,156,108,.08)" stroke="#0C9C6C" strokeWidth={2.5}
                        dot={{ r: 3, fill: '#0C9C6C', stroke: '#0b2e31', strokeWidth: 1.5 }}
                        animationBegin={200} animationDuration={800} />
                      <RTooltip
                        content={({ payload, label }: any) => {
                          if (!payload || payload.length === 0) return null;
                          const cur = payload.find((p: any) => p.dataKey === 'current');
                          const prev = payload.find((p: any) => p.dataKey === 'previous');
                          const old = payload.find((p: any) => p.dataKey === 'oldest');
                          return (
                            <div className="bg-[#0b2e31] border border-white/10 rounded-lg px-3 py-2 shadow-xl text-[11px]">
                              <div className="text-white/70 font-semibold mb-1">{label}</div>
                              {cur && cur.value != null && cur.value > 0 && (
                                <div className="flex items-center gap-2 text-white/80">
                                  <span className="w-2 h-2 rounded-full bg-[#0C9C6C]" />
                                  {dash.radarLabels.length >= 1 ? dash.radarLabels[dash.radarLabels.length - 1] : 'Current'}: <span className="font-semibold ml-auto">{cur.value}</span>
                                </div>
                              )}
                              {prev && prev.value != null && prev.value > 0 && dash.hasRadarPrev && (
                                <div className="flex items-center gap-2 text-white/50">
                                  <span className="w-2 h-2 rounded-full bg-[#ceab84]" />
                                  {dash.radarLabels[dash.radarLabels.length - 2]}: <span className="font-semibold ml-auto">{prev.value}</span>
                                </div>
                              )}
                              {old && old.value != null && old.value > 0 && dash.hasRadarOldest && (
                                <div className="flex items-center gap-2 text-white/40">
                                  <span className="w-2 h-2 rounded-full bg-white/30" />
                                  {dash.radarLabels[0]}: <span className="font-semibold ml-auto">{old.value}</span>
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend — centered below chart */}
                <div className="flex items-center justify-center gap-5 mt-2">
                  <span className="flex items-center gap-1.5 text-[10px] text-white/60">
                    <span className="inline-block w-5 h-[2.5px] rounded-full bg-[#0C9C6C]" />
                    {dash.radarLabels.length >= 1 ? dash.radarLabels[dash.radarLabels.length - 1] : 'Current'}
                  </span>
                  {dash.hasRadarPrev && (
                    <span className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <span className="inline-block w-5 h-[2px] rounded-full bg-[#ceab84] opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ceab84 0 4px, transparent 4px 7px)' }} />
                      {dash.radarLabels[dash.radarLabels.length - 2]}
                    </span>
                  )}
                  {dash.hasRadarOldest && (
                    <span className="flex items-center gap-1.5 text-[10px] text-white/30">
                      <span className="inline-block w-5 h-[2px] rounded-full opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #fff 0 3px, transparent 3px 6px)' }} />
                      {dash.radarLabels[0]}
                    </span>
                  )}
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

        {/* DEXA and VO2max visualization sections removed — values remain in ALL BIOMARKERS table */}

        {/* DOMAIN TILES SECTION */}
        <section id="section-domains" className={`mb-16 rounded-2xl transition-all duration-500 ${highlightedSection === 'domains' ? 'ring-2 ring-[#0C9C6C]/40 ring-offset-4 ring-offset-[#fafaf8]' : ''}`}>
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
                      <span className="text-[9px] text-[#1c2a2b]/35">{d.markers.filter(m => !dash.EXCLUDED_SLUGS.has(m.slug)).length} {t.markers} · {d.weightLabel}</span>
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
                  {(() => {
                    const activeMarkers = d.markers.filter(m => !dash.EXCLUDED_SLUGS.has(m.slug));
                    const markerWeight = activeMarkers.length > 0 ? Math.round(100 / activeMarkers.length) : 0;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeMarkers.map((m) => renderMarkerCard(m, d.key, markerWeight))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );

            function renderMarkerCard(m: ProcessedMarker, domainKey: string, weightPct?: number) {
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
                      <div className="flex items-center gap-1.5">
                        {weightPct != null && (
                          <span className="text-[9px] text-[#1c2a2b]/30 font-medium">{weightPct}%</span>
                        )}
                        <StatusBadge status={m.latestStatus} t={t} />
                      </div>
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

        {/* LAB RESULTS — Lab Reports sorted by date, grouped by he_domain */}
        <section id="section-markers" className={`mb-12 rounded-2xl transition-all duration-500 ${highlightedSection === 'markers' ? 'ring-2 ring-[#0C9C6C]/40 ring-offset-4 ring-offset-[#fafaf8]' : ''}`}>
          <SectionTag>{t.secBm}</SectionTag>

          {(() => {
            // ── Format range display ──
            const fmtRange = (lo: number | null, hi: number | null): string => {
              if (lo != null && hi != null) return `${lo}–${hi}`;
              if (hi != null) return `< ${hi}`;
              if (lo != null) return `> ${lo}`;
              return '—';
            };

            // ── Build lab reports sorted by date (newest first) ──
            // Each report: { date, title, markers grouped by domain }
            const reportDateMap = new Map(reports.map(r => [r.id, { date: r.test_date, title: r.title }]));

            // Group results by report/date
            const reportGroups = new Map<string, {
              date: string;
              title: string | null;
              reportId: string | null;
              markers: { marker: ProcessedMarker & { domainKey: string; domainIcon: string; domainName: string }; value: number; flag: string | null }[];
            }>();

            for (const d of dash.domains) {
              for (const m of d.markers) {
                const hist = dash.mData.get(m.defId);
                if (!hist) continue;
                for (const [date, entry] of hist.entries()) {
                  if (!reportGroups.has(date)) {
                    // Find matching report
                    const matchingReport = reports.find(r => r.test_date === date);
                    reportGroups.set(date, {
                      date,
                      title: matchingReport?.title ?? null,
                      reportId: matchingReport?.id ?? null,
                      markers: [],
                    });
                  }
                  reportGroups.get(date)!.markers.push({
                    marker: { ...m, domainKey: d.key, domainIcon: d.icon, domainName: getName(d.name, lang) },
                    value: entry.value,
                    flag: entry.flag,
                  });
                }
              }
            }

            // Sort reports by date descending (newest first)
            const sortedReports = [...reportGroups.values()].sort((a, b) => b.date.localeCompare(a.date));

            return (
              <div className="space-y-6">
                {sortedReports.map((report) => {
                  // Group markers by domain, maintaining DOMAIN_ORDER
                  const domainGrouped = new Map<string, typeof report.markers>();
                  for (const entry of report.markers) {
                    const key = entry.marker.domainKey;
                    if (!domainGrouped.has(key)) domainGrouped.set(key, []);
                    domainGrouped.get(key)!.push(entry);
                  }

                  // Sort domains by DOMAIN_ORDER
                  const orderedDomains = DOMAIN_ORDER
                    .filter(dk => domainGrouped.has(dk))
                    .map(dk => ({
                      key: dk,
                      icon: DOMAIN_META[dk]?.icon ?? '',
                      name: domainGrouped.get(dk)![0].marker.domainName,
                      entries: domainGrouped.get(dk)!,
                    }));

                  const isExpanded = expandedReports.has(report.date);
                  const toggleReport = () => {
                    setExpandedReports(prev => {
                      const next = new Set(prev);
                      if (next.has(report.date)) next.delete(report.date);
                      else next.add(report.date);
                      return next;
                    });
                  };

                  return (
                    <div key={report.date} className="bg-white rounded-xl border border-[#1c2a2b]/[.06] overflow-hidden shadow-sm">
                      {/* Report header — clickable to expand/collapse */}
                      <div
                        className="bg-[#0e393d] px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-[#0e393d]/95 transition-colors"
                        onClick={toggleReport}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/[.08] flex items-center justify-center">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {report.title || fmtDateFull(report.date, lang)}
                            </div>
                            {report.title && (
                              <div className="text-[10px] text-white/35">{fmtDateFull(report.date, lang)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] text-white/30">
                            {report.markers.length} {t.markers}
                          </div>
                          <span className={`text-white/30 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </div>
                      </div>

                      {/* Domain sections within this report — collapsible */}
                      {isExpanded && orderedDomains.map((domGroup, di) => (
                        <div key={domGroup.key}>
                          {/* Domain sub-header with column titles */}
                          <div className="px-5 py-2.5 bg-[#0e393d]/[.03] border-b border-[#0e393d]/[.06] flex items-center gap-4">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm">{domGroup.icon}</span>
                              <span className="text-[10px] font-semibold tracking-[.1em] uppercase text-[#ceab84]">
                                {domGroup.name}
                              </span>
                            </div>
                            {/* Column headers — only on first domain */}
                            {di === 0 && (
                              <>
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#1c2a2b]/25 shrink-0 w-24 text-right">Value</span>
                                <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-wider text-[#1c2a2b]/25 shrink-0 w-16 text-right">Ref</span>
                                <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-wider text-[#0C9C6C]/30 shrink-0 w-16 text-right">Optimal</span>
                                <span className="text-[9px] font-semibold uppercase tracking-wider text-[#1c2a2b]/25 shrink-0 w-20 text-right">Range</span>
                              </>
                            )}
                          </div>

                          {/* Marker rows */}
                          <div className="divide-y divide-[#0e393d]/[.04]">
                            {domGroup.entries.map((entry) => {
                              const m = entry.marker;
                              const status = m.latestStatus;

                              return (
                                <div key={m.defId} className="px-5 py-2.5 flex items-center gap-4 hover:bg-[#0e393d]/[.01] transition-colors">
                                  {/* Status dot + name + flag badge */}
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor(status) }} />
                                    <span className="text-[12px] font-medium text-[#0e393d] truncate flex items-center gap-1.5">
                                      {m.name}
                                      {m.isCalculated && (
                                        <span title="Calculated value" className="inline-flex items-center justify-center px-1 py-[1px] rounded text-[8px] font-semibold leading-none bg-[#0e393d]/[.07] text-[#0e393d]/50" style={{ fontStyle: 'italic', letterSpacing: '0.01em' }}>ƒx</span>
                                      )}
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium whitespace-nowrap ${
                                        status === 'optimal' ? 'bg-[#0C9C6C]/12 text-[#0C9C6C]' :
                                        status === 'good' ? 'bg-[#C4A96A]/15 text-[#7a5e20]' :
                                        status === 'moderate' ? 'bg-[#ef9f27]/15 text-[#a05e00]' :
                                        status === 'risk' ? 'bg-[#E24B4A]/12 text-[#E24B4A]' :
                                        'bg-gray-50 text-gray-600'
                                      }`}>
                                        {status === 'optimal' ? 'Optimal' : status === 'good' ? 'Good' : status === 'moderate' ? 'Borderline' : status === 'risk' ? 'Risk' : status}
                                      </span>
                                    </span>
                                  </div>

                                  {/* Value + unit */}
                                  <div className="text-right shrink-0 w-24">
                                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: statusColor(status) }}>
                                      {entry.value.toLocaleString('de-CH', { maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-[#1c2a2b]/30 ml-1">{m.unit}</span>
                                  </div>

                                  {/* Reference range */}
                                  <div className="hidden sm:block text-[10px] text-[#1c2a2b]/35 shrink-0 w-16 text-right tabular-nums">
                                    {fmtRange(m.refLow, m.refHigh)}
                                  </div>

                                  {/* Optimal range */}
                                  <div className="hidden sm:block text-[10px] text-[#0C9C6C]/50 font-medium shrink-0 w-16 text-right tabular-nums">
                                    {fmtRange(m.optLow, m.optHigh)}
                                  </div>

                                  {/* Mini range bar */}
                                  <div className="shrink-0 w-20">
                                    {(m.refLow != null || m.refHigh != null) && (
                                      <MiniRangeBar value={entry.value} refLow={m.refLow} refHigh={m.refHigh}
                                        optLow={m.optLow} optHigh={m.optHigh} status={status} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* ── Research & Evidence ─────────────────────────────────────────── */}
        {(() => {
          const allMarkers = dash.domains.flatMap(d => d.markers);
          const flaggedMarkers = allMarkers
            .filter(m => m.latest != null && (m.latestStatus === 'moderate' || m.latestStatus === 'risk'))
            .map(m => ({ slug: m.slug, name: m.name, value: m.latest!, unit: m.unit, status: m.latestStatus }));

          const biomarkerCtx = buildBiomarkerContext(flaggedMarkers);
          const suggestions = buildResearchSuggestions(flaggedMarkers.map(m => m.slug));

          return (
            <section className="mt-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#ceab84]">Research & Evidence</span>
                <div className="flex-1 h-px bg-gradient-to-r from-[#ceab84]/20 to-transparent" />
                <a
                  href="/research"
                  className="text-[11px] text-[#0e393d]/40 hover:text-[#0e393d] transition-colors"
                >
                  Open full view →
                </a>
              </div>

              <div className="rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden" style={{ height: 560 }}>
                <ResearchChat
                  biomarkerContext={biomarkerCtx || undefined}
                  suggestions={suggestions.length > 0 ? suggestions : undefined}
                />
              </div>
            </section>
          );
        })()}

      </div>
    </div>
  );
}
