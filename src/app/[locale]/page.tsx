import Image from 'next/image';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

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
  { photo: PHOTOS.pillar4, href: '/health'      },
];

const STEP_PHOTOS = [PHOTOS.step1, PHOTOS.step2, PHOTOS.step3];

const PROBLEM_STATS = [
  { stat: '18M', pct: 80 },
  { stat: '10M', pct: 40 },
  { stat: '6M',  pct: 90 },
  { stat: '2M',  pct: 70 },
];

const SCIENCE_FINDINGS = [
  { stat: '32%', key: 'f1' },
  { stat: '+14', key: 'f2' },
  { stat: '11',  key: 'f3' },
];

const T: Record<Lang, {
  hero: { h1: string; h1em: string; sub: string; cta1: string; cta2: string };
  problem: { tag: string; heading: string; headingEm: string; cards: { label: string; desc: string }[]; callout: string; calloutSub: string };
  mission: { tag: string; heading: string; headingEm: string; desc: string; cta: string };
  pillars: { tag: string; heading: string; headingEm: string; cards: { title: string; desc: string }[] };
  steps: { tag: string; heading: string; headingEm: string; items: { n: string; title: string; desc: string }[] };
  science: { tag: string; heading: string; sub: string; findings: { label: string }[]; link: string };
  pricing: { tag: string; heading: string; headingEm: string; plans: { name: string; price: string; priceNote: string; features: string[]; cta: string; highlight: boolean }[] };
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
      cards: [
        { label: 'Herzerkrankungen', desc: '80 % durch Ernährung vermeidbar' },
        { label: 'Krebs',            desc: '40 % durch Lifestyle vermeidbar' },
        { label: 'Schlaganfall',     desc: '90 % durch Lifestyle vermeidbar' },
        { label: 'Diabetes',         desc: '70 % durch Ernährung vermeidbar' },
      ],
      callout: '+10–15 Jahre',
      calloutSub: 'längeres, gesünderes Leben – mit vollwertiger pflanzenbasierter Ernährung.',
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
        { title: 'Blut-Biomarker',       desc: '36 professionelle Blutmarker in 6 Gesundheitsdomänen. Ab CHF 149.' },
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
        { label: 'Reduktion des Herzerkrankungsrisikos durch WFPB-Ernährung' },
        { label: 'Lebensjahre zusätzlich durch vollwertige pflanzenbasierte Ernährung' },
        { label: 'Hallmarks of Aging, die auf Lebensstil ansprechen' },
      ],
      link: 'Zur Wissenschaft',
    },
    pricing: {
      tag: 'Preise',
      heading: 'Einfach.',
      headingEm: 'Transparent.',
      plans: [
        {
          name: 'Core',
          price: 'Kostenlos',
          priceNote: 'Für immer',
          features: ['Daily Dozen Tracker', 'Rezeptbibliothek', 'Ernährungstipps', 'Community-Zugang'],
          cta: 'Kostenlos starten',
          highlight: false,
        },
        {
          name: 'Pro',
          price: 'CHF 149',
          priceNote: 'einmalig pro Test',
          features: ['Alles in Core', 'Basis-Laborpanel (12 Marker)', 'Persönliches Dashboard', 'Ergebnisinterpretation'],
          cta: 'Pro wählen',
          highlight: true,
        },
        {
          name: 'Complete',
          price: 'CHF 299',
          priceNote: 'einmalig pro Test',
          features: ['Alles in Pro', 'Volles Laborpanel (36 Marker)', '6 Gesundheitsdomänen', 'Longevity Score + Verlauf'],
          cta: 'Complete wählen',
          highlight: false,
        },
      ],
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
      cards: [
        { label: 'Heart disease', desc: '80% preventable through diet' },
        { label: 'Cancer',        desc: '40% preventable through lifestyle' },
        { label: 'Stroke',        desc: '90% preventable through lifestyle' },
        { label: 'Diabetes',      desc: '70% preventable through diet' },
      ],
      callout: '+10–15 years',
      calloutSub: 'longer, healthier life — with a whole-food, plant-based diet.',
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
        { title: 'Blood Biomarkers',    desc: '36 professional blood markers across 6 health domains. From CHF 149.' },
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
        { label: 'Reduction in heart disease risk from a WFPB diet' },
        { label: 'Additional life years from a whole-food, plant-based diet' },
        { label: 'Hallmarks of Aging that respond to lifestyle interventions' },
      ],
      link: 'Explore the science',
    },
    pricing: {
      tag: 'Pricing',
      heading: 'Simple.',
      headingEm: 'Transparent.',
      plans: [
        {
          name: 'Core',
          price: 'Free',
          priceNote: 'Forever',
          features: ['Daily Dozen Tracker', 'Recipe library', 'Nutrition tips', 'Community access'],
          cta: 'Start for free',
          highlight: false,
        },
        {
          name: 'Pro',
          price: 'CHF 149',
          priceNote: 'one-time per test',
          features: ['Everything in Core', 'Basic lab panel (12 markers)', 'Personal dashboard', 'Result interpretation'],
          cta: 'Choose Pro',
          highlight: true,
        },
        {
          name: 'Complete',
          price: 'CHF 299',
          priceNote: 'one-time per test',
          features: ['Everything in Pro', 'Full lab panel (36 markers)', '6 health domains', 'Longevity Score + history'],
          cta: 'Choose Complete',
          highlight: false,
        },
      ],
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
      cards: [
        { label: 'Maladies cardiaques', desc: '80 % évitables par l\'alimentation' },
        { label: 'Cancer',              desc: '40 % évitables par le mode de vie' },
        { label: 'AVC',                 desc: '90 % évitables par le mode de vie' },
        { label: 'Diabète',             desc: '70 % évitables par l\'alimentation' },
      ],
      callout: '+10–15 ans',
      calloutSub: 'de vie en plus, en meilleure santé — grâce à une alimentation végétale à base d\'aliments complets.',
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
        { title: 'Biomarqueurs sanguins',     desc: '36 marqueurs sanguins professionnels sur 6 domaines de santé. À partir de CHF 149.' },
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
        { label: 'Réduction du risque de maladie cardiaque grâce au régime WFPB' },
        { label: 'Années de vie supplémentaires grâce à une alimentation végétale complète' },
        { label: 'Marqueurs du vieillissement qui répondent aux interventions sur le mode de vie' },
      ],
      link: 'Explorer la science',
    },
    pricing: {
      tag: 'Tarifs',
      heading: 'Simple.',
      headingEm: 'Transparent.',
      plans: [
        {
          name: 'Core',
          price: 'Gratuit',
          priceNote: 'Pour toujours',
          features: ['Daily Dozen Tracker', 'Bibliothèque de recettes', 'Conseils nutritionnels', 'Accès communautaire'],
          cta: 'Commencer gratuitement',
          highlight: false,
        },
        {
          name: 'Pro',
          price: 'CHF 149',
          priceNote: 'unique par test',
          features: ['Tout dans Core', 'Panel de base (12 marqueurs)', 'Tableau de bord personnel', 'Interprétation des résultats'],
          cta: 'Choisir Pro',
          highlight: true,
        },
        {
          name: 'Complete',
          price: 'CHF 299',
          priceNote: 'unique par test',
          features: ['Tout dans Pro', 'Panel complet (36 marqueurs)', '6 domaines de santé', 'Score de longévité + historique'],
          cta: 'Choisir Complete',
          highlight: false,
        },
      ],
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
      cards: [
        { label: 'Enfermedades cardíacas', desc: '80% prevenibles a través de la dieta' },
        { label: 'Cáncer',                 desc: '40% prevenibles a través del estilo de vida' },
        { label: 'Ictus',                  desc: '90% prevenibles a través del estilo de vida' },
        { label: 'Diabetes',               desc: '70% prevenibles a través de la dieta' },
      ],
      callout: '+10–15 años',
      calloutSub: 'más de vida saludable — con una dieta integral a base de plantas.',
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
        { title: 'Biomarcadores en sangre', desc: '36 marcadores sanguíneos profesionales en 6 dominios de salud. Desde CHF 149.' },
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
        { label: 'Reducción del riesgo de enfermedad cardíaca con la dieta WFPB' },
        { label: 'Años de vida adicionales con una dieta integral a base de plantas' },
        { label: 'Marcas del envejecimiento que responden a intervenciones de estilo de vida' },
      ],
      link: 'Explorar la ciencia',
    },
    pricing: {
      tag: 'Precios',
      heading: 'Simple.',
      headingEm: 'Transparente.',
      plans: [
        {
          name: 'Core',
          price: 'Gratis',
          priceNote: 'Para siempre',
          features: ['Daily Dozen Tracker', 'Biblioteca de recetas', 'Consejos nutricionales', 'Acceso a la comunidad'],
          cta: 'Empezar gratis',
          highlight: false,
        },
        {
          name: 'Pro',
          price: 'CHF 149',
          priceNote: 'único por prueba',
          features: ['Todo en Core', 'Panel básico (12 marcadores)', 'Panel personal', 'Interpretación de resultados'],
          cta: 'Elegir Pro',
          highlight: true,
        },
        {
          name: 'Complete',
          price: 'CHF 299',
          priceNote: 'único por prueba',
          features: ['Todo en Pro', 'Panel completo (36 marcadores)', '6 dominios de salud', 'Puntuación de longevidad + historial'],
          cta: 'Elegir Complete',
          highlight: false,
        },
      ],
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
      cards: [
        { label: 'Malattie cardiache', desc: "80% prevenibili attraverso l'alimentazione" },
        { label: 'Cancro',             desc: '40% prevenibili attraverso lo stile di vita' },
        { label: 'Ictus',              desc: '90% prevenibili attraverso lo stile di vita' },
        { label: 'Diabete',            desc: "70% prevenibili attraverso l'alimentazione" },
      ],
      callout: '+10–15 anni',
      calloutSub: 'di vita in più, più sana — con una dieta integrale a base vegetale.',
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
        { title: 'Biomarcatori nel sangue', desc: '36 marcatori del sangue professionali su 6 domini di salute. Da CHF 149.' },
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
        { label: 'Riduzione del rischio di malattie cardiache con la dieta WFPB' },
        { label: 'Anni di vita in più con una dieta integrale a base vegetale' },
        { label: 'Segni distintivi dell\'invecchiamento che rispondono a interventi sullo stile di vita' },
      ],
      link: 'Esplora la scienza',
    },
    pricing: {
      tag: 'Prezzi',
      heading: 'Semplice.',
      headingEm: 'Trasparente.',
      plans: [
        {
          name: 'Core',
          price: 'Gratuito',
          priceNote: 'Per sempre',
          features: ['Daily Dozen Tracker', 'Biblioteca ricette', 'Consigli nutrizionali', 'Accesso alla community'],
          cta: 'Inizia gratis',
          highlight: false,
        },
        {
          name: 'Pro',
          price: 'CHF 149',
          priceNote: 'una tantum per test',
          features: ['Tutto in Core', 'Panel base (12 marcatori)', 'Dashboard personale', 'Interpretazione risultati'],
          cta: 'Scegli Pro',
          highlight: true,
        },
        {
          name: 'Complete',
          price: 'CHF 299',
          priceNote: 'una tantum per test',
          features: ['Tutto in Pro', 'Panel completo (36 marcatori)', '6 domini di salute', 'Longevity Score + storico'],
          cta: 'Scegli Complete',
          highlight: false,
        },
      ],
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
        <div className="mb-12">
          <SectionTag label={t.problem.tag} />
          <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight">
            {t.problem.heading}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t.problem.headingEm}</em>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {t.problem.cards.map((card, i) => (
            <div key={i} className="rounded-xl bg-white ring-1 ring-[#0e393d]/8 p-6">
              <div className="font-serif text-4xl font-normal text-[#0e393d] mb-1">{PROBLEM_STATS[i].stat}</div>
              <div className="text-xs font-medium text-[#0e393d] tracking-wide mb-3 uppercase">{card.label}</div>
              <div className="w-full bg-[#0e393d]/8 rounded-full h-1 mb-2">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${PROBLEM_STATS[i].pct}%` }} />
              </div>
              <div className="text-[0.75rem] font-light text-[#5a6e6f]">{card.desc}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-[#0e393d] px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="font-serif text-3xl md:text-4xl text-[#ceab84] whitespace-nowrap">{t.problem.callout}</span>
          <span className="text-white/70 font-light text-[0.9rem] leading-relaxed">{t.problem.calloutSub}</span>
        </div>
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
              href="/science"
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
            href="/science"
            className="inline-block bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
          >
            {t.science.link}
          </Link>
        </div>
      </section>

      {/* ─── 7. PRICING TEASER ─── */}
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
            {t.pricing.plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 flex flex-col ${
                  plan.highlight
                    ? 'bg-[#0e393d] ring-2 ring-[#ceab84]'
                    : 'bg-white ring-1 ring-[#0e393d]/10'
                }`}
              >
                <div className={`text-xs font-medium tracking-widest uppercase mb-2 ${plan.highlight ? 'text-[#ceab84]' : 'text-[#5a6e6f]'}`}>
                  {plan.name}
                </div>
                <div className={`font-serif text-4xl font-normal mb-0.5 ${plan.highlight ? 'text-white' : 'text-[#0e393d]'}`}>
                  {plan.price}
                </div>
                <div className={`text-xs mb-6 ${plan.highlight ? 'text-white/50' : 'text-[#5a6e6f]'}`}>
                  {plan.priceNote}
                </div>
                <ul className="flex-1 space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 text-[10px] ${plan.highlight ? 'text-[#ceab84]' : 'text-emerald-600'}`}>✓</span>
                      <span className={`text-[0.82rem] font-light leading-snug ${plan.highlight ? 'text-white/80' : 'text-[#5a6e6f]'}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`text-center font-medium text-[13px] tracking-wide px-6 py-3 rounded-full transition-colors whitespace-nowrap ${
                    plan.highlight
                      ? 'bg-[#ceab84] text-[#0e393d] hover:bg-[#dfc4a4]'
                      : 'bg-[#0e393d]/8 text-[#0e393d] hover:bg-[#0e393d]/15'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
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
              href="/how-to-start"
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
