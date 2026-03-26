import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=80';

export const metadata = { title: 'Kitchen – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

interface KitchenCard { tag: string; title: string; desc: string; href: string; emoji: string }

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  cardsHeading: string;
  cards: KitchenCard[];
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
}> = {
  de: {
    tag: 'KÜCHE',
    h1: 'Gut essen, länger leben',
    sub: 'Ernährung ist der mächtigste epigenetische Schalter. Was du täglich isst, verändert die Expression von über 500 Genen — und damit dein biologisches Alter, deine Entzündungslast und dein Energie-Level.',
    cardsHeading: 'Deine Küche',
    cards: [
      { tag: 'REZEPTE', title: 'Rezepte', desc: 'Evidenzbasierte, pflanzenbetonte Gerichte nach dem Daily-Dozen-Prinzip. Von schnellen Wochentags-Bowls bis zu festlichen Hauptgerichten.', href: '/recipes', emoji: '🍽️' },
      { tag: 'BLOG', title: 'Blog', desc: 'Tiefgehende Artikel zu Ernährungswissenschaft, Longevity-Forschung und praktischer Anwendung in deinem Alltag.', href: '/blog', emoji: '📖' },
      { tag: 'KURSE', title: 'Kurse', desc: 'Strukturierte Lernpfade: von der pflanzlichen Grundernährung bis zur Longevity-Ernährungsstrategie — mit Schritt-für-Schritt-Anleitungen.', href: '/courses', emoji: '🎓' },
      { tag: 'DAILY DOZEN', title: 'Daily Dozen', desc: 'Dr. Michael Gregers Daily Dozen: 12 Lebensmittelgruppen, die täglich für optimale Gesundheit gegessen werden sollten. Tracke deine täglichen Servings.', href: '/daily-dozen', emoji: '✅' },
      { tag: 'SO STARTEST DU', title: 'So startest du', desc: 'Dein Einstiegsguide in die Evida-Life-Ernährungsphilosophie. Practical steps, keine Perfektion erforderlich.', href: '/how-to-start', emoji: '🚀' },
      { tag: 'EINKAUFSLISTE', title: 'Einkaufsliste', desc: 'Plane deinen pflanzlichen Wocheneinkauf. Füge Rezeptzutaten automatisch hinzu oder erstelle deine eigene Liste.', href: '/shopping-list', emoji: '🛒' },
    ],
    ctaHeading: 'Starte mit dem Daily Dozen',
    ctaBody: 'Die tägliche Checkliste für optimale Ernährung — evidenzbasiert, einfach umsetzbar.',
    ctaBtn: 'Daily Dozen entdecken',
  },
  en: {
    tag: 'KITCHEN',
    h1: 'Eat well, live longer',
    sub: 'Nutrition is the most powerful epigenetic switch. What you eat every day changes the expression of over 500 genes — and with it your biological age, your inflammatory load, and your energy level.',
    cardsHeading: 'Your kitchen',
    cards: [
      { tag: 'RECIPES', title: 'Recipes', desc: 'Evidence-based, plant-forward dishes following the Daily Dozen principle. From quick weekday bowls to festive main courses.', href: '/recipes', emoji: '🍽️' },
      { tag: 'BLOG', title: 'Blog', desc: 'In-depth articles on nutritional science, longevity research, and practical application in your daily life.', href: '/blog', emoji: '📖' },
      { tag: 'COURSES', title: 'Courses', desc: 'Structured learning paths: from plant-based fundamentals to longevity nutrition strategy — with step-by-step guidance.', href: '/courses', emoji: '🎓' },
      { tag: 'DAILY DOZEN', title: 'Daily Dozen', desc: 'Dr. Michael Greger\'s Daily Dozen: 12 food groups that should be eaten every day for optimal health. Track your daily servings.', href: '/daily-dozen', emoji: '✅' },
      { tag: 'HOW TO START', title: 'How to start', desc: 'Your introductory guide to the Evida Life nutrition philosophy. Practical steps, no perfection required.', href: '/how-to-start', emoji: '🚀' },
      { tag: 'SHOPPING LIST', title: 'Shopping List', desc: 'Plan your plant-based weekly shop. Automatically add recipe ingredients or build your own custom list.', href: '/shopping-list', emoji: '🛒' },
    ],
    ctaHeading: 'Start with the Daily Dozen',
    ctaBody: 'The daily checklist for optimal nutrition — evidence-based, easy to implement.',
    ctaBtn: 'Discover Daily Dozen',
  },
  fr: {
    tag: 'CUISINE',
    h1: 'Bien manger, vivre plus longtemps',
    sub: 'L\'alimentation est l\'interrupteur épigénétique le plus puissant. Ce que vous mangez chaque jour modifie l\'expression de plus de 500 gènes — et avec elle votre âge biologique, votre charge inflammatoire et votre niveau d\'énergie.',
    cardsHeading: 'Votre cuisine',
    cards: [
      { tag: 'RECETTES', title: 'Recettes', desc: 'Plats fondés sur des preuves, à dominante végétale, selon le principe du Daily Dozen.', href: '/recipes', emoji: '🍽️' },
      { tag: 'BLOG', title: 'Blog', desc: 'Articles approfondis sur la science nutritionnelle et la recherche en longévité.', href: '/blog', emoji: '📖' },
      { tag: 'COURS', title: 'Cours', desc: 'Parcours d\'apprentissage structurés de l\'alimentation végétale à la stratégie nutritionnelle pour la longévité.', href: '/courses', emoji: '🎓' },
      { tag: 'DAILY DOZEN', title: 'Daily Dozen', desc: 'Les 12 groupes alimentaires du Dr Michael Greger à consommer chaque jour pour une santé optimale.', href: '/daily-dozen', emoji: '✅' },
      { tag: 'COMMENT COMMENCER', title: 'Comment commencer', desc: 'Votre guide d\'introduction à la philosophie nutritionnelle d\'Evida Life.', href: '/how-to-start', emoji: '🚀' },
      { tag: 'LISTE DE COURSES', title: 'Liste de courses', desc: 'Planifiez vos achats végétaux hebdomadaires. Ajoutez automatiquement les ingrédients des recettes.', href: '/shopping-list', emoji: '🛒' },
    ],
    ctaHeading: 'Commencez avec le Daily Dozen',
    ctaBody: 'La liste de contrôle quotidienne pour une nutrition optimale — fondée sur des preuves, facile à mettre en œuvre.',
    ctaBtn: 'Découvrir le Daily Dozen',
  },
  es: {
    tag: 'COCINA',
    h1: 'Come bien, vive más',
    sub: 'La nutrición es el interruptor epigenético más poderoso. Lo que comes cada día cambia la expresión de más de 500 genes — y con ello tu edad biológica, tu carga inflamatoria y tu nivel de energía.',
    cardsHeading: 'Tu cocina',
    cards: [
      { tag: 'RECETAS', title: 'Recetas', desc: 'Platos basados en evidencia, con predominio vegetal, siguiendo el principio del Daily Dozen.', href: '/recipes', emoji: '🍽️' },
      { tag: 'BLOG', title: 'Blog', desc: 'Artículos en profundidad sobre ciencia nutricional e investigación sobre longevidad.', href: '/blog', emoji: '📖' },
      { tag: 'CURSOS', title: 'Cursos', desc: 'Rutas de aprendizaje estructuradas desde la alimentación plant-based hasta la estrategia nutricional de longevidad.', href: '/courses', emoji: '🎓' },
      { tag: 'DAILY DOZEN', title: 'Daily Dozen', desc: 'Los 12 grupos de alimentos del Dr. Michael Greger que deben consumirse cada día para una salud óptima.', href: '/daily-dozen', emoji: '✅' },
      { tag: 'CÓMO EMPEZAR', title: 'Cómo empezar', desc: 'Tu guía introductoria a la filosofía nutricional de Evida Life.', href: '/how-to-start', emoji: '🚀' },
      { tag: 'LISTA DE COMPRAS', title: 'Lista de compras', desc: 'Planifica tu compra semanal plant-based. Agrega automáticamente ingredientes de recetas.', href: '/shopping-list', emoji: '🛒' },
    ],
    ctaHeading: 'Empieza con el Daily Dozen',
    ctaBody: 'La lista de verificación diaria para una nutrición óptima — basada en evidencia, fácil de implementar.',
    ctaBtn: 'Descubrir Daily Dozen',
  },
  it: {
    tag: 'CUCINA',
    h1: 'Mangia bene, vivi più a lungo',
    sub: 'La nutrizione è l\'interruttore epigenetico più potente. Ciò che mangi ogni giorno cambia l\'espressione di oltre 500 geni — e con essa la tua età biologica, il tuo carico infiammatorio e il tuo livello di energia.',
    cardsHeading: 'La tua cucina',
    cards: [
      { tag: 'RICETTE', title: 'Ricette', desc: 'Piatti basati su evidenze, a prevalenza vegetale, seguendo il principio del Daily Dozen.', href: '/recipes', emoji: '🍽️' },
      { tag: 'BLOG', title: 'Blog', desc: 'Articoli approfonditi sulla scienza nutrizionale e la ricerca sulla longevità.', href: '/blog', emoji: '📖' },
      { tag: 'CORSI', title: 'Corsi', desc: 'Percorsi di apprendimento strutturati dall\'alimentazione plant-based alla strategia nutrizionale per la longevità.', href: '/courses', emoji: '🎓' },
      { tag: 'DAILY DOZEN', title: 'Daily Dozen', desc: 'I 12 gruppi alimentari del Dr. Michael Greger da consumare ogni giorno per una salute ottimale.', href: '/daily-dozen', emoji: '✅' },
      { tag: 'COME INIZIARE', title: 'Come iniziare', desc: 'La tua guida introduttiva alla filosofia nutrizionale di Evida Life.', href: '/how-to-start', emoji: '🚀' },
      { tag: 'LISTA DELLA SPESA', title: 'Lista della spesa', desc: 'Pianifica la tua spesa settimanale plant-based. Aggiungi automaticamente gli ingredienti delle ricette.', href: '/shopping-list', emoji: '🛒' },
    ],
    ctaHeading: 'Inizia con il Daily Dozen',
    ctaBody: 'La checklist quotidiana per una nutrizione ottimale — basata su evidenze, facile da implementare.',
    ctaBtn: 'Scopri il Daily Dozen',
  },
};

