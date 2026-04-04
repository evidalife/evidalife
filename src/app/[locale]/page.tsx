import Image from 'next/image';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';
import { getStudyCount, formatStudyCount } from '@/lib/research/study-count';
import HeroVoicePlayer from '@/components/HeroVoicePlayer';

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

// ─── Photo constants ──────────────────────────────────────────────────────────
const PHOTOS = {
  hero:      'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/hero.jpg',
  dashboard: 'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/dashboard.jpg',
  mission:   'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/mission.jpg',
  pillar1:   'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/pillar1.jpg',
  pillar2:   'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/pillar2.jpg',
  pillar3:   'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/pillar3.jpg',
  pillar4:   'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/pillar4.jpg',
  step1:     'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/step1.jpg',
  step2:     'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/step2.jpg',
  step3:     'https://rwbmdxgcjgidalcoeppp.supabase.co/storage/v1/object/public/website-photos/step3.jpg',
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
  1: { // Core – 38 measured + 19 calculated = 57 total
    en: ['38 essential blood markers', 'Personal health dashboard', 'Optimal range analysis', 'Digital results in 48h'],
    de: ['38 essenzielle Blutmarker', 'Persönliches Gesundheits-Dashboard', 'Optimal-Bereich-Analyse', 'Digitale Ergebnisse in 48h'],
    fr: ['38 marqueurs sanguins essentiels', 'Tableau de bord santé personnel', 'Analyse des plages optimales', 'Résultats numériques en 48h'],
    es: ['38 marcadores sanguíneos esenciales', 'Panel de salud personal', 'Análisis de rangos óptimos', 'Resultados digitales en 48h'],
    it: ['38 biomarcatori essenziali', 'Dashboard salute personale', 'Analisi range ottimali', 'Risultati digitali in 48h'],
  },
  2: { // Pro – 55 measured + 21 calculated = 76 total
    en: ['55 advanced blood markers', 'All 9 health domains', 'Longevity Score tracking', 'Hormones & inflammation panel', 'Most popular package'],
    de: ['55 erweiterte Blutmarker', 'Alle 9 Gesundheitsdomänen', 'Longevity Score Tracking', 'Hormone & Entzündungspanel', 'Unser beliebtestes Paket'],
    fr: ['55 marqueurs sanguins avancés', 'Les 9 domaines de santé', 'Suivi du Longevity Score', 'Panel hormones & inflammation', 'Notre forfait le plus populaire'],
    es: ['55 biomarcadores avanzados', 'Los 9 dominios de salud', 'Seguimiento del Longevity Score', 'Panel hormonal & inflamación', 'Nuestro paquete más popular'],
    it: ['55 biomarcatori avanzati', 'Tutti i 9 domini di salute', 'Monitoraggio Longevity Score', 'Pannello ormoni & infiammazione', 'Il nostro pacchetto più popolare'],
  },
  3: { // Complete – 57 measured + 21 calculated = 78 total
    en: ['57 markers + epigenetics', 'Full Pro panel + GrimAge v2 & DunedinPACE', 'Biological age at DNA level', 'Longevity Score + trend history', 'Priority lab processing'],
    de: ['57 Marker + Epigenetik', 'Volles Pro-Panel + GrimAge v2 & DunedinPACE', 'Biologisches Alter auf DNA-Ebene', 'Longevity Score + Verlauf', 'Prioritäts-Laborverarbeitung'],
    fr: ['57 marqueurs + épigénétique', 'Panel Pro complet + GrimAge v2 & DunedinPACE', 'Âge biologique au niveau ADN', 'Longevity Score + historique', 'Traitement laboratoire prioritaire'],
    es: ['57 marcadores + epigenética', 'Panel Pro completo + GrimAge v2 & DunedinPACE', 'Edad biológica a nivel ADN', 'Longevity Score + historial', 'Procesamiento prioritario'],
    it: ['57 marcatori + epigenetica', 'Pannello Pro completo + GrimAge v2 & DunedinPACE', 'Età biologica a livello DNA', 'Longevity Score + storico', 'Elaborazione lab prioritaria'],
  },
};

