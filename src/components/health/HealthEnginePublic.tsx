'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';

type Lang = 'en' | 'de' | 'fr' | 'es' | 'it';

// ── Sample data ──────────────────────────────────────────────────────────────
const DATES = ['Sep 2024', 'Jun 2025', 'Mar 2026'];
const OV = [68, 74, 78];
const BIO_AGES = [31.2, 29.8, 28.3];
const PACE = [0.91, 0.87, 0.84];

type Marker = {
  n: string; u: string;
  v: [number, number, number];
  r: [number, number]; o: [number, number];
  nt?: string;
};
type Domain = {
  ic: string; nm: Record<Lang, string>;
  sc: [number, number, number]; w: string;
  m: Marker[];
};

const D: Domain[] = [
  { ic: '❤️', nm: { en: 'Heart & Vessels', de: 'Herz & Gefäße', fr: 'Cœur & Vaisseaux', es: 'Corazón & Vasos', it: 'Cuore & Vasi' }, sc: [72, 82, 88], w: '20%', m: [
    { n: 'LDL Cholesterol', u: 'mg/dL', v: [108, 94, 82], r: [0, 130], o: [50, 100] },
    { n: 'ApoB', u: 'g/L', v: [0.92, 0.81, 0.72], r: [0.4, 1.3], o: [0.5, 0.9] },
    { n: 'HDL Cholesterol', u: 'mg/dL', v: [48, 55, 62], r: [40, 100], o: [50, 90] },
    { n: 'Triglycerides', u: 'mg/dL', v: [118, 95, 78], r: [0, 150], o: [0, 100] },
    { n: 'Lp(a)', u: 'nmol/L', v: [32, 32, 32], r: [0, 75], o: [0, 50], nt: 'Genetic — stable' },
    { n: 'Homocysteine', u: 'µmol/L', v: [12.1, 10.4, 9.2], r: [5, 15], o: [5, 10] },
  ]},
  { ic: '⚡', nm: { en: 'Metabolism', de: 'Stoffwechsel', fr: 'Métabolisme', es: 'Metabolismo', it: 'Metabolismo' }, sc: [65, 76, 82], w: '18%', m: [
    { n: 'Fasting Glucose', u: 'mg/dL', v: [102, 94, 88], r: [70, 100], o: [72, 90] },
    { n: 'HbA1c', u: '%', v: [5.6, 5.3, 5.1], r: [4, 5.7], o: [4.5, 5.3] },
    { n: 'Fasting Insulin', u: 'mIU/L', v: [9.2, 7.1, 5.8], r: [2.6, 24.9], o: [2.5, 8] },
    { n: 'HOMA-IR', u: '', v: [2.31, 1.64, 1.26], r: [0, 2.5], o: [0, 1.5], nt: 'Calculated' },
    { n: 'Uric Acid', u: 'mg/dL', v: [6.4, 6.0, 5.8], r: [3.5, 7.2], o: [3.5, 5.5] },
  ]},
  { ic: '🛡️', nm: { en: 'Inflammation', de: 'Entzündung', fr: 'Inflammation', es: 'Inflamación', it: 'Infiammazione' }, sc: [52, 58, 61], w: '15%', m: [
    { n: 'hsCRP', u: 'mg/L', v: [2.8, 2.2, 1.8], r: [0, 3], o: [0, 1] },
    { n: 'Fibrinogen', u: 'mg/dL', v: [320, 295, 285], r: [200, 400], o: [200, 300] },
    { n: 'WBC', u: '×10³/µL', v: [7.1, 6.8, 6.2], r: [4, 10], o: [4, 6.5] },
    { n: 'ESR', u: 'mm/hr', v: [15, 14, 12], r: [0, 20], o: [0, 10] },
    { n: 'IL-6', u: 'pg/mL', v: [3.2, 2.6, 2.1], r: [0, 7], o: [0, 1.8] },
  ]},
  { ic: '🫁', nm: { en: 'Organ Function', de: 'Organfunktion', fr: 'Fonction des organes', es: 'Función orgánica', it: 'Funzione degli organi' }, sc: [80, 83, 85], w: '15%', m: [
    { n: 'GGT', u: 'U/L', v: [32, 26, 22], r: [0, 65], o: [0, 30] },
    { n: 'ALT (GPT)', u: 'U/L', v: [28, 26, 24], r: [0, 50], o: [0, 30] },
    { n: 'AST (GOT)', u: 'U/L', v: [24, 22, 21], r: [0, 50], o: [0, 30] },
    { n: 'Creatinine', u: 'mg/dL', v: [0.98, 0.96, 0.95], r: [0.7, 1.2], o: [0.7, 1.1] },
    { n: 'eGFR', u: 'mL/min', v: [95, 97, 98], r: [60, 120], o: [90, 120], nt: 'Calculated' },
    { n: 'TSH', u: 'mIU/L', v: [2.8, 2.4, 2.1], r: [0.4, 4], o: [0.5, 2.5] },
    { n: 'Free T4', u: 'ng/dL', v: [1.12, 1.15, 1.18], r: [0.8, 1.8], o: [1, 1.5] },
  ]},
  { ic: '🥗', nm: { en: 'Nutrients', de: 'Nährstoffe', fr: 'Nutriments', es: 'Nutrientes', it: 'Nutrienti' }, sc: [42, 50, 58], w: '12%', m: [
    { n: 'Vitamin D', u: 'ng/mL', v: [18, 28, 24], r: [20, 100], o: [40, 60] },
    { n: 'Vitamin B12', u: 'pg/mL', v: [310, 420, 485], r: [200, 900], o: [400, 800] },
    { n: 'Folate', u: 'ng/mL', v: [8.5, 12.1, 14.2], r: [3, 20], o: [10, 20] },
    { n: 'Iron (Serum)', u: 'µg/dL', v: [82, 90, 95], r: [60, 170], o: [70, 150] },
    { n: 'Ferritin', u: 'ng/mL', v: [62, 54, 48], r: [20, 200], o: [40, 100] },
    { n: 'Zinc', u: 'µg/dL', v: [65, 68, 72], r: [60, 120], o: [80, 110] },
    { n: 'Selenium', u: 'µg/L', v: [78, 84, 88], r: [70, 150], o: [100, 130] },
    { n: 'Magnesium', u: 'mg/dL', v: [1.85, 1.92, 2.0], r: [1.7, 2.2], o: [1.9, 2.2] },
    { n: 'Omega-3 Index', u: '%', v: [4.2, 5.4, 6.8], r: [4, 12], o: [8, 12] },
  ]},
  { ic: '🧬', nm: { en: 'Hormones', de: 'Hormone', fr: 'Hormones', es: 'Hormonas', it: 'Ormoni' }, sc: [70, 75, 79], w: '10%', m: [
    { n: 'Testosterone', u: 'ng/dL', v: [480, 540, 580], r: [270, 1070], o: [500, 900] },
    { n: 'Free Testosterone', u: 'pg/mL', v: [9.8, 11.2, 12.5], r: [5, 25], o: [10, 22] },
    { n: 'Cortisol (AM)', u: 'µg/dL', v: [18.5, 16.2, 14.2], r: [6, 23], o: [8, 15] },
    { n: 'DHEA-S', u: 'µg/dL', v: [280, 295, 310], r: [80, 560], o: [200, 450] },
  ]},
  { ic: '🏋️', nm: { en: 'Body Composition', de: 'Körperzusammensetzung', fr: 'Composition corporelle', es: 'Composición corporal', it: 'Composizione corporea' }, sc: [62, 70, 74], w: '5%', m: [
    { n: 'BMI', u: 'kg/m²', v: [26.8, 25.4, 24.6], r: [18.5, 30], o: [20, 25] },
    { n: 'Body Fat', u: '%', v: [24.5, 21.8, 19.6], r: [8, 30], o: [12, 20], nt: 'DEXA scan' },
    { n: 'Visceral Fat', u: 'cm²', v: [112, 95, 82], r: [10, 150], o: [10, 100] },
    { n: 'Lean Mass', u: 'kg', v: [58.2, 60.5, 62.1], r: [45, 85], o: [55, 75] },
    { n: 'Bone Density', u: 'T-score', v: [-0.4, -0.2, 0.1], r: [-2.5, 2], o: [-1, 2], nt: 'DEXA scan' },
  ]},
  { ic: '🏃', nm: { en: 'Fitness & Recovery', de: 'Fitness & Erholung', fr: 'Forme & Récupération', es: 'Fitness & Recuperación', it: 'Fitness & Recupero' }, sc: [55, 65, 72], w: '5%', m: [
    { n: 'VO₂max', u: 'mL/kg/min', v: [38.5, 42.1, 45.8], r: [20, 60], o: [40, 55], nt: 'VO₂max test' },
    { n: 'Resting Heart Rate', u: 'bpm', v: [68, 62, 58], r: [40, 100], o: [45, 60] },
    { n: 'HRV (RMSSD)', u: 'ms', v: [32, 41, 48], r: [15, 100], o: [40, 80] },
    { n: 'Lactate Threshold', u: 'bpm', v: [155, 160, 164], r: [130, 190], o: [155, 175], nt: 'VO₂max test' },
    { n: 'Recovery Score', u: '/100', v: [62, 71, 78], r: [0, 100], o: [70, 100], nt: 'Composite' },
  ]},
];

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<Lang, {
  tag: string; title: string; sub: string;
  heroDate: string; heroTests: string; heroKit: string; sample: string;
  secScore: string; chartTitle: string;
  gaugeTitle: string; gaugeMsg: string;
  tipLabel: string; tipText: string; goalLabel: string; goalText: string;
  strengthTitle: string; strengthText: string;
  priorityTitle: string; priorityText: string;
  progressTitle: string; progressText: string;
  secBioAge: string;
  bioAgeLabel: string; bioAgeDiff: string;
  paceLabel: string; paceDesc: string;
  bioAgeChartT: string; paceChartT: string;
  secDomains: string; domainsDesc: string;
  markers: string; weightLabel: string;
  secDetails: string; detailsDesc: string;
  statusOptimal: string; statusAttention: string; statusCritical: string;
  historyLabel: string; optimalLabel: string; standardLabel: string;
  secWhy: string;
  why1T: string; why1P: string; why2T: string; why2P: string; why3T: string; why3P: string;
  ctaTitle: string; ctaSub: string; ctaOrder: string; ctaLearn: string;
  disclaimer: string;
}> = {
  en: {
    tag: 'HEALTH ENGINE', title: 'Your Longevity Score.', sub: '46 biomarkers across 8 health domains. Track your score over time, see what improves, and know exactly what to focus on.',
    heroDate: 'Last tested: Mar 15, 2026', heroTests: '3 tests completed', heroKit: 'Evida Complete (46 markers)', sample: 'PREVIEW — Sample Data',
    secScore: 'Longevity Score', chartTitle: 'Score History — 3 Tests over 18 Months',
    gaugeTitle: 'LONGEVITY SCORE', gaugeMsg: 'Good — above average for your age',
    tipLabel: 'Tip', tipText: 'Test every 3–6 months to track your interventions. Most biomarker improvements show within 90 days of consistent changes.',
    goalLabel: 'Goal', goalText: 'Reach 85+ for green status. Focus on your weakest domains — Nutrients (58) and Inflammation (61) have the most room to grow.',
    strengthTitle: 'Top Strength', strengthText: 'Your cardiovascular health (88/100) is excellent. LDL at 82 mg/dL and ApoB at 0.72 g/L — both in optimal longevity ranges.',
    priorityTitle: 'Priority Action', priorityText: 'Vitamin D at 24 ng/mL — well below optimal 40–60. Dragging Nutrients to 58/100. Supplement 4,000 IU daily and retest in 3 months.',
    progressTitle: '18-Month Progress', progressText: 'Score: 68 → 78 (+10). Wins: glucose ↓14%, Omega-3 ↑32%, LDL ↓18%. Declining: Vitamin D ↓15%, Ferritin ↓8%.',
    secBioAge: 'Biological Age',
    bioAgeLabel: 'Biological Age (GrimAge v2)', bioAgeDiff: '6.7 years younger',
    paceLabel: 'Pace of Aging (DunedinPACE)', paceDesc: 'You age 10 months per calendar year. Top 15% for your age.',
    bioAgeChartT: 'Bio Age — 3 Tests', paceChartT: 'Pace of Aging — 3 Tests',
    secDomains: '8 Health Domains', domainsDesc: 'Each domain scored 0–100. Green ≥ 85, Gold 70–84, Red < 70. Weighted by longevity impact.',
    markers: 'markers', weightLabel: 'Weight',
    secDetails: 'Biomarker Details', detailsDesc: 'Click a domain to expand. Click a biomarker for historical values and trend.',
    statusOptimal: 'Optimal', statusAttention: 'Attention', statusCritical: 'Critical',
    historyLabel: '▾ history', optimalLabel: 'Optimal', standardLabel: 'Standard',
    secWhy: 'Why This Matters',
    why1T: 'Standard labs miss 80%', why1P: 'Your doctor checks if you\'re sick. Our longevity-optimized ranges are 40–60% tighter — tuned for where you should be, not where you won\'t die.',
    why2T: '8 domains, one score', why2P: 'We score Heart, Metabolism, Inflammation, Organs, Nutrients, Hormones, Body Composition, and Fitness separately — weighted by longevity impact.',
    why3T: 'Track changes over time', why3P: 'A single test is a photo. Longitudinal tracking reveals the movie. Test every 3–6 months and watch your biomarkers respond to diet changes.',
    ctaTitle: 'Get your first blood test.', ctaSub: '46 biomarkers · 8 health domains · Longevity Score in 48 hours', ctaOrder: 'Order test kit', ctaLearn: 'Learn about biomarkers',
    disclaimer: 'Preview with sample data. Not a medical diagnostic tool. Always consult your healthcare provider. Longevity ranges based on peer-reviewed research.',
  },
  de: {
    tag: 'HEALTH ENGINE', title: 'Dein Longevity Score.', sub: '46 Biomarker in 8 Gesundheitsbereichen. Verfolge deinen Score über die Zeit, sieh was sich verbessert und wisse genau, worauf du dich konzentrieren sollst.',
    heroDate: 'Zuletzt getestet: 15. März 2026', heroTests: '3 Tests abgeschlossen', heroKit: 'Evida Complete (46 Marker)', sample: 'VORSCHAU — Beispieldaten',
    secScore: 'Longevity Score', chartTitle: 'Score-Verlauf — 3 Tests über 18 Monate',
    gaugeTitle: 'LONGEVITY SCORE', gaugeMsg: 'Gut — über dem Durchschnitt für dein Alter',
    tipLabel: 'Tipp', tipText: 'Teste alle 3–6 Monate, um deine Interventionen zu verfolgen. Die meisten Biomarker-Verbesserungen zeigen sich innerhalb von 90 Tagen.',
    goalLabel: 'Ziel', goalText: 'Erreiche 85+ für den grünen Status. Fokussiere auf deine schwächsten Bereiche — Nährstoffe (58) und Entzündung (61) haben das größte Verbesserungspotenzial.',
    strengthTitle: 'Top-Stärke', strengthText: 'Deine kardiovaskuläre Gesundheit (88/100) ist ausgezeichnet. LDL bei 82 mg/dL und ApoB bei 0,72 g/L — beide im optimalen Longevity-Bereich.',
    priorityTitle: 'Priorität', priorityText: 'Vitamin D bei 24 ng/mL — weit unter dem Optimum von 40–60. Zieht Nährstoffe auf 58/100. Supplementiere 4.000 IE täglich und reteste in 3 Monaten.',
    progressTitle: '18-Monats-Fortschritt', progressText: 'Score: 68 → 78 (+10). Erfolge: Glukose ↓14%, Omega-3 ↑32%, LDL ↓18%. Rückgang: Vitamin D ↓15%, Ferritin ↓8%.',
    secBioAge: 'Biologisches Alter',
    bioAgeLabel: 'Biologisches Alter (GrimAge v2)', bioAgeDiff: '6,7 Jahre jünger',
    paceLabel: 'Alterungsgeschwindigkeit (DunedinPACE)', paceDesc: 'Du alterst 10 Monate pro Kalenderjahr. Top 15% für dein Alter.',
    bioAgeChartT: 'Bio-Alter — 3 Tests', paceChartT: 'Alterungstempo — 3 Tests',
    secDomains: '8 Gesundheitsbereiche', domainsDesc: 'Jeder Bereich 0–100 bewertet. Grün ≥ 85, Gold 70–84, Rot < 70. Nach Longevity-Einfluss gewichtet.',
    markers: 'Marker', weightLabel: 'Gewicht',
    secDetails: 'Biomarker-Details', detailsDesc: 'Bereich anklicken zum Ausklappen. Biomarker anklicken für Verlauf und Trend.',
    statusOptimal: 'Optimal', statusAttention: 'Aufmerksamkeit', statusCritical: 'Kritisch',
    historyLabel: '▾ Verlauf', optimalLabel: 'Optimal', standardLabel: 'Standard',
    secWhy: 'Warum das wichtig ist',
    why1T: 'Standard-Labor übersieht 80%', why1P: 'Dein Arzt prüft, ob du krank bist. Unsere Longevity-optimierten Werte sind 40–60% enger — auf das ausgerichtet, wo du sein solltest.',
    why2T: '8 Bereiche, ein Score', why2P: 'Wir bewerten Herz, Stoffwechsel, Entzündung, Organe, Nährstoffe, Hormone, Körperzusammensetzung und Fitness getrennt — nach Longevity-Einfluss gewichtet.',
    why3T: 'Veränderungen im Zeitverlauf', why3P: 'Ein einzelner Test ist ein Foto. Longitudinales Tracking enthüllt den Film. Teste alle 3–6 Monate und beobachte, wie deine Biomarker reagieren.',
    ctaTitle: 'Mach deinen ersten Bluttest.', ctaSub: '46 Biomarker · 8 Gesundheitsbereiche · Longevity Score in 48 Stunden', ctaOrder: 'Testkit bestellen', ctaLearn: 'Über Biomarker erfahren',
    disclaimer: 'Vorschau mit Beispieldaten. Kein medizinisches Diagnoseinstrument. Konsultiere immer deinen Arzt. Longevity-Werte basieren auf Peer-Review-Forschung.',
  },
  fr: {
    tag: 'HEALTH ENGINE', title: 'Votre score de longévité.', sub: '46 biomarqueurs dans 8 domaines de santé. Suivez votre score dans le temps, voyez ce qui s\'améliore et sachez exactement sur quoi vous concentrer.',
    heroDate: 'Dernier test : 15 mars 2026', heroTests: '3 tests complétés', heroKit: 'Evida Complete (46 marqueurs)', sample: 'APERÇU — Données d\'exemple',
    secScore: 'Score de longévité', chartTitle: 'Historique du score — 3 tests sur 18 mois',
    gaugeTitle: 'SCORE DE LONGÉVITÉ', gaugeMsg: 'Bien — au-dessus de la moyenne pour votre âge',
    tipLabel: 'Conseil', tipText: 'Testez tous les 3–6 mois pour suivre vos interventions. La plupart des améliorations de biomarqueurs apparaissent dans les 90 jours.',
    goalLabel: 'Objectif', goalText: 'Atteignez 85+ pour le statut vert. Concentrez-vous sur vos domaines les plus faibles — Nutriments (58) et Inflammation (61) ont le plus de marge.',
    strengthTitle: 'Point fort', strengthText: 'Votre santé cardiovasculaire (88/100) est excellente. LDL à 82 mg/dL et ApoB à 0,72 g/L — tous deux dans les plages optimales de longévité.',
    priorityTitle: 'Action prioritaire', priorityText: 'Vitamine D à 24 ng/mL — bien en dessous de l\'optimal 40–60. Freine les Nutriments à 58/100. Supplémentez 4 000 UI par jour et retestez dans 3 mois.',
    progressTitle: 'Progrès sur 18 mois', progressText: 'Score : 68 → 78 (+10). Gains : glucose ↓14%, Oméga-3 ↑32%, LDL ↓18%. Déclin : Vitamine D ↓15%, Ferritine ↓8%.',
    secBioAge: 'Âge biologique',
    bioAgeLabel: 'Âge biologique (GrimAge v2)', bioAgeDiff: '6,7 ans plus jeune',
    paceLabel: 'Rythme de vieillissement (DunedinPACE)', paceDesc: 'Vous vieillissez de 10 mois par année civile. Top 15% pour votre âge.',
    bioAgeChartT: 'Âge bio — 3 tests', paceChartT: 'Rythme de vieillissement — 3 tests',
    secDomains: '8 domaines de santé', domainsDesc: 'Chaque domaine noté 0–100. Vert ≥ 85, Or 70–84, Rouge < 70. Pondéré par impact sur la longévité.',
    markers: 'marqueurs', weightLabel: 'Poids',
    secDetails: 'Détails des biomarqueurs', detailsDesc: 'Cliquez sur un domaine pour développer. Cliquez sur un biomarqueur pour l\'historique.',
    statusOptimal: 'Optimal', statusAttention: 'Attention', statusCritical: 'Critique',
    historyLabel: '▾ historique', optimalLabel: 'Optimal', standardLabel: 'Standard',
    secWhy: 'Pourquoi c\'est important',
    why1T: 'Les laboratoires standard ratent 80%', why1P: 'Votre médecin vérifie si vous êtes malade. Nos plages optimisées pour la longévité sont 40–60% plus strictes.',
    why2T: '8 domaines, un score', why2P: 'Nous évaluons Cœur, Métabolisme, Inflammation, Organes, Nutriments, Hormones, Composition corporelle et Forme séparément.',
    why3T: 'Suivre les changements dans le temps', why3P: 'Un seul test est une photo. Le suivi longitudinal révèle le film. Testez tous les 3–6 mois.',
    ctaTitle: 'Faites votre première analyse.', ctaSub: '46 biomarqueurs · 8 domaines · Score de longévité en 48 heures', ctaOrder: 'Commander un kit de test', ctaLearn: 'En savoir plus sur les biomarqueurs',
    disclaimer: 'Aperçu avec données d\'exemple. Pas un outil de diagnostic médical. Consultez toujours votre médecin. Plages basées sur la recherche.',
  },
  es: {
    tag: 'HEALTH ENGINE', title: 'Tu puntuación de longevidad.', sub: '46 biomarcadores en 8 dominios de salud. Sigue tu puntuación a lo largo del tiempo, observa qué mejora y sabe exactamente en qué enfocarte.',
    heroDate: 'Último análisis: 15 mar 2026', heroTests: '3 pruebas completadas', heroKit: 'Evida Complete (46 marcadores)', sample: 'VISTA PREVIA — Datos de muestra',
    secScore: 'Puntuación de longevidad', chartTitle: 'Historial — 3 pruebas en 18 meses',
    gaugeTitle: 'PUNTUACIÓN DE LONGEVIDAD', gaugeMsg: 'Bien — por encima de la media para tu edad',
    tipLabel: 'Consejo', tipText: 'Analízate cada 3–6 meses para seguir tus intervenciones. La mayoría de las mejoras en biomarcadores aparecen en 90 días.',
    goalLabel: 'Objetivo', goalText: 'Alcanza 85+ para el estado verde. Enfócate en tus dominios más débiles — Nutrientes (58) e Inflamación (61) tienen más margen de mejora.',
    strengthTitle: 'Punto fuerte', strengthText: 'Tu salud cardiovascular (88/100) es excelente. LDL en 82 mg/dL y ApoB en 0,72 g/L — ambos en rangos óptimos de longevidad.',
    priorityTitle: 'Acción prioritaria', priorityText: 'Vitamina D en 24 ng/mL — muy por debajo del óptimo 40–60. Arrastra Nutrientes a 58/100. Suplementa 4.000 UI diarias y retesta en 3 meses.',
    progressTitle: 'Progreso en 18 meses', progressText: 'Puntuación: 68 → 78 (+10). Logros: glucosa ↓14%, Omega-3 ↑32%, LDL ↓18%. Declive: Vitamina D ↓15%, Ferritina ↓8%.',
    secBioAge: 'Edad biológica',
    bioAgeLabel: 'Edad biológica (GrimAge v2)', bioAgeDiff: '6,7 años más joven',
    paceLabel: 'Ritmo de envejecimiento (DunedinPACE)', paceDesc: 'Envejeces 10 meses por año calendario. Top 15% para tu edad.',
    bioAgeChartT: 'Edad bio — 3 pruebas', paceChartT: 'Ritmo de envejecimiento — 3 pruebas',
    secDomains: '8 dominios de salud', domainsDesc: 'Cada dominio puntuado 0–100. Verde ≥ 85, Oro 70–84, Rojo < 70. Ponderado por impacto en longevidad.',
    markers: 'marcadores', weightLabel: 'Peso',
    secDetails: 'Detalles de biomarcadores', detailsDesc: 'Haz clic en un dominio para expandir. Haz clic en un biomarcador para el historial.',
    statusOptimal: 'Óptimo', statusAttention: 'Atención', statusCritical: 'Crítico',
    historyLabel: '▾ historial', optimalLabel: 'Óptimo', standardLabel: 'Estándar',
    secWhy: 'Por qué importa',
    why1T: 'Los laboratorios estándar omiten el 80%', why1P: 'Tu médico comprueba si estás enfermo. Nuestros rangos optimizados para longevidad son 40–60% más estrictos.',
    why2T: '8 dominios, una puntuación', why2P: 'Puntuamos Corazón, Metabolismo, Inflamación, Órganos, Nutrientes, Hormonas, Composición corporal y Fitness por separado.',
    why3T: 'Seguimiento de cambios en el tiempo', why3P: 'Una sola prueba es una foto. El seguimiento longitudinal revela la película. Analízate cada 3–6 meses.',
    ctaTitle: 'Haz tu primer análisis de sangre.', ctaSub: '46 biomarcadores · 8 dominios · Puntuación de longevidad en 48 horas', ctaOrder: 'Pedir kit de análisis', ctaLearn: 'Saber más sobre biomarcadores',
    disclaimer: 'Vista previa con datos de muestra. No es una herramienta de diagnóstico médico. Siempre consulta a tu médico. Rangos basados en investigación revisada por pares.',
  },
  it: {
    tag: 'HEALTH ENGINE', title: 'Il tuo punteggio di longevità.', sub: '46 biomarcatori in 8 domini della salute. Monitora il tuo punteggio nel tempo, vedi cosa migliora e sappi esattamente su cosa concentrarti.',
    heroDate: 'Ultimo test: 15 mar 2026', heroTests: '3 test completati', heroKit: 'Evida Complete (46 marcatori)', sample: 'ANTEPRIMA — Dati di esempio',
    secScore: 'Punteggio di longevità', chartTitle: 'Storico punteggio — 3 test in 18 mesi',
    gaugeTitle: 'PUNTEGGIO DI LONGEVITÀ', gaugeMsg: 'Buono — sopra la media per la tua età',
    tipLabel: 'Consiglio', tipText: 'Esegui il test ogni 3–6 mesi per monitorare i tuoi interventi. La maggior parte dei miglioramenti dei biomarcatori si vede entro 90 giorni.',
    goalLabel: 'Obiettivo', goalText: 'Raggiungi 85+ per lo stato verde. Concentrati sui domini più deboli — Nutrienti (58) e Infiammazione (61) hanno più margine di miglioramento.',
    strengthTitle: 'Punto di forza', strengthText: 'La tua salute cardiovascolare (88/100) è eccellente. LDL a 82 mg/dL e ApoB a 0,72 g/L — entrambi negli intervalli ottimali di longevità.',
    priorityTitle: 'Azione prioritaria', priorityText: 'Vitamina D a 24 ng/mL — ben al di sotto dell\'ottimale 40–60. Trascina i Nutrienti a 58/100. Integra 4.000 UI al giorno e ritesta tra 3 mesi.',
    progressTitle: 'Progressi in 18 mesi', progressText: 'Punteggio: 68 → 78 (+10). Successi: glucosio ↓14%, Omega-3 ↑32%, LDL ↓18%. In calo: Vitamina D ↓15%, Ferritina ↓8%.',
    secBioAge: 'Età biologica',
    bioAgeLabel: 'Età biologica (GrimAge v2)', bioAgeDiff: '6,7 anni più giovane',
    paceLabel: 'Ritmo di invecchiamento (DunedinPACE)', paceDesc: 'Invecchi 10 mesi per anno solare. Top 15% per la tua età.',
    bioAgeChartT: 'Età bio — 3 test', paceChartT: 'Ritmo di invecchiamento — 3 test',
    secDomains: '8 domini della salute', domainsDesc: 'Ogni dominio valutato 0–100. Verde ≥ 85, Oro 70–84, Rosso < 70. Ponderato per impatto sulla longevità.',
    markers: 'marcatori', weightLabel: 'Peso',
    secDetails: 'Dettagli biomarcatori', detailsDesc: 'Clicca su un dominio per espandere. Clicca su un biomarcatore per la cronologia.',
    statusOptimal: 'Ottimale', statusAttention: 'Attenzione', statusCritical: 'Critico',
    historyLabel: '▾ cronologia', optimalLabel: 'Ottimale', standardLabel: 'Standard',
    secWhy: 'Perché è importante',
    why1T: 'I laboratori standard perdono l\'80%', why1P: 'Il tuo medico controlla se sei malato. I nostri intervalli ottimizzati per la longevità sono del 40–60% più stretti.',
    why2T: '8 domini, un punteggio', why2P: 'Valutiamo Cuore, Metabolismo, Infiammazione, Organi, Nutrienti, Ormoni, Composizione corporea e Fitness separatamente.',
    why3T: 'Monitoraggio dei cambiamenti nel tempo', why3P: 'Un singolo test è una foto. Il monitoraggio longitudinale rivela il film. Esegui il test ogni 3–6 mesi.',
    ctaTitle: 'Fai il tuo primo esame del sangue.', ctaSub: '46 biomarcatori · 8 domini · Punteggio di longevità in 48 ore', ctaOrder: 'Ordina kit di analisi', ctaLearn: 'Scopri i biomarcatori',
    disclaimer: 'Anteprima con dati di esempio. Non è uno strumento diagnostico. Consulta sempre il tuo medico. Intervalli basati su ricerche peer-reviewed.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function scoreColor(ratio: number) {
  return ratio >= 0.85 ? '#0C9C6C' : ratio >= 0.70 ? '#C4A96A' : '#c0392b';
}
function markerStatus(v: number, rL: number, rH: number, oL: number, oH: number): 'optimal' | 'attention' | 'critical' {
  if (v >= oL && v <= oH) return 'optimal';
  if (v >= rL && v <= rH) return 'attention';
  return 'critical';
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

// ── Score History Chart (480×150) ─────────────────────────────────────────────
function ScoreHistoryChart({ vals }: { vals: number[] }) {
  const W = 480, H = 150, PX = 36, PY = 10, PB = 20;
  const cW = W - PX * 2, cH = H - PY - PB;
  const step = cW / (vals.length - 1);
  const pts = vals.map((v, i): [number, number] => [PX + i * step, PY + cH * (1 - v / 100)]);
  const gY = PY + cH * 0.15, oY = PY + cH * 0.30;
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${pts[pts.length-1][0].toFixed(1)},${(PY+cH).toFixed(1)} L${pts[0][0].toFixed(1)},${(PY+cH).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <rect x={PX} y={PY} width={cW} height={gY - PY} fill="rgba(12,156,108,0.05)" />
      <rect x={PX} y={gY} width={cW} height={oY - gY} fill="rgba(196,169,106,0.05)" />
      <rect x={PX} y={oY} width={cW} height={PY + cH - oY} fill="rgba(192,57,43,0.03)" />
      {[0, 50, 100].map(v => {
        const y = PY + cH * (1 - v / 100);
        return (
          <g key={v}>
            <line x1={PX} y1={y} x2={PX + cW} y2={y} stroke="rgba(14,57,61,0.04)" strokeWidth={0.5} />
            <text x={PX - 5} y={y + 3} textAnchor="end" fontSize={7} fill="#5a6e6f">{v}</text>
          </g>
        );
      })}
      <path d={areaD} fill="rgba(14,57,61,0.06)" />
      <path d={lineD} fill="none" stroke="#888780" strokeWidth={1.5} strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const cl = scoreColor(vals[i] / 100);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill={cl} stroke="white" strokeWidth={1.2} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize={8} fontWeight={600} fill={cl}>{vals[i]}</text>
          </g>
        );
      })}
      {DATES.map((d, i) => (
        <text key={i} x={PX + i * step} y={H - 3} textAnchor="middle" fontSize={7} fill="#5a6e6f">{d}</text>
      ))}
    </svg>
  );
}