export default async function KitchenPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative h-[72vh] min-h-[480px] flex items-end">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16 w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.tag}</p>
          <h1 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-4">{t.h1}</h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl">{t.sub}</p>
        </div>
      </section>

      <main className="flex-1">
        {/* Cards grid */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.cardsHeading}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {t.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-white border border-[#1c2a2b]/10 rounded-2xl p-6 hover:border-[#0e393d]/40 hover:shadow-md transition-all flex flex-col"
              >
                <div className="text-3xl mb-4">{card.emoji}</div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ceab84] mb-1">{card.tag}</p>
                <h2 className="font-serif text-xl text-[#0e393d] mb-2 group-hover:text-[#1a5055] transition-colors">{card.title}</h2>
                <p className="text-[#1c2a2b]/60 text-sm leading-relaxed flex-1">{card.desc}</p>
                <span className="inline-block mt-4 text-sm font-medium text-[#0e393d] group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0e393d] py-20">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="font-serif text-4xl text-white mb-4">{t.ctaHeading}</h2>
            <p className="text-white/70 text-base leading-relaxed mb-8">{t.ctaBody}</p>
            <Link
              href="/daily-dozen"
              className="inline-block bg-[#ceab84] text-[#0e393d] text-sm font-semibold px-8 py-4 rounded-full hover:bg-[#d4b98e] transition-colors"
            >
              {t.ctaBtn}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
