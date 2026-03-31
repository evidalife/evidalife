import Image from 'next/image';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

// ─── Photo constants ──────────────────────────────────────────────────────────
const PHOTOS = {
  hero:      'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80',
  mission:   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80',
  pillar1:   'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
  pillar2:   'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
  pillar3:   'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
  pillar4:   'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
  step1:     'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
  step2:     'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
  step3:     'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
};

const PILLARS: { photo: string; href: string }[] = [
  { photo: PHOTOS.pillar1, href: '/daily-dozen' },
  { photo: PHOTOS.pillar2, href: '/recipes'     },
  { photo: PHOTOS.pillar3, href: '/biomarkers'  },
  { photo: PHOTOS.pillar4, href: '/health-engine' },
];

const STEP_PHOTOS = [PHOTOS.step1, PHOTOS.step2, PHOTOS.step3];

// Task 5: corrected stats — Heart 20M/80%, Cancer 10M/40%, Respiratory 4M/70%, Diabetes 2M/85%
const PROBLEM_STATS = [
  { stat: '20M', pct: 80 },
  { stat: '10M', pct: 40 },
  { stat: '4M',  pct: 70 },
  { stat: '2M',  pct: 85 },
];

// Task 6: corrected science findings — 80% (Esselstyn), +10–15 yrs, 11 hallmarks
const SCIENCE_FINDINGS = [
  { stat: '80%',    key: 'f1' },
  { stat: '+10–15', key: 'f2' },
  { stat: '11',     key: 'f3' },
];

const PRODUCT_FEATURES: Record<number, Record<Lang, string[]>> = {
  1: { // Core
    en: ['15 essential blood markers', 'Personal health dashboard', 'Optimal range analysis', 'Digital results in 48h'],
    de: ['15 essenzielle Blutmarker', 'Persönliches Gesundheits-Dashboard', 'Optimal-Bereich-Analyse', 'Digitale Ergebnisse in 48h'],
    fr: ['15 marqueurs sanguins essentiels', 'Tableau de bord santé personnel', 'Analyse des plages optimales', 'Résultats numériques en 48h'],
    es: ['15 marcadores sanguíneos esenciales', 'Panel de salud personal', 'Análisis de rangos óptimos', 'Resultados digitales en 48h'],
    it: ['15 biomarcatori essenziali', 'Dashboard salute personale', 'Analisi range ottimali', 'Risultati digitali in 48h'],
  },
  2: { // Pro
    en: ['27 advanced blood markers', 'All 9 health domains', 'Longevity Score tracking', 'Hormones & inflammation panel', 'Most popular package'],
    de: ['27 erweiterte Blutmarker', 'Alle 9 Gesundheitsdomänen', 'Longevity Score Tracking', 'Hormone & Entzündungspanel', 'Unser beliebtestes Paket'],
    fr: ['27 marqueurs sanguins avancés', 'Les 9 domaines de santé', 'Suivi du Longevity Score', 'Panel hormones & inflammation', 'Notre forfait le plus populaire'],
    es: ['27 biomarcadores avanzados', 'Los 9 dominios de salud', 'Seguimiento del Longevity Score', 'Panel hormonal & inflamación', 'Nuestro paquete más popular'],
    it: ['27 biomarcatori avanzati', 'Tutti i 9 domini di salute', 'Monitoraggio Longevity Score', 'Pannello ormoni & infiammazione', 'Il nostro pacchetto più popolare'],
  },
  3: { // Complete
    en: ['36 comprehensive markers', 'Full nutrient panel (B12, D, Zinc, Omega...)', 'Hormone profile (Testosterone, Cortisol...)', 'Longevity Score + trend history', 'Priority lab processing'],
    de: ['36 umfassende Marker', 'Volles Nährstoffpanel (B12, D, Zink, Omega...)', 'Hormonprofil (Testosteron, Cortisol...)', 'Longevity Score + Verlauf', 'Prioritäts-Laborverarbeitung'],
    fr: ['36 marqueurs complets', 'Panel nutritionnel complet (B12, D, Zinc, Oméga...)', 'Profil hormonal (Testostérone, Cortisol...)', 'Longevity Score + historique', 'Traitement laboratoire prioritaire'],
    es: ['36 marcadores completos', 'Panel nutricional completo (B12, D, Zinc, Omega...)', 'Perfil hormonal (Testosterona, Cortisol...)', 'Longevity Score + historial', 'Procesamiento prioritario'],
    it: ['36 marcatori completi', 'Pannello nutrienti completo (B12, D, Zinco, Omega...)', 'Profilo ormonale (Testosterone, Cortisolo...)', 'Longevity Score + storico', 'Elaborazione lab prioritaria'],
  },
};