const T: Record<Lang, {
  hero: { h1: string; h1em: string; sub: string; cta1: string; cta2: string };
  trustBar: { heading: string; domains: string; biomarkers: string; studies: string; panels: string };
  howWorks: { tag: string; heading: string; headingEm: string; items: { n: string; title: string; desc: string }[] };
  dashboard: { tag: string; heading: string; headingEm: string; sub: string; feature1: string; feature2: string; feature3: string; feature4: string };
  pillars: { tag: string; heading: string; headingEm: string; cards: { title: string; desc: string }[] };
  ai: { tag: string; heading: string; headingEm: string; sub: string; features: { icon: string; title: string; desc: string }[] };
  problem: { tag: string; heading: string; headingEm: string; context: string; deathsYear: string; cards: { label: string; desc: string }[]; callout: string; calloutSub: string; source: string };
  mission: { tag: string; heading: string; headingEm: string; desc: string; cta: string };
  science: { tag: string; heading: string; sub: string; findings: { label: string }[]; link: string };
  pricing: { tag: string; heading: string; headingEm: string; cta: string; freeNote: string };
  cta: { title: string; sub: string; cta1: string; cta2: string };
}> = {
  de: {
    hero: {
      h1: 'Gesund leben.',
      h1em: 'Wissenschaftlich fundiert.',
      sub: 'Biomarker messen. KI-gestuetzt optimieren. Fortschritt verfolgen. Ein geschlossener Kreislauf fuer deine Gesundheit – gestuetzt auf 500.000+ Studien.',
      cta1: 'Kostenlos registrieren',
      cta2: 'Mehr erfahren',
    },
    trustBar: {
      heading: 'Vertraut von Gesundheitsbewussten in der Schweiz und Europa',
      domains: '9 Gesundheitsdomänen',
      biomarkers: 'Biomarker',
      studies: '500.000+ Studien',
      panels: '3 Blutpanels',
    },
    howWorks: {
      tag: 'So funktioniert es',
      heading: 'Drei Schritte zu',
      headingEm: 'messbarer Gesundheit',
      items: [
        { n: '01', title: 'Bestellen & Testen', desc: 'Blutabnahme in zertifizierten Partnerlaboren. Professionelle Analyse in 9 Gesundheitsdomänen.' },
        { n: '02', title: 'KI-Analyse', desc: 'Unsere KI analysiert deine Werte, verbindet sie mit 500.000+ Studien und erstellt personalisierte Empfehlungen.' },
        { n: '03', title: 'Optimieren & Verbessern', desc: 'Rezepte, Daily Dozen Tracking und Coaching – massgeschneidert fuer deine Biomarker. Wiederhole und verbesser dich.' },
      ],
    },
    dashboard: {
      tag: 'Dein Health Dashboard',
      heading: 'Sehe deine Gesundheit in',
      headingEm: 'neuem Licht.',
      sub: 'Alle deine Biomarker an einem Ort. Verstehe deine Werte. Sieh deine Fortschritte.',
      feature1: 'Health Engine Score',
      feature2: '9 Gesundheitsdomänen',
      feature3: 'AI Coach',
      feature4: 'Biologisches Alter',
    },
    pillars: {
      tag: 'Die Plattform',
      heading: 'Alles, was du',
      headingEm: 'brauchst.',
      cards: [
        { title: 'Daily Dozen Tracker', desc: 'Tracke Dr. Gregers 12 Lebensmittelgruppen taglich. Einfache Checkboxen, echte Wirkung.' },
        { title: 'Vollwertige Rezepte',  desc: 'Pflanzenbasierte Rezepte passend zur Daily Dozen. Schnell, lecker, gesund.' },
        { title: 'Blut-Biomarker',       desc: 'Professionelle Blutmarker in 9 Gesundheitsdomänen. Ab CHF 99.' },
        { title: 'Health Dashboard',     desc: 'Dein Longevity Score: alle Werte an einem Ort. Sieh genau, wo du stehst.' },
      ],
    },
    ai: {
      tag: 'KI-gestützte Gesundheit',
      heading: 'Sprich mit deinem',
      headingEm: 'Gesundheitsassistenten.',
      sub: 'Unsere KI durchsucht 500.000+ peer-reviewed Studien und verbindet sie mit deinen Biomarkern – fuer Empfehlungen, die auf echten Daten basieren. Per Sprache oder Text.',
      features: [
        { icon: '🎙️', title: 'KI-Sprachassistent', desc: 'Sprich mit deinem Health Coach per Stimme. Taeglicher Check-in, Fragen beantworten, Empfehlungen erhalten – alles per Voice.' },
        { icon: '📋', title: 'Sprach-Briefings', desc: 'Deine KI erklaert deine Biomarker-Ergebnisse Slide fuer Slide – lehn dich zurueck und hoer zu.' },
        { icon: '🔬', title: 'Research Agent', desc: 'Stelle Fragen zu Gesundheit und Ernaehrung per Sprache oder Text. Jede Antwort mit Studien-Zitaten belegt.' },
        { icon: '📊', title: 'Health Engine Score', desc: 'Dein Longevity Score: 0–100, gewichtet ueber 9 Domaenen. Plus biologisches Alter mit PhenoAge & GrimAge.' },
      ],
    },
    problem: {
      tag: 'Das Problem',
      heading: 'Die stille',
      headingEm: 'Epidemie.',
      context: 'Jedes Jahr sterben ueber 40 Millionen Menschen an nichtuebertragbaren Krankheiten – das sind 74 % aller Todesfälle weltweit. Die vier groessten Killer sind groesstenteils durch Ernährung und Lebensstil vermeidbar.',
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
      heading: 'Gesundheit fuer',
      headingEm: 'jeden erschwinglich.',
      desc: 'Evida Life kombiniert die wissenschaftlich staerkste Ernährungsform – vollwertig, pflanzenbasiert – mit professionellen Blutmarkern. Nicht als teures Lifestyle-Produkt, sondern als echte Gesundheitsplattform fuer alle. Wissen allein reicht nicht. Wir machen Veraenderungen messbar.',
      cta: 'Unsere Wissenschaft',
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
      title: 'Starte deine Gesundheitsreise heute.',
      sub: 'Kostenloses Konto. Keine Kreditkarte nötig.',
      cta1: 'Kostenloses Konto erstellen',
      cta2: 'Plattform entdecken',
    },
  },
  en: {
    hero: {
      h1: 'Live well.',
      h1em: 'AI-powered longevity.',
      sub: 'Measure your biomarkers. Get AI-driven insights from 500,000+ studies. Track your progress. A closed-loop system for your health.',
      cta1: 'Sign up free',
      cta2: 'Learn more',
    },
    trustBar: {
      heading: 'Trusted by health-conscious individuals across Switzerland and Europe',
      domains: '9 Health Domains',
      biomarkers: 'Biomarkers',
      studies: '500,000+ Studies',
      panels: '3 Blood Panels',
    },
    howWorks: {
      tag: 'How it works',
      heading: 'Three steps to',
      headingEm: 'measurable health',
      items: [
        { n: '01', title: 'Order & Test', desc: 'Professional blood analysis across 9 health domains via certified partner labs. Results in 48 hours.' },
        { n: '02', title: 'AI Analysis', desc: 'Our AI analyses your results, connects them with 500,000+ studies, and creates personalized recommendations.' },
        { n: '03', title: 'Optimize & Improve', desc: 'Recipes, Daily Dozen tracking, and coaching — tailored to your biomarkers. Retest and measurably improve.' },
      ],
    },
    dashboard: {
      tag: 'Your Health Dashboard',
      heading: 'See your health in a',
      headingEm: 'new light.',
      sub: 'All your biomarkers in one place. Understand your values. Track your progress.',
      feature1: 'Health Engine Score',
      feature2: '9 Health Domains',
      feature3: 'AI Coach',
      feature4: 'Biological Age',
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
    ai: {
      tag: 'AI-Powered Health',
      heading: 'Talk to your',
      headingEm: 'health assistant.',
      sub: 'Our AI searches 500,000+ peer-reviewed studies and connects them with your biomarkers — for recommendations based on real evidence. By voice or text.',
      features: [
        { icon: '🎙️', title: 'AI Voice Assistant', desc: 'Talk to your Health Coach by voice. Daily check-ins, ask questions, get recommendations — all hands-free.' },
        { icon: '📋', title: 'Voice Briefings', desc: 'Your AI walks you through your biomarker results slide by slide — sit back and listen.' },
        { icon: '🔬', title: 'Research Agent', desc: 'Ask health and nutrition questions by voice or text. Every answer backed by study citations.' },
        { icon: '📊', title: 'Health Engine Score', desc: 'Your Longevity Score: 0–100, weighted across 9 domains. Plus biological age with PhenoAge & GrimAge.' },
      ],
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
      title: 'Start your health journey today.',
      sub: 'Free account. No credit card needed.',
      cta1: 'Create free account',
      cta2: 'Explore the platform',
    },
  },
  fr: {
    hero: {
      h1: 'Vivez bien.',
      h1em: 'Longevite par l\'IA.',
      sub: 'Mesurez vos biomarqueurs. Obtenez des insights IA bases sur 500 000+ etudes. Suivez vos progres. Un systeme en boucle fermee pour votre sante.',
      cta1: 'S\'inscrire gratuitement',
      cta2: 'En savoir plus',
    },
    trustBar: {
      heading: 'Fait confiance par les personnes soucieuses de leur santé en Suisse et en Europe',
      domains: '9 Domaines de Santé',
      biomarkers: 'Biomarqueurs',
      studies: '500 000+ Études',
      panels: '3 Panels Sanguins',
    },
    howWorks: {
      tag: 'Comment cela fonctionne',
      heading: 'Trois étapes pour',
      headingEm: 'une santé mesurable',
      items: [
        { n: '01', title: 'Commander & Tester', desc: 'Analyses sanguines professionnelles dans 9 domaines de santé via des laboratoires partenaires certifiés. Résultats en 48 heures.' },
        { n: '02', title: 'Analyse IA', desc: "Notre IA analyse vos résultats, les relie à 500 000+ études et crée des recommandations personnalisées." },
        { n: '03', title: 'Optimiser & Améliorer', desc: 'Recettes, suivi Daily Dozen et coaching — adaptés à vos biomarqueurs. Refaites le test et améliorez-vous de manière mesurable.' },
      ],
    },
    dashboard: {
      tag: 'Votre tableau de bord santé',
      heading: 'Voyez votre santé sous un',
      headingEm: 'nouveau jour.',
      sub: 'Tous vos biomarqueurs au même endroit. Comprenez vos valeurs. Suivez vos progrès.',
      feature1: 'Health Engine Score',
      feature2: '9 Domaines de Santé',
      feature3: 'AI Coach',
      feature4: 'Âge biologique',
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
    ai: {
      tag: 'Sante par l\'IA',
      heading: 'Parlez a votre',
      headingEm: 'assistant sante.',
      sub: 'Notre IA explore 500 000+ etudes evaluees par des pairs et les relie a vos biomarqueurs — par voix ou texte.',
      features: [
        { icon: '🎙️', title: 'Assistant vocal IA', desc: 'Parlez a votre coach sante par la voix. Check-in quotidien, questions, recommandations — tout en mains libres.' },
        { icon: '📋', title: 'Briefings vocaux', desc: 'Votre IA vous presente vos resultats de biomarqueurs slide par slide — ecoutez et apprenez.' },
        { icon: '🔬', title: 'Agent de recherche', desc: 'Posez des questions sante par voix ou texte. Chaque reponse appuyee par des citations d\'etudes.' },
        { icon: '📊', title: 'Health Engine Score', desc: 'Score de longevite : 0–100 sur 9 domaines. Plus age biologique avec PhenoAge & GrimAge.' },
      ],
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
      title: 'Commencez votre parcours de santé dès aujourd\'hui.',
      sub: 'Compte gratuit. Aucune carte bancaire nécessaire.',
      cta1: 'Créer un compte gratuit',
      cta2: 'Explorer la plateforme',
    },
  },
  es: {
    hero: {
      h1: 'Vive bien.',
      h1em: 'Longevidad con IA.',
      sub: 'Mide tus biomarcadores. Obten insights de IA basados en 500.000+ estudios. Sigue tu progreso. Un sistema de circuito cerrado para tu salud.',
      cta1: 'Registrarse gratis',
      cta2: 'Saber mas',
    },
    trustBar: {
      heading: 'Confiado por personas conscientes de su salud en Suiza y Europa',
      domains: '9 Dominios de Salud',
      biomarkers: 'Biomarcadores',
      studies: '500.000+ Estudios',
      panels: '3 Paneles de Sangre',
    },
    howWorks: {
      tag: 'Cómo funciona',
      heading: 'Tres pasos para',
      headingEm: 'una salud medible',
      items: [
        { n: '01', title: 'Pedir & Probar', desc: 'Análisis de sangre profesional en 9 dominios de salud a través de laboratorios certificados. Resultados en 48 horas.' },
        { n: '02', title: 'Análisis de IA', desc: 'Nuestra IA analiza tus resultados, los conecta con 500.000+ estudios y crea recomendaciones personalizadas.' },
        { n: '03', title: 'Optimizar & Mejorar', desc: 'Recetas, seguimiento Daily Dozen y coaching — adaptados a tus biomarcadores. Repite y mejora de forma medible.' },
      ],
    },
    dashboard: {
      tag: 'Tu panel de salud',
      heading: 'Ve tu salud de una',
      headingEm: 'manera nueva.',
      sub: 'Todos tus biomarcadores en un solo lugar. Entiende tus valores. Sigue tu progreso.',
      feature1: 'Health Engine Score',
      feature2: '9 Dominios de Salud',
      feature3: 'AI Coach',
      feature4: 'Edad biológica',
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
    ai: {
      tag: 'Salud con IA',
      heading: 'Habla con tu',
      headingEm: 'asistente de salud.',
      sub: 'Nuestra IA busca en 500.000+ estudios revisados por pares y los conecta con tus biomarcadores — por voz o texto.',
      features: [
        { icon: '🎙️', title: 'Asistente de voz IA', desc: 'Habla con tu coach de salud por voz. Check-in diario, preguntas, recomendaciones — todo manos libres.' },
        { icon: '📋', title: 'Briefings de voz', desc: 'Tu IA te presenta tus resultados de biomarcadores slide por slide — relajate y escucha.' },
        { icon: '🔬', title: 'Agente de investigacion', desc: 'Haz preguntas de salud por voz o texto. Cada respuesta respaldada por citas de estudios.' },
        { icon: '📊', title: 'Health Engine Score', desc: 'Puntuacion de longevidad: 0–100 en 9 dominios. Mas edad biologica con PhenoAge & GrimAge.' },
      ],
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
      title: 'Comienza tu viaje de salud hoy.',
      sub: 'Cuenta gratuita. Sin tarjeta de crédito.',
      cta1: 'Crear cuenta gratuita',
      cta2: 'Explorar la plataforma',
    },
  },
  it: {
    hero: {
      h1: 'Vivi bene.',
      h1em: 'Longevita con IA.',
      sub: 'Misura i tuoi biomarcatori. Ottieni insights IA basati su 500.000+ studi. Monitora i tuoi progressi. Un sistema a circuito chiuso per la tua salute.',
      cta1: 'Registrati gratis',
      cta2: 'Scopri di piu',
    },
    trustBar: {
      heading: 'Fidato da persone consapevoli della loro salute in Svizzera e in Europa',
      domains: '9 Domini di Salute',
      biomarkers: 'Biomarcatori',
      studies: '500.000+ Studi',
      panels: '3 Pannelli di Sangue',
    },
    howWorks: {
      tag: 'Come funziona',
      heading: 'Tre passi per',
      headingEm: 'una salute misurabile',
      items: [
        { n: '01', title: 'Ordina & Testa', desc: 'Analisi del sangue professionale in 9 domini di salute tramite laboratori partner certificati. Risultati in 48 ore.' },
        { n: '02', title: 'Analisi AI', desc: 'La nostra IA analizza i tuoi risultati, li collega a 500.000+ studi e crea raccomandazioni personalizzate.' },
        { n: '03', title: 'Ottimizza & Migliora', desc: 'Ricette, tracciamento Daily Dozen e coaching — su misura per i tuoi biomarcatori. Ripeti e migliora in modo misurabile.' },
      ],
    },
    dashboard: {
      tag: 'Il tuo dashboard salute',
      heading: 'Vedi la tua salute in una',
      headingEm: 'nuova luce.',
      sub: 'Tutti i tuoi biomarcatori in un solo posto. Comprendi i tuoi valori. Monitorare i tuoi progressi.',
      feature1: 'Health Engine Score',
      feature2: '9 Domini di Salute',
      feature3: 'AI Coach',
      feature4: 'Età biologica',
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
    ai: {
      tag: 'Salute con IA',
      heading: 'Parla con il tuo',
      headingEm: 'assistente di salute.',
      sub: 'La nostra IA esplora 500.000+ studi peer-reviewed e li collega ai tuoi biomarcatori — per voce o testo.',
      features: [
        { icon: '🎙️', title: 'Assistente vocale IA', desc: 'Parla con il tuo coach di salute per voce. Check-in giornaliero, domande, raccomandazioni — tutto a mani libere.' },
        { icon: '📋', title: 'Briefing vocali', desc: 'La tua IA ti presenta i risultati dei biomarcatori slide per slide — rilassati e ascolta.' },
        { icon: '🔬', title: 'Agente di ricerca', desc: 'Fai domande sulla salute per voce o testo. Ogni risposta supportata da citazioni di studi.' },
        { icon: '📊', title: 'Health Engine Score', desc: 'Punteggio di longevita: 0–100 su 9 domini. Piu eta biologica con PhenoAge & GrimAge.' },
      ],
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
      title: 'Inizia il tuo viaggio di salute oggi.',
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

  const studyCount = await getStudyCount();
  const sc = formatStudyCount(studyCount, lang);

  // Replace all hardcoded study count references with real number
  const scRx = /500[,.\s]?000\+?/g;
  const heroSub = t.hero.sub.replace(scRx, sc);
  const aiSub = t.ai.sub.replace(scRx, sc);
  const trustBarStudies = t.trustBar.studies.replace(scRx, sc);
  const howWorksItems = t.howWorks.items.map((item) => ({
    ...item,
    desc: item.desc.replace(scRx, sc),
  }));

  // ─── Fetch real product data ───────────────────────────────────────────────
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name, description, short_description, price_chf, compare_at_price_chf, sort_order, metadata')
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
  // Max biomarker count from product metadata (includes measured + calculated)
  const maxBiomarkers = Math.max(...(products ?? []).map((p) => (p.metadata as { marker_count?: number } | null)?.marker_count ?? 0));

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">

      <PublicNav />

      {/* ─── 1. HERO ─── */}
      <section className="relative h-screen min-h-[620px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${PHOTOS.hero}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e393d]/85 via-[#0e393d]/50 to-[#0e393d]/10" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-20">
          <div className="w-full max-w-[1060px] mx-auto px-8 md:px-12">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white mb-5 max-w-[640px]">
              {t.hero.h1}<br />
              <em className="italic font-normal text-white/70">{t.hero.h1em}</em>
            </h1>
            <p className="text-[1rem] font-light text-white/70 leading-relaxed max-w-[480px] mb-8">{heroSub}</p>
            <div className="flex gap-3 flex-wrap mb-10">
              <Link
                href="/login"
                className="bg-[#ceab84] text-[#0e393d] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
              >
                {t.hero.cta1}
              </Link>
              <Link
                href="#how"
                className="text-white bg-white/10 backdrop-blur-sm border border-white/50 text-[13px] font-light px-7 py-3.5 rounded-full transition-all hover:bg-white/20 whitespace-nowrap"
              >
                {t.hero.cta2}
              </Link>
            </div>

            {/* AI Voice Coach */}
            <HeroVoicePlayer lang={lang} page="home" />

            {/* Trust stats */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-xl text-[#ceab84]">{maxBiomarkers}+</span>
                <span className="text-white/50 text-xs">{t.trustBar.biomarkers}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-xl text-[#ceab84]">{sc}</span>
                <span className="text-white/50 text-xs">{trustBarStudies}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-xl text-[#ceab84]">9</span>
                <span className="text-white/50 text-xs">{t.trustBar.domains}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-xl text-[#ceab84]">{(products ?? []).length}</span>
                <span className="text-white/50 text-xs">{t.trustBar.panels}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. HOW IT WORKS – Visual 3-Step ─── */}
      <section id="how" className="bg-[#0e393d] py-20 md:py-28 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <div className="mb-14">
            <SectionTagDark label={t.howWorks.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-white leading-[1.1] tracking-tight">
              {t.howWorks.heading}<br />
              <em className="italic font-normal text-white/60">{t.howWorks.headingEm}</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {howWorksItems.map((step, idx) => (
              <div key={step.n} className="bg-[#0e393d] hover:bg-[#1a5055] transition-colors duration-200 p-8 md:p-10">
                <div className="relative h-48 rounded-xl overflow-hidden mb-6">
                  <Image
                    src={STEP_PHOTOS[idx]}
                    alt={step.title}
                    fill
                    className="object-cover opacity-85"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/70 to-transparent" />
                </div>
                <div className="font-serif font-normal text-[3.5rem] text-white/10 leading-none mb-4">{step.n}</div>
                <h3 className="font-serif font-normal text-[1.4rem] text-white mb-3">{step.title}</h3>
                <p className="text-[0.9rem] font-light text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. DASHBOARD SHOWCASE ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: Text content */}
          <div>
            <SectionTag label={t.dashboard.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight mb-6">
              {t.dashboard.heading}<br />
              <em className="italic font-normal text-[#0e393d]/60">{t.dashboard.headingEm}</em>
            </h2>
            <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed mb-8">{t.dashboard.sub}</p>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-5 mb-8">
              <div className="bg-white rounded-lg p-5 ring-1 ring-[#0e393d]/10">
                <div className="text-sm font-semibold text-[#0e393d] mb-1">{t.dashboard.feature1}</div>
                <p className="text-xs text-[#5a6e6f]">0-100 score</p>
              </div>
              <div className="bg-white rounded-lg p-5 ring-1 ring-[#0e393d]/10">
                <div className="text-sm font-semibold text-[#0e393d] mb-1">{t.dashboard.feature2}</div>
                <p className="text-xs text-[#5a6e6f]">Full coverage</p>
              </div>
              <div className="bg-white rounded-lg p-5 ring-1 ring-[#0e393d]/10">
                <div className="text-sm font-semibold text-[#0e393d] mb-1">{t.dashboard.feature3}</div>
                <p className="text-xs text-[#5a6e6f]">AI-powered</p>
              </div>
              <div className="bg-white rounded-lg p-5 ring-1 ring-[#0e393d]/10">
                <div className="text-sm font-semibold text-[#0e393d] mb-1">{t.dashboard.feature4}</div>
                <p className="text-xs text-[#5a6e6f]">PhenoAge, GrimAge</p>
              </div>
            </div>

            <Link
              href="/shop"
              className="inline-block bg-[#0e393d] text-[#ceab84] font-semibold text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#1a5055]"
            >
              {lang === 'de' ? 'Jetzt testen' : lang === 'fr' ? 'Essayer maintenant' : lang === 'es' ? 'Prueba ahora' : lang === 'it' ? 'Prova ora' : 'Try now'}
            </Link>
          </div>

          {/* Right: Dashboard image */}
          <div className="relative h-80 md:h-96 rounded-2xl overflow-hidden ring-1 ring-[#0e393d]/10">
            <Image
              src={PHOTOS.dashboard}
              alt="Health Dashboard"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/20 to-transparent" />
          </div>
        </div>
      </section>

      {/* ─── 5. FOUR PILLARS ─── */}
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

      {/* ─── 6. AI FEATURES ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
        <div className="mb-12">
          <SectionTag label={t.ai.tag} />
          <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.1] tracking-tight mb-5">
            {t.ai.heading}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t.ai.headingEm}</em>
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed max-w-[560px]">{aiSub}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {t.ai.features.map((feat, i) => (
            <div key={i} className="rounded-2xl bg-white ring-1 ring-[#0e393d]/8 p-8 hover:-translate-y-1 transition-transform duration-200">
              <div className="w-14 h-14 rounded-xl bg-[#0e393d]/[.08] flex items-center justify-center text-2xl mb-5">{feat.icon}</div>
              <h3 className="font-serif text-[1.15rem] text-[#0e393d] mb-2 leading-snug">{feat.title}</h3>
              <p className="text-[0.82rem] font-light text-[#5a6e6f] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link
            href="/research"
            className="inline-block bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-8 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
          >
            {lang === 'de' ? 'Research Chat testen' : lang === 'fr' ? 'Essayer le Research Chat' : lang === 'es' ? 'Probar Research Chat' : lang === 'it' ? 'Provare Research Chat' : 'Try the Research Chat'}
          </Link>
        </div>
      </section>

      {/* ─── 7. THE PROBLEM ─── */}
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

      {/* ─── 8. OUR MISSION ─── */}
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

      {/* ─── 9. SCIENCE TEASER ─── */}
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

      {/* ─── 10. PRICING — live from DB ─── */}
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

      {/* ─── 11. BOTTOM CTA ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 pb-20 md:pb-28">
        <div className="rounded-2xl bg-gradient-to-r from-[#0e393d] to-[#1a5055] px-10 md:px-16 py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-3 leading-tight">{t.cta.title}</h2>
          <p className="text-white/60 text-sm mb-8 max-w-[480px] mx-auto">{t.cta.sub}</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Link
              href="/login"
              className="bg-[#ceab84] text-[#0e393d] font-semibold text-[13px] tracking-wide px-8 py-4 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
            >
              {t.cta.cta1}
            </Link>
            <Link
              href="/recipes"
              className="text-white border border-white/40 text-[13px] font-light px-8 py-4 rounded-full transition-all hover:bg-white/10 whitespace-nowrap"
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
