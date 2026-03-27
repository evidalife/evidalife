'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip,
  ResponsiveContainer, ReferenceArea, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';
type Dir = 'lower' | 'higher' | 'range';
type MStatus = 'opt' | 'norm' | 'warn';

type Marker = {
  n: string; u: string;
  v: [number, number, number];
  r: [number, number]; o: [number, number];
  dir: Dir; desc: string;
};
type Domain = {
  ic: string; nm: Record<Lang, string>;
  sc: [number, number, number]; w: string; col: string;
  m: Marker[];
};
type Featured = { di: number; mi: number; why: string };

// ── Sample data ───────────────────────────────────────────────────────────────
const DATES = ['Sep 2024', 'Jun 2025', 'Mar 2026'];
const OV = [68, 74, 78];
const CHRON = [38.5, 39.2, 40.1];
const BIO_PHENO = [34.1, 31.8, 28.3];
const BIO_GRIM: (number | null)[] = [35.2, null, 28.3];
const BIO_PACE_RATE = [0.91, 0.87, 0.84];

const D: Domain[] = [
  { ic: '❤️', nm: { en: 'Heart & Vessels', de: 'Herz & Gefäße', fr: 'Cœur & Vaisseaux', es: 'Corazón & Vasos', it: 'Cuore & Vasi' }, sc: [72, 82, 88], w: '20%', col: '#dc2626', m: [
    { n: 'LDL Cholesterol', u: 'mg/dL', v: [108, 94, 82], r: [0, 130], o: [50, 100], dir: 'lower', desc: 'Primary driver of atherosclerotic cardiovascular disease. LDL particles penetrate and accumulate in arterial walls. Below 100 mg/dL is longevity optimal. Your 24% improvement over 18 months is clinically significant.' },
    { n: 'ApoB', u: 'g/L', v: [0.92, 0.81, 0.72], r: [0.4, 1.3], o: [0.5, 0.9], dir: 'lower', desc: 'Most accurate single cardiovascular risk marker — counts every atherogenic particle. The European Society of Cardiology recommends ApoB as the primary cardiovascular target. Your ApoB fell 22%, now in the optimal zone.' },
    { n: 'HDL Cholesterol', u: 'mg/dL', v: [48, 55, 62], r: [40, 100], o: [50, 90], dir: 'higher', desc: 'Reverse cholesterol transport — removes cholesterol from arterial walls. Higher HDL correlates with lower cardiovascular risk. Your HDL has risen significantly, reflecting improved diet and exercise.' },
    { n: 'Triglycerides', u: 'mg/dL', v: [118, 95, 78], r: [0, 150], o: [0, 100], dir: 'lower', desc: 'Diet-sensitive lipid. TG/HDL ratio below 1.5 is a strong cardiovascular health marker. Your triglycerides have fallen 34%, reflecting improved insulin sensitivity and dietary changes.' },
    { n: 'Lp(a)', u: 'nmol/L', v: [32, 32, 32], r: [0, 75], o: [0, 50], dir: 'lower', desc: 'Genetically determined cardiovascular risk. Largely unmodifiable by lifestyle. Your value of 32 nmol/L is in the normal range — a genetic advantage.' },
    { n: 'Homocysteine', u: 'µmol/L', v: [12.1, 10.4, 9.2], r: [5, 15], o: [5, 10], dir: 'lower', desc: 'Elevated homocysteine damages blood vessel walls and increases clot risk. B vitamins (B6, B12, folate) are the primary intervention. Your homocysteine is now in the optimal zone.' },
  ]},
  { ic: '⚡', nm: { en: 'Metabolism', de: 'Stoffwechsel', fr: 'Métabolisme', es: 'Metabolismo', it: 'Metabolismo' }, sc: [65, 76, 82], w: '18%', col: '#059669', m: [
    { n: 'Fasting Glucose', u: 'mg/dL', v: [102, 94, 88], r: [70, 100], o: [72, 90], dir: 'lower', desc: 'Primary blood sugar marker. Optimal range (72–90 mg/dL) is associated with lowest all-cause mortality. Chronically elevated glucose drives glycation — accelerating biological aging.' },
    { n: 'HbA1c', u: '%', v: [5.6, 5.3, 5.1], r: [4, 5.7], o: [4.5, 5.3], dir: 'lower', desc: '3-month average blood sugar. Each 0.1% reduction correlates with meaningfully lower cardiovascular and all-cause mortality risk. Your trend from 5.6% to 5.1% represents a clinically meaningful improvement.' },
    { n: 'Fasting Insulin', u: 'mIU/L', v: [9.2, 7.1, 5.8], r: [2.6, 24.9], o: [2.5, 8], dir: 'lower', desc: 'The most sensitive early indicator of metabolic dysfunction. Elevated insulin drives fat storage, inflammation, and cardiovascular risk. Longevity optimal below 8 mIU/L. Your improvement from 9.2 to 5.8 is excellent.' },
    { n: 'HOMA-IR', u: 'index', v: [2.31, 1.64, 1.26], r: [0, 2.5], o: [0, 1.5], dir: 'lower', desc: 'Gold standard insulin resistance index. Below 1.5 indicates excellent insulin sensitivity. Your improvement from 2.31 to 1.26 — crossing into the optimal zone — is clinically exceptional.' },
    { n: 'Uric Acid', u: 'mg/dL', v: [6.4, 6.0, 5.8], r: [3.5, 7.2], o: [3.5, 5.5], dir: 'lower', desc: 'Elevated uric acid drives gout, kidney stones, hypertension, and cardiovascular disease through inflammatory pathways. Optimal range is 3.5–5.5 mg/dL. Your level is trending in the right direction.' },
  ]},
  { ic: '🛡️', nm: { en: 'Inflammation', de: 'Entzündung', fr: 'Inflammation', es: 'Inflamación', it: 'Infiammazione' }, sc: [52, 58, 61], w: '15%', col: '#d97706', m: [
    { n: 'hsCRP', u: 'mg/L', v: [2.8, 2.2, 1.8], r: [0, 3], o: [0, 1], dir: 'lower', desc: 'Primary systemic inflammation marker. Chronic low-grade inflammation — "inflammaging" — accelerates virtually every aging process. Below 1.0 mg/L is the longevity optimal target. Your hsCRP is above optimal but showing the right trend.' },
    { n: 'Fibrinogen', u: 'mg/dL', v: [320, 295, 285], r: [200, 400], o: [200, 300], dir: 'lower', desc: 'A clotting protein and acute-phase reactant. Elevated fibrinogen predicts cardiovascular events and stroke. Optimal below 300 mg/dL. Your trend is improving.' },
    { n: 'WBC', u: '×10³/µL', v: [7.1, 6.8, 6.2], r: [4, 10], o: [4, 6.5], dir: 'lower', desc: 'Total white blood cell count reflects overall immune activation. Chronically elevated WBC — even within the laboratory reference range — independently predicts increased all-cause mortality. Optimal 4–6.5 × 10³/µL.' },
    { n: 'ESR', u: 'mm/hr', v: [15, 14, 12], r: [0, 20], o: [0, 10], dir: 'lower', desc: 'Erythrocyte Sedimentation Rate — a non-specific inflammation marker. Optimal below 10 mm/hr. Your trend is positive.' },
    { n: 'IL-6', u: 'pg/mL', v: [3.2, 2.6, 2.1], r: [0, 7], o: [0, 1.8], dir: 'lower', desc: 'Interleukin-6 is a key cytokine in the inflammaging cascade. Chronically elevated IL-6 drives muscle catabolism, insulin resistance, and cancer risk. Optimal below 1.8 pg/mL.' },
  ]},
  { ic: '🫁', nm: { en: 'Organ Function', de: 'Organfunktion', fr: 'Fonction des organes', es: 'Función orgánica', it: 'Funzione degli organi' }, sc: [80, 83, 85], w: '15%', col: '#7c3aed', m: [
    { n: 'GGT', u: 'U/L', v: [32, 26, 22], r: [0, 65], o: [0, 30], dir: 'lower', desc: 'Highly sensitive liver marker — elevated even by moderate alcohol. A strong independent predictor of all-cause mortality within the lab reference range. Longevity optimal below 30 U/L. Your GGT has fallen into the optimal zone.' },
    { n: 'ALT', u: 'U/L', v: [28, 26, 24], r: [0, 50], o: [0, 30], dir: 'lower', desc: 'Primary liver enzyme. Elevated ALT signals liver cell damage from fatty liver, alcohol, or medications. Longevity optimal below 30 U/L. Your ALT is now in the optimal zone.' },
    { n: 'AST', u: 'U/L', v: [24, 22, 21], r: [0, 50], o: [0, 30], dir: 'lower', desc: 'Liver and muscle enzyme. Interpreted alongside ALT via the De Ritis ratio to differentiate sources. Both below 30 U/L is the longevity optimal target. Your AST is excellent.' },
    { n: 'Creatinine', u: 'mg/dL', v: [0.98, 0.96, 0.95], r: [0.7, 1.2], o: [0.7, 1.1], dir: 'range', desc: 'Muscle metabolism waste filtered by kidneys. Used to calculate eGFR. Your creatinine is optimal and stable.' },
    { n: 'eGFR', u: 'mL/min', v: [95, 97, 98], r: [60, 120], o: [90, 120], dir: 'higher', desc: 'CKD-EPI 2021 kidney function estimate. Kidney function normally declines ~1 mL/min/year after 40. Your eGFR is excellent and actually improving — an exceptional finding.' },
    { n: 'TSH', u: 'mIU/L', v: [2.8, 2.4, 2.1], r: [0.4, 4], o: [0.5, 2.5], dir: 'range', desc: 'Thyroid Stimulating Hormone controls metabolism throughout the body. Longevity optimal range 0.5–2.5 mIU/L. Your TSH is trending toward the center of the optimal range.' },
    { n: 'Free T4', u: 'ng/dL', v: [1.12, 1.15, 1.18], r: [0.8, 1.8], o: [1, 1.5], dir: 'range', desc: 'Prohormone converted to active T3 in peripheral tissues. Optimal 1.0–1.5 ng/dL. Your fT4 is optimal and gently rising.' },
  ]},
  { ic: '🥗', nm: { en: 'Nutrients', de: 'Nährstoffe', fr: 'Nutriments', es: 'Nutrientes', it: 'Nutrienti' }, sc: [42, 50, 58], w: '12%', col: '#10b981', m: [
    { n: 'Vitamin D', u: 'ng/mL', v: [18, 28, 24], r: [20, 100], o: [40, 60], dir: 'higher', desc: 'Functions more like a hormone than a vitamin. Receptors found in virtually every tissue. Deficiency linked to cardiovascular disease, autoimmune conditions, cancer, and all-cause mortality. Longevity optimal 40–60 ng/mL. Supplement 4,000 IU/day.' },
    { n: 'Vitamin B12', u: 'pg/mL', v: [310, 420, 485], r: [200, 900], o: [400, 800], dir: 'higher', desc: 'Critical for neurological function, DNA synthesis, and homocysteine regulation. Deficiency common with plant-based diets and aging. Optimal above 400 pg/mL. Your B12 has improved significantly.' },
    { n: 'Folate', u: 'ng/mL', v: [8.5, 12.1, 14.2], r: [3, 20], o: [10, 20], dir: 'higher', desc: 'Essential for DNA synthesis, red blood cell formation, and homocysteine regulation. Optimal above 10 ng/mL. Your folate has crossed into the optimal range.' },
    { n: 'Iron (Serum)', u: 'µg/dL', v: [82, 90, 95], r: [60, 170], o: [70, 150], dir: 'range', desc: 'Serum iron reflects currently circulating iron available for cellular functions. Interpreted alongside ferritin, transferrin, and TSAT for complete iron status. Your serum iron is optimal.' },
    { n: 'Ferritin', u: 'ng/mL', v: [62, 54, 48], r: [20, 200], o: [40, 100], dir: 'range', desc: 'Iron storage protein and acute-phase inflammatory marker. Both low (<50) and high (>200) ferritin increase mortality risk. Your ferritin is declining — monitor at next test to ensure it stays above 40 ng/mL.' },
    { n: 'Omega-3 Index', u: '%', v: [4.2, 5.4, 6.8], r: [4, 12], o: [8, 12], dir: 'higher', desc: 'EPA+DHA as % of red blood cell fatty acids. Above 8% is associated with lowest rates of cardiovascular disease, sudden cardiac death, and all-cause mortality. You are on an excellent trajectory toward this target.' },
  ]},
  { ic: '🧬', nm: { en: 'Hormones', de: 'Hormone', fr: 'Hormones', es: 'Hormonas', it: 'Ormoni' }, sc: [70, 75, 79], w: '10%', col: '#f59e0b', m: [
    { n: 'Testosterone', u: 'ng/dL', v: [480, 540, 580], r: [270, 1070], o: [500, 900], dir: 'higher', desc: 'Critical for muscle, bone density, libido, cognition, and cardiovascular health. Declines ~1–2%/year after 30. Longevity optimal 500–900 ng/dL. Your testosterone is in the optimal range and rising.' },
    { n: 'Free Testosterone', u: 'pg/mL', v: [9.8, 11.2, 12.5], r: [5, 25], o: [10, 22], dir: 'higher', desc: 'Biologically active fraction not bound to SHBG. More clinically relevant than total testosterone for symptoms of deficiency. Optimal 10–22 pg/mL. Your free T is in the optimal range and rising.' },
    { n: 'Cortisol (AM)', u: 'µg/dL', v: [18.5, 16.2, 14.2], r: [6, 23], o: [8, 15], dir: 'lower', desc: 'Chronically elevated cortisol drives muscle breakdown, visceral fat accumulation, immune suppression, and cognitive decline. Optimal morning cortisol 8–15 µg/dL. Your cortisol is trending downward.' },
    { n: 'DHEA-S', u: 'µg/dL', v: [280, 295, 310], r: [80, 560], o: [200, 450], dir: 'higher', desc: 'Master precursor hormone, declines dramatically with age. Lower DHEA-S predicts higher all-cause mortality. Your DHEA-S is in the optimal range and rising — a positive sign.' },
  ]},
  { ic: '🏋️', nm: { en: 'Body Composition', de: 'Körperzusammensetzung', fr: 'Composition corporelle', es: 'Composición corporal', it: 'Composizione corporea' }, sc: [62, 70, 74], w: '5%', col: '#0ea5e9', m: [
    { n: 'BMI', u: 'kg/m²', v: [26.8, 25.4, 24.6], r: [18.5, 30], o: [20, 25], dir: 'range', desc: 'Body mass index. Limited for athletes as it cannot distinguish muscle from fat. Your BMI of 24.6 is now in the optimal range.' },
    { n: 'Body Fat', u: '%', v: [24.5, 21.8, 19.6], r: [8, 30], o: [12, 20], dir: 'lower', desc: 'DEXA body fat percentage reflects true adiposity. For men, 12–20% is the optimal range. Your body fat has fallen 5% over 18 months — significant body recomposition.' },
    { n: 'Visceral Fat', u: 'cm²', v: [112, 95, 82], r: [10, 150], o: [10, 100], dir: 'lower', desc: 'Fat deposited around internal organs — metabolically far more dangerous than subcutaneous fat. Directly linked to insulin resistance and cardiovascular risk. Your visceral fat has fallen 27% into the optimal zone.' },
    { n: 'Lean Mass', u: 'kg', v: [58.2, 60.5, 62.1], r: [45, 85], o: [55, 75], dir: 'higher', desc: 'Skeletal muscle mass is one of the strongest predictors of longevity. Muscle is the primary organ for glucose disposal. Your lean mass has increased 3.9 kg — exceptional result.' },
    { n: 'Bone Density', u: 'T-score', v: [-0.4, -0.2, 0.1], r: [-2.5, 2], o: [-1, 2], dir: 'higher', desc: 'DEXA T-score comparing your bone density to a young adult reference. Above 0 means your bones are denser than the young adult average. Your trend is excellent — weight training is working.' },
  ]},
  { ic: '🏃', nm: { en: 'Fitness & Recovery', de: 'Fitness & Erholung', fr: 'Forme & Récupération', es: 'Fitness & Recuperación', it: 'Fitness & Recupero' }, sc: [55, 65, 72], w: '5%', col: '#16a34a', m: [
    { n: 'VO₂max', u: 'mL/kg/min', v: [38.5, 42.1, 45.8], r: [20, 60], o: [40, 55], dir: 'higher', desc: 'The single strongest predictor of all-cause mortality. Each 1 mL/kg/min improvement reduces mortality risk meaningfully. You improved 19% from below-average to above-average for your age group — the most impactful change in your report.' },
    { n: 'Resting Heart Rate', u: 'bpm', v: [68, 62, 58], r: [40, 100], o: [45, 60], dir: 'lower', desc: 'Lower RHR reflects a more efficient cardiovascular system. Regular aerobic training reduces RHR ~1 bpm per week. Your RHR has fallen from 68 to 58 — reflecting significant aerobic fitness improvement.' },
    { n: 'HRV (RMSSD)', u: 'ms', v: [32, 41, 48], r: [15, 100], o: [40, 80], dir: 'higher', desc: 'Heart rate variability reflects autonomic nervous system balance. High HRV indicates good recovery, low stress, and high fitness. Your HRV has improved dramatically from 32 to 48 ms — now in the optimal zone.' },
    { n: 'Recovery Score', u: '/100', v: [62, 71, 78], r: [0, 100], o: [70, 100], dir: 'higher', desc: 'Composite recovery metric from wearable device data. Above 70 is optimal. Your recovery has improved from 62 to 78 — consistent with the improvements in HRV, RHR, and VO₂max.' },
  ]},
];

