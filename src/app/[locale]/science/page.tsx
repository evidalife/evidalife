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

// ── Food name translations for heatmap ──────────────────────────────────────
const FOOD_TRANS: Record<string, Record<string, string>> = {
  'Fruit':                      { de: 'Obst',                           fr: 'Fruits',                        es: 'Frutas',                        it: 'Frutta' },
  'MUFA:SFA ratio':             { de: 'MUFA:SFA-Verhältnis',            fr: 'Ratio AGMI:AGS',                es: 'Ratio AGM:AGS',                 it: 'Rapporto AGMI:AGS' },
  'Whole grains':               { de: 'Vollkornprodukte',               fr: 'Céréales complètes',            es: 'Cereales integrales',           it: 'Cereali integrali' },
  'Vegetables':                 { de: 'Gemüse',                         fr: 'Légumes',                       es: 'Verduras',                      it: 'Verdure' },
  'Added unsaturated fat':      { de: 'Ungesättigte Fette',             fr: 'Graisses insaturées',           es: 'Grasas insaturadas',            it: 'Grassi insaturi' },
  'Leafy greens':               { de: 'Blattgemüse',                    fr: 'Légumes à feuilles',            es: 'Verduras de hoja',              it: 'Verdure a foglia' },
  'Nuts':                       { de: 'Nüsse',                          fr: 'Noix',                          es: 'Frutos secos',                  it: 'Noci' },
  'Nuts & legumes':             { de: 'Nüsse & Hülsenfrüchte',          fr: 'Noix & légumineuses',           es: 'Frutos secos & legumbres',      it: 'Noci & legumi' },
  'Dark-yellow vegetables':     { de: 'Dunkelgelbes Gemüse',            fr: 'Légumes jaune foncé',           es: 'Verduras amarillo oscuro',      it: 'Verdure giallo scure' },
  'Vegetable oils':             { de: 'Pflanzenöle',                    fr: 'Huiles végétales',              es: 'Aceites vegetales',             it: 'Oli vegetali' },
  'Berries':                    { de: 'Beeren',                         fr: 'Baies',                         es: 'Bayas',                         it: 'Frutti di bosco' },
  'Yogurt':                     { de: 'Joghurt',                        fr: 'Yaourt',                        es: 'Yogur',                         it: 'Yogurt' },
  'Low-fat dairy':              { de: 'Fettarme Milchprodukte',         fr: 'Produits laitiers allégés',     es: 'Lácteos bajos en grasa',        it: 'Latticini magri' },
  'Olive oil':                  { de: 'Olivenöl',                       fr: "Huile d'olive",                 es: 'Aceite de oliva',               it: "Olio d'oliva" },
  'Omega-3 fatty acids':        { de: 'Omega-3-Fettsäuren',             fr: 'Acides gras oméga-3',           es: 'Ácidos grasos omega-3',         it: 'Acidi grassi omega-3' },
  'Beans':                      { de: 'Bohnen',                         fr: 'Haricots',                      es: 'Judías',                        it: 'Fagioli' },
  'Soy':                        { de: 'Soja',                           fr: 'Soja',                          es: 'Soja',                          it: 'Soia' },
  'Legumes':                    { de: 'Hülsenfrüchte',                  fr: 'Légumineuses',                  es: 'Legumbres',                     it: 'Legumi' },
  'Coffee & tea':               { de: 'Kaffee & Tee',                   fr: 'Café & thé',                    es: 'Café & té',                     it: 'Caffè & tè' },
  'Wine':                       { de: 'Wein',                           fr: 'Vin',                           es: 'Vino',                          it: 'Vino' },
  'Fish & seafood':             { de: 'Fisch & Meeresfrüchte',          fr: 'Poisson & fruits de mer',       es: 'Pescado & mariscos',            it: 'Pesce & frutti di mare' },
  'Total dairy':                { de: 'Milchprodukte',                  fr: 'Produits laitiers',             es: 'Lácteos totales',               it: 'Latticini totali' },
  'Eggs':                       { de: 'Eier',                           fr: 'Œufs',                          es: 'Huevos',                        it: 'Uova' },
  'Poultry':                    { de: 'Geflügel',                       fr: 'Volaille',                      es: 'Aves de corral',                it: 'Pollame' },
  'Trans fats':                 { de: 'Transfette',                     fr: 'Graisses trans',                es: 'Grasas trans',                  it: 'Grassi trans' },
  'Total meats':                { de: 'Fleisch gesamt',                 fr: 'Viandes totales',               es: 'Carnes totales',                it: 'Carni totali' },
  'Red & processed meats':      { de: 'Rotes & verarbeitetes Fleisch',  fr: 'Viandes rouges & transformées', es: 'Carnes rojas & procesadas',    it: 'Carni rosse & lavorate' },
  'Processed meat':             { de: 'Verarbeitetes Fleisch',          fr: 'Viande transformée',            es: 'Carne procesada',               it: 'Carne lavorata' },
  'Sodium':                     { de: 'Natrium',                        fr: 'Sodium',                        es: 'Sodio',                         it: 'Sodio' },
  'Unprocessed red meat':       { de: 'Unverarbeitetes rotes Fleisch',  fr: 'Viande rouge non transformée', es: 'Carne roja no procesada',        it: 'Carne rossa non lavorata' },
  'Added sat. fat & trans fat': { de: 'Gesättigte Fette & Transfette',  fr: 'Graisses saturées & trans',     es: 'Grasas saturadas & trans',      it: 'Grassi saturi & trans' },
  'French fries':               { de: 'Pommes frites',                  fr: 'Frites',                        es: 'Patatas fritas',                it: 'Patatine fritte' },
  'Butter':                     { de: 'Butter',                         fr: 'Beurre',                        es: 'Mantequilla',                   it: 'Burro' },
  'Sugar-sweetened beverages':  { de: 'Zuckerhaltige Getränke',         fr: 'Boissons sucrées',              es: 'Bebidas azucaradas',            it: 'Bevande zuccherate' },
  'High-fat dairy':             { de: 'Fettreiche Milchprodukte',       fr: 'Produits laitiers entiers',     es: 'Lácteos altos en grasa',        it: 'Latticini grassi' },
  'Refined grains':             { de: 'Raffiniertes Getreide',          fr: 'Céréales raffinées',            es: 'Cereales refinados',            it: 'Cereali raffinati' },
  'Fast & fried foods':         { de: 'Fast Food & Frittiertes',        fr: 'Fast-food & friture',           es: 'Comida rápida & frita',         it: 'Fast food & fritti' },
};
function getFoodName(food: string, lang: string): string {
  if (lang === 'en') return food;
  return FOOD_TRANS[food]?.[lang] ?? food;
}