// ── Mini Domain Chart (240×56) ────────────────────────────────────────────────
function MiniDomainChart({ vals }: { vals: number[] }) {
  const W = 240, H = 56, PX = 22, PY = 4, PB = 14;
  const cW = W - PX - 4, cH = H - PY - PB;
  const step = cW / (vals.length - 1);
  const pts = vals.map((v, i): [number, number] => [PX + i * step, PY + cH * (1 - v / 100)]);
  const gY = PY + cH * 0.15, oY = PY + cH * 0.30;
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={56} style={{ display: 'block' }}>
      <rect x={PX} y={PY} width={cW} height={gY - PY} fill="rgba(12,156,108,0.08)" rx={2} />
      <rect x={PX} y={gY} width={cW} height={oY - gY} fill="rgba(196,169,106,0.08)" />
      <rect x={PX} y={oY} width={cW} height={PY + cH - oY} fill="rgba(192,57,43,0.06)" rx={2} />
      {[0, 50, 100].map(v => {
        const y = PY + cH * (1 - v / 100);
        return (
          <g key={v}>
            <line x1={PX} y1={y} x2={PX + cW} y2={y} stroke="rgba(14,57,61,0.06)" strokeWidth={0.4} />
            <text x={PX - 3} y={y + 2.5} textAnchor="end" fontSize={5.5} fill="#5a6e6f">{v}</text>
          </g>
        );
      })}
      <text x={PX + cW + 2} y={gY + 3} fontSize={4.5} fill="#0C9C6C">85</text>
      <text x={PX + cW + 2} y={oY + 3} fontSize={4.5} fill="#C4A96A">70</text>
      <path d={lineD} fill="none" stroke="#888780" strokeWidth={1.2} strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const cl = scoreColor(vals[i] / 100);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill={cl} stroke="white" strokeWidth={1} />
            <text x={x} y={y - 6} textAnchor="middle" fontSize={7} fontWeight={600} fill={cl}>{vals[i]}</text>
          </g>
        );
      })}
      {DATES.map((d, i) => (
        <text key={i} x={PX + i * step} y={H - 2} textAnchor="middle" fontSize={5.5} fill="#5a6e6f">{d}</text>
      ))}
    </svg>
  );
}