const FEATURED: Featured[] = [
  { di: 0, mi: 1, why: 'Your ApoB fell from 0.92 to 0.72 g/L — a 22% drop into the optimal zone. This is your strongest cardiovascular achievement.' },
  { di: 1, mi: 3, why: 'HOMA-IR dropped from 2.31 to 1.26 in 18 months — crossing from insulin resistant to optimal. One of the most meaningful changes in your report.' },
  { di: 2, mi: 0, why: 'hsCRP has improved from 2.8 to 1.8 mg/L — still above the 1.0 optimal threshold. Keep the anti-inflammatory momentum.' },
  { di: 7, mi: 0, why: 'Most dramatic improvement: VO₂max jumped 19% from below-average to above-average for your age group.' },
  { di: 4, mi: 0, why: 'Vitamin D at 24 ng/mL is your most actionable opportunity. Below optimal 40–60 ng/mL. Supplement 4,000 IU/day.' },
  { di: 0, mi: 2, why: 'HDL rose from 48 to 62 mg/dL — significant reverse cholesterol transport improvement. Diet and exercise are working.' },
  { di: 4, mi: 5, why: 'Omega-3 Index climbing from 4.2% to 6.8%. Above 8% is the longevity optimal. You are on track.' },
  { di: 5, mi: 0, why: 'Testosterone rising from 480 to 580 ng/dL, now in the optimal zone. Consistent resistance training is working.' },
];

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<Lang, {
  tag: string; title: string; sub: string;
  heroDate: string; heroTests: string; heroKit: string;
  scMsg: string; sample: string;
  secScore: string; secKm: string; secDom: string; secBm: string;
  insStrT: string; insPriT: string; insProgT: string;
  alertWarnHead: string; alertWarnBody: string;
  alertOkHead: string; alertOkBody: string;
  domBalance: string; markerStatus: string;
  kmExpand: string; kmCollapse: string;
  optLabel: string; normLabel: string; warnLabel: string;
  refRange: string; longevityOpt: string; changeLabel: string;
  markerTrends: string; markersClick: string;
  weightLabel: string; markersLabel: string;
  nextRec: string;
}> = {
  en: {
    tag: 'HEALTH ENGINE', title: 'Your Longevity Score.', sub: '46 biomarkers across 8 health domains. Track your score over time, see what improves, and know exactly what to focus on.',
    heroDate: 'Last tested: Mar 15, 2026', heroTests: '3 tests completed', heroKit: 'Evida Complete (46 markers)',
    scMsg: 'Good — above average for your age', sample: 'PREVIEW — Sample Data',
    secScore: 'LONGEVITY SCORE', secKm: 'KEY MARKERS', secDom: '8 HEALTH DOMAINS', secBm: 'BIOMARKER DETAILS',
    insStrT: 'Top Strength', insPriT: 'Priority Action', insProgT: '18-Month Progress',
    alertWarnHead: '1 marker in the borderline zone', alertWarnBody: 'Within laboratory reference range but below the longevity optimal target. Lifestyle interventions can often bring these into the optimal zone within 90 days.',
    alertOkHead: '11 markers have moved into a healthy range since your first test', alertOkBody: 'Your interventions are working. Keep up the current approach and continue tracking at your next test.',
    domBalance: 'DOMAIN BALANCE', markerStatus: 'MARKER STATUS',
    kmExpand: '▼ expand', kmCollapse: '▲ collapse',
    optLabel: 'Optimal', normLabel: 'Normal', warnLabel: 'Borderline',
    refRange: 'Reference range', longevityOpt: 'Longevity optimal', changeLabel: 'Change',
    markerTrends: 'Marker trends — each line normalised to its own range · hover for exact values',
    markersClick: 'markers — click any to expand history & explanation',
    weightLabel: 'weight', markersLabel: 'markers',
    nextRec: 'Next recommended',
  },
  de: {
    tag: 'HEALTH ENGINE', title: 'Dein Longevity Score.', sub: '46 Biomarker in 8 Gesundheitsbereichen. Verfolge deinen Score über die Zeit, sieh was sich verbessert.',
    heroDate: 'Zuletzt getestet: 15. März 2026', heroTests: '3 Tests abgeschlossen', heroKit: 'Evida Complete (46 Marker)',
    scMsg: 'Gut — über dem Durchschnitt für dein Alter', sample: 'VORSCHAU — Beispieldaten',
    secScore: 'LONGEVITY SCORE', secKm: 'SCHLÜSSEL-MARKER', secDom: '8 GESUNDHEITSBEREICHE', secBm: 'BIOMARKER-DETAILS',
    insStrT: 'Top-Stärke', insPriT: 'Priorität', insProgT: '18-Monats-Fortschritt',
    alertWarnHead: '1 Marker im Grenzbereich', alertWarnBody: 'Im Laborbereich, aber unter dem Longevity-Zielwert. Lifestyle-Maßnahmen können dies oft in 90 Tagen korrigieren.',
    alertOkHead: '11 Marker haben sich seit dem ersten Test verbessert', alertOkBody: 'Deine Interventionen wirken. Weiter so und beim nächsten Test fortsetzen.',
    domBalance: 'DOMÄNEN-BALANCE', markerStatus: 'MARKER-STATUS',
    kmExpand: '▼ öffnen', kmCollapse: '▲ schließen',
    optLabel: 'Optimal', normLabel: 'Normal', warnLabel: 'Grenzwertig',
    refRange: 'Referenzbereich', longevityOpt: 'Longevity-Optimum', changeLabel: 'Änderung',
    markerTrends: 'Marker-Trends — normalisiert · Hover für genaue Werte',
    markersClick: 'Marker — klicke für Verlauf & Erklärung',
    weightLabel: 'Gewicht', markersLabel: 'Marker',
    nextRec: 'Nächste Empfehlung',
  },
  fr: {
    tag: 'HEALTH ENGINE', title: 'Votre score de longévité.', sub: '46 biomarqueurs dans 8 domaines de santé. Suivez votre score dans le temps, voyez ce qui s\'améliore.',
    heroDate: 'Dernier test : 15 mars 2026', heroTests: '3 tests complétés', heroKit: 'Evida Complete (46 marqueurs)',
    scMsg: 'Bien — au-dessus de la moyenne pour votre âge', sample: 'APERÇU — Données d\'exemple',
    secScore: 'SCORE DE LONGÉVITÉ', secKm: 'MARQUEURS CLÉS', secDom: '8 DOMAINES DE SANTÉ', secBm: 'DÉTAILS BIOMARQUEURS',
    insStrT: 'Point fort', insPriT: 'Action prioritaire', insProgT: 'Progrès 18 mois',
    alertWarnHead: '1 marqueur en zone limite', alertWarnBody: 'Dans la plage de référence mais en dessous de la cible optimale de longévité.',
    alertOkHead: '11 marqueurs sont entrés dans une plage saine depuis votre premier test', alertOkBody: 'Vos interventions fonctionnent. Continuez et suivez au prochain test.',
    domBalance: 'ÉQUILIBRE DES DOMAINES', markerStatus: 'STATUT DES MARQUEURS',
    kmExpand: '▼ développer', kmCollapse: '▲ réduire',
    optLabel: 'Optimal', normLabel: 'Normal', warnLabel: 'Limite',
    refRange: 'Plage de référence', longevityOpt: 'Optimal longévité', changeLabel: 'Variation',
    markerTrends: 'Tendances des marqueurs — normalisées · survolez pour les valeurs exactes',
    markersClick: 'marqueurs — cliquez pour l\'historique & l\'explication',
    weightLabel: 'poids', markersLabel: 'marqueurs',
    nextRec: 'Prochain recommandé',
  },
  es: {
    tag: 'HEALTH ENGINE', title: 'Tu puntuación de longevidad.', sub: '46 biomarcadores en 8 dominios de salud. Sigue tu puntuación a lo largo del tiempo.',
    heroDate: 'Último análisis: 15 mar 2026', heroTests: '3 pruebas completadas', heroKit: 'Evida Complete (46 marcadores)',
    scMsg: 'Bien — por encima de la media para tu edad', sample: 'VISTA PREVIA — Datos de muestra',
    secScore: 'PUNTUACIÓN DE LONGEVIDAD', secKm: 'MARCADORES CLAVE', secDom: '8 DOMINIOS DE SALUD', secBm: 'DETALLES BIOMARCADORES',
    insStrT: 'Punto fuerte', insPriT: 'Acción prioritaria', insProgT: 'Progreso 18 meses',
    alertWarnHead: '1 marcador en zona límite', alertWarnBody: 'Dentro del rango de referencia pero por debajo del objetivo óptimo de longevidad.',
    alertOkHead: '11 marcadores han mejorado desde tu primer análisis', alertOkBody: 'Tus intervenciones están funcionando. Continúa y haz seguimiento en el próximo análisis.',
    domBalance: 'EQUILIBRIO DE DOMINIOS', markerStatus: 'ESTADO DE MARCADORES',
    kmExpand: '▼ expandir', kmCollapse: '▲ colapsar',
    optLabel: 'Óptimo', normLabel: 'Normal', warnLabel: 'Límite',
    refRange: 'Rango de referencia', longevityOpt: 'Óptimo de longevidad', changeLabel: 'Cambio',
    markerTrends: 'Tendencias de marcadores — normalizadas · hover para valores exactos',
    markersClick: 'marcadores — clic para historial y explicación',
    weightLabel: 'peso', markersLabel: 'marcadores',
    nextRec: 'Próximo recomendado',
  },
  it: {
    tag: 'HEALTH ENGINE', title: 'Il tuo punteggio di longevità.', sub: '46 biomarcatori in 8 domini della salute. Monitora il tuo punteggio nel tempo.',
    heroDate: 'Ultimo test: 15 mar 2026', heroTests: '3 test completati', heroKit: 'Evida Complete (46 marcatori)',
    scMsg: 'Buono — sopra la media per la tua età', sample: 'ANTEPRIMA — Dati di esempio',
    secScore: 'PUNTEGGIO DI LONGEVITÀ', secKm: 'MARCATORI CHIAVE', secDom: '8 DOMINI DELLA SALUTE', secBm: 'DETTAGLI BIOMARCATORI',
    insStrT: 'Punto di forza', insPriT: 'Azione prioritaria', insProgT: 'Progressi 18 mesi',
    alertWarnHead: '1 marcatore in zona limite', alertWarnBody: 'Nel range di riferimento ma sotto il target ottimale di longevità.',
    alertOkHead: '11 marcatori sono migliorati dal primo test', alertOkBody: 'I tuoi interventi stanno funzionando. Continua e monitora al prossimo test.',
    domBalance: 'BILANCIAMENTO DOMINI', markerStatus: 'STATO MARCATORI',
    kmExpand: '▼ espandi', kmCollapse: '▲ comprimi',
    optLabel: 'Ottimale', normLabel: 'Normale', warnLabel: 'Limite',
    refRange: 'Range di riferimento', longevityOpt: 'Ottimale longevità', changeLabel: 'Variazione',
    markerTrends: 'Tendenze marcatori — normalizzate · hover per valori esatti',
    markersClick: 'marcatori — clicca per cronologia e spiegazione',
    weightLabel: 'peso', markersLabel: 'marcatori',
    nextRec: 'Prossimo consigliato',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(ratio: number) {
  return ratio >= 0.85 ? '#0C9C6C' : ratio >= 0.70 ? '#C4A96A' : '#c0392b';
}
function mStatus(v: number, r: [number, number], o: [number, number], dir: Dir): MStatus {
  if (dir === 'lower') return v <= o[1] ? 'opt' : v <= r[1] ? 'norm' : 'warn';
  if (dir === 'higher') return v >= o[0] ? 'opt' : v >= r[0] ? 'norm' : 'warn';
  return (v >= o[0] && v <= o[1]) ? 'opt' : (v >= r[0] && v <= r[1]) ? 'norm' : 'warn';
}
function mColor(s: MStatus) {
  return s === 'opt' ? '#0C9C6C' : s === 'norm' ? '#C4A96A' : '#b45309';
}
function mLabel(s: MStatus, t: typeof T['en']) {
  return s === 'opt' ? t.optLabel : s === 'norm' ? t.normLabel : t.warnLabel;
}
function rPct(v: number, r: [number, number], o: [number, number], dir: Dir): number {
  let lo: number, hi: number;
  if (dir === 'lower') { lo = 0; hi = r[1] * 1.5; }
  else if (dir === 'higher') { lo = 0; hi = Math.max(o[0] * 2, r[1]); }
  else { lo = r[0] * 0.7; hi = r[1] * 1.3; }
  return Math.max(2, Math.min(97, ((v - lo) / (hi - lo)) * 100));
}
function oZone(r: [number, number], o: [number, number], dir: Dir): { l: number; w: number } {
  if (dir === 'lower') { const hi = r[1] * 1.5; return { l: 0, w: Math.min(80, (o[1] / hi) * 100) }; }
  if (dir === 'higher') { const hi = Math.max(o[0] * 2, r[1]); return { l: Math.max(0, Math.min(80, (o[0] / hi) * 100)), w: 25 }; }
  const lo = r[0] * 0.7, hi = r[1] * 1.3, rng = hi - lo;
  return { l: Math.max(0, Math.min(90, ((o[0] - lo) / rng) * 100)), w: Math.max(5, Math.min(80, ((o[1] - o[0]) / rng) * 100)) };
}

// ── SVG Gauge ─────────────────────────────────────────────────────────────────
function Gauge({ score, max, sz, dark = false }: { score: number; max: number; sz: 'lg' | 'sm'; dark?: boolean }) {
  const CX = sz === 'lg' ? 130 : 48;
  const CY = sz === 'lg' ? 115 : 42;
  const R  = sz === 'lg' ? 85  : 30;
  const MT = sz === 'lg' ? 10  : 3.5;
  const MX = sz === 'lg' ? 26  : 9;
  const W  = sz === 'lg' ? 260 : 96;
  const H  = sz === 'lg' ? 210 : 74;
  const dW = sz === 'lg' ? 200 : 78;
  const fz = sz === 'lg' ? 42  : 14;
  const sy = sz === 'lg' ? 180 : 66;
  const SEGS = 12, GAP = 2.5, START = 135, ARC = 270;
  const SA = (ARC - (SEGS - 1) * GAP) / SEGS;
  const rt = score / max;
  const filled = Math.round(rt * SEGS);
  const bw = sz === 'lg' ? 1.8 : 1;
  const tl = sz === 'lg' ? 9 : 4;
  const hr = sz === 'lg' ? 5 : 2.5;
  const na = (START + rt * ARC) * Math.PI / 180;
  const pa = na + Math.PI / 2;
  const tr = R - MX / 2 + 2;
  const cl = scoreColor(rt);
  const emptyFill = dark ? 'rgba(255,255,255,0.04)' : 'rgba(14,57,61,0.06)';
  const needleFill = dark ? 'rgba(255,255,255,0.4)' : '#1c2a2b';
  const hub1Fill = dark ? 'rgba(255,255,255,0.1)' : '#1c2a2b';
  const hub2Fill = dark ? 'rgba(255,255,255,0.6)' : 'white';
  const hub2Stroke = dark ? 'rgba(255,255,255,0.3)' : '#1c2a2b';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={dW} style={{ display: 'block' }}>
      {Array.from({ length: SEGS }, (_, i) => {
        const sa = (START + i * (SA + GAP)) * Math.PI / 180;
        const ea = (START + i * (SA + GAP) + SA) * Math.PI / 180;
        const thick = MT + (MX - MT) * (i / (SEGS - 1));
        const ri = R - thick / 2, ro = R + thick / 2;
        const d = `M${(CX+ro*Math.cos(sa)).toFixed(1)},${(CY+ro*Math.sin(sa)).toFixed(1)} A${ro},${ro} 0 0,1 ${(CX+ro*Math.cos(ea)).toFixed(1)},${(CY+ro*Math.sin(ea)).toFixed(1)} L${(CX+ri*Math.cos(ea)).toFixed(1)},${(CY+ri*Math.sin(ea)).toFixed(1)} A${ri},${ri} 0 0,0 ${(CX+ri*Math.cos(sa)).toFixed(1)},${(CY+ri*Math.sin(sa)).toFixed(1)} Z`;
        const fill = i < filled ? cl : emptyFill;
        return <path key={i} d={d} fill={fill} />;
      })}
      <path
        d={`M${(CX+tr*Math.cos(na)).toFixed(1)},${(CY+tr*Math.sin(na)).toFixed(1)} L${(CX+bw*Math.cos(pa)).toFixed(1)},${(CY+bw*Math.sin(pa)).toFixed(1)} L${(CX-tl*Math.cos(na)).toFixed(1)},${(CY-tl*Math.sin(na)).toFixed(1)} L${(CX-bw*Math.cos(pa)).toFixed(1)},${(CY-bw*Math.sin(pa)).toFixed(1)} Z`}
        fill={needleFill} opacity={dark ? 1 : 0.55}
      />
      <circle cx={CX} cy={CY} r={hr} fill={hub1Fill} opacity={dark ? 1 : 0.12} />
      <circle cx={CX} cy={CY} r={hr * 0.55} fill={hub2Fill} stroke={hub2Stroke} strokeWidth={0.7} />
      <text x={CX} y={sy} textAnchor="middle" fontFamily="'Instrument Serif',Georgia,serif" fontSize={fz} fill={cl}>{score}</text>
      {sz === 'lg' && (
        <>
          <text x={26} y={174} textAnchor="middle" fontSize={8} fill="#5a6e6f">0</text>
          <text x={234} y={174} textAnchor="middle" fontSize={8} fill="#5a6e6f">{max}</text>
        </>
      )}
    </svg>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function SectionHeader({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-[10px] font-semibold tracking-[.16em] uppercase text-[#c4a96a] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#0e393d]/[.06]" />
      {right && <span className="text-[10px] text-[#1c2a2b]/55 whitespace-nowrap">{right}</span>}
    </div>
  );
}

function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  const W = 120, H = 24;
  const mn = Math.min(...vals) - 2, mx = Math.max(...vals) + 2;
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * (W - 8) + 4,
    y: H - (((v - mn) / (mx - mn)) * (H - 6) + 3),
  }));
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const m = (pts[i - 1].x + pts[i].x) / 2;
    d += ` C${m},${pts[i - 1].y} ${m},${pts[i].y} ${pts[i].x},${pts[i].y}`;
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2}
          fill={i === pts.length - 1 ? '#0e393d' : color} />
      ))}
    </svg>
  );
}

