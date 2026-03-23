import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'How to Start – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

// ── Translations ──────────────────────────────────────────────────────────────
const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  breakfastTag: string;
  breakfastTitle: string;
  breakfastSub: string;
  ingredientsLabel: string;
  ingredients: string[];
  stepsLabel: string;
  steps: string[];
  toppingsLabel: string;
  toppings: string[];
  whyLabel: string;
  whyText: string;
  ddBadgeNote: string;
  ddBadges: string[];
  scienceCardTag: string;
  scienceCardTitle: string;
  scienceCardDesc: string;
  scienceCardLink: string;
  rulesTag: string;
  rulesTitle: string;
  rules: { title: string; body: string }[];
  ctaTag: string;
  ctaTitle: string;
  ctaCards: { title: string; desc: string; href: string; cta: string }[];
  dailyDozenLink: string;
}> = {
  de: {
    tag: 'EINSTIEG',
    h1: 'Deine ersten Schritte zu einem längeren, gesünderen Leben.',
    sub: 'Einfach. Praktisch. Wissenschaftlich fundiert.',
    breakfastTag: 'STARTE DEN TAG RICHTIG',
    breakfastTitle: 'Das perfekte Longevity-Frühstück',
    breakfastSub: 'Overnight Oats – in 5 Minuten vorbereitet, über Nacht durchgezogen.',
    ingredientsLabel: 'Zutaten',
    ingredients: [
      '50 g Haferflocken (Vollkorn, nicht Instant)',
      '200 ml ungesüßte Sojamilch (oder Hafermilch)',
      '1 EL schwarze Chiasamen',
      '1 EL gemahlene Leinsamen',
      '1 TL Ceylon-Zimt (nicht Cassia – weniger Cumarin)',
      '1 TL Dattelsirup (oder 1 Medjool-Dattel, gehackt)',
      '½ Apfel, gerieben oder in Würfeln',
    ],
    stepsLabel: 'Zubereitung',
    steps: [
      'Hafer, Sojamilch, Chiasamen, Leinsamen, Zimt, Dattelsirup und Apfel in eine Schüssel geben.',
      'Gut umrühren, verschließen und mindestens 6 Stunden (über Nacht) in den Kühlschrank stellen.',
      'Morgens toppen mit: frischer Mango, gemischten Beeren, Weizenkeimen, Kürbiskernen, Sonnenblumenkernen.',
      'Kalt genießen – oder 2 Minuten aufwärmen.',
    ],
    toppingsLabel: 'Toppings',
    toppings: ['Frische Mango', 'Gemischte Beeren', 'Weizenkeime', 'Kürbiskerne', 'Sonnenblumenkerne'],
    whyLabel: 'Warum es wirkt',
    whyText: 'Vollkorn, Beeren, Nüsse, Samen und Hülsenfrüchte (Soja) gehören laut der Harvard T.H. Chan School of Public Health zu den wichtigsten Lebensmitteln für gesundes Altern.',
    ddBadgeNote: '6 von 12 Daily Dozen Kategorien in einer Mahlzeit',
    ddBadges: [
      '🌾 Vollkorn (Hafer)',
      '🫐 Beeren (gemischte Beeren)',
      '🍎 Weitere Früchte (Apfel, Mango)',
      '🌱 Leinsamen',
      '🥜 Nüsse & Samen (Chia, Kürbis, Sonnenblume)',
      '🧂 Gewürze (Ceylon-Zimt)',
    ],
    scienceCardTag: 'DIE WISSENSCHAFT',
    scienceCardTitle: 'Was sollte man für ein längeres Leben essen?',
    scienceCardDesc: 'Eine 30-Jahres-Studie mit über 105.000 Personen identifizierte, welche Lebensmittel gesundes Altern fördern – und welche es beschleunigen.',
    scienceCardLink: 'Die vollständige Forschung ansehen →',
    rulesTag: 'DREI EINFACHE REGELN',
    rulesTitle: 'So fängst du an',
    rules: [
      { title: 'Ersetze tierische Produkte', body: 'Schritt für Schritt durch vollwertige, pflanzliche Alternativen. Pflanzlich verarbeitete Lebensmittel (z. B. pflanzliche Nuggets) sind grundsätzlich gesünder als ihre tierischen Pendants – aber weniger gut als echte Vollwertkost.' },
      { title: 'Kaufe Lebensmittel ohne Zutatenliste', body: 'Wenn es aus der Erde oder von einem Baum stammt, iss es. Vollwertige pflanzliche Ernährung bedeutet: Echte Lebensmittel, keine Produkte. Je kürzer die Zutatenliste, desto besser.' },
      { title: 'Nutze die Daily Dozen', body: 'Dr. Gregers tägliche Checkliste deckt alle Lebensmittelgruppen ab, die du brauchst – und macht es einfach, den Überblick zu behalten.' },
    ],
    ctaTag: 'NÄCHSTE SCHRITTE',
    ctaTitle: 'Bereit, tiefer einzutauchen?',
    ctaCards: [
      { title: 'Daily Dozen', desc: 'Verfolge deine täglichen pflanzlichen Portionen mit Dr. Gregers Checkliste.', href: '/daily-dozen', cta: 'Zur Daily Dozen →' },
      { title: 'Rezepte', desc: 'Entdecke unsere vollwertigen, pflanzlichen Rezepte – einfach, schnell, lecker.', href: '/recipes', cta: 'Zu den Rezepten →' },
      { title: 'Gesundheit messen', desc: 'Verstehe, wo du heute stehst – mit professionellen Bluttests über unsere Longevity Pakete.', href: '/biomarkers', cta: 'Zu den Tests →' },
    ],
    dailyDozenLink: 'Zur Daily Dozen →',
  },
  en: {
    tag: 'GET STARTED',
    h1: 'Your first steps to a longer, healthier life.',
    sub: 'Simple. Practical. Science-backed.',
    breakfastTag: 'START YOUR MORNING RIGHT',
    breakfastTitle: 'The Perfect Longevity Breakfast',
    breakfastSub: 'Overnight Oats — prepared in 5 minutes, ready by morning.',
    ingredientsLabel: 'Ingredients',
    ingredients: [
      '50g whole rolled oats (not instant)',
      '200ml unsweetened soy milk (or oat milk)',
      '1 tbsp black chia seeds',
      '1 tbsp ground flaxseeds',
      '1 tsp Ceylon cinnamon (not Cassia — lower coumarin)',
      '1 tsp date syrup (or 1 Medjool date, chopped)',
      '½ apple, grated or diced',
    ],
    stepsLabel: 'Instructions',
    steps: [
      'Combine oats, soy milk, chia seeds, flaxseeds, cinnamon, date syrup, and apple in a bowl.',
      'Stir well, seal, and refrigerate overnight (at least 6 hours).',
      'In the morning, top with: fresh mango, mixed berries, wheat germ, pumpkin seeds, sunflower seeds.',
      'Enjoy cold — or warm it up for 2 minutes.',
    ],
    toppingsLabel: 'Toppings',
    toppings: ['Fresh mango', 'Mixed berries', 'Wheat germ', 'Pumpkin seeds', 'Sunflower seeds'],
    whyLabel: 'Why it works',
    whyText: 'Whole grains, berries, nuts, seeds, and legumes (soy) are the top foods for healthy aging according to research from the Harvard T.H. Chan School of Public Health.',
    ddBadgeNote: '6 of 12 Daily Dozen categories in one meal',
    ddBadges: [
      '🌾 Whole Grains (oats)',
      '🫐 Berries (mixed berries)',
      '🍎 Other Fruits (apple, mango)',
      '🌱 Flaxseeds',
      '🥜 Nuts & Seeds (chia, pumpkin, sunflower)',
      '🧂 Spices (Ceylon cinnamon)',
    ],
    scienceCardTag: 'THE SCIENCE',
    scienceCardTitle: 'What should you eat for a longer life?',
    scienceCardDesc: 'A 30-year study of 105,000+ people identified which foods promote — and which accelerate — aging.',
    scienceCardLink: 'See the full research →',
    rulesTag: 'THREE SIMPLE RULES',
    rulesTitle: 'How to begin',
    rules: [
      { title: 'Replace animal products', body: 'Swap them step by step with whole-food plant-based alternatives. Plant-based processed foods (like plant-based chicken nuggets) are generally healthier than their animal counterparts — but less ideal than real whole foods.' },
      { title: 'Buy foods with no ingredients list', body: 'If it grew in the ground or on a tree, eat it. Whole food plant-based means real foods, not products. The shorter the ingredients list, the better.' },
      { title: 'Follow the Daily Dozen', body: 'Dr. Greger\'s daily checklist covers all the food groups you need — and makes it easy to stay on track.' },
    ],
    ctaTag: 'NEXT STEPS',
    ctaTitle: 'Ready to go deeper?',
    ctaCards: [
      { title: 'Daily Dozen', desc: 'Track your daily plant-based servings with Dr. Greger\'s evidence-based checklist.', href: '/daily-dozen', cta: 'Open Daily Dozen →' },
      { title: 'Recipes', desc: 'Explore our whole-food, plant-based recipes — simple, quick, and delicious.', href: '/recipes', cta: 'Browse Recipes →' },
      { title: 'Measure your health', desc: 'Understand where you stand today with professional blood tests via our Longevity packages.', href: '/biomarkers', cta: 'See Blood Tests →' },
    ],
    dailyDozenLink: 'Open Daily Dozen →',
  },
  fr: {
    tag: 'COMMENCER',
    h1: 'Vos premiers pas vers une vie plus longue et plus saine.',
    sub: 'Simple. Pratique. Scientifiquement fondé.',
    breakfastTag: 'BIEN COMMENCER LA JOURNÉE',
    breakfastTitle: 'Le petit-déjeuner longévité idéal',
    breakfastSub: 'Overnight Oats — préparés en 5 minutes, prêts le matin.',
    ingredientsLabel: 'Ingrédients',
    ingredients: [
      "50g de flocons d'avoine entiers (pas instantanés)",
      "200ml de lait de soja non sucré (ou lait d'avoine)",
      '1 c. à soupe de graines de chia noires',
      '1 c. à soupe de graines de lin moulues',
      '1 c. à café de cannelle de Ceylan (pas Cassia — moins de coumarine)',
      '1 c. à café de sirop de dattes (ou 1 datte Medjool hachée)',
      '½ pomme râpée ou en dés',
    ],
    stepsLabel: 'Préparation',
    steps: [
      "Mélanger l'avoine, le lait de soja, les graines de chia, de lin, la cannelle, le sirop de dattes et la pomme dans un bol.",
      'Bien remuer, fermer et réfrigérer toute la nuit (au moins 6 heures).',
      'Le matin, garnir de : mangue fraîche, fruits rouges mélangés, germe de blé, graines de courge, graines de tournesol.',
      'Déguster froid — ou réchauffer 2 minutes.',
    ],
    toppingsLabel: 'Garnitures',
    toppings: ['Mangue fraîche', 'Fruits rouges mélangés', 'Germe de blé', 'Graines de courge', 'Graines de tournesol'],
    whyLabel: 'Pourquoi ça marche',
    whyText: "Les céréales complètes, les baies, les noix, les graines et les légumineuses (soja) sont les principaux aliments pour un vieillissement sain selon la Harvard T.H. Chan School of Public Health.",
    ddBadgeNote: '6 des 12 catégories Daily Dozen en un seul repas',
    ddBadges: [
      '🌾 Céréales complètes (avoine)',
      '🫐 Baies (fruits rouges)',
      '🍎 Autres fruits (pomme, mangue)',
      '🌱 Graines de lin',
      '🥜 Noix & graines (chia, courge, tournesol)',
      '🧂 Épices (cannelle de Ceylan)',
    ],
    scienceCardTag: 'LA SCIENCE',
    scienceCardTitle: 'Que faut-il manger pour vivre plus longtemps ?',
    scienceCardDesc: 'Une étude de 30 ans portant sur plus de 105 000 personnes a identifié quels aliments favorisent — et lesquels accélèrent — le vieillissement.',
    scienceCardLink: 'Voir la recherche complète →',
    rulesTag: 'TROIS RÈGLES SIMPLES',
    rulesTitle: 'Comment commencer',
    rules: [
      { title: "Remplacez les produits animaux", body: "Étape par étape, avec des alternatives végétales complètes. Les aliments végétaux transformés sont généralement plus sains que leurs équivalents animaux — mais moins idéaux que les vrais aliments complets." },
      { title: "Achetez des aliments sans liste d'ingrédients", body: "Si ça pousse dans la terre ou sur un arbre, mangez-le. Une alimentation végétale complète signifie de vrais aliments, pas des produits." },
      { title: 'Suivez le Daily Dozen', body: "La liste de contrôle quotidienne du Dr Greger couvre tous les groupes alimentaires dont vous avez besoin." },
    ],
    ctaTag: 'PROCHAINES ÉTAPES',
    ctaTitle: 'Prêt à aller plus loin ?',
    ctaCards: [
      { title: 'Daily Dozen', desc: 'Suivez vos portions végétales quotidiennes avec la liste de contrôle du Dr Greger.', href: '/daily-dozen', cta: 'Ouvrir le Daily Dozen →' },
      { title: 'Recettes', desc: 'Découvrez nos recettes végétales complètes — simples, rapides et délicieuses.', href: '/recipes', cta: 'Voir les recettes →' },
      { title: 'Mesurer votre santé', desc: 'Comprenez où vous en êtes avec des bilans sanguins professionnels.', href: '/biomarkers', cta: 'Voir les bilans →' },
    ],
    dailyDozenLink: 'Ouvrir le Daily Dozen →',
  },
  es: {
    tag: 'EMPEZAR',
    h1: 'Tus primeros pasos hacia una vida más larga y saludable.',
    sub: 'Sencillo. Práctico. Respaldado por la ciencia.',
    breakfastTag: 'EMPIEZA BIEN LA MAÑANA',
    breakfastTitle: 'El desayuno de longevidad perfecto',
    breakfastSub: 'Overnight Oats — preparados en 5 minutos, listos por la mañana.',
    ingredientsLabel: 'Ingredientes',
    ingredients: [
      '50g de copos de avena integrales (no instantáneos)',
      '200ml de leche de soja sin azúcar (o leche de avena)',
      '1 cucharada de semillas de chía negras',
      '1 cucharada de semillas de lino molidas',
      '1 cucharadita de canela de Ceilán (no Cassia — menos cumarina)',
      '1 cucharadita de sirope de dátiles (o 1 dátil Medjool picado)',
      '½ manzana rallada o en dados',
    ],
    stepsLabel: 'Preparación',
    steps: [
      'Combinar la avena, la leche de soja, las semillas de chía, el lino, la canela, el sirope de dátiles y la manzana en un cuenco.',
      'Remover bien, cerrar y refrigerar toda la noche (mínimo 6 horas).',
      'Por la mañana, cubrir con: mango fresco, frutos del bosque, germen de trigo, pepitas de calabaza, semillas de girasol.',
      'Disfrutar frío — o calentar 2 minutos.',
    ],
    toppingsLabel: 'Toppings',
    toppings: ['Mango fresco', 'Frutos del bosque', 'Germen de trigo', 'Pepitas de calabaza', 'Semillas de girasol'],
    whyLabel: 'Por qué funciona',
    whyText: 'Los cereales integrales, las bayas, los frutos secos, las semillas y las legumbres (soja) son los principales alimentos para el envejecimiento saludable según la Harvard T.H. Chan School of Public Health.',
    ddBadgeNote: '6 de 12 categorías Daily Dozen en una comida',
    ddBadges: [
      '🌾 Cereales integrales (avena)',
      '🫐 Bayas (frutos del bosque)',
      '🍎 Otras frutas (manzana, mango)',
      '🌱 Semillas de lino',
      '🥜 Frutos secos & semillas (chía, calabaza, girasol)',
      '🧂 Especias (canela de Ceilán)',
    ],
    scienceCardTag: 'LA CIENCIA',
    scienceCardTitle: '¿Qué deberías comer para vivir más?',
    scienceCardDesc: 'Un estudio de 30 años con más de 105.000 personas identificó qué alimentos promueven — y cuáles aceleran — el envejecimiento.',
    scienceCardLink: 'Ver la investigación completa →',
    rulesTag: 'TRES REGLAS SIMPLES',
    rulesTitle: 'Cómo empezar',
    rules: [
      { title: 'Reemplaza los productos animales', body: 'Paso a paso, con alternativas vegetales integrales. Los alimentos vegetales procesados son generalmente más saludables que sus equivalentes animales — pero menos ideales que los alimentos integrales reales.' },
      { title: 'Compra alimentos sin lista de ingredientes', body: 'Si creció en la tierra o en un árbol, cómelo. La alimentación vegetal integral significa alimentos reales, no productos. Cuanto más corta la lista de ingredientes, mejor.' },
      { title: 'Sigue el Daily Dozen', body: 'La lista diaria del Dr. Greger cubre todos los grupos de alimentos que necesitas — y facilita mantenerse en el camino.' },
    ],
    ctaTag: 'PRÓXIMOS PASOS',
    ctaTitle: '¿Listo para ir más lejos?',
    ctaCards: [
      { title: 'Daily Dozen', desc: 'Registra tus raciones vegetales diarias con la lista basada en evidencia del Dr. Greger.', href: '/daily-dozen', cta: 'Abrir Daily Dozen →' },
      { title: 'Recetas', desc: 'Explora nuestras recetas vegetales integrales — sencillas, rápidas y deliciosas.', href: '/recipes', cta: 'Ver recetas →' },
      { title: 'Mide tu salud', desc: 'Entiende dónde estás hoy con análisis de sangre profesionales a través de nuestros paquetes.', href: '/biomarkers', cta: 'Ver análisis →' },
    ],
    dailyDozenLink: 'Abrir Daily Dozen →',
  },
  it: {
    tag: 'INIZIA ORA',
    h1: 'I tuoi primi passi verso una vita più lunga e in salute.',
    sub: 'Semplice. Pratico. Supportato dalla scienza.',
    breakfastTag: 'INIZIA LA GIORNATA BENE',
    breakfastTitle: 'La colazione della longevità perfetta',
    breakfastSub: 'Overnight Oats — preparati in 5 minuti, pronti al mattino.',
    ingredientsLabel: 'Ingredienti',
    ingredients: [
      "50g di fiocchi d'avena integrali (non istantanei)",
      "200ml di latte di soia non zuccherato (o latte d'avena)",
      '1 cucchiaio di semi di chia neri',
      '1 cucchiaio di semi di lino macinati',
      '1 cucchiaino di cannella di Ceylon (non Cassia — meno cumarina)',
      '1 cucchiaino di sciroppo di datteri (o 1 dattero Medjool tritato)',
      '½ mela grattugiata o a dadini',
    ],
    stepsLabel: 'Preparazione',
    steps: [
      "Unire l'avena, il latte di soia, i semi di chia, i semi di lino, la cannella, lo sciroppo di datteri e la mela in una ciotola.",
      'Mescolare bene, chiudere e refrigerare per tutta la notte (almeno 6 ore).',
      'Al mattino, guarnire con: mango fresco, frutti di bosco misti, germe di grano, semi di zucca, semi di girasole.',
      'Gustare freddo — o scaldare per 2 minuti.',
    ],
    toppingsLabel: 'Guarnizioni',
    toppings: ['Mango fresco', 'Frutti di bosco misti', 'Germe di grano', 'Semi di zucca', 'Semi di girasole'],
    whyLabel: 'Perché funziona',
    whyText: "Cereali integrali, bacche, noci, semi e legumi (soia) sono i principali alimenti per l'invecchiamento sano secondo la Harvard T.H. Chan School of Public Health.",
    ddBadgeNote: '6 delle 12 categorie Daily Dozen in un pasto',
    ddBadges: [
      '🌾 Cereali integrali (avena)',
      '🫐 Bacche (frutti di bosco misti)',
      '🍎 Altri frutti (mela, mango)',
      '🌱 Semi di lino',
      '🥜 Noci & semi (chia, zucca, girasole)',
      '🧂 Spezie (cannella di Ceylon)',
    ],
    scienceCardTag: 'LA SCIENZA',
    scienceCardTitle: 'Cosa dovresti mangiare per vivere più a lungo?',
    scienceCardDesc: 'Uno studio di 30 anni su oltre 105.000 persone ha identificato quali alimenti favoriscono — e quali accelerano — l\'invecchiamento.',
    scienceCardLink: 'Vedi la ricerca completa →',
    rulesTag: 'TRE REGOLE SEMPLICI',
    rulesTitle: 'Come iniziare',
    rules: [
      { title: 'Sostituisci i prodotti animali', body: "Passo dopo passo, con alternative vegetali integrali. Gli alimenti vegetali lavorati sono generalmente più sani dei loro equivalenti animali — ma meno ideali dei veri alimenti integrali." },
      { title: 'Acquista alimenti senza lista ingredienti', body: "Se è cresciuto nella terra o su un albero, mangialo. L'alimentazione vegetale integrale significa cibi veri, non prodotti. Più è corta la lista degli ingredienti, meglio è." },
      { title: 'Segui il Daily Dozen', body: "La lista giornaliera del Dr. Greger copre tutti i gruppi alimentari di cui hai bisogno — e rende facile restare in carreggiata." },
    ],
    ctaTag: 'PROSSIMI PASSI',
    ctaTitle: 'Pronto ad approfondire?',
    ctaCards: [
      { title: 'Daily Dozen', desc: 'Monitora le tue porzioni vegetali quotidiane con la checklist del Dr. Greger.', href: '/daily-dozen', cta: 'Apri Daily Dozen →' },
      { title: 'Ricette', desc: 'Scopri le nostre ricette vegetali integrali — semplici, veloci e deliziose.', href: '/recipes', cta: 'Vedi ricette →' },
      { title: 'Misura la tua salute', desc: 'Capisce dove sei oggi con esami del sangue professionali tramite i nostri pacchetti.', href: '/biomarkers', cta: 'Vedi esami →' },
    ],
    dailyDozenLink: 'Apri Daily Dozen →',
  },
};

