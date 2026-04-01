import Image from 'next/image';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import DailyDozenTracker, { type DDCategory, type DDEntry, type DDStreak, type HistoricalEntry } from '@/components/DailyDozenTracker';
import DailyChecklistTabs from '@/components/DailyChecklistTabs';
import { type ChecklistItem, type ChecklistEntry } from '@/components/ChecklistTracker';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.dailyDozen[lang], path: '/daily-dozen', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

// ─── Tracker translations ──────────────────────────────────────────────────────
const T_TRACKER = {
  de: {
    eyebrow: 'Gesundheit',
    heading: 'Daily Dozen',
    sub: 'Die 12 Lebensmittelgruppen nach Dr. Michael Greger – täglich erfüllen für optimale Gesundheit.',
  },
  en: {
    eyebrow: 'Health',
    heading: 'Daily Dozen',
    sub: "Dr. Michael Greger's 12 daily food groups – hit all 12 every day for optimal health.",
  },
  fr: {
    eyebrow: 'Santé',
    heading: 'Daily Dozen',
    sub: 'Les 12 groupes alimentaires du Dr Michael Greger – atteindre les 12 chaque jour pour une santé optimale.',
  },
  es: {
    eyebrow: 'Salud',
    heading: 'Daily Dozen',
    sub: 'Los 12 grupos alimentarios del Dr. Michael Greger – alcanza los 12 cada día para una salud óptima.',
  },
  it: {
    eyebrow: 'Salute',
    heading: 'Daily Dozen',
    sub: 'I 12 gruppi alimentari del Dr. Michael Greger – raggiungi tutti i 12 ogni giorno per una salute ottimale.',
  },
};

