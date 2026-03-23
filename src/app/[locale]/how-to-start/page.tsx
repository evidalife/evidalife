import Image from 'next/image';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'How to Start – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const PHOTOS = {
  oats:       'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=800&q=80',
  bloodTest:  'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80',
  dashboard:  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
  elderly:    'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=800&q=80',
};

const CYCLE_PHOTOS = [PHOTOS.vegetables, PHOTOS.bloodTest, PHOTOS.dashboard];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  // Cycle
  cycleTag: string;
  cycleTitle: string;
  cycleCards: { emoji: string; title: string; desc: string }[];
  cycleCallout: string;
  cycleCalloutSub: string;
  // Breakfast
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
  // Food
  foodTag: string;
  foodTitle: string;
  foodGreenLabel: string;
  foodGreen: string[];
  foodRedLabel: string;
  foodRed: string[];
  foodCitation: string;
  foodLink: string;
  // Measure
  measureTag: string;
  measureTitle: string;
  measureDesc: string;
  measureStats: { stat: string; label: string; sub: string }[];
  measureCta: string;
  // Science card
  scienceCardTag: string;
  scienceCardTitle: string;
  scienceCardDesc: string;
  scienceCardLink: string;
  // Rules
  rulesTag: string;
  rulesTitle: string;
  rules: { title: string; body: string }[];
  dailyDozenLink: string;
  // CTA
  ctaTag: string;
  ctaTitle: string;
  ctaSub: string;
  ctaCta1: string;
  ctaCta2: string;
}> = {
  de: {
    tag: 'EINSTIEG',
    h1: 'Deine ersten Schritte zu einem längeren, gesünderen Leben.',
    sub: 'Das Wichtigste, was du für deine Gesundheit tun kannst, ist auch das Einfachste: Ändere, was auf deinem Teller liegt. Hier erfährst du, wie du in 5 Minuten anfängst.',
    cycleTag: 'DAS KONZEPT',
    cycleTitle: 'Essen. Messen. Verbessern.',
    cycleCards: [
      { emoji: '🥗', title: 'Essen', desc: 'Vollwertige, pflanzenbasierte Ernährung mit der Daily Dozen – die wissenschaftlich stärkste Kostform.' },
      { emoji: '🩺', title: 'Messen', desc: 'Blutbiomarker und biologisches Alter testen – und verstehen, wie dein Körper wirklich altert.' },
      { emoji: '📈', title: 'Verbessern', desc: 'Die Ergebnisse sehen. Anpassen. Wiederholen. Messbare Veränderungen, Schritt für Schritt.' },
    ],
    cycleCallout: 'Echtes Ergebnis',
    cycleCalloutSub: 'Eine unserer Nutzerinnen reduzierte ihr biologisches Alter von 33,0 auf 22,7 Jahre in 21 Monaten – verifiziert durch epigenetische TruDiagnostic-Tests.',
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
    foodTag: 'WAS DU ESSEN SOLLTEST',
    foodTitle: 'Die Lebensmittel, die dein Leben verlängern.',
    foodGreenLabel: 'Gesundheitsfördernde Lebensmittel',
    foodGreen: [
      'Früchte & Beeren',
      'Gemüse & Blattgemüse',
      'Vollkorn (Hafer, Quinoa, Naturreis)',
      'Hülsenfrüchte (Bohnen, Linsen, Kichererbsen)',
      'Nüsse & Samen (Walnüsse, Leinsamen, Chia)',
      'Kräuter & Gewürze (Kurkuma, Zimt)',
      'Olivenöl & ungesättigte Fette',
    ],
    foodRedLabel: 'Lebensmittel zu reduzieren',
    foodRed: [
      'Verarbeitetes & rotes Fleisch',
      'Transfette & frittierte Speisen',
      'Zuckerhaltige Getränke',
      'Raffiniertes Getreide (Weißbrot, Pasta)',
      'Stark salzhaltige Fertigprodukte',
      'Vollfetter Milchprodukte & Butter',
    ],
    foodCitation: 'Basierend auf Tessier et al. (2025), Nature Medicine – über 105.000 Teilnehmer über 30 Jahre.',
    foodLink: 'Zur Wissenschaft →',
    measureTag: 'WARUM MESSEN',
    measureTitle: 'Du kannst nicht verbessern, was du nicht misst.',
    measureDesc: 'Standard-Gesundheitschecks zeigen nur, ob du krank bist. Unsere Bluttests gehen weiter – sie messen Biomarker an optimalen Werten, nicht nur an Normwerten. Kombiniert mit epigenetischen Altertests erhältst du ein vollständiges Bild, wie schnell du alterst – und ob deine Ernährung wirkt.',
    measureStats: [
      { stat: '15–36', label: 'Biomarker', sub: 'Ab CHF 149' },
      { stat: '6', label: 'Gesundheitsdomänen', sub: 'Herz, Stoffwechsel, Entzündung, Organe, Nährstoffe, Hormone' },
      { stat: 'Bio. Alter', label: 'Epigenetik', sub: 'TruDiagnostic zeigt dein wahres Alter' },
    ],
    measureCta: 'Bluttest-Pakete ansehen →',
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
    dailyDozenLink: 'Zur Daily Dozen →',
    ctaTag: 'NÄCHSTER SCHRITT',
    ctaTitle: 'Dein erster Schritt dauert 5 Minuten.',
    ctaSub: 'Starte morgen früh mit Overnight Oats. Erstelle dein kostenloses Konto und tracke deine Daily Dozen.',
    ctaCta1: 'Kostenloses Konto erstellen',
    ctaCta2: 'Bluttests entdecken',
  },
  en: {
    tag: 'GET STARTED',
    h1: 'Your first steps to a longer, healthier life.',
    sub: 'The most important thing you can do for your health is also the simplest: change what\'s on your plate. Here\'s how to begin — in 5 minutes.',
    cycleTag: 'THE CONCEPT',
    cycleTitle: 'Eat. Measure. Improve.',
    cycleCards: [
      { emoji: '🥗', title: 'Eat', desc: 'Follow a whole-food, plant-based diet with the Daily Dozen — the most evidence-backed dietary pattern.' },
      { emoji: '🩺', title: 'Measure', desc: 'Test your blood biomarkers and biological age — and understand how your body is truly aging.' },
      { emoji: '📈', title: 'Improve', desc: 'See the results. Adjust. Repeat. Measurable change, step by step.' },
    ],
    cycleCallout: 'Real result',
    cycleCalloutSub: 'One of our users reduced her biological age from 33.0 to 22.7 years over 21 months — verified by TruDiagnostic epigenetic testing.',
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
    foodTag: 'WHAT TO EAT',
    foodTitle: 'The foods that extend your life.',
    foodGreenLabel: 'Health-promoting foods',
    foodGreen: [
      'Fruits & berries',
      'Vegetables & leafy greens',
      'Whole grains (oats, quinoa, brown rice)',
      'Legumes (beans, lentils, chickpeas)',
      'Nuts & seeds (walnuts, flaxseeds, chia)',
      'Herbs & spices (turmeric, cinnamon)',
      'Olive oil & unsaturated fats',
    ],
    foodRedLabel: 'Foods to minimize',
    foodRed: [
      'Processed & red meat',
      'Trans fats & fried foods',
      'Sugar-sweetened beverages',
      'Refined grains (white bread, pasta)',
      'Sodium-heavy processed foods',
      'High-fat dairy & butter',
    ],
    foodCitation: 'Based on Tessier et al. (2025), Nature Medicine — 105,000+ participants over 30 years.',
    foodLink: 'Explore the science →',
    measureTag: 'WHY MEASURE',
    measureTitle: 'You can\'t improve what you don\'t measure.',
    measureDesc: 'Standard health checks only tell you if you\'re sick. Our blood tests go further — measuring biomarkers against optimal ranges, not just normal ones. Combined with epigenetic age testing, you get a complete picture of how fast you\'re aging — and whether your diet is working.',
    measureStats: [
      { stat: '15–36', label: 'Biomarkers', sub: 'From CHF 149' },
      { stat: '6', label: 'Health domains', sub: 'Heart, metabolism, inflammation, organs, nutrients, hormones' },
      { stat: 'Bio. age', label: 'Epigenetics', sub: 'TruDiagnostic shows your true age' },
    ],
    measureCta: 'View blood test packages →',
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
    dailyDozenLink: 'Open Daily Dozen →',
    ctaTag: 'NEXT STEP',
    ctaTitle: 'Your first step takes 5 minutes.',
    ctaSub: 'Start with overnight oats tomorrow morning. Sign up to track your Daily Dozen.',
    ctaCta1: 'Create free account',
    ctaCta2: 'Explore blood tests',
  },
  fr: {
    tag: 'COMMENCER',
    h1: 'Vos premiers pas vers une vie plus longue et plus saine.',
    sub: 'La chose la plus importante que vous puissiez faire pour votre santé est aussi la plus simple : changer ce qu\'il y a dans votre assiette. Voici comment commencer — en 5 minutes.',
    cycleTag: 'LE CONCEPT',
    cycleTitle: 'Manger. Mesurer. Progresser.',
    cycleCards: [
      { emoji: '🥗', title: 'Manger', desc: 'Suivez une alimentation végétale à base d\'aliments complets avec le Daily Dozen — le régime le plus étayé par les preuves.' },
      { emoji: '🩺', title: 'Mesurer', desc: 'Testez vos biomarqueurs sanguins et votre âge biologique — et comprenez comment votre corps vieillit vraiment.' },
      { emoji: '📈', title: 'Progresser', desc: 'Voyez les résultats. Ajustez. Répétez. Un changement mesurable, étape par étape.' },
    ],
    cycleCallout: 'Résultat réel',
    cycleCalloutSub: 'Une de nos utilisatrices a réduit son âge biologique de 33,0 à 22,7 ans en 21 mois — vérifié par les tests épigénétiques TruDiagnostic.',
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
    foodTag: 'QUOI MANGER',
    foodTitle: 'Les aliments qui prolongent votre vie.',
    foodGreenLabel: 'Aliments bénéfiques pour la santé',
    foodGreen: [
      'Fruits & baies',
      'Légumes & légumes feuillus',
      'Céréales complètes (avoine, quinoa, riz brun)',
      'Légumineuses (haricots, lentilles, pois chiches)',
      'Noix & graines (noix, lin, chia)',
      'Herbes & épices (curcuma, cannelle)',
      'Huile d\'olive & graisses insaturées',
    ],
    foodRedLabel: 'Aliments à réduire',
    foodRed: [
      'Viande transformée & rouge',
      'Graisses trans & aliments frits',
      'Boissons sucrées',
      'Céréales raffinées (pain blanc, pâtes)',
      'Aliments transformés riches en sodium',
      'Produits laitiers riches en graisses & beurre',
    ],
    foodCitation: 'D\'après Tessier et al. (2025), Nature Medicine — plus de 105 000 participants sur 30 ans.',
    foodLink: 'Explorer la science →',
    measureTag: 'POURQUOI MESURER',
    measureTitle: 'On ne peut pas améliorer ce qu\'on ne mesure pas.',
    measureDesc: 'Les bilans de santé standard ne vous disent que si vous êtes malade. Nos tests sanguins vont plus loin — mesurant les biomarqueurs par rapport aux plages optimales, pas seulement normales. Combiné avec les tests d\'âge épigénétique, vous obtenez une image complète de la vitesse à laquelle vous vieillissez — et si votre alimentation fonctionne.',
    measureStats: [
      { stat: '15–36', label: 'Biomarqueurs', sub: 'À partir de CHF 149' },
      { stat: '6', label: 'Domaines de santé', sub: 'Cœur, métabolisme, inflammation, organes, nutriments, hormones' },
      { stat: 'Âge bio.', label: 'Épigénétique', sub: 'TruDiagnostic révèle votre vrai âge' },
    ],
    measureCta: 'Voir les packages de tests sanguins →',
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
    dailyDozenLink: 'Ouvrir le Daily Dozen →',
    ctaTag: 'PROCHAINE ÉTAPE',
    ctaTitle: 'Votre premier pas prend 5 minutes.',
    ctaSub: 'Commencez demain matin avec des Overnight Oats. Inscrivez-vous pour suivre votre Daily Dozen.',
    ctaCta1: 'Créer un compte gratuit',
    ctaCta2: 'Explorer les tests sanguins',
  },
  es: {
    tag: 'EMPEZAR',
    h1: 'Tus primeros pasos hacia una vida más larga y saludable.',
    sub: 'Lo más importante que puedes hacer por tu salud es también lo más sencillo: cambiar lo que hay en tu plato. Así es como empezar — en 5 minutos.',
    cycleTag: 'EL CONCEPTO',
    cycleTitle: 'Comer. Medir. Mejorar.',
    cycleCards: [
      { emoji: '🥗', title: 'Comer', desc: 'Sigue una dieta integral a base de plantas con el Daily Dozen — el patrón dietético más respaldado por la evidencia.' },
      { emoji: '🩺', title: 'Medir', desc: 'Analiza tus biomarcadores sanguíneos y edad biológica — y entiende cómo está envejeciendo realmente tu cuerpo.' },
      { emoji: '📈', title: 'Mejorar', desc: 'Ver los resultados. Ajustar. Repetir. Cambio medible, paso a paso.' },
    ],
    cycleCallout: 'Resultado real',
    cycleCalloutSub: 'Una de nuestras usuarias redujo su edad biológica de 33,0 a 22,7 años en 21 meses — verificado por pruebas epigenéticas TruDiagnostic.',
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
    foodTag: 'QUÉ COMER',
    foodTitle: 'Los alimentos que alargan tu vida.',
    foodGreenLabel: 'Alimentos que promueven la salud',
    foodGreen: [
      'Frutas & bayas',
      'Verduras & hortalizas de hoja',
      'Cereales integrales (avena, quinoa, arroz integral)',
      'Legumbres (alubias, lentejas, garbanzos)',
      'Frutos secos & semillas (nueces, lino, chía)',
      'Hierbas & especias (cúrcuma, canela)',
      'Aceite de oliva & grasas insaturadas',
    ],
    foodRedLabel: 'Alimentos a reducir',
    foodRed: [
      'Carne procesada & roja',
      'Grasas trans & alimentos fritos',
      'Bebidas azucaradas',
      'Cereales refinados (pan blanco, pasta)',
      'Alimentos procesados ricos en sodio',
      'Lácteos altos en grasa & mantequilla',
    ],
    foodCitation: 'Basado en Tessier et al. (2025), Nature Medicine — más de 105.000 participantes durante 30 años.',
    foodLink: 'Explorar la ciencia →',
    measureTag: 'POR QUÉ MEDIR',
    measureTitle: 'No puedes mejorar lo que no mides.',
    measureDesc: 'Los controles de salud estándar solo te dicen si estás enfermo. Nuestros análisis de sangre van más lejos — midiendo biomarcadores contra rangos óptimos, no solo normales. Combinado con pruebas de edad epigenética, obtienes una imagen completa de qué tan rápido estás envejeciendo — y si tu dieta está funcionando.',
    measureStats: [
      { stat: '15–36', label: 'Biomarcadores', sub: 'Desde CHF 149' },
      { stat: '6', label: 'Dominios de salud', sub: 'Corazón, metabolismo, inflamación, órganos, nutrientes, hormonas' },
      { stat: 'Edad bio.', label: 'Epigenética', sub: 'TruDiagnostic muestra tu verdadera edad' },
    ],
    measureCta: 'Ver paquetes de análisis de sangre →',
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
    dailyDozenLink: 'Abrir Daily Dozen →',
    ctaTag: 'PRÓXIMO PASO',
    ctaTitle: 'Tu primer paso lleva 5 minutos.',
    ctaSub: 'Empieza mañana por la mañana con Overnight Oats. Regístrate para registrar tu Daily Dozen.',
    ctaCta1: 'Crear cuenta gratuita',
    ctaCta2: 'Explorar análisis de sangre',
  },
  it: {
    tag: 'INIZIA ORA',
    h1: 'I tuoi primi passi verso una vita più lunga e in salute.',
    sub: 'La cosa più importante che puoi fare per la tua salute è anche la più semplice: cambia cosa c\'è nel tuo piatto. Ecco come iniziare — in 5 minuti.',
    cycleTag: 'IL CONCETTO',
    cycleTitle: 'Mangiare. Misurare. Migliorare.',
    cycleCards: [
      { emoji: '🥗', title: 'Mangiare', desc: 'Segui una dieta integrale a base vegetale con il Daily Dozen — il modello alimentare più supportato dalle prove.' },
      { emoji: '🩺', title: 'Misurare', desc: 'Testa i tuoi biomarcatori nel sangue e l\'età biologica — e capisci come sta invecchiando davvero il tuo corpo.' },
      { emoji: '📈', title: 'Migliorare', desc: 'Vedi i risultati. Aggiusta. Ripeti. Cambiamento misurabile, passo dopo passo.' },
    ],
    cycleCallout: 'Risultato reale',
    cycleCalloutSub: 'Una delle nostre utenti ha ridotto la sua età biologica da 33,0 a 22,7 anni in 21 mesi — verificato dai test epigenetici TruDiagnostic.',
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
    foodTag: 'COSA MANGIARE',
    foodTitle: 'Gli alimenti che allungano la tua vita.',
    foodGreenLabel: 'Alimenti che promuovono la salute',
    foodGreen: [
      'Frutta & bacche',
      'Verdure & ortaggi a foglia',
      'Cereali integrali (avena, quinoa, riso integrale)',
      'Legumi (fagioli, lenticchie, ceci)',
      'Noci & semi (noci, lino, chia)',
      'Erbe & spezie (curcuma, cannella)',
      'Olio d\'oliva & grassi insaturi',
    ],
    foodRedLabel: 'Alimenti da ridurre',
    foodRed: [
      'Carne lavorata & rossa',
      'Grassi trans & cibi fritti',
      'Bevande zuccherate',
      'Cereali raffinati (pane bianco, pasta)',
      'Cibi lavorati ricchi di sodio',
      'Latticini ad alto contenuto di grassi & burro',
    ],
    foodCitation: 'Basato su Tessier et al. (2025), Nature Medicine — oltre 105.000 partecipanti su 30 anni.',
    foodLink: 'Esplora la scienza →',
    measureTag: 'PERCHÉ MISURARE',
    measureTitle: 'Non puoi migliorare ciò che non misuri.',
    measureDesc: 'I controlli sanitari standard ti dicono solo se sei malato. I nostri test del sangue vanno oltre — misurando i biomarcatori rispetto ai range ottimali, non solo normali. Combinato con i test dell\'età epigenetica, ottieni un quadro completo di quanto velocemente stai invecchiando — e se la tua dieta sta funzionando.',
    measureStats: [
      { stat: '15–36', label: 'Biomarcatori', sub: 'Da CHF 149' },
      { stat: '6', label: 'Domini di salute', sub: 'Cuore, metabolismo, infiammazione, organi, nutrienti, ormoni' },
      { stat: 'Età bio.', label: 'Epigenetica', sub: 'TruDiagnostic mostra la tua vera età' },
    ],
    measureCta: 'Vedi i pacchetti di esami del sangue →',
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
    dailyDozenLink: 'Apri Daily Dozen →',
    ctaTag: 'PROSSIMO PASSO',
    ctaTitle: 'Il tuo primo passo richiede 5 minuti.',
    ctaSub: 'Inizia domani mattina con gli Overnight Oats. Registrati per tracciare il tuo Daily Dozen.',
    ctaCta1: 'Crea account gratuito',
    ctaCta2: 'Esplora gli esami del sangue',
  },
};