const T: Record<Lang, {
  hero: { h1: string; h1em: string; sub: string; cta1: string; cta2: string };
  problem: { tag: string; heading: string; headingEm: string; context: string; deathsYear: string; cards: { label: string; desc: string }[]; callout: string; calloutSub: string; source: string };
  mission: { tag: string; heading: string; headingEm: string; desc: string; cta: string };
  pillars: { tag: string; heading: string; headingEm: string; cards: { title: string; desc: string }[] };
  steps: { tag: string; heading: string; headingEm: string; items: { n: string; title: string; desc: string }[] };
  science: { tag: string; heading: string; sub: string; findings: { label: string }[]; link: string };
  pricing: { tag: string; heading: string; headingEm: string; cta: string; freeNote: string };
  cta: { title: string; sub: string; cta1: string; cta2: string };
}> = {
  de: {
    hero: {
      h1: 'Gesund leben.',
      h1em: 'Wissenschaftlich fundiert.',
      sub: '40 Millionen Menschen sterben jedes Jahr an vermeidbaren Krankheiten. Die meisten essen das Falsche. Wir ändern das – messbar.',
      cta1: 'Kostenlos registrieren',
      cta2: 'Daily Dozen entdecken',
    },
    problem: {
      tag: 'Das Problem',
      heading: 'Die stille',
      headingEm: 'Epidemie.',
      context: 'Jedes Jahr sterben über 40 Millionen Menschen an nichtübertragbaren Krankheiten – das sind 74 % aller Todesfälle weltweit. Die vier grössten Killer sind grösstenteils durch Ernährung und Lebensstil vermeidbar.',
      deathsYear: 'Todesfälle/Jahr',
      cards: [
        { label: 'Herzerkrankungen',             desc: '80 % durch Ernährung vermeidbar' },
        { label: 'Krebs',                        desc: '40 % durch Lifestyle vermeidbar' },
        { label: 'Chron. Atemwegserkrankungen',  desc: '70 % durch Lifestyle vermeidbar' },
        { label: 'Diabetes',                     desc: '85 % durch Ernährung vermeidbar' },
      ],
      callout: '+10–15 Jahre',
      calloutSub: 'Die meisten vorzeitigen Todesfälle sind vermeidbar. Mit der richtigen Ernährung kannst du 10–15 gesunde Jahre gewinnen. Füge Jahre zu deinem Leben hinzu — und Leben zu deinen Jahren.',
      source: 'Quelle: WHO Noncommunicable Diseases Fact Sheet, 2024',
    },
    mission: {
      tag: 'Unsere Mission',
      heading: 'Gesundheit für',
      headingEm: 'jeden erschwinglich.',
      desc: 'Evida Life kombiniert die wissenschaftlich stärkste Ernährungsform – vollwertig, pflanzenbasiert – mit professionellen Blutmarkern. Nicht als teures Lifestyle-Produkt, sondern als echte Gesundheitsplattform für alle. Wissen allein reicht nicht. Wir machen Veränderungen messbar.',
      cta: 'Unsere Wissenschaft',
    },
    pillars: {
      tag: 'Die Plattform',
      heading: 'Alles, was du',
      headingEm: 'brauchst.',
      cards: [
        { title: 'Daily Dozen Tracker', desc: 'Tracke Dr. Gregers 12 Lebensmittelgruppen täglich. Einfache Checkboxen, echte Wirkung.' },
        { title: 'Vollwertige Rezepte',  desc: 'Pflanzenbasierte Rezepte passend zur Daily Dozen. Schnell, lecker, gesund.' },
        { title: 'Blut-Biomarker',       desc: 'Professionelle Blutmarker in 9 Gesundheitsdomänen. Ab CHF 99.' },
        { title: 'Health Dashboard',     desc: 'Dein Longevity Score: alle Werte an einem Ort. Sieh genau, wo du stehst.' },
      ],
    },
    steps: {
      tag: 'So funktioniert es',
      heading: 'Drei Schritte zu',
      headingEm: 'messbarer Gesundheit',
      items: [
        { n: '01', title: 'Messen',     desc: 'Partnerlabore analysieren deine wichtigsten Gesundheits- und Longevity-Marker. Alle Werte übersichtlich in deinem persönlichen Dashboard.' },
        { n: '02', title: 'Ernähren',   desc: 'Vollwertige, pflanzenbasierte Ernährung nach Dr. Gregers Daily Dozen. Mit Rezepten, Tipps und täglichem Tracking in der App.' },
        { n: '03', title: 'Verbessern', desc: 'Dein Longevity Score zeigt messbar, wie deine Ernährung deine Biomarker beeinflusst. Klar. Verständlich. Motivierend.' },
      ],
    },
    science: {
      tag: 'Die Wissenschaft',
      heading: 'Belegt durch',
      sub: 'Unsere Empfehlungen basieren auf peer-reviewten Studien, nicht auf Trends.',
      findings: [
        { label: 'Reduktion kardialer Ereignisse durch WFPB-Ernährung (Esselstyn 2014)' },
        { label: 'Jahre zusätzliche Lebenserwartung durch Lebensstiländerungen' },
        { label: 'Hallmarks of Aging, die durch Ernährung beeinflusst werden' },
      ],
      link: 'Zur Wissenschaft',
    },
    pricing: {
      tag: 'Preise',
      heading: 'Einfach.',
      headingEm: 'Transparent.',
      cta: 'Details ansehen',
      freeNote: 'Kostenloses Konto inkl. Daily Dozen Tracker, Rezepte und Einkaufsliste.',
    },
    cta: {
      title: 'Deine Gesundheitsreise beginnt mit einer Mahlzeit.',
      sub: 'Kostenloses Konto. Keine Kreditkarte nötig.',
      cta1: 'Kostenloses Konto erstellen',
      cta2: 'Plattform entdecken',
    },
  },
  en: {
    hero: {
      h1: 'Live well.',
      h1em: 'Scientifically grounded.',
      sub: '40 million people die every year from preventable diseases. Most of them eat the wrong foods. We are changing that — measurably.',
      cta1: 'Sign up free',
      cta2: 'Explore Daily Dozen',
    },
    problem: {
      tag: 'The Problem',
      heading: 'The silent',
      headingEm: 'epidemic.',
      context: 'Every year, over 40 million people die from noncommunicable diseases — that\'s 74% of all deaths worldwide. The four biggest killers are largely preventable through diet and lifestyle.',
      deathsYear: 'deaths/year',
      cards: [
        { label: 'Heart disease',        desc: '80% preventable through diet' },
        { label: 'Cancer',               desc: '40% preventable through lifestyle' },
        { label: 'Chronic respiratory',  desc: '70% preventable through lifestyle' },
        { label: 'Diabetes',             desc: '85% preventable through diet' },
      ],
      callout: '+10–15 years',
      calloutSub: "Most premature deaths are preventable. With the right nutrition, you can add 10–15 healthy years to your life. Add years to your life — and life to your years.",
      source: 'Source: WHO Noncommunicable Diseases Fact Sheet, 2024',
    },
    mission: {
      tag: 'Our Mission',
      heading: 'Quality health,',
      headingEm: 'made affordable.',
      desc: "Evida Life combines the scientifically strongest dietary pattern — whole-food, plant-based — with professional blood markers. Not as an expensive lifestyle product, but as a real health platform for everyone. Knowledge alone isn't enough. We make change measurable.",
      cta: 'Our science',
    },
    pillars: {
      tag: 'The Platform',
      heading: 'Everything you',
      headingEm: 'need.',
      cards: [
        { title: 'Daily Dozen Tracker', desc: "Track Dr. Greger's 12 food groups daily. Simple checkboxes, real impact." },
        { title: 'Whole-Food Recipes',  desc: 'Plant-based recipes matched to the Daily Dozen. Quick, delicious, healthy.' },
        { title: 'Blood Biomarkers',    desc: 'Professional blood markers across 9 health domains. From CHF 99.' },
        { title: 'Health Dashboard',    desc: 'Your Longevity Score: all results in one place. See exactly where you stand.' },
      ],
    },
    steps: {
      tag: 'How it works',
      heading: 'Three steps to',
      headingEm: 'measurable health',
      items: [
        { n: '01', title: 'Measure',  desc: 'Partner labs analyse your most important health and longevity markers. All results clearly visible in your personal dashboard.' },
        { n: '02', title: 'Nourish',  desc: "Whole-food, plant-based nutrition following Dr. Greger's Daily Dozen. With recipes, tips, and daily tracking built into the app." },
        { n: '03', title: 'Improve',  desc: 'Your Longevity Score shows measurably how your nutrition affects your biomarkers. Clear. Understandable. Motivating.' },
      ],
    },
    science: {
      tag: 'The Science',
      heading: 'Backed by evidence.',
      sub: 'Our recommendations are based on peer-reviewed research, not trends.',
      findings: [
        { label: 'Reduction in cardiac events with a WFPB diet (Esselstyn 2014)' },
        { label: 'Additional years of life expectancy through lifestyle changes' },
        { label: 'Hallmarks of Aging influenced by diet and lifestyle' },
      ],
      link: 'Explore the science',
    },
    pricing: {
      tag: 'Pricing',
      heading: 'Simple.',
      headingEm: 'Transparent.',
      cta: 'View details',
      freeNote: 'Free account includes Daily Dozen tracker, recipes, and shopping list.',
    },
    cta: {
      title: 'Your health journey starts with one meal.',
      sub: 'Free account. No credit card needed.',
      cta1: 'Create free account',
      cta2: 'Explore the platform',
    },
  },
  fr: {
    hero: {
      h1: 'Vivez bien.',
      h1em: 'Fondé sur la science.',
      sub: "40 millions de personnes meurent chaque année de maladies évitables. La plupart mangent les mauvais aliments. Nous changeons cela — de manière mesurable.",
      cta1: "S'inscrire gratuitement",
      cta2: 'Explorer le Daily Dozen',
    },
    problem: {
      tag: 'Le Problème',
      heading: "L'épidémie",
      headingEm: 'silencieuse.',
      context: "Chaque année, plus de 40 millions de personnes meurent de maladies non transmissibles — soit 74 % de tous les décès dans le monde. Les quatre plus grands tueurs sont largement évitables par l'alimentation et le mode de vie.",
      deathsYear: 'décès/an',
      cards: [
        { label: 'Maladies cardiaques',      desc: "80 % évitables par l'alimentation" },
        { label: 'Cancer',                   desc: '40 % évitables par le mode de vie' },
        { label: 'Maladies respiratoires',   desc: '70 % évitables par le mode de vie' },
        { label: 'Diabète',                  desc: "85 % évitables par l'alimentation" },
      ],
      callout: '+10–15 ans',
      calloutSub: "La plupart des décès prématurés sont évitables. Avec une bonne nutrition, vous pouvez gagner 10 à 15 années de vie en bonne santé. Ajoutez des années à votre vie — et de la vie à vos années.",
      source: 'Source : Fiche d\'information de l\'OMS sur les maladies non transmissibles, 2024',
    },
    mission: {
      tag: 'Notre Mission',
      heading: 'Une santé de qualité,',
      headingEm: 'accessible à tous.',
      desc: "Evida Life combine le régime alimentaire scientifiquement le plus solide — végétal à base d'aliments complets — avec des marqueurs sanguins professionnels. Pas comme un produit lifestyle coûteux, mais comme une vraie plateforme de santé pour tous. Le savoir seul ne suffit pas. Nous rendons le changement mesurable.",
      cta: 'Notre science',
    },
    pillars: {
      tag: 'La Plateforme',
      heading: 'Tout ce dont',
      headingEm: 'vous avez besoin.',
      cards: [
        { title: 'Daily Dozen Tracker',      desc: 'Suivez les 12 groupes alimentaires du Dr Greger chaque jour. Cases simples, impact réel.' },
        { title: 'Recettes complètes',        desc: 'Recettes végétales adaptées au Daily Dozen. Rapides, délicieuses, saines.' },
        { title: 'Biomarqueurs sanguins',     desc: '9 domaines de santé. À partir de CHF 99.' },
        { title: 'Tableau de bord santé',     desc: 'Votre score de longévité : tous les résultats en un seul endroit. Voyez où vous en êtes.' },
      ],
    },
    steps: {
      tag: 'Comment ça marche',
      heading: 'Trois étapes pour',
      headingEm: 'une santé mesurable',
      items: [
        { n: '01', title: 'Mesurer',    desc: "Les laboratoires partenaires analysent vos marqueurs de santé et de longévité les plus importants. Tous les résultats clairement visibles dans votre tableau de bord personnel." },
        { n: '02', title: 'Nourrir',    desc: "Nutrition végétale à base d'aliments complets suivant le Daily Dozen du Dr Greger. Avec des recettes, des conseils et un suivi quotidien intégré à l'application." },
        { n: '03', title: 'Améliorer',  desc: "Votre score de longévité montre de manière mesurable comment votre alimentation affecte vos biomarqueurs. Clair. Compréhensible. Motivant." },
      ],
    },
    science: {
      tag: 'La Science',
      heading: 'Fondé sur des preuves.',
      sub: 'Nos recommandations sont basées sur des recherches évaluées par des pairs, pas sur des tendances.',
      findings: [
        { label: 'Réduction des événements cardiaques avec un régime WFPB (Esselstyn 2014)' },
        { label: "Années d'espérance de vie supplémentaires grâce aux changements de mode de vie" },
        { label: 'Marqueurs du vieillissement influencés par l\'alimentation et le mode de vie' },
      ],
      link: 'Explorer la science',
    },
    pricing: {
      tag: 'Tarifs',
      heading: 'Simple.',
      headingEm: 'Transparent.',
      cta: 'Voir les détails',
      freeNote: 'Le compte gratuit inclut le Daily Dozen Tracker, les recettes et la liste de courses.',
    },
    cta: {
      title: 'Votre parcours de santé commence par un repas.',
      sub: 'Compte gratuit. Aucune carte bancaire nécessaire.',
      cta1: 'Créer un compte gratuit',
      cta2: 'Explorer la plateforme',
    },
  },
  es: {
    hero: {
      h1: 'Vive bien.',
      h1em: 'Con base científica.',
      sub: '40 millones de personas mueren cada año por enfermedades prevenibles. La mayoría come los alimentos equivocados. Estamos cambiando eso — de forma medible.',
      cta1: 'Registrarse gratis',
      cta2: 'Explorar el Daily Dozen',
    },
    problem: {
      tag: 'El Problema',
      heading: 'La epidemia',
      headingEm: 'silenciosa.',
      context: 'Cada año, más de 40 millones de personas mueren por enfermedades no transmisibles — el 74 % de todas las muertes en el mundo. Los cuatro mayores asesinos son en gran medida prevenibles mediante la dieta y el estilo de vida.',
      deathsYear: 'muertes/año',
      cards: [
        { label: 'Enfermedades cardíacas',      desc: '80% prevenibles a través de la dieta' },
        { label: 'Cáncer',                      desc: '40% prevenibles a través del estilo de vida' },
        { label: 'Enfermedades respiratorias',  desc: '70% prevenibles a través del estilo de vida' },
        { label: 'Diabetes',                    desc: '85% prevenibles a través de la dieta' },
      ],
      callout: '+10–15 años',
      calloutSub: 'La mayoría de las muertes prematuras son prevenibles. Con la nutrición adecuada, puedes ganar 10–15 años saludables. Añade años a tu vida — y vida a tus años.',
      source: 'Fuente: Hoja de datos de la OMS sobre enfermedades no transmisibles, 2024',
    },
    mission: {
      tag: 'Nuestra Misión',
      heading: 'Salud de calidad,',
      headingEm: 'asequible para todos.',
      desc: 'Evida Life combina el patrón dietético científicamente más sólido — integral a base de plantas — con marcadores sanguíneos profesionales. No como un costoso producto de estilo de vida, sino como una plataforma de salud real para todos. El conocimiento solo no es suficiente. Hacemos que el cambio sea medible.',
      cta: 'Nuestra ciencia',
    },
    pillars: {
      tag: 'La Plataforma',
      heading: 'Todo lo que',
      headingEm: 'necesitas.',
      cards: [
        { title: 'Daily Dozen Tracker',    desc: 'Registra los 12 grupos de alimentos del Dr. Greger cada día. Casillas simples, impacto real.' },
        { title: 'Recetas integrales',      desc: 'Recetas vegetales adaptadas al Daily Dozen. Rápidas, deliciosas, saludables.' },
        { title: 'Biomarcadores en sangre', desc: '9 dominios de salud. Desde CHF 99.' },
        { title: 'Panel de salud',          desc: 'Tu puntuación de longevidad: todos los resultados en un lugar. Ve exactamente dónde estás.' },
      ],
    },
    steps: {
      tag: 'Cómo funciona',
      heading: 'Tres pasos para',
      headingEm: 'una salud medible',
      items: [
        { n: '01', title: 'Medir',    desc: 'Los laboratorios asociados analizan tus marcadores de salud y longevidad más importantes. Todos los resultados claramente visibles en tu panel personal.' },
        { n: '02', title: 'Nutrir',   desc: 'Nutrición vegetal integral siguiendo el Daily Dozen del Dr. Greger. Con recetas, consejos y seguimiento diario integrado en la app.' },
        { n: '03', title: 'Mejorar',  desc: 'Tu puntuación de longevidad muestra de forma medible cómo tu alimentación afecta tus biomarcadores. Claro. Comprensible. Motivador.' },
      ],
    },
    science: {
      tag: 'La Ciencia',
      heading: 'Respaldado por evidencia.',
      sub: 'Nuestras recomendaciones se basan en investigaciones revisadas por pares, no en tendencias.',
      findings: [
        { label: 'Reducción de eventos cardíacos con una dieta WFPB (Esselstyn 2014)' },
        { label: 'Años adicionales de esperanza de vida a través de cambios de estilo de vida' },
        { label: 'Marcas del envejecimiento influenciadas por la dieta y el estilo de vida' },
      ],
      link: 'Explorar la ciencia',
    },
    pricing: {
      tag: 'Precios',
      heading: 'Simple.',
      headingEm: 'Transparente.',
      cta: 'Ver detalles',
      freeNote: 'La cuenta gratuita incluye Daily Dozen Tracker, recetas y lista de compras.',
    },
    cta: {
      title: 'Tu viaje de salud comienza con una comida.',
      sub: 'Cuenta gratuita. Sin tarjeta de crédito.',
      cta1: 'Crear cuenta gratuita',
      cta2: 'Explorar la plataforma',
    },
  },
  it: {
    hero: {
      h1: 'Vivi bene.',
      h1em: 'Con base scientifica.',
      sub: '40 milioni di persone muoiono ogni anno per malattie prevenibili. La maggior parte mangia i cibi sbagliati. Stiamo cambiando questo — in modo misurabile.',
      cta1: 'Registrati gratis',
      cta2: 'Esplora il Daily Dozen',
    },
    problem: {
      tag: 'Il Problema',
      heading: "L'epidemia",
      headingEm: 'silenziosa.',
      context: "Ogni anno, oltre 40 milioni di persone muoiono per malattie non trasmissibili — il 74 % di tutti i decessi nel mondo. I quattro maggiori killer sono ampiamente prevenibili attraverso l'alimentazione e lo stile di vita.",
      deathsYear: 'decessi/anno',
      cards: [
        { label: 'Malattie cardiache',         desc: "80% prevenibili attraverso l'alimentazione" },
        { label: 'Cancro',                     desc: '40% prevenibili attraverso lo stile di vita' },
        { label: 'Malattie respiratorie',      desc: '70% prevenibili attraverso lo stile di vita' },
        { label: 'Diabete',                    desc: "85% prevenibili attraverso l'alimentazione" },
      ],
      callout: '+10–15 anni',
      calloutSub: "La maggior parte dei decessi prematuri è prevenibile. Con la giusta nutrizione, puoi guadagnare 10–15 anni di vita sana. Aggiungi anni alla tua vita — e vita ai tuoi anni.",
      source: "Fonte: Scheda informativa dell'OMS sulle malattie non trasmissibili, 2024",
    },
    mission: {
      tag: 'La Nostra Missione',
      heading: 'Salute di qualità,',
      headingEm: 'accessibile a tutti.',
      desc: "Evida Life combina il modello alimentare scientificamente più solido — integrale a base vegetale — con marcatori ematici professionali. Non come un costoso prodotto lifestyle, ma come una vera piattaforma di salute per tutti. La conoscenza da sola non basta. Rendiamo il cambiamento misurabile.",
      cta: 'La nostra scienza',
    },
    pillars: {
      tag: 'La Piattaforma',
      heading: 'Tutto ciò di cui',
      headingEm: 'hai bisogno.',
      cards: [
        { title: 'Daily Dozen Tracker',    desc: 'Traccia i 12 gruppi alimentari del Dr. Greger ogni giorno. Caselle semplici, impatto reale.' },
        { title: 'Ricette integrali',       desc: 'Ricette vegetali abbinate al Daily Dozen. Veloci, deliziose, sane.' },
        { title: 'Biomarcatori nel sangue', desc: '9 domini di salute. Da CHF 99.' },
        { title: 'Dashboard salute',        desc: 'Il tuo Longevity Score: tutti i risultati in un unico posto. Vedi esattamente dove ti trovi.' },
      ],
    },
    steps: {
      tag: 'Come funziona',
      heading: 'Tre passi per',
      headingEm: 'una salute misurabile',
      items: [
        { n: '01', title: 'Misurare',    desc: 'I laboratori partner analizzano i tuoi marcatori di salute e longevità più importanti. Tutti i risultati chiaramente visibili nel tuo cruscotto personale.' },
        { n: '02', title: 'Nutrirsi',    desc: "Nutrizione vegetale integrale seguendo il Daily Dozen del Dr. Greger. Con ricette, consigli e monitoraggio quotidiano integrato nell'app." },
        { n: '03', title: 'Migliorare',  desc: 'Il tuo Longevity Score mostra in modo misurabile come la tua alimentazione influisce sui tuoi biomarcatori. Chiaro. Comprensibile. Motivante.' },
      ],
    },
    science: {
      tag: 'La Scienza',
      heading: 'Supportato da evidenze.',
      sub: 'Le nostre raccomandazioni si basano su ricerche peer-reviewed, non su tendenze.',
      findings: [
        { label: 'Riduzione degli eventi cardiaci con la dieta WFPB (Esselstyn 2014)' },
        { label: "Anni di aspettativa di vita in più attraverso cambiamenti dello stile di vita" },
        { label: "Segni distintivi dell'invecchiamento influenzati da dieta e stile di vita" },
      ],
      link: 'Esplora la scienza',
    },
    pricing: {
      tag: 'Prezzi',
      heading: 'Semplice.',
      headingEm: 'Trasparente.',
      cta: 'Vedi dettagli',
      freeNote: 'Il conto gratuito include Daily Dozen Tracker, ricette e lista della spesa.',
    },
    cta: {
      title: 'Il tuo viaggio di salute inizia con un pasto.',
      sub: 'Account gratuito. Nessuna carta di credito necessaria.',
      cta1: 'Crea account gratuito',
      cta2: 'Esplora la piattaforma',
    },
  },
};

