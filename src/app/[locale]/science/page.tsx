import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { buildMeta, PAGE_META } from '@/lib/seo';

// ── Heatmap data (Tessiere et al. 2025, Nature Medicine, Figure 4) ─────────────
// Columns: [Overall Healthy Aging, Cognitive, Physical, Mental Health, Free from Disease, Survived to 70]
type CellVal = -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4;
interface HRow { food: string; cells: [CellVal, CellVal, CellVal, CellVal, CellVal, CellVal]; }

const HP: HRow[] = [
  { food: 'Fruit',                  cells: [ 4,  3,  3,  3,  4,  4] },
  { food: 'MUFA:SFA ratio',         cells: [ 3,  2,  2,  2,  3,  3] },
  { food: 'Whole grains',           cells: [ 3,  2,  3,  2,  3,  3] },
  { food: 'Vegetables',             cells: [ 3,  2,  3,  2,  3,  3] },
  { food: 'Added unsaturated fat',  cells: [ 2,  1,  2,  1,  2,  2] },
  { food: 'Leafy greens',           cells: [ 2,  3,  2,  2,  2,  2] },
  { food: 'Nuts',                   cells: [ 2,  2,  2,  1,  2,  2] },
  { food: 'Nuts & legumes',         cells: [ 2,  2,  2,  1,  2,  2] },
  { food: 'Dark-yellow vegetables', cells: [ 2,  2,  2,  1,  2,  2] },
  { food: 'Vegetable oils',         cells: [ 2,  1,  2,  1,  2,  2] },
  { food: 'Berries',                cells: [ 1,  2,  1,  2,  1,  1] },
  { food: 'Yogurt',                 cells: [ 1,  1,  1,  1,  1,  1] },
  { food: 'Low-fat dairy',          cells: [ 1,  1,  1,  0,  1,  1] },
  { food: 'Olive oil',              cells: [ 1,  1,  1,  1,  1,  1] },
  { food: 'Omega-3 fatty acids',    cells: [ 1,  2,  1,  1,  1,  1] },
  { food: 'Beans',                  cells: [ 1,  1,  1,  1,  2,  1] },
  { food: 'Soy',                    cells: [ 1,  1,  1,  1,  1,  1] },
  { food: 'Legumes',                cells: [ 1,  1,  1,  1,  1,  1] },
  { food: 'Coffee & tea',           cells: [ 1,  1,  0,  1,  1,  0] },
];
const HM: HRow[] = [
  { food: 'Wine',           cells: [ 0,  0,  0, -1,  0,  0] },
  { food: 'Fish & seafood', cells: [ 1,  1,  1,  0,  1,  0] },
  { food: 'Total dairy',    cells: [ 0,  0,  0,  0,  0,  0] },
  { food: 'Eggs',           cells: [ 0,  0,  0,  0, -1,  0] },
  { food: 'Poultry',        cells: [-1,  0,  0,  0, -1,  0] },
];
const HA: HRow[] = [
  { food: 'Trans fats',                 cells: [-4, -3, -3, -2, -4, -4] },
  { food: 'Total meats',                cells: [-3, -2, -2, -2, -3, -3] },
  { food: 'Red & processed meats',      cells: [-3, -2, -2, -2, -3, -3] },
  { food: 'Processed meat',             cells: [-3, -2, -2, -2, -3, -2] },
  { food: 'Sodium',                     cells: [-2, -1, -1, -1, -2, -2] },
  { food: 'Unprocessed red meat',       cells: [-2, -1, -1, -1, -2, -2] },
  { food: 'Added sat. fat & trans fat', cells: [-3, -2, -2, -1, -3, -3] },
  { food: 'French fries',               cells: [-2, -1, -1, -1, -2, -2] },
  { food: 'Butter',                     cells: [-2, -1, -1, -1, -2, -1] },
  { food: 'Sugar-sweetened beverages',  cells: [-2, -1, -1, -1, -2, -2] },
  { food: 'High-fat dairy',             cells: [-1, -1, -1, -1, -1, -1] },
  { food: 'Refined grains',             cells: [-1, -1, -1, -1, -1, -1] },
  { food: 'Fast & fried foods',         cells: [-2, -1, -1, -1, -2, -1] },
];

function cellCls(v: CellVal): string {
  if (v === 4)  return 'bg-emerald-700';
  if (v === 3)  return 'bg-emerald-500';
  if (v === 2)  return 'bg-emerald-300';
  if (v === 1)  return 'bg-emerald-100';
  if (v === 0)  return 'bg-gray-100';
  if (v === -1) return 'bg-red-100';
  if (v === -2) return 'bg-red-200';
  if (v === -3) return 'bg-red-400';
  return 'bg-red-600';
}