const RULE_VISUALS = [
  { gradient: 'from-emerald-500 to-teal-400',   emoji: '🥦' },
  { gradient: 'from-amber-400 to-orange-300',   emoji: '🍎' },
  { gradient: 'from-teal-500 to-emerald-600',   emoji: '🥗' },
];

export default async function HowToStartPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* ── Section 1: HERO ─────────────────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">{t.tag}</p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">{t.h1}</h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed mb-8">{t.sub}</p>
          <div className="relative w-full max-h-[300px] rounded-2xl overflow-hidden">
            <Image
              src={PHOTOS.vegetables}
              alt="Fresh vegetables"
              width={1060}
              height={300}
              className="w-full max-h-[300px] object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/30 to-transparent" />
          </div>
        </div>

        {/* ── Section 2: THE CYCLE ────────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.cycleTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-8">{t.cycleTitle}</h2>

          <div className="grid gap-5 sm:grid-cols-3 mb-6">
            {t.cycleCards.map((card, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden">
                <div className="relative h-40 overflow-hidden">
                  <Image
                    src={CYCLE_PHOTOS[i]}
                    alt={card.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-[#0e393d]/40" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <span className="text-2xl mb-1">{card.emoji}</span>
                    <span className="font-serif text-white text-lg">{card.title}</span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#0e393d] px-8 py-6 flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="shrink-0">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">{t.cycleCallout}</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{t.cycleCalloutSub}</p>
          </div>
        </section>

        {/* ── Section 3: OVERNIGHT OATS ───────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.breakfastTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>

          <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-6">
            <Image
              src={PHOTOS.oats}
              alt="Overnight oats"
              fill
              className="object-cover"
              sizes="1060px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/50 to-transparent" />
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

        {/* ── Section 4: WHAT TO EAT ──────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.foodTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-8">{t.foodTitle}</h2>

          <div className="grid gap-5 sm:grid-cols-2 mb-5">
            {/* Green card */}
            <div className="rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 p-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🟢</span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{t.foodGreenLabel}</span>
              </div>
              <ul className="space-y-2.5">
                {t.foodGreen.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-emerald-900/80 leading-snug">
                    <span className="shrink-0 text-emerald-500 mt-0.5 text-xs">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Red card */}
            <div className="rounded-2xl bg-red-50 ring-1 ring-red-100 p-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🔴</span>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">{t.foodRedLabel}</span>
              </div>
              <ul className="space-y-2.5">
                {t.foodRed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-red-900/70 leading-snug">
                    <span className="shrink-0 text-red-400 mt-0.5 text-xs">↓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-[#1c2a2b]/50 leading-relaxed">
            {t.foodCitation}{' '}
            <Link href="/science" className="underline text-[#0e393d]/60 hover:text-[#0e393d] transition-colors">
              {t.foodLink}
            </Link>
          </p>
        </section>

        {/* ── Section 5: WHY MEASURE ──────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.measureTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>

          <div className="grid gap-10 sm:grid-cols-2 mb-8">
            <div>
              <h2 className="font-serif text-3xl text-[#0e393d] mb-5 leading-tight">{t.measureTitle}</h2>
              <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{t.measureDesc}</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden min-h-[220px]">
              <Image
                src={PHOTOS.bloodTest}
                alt="Blood test"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-[#0e393d]/20" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {t.measureStats.map((s, i) => (
              <div key={i} className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 p-5">
                <div className="font-serif text-2xl text-[#0e393d] mb-0.5">{s.stat}</div>
                <div className="text-xs font-semibold text-[#0e393d] uppercase tracking-wide mb-2">{s.label}</div>
                <p className="text-xs text-[#1c2a2b]/50 leading-snug">{s.sub}</p>
              </div>
            ))}
          </div>

          <Link
            href="/shop"
            className="inline-block text-sm font-medium text-[#ceab84] hover:text-[#ceab84]/80 transition-colors"
          >
            {t.measureCta}
          </Link>
        </section>

        {/* ── Section 6: Science teaser ───────────────────────────────────────── */}
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

        {/* ── Section 7: THREE RULES ──────────────────────────────────────────── */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] shrink-0">{t.rulesTag}</p>
            <div className="flex-1 h-px bg-[#0e393d]/10" />
          </div>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-8">{t.rulesTitle}</h2>

          <div className="grid gap-5 sm:grid-cols-3">
            {t.rules.map((rule, i) => (
              <div key={i} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden flex flex-col">
                <div className={`w-full h-[140px] bg-gradient-to-br ${RULE_VISUALS[i].gradient} flex items-center justify-center`}>
                  <span className="text-5xl">{RULE_VISUALS[i].emoji}</span>
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
        </section>

        {/* ── Section 8: CTA ──────────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-[#0e393d] p-10 sm:p-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.ctaTag}</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-3 leading-tight">{t.ctaTitle}</h2>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">{t.ctaSub}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/login"
              className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
            >
              {t.ctaCta1}
            </Link>
            <Link
              href="/shop"
              className="text-white border border-white/30 text-[13px] font-light px-8 py-3.5 rounded-full transition-all hover:bg-white/10 whitespace-nowrap"
            >
              {t.ctaCta2}
            </Link>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