// ─── Public page translations ──────────────────────────────────────────────────
// ─── Static gauge helpers (tachometer mockup on public page) ──────────────────
const G_CX = 130, G_CY = 115, G_SEGS = 12, G_GAP = 2.5, G_START = 135, G_ARC = 270;
const G_SEG_ARC = (G_ARC - (G_SEGS - 1) * G_GAP) / G_SEGS;
const G_R_MID = 85, G_MIN_THICK = 10, G_MAX_THICK = 26;
function gRad(d: number) { return d * Math.PI / 180; }
function gPx(r: number, d: number): [number, number] {
  return [G_CX + r * Math.cos(gRad(d)), G_CY + r * Math.sin(gRad(d))];
}
function gSegPath(i: number): string {
  const s = G_START + i * (G_SEG_ARC + G_GAP), e = s + G_SEG_ARC;
  const t = i / (G_SEGS - 1);
  const thick = G_MIN_THICK + t * (G_MAX_THICK - G_MIN_THICK);
  const rO = G_R_MID + thick / 2, rI = G_R_MID - thick / 2;
  const [x1, y1] = gPx(rO, s), [x2, y2] = gPx(rO, e);
  const [x3, y3] = gPx(rI, e), [x4, y4] = gPx(rI, s);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} A${rO},${rO} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${rI},${rI} 0 0,0 ${x4.toFixed(1)},${y4.toFixed(1)} Z`;
}
// Needle pre-computed for 8/12 filled (ratio ≈ 0.667, needle at 315°)
const G_NEEDLE_DEG = G_START + (8 / 12) * G_ARC;
const G_N_RAD = gRad(G_NEEDLE_DEG);
const G_NDX = Math.cos(G_N_RAD), G_NDY = Math.sin(G_N_RAD);
const G_TIP_R = G_R_MID - G_MIN_THICK / 2 + 4;
const G_NEEDLE_PATH = [
  `M${(G_CX + G_TIP_R * G_NDX).toFixed(1)},${(G_CY + G_TIP_R * G_NDY).toFixed(1)}`,
  `L${(G_CX + 4 * (-G_NDY)).toFixed(1)},${(G_CY + 4 * G_NDX).toFixed(1)}`,
  `L${(G_CX - 10 * G_NDX).toFixed(1)},${(G_CY - 10 * G_NDY).toFixed(1)}`,
  `L${(G_CX - 4 * (-G_NDY)).toFixed(1)},${(G_CY - 4 * G_NDX).toFixed(1)} Z`,
].join(' ');
const G_LABEL_R = G_R_MID + G_MAX_THICK / 2 + 12;
const [G_L0X, G_L0Y] = gPx(G_LABEL_R, G_START);
const [G_LTX, G_LTY] = gPx(G_LABEL_R, G_START + G_ARC);

const T_PUBLIC: Record<Lang, {
  tag: string;
  title: string;
  sub: string;
  // Dr. Greger profile
  gregerTag: string;
  gregerTitle: string;
  gregerP1: string;
  gregerP2: string;
  gregerP3: string;
  gregerNote: string;
  gregerLink: string;
  // 12 categories
  catsHeading: string;
  serving: string;
  servings: string;
  // Tracker
  trackerTag: string;
  trackerTitle: string;
  trackerSub: string;
  trackerFeatures: { title: string; desc: string }[];
  gaugeDesc: string;
  catsPillLabel: string;
  streakPillLabel: string;
  trackerDetail: string;
  previewNote: string;
  // Recipes
  recipesTag: string;
  recipesTitle: string;
  recipesText: string;
  recipesCta: string;
  recipesBadges: string[];
  recipeName: string;
  recipeServingNote: string;
  // B12
  b12Text: string;
  // Books
  booksTag: string;
  booksTitle: string;
  books: { title: string; year: string; desc: string }[];
  booksNote: string;
  booksLink: string;
  // Stats
  statsItems: { stat: string; label: string }[];
  // Resources
  resourcesNote: string;
  resourceLink: string;
  // CTA
  ctaDark: string;
  ctaSub: string;
  ctaCta1: string;
  ctaCta2: string;
}> = {
  de: {
    tag: 'DAILY DOZEN',
    title: 'Tracke, was am wichtigsten ist.',
    sub: 'Das Daily Dozen ist Dr. Michael Gregers evidenzbasierte Checkliste mit 12 Lebensmittelkategorien und Lebensgewohnheiten für den Alltag. Basierend auf jahrzehntelanger Ernährungsforschung identifiziert sie die gesündesten Lebensmittel zur Prävention chronischer Krankheiten und zur Förderung der Langlebigkeit.',
    gregerTag: 'DIE INSPIRATION',
    gregerTitle: 'Basierend auf der Arbeit von Dr. Michael Greger.',
    gregerP1: 'Dr. Michael Greger, M.D., FACLM, ist Arzt, Bestseller-Autor der New York Times und international anerkannter Redner zu Ernährung und öffentlicher Gesundheit. Er gründete NutritionFacts.org, eine gemeinnützige Organisation, die kostenlose, wissenschaftlich fundierte Informationen über die Rolle der Ernährung bei der Vorbeugung und Behandlung von Krankheiten bereitstellt.',
    gregerP2: 'Sein wegweisendes Buch How Not to Die (2015) untersucht die häufigsten Todesursachen und zeigt, wie Ernährungsumstellungen diese verhindern können. Es folgten How Not to Diet (2019) und How Not to Age (2023), jeweils auf Tausenden von Peer-Review-Studien basierend. 100% der Bucherlöse werden für wohltätige Zwecke gespendet.',
    gregerP3: 'Die Daily Dozen Checkliste entstand aus Dr. Gregers Forschung als praktisches Werkzeug, damit Menschen täglich die gesündesten Lebensmittel essen. Unsere Umsetzung bei Evida Life bringt dieses Konzept in einen digitalen Tracker mit Fortschrittsvisualisierung.',
    gregerNote: 'Mehr erfahren auf NutritionFacts.org →',
    gregerLink: 'https://nutritionfacts.org/daily-dozen/',
    catsHeading: 'Die 12 Kategorien',
    serving: 'Portion',
    servings: 'Portionen',
    trackerTag: 'DEIN TÄGLICHER TRACKER',
    trackerTitle: 'Einfache Checkboxen. Echte Wirkung.',
    trackerSub: 'Wenn du eingeloggt bist, wird das Daily Dozen zum interaktiven Tracker. Hake jede Portion ab, sobald du sie gegessen hast. Der Fortschritts-Gauge füllt sich dabei auf – was es befriedigend und motivierend macht, dein Dozen zu vervollständigen.',
    trackerFeatures: [
      { title: 'Tägliche Checkboxen', desc: 'Tippe, um jede Portion abzuhaken. Sieh, wie sich dein Fortschritt in Echtzeit füllt. Einfach genug zum Benutzen beim Kochen.' },
      { title: 'Fortschritts-Gauge', desc: 'Ein visueller Gauge zeigt, wie viele der 12 Kategorien du heute abgeschlossen hast. Strebe täglich nach 100%.' },
      { title: 'Rezept-Integration', desc: 'Unsere Vollwert-Rezepte sind rund um das Daily Dozen konzipiert. Koche ein Rezept, und mehrere Kategorien werden automatisch abgehakt.' },
    ],
    gaugeDesc: 'So sieht dein Fortschritt im echten Tracker aus',
    catsPillLabel: 'Kategorien',
    streakPillLabel: 'Streak',
    trackerDetail: 'Jede Kategorie wird mit einfachen Checkboxen abgehakt. Der Fortschritts-Gauge füllt sich automatisch. Am Ende des Tages siehst du auf einen Blick, wie vollständig dein Daily Dozen war.',
    previewNote: 'Vorschau — echte Daten nach dem Einloggen',
    recipesTag: 'REZEPT-INTEGRATION',
    recipesTitle: 'Einmal kochen, viel abhaken.',
    recipesText: 'Jedes Rezept in unserer Bibliothek ist mit den Daily Dozen Kategorien versehen, die es abdeckt. Ein einziges Frühstück wie unsere Longevity Overnight Oats hakt 6 von 12 Kategorien in einer Mahlzeit ab: Vollkornprodukte, Beeren, Andere Früchte, Leinsamen, Nüsse & Samen und Gewürze.',
    recipesCta: 'Rezepte entdecken →',
    recipeName: 'Longevity Overnight Oats',
    recipeServingNote: '6 von 12 Daily Dozen Kategorien in einer Mahlzeit',
    recipesBadges: ['🌾 Vollkornprodukte', '🫐 Beeren', '🍎 Andere Früchte', '🌱 Leinsamen', '🥜 Nüsse & Samen', '🧂 Gewürze'],
    b12Text: 'Dr. Greger empfiehlt außerdem die Ergänzung mit Vitamin B12: mindestens 2.000 mcg Cyanocobalamin pro Woche (oder 50 mcg täglich), idealerweise als kaubares oder sublinguales Ergänzungsmittel. Dies ist der einzige Nährstoff, der aus einer pflanzlichen Ernährung nicht zuverlässig verfügbar ist.',
    booksTag: 'TIEFER EINTAUCHEN',
    booksTitle: 'Die Bücher hinter der Wissenschaft.',
    books: [
      { title: 'How Not to Die', year: '2015', desc: 'Untersucht die 15 häufigsten Todesursachen und zeigt, wie Ernährungsinterventionen sie verhindern und umkehren können. Das Buch, das das Daily Dozen-Konzept begründet hat.' },
      { title: 'How Not to Diet', year: '2019', desc: 'Die Wissenschaft der Gewichtsabnahme. Stellt die Twenty-One Tweaks vor – evidenzbasierte Strategien für nachhaltiges, gesundes Gewichtsmanagement.' },
      { title: 'How Not to Age', year: '2023', desc: 'Zielt auf die 11 Kennzeichen des Alterns mit Ernährungsinterventionen. Der umfassendste evidenzbasierte Anti-Aging-Leitfaden.' },
    ],
    booksNote: '100% der Erlöse aus Dr. Gregers Büchern werden für wohltätige Zwecke gespendet.',
    booksLink: 'Alle Bücher auf NutritionFacts.org entdecken →',
    statsItems: [
      { stat: '12', label: 'Lebensmittelkategorien' },
      { stat: '24+', label: 'Tägliche Portionen' },
      { stat: '20.000+', label: 'Zitate in 3 Büchern' },
      { stat: '3', label: 'Bestseller-Bücher' },
    ],
    resourcesNote: 'Das Daily Dozen ist Dr. Gregers Schöpfung. Wir haben unseren Tracker als digitalen Begleiter aufgebaut, inspiriert von seiner Arbeit.',
    resourceLink: 'NutritionFacts.org',
    ctaDark: 'Starte noch heute mit deinem Daily Dozen.',
    ctaSub: 'Kostenloses Konto. Keine Kreditkarte. Hake deine ersten Kategorien in unter einer Minute ab.',
    ctaCta1: 'Kostenloses Konto erstellen',
    ctaCta2: 'Rezepte entdecken',
  },
  en: {
    tag: 'DAILY DOZEN',
    title: 'Track what matters most.',
    sub: "The Daily Dozen is Dr. Michael Greger's evidence-based checklist of 12 food categories and lifestyle habits to incorporate into your daily routine. Based on decades of nutrition research, it identifies the healthiest foods that can help prevent chronic disease and promote longevity.",
    gregerTag: 'THE INSPIRATION',
    gregerTitle: 'Based on the work of Dr. Michael Greger.',
    gregerP1: 'Dr. Michael Greger, M.D., FACLM, is a physician, New York Times bestselling author, and internationally recognized speaker on nutrition and public health. He founded NutritionFacts.org, a nonprofit that provides free, science-based information about the role of diet in preventing and treating disease.',
    gregerP2: 'His landmark book How Not to Die (2015) examines the leading causes of death and how dietary changes can prevent them. He followed it with How Not to Diet (2019) and How Not to Age (2023), each grounded in thousands of peer-reviewed studies. 100% of the proceeds from his books are donated to charity.',
    gregerP3: "The Daily Dozen checklist emerged from Dr. Greger's research as a practical tool to ensure people eat the healthiest foods every day. Our implementation at Evida Life brings this concept into a digital tracker with progress visualization.",
    gregerNote: 'Learn more at NutritionFacts.org →',
    gregerLink: 'https://nutritionfacts.org/daily-dozen/',
    catsHeading: 'The 12 Categories',
    serving: 'serving',
    servings: 'servings',
    trackerTag: 'YOUR DAILY TRACKER',
    trackerTitle: 'Simple checkboxes. Real impact.',
    trackerSub: "When you're logged in, the Daily Dozen becomes an interactive tracker. Check off each serving as you eat it throughout the day. The progress gauge fills up as you go — making it satisfying and motivating to complete your dozen.",
    trackerFeatures: [
      { title: 'Daily Checkboxes', desc: 'Tap to check off each serving. See your progress fill up in real time. Simple enough to use while cooking.' },
      { title: 'Progress Gauge', desc: "A visual gauge shows how many of the 12 categories you've completed today. Aim for 100% every day." },
      { title: 'Recipe Integration', desc: 'Our whole-food recipes are designed around the Daily Dozen. Cook a recipe, and multiple categories get checked off automatically.' },
    ],
    gaugeDesc: 'This is what your progress looks like in the real tracker',
    catsPillLabel: 'categories',
    streakPillLabel: 'streak',
    trackerDetail: 'Each category is checked off with simple taps. The gauge fills automatically as you go. At the end of the day, you can see at a glance how complete your Daily Dozen was.',
    previewNote: 'Preview — real data after logging in',
    recipesTag: 'RECIPE INTEGRATION',
    recipesTitle: 'Cook once, check off many.',
    recipesText: 'Every recipe in our library is tagged with the Daily Dozen categories it covers. A single breakfast like our Longevity Overnight Oats checks off 6 of 12 categories in one meal: Whole Grains, Berries, Other Fruits, Flaxseeds, Nuts & Seeds, and Spices.',
    recipesCta: 'Browse recipes →',
    recipeName: 'Longevity Overnight Oats',
    recipeServingNote: '6 of 12 Daily Dozen categories in one meal',
    recipesBadges: ['🌾 Whole Grains', '🫐 Berries', '🍎 Other Fruits', '🌱 Flaxseeds', '🥜 Nuts & Seeds', '🧂 Spices'],
    b12Text: 'Dr. Greger also recommends supplementing with Vitamin B12: at least 2,000 mcg cyanocobalamin weekly (or 50 mcg daily), ideally as a chewable or sublingual supplement. This is the one nutrient not reliably available from a plant-based diet.',
    booksTag: 'GO DEEPER',
    booksTitle: 'The books behind the science.',
    books: [
      { title: 'How Not to Die', year: '2015', desc: 'Examines the top 15 causes of death and shows how dietary interventions can prevent and reverse them. The book that started the Daily Dozen concept.' },
      { title: 'How Not to Diet', year: '2019', desc: 'The science of weight loss. Introduces the Twenty-One Tweaks — evidence-based strategies for sustainable, healthy weight management.' },
      { title: 'How Not to Age', year: '2023', desc: 'Targets the 11 Hallmarks of Aging with dietary interventions. The most comprehensive evidence-based anti-aging guide.' },
    ],
    booksNote: "100% of the proceeds from Dr. Greger's books are donated to charity.",
    booksLink: 'Explore all books at NutritionFacts.org →',
    statsItems: [
      { stat: '12', label: 'Food categories' },
      { stat: '24+', label: 'Daily servings' },
      { stat: '20,000+', label: 'Citations across 3 books' },
      { stat: '3', label: 'Bestselling books' },
    ],
    resourcesNote: "The Daily Dozen is Dr. Greger's creation. We've built our tracker as a digital companion inspired by his work.",
    resourceLink: 'NutritionFacts.org',
    ctaDark: 'Start tracking your Daily Dozen today.',
    ctaSub: 'Free account. No credit card. Check off your first categories in under a minute.',
    ctaCta1: 'Create free account',
    ctaCta2: 'Explore recipes',
  },
  fr: {
    tag: 'DAILY DOZEN',
    title: 'Suivez ce qui compte le plus.',
    sub: "Le Daily Dozen est la liste de contrôle factuelle du Dr Michael Greger comprenant 12 catégories alimentaires et habitudes de vie à intégrer dans votre quotidien. Basée sur des décennies de recherche en nutrition, elle identifie les aliments les plus sains pour prévenir les maladies chroniques et favoriser la longévité.",
    gregerTag: "L'INSPIRATION",
    gregerTitle: 'Basé sur les travaux du Dr Michael Greger.',
    gregerP1: "Le Dr Michael Greger, M.D., FACLM, est médecin, auteur à succès du New York Times et conférencier reconnu internationalement sur la nutrition et la santé publique. Il a fondé NutritionFacts.org, une organisation à but non lucratif qui fournit des informations scientifiques gratuites sur le rôle de l'alimentation dans la prévention et le traitement des maladies.",
    gregerP2: "Son ouvrage phare How Not to Die (2015) examine les principales causes de décès et montre comment les changements alimentaires peuvent les prévenir. Il l'a suivi de How Not to Diet (2019) et How Not to Age (2023), tous deux fondés sur des milliers d'études évaluées par des pairs. 100% des recettes de ses livres sont reversées à des œuvres caritatives.",
    gregerP3: "La liste Daily Dozen est née des recherches du Dr Greger comme outil pratique pour s'assurer que les gens mangent les aliments les plus sains chaque jour. Notre implémentation chez Evida Life apporte ce concept dans un tracker numérique avec visualisation de la progression.",
    gregerNote: 'En savoir plus sur NutritionFacts.org →',
    gregerLink: 'https://nutritionfacts.org/daily-dozen/',
    catsHeading: 'Les 12 catégories',
    serving: 'portion',
    servings: 'portions',
    trackerTag: 'VOTRE TRACKER QUOTIDIEN',
    trackerTitle: 'Des cases simples. Un vrai impact.',
    trackerSub: "Lorsque vous êtes connecté, le Daily Dozen devient un tracker interactif. Cochez chaque portion au fur et à mesure de votre journée. La jauge de progression se remplit — ce qui rend satisfaisant et motivant de compléter votre douzaine.",
    trackerFeatures: [
      { title: 'Cases quotidiennes', desc: 'Tapez pour cocher chaque portion. Voyez votre progression se remplir en temps réel. Simple à utiliser même en cuisinant.' },
      { title: 'Jauge de progression', desc: "Une jauge visuelle montre combien des 12 catégories vous avez complétées aujourd'hui. Visez 100% chaque jour." },
      { title: 'Intégration des recettes', desc: 'Nos recettes à base d\'aliments complets sont conçues autour du Daily Dozen. Cuisinez une recette et plusieurs catégories sont cochées automatiquement.' },
    ],
    gaugeDesc: 'Voici à quoi ressemble votre progression dans le vrai tracker',
    catsPillLabel: 'catégories',
    streakPillLabel: 'série',
    trackerDetail: 'Chaque catégorie est cochée par de simples appuis. La jauge se remplit automatiquement. En fin de journée, vous pouvez voir d\'un coup d\'œil à quel point votre Daily Dozen était complet.',
    previewNote: 'Aperçu — données réelles après connexion',
    recipesTag: 'INTÉGRATION DES RECETTES',
    recipesTitle: 'Cuisinez une fois, cochez plusieurs.',
    recipesText: "Chaque recette de notre bibliothèque est étiquetée avec les catégories Daily Dozen qu'elle couvre. Un seul petit-déjeuner comme nos Overnight Oats Longévité coche 6 des 12 catégories en un repas : Céréales complètes, Baies, Autres fruits, Graines de lin, Noix & graines, et Épices.",
    recipesCta: 'Parcourir les recettes →',
    recipeName: 'Longevity Overnight Oats',
    recipeServingNote: '6 des 12 catégories Daily Dozen en un repas',
    recipesBadges: ['🌾 Céréales complètes', '🫐 Baies', '🍎 Autres fruits', '🌱 Graines de lin', '🥜 Noix & graines', '🧂 Épices'],
    b12Text: "Le Dr Greger recommande également de se supplémenter en Vitamine B12 : au moins 2 000 mcg de cyanocobalamine par semaine (ou 50 mcg par jour), idéalement sous forme de supplément à croquer ou sublingual. Il s'agit du seul nutriment qui n'est pas disponible de manière fiable dans une alimentation végétale.",
    booksTag: 'ALLER PLUS LOIN',
    booksTitle: 'Les livres derrière la science.',
    books: [
      { title: 'How Not to Die', year: '2015', desc: "Examine les 15 principales causes de décès et montre comment les interventions alimentaires peuvent les prévenir et les inverser. Le livre qui a lancé le concept du Daily Dozen." },
      { title: 'How Not to Diet', year: '2019', desc: "La science de la perte de poids. Présente les Twenty-One Tweaks — des stratégies fondées sur des preuves pour une gestion du poids durable et saine." },
      { title: 'How Not to Age', year: '2023', desc: "Cible les 11 caractéristiques du vieillissement avec des interventions alimentaires. Le guide anti-âge le plus complet basé sur des preuves." },
    ],
    booksNote: "100% des recettes des livres du Dr Greger sont reversées à des œuvres caritatives.",
    booksLink: 'Explorer tous les livres sur NutritionFacts.org →',
    statsItems: [
      { stat: '12', label: 'Catégories alimentaires' },
      { stat: '24+', label: 'Portions quotidiennes' },
      { stat: '20 000+', label: 'Citations dans 3 livres' },
      { stat: '3', label: 'Livres bestsellers' },
    ],
    resourcesNote: "Le Daily Dozen est la création du Dr Greger. Nous avons construit notre tracker comme un compagnon numérique inspiré de son travail.",
    resourceLink: 'NutritionFacts.org',
    ctaDark: 'Commencez à suivre votre Daily Dozen aujourd\'hui.',
    ctaSub: "Compte gratuit. Aucune carte bancaire. Cochez vos premières catégories en moins d'une minute.",
    ctaCta1: 'Créer un compte gratuit',
    ctaCta2: 'Explorer les recettes',
  },
  es: {
    tag: 'DAILY DOZEN',
    title: 'Registra lo que más importa.',
    sub: 'El Daily Dozen es la lista de verificación basada en evidencia del Dr. Michael Greger con 12 categorías de alimentos y hábitos de vida para incorporar en tu rutina diaria. Basada en décadas de investigación nutricional, identifica los alimentos más saludables que pueden ayudar a prevenir enfermedades crónicas y promover la longevidad.',
    gregerTag: 'LA INSPIRACIÓN',
    gregerTitle: 'Basado en el trabajo del Dr. Michael Greger.',
    gregerP1: 'El Dr. Michael Greger, M.D., FACLM, es médico, autor de bestsellers del New York Times y conferenciante reconocido internacionalmente sobre nutrición y salud pública. Fundó NutritionFacts.org, una organización sin fines de lucro que proporciona información gratuita y científica sobre el papel de la dieta en la prevención y el tratamiento de enfermedades.',
    gregerP2: 'Su libro emblemático How Not to Die (2015) examina las principales causas de muerte y muestra cómo los cambios dietéticos pueden prevenirlas. Lo siguió con How Not to Diet (2019) y How Not to Age (2023), cada uno basado en miles de estudios revisados por pares. El 100% de los beneficios de sus libros se dona a organizaciones benéficas.',
    gregerP3: 'La lista Daily Dozen surgió de la investigación del Dr. Greger como una herramienta práctica para asegurarse de que las personas coman los alimentos más saludables todos los días. Nuestra implementación en Evida Life lleva este concepto a un rastreador digital con visualización de progreso.',
    gregerNote: 'Más información en NutritionFacts.org →',
    gregerLink: 'https://nutritionfacts.org/daily-dozen/',
    catsHeading: 'Las 12 categorías',
    serving: 'porción',
    servings: 'porciones',
    trackerTag: 'TU RASTREADOR DIARIO',
    trackerTitle: 'Casillas simples. Impacto real.',
    trackerSub: 'Cuando estás conectado, el Daily Dozen se convierte en un rastreador interactivo. Marca cada porción a medida que la comes durante el día. El indicador de progreso se va llenando — haciendo que sea satisfactorio y motivador completar tu docena.',
    trackerFeatures: [
      { title: 'Casillas diarias', desc: 'Toca para marcar cada porción. Ve cómo se llena tu progreso en tiempo real. Simple de usar incluso mientras cocinas.' },
      { title: 'Indicador de progreso', desc: 'Un indicador visual muestra cuántas de las 12 categorías has completado hoy. Apunta al 100% cada día.' },
      { title: 'Integración de recetas', desc: 'Nuestras recetas integrales están diseñadas alrededor del Daily Dozen. Cocina una receta y varias categorías se marcan automáticamente.' },
    ],
    gaugeDesc: 'Así se ve tu progreso en el rastreador real',
    catsPillLabel: 'categorías',
    streakPillLabel: 'racha',
    trackerDetail: 'Cada categoría se marca con simples toques. El indicador se llena automáticamente. Al final del día, puedes ver de un vistazo qué tan completo fue tu Daily Dozen.',
    previewNote: 'Vista previa — datos reales después de iniciar sesión',
    recipesTag: 'INTEGRACIÓN DE RECETAS',
    recipesTitle: 'Cocina una vez, marca muchas.',
    recipesText: 'Cada receta de nuestra biblioteca está etiquetada con las categorías Daily Dozen que cubre. Un solo desayuno como nuestros Overnight Oats de Longevidad marca 6 de 12 categorías en una comida: Cereales integrales, Bayas, Otras frutas, Linaza, Frutos secos y semillas, y Especias.',
    recipesCta: 'Explorar recetas →',
    recipeName: 'Longevity Overnight Oats',
    recipeServingNote: '6 de 12 categorías Daily Dozen en una comida',
    recipesBadges: ['🌾 Cereales integrales', '🫐 Bayas', '🍎 Otras frutas', '🌱 Linaza', '🥜 Frutos secos y semillas', '🧂 Especias'],
    b12Text: 'El Dr. Greger también recomienda suplementar con Vitamina B12: al menos 2.000 mcg de cianocobalamina semanalmente (o 50 mcg diarios), idealmente como suplemento masticable o sublingual. Este es el único nutriente que no está disponible de manera confiable en una dieta vegetal.',
    booksTag: 'PROFUNDIZAR',
    booksTitle: 'Los libros detrás de la ciencia.',
    books: [
      { title: 'How Not to Die', year: '2015', desc: 'Examina las 15 principales causas de muerte y muestra cómo las intervenciones dietéticas pueden prevenirlas y revertirlas. El libro que inició el concepto del Daily Dozen.' },
      { title: 'How Not to Diet', year: '2019', desc: 'La ciencia de la pérdida de peso. Presenta los Twenty-One Tweaks — estrategias basadas en evidencia para un manejo del peso sostenible y saludable.' },
      { title: 'How Not to Age', year: '2023', desc: 'Apunta a los 11 marcadores del envejecimiento con intervenciones dietéticas. La guía antiedad más completa basada en evidencia.' },
    ],
    booksNote: 'El 100% de los beneficios de los libros del Dr. Greger se dona a organizaciones benéficas.',
    booksLink: 'Explorar todos los libros en NutritionFacts.org →',
    statsItems: [
      { stat: '12', label: 'Categorías de alimentos' },
      { stat: '24+', label: 'Porciones diarias' },
      { stat: '20.000+', label: 'Citas en 3 libros' },
      { stat: '3', label: 'Libros bestsellers' },
    ],
    resourcesNote: 'El Daily Dozen es la creación del Dr. Greger. Hemos construido nuestro rastreador como un compañero digital inspirado en su trabajo.',
    resourceLink: 'NutritionFacts.org',
    ctaDark: 'Empieza a registrar tu Daily Dozen hoy.',
    ctaSub: 'Cuenta gratuita. Sin tarjeta de crédito. Marca tus primeras categorías en menos de un minuto.',
    ctaCta1: 'Crear cuenta gratuita',
    ctaCta2: 'Explorar recetas',
  },
  it: {
    tag: 'DAILY DOZEN',
    title: 'Traccia ciò che conta di più.',
    sub: "Il Daily Dozen è la lista di controllo basata su prove del Dr. Michael Greger con 12 categorie alimentari e abitudini di vita da incorporare nella routine quotidiana. Basata su decenni di ricerca nutrizionale, identifica gli alimenti più sani che possono aiutare a prevenire le malattie croniche e promuovere la longevità.",
    gregerTag: "L'ISPIRAZIONE",
    gregerTitle: 'Basato sul lavoro del Dr. Michael Greger.',
    gregerP1: "Il Dr. Michael Greger, M.D., FACLM, è un medico, autore bestseller del New York Times e relatore riconosciuto a livello internazionale su nutrizione e salute pubblica. Ha fondato NutritionFacts.org, un'organizzazione no-profit che fornisce informazioni scientifiche gratuite sul ruolo della dieta nella prevenzione e nel trattamento delle malattie.",
    gregerP2: "Il suo libro fondamentale How Not to Die (2015) esamina le principali cause di morte e mostra come i cambiamenti alimentari possano prevenirle. Ha seguito con How Not to Diet (2019) e How Not to Age (2023), ciascuno basato su migliaia di studi peer-reviewed. Il 100% dei proventi dei suoi libri viene donato in beneficenza.",
    gregerP3: "La lista Daily Dozen è emersa dalla ricerca del Dr. Greger come strumento pratico per garantire che le persone mangino ogni giorno i cibi più sani. La nostra implementazione presso Evida Life porta questo concetto in un tracker digitale con visualizzazione dei progressi.",
    gregerNote: 'Scopri di più su NutritionFacts.org →',
    gregerLink: 'https://nutritionfacts.org/daily-dozen/',
    catsHeading: 'Le 12 categorie',
    serving: 'porzione',
    servings: 'porzioni',
    trackerTag: 'IL TUO TRACKER QUOTIDIANO',
    trackerTitle: 'Caselle semplici. Impatto reale.',
    trackerSub: "Quando sei connesso, il Daily Dozen diventa un tracker interattivo. Spunta ogni porzione man mano che la mangi durante il giorno. L'indicatore di avanzamento si riempie — rendendo soddisfacente e motivante completare la tua dozzina.",
    trackerFeatures: [
      { title: 'Caselle giornaliere', desc: 'Tocca per spuntare ogni porzione. Guarda come si riempie il tuo progresso in tempo reale. Abbastanza semplice da usare mentre cucini.' },
      { title: 'Indicatore di avanzamento', desc: 'Un indicatore visivo mostra quante delle 12 categorie hai completato oggi. Punta al 100% ogni giorno.' },
      { title: 'Integrazione ricette', desc: 'Le nostre ricette a base di alimenti integrali sono progettate intorno al Daily Dozen. Cucina una ricetta e più categorie vengono spuntate automaticamente.' },
    ],
    gaugeDesc: 'Ecco come appare il tuo progresso nel tracker reale',
    catsPillLabel: 'categorie',
    streakPillLabel: 'serie',
    trackerDetail: 'Ogni categoria viene spuntata con semplici tocchi. L\'indicatore si riempie automaticamente. A fine giornata, puoi vedere in un colpo d\'occhio quanto era completo il tuo Daily Dozen.',
    previewNote: 'Anteprima — dati reali dopo l\'accesso',
    recipesTag: 'INTEGRAZIONE RICETTE',
    recipesTitle: 'Cucina una volta, spunta molte.',
    recipesText: "Ogni ricetta nella nostra libreria è etichettata con le categorie Daily Dozen che copre. Una singola colazione come i nostri Overnight Oats Longevità spunta 6 delle 12 categorie in un pasto: Cereali integrali, Bacche, Altra frutta, Semi di lino, Noci e semi e Spezie.",
    recipesCta: 'Sfoglia le ricette →',
    recipeName: 'Longevity Overnight Oats',
    recipeServingNote: '6 delle 12 categorie Daily Dozen in un pasto',
    recipesBadges: ['🌾 Cereali integrali', '🫐 Bacche', '🍎 Altra frutta', '🌱 Semi di lino', '🥜 Noci e semi', '🧂 Spezie'],
    b12Text: "Il Dr. Greger raccomanda anche di integrare con Vitamina B12: almeno 2.000 mcg di cianocobalamina settimanalmente (o 50 mcg al giorno), idealmente come integratore masticabile o sublinguale. Questo è l'unico nutriente non disponibile in modo affidabile da una dieta a base vegetale.",
    booksTag: 'APPROFONDIRE',
    booksTitle: 'I libri dietro la scienza.',
    books: [
      { title: 'How Not to Die', year: '2015', desc: "Esamina le 15 principali cause di morte e mostra come gli interventi alimentari possano prevenirle e invertirle. Il libro che ha dato origine al concetto del Daily Dozen." },
      { title: 'How Not to Diet', year: '2019', desc: "La scienza della perdita di peso. Introduce i Twenty-One Tweaks — strategie basate su prove per una gestione del peso sostenibile e sana." },
      { title: 'How Not to Age', year: '2023', desc: "Punta agli 11 marcatori dell'invecchiamento con interventi alimentari. La guida anti-aging basata su prove più completa." },
    ],
    booksNote: 'Il 100% dei proventi dai libri del Dr. Greger viene donato in beneficenza.',
    booksLink: 'Esplora tutti i libri su NutritionFacts.org →',
    statsItems: [
      { stat: '12', label: 'Categorie alimentari' },
      { stat: '24+', label: 'Porzioni giornaliere' },
      { stat: '20.000+', label: 'Citazioni in 3 libri' },
      { stat: '3', label: 'Libri bestseller' },
    ],
    resourcesNote: 'Il Daily Dozen è la creazione del Dr. Greger. Abbiamo costruito il nostro tracker come compagno digitale ispirato al suo lavoro.',
    resourceLink: 'NutritionFacts.org',
    ctaDark: 'Inizia a tracciare il tuo Daily Dozen oggi.',
    ctaSub: 'Account gratuito. Nessuna carta di credito. Spunta le tue prime categorie in meno di un minuto.',
    ctaCta1: 'Crea account gratuito',
    ctaCta2: 'Esplora le ricette',
  },
};

const DD_CATEGORIES: Record<Lang, { emoji: string; name: string; servings: number; serving_example: string; why: string }[]> = {
  de: [
    { emoji: '🫘', name: 'Hülsenfrüchte',       servings: 3, serving_example: 'z. B. ½ Tasse Bohnen, ¼ Tasse Hummus',            why: 'Reich an Ballaststoffen, Folsäure und Pflanzenprotein' },
    { emoji: '🫐', name: 'Beeren',               servings: 1, serving_example: 'z. B. ½ Tasse frisch oder gefroren',               why: 'Höchster Antioxidantiengehalt aller Früchte' },
    { emoji: '🍎', name: 'Andere Früchte',        servings: 3, serving_example: 'z. B. 1 mittelgroße Frucht, ¼ Tasse getrocknet',   why: 'Essentielle Vitamine, Mineralien und Phytonährstoffe' },
    { emoji: '🥦', name: 'Kreuzblütler',          servings: 1, serving_example: 'z. B. ½ Tasse gehackt, 1 EL Meerrettich',          why: 'Sulforaphan aktiviert Entgiftungsenzyme' },
    { emoji: '🥬', name: 'Grünes Blattgemüse',    servings: 2, serving_example: 'z. B. 1 Tasse roh, ½ Tasse gegart',                why: 'Nährstoffreichste Lebensmittelkategorie' },
    { emoji: '🥕', name: 'Anderes Gemüse',        servings: 2, serving_example: 'z. B. ½ Tasse nicht-blattiges Gemüse',             why: 'Ballaststoffe, Kalium und diverse Phytonährstoffe' },
    { emoji: '🌱', name: 'Leinsamen',             servings: 1, serving_example: 'z. B. 1 EL gemahlen',                              why: 'Reichste pflanzliche Omega-3-Quelle (ALA)' },
    { emoji: '🥜', name: 'Nüsse & Samen',         servings: 1, serving_example: 'z. B. ¼ Tasse Nüsse, 2 EL Nussbutter',            why: 'Mit reduzierter kardiovaskulärer Sterblichkeit verbunden' },
    { emoji: '🌾', name: 'Vollkornprodukte',       servings: 3, serving_example: 'z. B. ½ Tasse Heißbrei, 1 Scheibe Brot',          why: 'Mit niedrigerer Gesamtsterblichkeit assoziiert' },
    { emoji: '🧂', name: 'Gewürze',               servings: 1, serving_example: 'z. B. ¼ TL Kurkuma',                               why: 'Curcumin hat starke entzündungshemmende Eigenschaften' },
    { emoji: '💧', name: 'Wasser',                servings: 5, serving_example: 'z. B. Wasser, grüner Tee, Hibiskustee',            why: 'Essentiell für jeden Stoffwechselprozess' },
    { emoji: '🏃', name: 'Bewegung',              servings: 1, serving_example: 'z. B. 90 Min. moderat oder 40 Min. intensiv',      why: 'Reduziert das Risiko von 13+ Krebsarten' },
  ],
  en: [
    { emoji: '🫘', name: 'Beans',             servings: 3, serving_example: 'e.g., ½ cup cooked beans, ¼ cup hummus',          why: 'Rich in fiber, folate, and plant protein' },
    { emoji: '🫐', name: 'Berries',           servings: 1, serving_example: 'e.g., ½ cup fresh or frozen, ¼ cup dried',        why: 'Highest antioxidant content of any fruit' },
    { emoji: '🍎', name: 'Other Fruits',      servings: 3, serving_example: 'e.g., 1 medium fruit, ¼ cup dried',               why: 'Essential vitamins, minerals, and phytonutrients' },
    { emoji: '🥦', name: 'Cruciferous Veg',  servings: 1, serving_example: 'e.g., ½ cup chopped, 1 tbsp horseradish',          why: 'Sulforaphane activates detox enzymes' },
    { emoji: '🥬', name: 'Greens',            servings: 2, serving_example: 'e.g., 1 cup raw, ½ cup cooked',                   why: 'Most nutrient-dense food category' },
    { emoji: '🥕', name: 'Other Vegetables', servings: 2, serving_example: 'e.g., ½ cup non-leafy vegetables',                 why: 'Fiber, potassium, and diverse phytonutrients' },
    { emoji: '🌱', name: 'Flaxseeds',         servings: 1, serving_example: 'e.g., 1 tbsp ground',                             why: 'Richest plant-based omega-3 (ALA) source' },
    { emoji: '🥜', name: 'Nuts & Seeds',      servings: 1, serving_example: 'e.g., ¼ cup nuts, 2 tbsp nut butter',             why: 'Linked to reduced cardiovascular mortality' },
    { emoji: '🌾', name: 'Whole Grains',      servings: 3, serving_example: 'e.g., ½ cup hot cereal, 1 slice bread',           why: 'Associated with lower all-cause mortality' },
    { emoji: '🧂', name: 'Spices',            servings: 1, serving_example: 'e.g., ¼ tsp turmeric',                            why: 'Curcumin has powerful anti-inflammatory properties' },
    { emoji: '💧', name: 'Water',             servings: 5, serving_example: 'e.g., water, green tea, hibiscus tea',             why: 'Essential for every metabolic process' },
    { emoji: '🏃', name: 'Exercise',          servings: 1, serving_example: 'e.g., 90 min moderate or 40 min vigorous',         why: 'Reduces risk of 13+ types of cancer' },
  ],
  fr: [
    { emoji: '🫘', name: 'Légumineuses',        servings: 3, serving_example: 'p.ex. ½ tasse de légumineuses cuites, ¼ tasse de houmous', why: 'Riche en fibres, folate et protéines végétales' },
    { emoji: '🫐', name: 'Baies',               servings: 1, serving_example: 'p.ex. ½ tasse fraîches ou surgelées',                      why: 'Teneur en antioxydants la plus élevée de tous les fruits' },
    { emoji: '🍎', name: 'Autres fruits',        servings: 3, serving_example: 'p.ex. 1 fruit moyen, ¼ tasse séchés',                      why: 'Vitamines, minéraux et phytonutriments essentiels' },
    { emoji: '🥦', name: 'Légumes crucifères',   servings: 1, serving_example: 'p.ex. ½ tasse hachés, 1 c. à soupe de raifort',            why: 'Le sulforaphane active les enzymes de détoxification' },
    { emoji: '🥬', name: 'Légumes verts',        servings: 2, serving_example: 'p.ex. 1 tasse crus, ½ tasse cuits',                        why: "Catégorie d'aliments la plus riche en nutriments" },
    { emoji: '🥕', name: 'Autres légumes',       servings: 2, serving_example: 'p.ex. ½ tasse de légumes non feuillus',                    why: 'Fibres, potassium et phytonutriments divers' },
    { emoji: '🌱', name: 'Graines de lin',       servings: 1, serving_example: 'p.ex. 1 c. à soupe moulues',                               why: 'Source la plus riche en oméga-3 végétal (ALA)' },
    { emoji: '🥜', name: 'Noix & graines',       servings: 1, serving_example: 'p.ex. ¼ tasse de noix, 2 c. à soupe de beurre de noix',   why: 'Lié à une réduction de la mortalité cardiovasculaire' },
    { emoji: '🌾', name: 'Céréales complètes',   servings: 3, serving_example: 'p.ex. ½ tasse de céréale chaude, 1 tranche de pain',       why: 'Associé à une mortalité toutes causes confondues plus faible' },
    { emoji: '🧂', name: 'Épices',               servings: 1, serving_example: 'p.ex. ¼ c. à café de curcuma',                             why: 'La curcumine a de puissantes propriétés anti-inflammatoires' },
    { emoji: '💧', name: 'Eau',                  servings: 5, serving_example: "p.ex. eau, thé vert, thé d'hibiscus",                       why: 'Essentielle à chaque processus métabolique' },
    { emoji: '🏃', name: 'Exercice',             servings: 1, serving_example: 'p.ex. 90 min modéré ou 40 min intense',                    why: 'Réduit le risque de 13+ types de cancer' },
  ],
  es: [
    { emoji: '🫘', name: 'Legumbres',              servings: 3, serving_example: 'p.ej. ½ taza de legumbres cocidas, ¼ taza de hummus',    why: 'Ricas en fibra, folato y proteína vegetal' },
    { emoji: '🫐', name: 'Bayas',                  servings: 1, serving_example: 'p.ej. ½ taza frescas o congeladas',                       why: 'Mayor contenido de antioxidantes de todas las frutas' },
    { emoji: '🍎', name: 'Otras frutas',            servings: 3, serving_example: 'p.ej. 1 fruta mediana, ¼ taza secas',                     why: 'Vitaminas, minerales y fitonutrientes esenciales' },
    { emoji: '🥦', name: 'Crucíferas',              servings: 1, serving_example: 'p.ej. ½ taza picadas, 1 cda de rábano picante',           why: 'El sulforafano activa las enzimas de desintoxicación' },
    { emoji: '🥬', name: 'Verduras de hoja',        servings: 2, serving_example: 'p.ej. 1 taza crudas, ½ taza cocidas',                    why: 'Categoría de alimentos más densa en nutrientes' },
    { emoji: '🥕', name: 'Otras verduras',          servings: 2, serving_example: 'p.ej. ½ taza de verduras no foliosas',                   why: 'Fibra, potasio y fitonutrientes diversos' },
    { emoji: '🌱', name: 'Linaza',                  servings: 1, serving_example: 'p.ej. 1 cda molida',                                     why: 'Fuente más rica de omega-3 vegetal (ALA)' },
    { emoji: '🥜', name: 'Frutos secos y semillas', servings: 1, serving_example: 'p.ej. ¼ taza de nueces, 2 cdas de mantequilla',          why: 'Asociado con reducción de mortalidad cardiovascular' },
    { emoji: '🌾', name: 'Cereales integrales',     servings: 3, serving_example: 'p.ej. ½ taza de cereal caliente, 1 rebanada de pan',     why: 'Asociado con menor mortalidad por todas las causas' },
    { emoji: '🧂', name: 'Especias',                servings: 1, serving_example: 'p.ej. ¼ cdta de cúrcuma',                                why: 'La curcumina tiene poderosas propiedades antiinflamatorias' },
    { emoji: '💧', name: 'Agua',                    servings: 5, serving_example: 'p.ej. agua, té verde, té de hibisco',                    why: 'Esencial para cada proceso metabólico' },
    { emoji: '🏃', name: 'Ejercicio',               servings: 1, serving_example: 'p.ej. 90 min moderado o 40 min vigoroso',               why: 'Reduce el riesgo de 13+ tipos de cáncer' },
  ],
  it: [
    { emoji: '🫘', name: 'Legumi',              servings: 3, serving_example: 'es. ½ tazza di legumi cotti, ¼ tazza di hummus',          why: 'Ricchi di fibre, folato e proteine vegetali' },
    { emoji: '🫐', name: 'Bacche',              servings: 1, serving_example: 'es. ½ tazza fresche o surgelate',                         why: 'Maggior contenuto di antiossidanti tra tutta la frutta' },
    { emoji: '🍎', name: 'Altra frutta',         servings: 3, serving_example: 'es. 1 frutto medio, ¼ tazza secchi',                     why: 'Vitamine, minerali e fitonutrienti essenziali' },
    { emoji: '🥦', name: 'Verdure crocifere',    servings: 1, serving_example: 'es. ½ tazza tritate, 1 cucchiaio di rafano',             why: 'Il sulforafano attiva gli enzimi di disintossicazione' },
    { emoji: '🥬', name: 'Verdure a foglia',     servings: 2, serving_example: 'es. 1 tazza crude, ½ tazza cotte',                      why: 'Categoria di alimenti più densa di nutrienti' },
    { emoji: '🥕', name: 'Altre verdure',        servings: 2, serving_example: 'es. ½ tazza di verdure non a foglia',                   why: 'Fibre, potassio e diversi fitonutrienti' },
    { emoji: '🌱', name: 'Semi di lino',         servings: 1, serving_example: 'es. 1 cucchiaio macinati',                              why: 'Fonte più ricca di omega-3 vegetale (ALA)' },
    { emoji: '🥜', name: 'Noci e semi',          servings: 1, serving_example: 'es. ¼ tazza di noci, 2 cucchiai di burro di noci',      why: 'Associato a ridotta mortalità cardiovascolare' },
    { emoji: '🌾', name: 'Cereali integrali',    servings: 3, serving_example: 'es. ½ tazza di cereale caldo, 1 fetta di pane',         why: 'Associato a minore mortalità per tutte le cause' },
    { emoji: '🧂', name: 'Spezie',               servings: 1, serving_example: 'es. ¼ cucchiaino di curcuma',                           why: 'La curcumina ha potenti proprietà antinfiammatorie' },
    { emoji: '💧', name: 'Acqua',                servings: 5, serving_example: "es. acqua, tè verde, tè all'ibisco",                    why: 'Essenziale per ogni processo metabolico' },
    { emoji: '🏃', name: 'Esercizio',            servings: 1, serving_example: 'es. 90 min moderato o 40 min vigoroso',                 why: 'Riduce il rischio di 13+ tipi di cancro' },
  ],
};

const OATS_PHOTO = 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&q=80';

export default async function DailyDozenPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

  const params = await searchParams;
  const viewInfo = params.view === 'info';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ─── Authenticated + not requesting info view: show tracker ──────────────────
  if (user && !viewInfo) {
    const t = T_TRACKER[lang];

    const today = new Date().toISOString().split('T')[0];
    const historyStart = new Date(today + 'T12:00:00');
    historyStart.setDate(historyStart.getDate() - 89);
    const historyStartStr = historyStart.toISOString().split('T')[0];

    const [
      { data: categoryRows },
      { data: histEntryRows },
      { data: streakRow },
      { data: checklistItems },
      { data: checklistEntryRows },
      { data: userSettings },
    ] = await Promise.all([
      supabase
        .from('daily_dozen_categories')
        .select('id, slug, name, target_servings, icon, sort_order, details')
        .order('sort_order'),

      supabase
        .from('daily_dozen_entries')
        .select('category_id, entry_date, servings_completed')
        .eq('user_id', user.id)
        .gte('entry_date', historyStartStr)
        .lte('entry_date', today)
        .order('entry_date'),

      supabase
        .from('daily_dozen_streaks')
        .select('current_streak_days, longest_streak_days, last_completed_date')
        .eq('user_id', user.id)
        .single(),

      supabase
        .from('daily_checklist_items')
        .select('id, framework, category, name_en, name_de, name_fr, name_es, name_it, description_en, description_de, description_fr, description_es, description_it, target_servings, unit, icon, sort_order')
        .eq('is_active', true)
        .order('sort_order'),

      supabase
        .from('daily_checklist_entries')
        .select('checklist_item_id, servings_completed, is_done')
        .eq('user_id', user.id)
        .eq('entry_date', today),

      supabase
        .from('user_settings')
        .select('tweaks_enabled, anti_aging_enabled')
        .eq('user_id', user.id)
        .single(),
    ]);

    const categories: DDCategory[] = (categoryRows ?? []).map((r) => ({
      id:              r.id,
      slug:            r.slug,
      name:            (r.name as { de?: string; en?: string }) ?? {},
      target_servings: r.target_servings,
      icon:            r.icon ?? null,
      sort_order:      r.sort_order,
      details:         (r.details as DDCategory['details']) ?? null,
    }));

    const entries: DDEntry[] = (histEntryRows ?? [])
      .filter((r) => r.entry_date === today)
      .map((r) => ({ category_id: r.category_id, servings: r.servings_completed }));

    const historicalEntries: HistoricalEntry[] = (histEntryRows ?? []).map((r) => ({
      category_id: r.category_id,
      date:        r.entry_date,
      servings:    r.servings_completed,
    }));

    const streak: DDStreak | null = streakRow
      ? {
          current_streak:      streakRow.current_streak_days,
          longest_streak:      streakRow.longest_streak_days,
          last_completed_date: streakRow.last_completed_date ?? null,
        }
      : null;

    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col">
        <PublicNav />
        <section className="w-full bg-[#0e393d] px-6 pt-28 pb-14">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-4">{t.heading}</h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xl">{t.sub}</p>
          </div>
        </section>
        <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8">

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-[#ceab84]/30 bg-[#ceab84]/8 px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#8a6a3e] mb-1">
                {locale === 'de' ? 'Datenbank-Migration erforderlich' : 'Database migration required'}
              </p>
              <p className="text-xs text-[#8a6a3e]/70">
                {locale === 'de'
                  ? 'Bitte führe die Migration 20260318000004_daily_dozen.sql im Supabase SQL Editor aus.'
                  : 'Please apply migration 20260318000004_daily_dozen.sql in the Supabase SQL Editor.'}
              </p>
            </div>
          ) : (
            <DailyChecklistTabs
              userId={user.id}
              lang={lang}
              today={today}
              tweaksEnabled={userSettings?.tweaks_enabled ?? false}
              antiAgingEnabled={userSettings?.anti_aging_enabled ?? false}
              checklistItems={(checklistItems ?? []) as ChecklistItem[]}
              checklistEntries={(checklistEntryRows ?? []) as ChecklistEntry[]}
              ddTrackerProps={{
                categories,
                entries,
                streak,
                historicalEntries,
              }}
            />
          )}
        </main>
        <PublicFooter />
      </div>
    );
  }

  // ─── Public: show explainer ───────────────────────────────────────────────────
  const t = T_PUBLIC[lang];
  const cats = DD_CATEGORIES[lang];

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">
      <PublicNav />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────────── */}
      <section className="w-full bg-[#0e393d] px-8 md:px-12 pt-28 pb-16">
        <div className="max-w-[1060px] mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.tag}</p>
          <h1 className="font-serif font-normal text-4xl md:text-5xl text-white leading-tight mb-5 max-w-[640px]">
            {t.title}
          </h1>
          <p className="text-white/60 text-base leading-relaxed max-w-[580px]">{t.sub}</p>
        </div>
      </section>

      {/* ── 2. DR. GREGER PROFILE ───────────────────────────────────────────────── */}
      <section className="border-t border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
          <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.gregerTag}</p>
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.12] tracking-tight mb-10 max-w-[600px]">
            {t.gregerTitle}
          </h2>
          <div className="flex flex-col md:flex-row gap-10 md:gap-14">
            <div className="shrink-0">
              <div className="relative w-[180px] h-[220px] rounded-2xl overflow-hidden ring-1 ring-[#0e393d]/10">
                <Image
                  src="/images/dr-greger.png"
                  alt="Dr. Michael Greger"
                  fill
                  className="object-cover object-top"
                  sizes="180px"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 max-w-[680px]">
              <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed">{t.gregerP1}</p>
              <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed">{t.gregerP2}</p>
              <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed">{t.gregerP3}</p>
              <a
                href={t.gregerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.88rem] text-[#ceab84] hover:underline mt-1 self-start"
              >
                {t.gregerNote}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. THE 12 CATEGORIES ────────────────────────────────────────────────── */}
      <section className="bg-[#0e393d] py-16 md:py-20 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-white leading-[1.1] tracking-tight mb-10">
            {t.catsHeading}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cats.map((cat) => (
              <div
                key={cat.name}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1.5"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <p className="text-white font-light text-[0.88rem] leading-snug mt-0.5">{cat.name}</p>
                <p className="text-white/50 text-[0.72rem]">{cat.servings} {cat.servings === 1 ? t.serving : t.servings}</p>
                <p className="text-white/35 text-[0.67rem] leading-snug">{cat.serving_example}</p>
                <p className="text-[#ceab84]/70 text-[0.67rem] leading-snug italic mt-0.5">{cat.why}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW THE TRACKER WORKS ────────────────────────────────────────────── */}
      <section className="border-b border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
          <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.trackerTag}</p>
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.12] tracking-tight mb-5 max-w-[520px]">
            {t.trackerTitle}
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed mb-10 max-w-[600px]">{t.trackerSub}</p>

          {/* Tachometer gauge mockup */}
          <div className="flex flex-col items-center mb-10">
            <svg viewBox="0 0 260 210" width="100%" style={{ maxWidth: 260, overflow: 'visible' }} aria-hidden="true">
              {Array.from({ length: G_SEGS }, (_, i) => (
                <path key={i} d={gSegPath(i)} fill={i < 8 ? '#C4A96A' : 'rgba(14,57,61,0.06)'} />
              ))}
              <text x={G_CX} y={G_CY + 58} textAnchor="middle" fontSize={46} fontWeight={700}
                fill="#0e393d" style={{ fontFamily: '-apple-system, system-ui, sans-serif' }}>16</text>
              <text x={G_L0X.toFixed(1)} y={G_L0Y.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#aaa">0</text>
              <text x={G_LTX.toFixed(1)} y={G_LTY.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#aaa">24</text>
              <path d={G_NEEDLE_PATH} fill="#1c2a2b" opacity={0.65} />
              <circle cx={G_CX} cy={G_CY} r={6} fill="#1c2a2b" opacity={0.15} />
              <circle cx={G_CX} cy={G_CY} r={3.5} fill="white" stroke="#1c2a2b" strokeWidth={1} opacity={0.8} />
            </svg>
            <p className="text-[12px] text-[#888] mt-1 mb-3">{t.gaugeDesc}</p>
            <div className="flex gap-2.5">
              <div className="text-center px-3 py-1.5 bg-[#f5f4f0] rounded-lg">
                <div className="text-[13px] font-medium text-[#C4A96A]">8/12</div>
                <div className="text-[10px] text-[#888] mt-0.5">{t.catsPillLabel}</div>
              </div>
              <div className="text-center px-3 py-1.5 bg-[#f5f4f0] rounded-lg">
                <div className="text-[13px] font-medium text-[#0e393d]">67%</div>
                <div className="text-[10px] text-[#888] mt-0.5">score</div>
              </div>
              <div className="text-center px-3 py-1.5 bg-[#f5f4f0] rounded-lg">
                <div className="text-[13px] font-medium text-[#0e393d]">14</div>
                <div className="text-[10px] text-[#888] mt-0.5">{t.streakPillLabel}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {t.trackerFeatures.map((f, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 p-6 flex flex-col gap-3">
                <p className="text-[0.88rem] font-semibold text-[#0e393d]">{f.title}</p>
                <p className="text-[0.83rem] text-[#5a6e6f] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-[0.88rem] text-[#5a6e6f] leading-relaxed mb-8 max-w-[520px]">{t.trackerDetail}</p>

          {/* Tracker preview */}
          <div className="max-w-[480px] mb-10">
            <div className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden">
              {[
                { emoji: cats[0].emoji, name: cats[0].name, target: 3, filled: 3 },
                { emoji: cats[1].emoji, name: cats[1].name, target: 1, filled: 1 },
                { emoji: cats[4].emoji, name: cats[4].name, target: 2, filled: 1 },
                { emoji: cats[8].emoji, name: cats[8].name, target: 3, filled: 2 },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-[#0e393d]/5 last:border-0">
                  <span className="text-xl">{row.emoji}</span>
                  <span className="flex-1 text-[0.82rem] text-[#0e393d]">{row.name}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: row.target }, (_, j) => (
                      <div key={j} className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] ${j < row.filled ? 'bg-[#0e393d] border-[#0e393d] text-white' : 'bg-white border-[#0e393d]/20'}`}>
                        {j < row.filled ? '✓' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#888] mt-2 text-center">{t.previewNote}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Link
              href="/login"
              className="bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
            >
              {t.ctaCta1}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. WORKS WITH OUR RECIPES ───────────────────────────────────────────── */}
      <section className="border-b border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
          <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.recipesTag}</p>
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.12] tracking-tight mb-5 max-w-[520px]">
            {t.recipesTitle}
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed mb-8 max-w-[620px]">{t.recipesText}</p>

          <div className="rounded-2xl overflow-hidden ring-1 ring-[#0e393d]/8 bg-white max-w-[480px] mx-auto">
            <div className="relative h-52 overflow-hidden">
              <Image
                src={OATS_PHOTO}
                alt="Overnight oats"
                fill
                className="object-cover"
                sizes="480px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white font-serif text-xl leading-snug">{t.recipeName}</p>
                <p className="text-white/70 text-[0.75rem] mt-0.5">{t.recipeServingNote}</p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {t.recipesBadges.map((badge, i) => (
                  <span key={i} className="text-[11px] bg-[#0e393d]/5 text-[#0e393d] ring-1 ring-[#0e393d]/15 rounded-full px-3 py-1">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/recipes" className="text-[0.88rem] text-[#ceab84] hover:underline">
              {t.recipesCta}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. VITAMIN B12 NOTE ─────────────────────────────────────────────────── */}
      <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-10">
        <div className="rounded-xl bg-[#f2ebdb] p-6 max-w-[800px]">
          <p className="text-[0.88rem] font-semibold text-[#0e393d] mb-1.5">Vitamin B12</p>
          <p className="text-[0.85rem] text-[#5a6e6f] leading-relaxed">{t.b12Text}</p>
        </div>
      </div>

      {/* ── 7. RECOMMENDED READING ──────────────────────────────────────────────── */}
      <section className="border-t border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
          <p className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase mb-4">{t.booksTag}</p>
          <h2 className="font-serif font-normal text-3xl md:text-4xl text-[#0e393d] leading-[1.12] tracking-tight mb-10 max-w-[520px]">
            {t.booksTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {t.books.map((book, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 p-7 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-xl text-[#0e393d] leading-snug">{book.title}</h3>
                  <span className="shrink-0 text-[10px] font-semibold bg-[#0e393d]/8 text-[#0e393d]/60 rounded-full px-2.5 py-1 mt-0.5">
                    {book.year}
                  </span>
                </div>
                <p className="text-[0.83rem] text-[#5a6e6f] leading-relaxed">{book.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-[0.83rem] text-[#5a6e6f] mb-2">{t.booksNote}</p>
          <a
            href="https://nutritionfacts.org/books/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.88rem] text-[#ceab84] hover:underline"
          >
            {t.booksLink}
          </a>
        </div>
      </section>

      {/* ── 8. BY THE NUMBERS ───────────────────────────────────────────────────── */}
      <section className="bg-[#0e393d]/4 border-t border-b border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {t.statsItems.map((item, i) => (
              <div key={i} className="text-center">
                <p className="font-serif text-4xl text-[#0e393d] mb-1">{item.stat}</p>
                <p className="text-[0.78rem] text-[#5a6e6f] uppercase tracking-wide">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. EXTERNAL RESOURCES ───────────────────────────────────────────────── */}
      <section className="border-b border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-12">
          <p className="text-[0.88rem] text-[#5a6e6f] leading-relaxed mb-5 max-w-[560px]">{t.resourcesNote}</p>
          <a
            href="https://nutritionfacts.org/daily-dozen/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.88rem] text-[#ceab84] hover:underline"
          >
            {t.resourceLink} →
          </a>
        </div>
      </section>

      {/* ── 10. BOTTOM CTA ──────────────────────────────────────────────────────── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-16 md:py-20">
        <div className="rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-3 leading-tight">{t.ctaDark}</h2>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">{t.ctaSub}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/login"
              className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
            >
              {t.ctaCta1}
            </Link>
            <Link
              href="/recipes"
              className="text-white border border-white/30 text-[13px] font-light px-8 py-3.5 rounded-full transition-all hover:bg-white/10 whitespace-nowrap"
            >
              {t.ctaCta2}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