export default async function HowToStartPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">{t.tag}</p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">{t.h1}</h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">{t.sub}</p>
        </div>

        {/* ── Section 1: Overnight Oats ─────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.breakfastTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>

          <div className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden">
            <div className="bg-[#0e393d] px-8 py-7">
              <h2 className="font-serif text-2xl text-white mb-1">{t.breakfastTitle}</h2>
              <p className="text-white/50 text-sm">{t.breakfastSub}</p>
            </div>

            <div className="p-8 grid gap-8 sm:grid-cols-2">
              {/* Left: ingredients + toppings */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ceab84] mb-4">{t.ingredientsLabel}</h3>
                <ul className="space-y-2.5">
                  {t.ingredients.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#1c2a2b]/80 leading-snug">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#ceab84]/15 flex items-center justify-center text-[10px] font-semibold text-[#ceab84] mt-0.5">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ceab84] mb-3">{t.toppingsLabel}</h3>
                  <div className="flex flex-wrap gap-2">
                    {t.toppings.map((top, i) => (
                      <span key={i} className="text-xs bg-emerald-50 text-emerald-700 rounded-full px-3 py-1">{top}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: steps + why */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ceab84] mb-4">{t.stepsLabel}</h3>
                <ol className="space-y-4">
                  {t.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#1c2a2b]/80 leading-relaxed">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-[#0e393d] flex items-center justify-center text-[11px] font-semibold text-white mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-6 rounded-xl bg-[#f5f4f0] p-4">
                  <p className="text-xs font-semibold text-[#0e393d] mb-1">{t.whyLabel}</p>
                  <p className="text-xs text-[#1c2a2b]/60 leading-relaxed">
                    {t.whyText.split('Harvard T.H. Chan School of Public Health')[0]}
                    <a
                      href="https://pubmed.ncbi.nlm.nih.gov/40128348/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[#0e393d]/70 hover:text-[#0e393d] transition-colors"
                    >
                      Harvard T.H. Chan School of Public Health
                    </a>
                    {t.whyText.split('Harvard T.H. Chan School of Public Health')[1]}
                  </p>
                  <div className="mt-4 pt-3 border-t border-[#0e393d]/10">
                    <p className="text-[10px] font-semibold text-[#0e393d]/50 uppercase tracking-[0.12em] mb-2">{t.ddBadgeNote}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {t.ddBadges.map((badge, i) => (
                        <span key={i} className="text-[11px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-full px-2.5 py-0.5">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: Science teaser ─────────────────────────────────────── */}
        <section className="mb-20">
          <div className="rounded-2xl bg-[#0e393d] p-8 md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.scienceCardTag}</p>
            <h2 className="font-serif text-2xl text-white mb-3">{t.scienceCardTitle}</h2>
            <p className="text-sm text-white/50 leading-relaxed mb-6">{t.scienceCardDesc}</p>
            <Link href="/science" className="text-sm font-medium text-[#ceab84] hover:text-[#ceab84]/80 transition-colors">
              {t.scienceCardLink}
            </Link>
          </div>
        </section>

        {/* ── Section 3: Three rules ────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.rulesTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-8">{t.rulesTitle}</h2>

          {(() => {
            const ruleGradients = [
              { gradient: 'from-emerald-500 to-teal-400', emoji: '🥦' },
              { gradient: 'from-amber-400 to-orange-300', emoji: '🍎' },
              { gradient: 'from-teal-500 to-emerald-600', emoji: '🥗' },
            ];
            return (
              <div className="grid gap-5 sm:grid-cols-3">
                {t.rules.map((rule, i) => (
                  <div key={i} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden flex flex-col">
                    <div className={`w-full h-[140px] bg-gradient-to-br ${ruleGradients[i].gradient} flex items-center justify-center`}>
                      <span className="text-5xl">{ruleGradients[i].emoji}</span>
                    </div>
                    <div className="p-7 flex flex-col flex-1">
                      <div className="w-9 h-9 rounded-full bg-[#0e393d] flex items-center justify-center text-sm font-semibold text-white mb-4">
                        {i + 1}
                      </div>
                      <h3 className="font-serif text-lg text-[#0e393d] mb-2">{rule.title}</h3>
                      <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{rule.body}</p>
                      {i === 2 && (
                        <Link href="/daily-dozen" className="mt-4 inline-block text-sm font-medium text-[#ceab84] hover:text-[#ceab84]/80 transition-colors">
                          {t.dailyDozenLink}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {/* ── Section 4: CTA ───────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0e393d] p-10 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.ctaTag}</p>
          <h2 className="font-serif text-2xl text-white mb-8">{t.ctaTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {t.ctaCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-xl bg-white/8 ring-1 ring-white/10 p-6 hover:bg-white/12 hover:ring-white/20 transition-all flex flex-col"
              >
                <h3 className="font-serif text-lg text-white mb-2">{card.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed flex-1 mb-4">{card.desc}</p>
                <span className="text-sm font-medium text-[#ceab84] group-hover:text-[#ceab84]/80 transition-colors">{card.cta}</span>
              </Link>
            ))}
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