// ── Bio Age Chart (380×90, dark) ──────────────────────────────────────────────
function BioAgeChart({ vals }: { vals: number[] }) {
  const W = 380, H = 90, PX = 36, PY = 10, PB = 20;
  const cW = W - PX * 2, cH = H - PY - PB;
  const step = cW / (vals.length - 1);
  const mn = 25, mx = 36, rng = mx - mn;
  const caY = PY + cH * (1 - (35 - mn) / rng);
  const pts = vals.map((v, i): [number, number] => [PX + i * step, PY + cH * (1 - (v - mn) / rng)]);
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <rect x={PX} y={caY} width={cW} height={PY + cH - caY} fill="rgba(192,57,43,0.04)" />
      <rect x={PX} y={PY} width={cW} height={caY - PY} fill="rgba(12,156,108,0.06)" />
      <line x1={PX} y1={caY} x2={PX + cW} y2={caY} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} strokeDasharray="3 2" />
      <text x={PX + cW + 3} y={caY + 3} fontSize={6} fill="rgba(255,255,255,0.25)">35 chrono</text>
      <path d={lineD} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const cl = vals[i] < 35 ? '#0C9C6C' : '#c0392b';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill={cl} stroke="white" strokeWidth={1.2} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize={8} fontWeight={600} fill="rgba(255,255,255,0.6)">{vals[i]}</text>
          </g>
        );
      })}
      {DATES.map((d, i) => (
        <text key={i} x={PX + i * step} y={H - 3} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.25)">{d}</text>
      ))}
    </svg>
  );
}