// ── Evidence pyramid visual config (top=strongest → bottom=weakest) ─────────
const PYRAMID_VISUAL = [
  { widthPct: 28,  bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800' },
  { widthPct: 46,  bg: 'bg-lime-50',    border: 'border-lime-300',    text: 'text-lime-800' },
  { widthPct: 64,  bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-800' },
  { widthPct: 82,  bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-800' },
  { widthPct: 100, bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800' },
] as const;

// ── Disease reversal cards ───────────────────────────────────────────────────
type LangStr = { de: string; en: string; fr: string; es: string; it: string };
interface ReversalCard { icon: string; title: LangStr; body: LangStr; refs: { text: string; link: string }[]; }

const REVERSAL_CARDS: ReversalCard[] = [
  {
    icon: '❤️',
    title: {
      en: 'Heart disease: reversed in clinical trials',
      de: 'Herzerkrankung: In klinischen Studien umgekehrt',
      fr: 'Maladies cardiaques : inversées dans des essais cliniques',
      es: 'Enfermedad cardíaca: revertida en ensayos clínicos',
      it: 'Malattie cardiache: invertite in trial clinici',
    },
    body: {
      en: 'In 1990, Dr. Dean Ornish published a landmark randomized controlled trial in The Lancet showing that a plant-based diet with lifestyle changes could reverse coronary heart disease — arteries actually opened back up. The 5-year follow-up (JAMA, 1998) showed even more reversal. Medicare now covers the Ornish Reversal Program based on this evidence.',
      de: '1990 veröffentlichte Dr. Dean Ornish eine wegweisende randomisierte Studie im The Lancet, die zeigte, dass eine pflanzliche Ernährung mit Lebensstilveränderungen Koronare Herzerkrankungen umkehren kann — die Arterien öffneten sich tatsächlich wieder. Die 5-Jahres-Nachbeobachtung (JAMA, 1998) zeigte noch mehr Rückbildung. Medicare deckt das Ornish Reversal Program auf Basis dieser Evidenz ab.',
      fr: 'En 1990, le Dr Dean Ornish a publié un essai contrôlé randomisé dans The Lancet montrant qu\'un régime végétal associé à des changements de mode de vie pouvait inverser les maladies coronariennes — les artères s\'ouvraient réellement. Le suivi à 5 ans (JAMA, 1998) a montré encore plus de régression. Medicare couvre désormais le programme Ornish Reversal sur la base de ces preuves.',
      es: 'En 1990, el Dr. Dean Ornish publicó un ensayo controlado aleatorizado histórico en The Lancet que mostraba que una dieta basada en plantas con cambios en el estilo de vida podía revertir la enfermedad coronaria — las arterias realmente volvían a abrirse. El seguimiento a 5 años (JAMA, 1998) mostró aún más reversión. Medicare ahora cubre el Programa de Reversión de Ornish basándose en esta evidencia.',
      it: 'Nel 1990, il Dr. Dean Ornish ha pubblicato un trial controllato randomizzato storico su The Lancet dimostrando che una dieta a base vegetale con cambiamenti dello stile di vita poteva invertire le malattie coronariche — le arterie si riaprirono effettivamente. Il follow-up a 5 anni (JAMA, 1998) ha mostrato ancora più regressione. Medicare copre ora il Programma di Reversione Ornish sulla base di queste prove.',
    },
    refs: [
      { text: 'Ornish D. et al., The Lancet, 1990 — "Can lifestyle changes reverse coronary heart disease?"', link: 'https://pubmed.ncbi.nlm.nih.gov/1973470/' },
      { text: 'Ornish D. et al., JAMA, 1998 — "Intensive lifestyle changes for reversal of coronary heart disease"', link: 'https://pubmed.ncbi.nlm.nih.gov/9863851/' },
      { text: 'Esselstyn C.B. et al., Journal of Family Practice, 2014 — "A way to reverse coronary artery disease"', link: 'https://pubmed.ncbi.nlm.nih.gov/25198208/' },
    ],
  },
  {
    icon: '🎗️',
    title: {
      en: 'Cancer: slowed and reversed in trials',
      de: 'Krebs: In Studien verlangsamt und umgekehrt',
      fr: 'Cancer : ralenti et inversé dans des essais',
      es: 'Cáncer: ralentizado y revertido en ensayos',
      it: 'Cancro: rallentato e invertito nei trial',
    },
    body: {
      en: 'In the Prostate Cancer Lifestyle Trial (93 patients, randomized), Dr. Ornish showed that a plant-based diet slowed or reversed early-stage prostate cancer progression. Blood from patients on the plant-based diet inhibited cancer cell growth by 70% in vitro, vs. only 9% in the control group. After 2 years, none of the lifestyle group needed surgery — vs. 5 patients in the control group. Similar mechanisms have been shown for breast cancer.',
      de: 'Im Prostate Cancer Lifestyle Trial (93 Patienten, randomisiert) zeigte Dr. Ornish, dass eine pflanzliche Ernährung die Progression von Prostatakrebs im Frühstadium verlangsamte oder umkehrte. Blut von Patienten der pflanzlichen Gruppe hemmte das Krebszellwachstum in vitro um 70 % — gegenüber nur 9 % in der Kontrollgruppe. Nach 2 Jahren benötigte niemand aus der Lebensstilgruppe eine Operation — gegenüber 5 Patienten in der Kontrollgruppe. Ähnliche Mechanismen wurden für Brustkrebs nachgewiesen.',
      fr: 'Dans le Prostate Cancer Lifestyle Trial (93 patients, randomisé), le Dr Ornish a montré qu\'un régime végétal ralentissait ou inversait la progression du cancer de la prostate à un stade précoce. Le sang des patients du groupe végétal inhibait la croissance des cellules cancéreuses de 70 % in vitro, contre seulement 9 % dans le groupe témoin. Après 2 ans, aucun patient du groupe mode de vie n\'a nécessité de chirurgie — contre 5 dans le groupe témoin.',
      es: 'En el Prostate Cancer Lifestyle Trial (93 pacientes, aleatorizado), el Dr. Ornish demostró que una dieta basada en plantas ralentizaba o revertía la progresión del cáncer de próstata en estadio temprano. La sangre de los pacientes con dieta vegetal inhibía el crecimiento de células cancerosas en un 70 % in vitro, frente a solo un 9 % en el grupo de control. Después de 2 años, ninguno del grupo de estilo de vida necesitó cirugía — frente a 5 pacientes en el grupo de control.',
      it: 'Nel Prostate Cancer Lifestyle Trial (93 pazienti, randomizzato), il Dr. Ornish ha dimostrato che una dieta a base vegetale rallentava o invertiva la progressione del cancro alla prostata in stadio precoce. Il sangue dei pazienti con dieta vegetale inibiva la crescita delle cellule tumorali del 70 % in vitro, contro solo il 9 % nel gruppo di controllo. Dopo 2 anni, nessuno del gruppo di stile di vita aveva bisogno di chirurgia — contro 5 pazienti nel gruppo di controllo.',
    },
    refs: [
      { text: 'Ornish D. et al., Journal of Urology, 2005 — "Intensive lifestyle changes may affect the progression of prostate cancer"', link: 'https://pubmed.ncbi.nlm.nih.gov/16094059/' },
      { text: 'Ornish D. et al., Lancet Oncology, 2008 — "Increased telomerase activity and comprehensive lifestyle changes"', link: 'https://pubmed.ncbi.nlm.nih.gov/18799354/' },
      { text: 'Ornish D. et al., PNAS, 2008 — "Changes in gene expression in prostate and breast cancer"', link: 'https://pubmed.ncbi.nlm.nih.gov/18559852/' },
    ],
  },
  {
    icon: '💉',
    title: {
      en: 'Type 2 diabetes: put into remission',
      de: 'Typ-2-Diabetes: In Remission versetzt',
      fr: 'Diabète de type 2 : mis en rémission',
      es: 'Diabetes tipo 2: puesta en remisión',
      it: 'Diabete di tipo 2: messo in remissione',
    },
    body: {
      en: 'Multiple randomized trials have shown that plant-based diets can improve insulin sensitivity, lower HbA1c, and in many cases achieve full remission of type 2 diabetes — often more effectively than medication alone. The American College of Lifestyle Medicine now recommends plant-based nutrition as first-line treatment for type 2 diabetes.',
      de: 'Mehrere randomisierte Studien haben gezeigt, dass pflanzliche Ernährungsweisen die Insulinsensitivität verbessern, den HbA1c-Wert senken und in vielen Fällen eine vollständige Remission von Typ-2-Diabetes erreichen können — oft wirksamer als Medikamente allein. Das American College of Lifestyle Medicine empfiehlt pflanzliche Ernährung nun als Erstlinienbehandlung für Typ-2-Diabetes.',
      fr: 'Plusieurs essais randomisés ont montré que les régimes végétaux peuvent améliorer la sensibilité à l\'insuline, abaisser l\'HbA1c et, dans de nombreux cas, obtenir une rémission complète du diabète de type 2 — souvent plus efficacement que les médicaments seuls. L\'American College of Lifestyle Medicine recommande désormais la nutrition végétale comme traitement de première intention.',
      es: 'Múltiples ensayos aleatorizados han demostrado que las dietas basadas en plantas pueden mejorar la sensibilidad a la insulina, reducir la HbA1c y en muchos casos lograr la remisión completa de la diabetes tipo 2 — a menudo de manera más efectiva que solo con medicamentos. El American College of Lifestyle Medicine recomienda ahora la nutrición basada en plantas como tratamiento de primera línea.',
      it: 'Molteplici trial randomizzati hanno dimostrato che le diete a base vegetale possono migliorare la sensibilità all\'insulina, ridurre l\'HbA1c e in molti casi ottenere la remissione completa del diabete di tipo 2 — spesso in modo più efficace dei soli farmaci. L\'American College of Lifestyle Medicine raccomanda ora la nutrizione a base vegetale come trattamento di prima linea.',
    },
    refs: [
      { text: 'Satija A. et al., PLOS Medicine, 2016 — "Plant-based dietary patterns and incidence of type 2 diabetes"', link: 'https://pubmed.ncbi.nlm.nih.gov/27299701/' },
      { text: 'Barnard N.D. et al., Diabetes Care, 2006 — "A low-fat vegan diet improves glycemic control"', link: 'https://pubmed.ncbi.nlm.nih.gov/16873779/' },
      { text: 'Rosenfeld R.M. et al., Am J Lifestyle Med, 2022 — "Dietary interventions to treat type 2 diabetes: expert consensus"', link: 'https://pubmed.ncbi.nlm.nih.gov/35813330/' },
    ],
  },
];

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
      fr: 'Les Zones Bleues : Leçons pour vivre plus longtemps',
      es: 'Las Zonas Azules: Lecciones para vivir más',
      it: 'Le Zone Blu: Lezioni per vivere più a lungo',
    },
    journal: 'National Geographic Books',
    year: 2008,
    link: 'https://www.bluezones.com',
  },
  {
    authors: 'Ornish D. et al.',
    title: {
      de: 'Intensive Lebensstiländerungen zur Umkehrung der koronaren Herzkrankheit',
      en: 'Intensive lifestyle changes for reversal of coronary heart disease',
      fr: 'Changements de mode de vie intensifs pour l\'inversion des maladies coronariennes',
      es: 'Cambios intensivos en el estilo de vida para la reversión de la enfermedad coronaria',
      it: 'Cambiamenti intensivi dello stile di vita per la regressione della malattia coronarica',
    },
    journal: 'JAMA',
    year: 1998,
    link: 'https://pubmed.ncbi.nlm.nih.gov/9863851/',
  },
  {
    authors: 'Ornish D. et al.',
    title: {
      de: 'Intensive Lebensstiländerungen können die Progression von Prostatakrebs beeinflussen',
      en: 'Intensive lifestyle changes may affect the progression of prostate cancer',
      fr: 'Les changements de mode de vie intensifs peuvent affecter la progression du cancer de la prostate',
      es: 'Los cambios intensivos en el estilo de vida pueden afectar la progresión del cáncer de próstata',
      it: 'I cambiamenti intensivi dello stile di vita possono influenzare la progressione del cancro alla prostata',
    },
    journal: 'Journal of Urology',
    year: 2005,
    link: 'https://pubmed.ncbi.nlm.nih.gov/16094059/',
  },
  {
    authors: 'Ornish D. et al.',
    title: {
      de: 'Erhöhte Telomeraseaktivität und umfassende Lebensstiländerungen',
      en: 'Increased telomerase activity and comprehensive lifestyle changes',
      fr: 'Augmentation de l\'activité télomérase et changements de mode de vie complets',
      es: 'Mayor actividad de la telomerasa y cambios integrales en el estilo de vida',
      it: 'Aumento dell\'attività della telomerasi e cambiamenti completi dello stile di vita',
    },
    journal: 'Lancet Oncology',
    year: 2008,
    link: 'https://pubmed.ncbi.nlm.nih.gov/18799354/',
  },
  {
    authors: 'Barnard N.D. et al.',
    title: {
      de: 'Eine fettarme vegane Ernährung verbessert die Blutzuckerkontrolle in einer randomisierten Studie',
      en: 'A low-fat vegan diet improves glycemic control and cardiovascular risk factors in a randomized clinical trial',
      fr: 'Un régime végétalien pauvre en graisses améliore le contrôle glycémique dans un essai clinique randomisé',
      es: 'Una dieta vegana baja en grasas mejora el control glucémico en un ensayo clínico aleatorizado',
      it: 'Una dieta vegana a basso contenuto di grassi migliora il controllo glicemico in un trial clinico randomizzato',
    },
    journal: 'Diabetes Care',
    year: 2006,
    link: 'https://pubmed.ncbi.nlm.nih.gov/16873779/',
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
    title: { de: 'Transparente Unsicherheit', en: 'Transparent uncertainty', fr: 'Incertitude transparente', es: 'Incertidumbre transparente', it: 'Incertezza trasparente' },
    body: {
      de: 'Nicht alles ist bewiesen. Wir kommunizieren klar, wo die Evidenz stark ist und wo noch Forschungsbedarf besteht.',
      en: 'Not everything is proven. We clearly communicate where evidence is strong and where further research is needed.',
      fr: 'Tout n\'est pas prouvé. Nous communiquons clairement là où les preuves sont solides et là où des recherches supplémentaires sont nécessaires.',
      es: 'No todo está probado. Comunicamos claramente dónde la evidencia es sólida y dónde se necesita más investigación.',
      it: 'Non tutto è dimostrato. Comunichiamo chiaramente dove le prove sono solide e dove sono necessarie ulteriori ricerche.',
    },
  },
  {
    icon: '🏆',
    title: { de: 'Goldstandard-Fokus', en: 'Gold standard focus', fr: "Focus sur l'étalon-or", es: 'Enfoque en el estándar de oro', it: 'Focus sul gold standard' },
    body: {
      de: 'Der Goldstandard in der medizinischen Forschung ist die randomisierte, doppelblinde, placebokontrollierte klinische Studie. Wir priorisieren Evidenz aus RCTs gegenüber Beobachtungsdaten und systematische Reviews gegenüber Einzelstudien.',
      en: 'The gold standard in medical research is the randomized, double-blind, placebo-controlled clinical trial. We prioritize evidence from RCTs over observational data, and systematic reviews over individual studies.',
      fr: "L'étalon-or de la recherche médicale est l'essai clinique randomisé, en double aveugle et contrôlé par placebo. Nous privilégions les preuves issues des ECR par rapport aux données observationnelles, et les revues systématiques par rapport aux études individuelles.",
      es: 'El estándar de oro en la investigación médica es el ensayo clínico aleatorizado, doble ciego y controlado por placebo. Priorizamos la evidencia de los ECA sobre los datos observacionales, y las revisiones sistemáticas sobre los estudios individuales.',
      it: 'Il gold standard nella ricerca medica è il trial clinico randomizzato, in doppio cieco e controllato con placebo. Privilegiamo le prove degli RCT rispetto ai dati osservazionali, e le revisioni sistematiche rispetto agli studi individuali.',
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
    heroSub: 'In einer Welt voller Social-Media-Gesundheitshype und extremer Diättrends schneiden wir durch den Lärm. Alles auf Evida Life basiert auf dem höchsten Standard wissenschaftlicher Evidenz — begutachtete Forschung und klinische Studien.',
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
    factsBox: 'Zusammengenommen: Alle vier Erkrankungen durch Lebensstiländerungen zu reduzieren, verlängert die Lebenserwartung um +10 bis +15 Jahre. Das sind mehr Todesfälle als in beiden Weltkriegen zusammen — jedes einzelne Jahr. Ernährung ist heute der wichtigste Risikofaktor für frühzeitigen Tod weltweit.',
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
      { name: 'AMPK', sub: 'Zellulärer Energiesensor', animal: 'Hohe Kaloriendichte + gesättigte Fette → AMPK gehemmt', plant: 'Ballaststoffe + Fastenfenster → AMPK aktiviert (Bohnen, Vollkorn, Beeren)' },
      { name: 'Autophagie', sub: 'Zelluläre Selbstreinigung', animal: 'Ständiger Proteinüberschuss schaltet Autophagie ab', plant: 'Polyphenole + reduzierte Kalorienlast → Autophagie gesteigert (grüner Tee, Beeren, Blattgemüse)' },
      { name: 'mTOR', sub: 'Wachstumssignalschalter', animal: 'Tierisches Protein (Leucin) → mTOR chronisch überaktiviert', plant: 'Pflanzliches Protein → mTOR für Langlebigkeit moduliert (Linsen, Tofu, Hanfsamen)' },
      { name: 'IGF-1', sub: 'Insulinähnlicher Wachstumsfaktor', animal: 'Milchprodukte, Fleisch, Eier → IGF-1 auf krebsfördernde Werte erhöht', plant: 'Vollwertige Pflanzenkost → IGF-1 auf Langlebigkeitsniveau (Hülsenfrüchte, Gemüse, Vollkorn)' },
      { name: 'Telomerverkürzung', sub: 'Biologische Uhr', animal: 'Chronische Entzündung → beschleunigter Telomerverlust', plant: 'Antioxidantien + entzündungshemmende Substanzen → Telomerschutz (Blaubeeren, Brokkoli, Leinsamen)' },
      { name: 'Epigenetische Veränderungen', sub: 'Genexpressionsschalter', animal: 'Fördert entzündungsfördernde Genexpressionsmuster', plant: 'Polyphenole + Methyldonoren aktivieren Langlebigkeitsgene (Kurkuma, Kreuzblütler, Walnüsse)' },
      { name: 'Mitochondriale Dysfunktion', sub: 'Energiewerk-Versagen', animal: 'Gesättigte Fette beeinträchtigen die Mitochondrienmembranfunktion', plant: 'AMPK + Antioxidantien unterstützen mitochondriale Integrität (dunkles Blattgemüse, Rote Bete, Olivenöl)' },
      { name: 'Zelluläre Seneszenz', sub: 'Zombie-Zellen', animal: 'Erhöht DNA-Schäden → mehr seneszente Zellen akkumulieren', plant: 'Flavonoide wirken als Senolytika und eliminieren Zombie-Zellen (Äpfel, Zwiebeln, Kapern)' },
      { name: 'Chronische Entzündung', sub: 'Inflammaging', animal: 'Gesättigte Fette + Endotoxine lösen systemische Entzündung aus', plant: 'Ballaststoffe + Polyphenole → kurzkettige Fettsäuren, entzündungshemmend (Hafer, Beeren, Leinsamen)' },
      { name: 'Oxidativer Stress', sub: 'Freie-Radikale-Schäden', animal: 'Erzeugt reaktive Sauerstoffspezies mit wenigen schützenden Antioxidantien', plant: 'Tausende Antioxidantien neutralisieren freie Radikale (Blaubeeren, dunkle Schokolade, Walnüsse)' },
      { name: 'Darmdysbiose', sub: 'Mikrobiom-Störung', animal: 'Ernährt pathogene Bakterien, fördert Darmentzündung', plant: 'Ballaststoffe ernähren schützende Bakterien → Langlebigkeitssignale (Hülsenfrüchte, Vollkorn, Zwiebeln)' },
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
    evidenceProblemTag: 'DAS EVIDENZPROBLEM',
    pyramidHead: 'Nicht alle Evidenz ist gleich.',
    pyramidSub: 'Das Internet ist voll mit Gesundheitsratschlägen. Social-Media-Influencer propagieren extreme Diäten — Carnivore, Rohkost, Saft-Kuren — mit leidenschaftlichen Erfahrungsberichten, aber ohne klinischen Beweis. Persönliche Geschichten klingen überzeugend, stehen aber auf der untersten Stufe der Evidenzpyramide.',
    pyramidLevel: 'Stufe',
    pyramidLevels: [
      { label: 'Systematische Reviews & Meta-Analysen', desc: 'Zusammenfassung der Ergebnisse mehrerer randomisierter Studien', strength: '✓ Stärkste Evidenz' },
      { label: 'Randomisierte kontrollierte Studien (RCTs)', desc: 'Goldstandard: kontrolliert, randomisiert, oft doppelblind', strength: '' },
      { label: 'Beobachtungsstudien', desc: 'In Bevölkerungsgruppen gefundene Korrelationen', strength: '' },
      { label: 'Expertenmeinung', desc: 'Einzelne Meinungen von Ärzten oder Wissenschaftlern', strength: '' },
      { label: 'Anekdotisch / Soziale Medien', desc: 'Persönliche Geschichten, Influencer-Erfahrungsberichte, Blogposts', strength: '⚠️ Schwächste Evidenz' },
    ],
    pyramidCallout: 'Wir bauen unsere Empfehlungen auf den Stufen 4 und 5 auf — randomisierten kontrollierten Studien, systematischen Reviews und Meta-Analysen. Keine Influencer-Meinungen. Keine Einzelstudien. Keine Trends.',
    factsMoreContext: 'Jedes Jahr sterben über 40 Millionen Menschen an chronischen Krankheiten. Das sind 74 % aller Todesfälle weltweit. Die vier grössten Killer — Herzkrankheiten, Krebs, Atemwegserkrankungen und Diabetes — werden massgeblich durch Lebensstilfaktoren verursacht: Ernährung, Bewegung, Rauchen und Alkohol.',
    whoSource: 'Quelle: WHO-Faktenblatt zu nichtübertragbaren Krankheiten, 2024',
    reversalTag: 'DIE EVIDENZ',
    reversalHead: 'Nur eine Ernährungsweise wurde in klinischen Studien bewiesen, den Todesursache Nr. 1 aufzuhalten und umzukehren.',
    reversalSub: 'Von allen heute beworbenen Ernährungsweisen — Keto, Carnivore, Paleo, Mediterran, Vegan — wurde nur eine in randomisierten kontrollierten Studien getestet und gezeigt, nicht nur die Progression der tödlichsten Krankheiten zu verlangsamen, sondern tatsächlich umzukehren.',
    reversalCalloutHead: 'Sollte die Ernährungsweise, die Krankheiten umkehren kann, nicht der Standard sein?',
    reversalCalloutBody: 'Kein anderes Ernährungsmuster — weder Keto, noch Paleo, noch Carnivore — wurde in randomisierten kontrollierten Studien gezeigt, Herzerkrankungen umzukehren oder Krebs zu verlangsamen. Bis eine andere Ernährungsweise dasselbe Evidenzniveau erreicht, bleibt eine vollwertige pflanzliche Ernährung die einzige evidenzbasierte Wahl für die Krankheitsumkehr. Die Frage ist nicht, ob es funktioniert. Die Frage ist, warum es nicht Standard der Versorgung ist.',
  },
  en: {
    eyebrow: 'Science',
    heading: 'Science & Sources',
    heroSub: 'In a world of social media health hype and extreme diet trends, we cut through the noise. Everything on Evida Life is grounded in the highest standard of scientific evidence — peer-reviewed research and clinical trials.',
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
    factsBox: 'Combined: reducing all four through lifestyle changes adds +10 to +15 years of life expectancy. That\'s more deaths than both World Wars combined — every single year. Diet is now the #1 risk factor for early death globally.',
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
      { name: 'AMPK', sub: 'Cellular energy sensor', animal: 'High calorie density + saturated fat → AMPK inhibited', plant: 'Dietary fiber + fasting windows → AMPK activated (beans, whole grains, berries)' },
      { name: 'Autophagy', sub: 'Cellular self-cleaning', animal: 'Constant protein surplus shuts autophagy off', plant: 'Polyphenols + lower caloric load → autophagy enhanced (green tea, berries, leafy greens)' },
      { name: 'mTOR', sub: 'Growth signaling switch', animal: 'Animal protein (leucine) → mTOR chronically overactivated', plant: 'Plant protein → mTOR moderated for longevity (lentils, tofu, hemp seeds)' },
      { name: 'IGF-1', sub: 'Insulin-like growth factor', animal: 'Dairy, meat, eggs → IGF-1 elevated to cancer-promoting levels', plant: 'Whole plant foods → IGF-1 at longevity-associated levels (legumes, vegetables, whole grains)' },
      { name: 'Telomere shortening', sub: 'Biological clock', animal: 'Chronic inflammation → accelerated telomere loss', plant: 'Antioxidants + anti-inflammatory compounds → telomere protection (blueberries, broccoli, flaxseed)' },
      { name: 'Epigenetic alterations', sub: 'Gene expression switches', animal: 'Promotes pro-inflammatory gene expression patterns', plant: 'Polyphenols + methyl donors activate longevity genes (turmeric, cruciferous vegetables, walnuts)' },
      { name: 'Mitochondrial dysfunction', sub: 'Energy factory failure', animal: 'Saturated fats impair mitochondrial membrane function', plant: 'AMPK + antioxidants support mitochondrial integrity (dark leafy greens, beets, olive oil)' },
      { name: 'Cellular senescence', sub: 'Zombie cells', animal: 'Increases DNA damage → more senescent cells accumulate', plant: 'Flavonoids act as senolytics, clearing zombie cells (apples, onions, capers)' },
      { name: 'Chronic inflammation', sub: 'Inflammaging', animal: 'Saturated fats + endotoxins trigger systemic inflammation', plant: 'Fiber + polyphenols → anti-inflammatory short-chain fatty acids (oats, berries, flaxseed)' },
      { name: 'Oxidative stress', sub: 'Free radical damage', animal: 'Generates reactive oxygen species with few protective antioxidants', plant: 'Thousands of antioxidants neutralize free radicals (blueberries, dark chocolate, walnuts)' },
      { name: 'Gut dysbiosis', sub: 'Microbiome disruption', animal: 'Feeds pathogenic bacteria, promotes gut inflammation', plant: 'Dietary fiber feeds protective bacteria → longevity signals (legumes, whole grains, onions)' },
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
    evidenceProblemTag: 'THE EVIDENCE PROBLEM',
    pyramidHead: 'Not all evidence is created equal.',
    pyramidSub: 'The internet is full of health advice. Social media influencers promote extreme diets — carnivore, raw food, juice cleanses — with passionate testimonials but no clinical proof. Personal stories feel convincing, but they sit at the bottom of the evidence pyramid.',
    pyramidLevel: 'Level',
    pyramidLevels: [
      { label: 'Systematic Reviews & Meta-Analyses', desc: 'Combining results from multiple RCTs', strength: '✓ Strongest evidence' },
      { label: 'Randomized Controlled Trials (RCTs)', desc: 'Gold standard: controlled, randomized, often double-blind', strength: '' },
      { label: 'Observational Studies', desc: 'Correlations found in populations', strength: '' },
      { label: 'Expert Opinion', desc: 'Individual doctor or scientist opinions', strength: '' },
      { label: 'Anecdotal / Social Media', desc: 'Personal stories, influencer testimonials, blog posts', strength: '⚠️ Weakest evidence' },
    ],
    pyramidCallout: 'We build our recommendations on levels 4 and 5 — randomized controlled trials, systematic reviews, and meta-analyses. Not influencer opinions. Not single studies. Not trends.',
    factsMoreContext: 'Every year, over 40 million people die from chronic diseases. That\'s 74% of all deaths globally. The four biggest killers — heart disease, cancer, respiratory disease, and diabetes — are largely driven by lifestyle factors: diet, exercise, smoking, and alcohol.',
    whoSource: 'Source: WHO Noncommunicable Diseases Fact Sheet, 2024',
    reversalTag: 'THE EVIDENCE',
    reversalHead: 'Only one diet has been proven in clinical trials to stop and reverse the #1 killer.',
    reversalSub: 'Of all the diets promoted today — keto, carnivore, paleo, Mediterranean, vegan — only one has been tested in randomized controlled trials and shown to not just slow, but actually reverse the progression of the diseases that kill most people.',
    reversalCalloutHead: 'Shouldn\'t the diet proven to reverse disease be the default?',
    reversalCalloutBody: 'No other dietary pattern — not keto, not paleo, not carnivore — has been shown in randomized controlled trials to reverse heart disease or slow cancer. Until another diet produces the same level of clinical evidence, a whole-food plant-based diet remains the only evidence-based choice for disease reversal. The question isn\'t whether it works. The question is why it isn\'t the standard of care.',
  },
  fr: {
    eyebrow: 'Science',
    heading: 'Science & Sources',
    heroSub: 'Dans un monde d\'engouement médiatique pour la santé et de tendances alimentaires extrêmes, nous tranchons à travers le bruit. Tout sur Evida Life repose sur le plus haut standard de preuves scientifiques — recherche évaluée par les pairs et essais cliniques.',
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
    factsBox: 'Combinées : réduire les quatre maladies par des changements de mode de vie ajoute +10 à +15 ans d\'espérance de vie. C\'est plus de morts que les deux guerres mondiales réunies — chaque année. L\'alimentation est désormais le facteur de risque n° 1 de décès prématuré dans le monde.',
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
      { name: 'AMPK', sub: 'Capteur d\'énergie cellulaire', animal: 'Haute densité calorique + graisses saturées → AMPK inhibée', plant: 'Fibres alimentaires + fenêtres de jeûne → AMPK activée (haricots, céréales complètes, baies)' },
      { name: 'Autophagie', sub: 'Auto-nettoyage cellulaire', animal: 'Excès constant de protéines désactive l\'autophagie', plant: 'Polyphénols + charge calorique réduite → autophagie améliorée (thé vert, baies, légumes à feuilles)' },
      { name: 'mTOR', sub: 'Commutateur de signalisation de croissance', animal: 'Protéines animales (leucine) → mTOR chroniquement suractivé', plant: 'Protéines végétales → mTOR modéré pour la longévité (lentilles, tofu, graines de chanvre)' },
      { name: 'IGF-1', sub: 'Facteur de croissance insulinomimétique', animal: 'Produits laitiers, viande, œufs → IGF-1 à des niveaux favorisant le cancer', plant: 'Aliments végétaux complets → IGF-1 à des niveaux de longévité (légumineuses, légumes, céréales complètes)' },
      { name: 'Raccourcissement des télomères', sub: 'Horloge biologique', animal: 'Inflammation chronique → perte accélérée des télomères', plant: 'Antioxydants + composés anti-inflammatoires → protection des télomères (myrtilles, brocoli, graines de lin)' },
      { name: 'Altérations épigénétiques', sub: 'Interrupteurs d\'expression génique', animal: 'Favorise des profils d\'expression génique pro-inflammatoires', plant: 'Polyphénols + donneurs de méthyle activent les gènes de longévité (curcuma, crucifères, noix)' },
      { name: 'Dysfonction mitochondriale', sub: 'Défaillance de la centrale énergétique', animal: 'Les graisses saturées altèrent la fonction membranaire mitochondriale', plant: 'AMPK + antioxydants soutiennent l\'intégrité mitochondriale (légumes à feuilles sombres, betteraves, huile d\'olive)' },
      { name: 'Sénescence cellulaire', sub: 'Cellules zombies', animal: 'Augmente les dommages à l\'ADN → plus de cellules sénescentes s\'accumulent', plant: 'Les flavonoïdes agissent comme sénolytiques, éliminant les cellules zombies (pommes, oignons, câpres)' },
      { name: 'Inflammation chronique', sub: 'Inflammaging', animal: 'Graisses saturées + endotoxines déclenchent une inflammation systémique', plant: 'Fibres + polyphénols → acides gras à chaîne courte anti-inflammatoires (avoine, baies, graines de lin)' },
      { name: 'Stress oxydatif', sub: 'Dommages par les radicaux libres', animal: 'Génère des espèces réactives de l\'oxygène avec peu d\'antioxydants protecteurs', plant: 'Des milliers d\'antioxydants neutralisent les radicaux libres (myrtilles, chocolat noir, noix)' },
      { name: 'Dysbiose intestinale', sub: 'Perturbation du microbiome', animal: 'Nourrit des bactéries pathogènes, favorise l\'inflammation intestinale', plant: 'Les fibres alimentaires nourrissent les bactéries protectrices → signaux de longévité (légumineuses, céréales complètes, oignons)' },
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
    evidenceProblemTag: 'LE PROBLÈME DE PREUVE',
    pyramidHead: 'Toutes les preuves ne se valent pas.',
    pyramidSub: 'Internet regorge de conseils de santé. Les influenceurs sur les réseaux sociaux promeuvent des régimes extrêmes — carnivore, crudités, cures de jus — avec des témoignages passionnés mais sans preuve clinique. Les histoires personnelles paraissent convaincantes, mais elles se trouvent au bas de la pyramide des preuves.',
    pyramidLevel: 'Niveau',
    pyramidLevels: [
      { label: 'Revues systématiques & méta-analyses', desc: 'Combinant les résultats de plusieurs ECR', strength: '✓ Preuve la plus forte' },
      { label: 'Essais contrôlés randomisés (ECR)', desc: 'Étalon-or : contrôlé, randomisé, souvent en double aveugle', strength: '' },
      { label: 'Études observationnelles', desc: 'Corrélations observées dans des populations', strength: '' },
      { label: "Opinion d'experts", desc: 'Opinions individuelles de médecins ou scientifiques', strength: '' },
      { label: 'Anecdotique / Réseaux sociaux', desc: 'Témoignages personnels, influenceurs, articles de blog', strength: '⚠️ Preuve la plus faible' },
    ],
    pyramidCallout: "Nous construisons nos recommandations sur les niveaux 4 et 5 — essais contrôlés randomisés, revues systématiques et méta-analyses. Pas d'opinions d'influenceurs. Pas d'études uniques. Pas de tendances.",
    factsMoreContext: "Chaque année, plus de 40 millions de personnes meurent de maladies chroniques. C'est 74 % de tous les décès dans le monde. Les quatre principaux tueurs — maladies cardiaques, cancer, maladies respiratoires et diabète — sont largement influencés par des facteurs liés au mode de vie : alimentation, exercice, tabac et alcool.",
    whoSource: "Source : Fiche d'information de l'OMS sur les maladies non transmissibles, 2024",
    reversalTag: 'LES PREUVES',
    reversalHead: "Une seule alimentation a été prouvée dans des essais cliniques pour stopper et inverser le tueur n° 1.",
    reversalSub: "De tous les régimes promus aujourd'hui — céto, carnivore, paléo, méditerranéen, végétalien — un seul a été testé dans des essais contrôlés randomisés et s'est révélé non seulement ralentir, mais réellement inverser la progression des maladies qui tuent le plus.",
    reversalCalloutHead: "L'alimentation prouvée pour inverser les maladies ne devrait-elle pas être la norme ?",
    reversalCalloutBody: "Aucun autre régime alimentaire — ni céto, ni paléo, ni carnivore — n'a été démontré dans des essais contrôlés randomisés pour inverser les maladies cardiaques ou ralentir le cancer. Tant qu'un autre régime ne produit pas le même niveau de preuves cliniques, une alimentation végétale complète reste le seul choix fondé sur des données probantes pour inverser les maladies. La question n'est pas de savoir si ça marche. La question est de savoir pourquoi ce n'est pas la norme de soins.",
  },
  es: {
    eyebrow: 'Ciencia',
    heading: 'Ciencia & Fuentes',
    heroSub: 'En un mundo lleno de exageración mediática sobre salud y tendencias dietéticas extremas, cortamos con el ruido. Todo en Evida Life se basa en el más alto estándar de evidencia científica — investigación revisada por pares y ensayos clínicos.',
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
    factsBox: 'Combinadas: reducir las cuatro enfermedades mediante cambios en el estilo de vida añade +10 a +15 años de esperanza de vida. Eso representa más muertes que ambas guerras mundiales juntas — cada año. La dieta es ahora el factor de riesgo número 1 de muerte prematura a nivel mundial.',
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
      { name: 'AMPK', sub: 'Sensor de energía celular', animal: 'Alta densidad calórica + grasas saturadas → AMPK inhibida', plant: 'Fibra dietética + ventanas de ayuno → AMPK activada (judías, cereales integrales, bayas)' },
      { name: 'Autofagia', sub: 'Autolimpieza celular', animal: 'Exceso constante de proteínas desactiva la autofagia', plant: 'Polifenoles + carga calórica reducida → autofagia mejorada (té verde, bayas, verduras de hoja)' },
      { name: 'mTOR', sub: 'Interruptor de señalización de crecimiento', animal: 'Proteína animal (leucina) → mTOR crónicamente sobreactivado', plant: 'Proteína vegetal → mTOR moderado para la longevidad (lentejas, tofu, semillas de cáñamo)' },
      { name: 'IGF-1', sub: 'Factor de crecimiento insulínico', animal: 'Lácteos, carne, huevos → IGF-1 elevado a niveles pro-cáncer', plant: 'Alimentos vegetales integrales → IGF-1 a niveles de longevidad (legumbres, verduras, cereales integrales)' },
      { name: 'Acortamiento de telómeros', sub: 'Reloj biológico', animal: 'Inflamación crónica → pérdida acelerada de telómeros', plant: 'Antioxidantes + compuestos antiinflamatorios → protección de telómeros (arándanos, brócoli, linaza)' },
      { name: 'Alteraciones epigenéticas', sub: 'Interruptores de expresión génica', animal: 'Promueve patrones de expresión génica proinflamatorios', plant: 'Polifenoles + donantes de metilo activan genes de longevidad (cúrcuma, crucíferas, nueces)' },
      { name: 'Disfunción mitocondrial', sub: 'Fallo de la central energética', animal: 'Las grasas saturadas dañan la función de la membrana mitocondrial', plant: 'AMPK + antioxidantes apoyan la integridad mitocondrial (verduras de hoja oscura, remolacha, aceite de oliva)' },
      { name: 'Senescencia celular', sub: 'Células zombi', animal: 'Aumenta el daño al ADN → más células senescentes se acumulan', plant: 'Los flavonoides actúan como senolíticos, eliminando células zombi (manzanas, cebollas, alcaparras)' },
      { name: 'Inflamación crónica', sub: 'Inflammaging', animal: 'Grasas saturadas + endotoxinas desencadenan inflamación sistémica', plant: 'Fibra + polifenoles → ácidos grasos de cadena corta antiinflamatorios (avena, bayas, linaza)' },
      { name: 'Estrés oxidativo', sub: 'Daño por radicales libres', animal: 'Genera especies reactivas de oxígeno con pocos antioxidantes protectores', plant: 'Miles de antioxidantes neutralizan los radicales libres (arándanos, chocolate negro, nueces)' },
      { name: 'Disbiosis intestinal', sub: 'Alteración del microbioma', animal: 'Alimenta bacterias patógenas, promueve la inflamación intestinal', plant: 'La fibra alimenta bacterias protectoras → señales de longevidad (legumbres, cereales integrales, cebollas)' },
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
    evidenceProblemTag: 'EL PROBLEMA DE LA EVIDENCIA',
    pyramidHead: 'No toda la evidencia es igual.',
    pyramidSub: 'Internet está lleno de consejos de salud. Los influencers en redes sociales promueven dietas extremas — carnívora, crudivegana, limpiezas de jugos — con testimonios apasionados pero sin prueba clínica. Las historias personales parecen convincentes, pero se encuentran en la base de la pirámide de evidencia.',
    pyramidLevel: 'Nivel',
    pyramidLevels: [
      { label: 'Revisiones sistemáticas & metaanálisis', desc: 'Combinando resultados de múltiples ECA', strength: '✓ Evidencia más sólida' },
      { label: 'Ensayos controlados aleatorizados (ECA)', desc: 'Estándar de oro: controlado, aleatorizado, a menudo doble ciego', strength: '' },
      { label: 'Estudios observacionales', desc: 'Correlaciones encontradas en poblaciones', strength: '' },
      { label: 'Opinión de expertos', desc: 'Opiniones individuales de médicos o científicos', strength: '' },
      { label: 'Anecdótico / Redes sociales', desc: 'Historias personales, testimonios de influencers, entradas de blog', strength: '⚠️ Evidencia más débil' },
    ],
    pyramidCallout: 'Construimos nuestras recomendaciones sobre los niveles 4 y 5 — ensayos controlados aleatorizados, revisiones sistemáticas y metaanálisis. No opiniones de influencers. No estudios únicos. No tendencias.',
    factsMoreContext: 'Cada año, más de 40 millones de personas mueren de enfermedades crónicas. Eso es el 74% de todas las muertes a nivel mundial. Los cuatro mayores asesinos — enfermedades cardíacas, cáncer, enfermedades respiratorias y diabetes — están impulsados en gran medida por factores del estilo de vida: dieta, ejercicio, tabaquismo y alcohol.',
    whoSource: 'Fuente: Hoja informativa de la OMS sobre enfermedades no transmisibles, 2024',
    reversalTag: 'LA EVIDENCIA',
    reversalHead: 'Solo una dieta ha sido demostrada en ensayos clínicos para detener y revertir el asesino número 1.',
    reversalSub: 'De todas las dietas promovidas hoy — keto, carnívora, paleo, mediterránea, vegana — solo una ha sido probada en ensayos controlados aleatorizados y demostrada para no solo ralentizar, sino revertir la progresión de las enfermedades que matan a más personas.',
    reversalCalloutHead: '¿No debería ser el estándar la dieta demostrada para revertir enfermedades?',
    reversalCalloutBody: 'Ningún otro patrón dietético — ni keto, ni paleo, ni carnívoro — ha demostrado en ensayos controlados aleatorizados revertir enfermedades cardíacas o ralentizar el cáncer. Hasta que otra dieta produzca el mismo nivel de evidencia clínica, una dieta integral basada en plantas sigue siendo la única opción basada en evidencia para la reversión de enfermedades. La pregunta no es si funciona. La pregunta es por qué no es el estándar de atención.',
  },
  it: {
    eyebrow: 'Scienza',
    heading: 'Scienza & Fonti',
    heroSub: 'In un mondo di clamore mediatico sulla salute e tendenze dietetiche estreme, tagliamo attraverso il rumore. Tutto su Evida Life si basa sul più alto standard di prove scientifiche — ricerche peer-reviewed e trial clinici.',
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
    factsBox: "Combinate: ridurre tutte e quattro le malattie attraverso cambiamenti dello stile di vita aggiunge da +10 a +15 anni di aspettativa di vita. Sono più morti di entrambe le guerre mondiali messe insieme — ogni singolo anno. La dieta è ora il principale fattore di rischio di morte prematura a livello mondiale.",
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
      { name: 'AMPK', sub: 'Sensore energetico cellulare', animal: 'Alta densità calorica + grassi saturi → AMPK inibita', plant: 'Fibre alimentari + finestre di digiuno → AMPK attivata (fagioli, cereali integrali, frutti di bosco)' },
      { name: 'Autofagia', sub: 'Autopulizia cellulare', animal: 'Eccesso costante di proteine disattiva l\'autofagia', plant: 'Polifenoli + carico calorico ridotto → autofagia potenziata (tè verde, frutti di bosco, verdure a foglia)' },
      { name: 'mTOR', sub: 'Interruttore di segnalazione della crescita', animal: 'Proteine animali (leucina) → mTOR cronicamente iperattivato', plant: 'Proteine vegetali → mTOR moderato per la longevità (lenticchie, tofu, semi di canapa)' },
      { name: 'IGF-1', sub: 'Fattore di crescita insulino-simile', animal: 'Latticini, carne, uova → IGF-1 elevato a livelli pro-cancro', plant: 'Alimenti vegetali integrali → IGF-1 a livelli di longevità (legumi, verdure, cereali integrali)' },
      { name: 'Accorciamento dei telomeri', sub: 'Orologio biologico', animal: 'Infiammazione cronica → perdita accelerata dei telomeri', plant: 'Antiossidanti + composti antinfiammatori → protezione dei telomeri (mirtilli, broccoli, semi di lino)' },
      { name: 'Alterazioni epigenetiche', sub: 'Interruttori dell\'espressione genica', animal: 'Promuove profili di espressione genica pro-infiammatoria', plant: 'Polifenoli + donatori di metile attivano geni della longevità (curcuma, verdure crocifere, noci)' },
      { name: 'Disfunzione mitocondriale', sub: 'Guasto della centrale energetica', animal: 'I grassi saturi compromettono la funzione della membrana mitocondriale', plant: 'AMPK + antiossidanti supportano l\'integrità mitocondriale (verdure a foglia scura, barbabietole, olio d\'oliva)' },
      { name: 'Senescenza cellulare', sub: 'Cellule zombi', animal: 'Aumenta il danno al DNA → si accumulano più cellule senescenti', plant: 'I flavonoidi agiscono come senolitici, eliminando le cellule zombi (mele, cipolle, capperi)' },
      { name: 'Infiammazione cronica', sub: 'Inflammaging', animal: 'Grassi saturi + endotossine scatenano infiammazione sistemica', plant: 'Fibra + polifenoli → acidi grassi a catena corta antinfiammatori (avena, frutti di bosco, semi di lino)' },
      { name: 'Stress ossidativo', sub: 'Danno da radicali liberi', animal: 'Genera specie reattive dell\'ossigeno con pochi antiossidanti protettivi', plant: 'Migliaia di antiossidanti neutralizzano i radicali liberi (mirtilli, cioccolato fondente, noci)' },
      { name: 'Disbiosi intestinale', sub: 'Alterazione del microbioma', animal: 'Nutre batteri patogeni, promuove l\'infiammazione intestinale', plant: 'Le fibre alimentano batteri protettivi → segnali di longevità (legumi, cereali integrali, cipolle)' },
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
    evidenceProblemTag: 'IL PROBLEMA DELLE PROVE',
    pyramidHead: 'Non tutte le prove sono uguali.',
    pyramidSub: 'Internet è pieno di consigli sulla salute. Gli influencer sui social media promuovono diete estreme — carnivora, crudismo, depurazioni con succhi — con testimonianze appassionate ma senza prove cliniche. Le storie personali sembrano convincenti, ma si trovano alla base della piramide delle prove.',
    pyramidLevel: 'Livello',
    pyramidLevels: [
      { label: 'Revisioni sistematiche & meta-analisi', desc: 'Combinazione di risultati da più RCT', strength: '✓ Prova più forte' },
      { label: 'Trial controllati randomizzati (RCT)', desc: 'Gold standard: controllato, randomizzato, spesso in doppio cieco', strength: '' },
      { label: 'Studi osservazionali', desc: 'Correlazioni trovate nelle popolazioni', strength: '' },
      { label: 'Opinione degli esperti', desc: 'Opinioni individuali di medici o scienziati', strength: '' },
      { label: 'Aneddotico / Social media', desc: 'Storie personali, testimonianze di influencer, post di blog', strength: '⚠️ Prova più debole' },
    ],
    pyramidCallout: 'Costruiamo le nostre raccomandazioni sui livelli 4 e 5 — trial controllati randomizzati, revisioni sistematiche e meta-analisi. Non opinioni di influencer. Non studi singoli. Non tendenze.',
    factsMoreContext: 'Ogni anno, oltre 40 milioni di persone muoiono di malattie croniche. Questo rappresenta il 74% di tutti i decessi a livello globale. I quattro principali killer — malattie cardiache, cancro, malattie respiratorie e diabete — sono in gran parte determinati da fattori dello stile di vita: dieta, esercizio, fumo e alcol.',
    whoSource: "Fonte: Scheda informativa dell'OMS sulle malattie non trasmissibili, 2024",
    reversalTag: 'LE PROVE',
    reversalHead: 'Solo una dieta è stata dimostrata in trial clinici nel fermare e invertire il killer numero 1.',
    reversalSub: 'Di tutte le diete promosse oggi — keto, carnivora, paleo, mediterranea, vegana — solo una è stata testata in trial controllati randomizzati e dimostrata non solo nel rallentare, ma nell\'invertire effettivamente la progressione delle malattie che uccidono più persone.',
    reversalCalloutHead: 'Non dovrebbe essere la norma la dieta dimostrata nel far regredire le malattie?',
    reversalCalloutBody: 'Nessun altro schema alimentare — né keto, né paleo, né carnivoro — è stato dimostrato in trial controllati randomizzati nel far regredire le malattie cardiache o rallentare il cancro. Finché un\'altra dieta non produrrà lo stesso livello di prove cliniche, una dieta integrale a base vegetale rimane l\'unica scelta basata su prove per il recupero delle malattie. La domanda non è se funziona. La domanda è perché non è lo standard di cura.',
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

        {/* ── Evidence Pyramid ── */}
        <section className="w-full bg-white border-b border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.evidenceProblemTag}</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-4 leading-tight">{t.pyramidHead}</h2>
            <p className="text-sm text-[#1c2a2b]/60 mb-10 leading-relaxed max-w-xl">{t.pyramidSub}</p>

            <div className="flex flex-col items-center gap-1 w-full mb-8">
              {t.pyramidLevels.map((level: { label: string; desc: string; strength: string }, idx: number) => {
                const v = PYRAMID_VISUAL[idx];
                const num = 5 - idx;
                return (
                  <div
                    key={idx}
                    className={`${v.bg} border ${v.border} rounded-lg px-4 py-3 w-full transition-all`}
                    style={{ maxWidth: `${v.widthPct * 5.8}px` }}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-[10px] font-bold ${v.text} opacity-50 shrink-0`}>{t.pyramidLevel} {num}</span>
                        <span className={`text-[13px] font-semibold ${v.text} leading-snug`}>{level.label}</span>
                      </div>
                      {level.strength && (
                        <span className={`text-[10px] font-semibold ${v.text} whitespace-nowrap shrink-0`}>{level.strength}</span>
                      )}
                    </div>
                    <p className={`text-[11px] ${v.text} opacity-55 mt-1 leading-snug`}>{level.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl bg-[#0e393d] px-6 py-5">
              <p className="text-sm text-white/80 leading-relaxed">{t.pyramidCallout}</p>
            </div>
          </div>
        </section>

        {/* Evidence principles */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.principlesHead}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.title.en} className="rounded-2xl border border-[#0e393d]/10 bg-white p-6 border-l-4 border-l-[#CEAB84]">
                <span className="text-2xl mb-3 block">{p.icon}</span>
                <h3 className="font-serif text-lg text-[#0e393d] mb-2">{(p.title as Record<string, string>)[lang] ?? p.title.en}</h3>
                <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{(p.body as Record<string, string>)[lang] ?? p.body.en}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Disease table ── */}
        <section className="w-full max-w-5xl mx-auto px-6 py-16 border-b border-[#0e393d]/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.factsTag}</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-3 leading-tight">{t.factsTitle}</h2>
          <p className="text-sm text-[#1c2a2b]/60 mb-3 leading-relaxed max-w-2xl">{t.factsSub}</p>
          <p className="text-sm text-[#1c2a2b]/60 mb-2 leading-relaxed max-w-2xl">{t.factsMoreContext}</p>
          <p className="text-xs text-[#1c2a2b]/40 mb-8">
            {t.whoSource}{' '}·{' '}
            <a href="https://www.who.int/news-room/fact-sheets/detail/noncommunicable-diseases" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1c2a2b]/60 transition-colors">who.int</a>
          </p>

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

        {/* ── Only diet proven to reverse disease ── */}
        <section className="w-full bg-white border-b border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.reversalTag}</p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#0e393d] mb-4 leading-tight max-w-3xl">{t.reversalHead}</h2>
            <p className="text-sm text-[#1c2a2b]/60 mb-10 leading-relaxed max-w-2xl">{t.reversalSub}</p>

            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3 mb-10">
              {REVERSAL_CARDS.map((card) => (
                <div key={card.icon} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 border-l-4 border-l-[#0C9C6C] p-6 flex flex-col gap-4">
                  <div>
                    <span className="text-3xl block mb-3">{card.icon}</span>
                    <h3 className="font-serif text-lg text-[#0e393d] leading-snug">{card.title[lang as keyof typeof card.title]}</h3>
                  </div>
                  <p className="text-sm text-[#1c2a2b]/65 leading-relaxed flex-1">{card.body[lang as keyof typeof card.body]}</p>
                  <div className="pt-3 border-t border-[#0e393d]/8 space-y-2">
                    {card.refs.map((ref) => (
                      <a
                        key={ref.link}
                        href={ref.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 group"
                      >
                        <span className="text-[11px] text-[#1c2a2b]/40 leading-snug group-hover:text-[#0e393d]/70 transition-colors">{ref.text}</span>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5 text-[#1c2a2b]/30 group-hover:text-[#0e393d]/60 transition-colors">
                          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Provocative callout */}
            <div className="rounded-2xl bg-[#FAEEDA]/60 border border-[#CEAB84]/40 border-l-4 border-l-[#C4A96A] px-8 py-8">
              <h3 className="font-serif text-xl sm:text-2xl text-[#5a3e1b] mb-4 leading-snug">{t.reversalCalloutHead}</h3>
              <p className="text-sm text-[#5a3e1b]/75 leading-relaxed">{t.reversalCalloutBody}</p>
            </div>
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
              <div key={i} className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 border-l-4 border-l-[#0e393d] p-5 flex flex-col gap-3">
                <div>
                  <p className="font-serif text-[1.1rem] text-[#0e393d] leading-snug font-medium">{h.name}</p>
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
              <div className="min-w-[640px]">

                {/* Column headers */}
                <div className="flex mb-0.5">
                  <div className="shrink-0" style={{ width: 180 }} />
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

                {/* Section label: promotes */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="shrink-0" style={{ width: 180 }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-700">{t.promoteLabel.toUpperCase()}</span>
                </div>

                {/* Promote rows */}
                {HP.map((row) => (
                  <div key={row.food} className="flex border-b border-gray-50 last:border-0">
                    <div
                      className="shrink-0 pr-2 text-right text-[10.5px] text-[#1c2a2b]/55 flex items-center justify-end leading-tight"
                      style={{ width: 180, minHeight: 32 }}
                    >
                      {getFoodName(row.food, lang)}
                    </div>
                    {row.cells.map((v, ci) => (
                      <div key={ci} className={`flex-1 m-[2px] rounded-[2px] ${cellCls(v)}`} style={{ minHeight: 28 }} />
                    ))}
                  </div>
                ))}

                {/* Divider: mixed/neutral */}
                <div className="flex items-center gap-3 my-2">
                  <div className="shrink-0" style={{ width: 180 }} />
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
                      style={{ width: 180, minHeight: 32 }}
                    >
                      {getFoodName(row.food, lang)}
                    </div>
                    {row.cells.map((v, ci) => (
                      <div key={ci} className={`flex-1 m-[2px] rounded-[2px] ${cellCls(v)}`} style={{ minHeight: 28 }} />
                    ))}
                  </div>
                ))}

                {/* Divider before avoid + section label */}
                <div className="flex items-center gap-2 mt-3 mb-1">
                  <div className="shrink-0" style={{ width: 180 }} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-red-600">{t.avoidLabel.toUpperCase()}</span>
                </div>

                {/* Avoid rows */}
                {HA.map((row) => (
                  <div key={row.food} className="flex border-b border-gray-50 last:border-0">
                    <div
                      className="shrink-0 pr-2 text-right text-[10.5px] text-[#1c2a2b]/55 flex items-center justify-end leading-tight"
                      style={{ width: 180, minHeight: 32 }}
                    >
                      {getFoodName(row.food, lang)}
                    </div>
                    {row.cells.map((v, ci) => (
                      <div key={ci} className={`flex-1 m-[2px] rounded-[2px] ${cellCls(v)}`} style={{ minHeight: 28 }} />
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="shrink-0" style={{ width: 180 }} />
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