function SectionTag({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-4 h-px bg-[#ceab84] block flex-shrink-0" />
      <span className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase">
        {label}
      </span>
    </div>
  );
}

function SectionTagDark({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-4 h-px bg-[#ceab84] block flex-shrink-0" />
      <span className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase">
        {label}
      </span>
    </div>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  // ─── Fetch real product data ───────────────────────────────────────────────
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name, description, short_description, price_chf, compare_at_price_chf, sort_order')
    .eq('product_type', 'blood_test')
    .eq('is_active', true)
    .order('sort_order');

  const { data: itemCounts } = await supabase
    .from('product_biomarkers')
    .select('product_id, item_id')
    .in('product_id', (products ?? []).map((p) => p.id));

  const countMap: Record<string, number> = {};
  for (const item of itemCounts ?? []) {
    countMap[item.product_id] = (countMap[item.product_id] || 0) + 1;
  }

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">

      <PublicNav />

      {/* ─── 1. HERO ─── */}
      <section className="relative h-screen min-h-[620px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${PHOTOS.hero}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e393d]/85 via-[#0e393d]/50 to-[#0e393d]/10" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-20">
          <div className="w-full max-w-[1060px] mx-auto px-8 md:px-12">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white mb-5 max-w-[640px]">
              {t.hero.h1}<br />
              <em className="italic font-normal text-white/70">{t.hero.h1em}</em>
            </h1>
            <p className="text-[1rem] font-light text-white/70 leading-relaxed max-w-[480px] mb-10">{t.hero.sub}</p>
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/login"
                className="bg-[#ceab84] text-[#0e393d] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
              >
                {t.hero.cta1}
              </Link>
              <Link
                href="/daily-dozen"
                className="text-white bg-white/10 backdrop-blur-sm border border-white/50 text-[13px] font-light px-7 py-3.5 rounded-full transition-all hover:bg-white/20 whitespace-nowrap"
              >
                {t.hero.cta2}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. THE PROBLEM ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
        <div className="mb-10">
          <SectionTag label={t.problem.tag} />
          <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight mb-5">
            {t.problem.heading}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t.problem.headingEm}</em>
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed max-w-[620px]">{t.problem.context}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {t.problem.cards.map((card, i) => (
            <div key={i} className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 p-6">
              <div className="font-serif text-4xl font-normal text-[#0e393d] mb-0.5">{PROBLEM_STATS[i].stat}</div>
              <div className="text-[0.65rem] text-[#5a6e6f] mb-2">{t.problem.deathsYear}</div>
              <div className="text-xs font-medium text-[#0e393d] tracking-wide mb-3 uppercase">{card.label}</div>
              <div className="w-full bg-[#0e393d]/8 rounded-full h-1 mb-2">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${PROBLEM_STATS[i].pct}%` }} />
              </div>
              <div className="text-[0.75rem] font-light text-[#5a6e6f]">{card.desc}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-[#0e393d] px-8 py-6 flex flex-col sm:flex-row sm:items-start gap-4">
          <span className="font-serif text-3xl md:text-4xl text-[#ceab84] whitespace-nowrap shrink-0">{t.problem.callout}</span>
          <span className="text-white/70 font-light text-[0.9rem] leading-relaxed">{t.problem.calloutSub}</span>
        </div>
        <p className="mt-3 text-[0.65rem] text-[#5a6e6f]/50">
          <a
            href="https://www.who.int/news-room/fact-sheets/detail/noncommunicable-diseases"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#5a6e6f]/80 transition-colors"
          >
            {t.problem.source}
          </a>
        </p>
      </section>

      {/* ─── 3. OUR MISSION ─── */}
      <section className="border-t border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0">
          <div className="px-8 md:px-12 py-20 md:py-28 flex flex-col justify-center">
            <SectionTag label={t.mission.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight mb-6">
              {t.mission.heading}<br />
              <em className="italic font-normal text-[#0e393d]/60">{t.mission.headingEm}</em>
            </h2>
            <p className="text-[1rem] font-light text-[#5a6e6f] leading-relaxed mb-8 max-w-[420px]">{t.mission.desc}</p>
            <Link
              href="/blog"
              className="self-start bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
            >
              {t.mission.cta}
            </Link>
          </div>
          <div className="relative min-h-[320px] md:min-h-0">
            <Image
              src={PHOTOS.mission}
              alt="Plant-based food"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* ─── 4. FOUR PILLARS ─── */}
      <section className="bg-[#fafaf8] border-t border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
          <div className="mb-12">
            <SectionTag label={t.pillars.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight">
              {t.pillars.heading}<br />
              <em className="italic font-normal text-[#0e393d]/60">{t.pillars.headingEm}</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {t.pillars.cards.map((card, idx) => {
              const meta = PILLARS[idx];
              return (
                <Link
                  key={meta.href}
                  href={meta.href}
                  className="rounded-2xl overflow-hidden ring-1 ring-[#0e393d]/10 bg-white hover:-translate-y-1 transition-transform duration-200"
                >
                  <div className="relative h-44 overflow-hidden">
                    <Image
                      src={meta.photo}
                      alt={card.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/40 to-transparent" />
                  </div>
                  <div className="p-5 pb-6">
                    <h3 className="font-serif font-normal text-[1.05rem] text-[#0e393d] mb-1.5 leading-snug">{card.title}</h3>
                    <p className="text-[0.78rem] font-light text-[#5a6e6f] leading-relaxed">{card.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. HOW IT WORKS ─── */}
      <section id="how" className="bg-[#0e393d] py-20 md:py-28 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <div className="mb-14">
            <SectionTagDark label={t.steps.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-white leading-[1.1] tracking-tight">
              {t.steps.heading}<br />
              <em className="italic font-normal text-white/60">{t.steps.headingEm}</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {t.steps.items.map((step, idx) => (
              <div key={step.n} className="bg-[#0e393d] hover:bg-[#1a5055] transition-colors duration-200 p-10">
                <div className="font-serif font-normal text-[4.5rem] text-white/8 leading-none mb-6">{step.n}</div>
                <div className="relative h-36 rounded-xl overflow-hidden mb-5">
                  <Image
                    src={STEP_PHOTOS[idx]}
                    alt={step.title}
                    fill
                    className="object-cover opacity-80"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/60 to-transparent" />
                </div>
                <h3 className="font-serif font-normal text-[1.5rem] text-white mb-2.5">{step.title}</h3>
                <p className="text-[0.83rem] font-light text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. SCIENCE TEASER ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
        <div className="rounded-2xl bg-[#f2ebdb] px-10 md:px-16 py-14">
          <div className="max-w-[540px] mb-10">
            <SectionTag label={t.science.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight mb-4">
              {t.science.heading}
            </h2>
            <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed">{t.science.sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {t.science.findings.map((finding, i) => (
              <div key={i} className="rounded-xl bg-white/70 px-6 py-5">
                <div className="font-serif text-4xl font-normal text-[#0e393d] mb-2">{SCIENCE_FINDINGS[i].stat}</div>
                <p className="text-[0.8rem] font-light text-[#5a6e6f] leading-snug">{finding.label}</p>
              </div>
            ))}
          </div>
          <Link
            href="/blog"
            className="inline-block bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
          >
            {t.science.link}
          </Link>
        </div>
      </section>

      {/* ─── 7. PRICING — live from DB ─── */}
      <section className="border-t border-[#0e393d]/10">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
          <div className="mb-12 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-4 h-px bg-[#ceab84] block flex-shrink-0" />
              <span className="text-[#ceab84] text-[10.5px] font-medium tracking-[0.14em] uppercase">{t.pricing.tag}</span>
              <span className="w-4 h-px bg-[#ceab84] block flex-shrink-0" />
            </div>
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight">
              {t.pricing.heading}{' '}
              <em className="italic font-normal text-[#0e393d]/60">{t.pricing.headingEm}</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(products ?? []).map((product, idx) => {
              const name = (product.name as Record<string, string>)?.[lang]
                ?? (product.name as Record<string, string>)?.en
                ?? '';
              const shortDesc = (product.short_description as Record<string, string>)?.[lang]
                ?? (product.short_description as Record<string, string>)?.en
                ?? '';
              const isMiddle = idx === 1;
              const features = PRODUCT_FEATURES[product.sort_order]?.[lang]
                ?? PRODUCT_FEATURES[product.sort_order]?.en
                ?? [];
              const popularLabel = lang === 'de' ? 'Beliebt' : lang === 'fr' ? 'Populaire' : lang === 'es' ? 'Popular' : lang === 'it' ? 'Popolare' : 'Popular';

              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.slug}`}
                  className={`rounded-2xl p-8 flex flex-col hover:-translate-y-1 transition-transform duration-200 ${
                    isMiddle
                      ? 'bg-[#0e393d] ring-2 ring-[#ceab84]'
                      : 'bg-white ring-1 ring-[#0e393d]/10'
                  }`}
                >
                  {isMiddle && (
                    <span className="self-start text-[10px] font-semibold uppercase tracking-widest bg-[#ceab84] text-[#0e393d] px-3 py-1 rounded-full mb-4">
                      {popularLabel}
                    </span>
                  )}

                  <div className={`text-xs font-medium tracking-widest uppercase mb-2 ${isMiddle ? 'text-[#ceab84]' : 'text-[#5a6e6f]'}`}>
                    {name}
                  </div>
                  <div className={`font-serif text-4xl font-normal mb-1 ${isMiddle ? 'text-white' : 'text-[#0e393d]'}`}>
                    CHF {product.price_chf}
                  </div>
                  {product.compare_at_price_chf && (
                    <div className={`text-xs line-through mb-1 ${isMiddle ? 'text-white/30' : 'text-[#5a6e6f]/50'}`}>
                      CHF {product.compare_at_price_chf}
                    </div>
                  )}
                  <p className={`text-xs leading-relaxed mb-5 ${isMiddle ? 'text-white/50' : 'text-[#5a6e6f]'}`}>
                    {shortDesc}
                  </p>

                  <div className={`h-px mb-5 ${isMiddle ? 'bg-white/10' : 'bg-[#0e393d]/8'}`} />

                  <ul className="flex-1 space-y-2.5 mb-6">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 text-[10px] shrink-0 ${isMiddle ? 'text-[#ceab84]' : 'text-emerald-600'}`}>✓</span>
                        <span className={`text-[0.82rem] font-light leading-snug ${isMiddle ? 'text-white/80' : 'text-[#5a6e6f]'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <span className={`block text-center font-medium text-[13px] tracking-wide px-6 py-3 rounded-full transition-colors whitespace-nowrap ${
                    isMiddle
                      ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#dfc4a4]'
                      : 'bg-[#0e393d]/8 text-[#0e393d] hover:bg-[#0e393d]/15'
                  }`}>
                    {t.pricing.cta}
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="text-center text-sm text-[#5a6e6f] mt-6">{t.pricing.freeNote}</p>
        </div>
      </section>

      {/* ─── 8. BOTTOM CTA ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 pb-20 md:pb-28">
        <div className="rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-3 leading-tight">{t.cta.title}</h2>
          <p className="text-white/50 text-sm mb-8">{t.cta.sub}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/login"
              className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
            >
              {t.cta.cta1}
            </Link>
            <Link
              href="/recipes"
              className="text-white border border-white/30 text-[13px] font-light px-8 py-3.5 rounded-full transition-all hover:bg-white/10 whitespace-nowrap"
            >
              {t.cta.cta2}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}