// ── Pace Chart (380×90, dark) ─────────────────────────────────────────────────
function PaceChart({ vals }: { vals: number[] }) {
  const W = 380, H = 90, PX = 36, PY = 10, PB = 20;
  const cW = W - PX * 2, cH = H - PY - PB;
  const step = cW / (vals.length - 1);
  const mn = 0.7, mx = 1.1, rng = mx - mn;
  const nY = PY + cH * (1 - (1.0 - mn) / rng);
  const pts = vals.map((v, i): [number, number] => [PX + i * step, PY + cH * (1 - (v - mn) / rng)]);
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <rect x={PX} y={PY} width={cW} height={nY - PY} fill="rgba(12,156,108,0.06)" />
      <rect x={PX} y={nY} width={cW} height={PY + cH - nY} fill="rgba(192,57,43,0.04)" />
      <line x1={PX} y1={nY} x2={PX + cW} y2={nY} stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} strokeDasharray="3 2" />
      <text x={PX + cW + 3} y={nY + 3} fontSize={6} fill="rgba(255,255,255,0.25)">1.0</text>
      <path d={lineD} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const cl = vals[i] < 1 ? '#0C9C6C' : '#c0392b';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill={cl} stroke="white" strokeWidth={1.2} />
            <text x={x} y={y - 8} textAnchor="middle" fontSize={8} fontWeight={600} fill="rgba(255,255,255,0.6)">{vals[i]}</text>
          </g>
        );
      })}
      {DATES.map((d, i) => (
        <text key={i} x={PX + i * step} y={H - 3} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.25)">{d}</text>
      ))}
    </svg>
  );
}