// ── Disease data (static, not translated — numbers are universal) ─────────────
const DISEASES = [
  { emoji: '❤️', deathsM: 20, pct: 32, preventPct: 80, preventLow: 70, preventHigh: 90, yearsLow: 6, yearsHigh: 10 },
  { emoji: '🎗️', deathsM: 10, pct: 16, preventPct: 40, preventLow: 30, preventHigh: 50, yearsLow: 3, yearsHigh: 5  },
  { emoji: '🫁', deathsM: 4,  pct: 6,  preventPct: 70, preventLow: 60, preventHigh: 80, yearsLow: 2, yearsHigh: 4  },
  { emoji: '💉', deathsM: 2,  pct: 3,  preventPct: 85, preventLow: 80, preventHigh: 90, yearsLow: 3, yearsHigh: 6  },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.science[lang], path: '/science', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

type Reference = {
  authors: string;
  title: { de: string; en: string; fr?: string; es?: string; it?: string };
  journal: string;
  year: number;
  link: string;
};

const REFS: Reference[] = [
  {
    authors: 'Ornish D. et al.',
    title: {
      de: 'Können Lebensstilveränderungen Koronarerkrankungen umkehren?',
      en: 'Can lifestyle changes reverse coronary heart disease?',
    },
    journal: 'The Lancet',
    year: 1990,
    link: 'https://pubmed.ncbi.nlm.nih.gov/1973470/',
  },
  {
    authors: 'Esselstyn C.B. et al.',
    title: {
      de: 'Eine Ernährungsstrategie zur Aufhebung von KHK',
      en: 'A way to reverse coronary artery disease',
    },
    journal: 'Journal of Family Practice',
    year: 2014,
    link: 'https://pubmed.ncbi.nlm.nih.gov/25198208/',
  },
  {
    authors: 'Satija A. et al.',
    title: {
      de: 'Pflanzliche Ernährungsmuster und das Risiko für Typ-2-Diabetes',
      en: 'Plant-based dietary patterns and incidence of type 2 diabetes',
    },
    journal: 'PLOS Medicine',
    year: 2016,
    link: 'https://pubmed.ncbi.nlm.nih.gov/27299701/',
  },
  {
    authors: 'Willett W. et al.',
    title: {
      de: 'Ernährung im Anthropozän: die EAT-Lancet Kommission',
      en: 'Food in the Anthropocene: the EAT-Lancet Commission',
    },
    journal: 'The Lancet',
    year: 2019,
    link: 'https://pubmed.ncbi.nlm.nih.gov/30660336/',
  },
  {
    authors: 'Greger M. & Stone G.',
    title: {
      de: 'Wie man nicht stirbt (How Not to Die)',
      en: 'How Not to Die',
    },
    journal: 'Flatiron Books',
    year: 2015,
    link: 'https://nutritionfacts.org/book/how-not-to-die/',
  },
  {
    authors: 'Buettner D.',
    title: {
      de: 'Die Blue Zones: Lektionen für ein längeres Leben',
      en: 'The Blue Zones: Lessons for Living Longer',
    },
    journal: 'National Geographic Books',
    year: 2008,
    link: 'https://www.bluezones.com',
  },
];

const PRINCIPLES = [
  {
    icon: '🔬',
    title: { de: 'Peer-reviewed Quellen', en: 'Peer-reviewed sources' },
    body: {
      de: 'Wir stützen uns ausschliesslich auf in wissenschaftlichen Fachzeitschriften veröffentlichte, von Experten begutachtete Studien.',
      en: 'We rely exclusively on studies published in peer-reviewed scientific journals and evaluated by domain experts.',
    },
  },
  {
    icon: '📊',
    title: { de: 'Meta-Analysen bevorzugt', en: 'Meta-analyses preferred' },
    body: {
      de: 'Einzelstudien können täuschen. Wo möglich priorisieren wir systematische Reviews und Meta-Analysen, die viele Studien zusammenfassen.',
      en: 'Single studies can be misleading. Where possible, we prioritise systematic reviews and meta-analyses that synthesise large bodies of evidence.',
    },
  },
  {
    icon: '🔄',
    title: { de: 'Kontinuierliche Aktualisierung', en: 'Continuously updated' },
    body: {
      de: 'Wissenschaft ist kein statisches Gebäude. Wir überprüfen unsere Empfehlungen regelmässig und passen sie an neue Erkenntnisse an.',
      en: 'Science is not static. We regularly review our recommendations and update them as new evidence emerges.',
    },
  },
  {
    icon: '⚖️',
    title: { de: 'Transparente Unsicherheit', en: 'Transparent uncertainty' },
    body: {
      de: 'Nicht alles ist bewiesen. Wir kommunizieren klar, wo die Evidenz stark ist und wo noch Forschungsbedarf besteht.',
      en: 'Not everything is proven. We clearly communicate where evidence is strong and where further research is needed.',
    },
  },
];

const SOURCES = [
  { name: 'NutritionFacts.org', desc: { de: 'Täglich aktualisierte Ernährungsforschung von Dr. Michael Greger', en: 'Daily updated nutrition research by Dr. Michael Greger' }, link: 'https://nutritionfacts.org' },
  { name: 'PubMed', desc: { de: 'Datenbank biomedizinischer Fachliteratur (NIH)', en: 'Biomedical literature database by the NIH' }, link: 'https://pubmed.ncbi.nlm.nih.gov' },
  { name: 'The Lancet', desc: { de: 'Eine der führenden medizinischen Fachzeitschriften weltweit', en: 'One of the world\'s leading medical journals' }, link: 'https://www.thelancet.com' },
  { name: 'NEJM', desc: { de: 'New England Journal of Medicine – klinische Forschung', en: 'New England Journal of Medicine — clinical research' }, link: 'https://www.nejm.org' },
  { name: 'EAT-Lancet Commission', desc: { de: 'Wissenschaftliche Grundlage für gesunde und nachhaltige Ernährung', en: 'Scientific basis for healthy and sustainable diets' }, link: 'https://eatforum.org/eat-lancet-commission/' },
  { name: 'Blue Zones', desc: { de: 'Forschung zu Langlebigkeit in den gesündesten Bevölkerungen der Welt', en: 'Research on longevity in the world\'s healthiest populations' }, link: 'https://www.bluezones.com' },
];

const T = {
  de: {
    eyebrow: 'Wissenschaft',
    heading: 'Wissenschaft & Quellen',
    heroSub: 'Alles, was wir tun, basiert auf der besten verfügbaren wissenschaftlichen Evidenz. Hier findest du unsere Grundprinzipien und die wichtigsten Quellen, auf die wir uns stützen.',
    principlesHead: 'Unsere Evidenz-Prinzipien',
    refsHead: 'Schlüsselreferenzen',
    refsBody: 'Eine Auswahl der wichtigsten Studien und Werke, die unsere Empfehlungen prägen.',
    sourcesHead: 'Unsere wichtigsten Quellen',
    disclaimer: 'Haftungsausschluss',
    disclaimerBody: 'Die Inhalte auf Evida Life dienen der allgemeinen Information und ersetzen keine ärztliche Beratung. Bei gesundheitlichen Beschwerden wende dich an eine qualifizierte medizinische Fachperson.',
    viewStudy: 'Studie ansehen',
    visitSite: 'Webseite besuchen',
    factsTag: 'DIE FAKTEN',
    factsTitle: 'Die häufigsten Todesursachen sind vermeidbar.',
    factsSub: '57 % aller weltweiten Todesfälle werden durch nur vier Krankheitsgruppen verursacht – und Lebensstil ist der primäre Treiber.',
    diseaseNames: ['Herz & Gefässe', 'Krebs', 'Chronische Atemwegserkrankungen', 'Diabetes'],
    deathsLabel: 'Mio. Todesfälle/Jahr',
    allDeaths: 'aller Todesfälle',
    preventable: 'vermeidbar',
    potential: 'Potenzial',
    yearsUnit: 'Jahre mehr Leben',
    factsBox: 'Zusammengenommen: Alle vier Erkrankungen durch Lebensstiländerungen zu reduzieren, verlängert die Lebenserwartung um +10 bis +15 Jahre. Fast jeder zweite Todesfall auf diesem Planeten hängt mit veränderbaren Risikofaktoren zusammen: Ernährung, Bewegung, Rauchen, Alkohol und Gewicht.',
    agingTag: 'DER ECHTE RISIKOFAKTOR',
    agingTitle: 'Niemand stirbt an Alter.',
    agingSub: 'Menschen sterben an Krankheiten. Aber Altern ist der mit Abstand grösste Risikofaktor für nahezu alle davon.',
    agingFacts: [
      'Das Sterberisiko steigt exponentiell im Erwachsenenalter – es verdoppelt sich etwa alle 7 Jahre.',
      'Wenn wir das biologische Altern nur um 7 Jahre verlangsamen, halbiert sich das Risiko für Tod, Gebrechlichkeit und Behinderung in jedem Lebensalter.',
      'Ein 50-Jähriger hätte das Gesundheitsprofil eines heutigen 43-Jährigen. Ein 60-Jähriger würde einem heutigen 53-Jährigen ähneln.',
    ],
    agingHallmarksNote: 'Forscher haben 11 biologische Kennzeichen des Alterns identifiziert. Viele davon werden direkt durch die Ernährung beeinflusst.',
    agingSource: 'Quelle: Kennedy et al. (2016), Cold Spring Harb Perspect Med',
    hallmarksTag: 'HALLMARKS DES ALTERNS',
    hallmarksTitle: '11 Mechanismen des Alterns – und was deine Ernährung damit macht.',
    hallmarksSub: 'Jedes Hallmark kann durch deine Ernährung beschleunigt oder verlangsamt werden.',
    animalLabel: 'Tierische Produkte:',
    plantLabel: 'Pflanzlich:',
    hallmarks: [
      { name: 'AMPK', sub: 'Zellulärer Energiesensor', animal: 'Hohe Kaloriendichte + gesättigte Fette → AMPK gehemmt', plant: 'Ballaststoffe + Fastenfenster → AMPK aktiviert' },
      { name: 'Autophagie', sub: 'Zelluläre Selbstreinigung', animal: 'Ständiger Proteinüberschuss schaltet Autophagie ab', plant: 'Polyphenole + reduzierte Kalorienlast → Autophagie gesteigert' },
      { name: 'mTOR', sub: 'Wachstumssignalschalter', animal: 'Tierisches Protein (Leucin) → mTOR chronisch überaktiviert', plant: 'Pflanzliches Protein → mTOR für Langlebigkeit moduliert' },
      { name: 'IGF-1', sub: 'Insulinähnlicher Wachstumsfaktor', animal: 'Milchprodukte, Fleisch, Eier → IGF-1 auf krebsfördernde Werte erhöht', plant: 'Vollwertige Pflanzenkost → IGF-1 auf Langlebigkeitsniveau' },
      { name: 'Telomerverkürzung', sub: 'Biologische Uhr', animal: 'Chronische Entzündung → beschleunigter Telomerverlust', plant: 'Antioxidantien + entzündungshemmende Substanzen → Telomerschutz' },
      { name: 'Epigenetische Veränderungen', sub: 'Genexpressionsschalter', animal: 'Fördert entzündungsfördernde Genexpressionsmuster', plant: 'Polyphenole + Methyldonoren aktivieren Langlebigkeitsgene' },
      { name: 'Mitochondriale Dysfunktion', sub: 'Energiewerk-Versagen', animal: 'Gesättigte Fette beeinträchtigen die Mitochondrienmembranfunktion', plant: 'AMPK + Antioxidantien unterstützen mitochondriale Integrität' },
      { name: 'Zelluläre Seneszenz', sub: 'Zombie-Zellen', animal: 'Erhöht DNA-Schäden → mehr seneszente Zellen akkumulieren', plant: 'Flavonoide wirken als Senolytika und eliminieren Zombie-Zellen' },
      { name: 'Chronische Entzündung', sub: 'Inflammaging', animal: 'Gesättigte Fette + Endotoxine lösen systemische Entzündung aus', plant: 'Ballaststoffe + Polyphenole → entzündungshemmende kurzkettige Fettsäuren' },
      { name: 'Oxidativer Stress', sub: 'Freie-Radikale-Schäden', animal: 'Erzeugt reaktive Sauerstoffspezies mit wenigen schützenden Antioxidantien', plant: 'Tausende Antioxidantien neutralisieren freie Radikale' },
      { name: 'Darmdysbiose', sub: 'Mikrobiom-Störung', animal: 'Ernährt pathogene Bakterien, fördert Darmentzündung', plant: 'Ballaststoffe ernähren schützende Bakterien → Langlebigkeitssignale' },
    ],
    ctaTitle: 'Nimm deine Gesundheit in die Hand.',
    ctaBtn1: 'Mit der Daily Dozen starten',
    ctaBtn2: 'Biomarker messen lassen',
    ctaBtn3: 'So fängst du an',
    heatmapTag: 'ERNÄHRUNG & LONGEVITY',
    heatmapTitle: 'Was Forscher über Essen & gesundes Altern wissen',
    heatmapSub: 'Tessiere et al. (2025) in Nature Medicine verfolgten 105.015 Teilnehmer in zwei großen Kohorten (Nurses\' Health Study & Health Professionals Follow-up Study) über 30 Jahre – und identifizierten, welche Lebensmittel gesundes Altern in 6 Gesundheitsdomänen fördern oder beschleunigen.',
    promoteLabel: 'Fördert gesundes Altern',
    avoidLabel: 'Beschleunigt Alterung',
    colHeaders: ['Gesundes Altern', 'Kognitiv', 'Körperlich', 'Psychische Gesundheit', 'Krankheitsfrei', 'Bis 70 überleben'],
    dividerLabel: 'Gemischt / neutral',
    citation: 'Tessiere et al. (2025), Nature Medicine — 105.015 Teilnehmer, 30 Jahre Beobachtungszeitraum.',
  },
  en: {
    eyebrow: 'Science',
    heading: 'Science & Sources',
    heroSub: 'Everything we do is based on the best available scientific evidence. Here you\'ll find our core principles and the key sources we rely on.',
    principlesHead: 'Our evidence principles',
    refsHead: 'Key references',
    refsBody: 'A selection of the most important studies and works that shape our recommendations.',
    sourcesHead: 'Our key sources',
    disclaimer: 'Disclaimer',
    disclaimerBody: 'The content on Evida Life is for general information purposes and does not replace medical advice. For health concerns, consult a qualified healthcare professional.',
    viewStudy: 'View study',
    visitSite: 'Visit site',
    factsTag: 'THE FACTS',
    factsTitle: 'The leading causes of death are preventable.',
    factsSub: '57% of all deaths worldwide are caused by just four disease groups — and lifestyle is the primary driver.',
    diseaseNames: ['Heart & Cardiovascular', 'Cancer', 'Chronic Respiratory', 'Diabetes'],
    deathsLabel: 'M deaths/year',
    allDeaths: 'of all deaths',
    preventable: 'preventable',
    potential: 'Potential',
    yearsUnit: 'extra years of life',
    factsBox: 'Combined: reducing all four through lifestyle changes adds +10 to +15 years of life expectancy. Nearly every second death on this planet is linked to modifiable risk factors: diet, exercise, smoking, alcohol, and weight.',
    agingTag: 'THE REAL RISK FACTOR',
    agingTitle: 'Nobody dies of old age.',
    agingSub: 'People die of diseases. But aging is the single biggest risk factor for nearly all of them.',
    agingFacts: [
      'The risk of death rises exponentially throughout adulthood — doubling approximately every 7 years.',
      'If we slow biological aging by just 7 years, the risk of death, frailty, and disability is cut in half at every age.',
      'A 50-year-old would have the health profile of today\'s 43-year-old. A 60-year-old would resemble a current 53-year-old.',
    ],
    agingHallmarksNote: 'Researchers have identified 11 biological hallmarks of aging. Many of them are directly influenced by diet.',
    agingSource: 'Source: Kennedy et al. (2016), Cold Spring Harb Perspect Med',
    hallmarksTag: 'HALLMARKS OF AGING',
    hallmarksTitle: '11 mechanisms of aging — and what your diet does to each one.',
    hallmarksSub: 'Each hallmark can be accelerated or slowed by what you eat.',
    animalLabel: 'Animal products:',
    plantLabel: 'Plant-based:',
    hallmarks: [
      { name: 'AMPK', sub: 'Cellular energy sensor', animal: 'High calorie density + saturated fat → AMPK inhibited', plant: 'Dietary fiber + fasting windows → AMPK activated' },
      { name: 'Autophagy', sub: 'Cellular self-cleaning', animal: 'Constant protein surplus shuts autophagy off', plant: 'Polyphenols + lower caloric load → autophagy enhanced' },
      { name: 'mTOR', sub: 'Growth signaling switch', animal: 'Animal protein (leucine) → mTOR chronically overactivated', plant: 'Plant protein → mTOR moderated for longevity' },
      { name: 'IGF-1', sub: 'Insulin-like growth factor', animal: 'Dairy, meat, eggs → IGF-1 elevated to cancer-promoting levels', plant: 'Whole plant foods → IGF-1 at longevity-associated levels' },
      { name: 'Telomere shortening', sub: 'Biological clock', animal: 'Chronic inflammation → accelerated telomere loss', plant: 'Antioxidants + anti-inflammatory compounds → telomere protection' },
      { name: 'Epigenetic alterations', sub: 'Gene expression switches', animal: 'Promotes pro-inflammatory gene expression patterns', plant: 'Polyphenols + methyl donors activate longevity genes' },
      { name: 'Mitochondrial dysfunction', sub: 'Energy factory failure', animal: 'Saturated fats impair mitochondrial membrane function', plant: 'AMPK + antioxidants support mitochondrial integrity' },
      { name: 'Cellular senescence', sub: 'Zombie cells', animal: 'Increases DNA damage → more senescent cells accumulate', plant: 'Flavonoids act as senolytics, clearing zombie cells' },
      { name: 'Chronic inflammation', sub: 'Inflammaging', animal: 'Saturated fats + endotoxins trigger systemic inflammation', plant: 'Fiber + polyphenols → anti-inflammatory short-chain fatty acids' },
      { name: 'Oxidative stress', sub: 'Free radical damage', animal: 'Generates reactive oxygen species with few protective antioxidants', plant: 'Thousands of antioxidants neutralize free radicals' },
      { name: 'Gut dysbiosis', sub: 'Microbiome disruption', animal: 'Feeds pathogenic bacteria, promotes gut inflammation', plant: 'Dietary fiber feeds protective bacteria → longevity signals' },
    ],
    ctaTitle: 'Take control of your health.',
    ctaBtn1: 'Start with the Daily Dozen',
    ctaBtn2: 'Measure your biomarkers',
    ctaBtn3: 'Learn how to start',
    heatmapTag: 'FOOD & LONGEVITY',
    heatmapTitle: 'What researchers know about food & healthy aging',
    heatmapSub: 'Tessiere et al. (2025) in Nature Medicine followed 105,015 participants across two major cohorts (Nurses\' Health Study & Health Professionals Follow-up Study) for 30 years — identifying which foods promote or accelerate aging across 6 health outcomes.',
    promoteLabel: 'Promotes healthy aging',
    avoidLabel: 'Accelerates aging',
    colHeaders: ['Healthy aging', 'Cognitive', 'Physical', 'Mental health', 'Disease-free', 'Survived 70'],
    dividerLabel: 'Mixed / neutral',
    citation: 'Tessiere et al. (2025), Nature Medicine — 105,015 participants followed for 30 years.',
  },
  fr: {
    eyebrow: 'Science',
    heading: 'Science & Sources',
    heroSub: 'Tout ce que nous faisons repose sur les meilleures preuves scientifiques disponibles. Vous trouverez ici nos principes fondamentaux et les sources clés sur lesquelles nous nous appuyons.',
    principlesHead: 'Nos principes de preuve',
    refsHead: 'Références clés',
    refsBody: 'Une sélection des études et travaux les plus importants qui façonnent nos recommandations.',
    sourcesHead: 'Nos sources clés',
    disclaimer: 'Avertissement',
    disclaimerBody: 'Le contenu d\'Evida Life est à des fins d\'information générale et ne remplace pas les conseils médicaux. Pour des problèmes de santé, consultez un professionnel de santé qualifié.',
    viewStudy: 'Voir l\'étude',
    visitSite: 'Visiter le site',
    factsTag: 'LES FAITS',
    factsTitle: 'Les principales causes de décès sont évitables.',
    factsSub: '57 % de tous les décès dans le monde sont causés par seulement quatre groupes de maladies — et le mode de vie en est le principal facteur.',
    diseaseNames: ['Cœur & Cardiovasculaire', 'Cancer', 'Maladies respiratoires chroniques', 'Diabète'],
    deathsLabel: 'M décès/an',
    allDeaths: 'de tous les décès',
    preventable: 'évitables',
    potential: 'Potentiel',
    yearsUnit: 'années de vie supplémentaires',
    factsBox: 'Combinées : réduire les quatre maladies par des changements de mode de vie ajoute +10 à +15 ans d\'espérance de vie. Près d\'un décès sur deux dans le monde est lié à des facteurs de risque modifiables : alimentation, exercice, tabagisme, alcool et poids.',
    agingTag: 'LE VRAI FACTEUR DE RISQUE',
    agingTitle: 'Personne ne meurt de vieillesse.',
    agingSub: 'Les gens meurent de maladies. Mais le vieillissement est le plus grand facteur de risque pour presque toutes.',
    agingFacts: [
      'Le risque de décès augmente de façon exponentielle tout au long de l\'âge adulte — doublant environ tous les 7 ans.',
      'Si nous ralentissons le vieillissement biologique de seulement 7 ans, le risque de décès, de fragilité et de handicap est réduit de moitié à chaque âge.',
      'Un individu de 50 ans aurait le profil de santé d\'un individu de 43 ans d\'aujourd\'hui. Un individu de 60 ans ressemblerait à un individu actuel de 53 ans.',
    ],
    agingHallmarksNote: 'Les chercheurs ont identifié 11 caractéristiques biologiques du vieillissement. Beaucoup d\'entre elles sont directement influencées par l\'alimentation.',
    agingSource: 'Source : Kennedy et al. (2016), Cold Spring Harb Perspect Med',
    hallmarksTag: 'HALLMARKS DU VIEILLISSEMENT',
    hallmarksTitle: '11 mécanismes du vieillissement — et ce que votre alimentation fait à chacun.',
    hallmarksSub: 'Chaque hallmark peut être accéléré ou ralenti par ce que vous mangez.',
    animalLabel: 'Produits animaux :',
    plantLabel: 'Végétal :',
    hallmarks: [
      { name: 'AMPK', sub: 'Capteur d\'énergie cellulaire', animal: 'Haute densité calorique + graisses saturées → AMPK inhibée', plant: 'Fibres alimentaires + fenêtres de jeûne → AMPK activée' },
      { name: 'Autophagie', sub: 'Auto-nettoyage cellulaire', animal: 'Excès constant de protéines désactive l\'autophagie', plant: 'Polyphénols + charge calorique réduite → autophagie améliorée' },
      { name: 'mTOR', sub: 'Commutateur de signalisation de croissance', animal: 'Protéines animales (leucine) → mTOR chroniquement suractivé', plant: 'Protéines végétales → mTOR modéré pour la longévité' },
      { name: 'IGF-1', sub: 'Facteur de croissance insulinomimétique', animal: 'Produits laitiers, viande, œufs → IGF-1 à des niveaux favorisant le cancer', plant: 'Aliments végétaux complets → IGF-1 à des niveaux de longévité' },
      { name: 'Raccourcissement des télomères', sub: 'Horloge biologique', animal: 'Inflammation chronique → perte accélérée des télomères', plant: 'Antioxydants + composés anti-inflammatoires → protection des télomères' },
      { name: 'Altérations épigénétiques', sub: 'Interrupteurs d\'expression génique', animal: 'Favorise des profils d\'expression génique pro-inflammatoires', plant: 'Polyphénols + donneurs de méthyle activent les gènes de longévité' },
      { name: 'Dysfonction mitochondriale', sub: 'Défaillance de la centrale énergétique', animal: 'Les graisses saturées altèrent la fonction membranaire mitochondriale', plant: 'AMPK + antioxydants soutiennent l\'intégrité mitochondriale' },
      { name: 'Sénescence cellulaire', sub: 'Cellules zombies', animal: 'Augmente les dommages à l\'ADN → plus de cellules sénescentes s\'accumulent', plant: 'Les flavonoïdes agissent comme sénolytiques, éliminant les cellules zombies' },
      { name: 'Inflammation chronique', sub: 'Inflammaging', animal: 'Graisses saturées + endotoxines déclenchent une inflammation systémique', plant: 'Fibres + polyphénols → acides gras à chaîne courte anti-inflammatoires' },
      { name: 'Stress oxydatif', sub: 'Dommages par les radicaux libres', animal: 'Génère des espèces réactives de l\'oxygène avec peu d\'antioxydants protecteurs', plant: 'Des milliers d\'antioxydants neutralisent les radicaux libres' },
      { name: 'Dysbiose intestinale', sub: 'Perturbation du microbiome', animal: 'Nourrit des bactéries pathogènes, favorise l\'inflammation intestinale', plant: 'Les fibres alimentaires nourrissent les bactéries protectrices → signaux de longévité' },
    ],
    ctaTitle: 'Prenez le contrôle de votre santé.',
    ctaBtn1: 'Commencer avec le Daily Dozen',
    ctaBtn2: 'Mesurer vos biomarqueurs',
    ctaBtn3: 'Apprendre à commencer',
    heatmapTag: 'ALIMENTATION & LONGÉVITÉ',
    heatmapTitle: "Ce que les chercheurs savent sur l'alimentation & le vieillissement sain",
    heatmapSub: "Tessiere et al. (2025) dans Nature Medicine ont suivi 105 015 participants dans deux grandes cohortes (Nurses' Health Study & Health Professionals Follow-up Study) pendant 30 ans — identifiant les aliments qui favorisent ou accélèrent le vieillissement sur 6 résultats de santé.",
    promoteLabel: 'Favorise un vieillissement sain',
    avoidLabel: 'Accélère le vieillissement',
    colHeaders: ['Vieillissement sain', 'Cognitif', 'Physique', 'Santé mentale', 'Sans maladie', 'Survie à 70'],
    dividerLabel: 'Mixte / neutre',
    citation: 'Tessiere et al. (2025), Nature Medicine — 105 015 participants suivis pendant 30 ans.',
  },
  es: {
    eyebrow: 'Ciencia',
    heading: 'Ciencia & Fuentes',
    heroSub: 'Todo lo que hacemos se basa en la mejor evidencia científica disponible. Aquí encontrarás nuestros principios fundamentales y las fuentes clave en las que nos apoyamos.',
    principlesHead: 'Nuestros principios de evidencia',
    refsHead: 'Referencias clave',
    refsBody: 'Una selección de los estudios y obras más importantes que dan forma a nuestras recomendaciones.',
    sourcesHead: 'Nuestras fuentes clave',
    disclaimer: 'Aviso legal',
    disclaimerBody: 'El contenido de Evida Life es para información general y no reemplaza el consejo médico. Para problemas de salud, consulta a un profesional de la salud cualificado.',
    viewStudy: 'Ver estudio',
    visitSite: 'Visitar sitio',
    factsTag: 'LOS HECHOS',
    factsTitle: 'Las principales causas de muerte son prevenibles.',
    factsSub: 'El 57 % de todas las muertes en el mundo son causadas por solo cuatro grupos de enfermedades — y el estilo de vida es el principal factor.',
    diseaseNames: ['Corazón & Cardiovascular', 'Cáncer', 'Enfermedades respiratorias crónicas', 'Diabetes'],
    deathsLabel: 'M muertes/año',
    allDeaths: 'de todas las muertes',
    preventable: 'prevenible',
    potential: 'Potencial',
    yearsUnit: 'años de vida adicionales',
    factsBox: 'Combinadas: reducir las cuatro enfermedades mediante cambios en el estilo de vida añade +10 a +15 años de esperanza de vida. Casi una de cada dos muertes en este planeta está relacionada con factores de riesgo modificables: dieta, ejercicio, tabaco, alcohol y peso.',
    agingTag: 'EL FACTOR DE RIESGO REAL',
    agingTitle: 'Nadie muere de vejez.',
    agingSub: 'Las personas mueren de enfermedades. Pero el envejecimiento es el mayor factor de riesgo para casi todas ellas.',
    agingFacts: [
      'El riesgo de muerte aumenta exponencialmente a lo largo de la adultez — duplicándose aproximadamente cada 7 años.',
      'Si ralentizamos el envejecimiento biológico solo 7 años, el riesgo de muerte, fragilidad y discapacidad se reduce a la mitad a cualquier edad.',
      'Una persona de 50 años tendría el perfil de salud de un actual de 43. Una de 60 años se parecería a una actual de 53.',
    ],
    agingHallmarksNote: 'Los investigadores han identificado 11 características biológicas del envejecimiento. Muchas de ellas están directamente influenciadas por la dieta.',
    agingSource: 'Fuente: Kennedy et al. (2016), Cold Spring Harb Perspect Med',
    hallmarksTag: 'HALLMARKS DEL ENVEJECIMIENTO',
    hallmarksTitle: '11 mecanismos del envejecimiento — y lo que hace tu dieta a cada uno.',
    hallmarksSub: 'Cada hallmark puede acelerarse o ralentizarse según lo que comes.',
    animalLabel: 'Productos animales:',
    plantLabel: 'Vegetal:',
    hallmarks: [
      { name: 'AMPK', sub: 'Sensor de energía celular', animal: 'Alta densidad calórica + grasas saturadas → AMPK inhibida', plant: 'Fibra dietética + ventanas de ayuno → AMPK activada' },
      { name: 'Autofagia', sub: 'Autolimpieza celular', animal: 'Exceso constante de proteínas desactiva la autofagia', plant: 'Polifenoles + carga calórica reducida → autofagia mejorada' },
      { name: 'mTOR', sub: 'Interruptor de señalización de crecimiento', animal: 'Proteína animal (leucina) → mTOR crónicamente sobreactivado', plant: 'Proteína vegetal → mTOR moderado para la longevidad' },
      { name: 'IGF-1', sub: 'Factor de crecimiento insulínico', animal: 'Lácteos, carne, huevos → IGF-1 elevado a niveles pro-cáncer', plant: 'Alimentos vegetales integrales → IGF-1 a niveles de longevidad' },
      { name: 'Acortamiento de telómeros', sub: 'Reloj biológico', animal: 'Inflamación crónica → pérdida acelerada de telómeros', plant: 'Antioxidantes + compuestos antiinflamatorios → protección de telómeros' },
      { name: 'Alteraciones epigenéticas', sub: 'Interruptores de expresión génica', animal: 'Promueve patrones de expresión génica proinflamatorios', plant: 'Polifenoles + donantes de metilo activan genes de longevidad' },
      { name: 'Disfunción mitocondrial', sub: 'Fallo de la central energética', animal: 'Las grasas saturadas dañan la función de la membrana mitocondrial', plant: 'AMPK + antioxidantes apoyan la integridad mitocondrial' },
      { name: 'Senescencia celular', sub: 'Células zombi', animal: 'Aumenta el daño al ADN → más células senescentes se acumulan', plant: 'Los flavonoides actúan como senolíticos, eliminando células zombi' },
      { name: 'Inflamación crónica', sub: 'Inflammaging', animal: 'Grasas saturadas + endotoxinas desencadenan inflamación sistémica', plant: 'Fibra + polifenoles → ácidos grasos de cadena corta antiinflamatorios' },
      { name: 'Estrés oxidativo', sub: 'Daño por radicales libres', animal: 'Genera especies reactivas de oxígeno con pocos antioxidantes protectores', plant: 'Miles de antioxidantes neutralizan los radicales libres' },
      { name: 'Disbiosis intestinal', sub: 'Alteración del microbioma', animal: 'Alimenta bacterias patógenas, promueve la inflamación intestinal', plant: 'La fibra alimenta bacterias protectoras → señales de longevidad' },
    ],
    ctaTitle: 'Toma el control de tu salud.',
    ctaBtn1: 'Empezar con el Daily Dozen',
    ctaBtn2: 'Medir tus biomarcadores',
    ctaBtn3: 'Aprender cómo empezar',
    heatmapTag: 'ALIMENTACIÓN & LONGEVIDAD',
    heatmapTitle: 'Lo que los investigadores saben sobre alimentación y envejecimiento saludable',
    heatmapSub: "Tessiere et al. (2025) en Nature Medicine siguieron a 105.015 participantes en dos grandes cohortes (Nurses' Health Study & Health Professionals Follow-up Study) durante 30 años — identificando qué alimentos promueven o aceleran el envejecimiento en 6 resultados de salud.",
    promoteLabel: 'Promueve el envejecimiento saludable',
    avoidLabel: 'Acelera el envejecimiento',
    colHeaders: ['Envej. sano', 'Cognitivo', 'Físico', 'Salud mental', 'Sin enfermedad', 'Superv. a 70'],
    dividerLabel: 'Mixto / neutro',
    citation: 'Tessiere et al. (2025), Nature Medicine — 105.015 participantes seguidos durante 30 años.',
  },
  it: {
    eyebrow: 'Scienza',
    heading: 'Scienza & Fonti',
    heroSub: 'Tutto ciò che facciamo si basa sulle migliori prove scientifiche disponibili. Qui trovi i nostri principi fondamentali e le fonti chiave su cui ci basiamo.',
    principlesHead: 'I nostri principi di evidenza',
    refsHead: 'Riferimenti chiave',
    refsBody: 'Una selezione degli studi e delle opere più importanti che plasmano le nostre raccomandazioni.',
    sourcesHead: 'Le nostre fonti chiave',
    disclaimer: 'Avvertenza',
    disclaimerBody: 'Il contenuto di Evida Life è a scopo informativo generale e non sostituisce il parere medico. Per problemi di salute, consulta un professionista sanitario qualificato.',
    viewStudy: 'Vedi studio',
    visitSite: 'Visita il sito',
    factsTag: 'I FATTI',
    factsTitle: 'Le principali cause di morte sono prevenibili.',
    factsSub: "Il 57% di tutti i decessi nel mondo è causato da soli quattro gruppi di malattie — e lo stile di vita è il principale fattore.",
    diseaseNames: ['Cuore & Cardiovascolare', 'Cancro', 'Malattie respiratorie croniche', 'Diabete'],
    deathsLabel: 'M decessi/anno',
    allDeaths: 'di tutti i decessi',
    preventable: 'prevenibile',
    potential: 'Potenziale',
    yearsUnit: 'anni di vita in più',
    factsBox: "Combinate: ridurre tutte e quattro le malattie attraverso cambiamenti nello stile di vita aggiunge da +10 a +15 anni di aspettativa di vita. Quasi uno su due decessi su questo pianeta è legato a fattori di rischio modificabili: dieta, esercizio, fumo, alcol e peso.",
    agingTag: 'IL VERO FATTORE DI RISCHIO',
    agingTitle: 'Nessuno muore di vecchiaia.',
    agingSub: 'Le persone muoiono di malattie. Ma l\'invecchiamento è il singolo maggiore fattore di rischio per quasi tutte.',
    agingFacts: [
      'Il rischio di morte aumenta esponenzialmente durante l\'età adulta — raddoppiando circa ogni 7 anni.',
      'Se rallentiamo l\'invecchiamento biologico di soli 7 anni, il rischio di morte, fragilità e disabilità si dimezza ad ogni età.',
      'Un 50enne avrebbe il profilo di salute di un attuale 43enne. Un 60enne assomiglierebbe a un attuale 53enne.',
    ],
    agingHallmarksNote: 'I ricercatori hanno identificato 11 caratteristiche biologiche dell\'invecchiamento. Molte di esse sono direttamente influenzate dall\'alimentazione.',
    agingSource: 'Fonte: Kennedy et al. (2016), Cold Spring Harb Perspect Med',
    hallmarksTag: 'HALLMARKS DELL\'INVECCHIAMENTO',
    hallmarksTitle: '11 meccanismi dell\'invecchiamento — e cosa fa la tua dieta a ciascuno.',
    hallmarksSub: 'Ogni hallmark può essere accelerato o rallentato da ciò che mangi.',
    animalLabel: 'Prodotti animali:',
    plantLabel: 'Vegetale:',
    hallmarks: [
      { name: 'AMPK', sub: 'Sensore energetico cellulare', animal: 'Alta densità calorica + grassi saturi → AMPK inibita', plant: 'Fibre alimentari + finestre di digiuno → AMPK attivata' },
      { name: 'Autofagia', sub: 'Autopulizia cellulare', animal: 'Eccesso costante di proteine disattiva l\'autofagia', plant: 'Polifenoli + carico calorico ridotto → autofagia potenziata' },
      { name: 'mTOR', sub: 'Interruttore di segnalazione della crescita', animal: 'Proteine animali (leucina) → mTOR cronicamente iperattivato', plant: 'Proteine vegetali → mTOR moderato per la longevità' },
      { name: 'IGF-1', sub: 'Fattore di crescita insulino-simile', animal: 'Latticini, carne, uova → IGF-1 elevato a livelli pro-cancro', plant: 'Alimenti vegetali integrali → IGF-1 a livelli di longevità' },
      { name: 'Accorciamento dei telomeri', sub: 'Orologio biologico', animal: 'Infiammazione cronica → perdita accelerata dei telomeri', plant: 'Antiossidanti + composti antinfiammatori → protezione dei telomeri' },
      { name: 'Alterazioni epigenetiche', sub: 'Interruttori dell\'espressione genica', animal: 'Promuove profili di espressione genica pro-infiammatoria', plant: 'Polifenoli + donatori di metile attivano geni della longevità' },
      { name: 'Disfunzione mitocondriale', sub: 'Guasto della centrale energetica', animal: 'I grassi saturi compromettono la funzione della membrana mitocondriale', plant: 'AMPK + antiossidanti supportano l\'integrità mitocondriale' },
      { name: 'Senescenza cellulare', sub: 'Cellule zombi', animal: 'Aumenta il danno al DNA → si accumulano più cellule senescenti', plant: 'I flavonoidi agiscono come senolitici, eliminando le cellule zombi' },
      { name: 'Infiammazione cronica', sub: 'Inflammaging', animal: 'Grassi saturi + endotossine scatenano infiammazione sistemica', plant: 'Fibra + polifenoli → acidi grassi a catena corta antinfiammatori' },
      { name: 'Stress ossidativo', sub: 'Danno da radicali liberi', animal: 'Genera specie reattive dell\'ossigeno con pochi antiossidanti protettivi', plant: 'Migliaia di antiossidanti neutralizzano i radicali liberi' },
      { name: 'Disbiosi intestinale', sub: 'Alterazione del microbioma', animal: 'Nutre batteri patogeni, promuove l\'infiammazione intestinale', plant: 'Le fibre alimentano batteri protettivi → segnali di longevità' },
    ],
    ctaTitle: 'Prendi il controllo della tua salute.',
    ctaBtn1: 'Inizia con il Daily Dozen',
    ctaBtn2: 'Misura i tuoi biomarcatori',
    ctaBtn3: 'Scopri come iniziare',
    heatmapTag: 'ALIMENTAZIONE & LONGEVITÀ',
    heatmapTitle: 'Cosa sanno i ricercatori su alimentazione e invecchiamento sano',
    heatmapSub: "Tessiere et al. (2025) su Nature Medicine hanno seguito 105.015 partecipanti in due grandi coorti (Nurses' Health Study & Health Professionals Follow-up Study) per 30 anni — identificando gli alimenti che favoriscono o accelerano l'invecchiamento su 6 esiti di salute.",
    promoteLabel: "Favorisce l'invecchiamento sano",
    avoidLabel: "Accelera l'invecchiamento",
    colHeaders: ['Inv. sano', 'Cognitivo', 'Fisico', 'Mentale', 'Senza malattia', 'A 70 anni'],
    dividerLabel: 'Misto / neutro',
    citation: "Tessiere et al. (2025), Nature Medicine — 105.015 partecipanti seguiti per 30 anni.",
  },
};

export default async function SciencePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">

        {/* Hero */}
        <section className="w-full bg-[#0e393d] px-6 pt-28 pb-20">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">{t.heading}</h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">{t.heroSub}</p>
          </div>
        </section>

        {/* Evidence principles */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.principlesHead}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title.en} className="rounded-2xl border border-[#0e393d]/10 bg-white p-6">
                <span className="text-2xl mb-3 block">{p.icon}</span>
                <h3 className="font-serif text-lg text-[#0e393d] mb-2">{(p.title as Record<string, string>)[lang] ?? p.title.en}</h3>
                <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{(p.body as Record<string, string>)[lang] ?? p.body.en}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Key references */}
        <section className="w-full bg-white border-y border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.refsHead}</p>
            <p className="text-[#1c2a2b]/55 text-sm mb-8">{t.refsBody}</p>
            <div className="space-y-3">
              {REFS.map((ref) => (
                <div key={ref.link} className="rounded-xl border border-[#0e393d]/10 bg-[#fafaf8] px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0e393d] leading-snug mb-1">
                      {(ref.title as Record<string, string>)[lang] ?? ref.title.en}
                    </p>
                    <p className="text-xs text-[#1c2a2b]/45">
                      {ref.authors} · <span className="italic">{ref.journal}</span> · {ref.year}
                    </p>
                  </div>
                  <a
                    href={ref.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-[#0e393d]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0e393d] hover:border-[#0e393d]/35 hover:bg-[#0e393d]/4 transition"
                  >
                    {t.viewStudy}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key sources */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-6">{t.sourcesHead}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCES.map((s) => (
              <a
                key={s.link}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-[#0e393d]/10 bg-white p-5 hover:border-[#0e393d]/25 hover:shadow-sm transition-all duration-200 flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-[#0e393d] group-hover:text-[#1a5055] transition-colors">{s.name}</p>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0e393d]/30 group-hover:text-[#0e393d]/60 transition-colors shrink-0">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </div>
                <p className="text-xs text-[#1c2a2b]/50 leading-relaxed">{(s.desc as Record<string, string>)[lang] ?? s.desc.en}</p>
              </a>
            ))}
          </div>
        </section>

        {/* ── Disease table ── */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 border-b border-[#0e393d]/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.factsTag}</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-3 leading-tight">{t.factsTitle}</h2>
          <p className="text-sm text-[#1c2a2b]/60 mb-8 leading-relaxed max-w-2xl">{t.factsSub}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {DISEASES.map((d, i) => (
              <div key={i} className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{d.emoji}</span>
                  <span className="text-xs font-semibold text-[#0e393d]/40 uppercase tracking-wide">{d.pct}% {t.allDeaths}</span>
                </div>
                <p className="font-serif text-[1.1rem] text-[#0e393d] mb-1 leading-snug">{t.diseaseNames[i]}</p>
                <p className="text-2xl font-light text-[#0e393d] mb-4">~{d.deathsM}M <span className="text-sm text-[#5a6e6f]">{t.deathsLabel}</span></p>

                {/* Preventable bar */}
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[#5a6e6f] font-medium">{t.preventable}</span>
                  <span className="text-[10px] font-semibold text-emerald-600">{d.preventLow}–{d.preventHigh}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0e393d]/8 mb-4">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${d.preventPct}%` }}
                  />
                </div>

                <p className="text-[11px] text-[#ceab84] font-medium">{t.potential}: +{d.yearsLow}–{d.yearsHigh} {t.yearsUnit}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-emerald-50 ring-1 ring-emerald-200 px-6 py-5">
            <p className="text-sm text-emerald-900/80 leading-relaxed">{t.factsBox}</p>
          </div>
        </section>

        {/* ── Aging section ── */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 border-b border-[#0e393d]/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.agingTag}</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-3 leading-tight">{t.agingTitle}</h2>
          <p className="text-sm text-[#1c2a2b]/60 mb-8 leading-relaxed max-w-2xl">{t.agingSub}</p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {t.agingFacts.map((fact, i) => (
              <div key={i} className="bg-[#0e393d] rounded-xl p-6 text-white">
                <span className="block text-[#ceab84] text-[10px] font-semibold uppercase tracking-[0.14em] mb-3">0{i + 1}</span>
                <p className="text-[0.88rem] text-white/70 leading-relaxed">{fact}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#ceab84]/30 bg-[#ceab84]/6 px-6 py-5">
            <p className="text-sm text-[#8a6a3e] leading-relaxed mb-3">{t.agingHallmarksNote}</p>
            <p className="text-xs text-[#8a6a3e]/60">
              {t.agingSource} ·{' '}
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/26417092/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#8a6a3e] transition-colors"
              >
                PubMed
              </a>
            </p>
          </div>
        </section>

        {/* ── Hallmarks of Aging ── */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 border-b border-[#0e393d]/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.hallmarksTag}</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-3 leading-tight">{t.hallmarksTitle}</h2>
          <p className="text-sm text-[#1c2a2b]/60 mb-8 leading-relaxed max-w-2xl">{t.hallmarksSub}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.hallmarks.map((h: { name: string; sub: string; animal: string; plant: string }, i: number) => (
              <div key={i} className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 p-5 flex flex-col gap-3">
                <div>
                  <p className="font-serif text-[1rem] text-[#0e393d] leading-snug">{h.name}</p>
                  <p className="text-[0.75rem] text-[#5a6e6f] mt-0.5">{h.sub}</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-[#0e393d]/8">
                  <p className="text-[0.75rem] leading-snug">
                    <span className="text-red-500 font-medium">🔴 {t.animalLabel} </span>
                    <span className="text-red-700/70">{h.animal}</span>
                  </p>
                  <p className="text-[0.75rem] leading-snug">
                    <span className="text-emerald-600 font-medium">🟢 {t.plantLabel} </span>
                    <span className="text-emerald-700/70">{h.plant}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Food & Longevity heatmap */}
        <section className="w-full bg-white border-y border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.heatmapTag}</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-3 leading-tight">{t.heatmapTitle}</h2>
            <p className="text-sm text-[#1c2a2b]/60 mb-8 leading-relaxed">{t.heatmapSub}</p>

            <div className="overflow-x-auto -mx-6 px-6">
              <div className="min-w-[620px]">

                {/* Column headers */}
                <div className="flex mb-0.5">
                  <div className="shrink-0" style={{ width: 164 }} />
                  {t.colHeaders.map((h, ci) => (
                    <div key={ci} className="flex-1 flex items-end justify-center pb-1" style={{ height: 86 }}>
                      <span
                        className="text-[9px] font-semibold uppercase tracking-wide text-[#0e393d]/55 text-center leading-tight block"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                      >
                        {h}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Promote rows */}
                {HP.map((row) => (
                  <div key={row.food} className="flex border-b border-gray-50 last:border-0">
                    <div
                      className="shrink-0 pr-2 text-right text-[10.5px] text-[#1c2a2b]/55 flex items-center justify-end leading-tight"
                      style={{ width: 164, height: 22 }}
                    >
                      {row.food}
                    </div>
                    {row.cells.map((v, ci) => (
                      <div key={ci} className={`flex-1 m-[2px] rounded-[2px] ${cellCls(v)}`} style={{ height: 18 }} />
                    ))}
                  </div>
                ))}

                {/* Divider: mixed/neutral */}
                <div className="flex items-center gap-3 my-2">
                  <div className="shrink-0" style={{ width: 164 }} />
                  <div className="flex-1 h-px bg-[#0e393d]/10" />
                  <span className="text-[9px] uppercase tracking-[0.14em] text-[#0e393d]/40 whitespace-nowrap shrink-0">
                    {t.dividerLabel}
                  </span>
                  <div className="flex-1 h-px bg-[#0e393d]/10" />
                </div>

                {/* Mixed rows */}
                {HM.map((row) => (
                  <div key={row.food} className="flex border-b border-gray-50 last:border-0">
                    <div
                      className="shrink-0 pr-2 text-right text-[10.5px] text-[#1c2a2b]/55 flex items-center justify-end leading-tight"
                      style={{ width: 164, height: 22 }}
                    >
                      {row.food}
                    </div>
                    {row.cells.map((v, ci) => (
                      <div key={ci} className={`flex-1 m-[2px] rounded-[2px] ${cellCls(v)}`} style={{ height: 18 }} />
                    ))}
                  </div>
                ))}

                {/* Divider before avoid */}
                <div className="flex items-center gap-3 my-2">
                  <div className="shrink-0" style={{ width: 164 }} />
                  <div className="flex-1 h-px bg-[#0e393d]/10" />
                </div>

                {/* Avoid rows */}
                {HA.map((row) => (
                  <div key={row.food} className="flex border-b border-gray-50 last:border-0">
                    <div
                      className="shrink-0 pr-2 text-right text-[10.5px] text-[#1c2a2b]/55 flex items-center justify-end leading-tight"
                      style={{ width: 164, height: 22 }}
                    >
                      {row.food}
                    </div>
                    {row.cells.map((v, ci) => (
                      <div key={ci} className={`flex-1 m-[2px] rounded-[2px] ${cellCls(v)}`} style={{ height: 18 }} />
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="shrink-0" style={{ width: 164 }} />
                  <span className="text-[9px] font-semibold text-red-600 whitespace-nowrap shrink-0">← {t.avoidLabel}</span>
                  <div className="flex gap-0.5 flex-1">
                    {([-4, -3, -2, -1, 0, 1, 2, 3, 4] as CellVal[]).map((v) => (
                      <div key={v} className={`flex-1 h-3 rounded-[1px] ${cellCls(v)}`} />
                    ))}
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-700 whitespace-nowrap shrink-0">{t.promoteLabel} →</span>
                </div>
              </div>
            </div>

            {/* Citation */}
            <p className="mt-6 text-xs text-[#1c2a2b]/40 leading-relaxed">
              {t.citation}
              {' · '}
              <a
                href="https://pubmed.ncbi.nlm.nih.gov/40128348/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1c2a2b]/60 transition-colors"
              >
                PubMed
              </a>
              {' · '}
              <a
                href="https://www.nature.com/articles/s41591-025-03570-5"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1c2a2b]/60 transition-colors"
              >
                Nature Medicine
              </a>
              {' · '}
              <a
                href="https://www.nature.com/articles/s41591-025-03570-5/figures/4"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#1c2a2b]/60 transition-colors"
              >
                Figure 4
              </a>
            </p>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="w-full max-w-3xl mx-auto px-6 pb-16">
          <div className="rounded-2xl border border-[#ceab84]/30 bg-[#ceab84]/6 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#8a6a3e] mb-2">{t.disclaimer}</p>
            <p className="text-sm text-[#8a6a3e]/80 leading-relaxed">{t.disclaimerBody}</p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="w-full max-w-5xl mx-auto px-6 pb-16">
          <div className="rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14 text-center">
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-8 leading-tight">{t.ctaTitle}</h2>
            <div className="flex gap-3 flex-wrap justify-center">
              <a
                href="/daily-dozen"
                className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
              >
                {t.ctaBtn1}
              </a>
              <a
                href="/shop"
                className="bg-white/10 text-white border border-white/20 text-[13px] font-light px-7 py-3.5 rounded-full transition-all hover:bg-white/20 whitespace-nowrap"
              >
                {t.ctaBtn2}
              </a>
              <a
                href="/how-to-start"
                className="bg-white/10 text-white border border-white/20 text-[13px] font-light px-7 py-3.5 rounded-full transition-all hover:bg-white/20 whitespace-nowrap"
              >
                {t.ctaBtn3}
              </a>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