function RangeBar({ v, r, o, dir }: { v: number; r: [number, number]; o: [number, number]; dir: Dir }) {
  const pct = rPct(v, r, o, dir);
  const oz = oZone(r, o, dir);
  const s = mStatus(v, r, o, dir);
  const cl = mColor(s);
  return (
    <div className="relative h-[5px] rounded-full bg-[#ede9e3]">
      <div className="absolute top-0 h-full rounded-full bg-[rgba(12,156,108,.2)]"
        style={{ left: `${oz.l}%`, width: `${oz.w}%` }} />
      <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full border-2 border-white shadow-sm z-10"
        style={{ left: `${pct}%`, background: cl }} />
    </div>
  );
}

function StatusBadge({ s, t }: { s: MStatus; t: typeof T['en'] }) {
  const cls = s === 'opt'
    ? 'bg-[rgba(12,156,108,.09)] text-[#0C9C6C]'
    : s === 'norm'
    ? 'bg-[rgba(196,169,106,.1)] text-[#9a6e20]'
    : 'bg-[rgba(180,83,9,.08)] text-[#b45309]';
  return (
    <span className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-full ${cls}`}>
      {mLabel(s, t)}
    </span>
  );
}

// ── Marker history chart ──────────────────────────────────────────────────────
const CHART_COLORS = ['#0e393d', '#0C9C6C', '#d4830a', '#c0392b', '#8b5cf6', '#0ea5e9', '#ceab84', '#f59e0b'];

function MarkerHistoryChart({ m, height = 90 }: { m: Marker; height?: number }) {
  const vals = m.v as number[];
  const mn = Math.min(...vals) * 0.88;
  const mx = Math.max(...vals) * 1.12;
  const s = mStatus(m.v[2], m.r, m.o, m.dir);
  const cl = mColor(s);
  const data = DATES.map((d, i) => ({ date: d, value: vals[i] }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <ReferenceArea y1={m.o[0]} y2={m.o[1]} fill="rgba(12,156,108,0.08)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#5a6e6f' }} axisLine={false} tickLine={false} />
        <YAxis domain={[mn, mx]} tick={{ fontSize: 9, fill: '#5a6e6f' }} axisLine={false} tickLine={false} tickCount={4} />
        <RTooltip
          formatter={(v: unknown) => [`${v as number} ${m.u}`, m.n]}
          contentStyle={{ fontSize: 11, border: '1px solid rgba(14,57,61,.1)', borderRadius: 8, padding: '4px 8px' }}
          itemStyle={{ color: cl }}
        />
        <Line type="monotone" dataKey="value" stroke={cl} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: cl }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Domain panel normalised chart ─────────────────────────────────────────────
function DomainNormChart({ domain }: { domain: Domain }) {
  const markers = domain.m.slice(0, 8);
  const rawData = DATES.map((date, i) => {
    const entry: Record<string, number | string> = { date };
    markers.forEach((m, mi) => {
      const v = m.v;
      const mn = Math.min(...v), mx = Math.max(...v), rng = mx - mn || 1;
      entry[`m${mi}`] = Math.round(((v[i] - mn) / rng) * 80 + 10);
      entry[`r${mi}`] = v[i];
    });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rawData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#5a6e6f' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#5a6e6f' }} axisLine={false} tickLine={false} tickCount={5} />
        <RTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const di = DATES.indexOf(label as string);
            return (
              <div className="bg-white border border-[#0e393d]/10 rounded-lg p-2 shadow text-xs">
                <div className="font-semibold text-[#0e393d] mb-1">{label}</div>
                {payload.map((p, idx) => {
                  const mi = parseInt((p.dataKey as string).replace('m', ''));
                  const marker = markers[mi];
                  if (!marker) return null;
                  const raw = di >= 0 ? marker.v[di] : null;
                  return (
                    <div key={idx} style={{ color: p.stroke as string }} className="text-[11px]">
                      {marker.n}: <span className="font-medium">{raw ?? '—'} {marker.u}</span>
                    </div>
                  );
                })}
              </div>
            );
          }}
        />
        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9, color: '#5a6e6f' }}
          formatter={(_v, entry) => {
            const mi = parseInt((entry.dataKey as string).replace('m', ''));
            return markers[mi]?.n ?? '';
          }}
        />
        {markers.map((m, mi) => (
          <Line
            key={mi} type="monotone" dataKey={`m${mi}`} name={m.n}
            stroke={CHART_COLORS[mi % CHART_COLORS.length]} strokeWidth={2}
            dot={{ r: 4, fill: CHART_COLORS[mi % CHART_COLORS.length] }}
            activeDot={{ r: 6 }} connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HealthEnginePublic({ lang }: { lang: Lang }) {
  const [activeLang, setActiveLang] = useState<Lang>(lang);
  const t = T[activeLang];

  // Domain tile expand (one at a time)
  const [openDomains, setOpenDomains] = useState<Set<number>>(new Set());
  // Accordion (multiple can be open)
  const [openAccordionDomains, setOpenAccordionDomains] = useState<Set<number>>(new Set());
  // Key marker cards
  const [openKeyMarkers, setOpenKeyMarkers] = useState<Set<number>>(new Set());
  // Individual markers in accordion
  const [openBmMarkers, setOpenBmMarkers] = useState<Map<string, boolean>>(new Map());

  function toggleDomain(di: number) {
    setOpenDomains(prev => {
      const next = new Set<number>();
      if (!prev.has(di)) next.add(di);
      return next;
    });
  }
  function toggleAccDomain(di: number) {
    setOpenAccordionDomains(prev => {
      const next = new Set(prev);
      next.has(di) ? next.delete(di) : next.add(di);
      return next;
    });
  }
  function toggleKeyMarker(fi: number) {
    setOpenKeyMarkers(prev => {
      const next = new Set(prev);
      next.has(fi) ? next.delete(fi) : next.add(fi);
      return next;
    });
  }
  function toggleBmMarker(key: string) {
    setOpenBmMarkers(prev => {
      const next = new Map(prev);
      next.set(key, !prev.get(key));
      return next;
    });
  }

  // Bio chart data
  const bioData = DATES.map((date, i) => ({
    date,
    pheno: BIO_PHENO[i],
    grim: BIO_GRIM[i],
    pace: +(BIO_PACE_RATE[i] * CHRON[i]).toFixed(1),
    chron: CHRON[i],
  }));

  // Score history data
  const scoreData = DATES.map((d, i) => ({ date: d, score: OV[i] }));

  // Radar data
  const radarData = D.map(d => ({
    subject: d.nm[activeLang].split(' ')[0],
    current: d.sc[2],
    first: d.sc[0],
  }));

  // Flag counts
  const flagCounts = { opt: 0, norm: 0, warn: 0 };
  D.forEach(d => d.m.forEach(m => { flagCounts[mStatus(m.v[2], m.r, m.o, m.dir)]++; }));
  const flagTotal = flagCounts.opt + flagCounts.norm + flagCounts.warn;

  const LANGS: Lang[] = ['en', 'de', 'fr', 'es', 'it'];

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">
      {/* Sample badge */}
      <div className="fixed bottom-2.5 right-2.5 z-50 bg-[#0e393d] text-[#ceab84]/65 text-[9px] font-semibold px-3 py-[5px] rounded-full tracking-[.06em] pointer-events-none">
        {t.sample}
      </div>

      <div className="max-w-[1060px] mx-auto px-8 md:px-12">

        {/* ── HERO ── */}
        <section className="pt-20 pb-6">
          <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-[#c4a96a] mb-2.5">{t.tag}</p>
          <h1 className="font-serif text-[clamp(2rem,4vw,3rem)] text-[#0e393d] leading-[1.08] mb-2.5">{t.title}</h1>
          <p className="text-[.9rem] font-light text-[#1c2a2b]/55 max-w-[480px] leading-relaxed mb-3.5">{t.sub}</p>
          <div className="flex flex-wrap gap-4 text-[.68rem] text-[#1c2a2b]/55">
            <span className="flex items-center gap-[5px]"><span className="w-[6px] h-[6px] rounded-full bg-[#0C9C6C] shrink-0" />{t.heroDate}</span>
            <span className="flex items-center gap-[5px]"><span className="w-[6px] h-[6px] rounded-full bg-[#ceab84] shrink-0" />{t.heroTests}</span>
            <span className="flex items-center gap-[5px]"><span className="w-[6px] h-[6px] rounded-full bg-[#0e393d] shrink-0" />{t.heroKit}</span>
          </div>
          {/* Lang switcher */}
          <div className="flex gap-[5px] pt-3.5">
            {LANGS.map(l => (
              <button key={l} onClick={() => setActiveLang(l)}
                className={`px-3 py-1 rounded-full text-[.64rem] font-semibold border transition-all ${activeLang === l ? 'bg-[#0e393d] text-[#ceab84] border-[#0e393d]' : 'bg-white text-[#1c2a2b]/55 border-[#0e393d]/10 hover:border-[#0e393d]/25'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </section>

        {/* ── TIMELINE ── */}
        <div className="flex gap-1.5 mb-7 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { date: 'Sep 2024', label: 'Test #1', dot: '#94a3b8', cur: false },
            { date: 'Jun 2025', label: 'Test #2', dot: '#ceab84', cur: false },
            { date: 'Mar 2026 · Current', label: 'Test #3', dot: '#0C9C6C', cur: true },
            { date: 'Sep 2026', label: t.nextRec, dot: '#ddd', cur: false, dashed: true },
          ].map((item, i) => (
            <div key={i} className={`shrink-0 flex items-center gap-[7px] px-[13px] py-[7px] rounded-[9px] border text-[#1c2a2b] ${item.cur ? 'border-[#0e393d] bg-[rgba(14,57,61,.03)]' : 'border-[#1c2a2b]/10 bg-white'} ${item.dashed ? 'opacity-35 border-dashed' : ''}`}>
              <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: item.dot }} />
              <div>
                <div className="text-[.66rem] font-semibold text-[#0e393d]">{item.date}</div>
                <div className="text-[.58rem] text-[#1c2a2b]/55">{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── LONGEVITY SCORE ── */}
        <section className="pt-2 pb-0">
          <SectionHeader label={t.secScore} right="Weighted composite of 8 domains" />

          {/* Score row */}
          <div className="grid md:grid-cols-[230px_1fr] gap-3.5 mb-3.5 items-stretch">

            {/* Score card */}
            <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 pt-5 pb-3.5 flex flex-col items-center gap-[5px]">
                <div className="text-[8px] font-semibold tracking-[.16em] uppercase text-white/35">LONGEVITY SCORE</div>
                <div className="mt-2 mb-1"><Gauge score={78} max={100} sz="lg" dark /></div>
                <div className="text-[.66rem] font-semibold px-[9px] py-[2px] rounded-full bg-[rgba(12,156,108,.22)] text-[#6ee7b7]">+10 in 18 months</div>
                <div className="text-[.58rem] text-white/30 text-center">{t.scMsg}</div>
              </div>
              <div className="grid grid-cols-2 border-t border-white/[.06]">
                <div className="px-3.5 py-[11px] flex flex-col gap-0.5 border-r border-white/[.06]">
                  <div className="text-[8px] font-semibold tracking-[.08em] uppercase text-white/28">Best Domain</div>
                  <div className="font-serif text-[1.3rem] leading-none text-[#0C9C6C]">88</div>
                  <div className="text-[8px] text-white/22">Heart & Vessels</div>
                </div>
                <div className="px-3.5 py-[11px] flex flex-col gap-0.5">
                  <div className="text-[8px] font-semibold tracking-[.08em] uppercase text-white/28">Focus Area</div>
                  <div className="font-serif text-[1.3rem] leading-none text-[#C4A96A]">58</div>
                  <div className="text-[8px] text-white/22">Nutrients</div>
                </div>
              </div>
              <div className="border-t border-white/[.06] px-4 py-3 bg-black/[.12]">
                <div className="text-[8px] font-semibold tracking-[.08em] uppercase text-white/22 mb-1.5">SCORE HISTORY — 3 TESTS</div>
                <div className="h-[80px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={scoreData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[55, 90]} tick={{ fontSize: 8, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} tickCount={4} />
                      <RTooltip
                        formatter={(v: unknown) => [v as number, 'Score']}
                        contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }}
                        itemStyle={{ color: '#0C9C6C' }} labelStyle={{ color: 'rgba(255,255,255,.5)' }}
                      />
                      <Line type="monotone" dataKey="score" stroke="rgba(255,255,255,.7)" strokeWidth={2} fill="rgba(255,255,255,.07)"
                        dot={false} activeDot={{ r: 5, fill: '#0C9C6C', stroke: '#0C9C6C' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bio-age card */}
            <div className="bg-[#0e393d] rounded-2xl overflow-hidden flex flex-col">
              <div className="grid grid-cols-3">
                {[
                  { lbl: 'PHENOAGE · LEVINE 2018', chron: '40.1 chronological', big: true, val: '33.9', diff: '↓ 6.2 years younger', sub: 'Calculated from 9 standard blood markers. Each year above chronological age ≈ +6% mortality risk.' },
                  { lbl: 'GRIMAGE V2 · METHYLATION', chron: '40.1 chronological', big: false, val: '36.8', diff: '↓ 3.3 years younger', sub: 'Gold-standard DNA methylation clock. Most accurate predictor of healthspan and lifespan. Requires specialist lab.' },
                  { lbl: 'DUNEDINPACE · AGING RATE', chron: 'rate × age = projected age', big: false, val: '32.5 yr', diff: '↓ 7.6 years younger (rate)', sub: 'Speed of aging: 0.81 yr/yr · population avg 1.0 · You age 9.7 months per calendar year.' },
                ].map((item, i) => (
                  <div key={i} className={`p-4 flex flex-col gap-[3px] ${i < 2 ? 'border-r border-white/[.06]' : ''}`}>
                    <div className="text-[8px] font-semibold tracking-[.1em] uppercase text-white/28 mb-1">{item.lbl}</div>
                    <div className="text-[.58rem] text-white/18 line-through">{item.chron}</div>
                    <div className={`font-serif text-[#0C9C6C] leading-[1.05] ${item.big ? 'text-[2.1rem]' : 'text-[1.6rem]'}`}>{item.val}</div>
                    <div className="text-[.6rem] font-semibold text-[#0C9C6C]">{item.diff}</div>
                    <div className="text-[.55rem] text-white/22 leading-[1.45] mt-[3px]">{item.sub}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[.06] px-4 pt-3.5 pb-4 bg-black/[.1] flex-1 flex flex-col min-h-[160px]">
                <div className="text-[8px] font-semibold tracking-[.08em] uppercase text-white/22 mb-2 shrink-0">
                  ALL BIOLOGICAL CLOCKS VS CHRONOLOGICAL AGE — YEARS
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bioData} margin={{ top: 4, right: 40, bottom: 0, left: -16 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[26, 42]} tick={{ fontSize: 8, fill: 'rgba(255,255,255,.4)' }} axisLine={false} tickLine={false} tickCount={5} />
                      <RTooltip
                        contentStyle={{ fontSize: 11, background: '#0e393d', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8 }}
                        labelStyle={{ color: 'rgba(255,255,255,.5)' }}
                        itemStyle={{ fontSize: 10 }}
                      />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 8, color: 'rgba(255,255,255,.5)', paddingTop: 6 }} />
                      <Line name="PhenoAge" type="monotone" dataKey="pheno" stroke="#0C9C6C" strokeWidth={2} dot={{ r: 3, fill: '#0C9C6C' }} activeDot={{ r: 5 }} />
                      <Line name="GrimAge v2" type="monotone" dataKey="grim" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} activeDot={{ r: 5 }} connectNulls={false} />
                      <Line name="DunedinPACE×age" type="monotone" dataKey="pace" stroke="#ceab84" strokeWidth={2} dot={{ r: 3, fill: '#ceab84' }} activeDot={{ r: 5 }} />
                      <Line name="Chronological" type="monotone" dataKey="chron" stroke="rgba(255,255,255,.2)" strokeWidth={1} strokeDasharray="5 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Alert strip */}
          <div className="flex flex-col gap-2 mt-3.5">
            <div className="flex gap-3 items-start px-4 py-[13px] rounded-xl bg-[#fffbf0] border border-l-4 border-[rgba(212,131,10,.18)] border-l-[#b45309]">
              <span className="text-[16px] shrink-0 leading-[1.4]">⚠️</span>
              <div>
                <div className="text-[.72rem] font-semibold mb-0.5">{t.alertWarnHead}</div>
                <div className="text-[.64rem] text-[#1c2a2b]/55 leading-[1.55]">{t.alertWarnBody}</div>
                <div className="flex flex-wrap gap-[5px] mt-1.5">
                  <span className="text-[9px] font-semibold px-2 py-[2px] rounded-full bg-[rgba(180,83,9,.08)] text-[#b45309]">Pulse Pressure: 42 mmHg</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 items-start px-4 py-[13px] rounded-xl bg-[#f0fdf9] border border-l-4 border-[rgba(12,156,108,.15)] border-l-[#0C9C6C]">
              <span className="text-[16px] shrink-0 leading-[1.4]">✅</span>
              <div>
                <div className="text-[.72rem] font-semibold mb-0.5">{t.alertOkHead}</div>
                <div className="text-[.64rem] text-[#1c2a2b]/55 leading-[1.55]">{t.alertOkBody}</div>
                <div className="flex flex-wrap gap-[5px] mt-1.5">
                  {['↑ HOMA-IR', '↑ Omega-3 Index', '↑ Non-HDL Cholesterol', '↑ hsCRP'].map(pill => (
                    <span key={pill} className="text-[9px] font-semibold px-2 py-[2px] rounded-full bg-[rgba(12,156,108,.09)] text-[#0C9C6C]">{pill}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Insight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
            {[
              {
                color: '#0C9C6C', title: t.insStrT,
                body: <><strong style={{ color: '#0C9C6C' }}>Cardiovascular health (88/100)</strong> — LDL at 82 mg/dL, ApoB at 0.72 g/L. Both in optimal longevity ranges.</>,
                tags: [{ c: 'g', l: '↑ LDL improved 24%' }, { c: 'g', l: '↑ ApoB improved 22%' }],
              },
              {
                color: '#b45309', title: t.insPriT,
                body: <><strong style={{ color: '#b45309' }}>Vitamin D at 24 ng/mL</strong> — well below optimal 40–60. Dragging Nutrients to 58/100. Supplement 4,000 IU daily.</>,
                tags: [{ c: 'a', l: '↓ Vit D −16%' }, { c: 'n', l: '→ hsCRP stable' }],
              },
              {
                color: '#0e393d', title: t.insProgT,
                body: <>Score: <strong style={{ color: '#0C9C6C' }}>68 → 78 (+10)</strong>. Wins: glucose ↓14%, Omega-3 ↑62%, LDL ↓24%. Declining: Vitamin D ↓15%.</>,
                tags: [{ c: 'g', l: '↑ PhenoAge −2.9yr' }, { c: 'g', l: '↑ VO₂max +19%' }],
              },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-[#1c2a2b]/10 rounded-xl p-4">
                <div className="w-[3px] h-[18px] rounded-full mb-[9px]" style={{ background: card.color }} />
                <div className="text-[.72rem] font-semibold mb-1">{card.title}</div>
                <div className="text-[.64rem] text-[#1c2a2b]/55 leading-[1.58]">{card.body}</div>
                <div className="flex flex-wrap gap-1 mt-[7px]">
                  {card.tags.map((tag, ti) => (
                    <span key={ti} className={`text-[9px] font-semibold px-[7px] py-[2px] rounded-[4px] ${tag.c === 'g' ? 'bg-[rgba(12,156,108,.09)] text-[#0C9C6C]' : tag.c === 'a' ? 'bg-[rgba(180,83,9,.08)] text-[#b45309]' : 'bg-[rgba(14,57,61,.06)] text-[#1c2a2b]/55'}`}>{tag.l}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── KEY MARKERS ── */}
        <section className="pt-8">
          <SectionHeader label={t.secKm} right="Your most impactful biomarkers — click to expand" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {FEATURED.map(({ di, mi, why }, fi) => {
              const domain = D[di];
              const m = domain.m[mi];
              const v = m.v[2];
              const s = mStatus(v, m.r, m.o, m.dir);
              const cl = mColor(s);
              const prev = m.v[1];
              const delta = +(v - prev).toFixed(2);
              const improving = (m.dir === 'lower' && delta <= 0) || (m.dir === 'higher' && delta >= 0) || m.dir === 'range';
              const dCol = improving ? '#0C9C6C' : '#b45309';
              const isOpen = openKeyMarkers.has(fi);
              const topBorder = s === 'opt' ? '#0C9C6C' : s === 'norm' ? '#c4a96a' : '#b45309';
              return (
                <div key={fi} className="bg-white border border-[#1c2a2b]/10 rounded-2xl px-4 py-4 relative overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-px"
                  style={{ borderTop: `3px solid ${topBorder}` }}
                  onClick={() => toggleKeyMarker(fi)}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[.6rem] text-[#1c2a2b]/55 font-medium">{domain.nm[activeLang]}</span>
                    <StatusBadge s={s} t={t} />
                  </div>
                  <div className="text-[.72rem] font-semibold text-[#0e393d] mb-2.5">{m.n}</div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="font-serif text-[2rem] text-[#1c2a2b] leading-none">{v}</span>
                    <span className="text-[.62rem] text-[#1c2a2b]/55">{m.u}</span>
                  </div>
                  <div className="mb-1.5"><RangeBar v={v} r={m.r} o={m.o} dir={m.dir} /></div>
                  <div className="text-[.62rem] mb-[5px]" style={{ color: dCol }}>
                    vs previous test: {delta >= 0 ? '+' : ''}{delta} {m.u}
                  </div>
                  <div className="text-[.59rem] text-[#1c2a2b]/55 leading-[1.5] pt-[7px] border-t border-[#0e393d]/[.06]">{why}</div>
                  {isOpen && (
                    <div className="border-t border-[#0e393d]/[.06] mt-2.5 pt-3">
                      <div className="h-[120px]"><MarkerHistoryChart m={m} height={120} /></div>
                      <div className="text-[.63rem] text-[#1c2a2b]/55 leading-[1.65] p-[9px] bg-[rgba(14,57,61,.03)] rounded-lg mt-2.5 mb-2">
                        {m.desc}
                      </div>
                      <div className="flex gap-3.5 text-[.62rem] text-[#1c2a2b]/55 flex-wrap">
                        <div>
                          <span className="block text-[8px] font-semibold uppercase tracking-[.07em] mb-0.5 text-[#1c2a2b]/55">{t.refRange}</span>
                          {m.r[0]} – {m.r[1]} {m.u}
                        </div>
                        <div>
                          <span className="block text-[8px] font-semibold uppercase tracking-[.07em] mb-0.5 text-[#0C9C6C]">{t.longevityOpt}</span>
                          {m.o[0]} – {m.o[1]} {m.u}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-[.58rem] text-[#0e393d] text-right mt-[5px] opacity-60">
                    {isOpen ? t.kmCollapse : t.kmExpand}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 8 HEALTH DOMAINS ── */}
        <section className="pt-8">
          <SectionHeader label={t.secDom} right="Click any domain to explore all markers" />

          {/* Radar + Flag */}
          <div className="grid md:grid-cols-[1fr_240px] gap-3.5 mb-3">
            {/* Radar */}
            <div className="bg-white border border-[#1c2a2b]/10 rounded-2xl p-4">
              <div className="text-[.66rem] font-semibold text-[#1c2a2b]/55 uppercase tracking-[.06em] mb-2.5">{t.domBalance}</div>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="rgba(14,57,61,.07)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#5a6e6f' }} />
                    <Radar name="Current" dataKey="current" fill="rgba(14,57,61,.09)" stroke="rgba(14,57,61,.65)" strokeWidth={2} />
                    <Radar name="First test" dataKey="first" fill="none" stroke="rgba(206,171,132,.45)" strokeWidth={1.5} strokeDasharray="4 3" />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 9 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Flag card */}
            <div className="bg-white border border-[#1c2a2b]/10 rounded-2xl p-4">
              <div className="text-[.66rem] font-semibold text-[#1c2a2b]/55 uppercase tracking-[.06em] mb-3">{t.markerStatus}</div>
              {([
                { k: 'opt' as MStatus, c: '#0C9C6C', l: t.optLabel },
                { k: 'norm' as MStatus, c: '#C4A96A', l: t.normLabel },
                { k: 'warn' as MStatus, c: '#b45309', l: t.warnLabel },
              ]).map(row => (
                <div key={row.k} className="flex items-center gap-2 mb-[9px]">
                  <div className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: row.c }} />
                  <div className="flex-1 h-[5px] rounded-full bg-[#ede9e3] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(flagCounts[row.k] / flagTotal * 100)}%`, background: row.c }} />
                  </div>
                  <div className="text-[.7rem] font-semibold text-[#1c2a2b] w-6 text-right">{flagCounts[row.k]}</div>
                  <div className="text-[.59rem] text-[#1c2a2b]/55 w-[68px]">{row.l}</div>
                </div>
              ))}
              <div className="mt-2.5 pt-2.5 border-t border-[#0e393d]/[.06] text-[.59rem] text-[#1c2a2b]/55 leading-[1.55]">
                <strong className="text-[#1c2a2b]">{flagTotal} markers measured.</strong>{' '}
                <strong className="text-[#0C9C6C]">{flagCounts.opt} optimal</strong> — strong foundation. Focus: Nutrients &amp; Inflammation.
              </div>
            </div>
          </div>

          {/* Domain tile grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {D.map((d, di) => {
              const s = d.sc[2], prev = d.sc[1], td = s - prev;
              const cl = scoreColor(s / 100);
              const st: MStatus = s >= 85 ? 'opt' : s >= 70 ? 'norm' : 'warn';
              const isActive = openDomains.has(di);
              return (
                <div key={di}
                  className={`bg-white border rounded-[10px] p-3 cursor-pointer transition-all relative hover:-translate-y-px ${isActive ? 'border-[#0e393d] shadow-[0_0_0_2px_rgba(14,57,61,.06)]' : 'border-[#1c2a2b]/10 hover:border-[#1c2a2b]/15 hover:shadow-md'}`}
                  onClick={() => toggleDomain(di)}>
                  <div className="flex justify-between items-start mb-[7px]">
                    <span className="text-[14px]">{d.ic}</span>
                    <StatusBadge s={st} t={t} />
                  </div>
                  <div className="text-[.68rem] font-semibold text-[#0e393d] mb-0.5">{d.nm[activeLang]}</div>
                  <div className="text-[.56rem] text-[#1c2a2b]/55">{d.m.length} {t.markersLabel} · {d.w}</div>
                  <div className="flex items-baseline gap-[3px] my-[5px]">
                    <span className="font-serif text-[1.65rem] leading-none" style={{ color: cl }}>{s}</span>
                    <span className="text-[.56rem] text-[#1c2a2b]/55">/100</span>
                    <span className="text-[.56rem] font-semibold ml-[3px]" style={{ color: td > 0 ? '#0C9C6C' : '#c0392b' }}>
                      {td > 0 ? '↑+' : '↓'}{Math.abs(td)}
                    </span>
                  </div>
                  <div className="h-[3px] bg-[#ede9e3] rounded-full overflow-hidden mb-[5px]">
                    <div className="h-full rounded-full" style={{ width: `${s}%`, background: cl }} />
                  </div>
                  <div className="h-6"><Sparkline vals={[...d.sc]} color={cl} /></div>
                  <span className={`text-[8px] text-[#1c2a2b]/55 absolute bottom-[9px] right-2.5 transition-transform ${isActive ? 'rotate-180' : ''}`}>▼</span>
                </div>
              );
            })}
          </div>

          {/* Domain expanded panel */}
          {D.map((d, di) => {
            if (!openDomains.has(di)) return null;
            const s = d.sc[2];
            return (
              <div key={di} className="mt-2 rounded-xl border border-[#0e393d] overflow-hidden">
                <div className="bg-[#0e393d] px-4 py-3 flex items-center justify-between">
                  <div className="font-serif text-white flex items-center gap-2">
                    {d.ic} <span>{d.nm[activeLang]}</span>
                    <span className="text-[.65rem] text-white/35 font-sans">{s}/100</span>
                  </div>
                  <button onClick={() => toggleDomain(di)}
                    className="w-[26px] h-[26px] rounded-full border border-white/20 text-white/50 hover:bg-white/12 hover:text-white transition-all flex items-center justify-center text-[13px]">
                    ✕
                  </button>
                </div>
                <div className="p-4 bg-[#fafaf8]">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[.63rem] text-[#1c2a2b]/55 font-medium mb-2">{t.markerTrends}</div>
                      <div className="h-[260px]"><DomainNormChart domain={d} /></div>
                    </div>
                    <div>
                      <div className="text-[.63rem] text-[#1c2a2b]/55 font-medium mb-2">{d.m.length} {t.markersClick}</div>
                      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[300px] pr-1">
                        {d.m.map((m, mi) => {
                          const v = m.v[2];
                          const s2 = mStatus(v, m.r, m.o, m.dir);
                          const cl2 = mColor(s2);
                          const pKey = `dp${di}-${mi}`;
                          const isOpen = !!openBmMarkers.get(pKey);
                          return (
                            <div key={mi}
                              className={`bg-white rounded-[10px] border px-3 py-2.5 cursor-pointer transition-all ${isOpen ? 'border-[#0e393d] shadow-[0_0_0_2px_rgba(14,57,61,.03)]' : 'border-[#1c2a2b]/10 hover:border-[#1c2a2b]/20'}`}
                              onClick={() => toggleBmMarker(pKey)}>
                              <div className="flex items-center justify-between mb-[5px]">
                                <div className="text-[.67rem] font-semibold text-[#0e393d]">{m.n}</div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[.7rem] font-bold" style={{ color: cl2 }}>{v}</span>
                                  <span className="text-[.53rem] text-[#1c2a2b]/55">{m.u}</span>
                                  <StatusBadge s={s2} t={t} />
                                </div>
                              </div>
                              <RangeBar v={v} r={m.r} o={m.o} dir={m.dir} />
                              <div className="flex justify-between text-[.49rem] text-[#1c2a2b]/55 mt-0.5">
                                <span>{m.r[0]} {m.u}</span>
                                <span style={{ color: '#0C9C6C', fontSize: '.48rem' }}>● opt: {m.o[0]}–{m.o[1]}</span>
                                <span>{m.r[1]} {m.u}</span>
                              </div>
                              {isOpen && (
                                <div className="border-t border-[#0e393d]/[.06] mt-2 pt-2.5">
                                  <div className="h-[100px]"><MarkerHistoryChart m={m} height={100} /></div>
                                  <div className="text-[.61rem] text-[#1c2a2b]/55 leading-[1.65] p-2 bg-[rgba(14,57,61,.02)] rounded-lg mt-2">
                                    {m.desc}
                                  </div>
                                  <div className="flex gap-3.5 mt-1.5 text-[.61rem] text-[#1c2a2b]/55 flex-wrap">
                                    <div><span className="block text-[.49rem] font-semibold uppercase tracking-[.07em] mb-0.5 text-[#1c2a2b]/55">{t.refRange}</span>{m.r[0]} – {m.r[1]} {m.u}</div>
                                    <div><span className="block text-[.49rem] font-semibold uppercase tracking-[.07em] mb-0.5 text-[#0C9C6C]">{t.longevityOpt}</span>{m.o[0]} – {m.o[1]} {m.u}</div>
                                    <div>
                                      <span className="block text-[.49rem] font-semibold uppercase tracking-[.07em] mb-0.5 text-[#1c2a2b]/55">{t.changeLabel}</span>
                                      <span style={{ color: ((m.dir === 'lower' && m.v[2] < m.v[0]) || (m.dir === 'higher' && m.v[2] > m.v[0])) ? '#0C9C6C' : '#b45309' }}>
                                        {((m.v[2] - m.v[0]) >= 0 ? '+' : '')}{(m.v[2] - m.v[0]).toFixed(2)} {m.u}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── BIOMARKER ACCORDION ── */}
        <section className="pt-8 pb-12">
          <SectionHeader label={t.secBm} right="Click a domain · Click a marker for history & explanation" />
          <div className="flex flex-col gap-1.5">
            {D.map((d, di) => {
              const s = d.sc[2];
              const cl = scoreColor(s / 100);
              const isOpen = openAccordionDomains.has(di);
              return (
                <div key={di} className="bg-white border border-[#1c2a2b]/10 rounded-[10px] overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors select-none ${isOpen ? '' : 'hover:bg-[rgba(14,57,61,.015)]'}`}
                    onClick={() => toggleAccDomain(di)}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[14px]">{d.ic}</span>
                      <div>
                        <div className="text-[.72rem] font-semibold text-[#0e393d]">{d.nm[activeLang]}</div>
                        <div className="text-[.59rem] text-[#1c2a2b]/55">{d.m.length} {t.markersLabel} · {d.w} {t.weightLabel}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-[.95rem]" style={{ color: cl }}>{s}/100</span>
                      <span className={`text-[9px] text-[#1c2a2b]/55 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[#0e393d]/[.06]">
                      <div className="grid md:grid-cols-2">
                        {d.m.map((m, mi) => {
                          const v = m.v[2];
                          const s2 = mStatus(v, m.r, m.o, m.dir);
                          const cl2 = mColor(s2);
                          const aKey = `ac${di}-${mi}`;
                          const mOpen = !!openBmMarkers.get(aKey);
                          const isLast = mi === d.m.length - 1;
                          const isSecondLast = mi === d.m.length - 2;
                          return (
                            <div key={mi}
                              className={`px-3.5 py-2.5 cursor-pointer transition-colors hover:bg-[rgba(14,57,61,.015)] ${!isLast && !(isSecondLast && d.m.length % 2 === 0) ? 'border-b border-[#0e393d]/[.06]' : ''} ${mi % 2 === 0 && mi < d.m.length - 1 ? 'md:border-r md:border-[#0e393d]/[.06]' : ''}`}
                              onClick={() => toggleBmMarker(aKey)}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-[.67rem] font-semibold text-[#0e393d]">{m.n}</div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[.7rem] font-bold" style={{ color: cl2 }}>{v}</span>
                                  <span className="text-[.53rem] text-[#1c2a2b]/55">{m.u}</span>
                                  <StatusBadge s={s2} t={t} />
                                </div>
                              </div>
                              <RangeBar v={v} r={m.r} o={m.o} dir={m.dir} />
                              {mOpen && (
                                <div className="border-t border-[#0e393d]/[.06] mt-2 pt-2.5">
                                  <div className="h-[90px]"><MarkerHistoryChart m={m} height={90} /></div>
                                  <div className="text-[.61rem] text-[#1c2a2b]/55 leading-[1.6] p-2 bg-[rgba(14,57,61,.02)] rounded-lg mt-2">
                                    {m.desc}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