// ── Mini Trend Chart (200×60) ─────────────────────────────────────────────────
function MiniTrendChart({ vals, r, o }: { vals: number[]; r: [number, number]; o: [number, number] }) {
  const W = 200, H = 60, PX = 4, PY = 6, PB = 14;
  const cW = W - PX * 2, cH = H - PY - PB;
  const step = cW / (vals.length - 1);
  const pad = (r[1] - r[0]) * 0.15;
  const mn = r[0] - pad, mx = r[1] + pad, rng = mx - mn || 1;
  const pts = vals.map((v, i): [number, number] => [PX + i * step, PY + cH * (1 - Math.min(1, Math.max(0, (v - mn) / rng)))]);
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const refTop = Math.max(PY, PY + cH * (1 - (r[1] - mn) / rng));
  const refH = Math.min(cH, PY + cH * (1 - (r[0] - mn) / rng) - refTop);
  const oTop = Math.max(PY, PY + cH * (1 - (o[1] - mn) / rng));
  const oH = Math.min(cH, PY + cH * (1 - (o[0] - mn) / rng) - oTop);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={60} style={{ display: 'block' }}>
      <rect x={PX} y={PY} width={cW} height={cH} fill="rgba(192,57,43,0.04)" rx={2} />
      <rect x={PX} y={refTop} width={cW} height={Math.max(0, refH)} fill="rgba(196,169,106,0.1)" rx={1} />
      <rect x={PX} y={oTop} width={cW} height={Math.max(0, oH)} fill="rgba(12,156,108,0.12)" rx={1} />
      <text x={PX + cW + 1} y={Math.max(PY + 6, oTop + 3)} fontSize={4} fill="#0C9C6C">opt</text>
      <path d={lineD} fill="none" stroke="#0e393d" strokeWidth={1.2} strokeLinecap="round" />
      {pts.map(([x, y], i) => {
        const v = vals[i];
        const cl = v >= o[0] && v <= o[1] ? '#0C9C6C' : v >= r[0] && v <= r[1] ? '#d4860a' : '#c0392b';
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={2.5} fill={cl} stroke="white" strokeWidth={0.8} />
            <text x={x} y={y - 5} textAnchor="middle" fontSize={5.5} fontWeight={600} fill={cl}>{vals[i]}</text>
          </g>
        );
      })}
      {DATES.map((d, i) => (
        <text key={i} x={PX + i * step} y={H - 2} textAnchor="middle" fontSize={5} fill="#5a6e6f">{d}</text>
      ))}
    </svg>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-[#ceab84] text-[10px] font-medium tracking-[0.14em] uppercase whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#0e393d]/10" />
    </div>
  );
}

