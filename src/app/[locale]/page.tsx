import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const HERO_IMG = 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80';

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const CARDS: { gradient: string; emoji: string; href: string }[] = [
  { gradient: 'from-emerald-600 to-teal-500',  emoji: '🥗', href: '/daily-dozen' },
  { gradient: 'from-amber-500 to-orange-400',  emoji: '🍲', href: '/recipes'     },
  { gradient: 'from-sky-600 to-indigo-500',    emoji: '🔬', href: '/biomarkers'  },
  { gradient: 'from-rose-500 to-pink-400',     emoji: '📊', href: '/health'      },
];

const T: Record<Lang, {
  hero: { h1: string; h1em: string; sub: string; cta1: string; cta2: string };
  split: { heading: string; headingEm: string; desc: string; cta: string };
  cards: { title: string; desc: string }[];
  steps: { tag: string; heading: string; headingEm: string; items: { n: string; title: string; desc: string }[] };
  cta: { title: string; sub: string; cta1: string; cta2: string };
}> = {
  de: {
    hero: {
      h1: 'Gesund leben.',
      h1em: 'Wissenschaftlich fundiert.',
      sub: 'Evidenzgestützte, vollwertige, pflanzenbasierte Ernährung – kombiniert mit messbaren Gesundheitsmarkern. Gesundheit für jeden erschwinglich.',
      cta1: 'Kostenlos registrieren',
      cta2: 'Daily Dozen entdecken',
    },
    split: {
      heading: 'Mehr als nur',
      headingEm: 'Informationen.',
      desc: 'Wir stellen nicht nur Wissen zur Verfügung – wir machen positive Veränderungen messbar. Tracke deine Daily Dozen, entdecke vollwertige Rezepte und verstehe deine Blutmarker mit professionellen Labortests.',
      cta: 'Jetzt tracken starten',
    },
    cards: [
      { title: 'Daily Dozen Tracker', desc: 'Tracke Dr. Gregers 12 Lebensmittelgruppen täglich. Einfache Checkboxen, echte Wirkung.' },
      { title: 'Vollwertige Rezepte',  desc: 'Pflanzenbasierte Rezepte passend zur Daily Dozen. Schnell, lecker, gesund.' },
      { title: 'Blut-Biomarker',       desc: '36 professionelle Blutmarker in 6 Gesundheitsdomänen. Ab CHF 149.' },
      { title: 'Health Dashboard',     desc: 'Dein Longevity Score: alle Werte an einem Ort. Sieh genau, wo du stehst.' },
    ],
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
    cta: {
      title: 'Starte deine Longevity-Reise heute.',
      sub: 'Kostenloses Konto. Keine Kreditkarte nötig.',
      cta1: 'Kostenloses Konto erstellen',
      cta2: 'Plattform entdecken',
    },
  },
  en: {
    hero: {
      h1: 'Live well.',
      h1em: 'Scientifically grounded.',
      sub: 'Evidence-based, whole-food, plant-based nutrition – combined with measurable health markers. Quality health, made affordable for everyone.',
      cta1: 'Sign up free',
      cta2: 'Explore Daily Dozen',
    },
    split: {
      heading: 'More than just',
      headingEm: 'information.',
      desc: "We don't just provide knowledge — we make positive change measurable. Track your Daily Dozen, explore whole-food recipes, and understand your blood markers with professional lab tests.",
      cta: 'Start tracking today',
    },
    cards: [
      { title: 'Daily Dozen Tracker', desc: "Track Dr. Greger's 12 food groups daily. Simple checkboxes, real impact." },
      { title: 'Whole-Food Recipes',  desc: 'Plant-based recipes matched to the Daily Dozen. Quick, delicious, healthy.' },
      { title: 'Blood Biomarkers',    desc: '36 professional blood markers across 6 health domains. From CHF 149.' },
      { title: 'Health Dashboard',    desc: 'Your Longevity Score: all results in one place. See exactly where you stand.' },
    ],
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
    cta: {
      title: 'Start your longevity journey today.',
      sub: 'Free account. No credit card needed.',
      cta1: 'Create free account',
      cta2: 'Explore the platform',
    },
  },
  fr: {
    hero: {
      h1: 'Vivez bien.',
      h1em: 'Fondé sur la science.',
      sub: "Nutrition végétale à base d'aliments complets et fondée sur des preuves – combinée à des marqueurs de santé mesurables. Une santé de qualité, accessible à tous.",
      cta1: "S'inscrire gratuitement",
      cta2: 'Explorer le Daily Dozen',
    },
    split: {
      heading: 'Plus que de simples',
      headingEm: 'informations.',
      desc: "Nous ne fournissons pas seulement des connaissances — nous rendons le changement positif mesurable. Suivez votre Daily Dozen, explorez des recettes complètes et comprenez vos marqueurs sanguins grâce à des tests de laboratoire professionnels.",
      cta: "Commencer le suivi aujourd'hui",
    },
    cards: [
      { title: 'Daily Dozen Tracker',      desc: 'Suivez les 12 groupes alimentaires du Dr Greger chaque jour. Cases simples, impact réel.' },
      { title: 'Recettes complètes',        desc: 'Recettes végétales adaptées au Daily Dozen. Rapides, délicieuses, saines.' },
      { title: 'Biomarqueurs sanguins',     desc: '36 marqueurs sanguins professionnels sur 6 domaines de santé. À partir de CHF 149.' },
      { title: 'Tableau de bord santé',     desc: 'Votre score de longévité : tous les résultats en un seul endroit. Voyez où vous en êtes.' },
    ],
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
    cta: {
      title: "Commencez votre parcours de longévité aujourd'hui.",
      sub: 'Compte gratuit. Aucune carte bancaire nécessaire.',
      cta1: 'Créer un compte gratuit',
      cta2: 'Explorer la plateforme',
    },
  },
  es: {
    hero: {
      h1: 'Vive bien.',
      h1em: 'Con base científica.',
      sub: 'Nutrición vegetal de alimentos integrales y basada en evidencia – combinada con marcadores de salud medibles. Salud de calidad, asequible para todos.',
      cta1: 'Registrarse gratis',
      cta2: 'Explorar el Daily Dozen',
    },
    split: {
      heading: 'Más que simple',
      headingEm: 'información.',
      desc: 'No solo proporcionamos conocimiento — hacemos que el cambio positivo sea medible. Registra tu Daily Dozen, explora recetas integrales y comprende tus marcadores sanguíneos con análisis de laboratorio profesionales.',
      cta: 'Empezar a registrar hoy',
    },
    cards: [
      { title: 'Daily Dozen Tracker',    desc: 'Registra los 12 grupos de alimentos del Dr. Greger cada día. Casillas simples, impacto real.' },
      { title: 'Recetas integrales',      desc: 'Recetas vegetales adaptadas al Daily Dozen. Rápidas, deliciosas, saludables.' },
      { title: 'Biomarcadores en sangre', desc: '36 marcadores sanguíneos profesionales en 6 dominios de salud. Desde CHF 149.' },
      { title: 'Panel de salud',          desc: 'Tu puntuación de longevidad: todos los resultados en un lugar. Ve exactamente dónde estás.' },
    ],
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
    cta: {
      title: 'Comienza tu viaje de longevidad hoy.',
      sub: 'Cuenta gratuita. Sin tarjeta de crédito.',
      cta1: 'Crear cuenta gratuita',
      cta2: 'Explorar la plataforma',
    },
  },
  it: {
    hero: {
      h1: 'Vivi bene.',
      h1em: 'Con base scientifica.',
      sub: 'Nutrizione vegetale a base di alimenti integrali e basata su evidenze – combinata con marcatori di salute misurabili. Salute di qualità, accessibile a tutti.',
      cta1: 'Registrati gratis',
      cta2: 'Esplora il Daily Dozen',
    },
    split: {
      heading: 'Più che semplici',
      headingEm: 'informazioni.',
      desc: "Non forniamo solo conoscenza — rendiamo il cambiamento positivo misurabile. Tieni traccia del tuo Daily Dozen, esplora ricette integrali e comprendi i tuoi marcatori del sangue con esami di laboratorio professionali.",
      cta: 'Inizia il monitoraggio oggi',
    },
    cards: [
      { title: 'Daily Dozen Tracker',    desc: 'Traccia i 12 gruppi alimentari del Dr. Greger ogni giorno. Caselle semplici, impatto reale.' },
      { title: 'Ricette integrali',       desc: 'Ricette vegetali abbinate al Daily Dozen. Veloci, deliziose, sane.' },
      { title: 'Biomarcatori nel sangue', desc: '36 marcatori del sangue professionali su 6 domini di salute. Da CHF 149.' },
      { title: 'Dashboard salute',        desc: 'Il tuo Longevity Score: tutti i risultati in un unico posto. Vedi esattamente dove ti trovi.' },
    ],
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
    cta: {
      title: 'Inizia oggi il tuo viaggio di longevità.',
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

export default async function HomePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">

      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="relative h-screen min-h-[620px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${HERO_IMG}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e393d]/80 via-[#0e393d]/45 to-[#0e393d]/10" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-20">
          <div className="w-full max-w-[1060px] mx-auto px-8 md:px-12">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white mb-5 max-w-[640px]">
              {t.hero.h1}<br />
              <em className="italic font-normal text-white/70">{t.hero.h1em}</em>
            </h1>
            <p className="text-[1rem] font-light text-white/70 leading-relaxed max-w-[460px] mb-10">{t.hero.sub}</p>
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

      {/* ─── SPLIT STATEMENT ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 px-8 md:px-12 py-20 md:py-28 border-b border-[#0e393d]/10">
        <div>
          <h2 className="font-serif font-normal text-4xl md:text-5xl leading-[1.12] tracking-tight text-[#0e393d]">
            {t.split.heading}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t.split.headingEm}</em>
          </h2>
        </div>
        <div className="flex flex-col justify-start pt-1">
          <p className="text-[1rem] font-light text-[#5a6e6f] leading-relaxed mb-7">{t.split.desc}</p>
          <Link
            href="/daily-dozen"
            className="self-start bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
          >
            {t.split.cta}
          </Link>
        </div>
      </div>

      {/* ─── FEATURE CARDS ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 px-8 md:px-12 pb-20 md:pb-24">
        {t.cards.map((card, idx) => {
          const meta = CARDS[idx];
          return (
            <Link
              key={meta.href}
              href={meta.href}
              className="rounded-2xl overflow-hidden border border-[#0e393d]/10 bg-white hover:-translate-y-1 transition-transform duration-200"
            >
              <div className={`h-40 bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
                <span className="text-4xl">{meta.emoji}</span>
              </div>
              <div className="p-5 pb-6">
                <h3 className="font-serif font-normal text-[1.1rem] text-[#0e393d] mb-1.5 leading-snug">{card.title}</h3>
                <p className="text-[0.8rem] font-light text-[#5a6e6f] leading-relaxed">{card.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ─── STEPS ─── */}
      <section id="how" className="bg-[#0e393d] py-20 md:py-28 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <div className="mb-14">
            <SectionTag label={t.steps.tag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-white leading-[1.1] tracking-tight">
              {t.steps.heading}<br />
              <em className="italic font-normal text-white/60">{t.steps.headingEm}</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {t.steps.items.map((step) => (
              <div key={step.n} className="bg-[#0e393d] hover:bg-[#1a5055] transition-colors duration-200 p-10">
                <div className="font-serif font-normal text-[4.5rem] text-white/8 leading-none mb-6">{step.n}</div>
                <h3 className="font-serif font-normal text-[1.5rem] text-white mb-2.5">{step.title}</h3>
                <p className="text-[0.83rem] font-light text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="max-w-[1060px] mx-auto px-8 md:px-12 py-20 md:py-28">
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