// ── Trend badge ────────────────────────────────────────────────────────────────
function TrendBadge({ children, variant }: { children: React.ReactNode; variant: 'up' | 'down' | 'stable' }) {
  const cls = variant === 'up'
    ? 'bg-[rgba(12,156,108,0.1)] text-[#0C9C6C]'
    : variant === 'down'
    ? 'bg-[rgba(192,57,43,0.1)] text-[#c0392b]'
    : 'bg-[rgba(14,57,61,0.06)] text-[#5a6e6f]';
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${cls}`}>{children}</span>;
}

// ── Biomarker card ─────────────────────────────────────────────────────────────
function BiomarkerCard({ m, isOpen, onToggle, t }: {
  m: Marker; isOpen: boolean; onToggle: () => void;
  t: typeof T['en'];
}) {
  const v = m.v[2];
  const rng = m.r[1] - m.r[0] || 1;
  const oL = Math.max(0, (m.o[0] - m.r[0]) / rng * 100);
  const oW = Math.min(100 - oL, (m.o[1] - m.o[0]) / rng * 100);
  const vP = Math.min(100, Math.max(0, (v - m.r[0]) / rng * 100));
  const status = markerStatus(v, m.r[0], m.r[1], m.o[0], m.o[1]);
  const dotColor = status === 'optimal' ? '#0C9C6C' : status === 'attention' ? '#d4860a' : '#c0392b';
  const statusLabel = status === 'optimal' ? t.statusOptimal : status === 'attention' ? t.statusAttention : t.statusCritical;

  return (
    <div className="mb-2 break-inside-avoid">
      <div
        className="bg-[rgba(14,57,61,0.015)] border border-[rgba(14,57,61,0.04)] rounded-[10px] px-3 py-2.5 cursor-pointer hover:bg-[rgba(14,57,61,0.03)] hover:border-[rgba(14,57,61,0.08)] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="text-[0.76rem] font-medium text-[#0e393d] truncate">
            {m.n}{m.nt && <span className="text-[0.58rem] text-[#5a6e6f] ml-1">({m.nt})</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[0.78rem] font-semibold text-[#0e393d]">{v} <span className="text-[0.6rem] font-normal text-[#5a6e6f]">{m.u}</span></span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
          </div>
        </div>
        <div className="relative h-1.5 w-full rounded-full" style={{ background: 'linear-gradient(to right, rgba(192,57,43,0.1) 0%, rgba(192,57,43,0.1) 8%, rgba(14,57,61,0.06) 8%, rgba(14,57,61,0.06) 92%, rgba(192,57,43,0.1) 92%)' }}>
          <div className="absolute inset-y-0 rounded-full" style={{ left: `${oL}%`, width: `${oW}%`, background: 'rgba(12,156,108,0.28)' }} />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white shadow-sm" style={{ left: `${vP}%`, background: dotColor }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[0.58rem]" style={{ color: dotColor }}>{statusLabel}</span>
          <span className="text-[0.58rem] text-[#5a6e6f]">{t.historyLabel}</span>
        </div>
      </div>

      {isOpen && (
        <div className="pl-3 border-l-2 border-[#0e393d]/10 ml-2 mt-0.5 mb-1 py-3">
          <div className="flex gap-5 mb-2 flex-wrap">
            {m.v.map((val, vi) => {
              const inO = val >= m.o[0] && val <= m.o[1];
              const inR = val >= m.r[0] && val <= m.r[1];
              const cl = inO ? '#0C9C6C' : inR ? '#d4860a' : '#c0392b';
              return (
                <div key={vi} className="text-center">
                  <div className="text-[0.56rem] text-[#5a6e6f] mb-0.5">{DATES[vi]}</div>
                  <div className="text-[0.78rem] font-semibold" style={{ color: cl }}>{val} <span className="text-[0.6rem] font-normal text-[#5a6e6f]">{m.u}</span></div>
                </div>
              );
            })}
          </div>
          <div className="text-[0.58rem] text-[#5a6e6f] mb-1.5">{t.optimalLabel}: {m.o[0]}–{m.o[1]} {m.u} · {t.standardLabel}: {m.r[0]}–{m.r[1]} {m.u}</div>
          <div className="bg-[rgba(14,57,61,0.02)] rounded-lg p-1.5">
            <MiniTrendChart vals={[...m.v]} r={m.r} o={m.o} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HealthEnginePublic({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [openDomains, setOpenDomains] = useState<Set<number>>(new Set());
  const [openMarkers, setOpenMarkers] = useState<Set<string>>(new Set());

  function toggleDomain(i: number) {
    setOpenDomains(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }
  function toggleMarker(key: string) {
    setOpenMarkers(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">
      {/* Sample badge */}
      <div className="fixed bottom-3 right-3 z-50 bg-[#0e393d] text-[#f2ebdb] text-[8px] px-2.5 py-1 rounded-full tracking-wide opacity-60 pointer-events-none">
        {t.sample}
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 pt-32 pb-10">
        <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.tag}</p>
        <h1 className="font-serif font-normal text-4xl md:text-5xl lg:text-[3.5rem] text-[#0e393d] leading-[1.08] tracking-tight mb-4 max-w-[620px]">
          {t.title}
        </h1>
        <p className="text-[0.9rem] font-light text-[#5a6e6f] leading-relaxed max-w-[520px] mb-4">{t.sub}</p>
        <div className="flex flex-wrap gap-4 text-[0.68rem] text-[#5a6e6f]">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#0C9C6C] mr-1.5 align-middle" />{t.heroDate}</span>
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C4A96A] mr-1.5 align-middle" />{t.heroTests}</span>
          <span>{t.heroKit}</span>
        </div>
      </section>

      <div className="max-w-[1060px] mx-auto px-8 md:px-12 pb-6">

        {/* ── LONGEVITY SCORE ───────────────────────────────────────────────── */}
        <div className="py-6">
          <SectionHeader label={t.secScore} />

          {/* Row 1: Gauge + History Chart */}
          <div className="grid md:grid-cols-[200px_1fr] gap-5 items-start mb-3">
            {/* Gauge card */}
            <div className="bg-white rounded-2xl border border-[#0e393d]/[0.06] p-4 text-center">
              <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-[#ceab84] mb-1">{t.gaugeTitle}</p>
              <div className="flex justify-center"><Gauge score={78} max={100} sz="lg" /></div>
              <p className="text-[0.68rem] font-medium mt-1" style={{ color: '#0C9C6C' }}>{t.gaugeMsg}</p>
              <div className="flex justify-center gap-1.5 mt-1.5 flex-wrap">
                {['8 domains', '78%', '46 markers'].map((pill, i) => (
                  <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full ${i === 1 ? 'bg-[rgba(12,156,108,0.1)] text-[#0C9C6C]' : 'bg-[#f5f4f0] text-[#5a6e6f]'}`}>{pill}</span>
                ))}
              </div>
            </div>
            {/* Chart card */}
            <div className="bg-white rounded-xl border border-[#0e393d]/[0.06] p-3.5">
              <p className="text-[0.65rem] font-semibold text-[#5a6e6f] uppercase tracking-[0.06em] mb-1.5">{t.chartTitle}</p>
              <ScoreHistoryChart vals={OV} />
            </div>
          </div>

          {/* Row 2: Tip + Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(12,156,108,0.04)', border: '1px solid rgba(12,156,108,0.08)' }}>
              <span className="text-[13px] shrink-0">💡</span>
              <span className="text-[0.66rem] text-[#5a6e6f] leading-relaxed"><strong style={{ color: '#0C9C6C' }}>{t.tipLabel}:</strong> {t.tipText}</span>
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(196,169,106,0.04)', border: '1px solid rgba(196,169,106,0.1)' }}>
              <span className="text-[13px] shrink-0">🎯</span>
              <span className="text-[0.66rem] text-[#5a6e6f] leading-relaxed"><strong style={{ color: '#C4A96A' }}>{t.goalLabel}:</strong> {t.goalText}</span>
            </div>
          </div>

          {/* Row 3: Insight cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="bg-white rounded-xl border border-[#0e393d]/[0.06] p-3.5">
              <p className="text-[0.74rem] font-semibold text-[#0e393d] mb-1">{t.strengthTitle}</p>
              <p className="text-[0.74rem] text-[#5a6e6f] leading-relaxed">
                Your <span className="text-[#0C9C6C] font-semibold">cardiovascular health (88/100)</span> is excellent. LDL at 82 mg/dL and ApoB at 0.72 g/L — both in optimal longevity ranges.
              </p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <TrendBadge variant="up">↑ LDL improved 12%</TrendBadge>
                <TrendBadge variant="up">↑ ApoB improved 8%</TrendBadge>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#0e393d]/[0.06] p-3.5">
              <p className="text-[0.74rem] font-semibold text-[#0e393d] mb-1">{t.priorityTitle}</p>
              <p className="text-[0.74rem] text-[#5a6e6f] leading-relaxed">
                <span className="text-[#d4860a] font-semibold">Vitamin D at 24 ng/mL</span> — well below optimal 40–60. Dragging Nutrients to 58/100. Supplement 4,000 IU daily.
              </p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <TrendBadge variant="down">↓ Vit D −15%</TrendBadge>
                <TrendBadge variant="stable">→ hsCRP stable</TrendBadge>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#0e393d]/[0.06] p-3.5">
              <p className="text-[0.74rem] font-semibold text-[#0e393d] mb-1">{t.progressTitle}</p>
              <p className="text-[0.74rem] text-[#5a6e6f] leading-relaxed">
                Score: <span className="text-[#0C9C6C] font-semibold">68 → 78 (+10)</span>. Wins: glucose ↓14%, Omega-3 ↑32%, LDL ↓18%. Declining: Vitamin D ↓15%, Ferritin ↓8%.
              </p>
            </div>
          </div>
        </div>

        {/* ── BIOLOGICAL AGE (dark card) ────────────────────────────────────── */}
        <div className="py-3 pb-7">
          <SectionHeader label={t.secBioAge} />
          <div className="bg-[#0e393d] rounded-2xl p-6 text-white">
            {/* Top row: two gauge+value pairs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              <div>
                <p className="text-[8px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">{t.bioAgeLabel}</p>
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0"><Gauge score={87} max={100} sz="sm" dark /></div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-[1.6rem] text-white/25 line-through decoration-white/10">35</span>
                      <span className="text-white/20">→</span>
                      <span className="font-serif text-[2rem] text-[#0C9C6C]">28.3</span>
                    </div>
                    <p className="text-[0.7rem] text-[#0C9C6C]">{t.bioAgeDiff}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[8px] font-semibold tracking-[0.12em] uppercase text-white/30 mb-1">{t.paceLabel}</p>
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0"><Gauge score={82} max={100} sz="sm" dark /></div>
                  <div>
                    <div className="font-serif text-[1.4rem] text-[#0C9C6C]">0.84 <span className="text-[0.62rem] text-white/35 font-sans">years/year</span></div>
                    <p className="text-[0.68rem] text-white/35 leading-relaxed mt-1 max-w-[200px]">{t.paceDesc}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom row: two charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/[0.06]">
                <p className="text-[0.58rem] font-semibold tracking-[0.06em] uppercase text-white/30 mb-1">{t.bioAgeChartT}</p>
                <BioAgeChart vals={BIO_AGES} />
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/[0.06]">
                <p className="text-[0.58rem] font-semibold tracking-[0.06em] uppercase text-white/30 mb-1">{t.paceChartT}</p>
                <PaceChart vals={PACE} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 8 HEALTH DOMAINS ─────────────────────────────────────────────── */}
        <div className="pb-7">
          <SectionHeader label={t.secDomains} />
          <p className="text-[0.72rem] text-[#5a6e6f] mb-3.5">{t.domainsDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {D.map((d) => {
              const cur = d.sc[2], prev = d.sc[1], chg = cur - prev;
              const cl = scoreColor(cur / 100);
              const trendV: 'up' | 'down' | 'stable' = chg > 0 ? 'up' : chg < 0 ? 'down' : 'stable';
              return (
                <div key={d.nm.en} className="bg-white rounded-[14px] border border-[#0e393d]/[0.06] p-3.5 grid grid-cols-2 gap-4 items-center hover:border-[#0e393d]/[0.12] hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0"><Gauge score={cur} max={100} sz="sm" /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[13px]">{d.ic}</span>
                        <span className="text-[0.74rem] font-semibold text-[#0e393d] truncate">{d.nm[lang]}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif text-[1.4rem] leading-none" style={{ color: cl }}>{cur}</span>
                        <span className="text-[0.6rem] text-[#5a6e6f]">/100</span>
                        <TrendBadge variant={trendV}>{chg > 0 ? '+' : ''}{chg}</TrendBadge>
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[0.58rem] text-[#5a6e6f]">{d.m.length} {t.markers}</span>
                        <span className="text-[0.58rem] text-[#5a6e6f]">·</span>
                        <span className="text-[0.58rem] text-[#5a6e6f]">{t.weightLabel} {d.w}</span>
                      </div>
                    </div>
                  </div>
                  <div><MiniDomainChart vals={[...d.sc]} /></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BIOMARKER DETAIL ACCORDION ───────────────────────────────────── */}
        <div className="pb-7">
          <SectionHeader label={t.secDetails} />
          <p className="text-[0.72rem] text-[#5a6e6f] mb-3.5">{t.detailsDesc}</p>
          <div className="flex flex-col gap-1.5">
            {D.map((d, di) => {
              const cur = d.sc[2];
              const isOpen = openDomains.has(di);
              const cl = scoreColor(cur / 100);
              return (
                <div key={d.nm.en} className="bg-white rounded-[14px] border border-[#0e393d]/[0.06] overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(14,57,61,0.015)] transition-colors select-none"
                    onClick={() => toggleDomain(di)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{d.ic}</span>
                      <span className="text-[0.78rem] font-semibold text-[#0e393d]">{d.nm[lang]}</span>
                      <span className="text-[0.62rem] text-[#5a6e6f]">{d.m.length} {t.markers}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-serif text-[1.1rem]" style={{ color: cl }}>{cur}/100</span>
                      <span className="text-[12px] text-[#5a6e6f] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-[#0e393d]/[0.06] px-4 py-2.5">
                      <div style={{ columnCount: 2, columnGap: '10px' }}>
                        {d.m.map((m, mi) => {
                          const key = `${di}-${mi}`;
                          return (
                            <BiomarkerCard
                              key={key}
                              m={m}
                              isOpen={openMarkers.has(key)}
                              onToggle={() => toggleMarker(key)}
                              t={t}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── WHY THIS MATTERS ─────────────────────────────────────────────── */}
        <div className="pb-7">
          <SectionHeader label={t.secWhy} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[
              { t: t.why1T, p: t.why1P },
              { t: t.why2T, p: t.why2P },
              { t: t.why3T, p: t.why3P },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#0e393d]/[0.06] p-4.5 p-[18px]">
                <h3 className="font-serif text-[0.95rem] text-[#0e393d] mb-1">{c.t}</h3>
                <p className="text-[0.74rem] text-[#5a6e6f] leading-relaxed">{c.p}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <div className="max-w-[1060px] mx-auto px-8 md:px-12 pb-16">
        <div className="bg-[#0e393d] rounded-2xl px-10 md:px-16 py-14 text-center">
          <h2 className="font-serif text-[1.7rem] text-white mb-1">{t.ctaTitle}</h2>
          <p className="text-white/40 text-[0.78rem] mb-5">{t.ctaSub}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link href="/shop" className="inline-block bg-[#ceab84] text-[#0e393d] font-semibold text-[11.5px] tracking-[0.04em] px-6 py-3 rounded-full hover:bg-[#dfc4a4] transition-colors">
              {t.ctaOrder}
            </Link>
            <Link href="/biomarkers" className="inline-block border border-white/20 text-white text-[11.5px] px-6 py-3 rounded-full hover:bg-white/10 transition-all ml-1.5">
              {t.ctaLearn}
            </Link>
          </div>
        </div>
        <p className="text-center text-[0.58rem] text-[#5a6e6f]/35 mt-5 max-w-[500px] mx-auto leading-relaxed">{t.disclaimer}</p>
      </div>
    </div>
  );
}
