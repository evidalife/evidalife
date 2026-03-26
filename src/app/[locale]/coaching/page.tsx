import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80';

export const metadata = { title: 'Coaching – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  badges: string[];
  approachHeading: string;
  approach: string;
  offeringsHeading: string;
  offerings: { name: string; tag: string; desc: string; included: string[] }[];
  processHeading: string;
  process: { step: string; title: string; body: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
}> = {
  de: {
    tag: 'COACHING',
    h1: 'Longevity ist kein Zufallsprodukt',
    sub: 'Daten zeigen dir das Bild. Coaching hilft dir zu handeln. Unsere Longevity-Experten verbinden deine Laborbefunde, Trainingsdaten und Lebensstilmuster zu einem kohärenten, umsetzbaren Plan.',
    badges: ['1:1-Coaching', 'Evidenzbasiert', 'Labordiagnostik', 'Personalisiert'],
    approachHeading: 'Unser Ansatz',
    approach: 'Wir arbeiten nicht mit generischen Gesundheitstipps. Jedes Coaching beginnt mit einer gründlichen Analyse deiner Biomarker, deines Lebensstils und deiner Ziele. Was du bekommst, ist ein massgefertigter Protokoll — kein Template.',
    offeringsHeading: 'Coaching-Angebote',
    offerings: [
      {
        name: 'Longevity-Basiscoaching',
        tag: 'EINSTIEG',
        desc: 'Idealer Start für alle, die ihren Gesundheitsstatus verstehen und einen klaren Aktionsplan wollen. Basiert auf einem Bluttest-Panel und einem ausführlichen Erstgespräch.',
        included: [
          'Biomarker-Panel (umfangreicher Bluttest)',
          '90-Minuten Auswertungsgespräch',
          'Persönlicher Massnahmenplan',
          'Ernährungs- und Supplement-Empfehlungen',
          '2 Follow-up Calls (30 Min)',
        ],
      },
      {
        name: 'Performance & Longevity',
        tag: 'FORTGESCHRITTEN',
        desc: 'Für Sportler, Biohacker und alle, die maximale physische und kognitive Performance anstreben. Integriert Trainingsdaten, Schlaf und Stressmarker.',
        included: [
          'Erweitertes Biomarker-Panel inkl. Hormone',
          'VO₂max-Assessment und Trainingsplan-Review',
          'HRV-basiertes Recovery-Protokoll',
          'Monatliche Coach-Calls über 3 Monate',
          'Direkt-Zugang per WhatsApp/Telegram',
        ],
      },
      {
        name: 'Executive Health Program',
        tag: 'PREMIUM',
        desc: 'Ganzjähriges Begleitprogramm für Führungskräfte. Quartalsweise Diagnostik, kontinuierliches Coaching und Priorisierung basierend auf Wirksamkeit und Zeiteinsatz.',
        included: [
          'Quartalsweise Bluttest-Panels (4×/Jahr)',
          'Monatliche 1:1-Calls mit Longevity-Arzt',
          'Epigenetischer Test (DunedinPACE + GrimAge)',
          'Persönliches Supplement-Protokoll',
          'Priority-Zugang für dringende Fragen',
        ],
      },
    ],
    processHeading: 'So läuft es ab',
    process: [
      { step: '01', title: 'Erstkonsultation', body: 'Ein kostenloses 20-Minuten-Gespräch, um deine Ziele zu verstehen und das richtige Programm zu finden.' },
      { step: '02', title: 'Diagnostik', body: 'Bluttest beim Partnerlabor. Wir analysieren 40–80 Biomarker — je nach Programmumfang.' },
      { step: '03', title: 'Auswertung', body: 'Ausführliches Gespräch mit deinem Coach. Interpretation der Werte, Identifikation deiner grössten Hebel.' },
      { step: '04', title: 'Aktionsplan', body: 'Du bekommst einen schriftlichen, priorisierten Massnahmenplan — konkret, umsetzbar, individuell.' },
      { step: '05', title: 'Follow-up & Tracking', body: 'Regelmässige Calls und Kontrolltests. Wir messen, ob deine Interventionen wirken — und passen an.' },
    ],
    ctaHeading: 'Bereit, systematisch gesünder zu werden?',
    ctaBody: 'Buche eine kostenlose Erstberatung. Wir schauen gemeinsam, was zu dir passt.',
    ctaBtn: 'Erstberatung vereinbaren',
  },
  en: {
    tag: 'COACHING',
    h1: 'Longevity is not an accident',
    sub: 'Data shows you the picture. Coaching helps you act on it. Our longevity experts connect your lab results, training data, and lifestyle patterns into a coherent, actionable plan.',
    badges: ['1:1 coaching', 'Evidence-based', 'Lab diagnostics', 'Personalised'],
    approachHeading: 'Our approach',
    approach: 'We do not work with generic health tips. Every coaching engagement starts with a thorough analysis of your biomarkers, lifestyle, and goals. What you get is a bespoke protocol — not a template.',
    offeringsHeading: 'Coaching programmes',
    offerings: [
      {
        name: 'Longevity Starter Coaching',
        tag: 'ENTRY',
        desc: 'The ideal start for those who want to understand their health status and get a clear action plan. Based on a blood test panel and a comprehensive initial consultation.',
        included: [
          'Biomarker panel (comprehensive blood test)',
          '90-minute evaluation consultation',
          'Personal action plan',
          'Nutrition and supplement recommendations',
          '2 follow-up calls (30 min)',
        ],
      },
      {
        name: 'Performance & Longevity',
        tag: 'ADVANCED',
        desc: 'For athletes, biohackers, and anyone pursuing maximal physical and cognitive performance. Integrates training data, sleep, and stress markers.',
        included: [
          'Extended biomarker panel including hormones',
          'VO₂max assessment and training plan review',
          'HRV-based recovery protocol',
          'Monthly coach calls for 3 months',
          'Direct access via WhatsApp/Telegram',
        ],
      },
      {
        name: 'Executive Health Programme',
        tag: 'PREMIUM',
        desc: 'Year-round accompaniment for executives. Quarterly diagnostics, continuous coaching, and prioritisation based on effectiveness and time investment.',
        included: [
          'Quarterly blood test panels (4×/year)',
          'Monthly 1:1 calls with longevity physician',
          'Epigenetic test (DunedinPACE + GrimAge)',
          'Personal supplement protocol',
          'Priority access for urgent questions',
        ],
      },
    ],
    processHeading: 'How it works',
    process: [
      { step: '01', title: 'Initial consultation', body: 'A free 20-minute call to understand your goals and find the right programme.' },
      { step: '02', title: 'Diagnostics', body: 'Blood test at a partner lab. We analyse 40–80 biomarkers — depending on programme scope.' },
      { step: '03', title: 'Evaluation', body: 'In-depth conversation with your coach. Interpretation of values, identification of your biggest levers.' },
      { step: '04', title: 'Action plan', body: 'You receive a written, prioritised action plan — concrete, actionable, individual.' },
      { step: '05', title: 'Follow-up & tracking', body: 'Regular calls and check tests. We measure whether your interventions work — and adjust accordingly.' },
    ],
    ctaHeading: 'Ready to get systematically healthier?',
    ctaBody: 'Book a free initial consultation. We will look together at what fits you.',
    ctaBtn: 'Book initial consultation',
  },
  fr: {
    tag: 'COACHING',
    h1: 'La longévité n\'est pas un accident',
    sub: 'Les données vous montrent le tableau. Le coaching vous aide à agir. Nos experts en longévité relient vos résultats de laboratoire, données d\'entraînement et habitudes de vie en un plan cohérent et actionnable.',
    badges: ['Coaching 1:1', 'Fondé sur des preuves', 'Diagnostics lab', 'Personnalisé'],
    approachHeading: 'Notre approche',
    approach: 'Nous ne travaillons pas avec des conseils de santé génériques. Chaque engagement de coaching commence par une analyse approfondie de vos biomarqueurs, de votre style de vie et de vos objectifs.',
    offeringsHeading: 'Programmes de coaching',
    offerings: [
      {
        name: 'Coaching de démarrage longévité',
        tag: 'ENTRÉE',
        desc: 'Le début idéal pour comprendre votre état de santé et obtenir un plan d\'action clair.',
        included: [
          'Panel de biomarqueurs (analyse sanguine complète)',
          'Consultation d\'évaluation de 90 minutes',
          'Plan d\'action personnel',
          'Recommandations nutrition et suppléments',
          '2 appels de suivi (30 min)',
        ],
      },
      {
        name: 'Performance & Longévité',
        tag: 'AVANCÉ',
        desc: 'Pour les athlètes, biohackers et ceux qui cherchent une performance maximale.',
        included: [
          'Panel de biomarqueurs étendu incluant hormones',
          'Évaluation VO₂max et revue du plan d\'entraînement',
          'Protocole de récupération basé sur la VFC',
          'Appels mensuels avec le coach sur 3 mois',
          'Accès direct via WhatsApp/Telegram',
        ],
      },
      {
        name: 'Programme Executive Santé',
        tag: 'PREMIUM',
        desc: 'Accompagnement annuel pour les dirigeants. Diagnostics trimestriels, coaching continu.',
        included: [
          'Panels sanguins trimestriels (4×/an)',
          'Appels 1:1 mensuels avec médecin longévité',
          'Test épigénétique (DunedinPACE + GrimAge)',
          'Protocole de suppléments personnel',
          'Accès prioritaire pour questions urgentes',
        ],
      },
    ],
    processHeading: 'Comment ça fonctionne',
    process: [
      { step: '01', title: 'Consultation initiale', body: 'Un appel gratuit de 20 minutes pour comprendre vos objectifs et trouver le bon programme.' },
      { step: '02', title: 'Diagnostics', body: 'Analyse sanguine en laboratoire partenaire. Nous analysons 40–80 biomarqueurs.' },
      { step: '03', title: 'Évaluation', body: 'Conversation approfondie avec votre coach. Interprétation des valeurs et identification de vos principaux leviers.' },
      { step: '04', title: 'Plan d\'action', body: 'Vous recevez un plan d\'action écrit, priorisé — concret, actionnable, individuel.' },
      { step: '05', title: 'Suivi & tracking', body: 'Appels réguliers et tests de contrôle. Nous mesurons si vos interventions fonctionnent.' },
    ],
    ctaHeading: 'Prêt à devenir systématiquement plus sain?',
    ctaBody: 'Réservez une consultation initiale gratuite. Nous verrons ensemble ce qui vous convient.',
    ctaBtn: 'Réserver une consultation',
  },
  es: {
    tag: 'COACHING',
    h1: 'La longevidad no es un accidente',
    sub: 'Los datos te muestran el panorama. El coaching te ayuda a actuar. Nuestros expertos en longevidad conectan tus resultados de laboratorio, datos de entrenamiento y patrones de estilo de vida en un plan coherente y accionable.',
    badges: ['Coaching 1:1', 'Basado en evidencia', 'Diagnósticos lab', 'Personalizado'],
    approachHeading: 'Nuestro enfoque',
    approach: 'No trabajamos con consejos de salud genéricos. Cada compromiso de coaching comienza con un análisis exhaustivo de tus biomarcadores, estilo de vida y objetivos.',
    offeringsHeading: 'Programas de coaching',
    offerings: [
      {
        name: 'Coaching inicial de longevidad',
        tag: 'INICIO',
        desc: 'El inicio ideal para entender tu estado de salud y obtener un plan de acción claro.',
        included: [
          'Panel de biomarcadores (análisis de sangre completo)',
          'Consulta de evaluación de 90 minutos',
          'Plan de acción personal',
          'Recomendaciones de nutrición y suplementos',
          '2 llamadas de seguimiento (30 min)',
        ],
      },
      {
        name: 'Rendimiento & Longevidad',
        tag: 'AVANZADO',
        desc: 'Para atletas, biohackers y quienes buscan máximo rendimiento físico y cognitivo.',
        included: [
          'Panel de biomarcadores extendido incluyendo hormonas',
          'Evaluación VO₂máx y revisión del plan de entrenamiento',
          'Protocolo de recuperación basado en VFC',
          'Llamadas mensuales durante 3 meses',
          'Acceso directo por WhatsApp/Telegram',
        ],
      },
      {
        name: 'Programa Ejecutivo de Salud',
        tag: 'PREMIUM',
        desc: 'Acompañamiento anual para ejecutivos. Diagnósticos trimestrales, coaching continuo.',
        included: [
          'Paneles de sangre trimestrales (4×/año)',
          'Llamadas 1:1 mensuales con médico de longevidad',
          'Test epigenético (DunedinPACE + GrimAge)',
          'Protocolo de suplementos personal',
          'Acceso prioritario para preguntas urgentes',
        ],
      },
    ],
    processHeading: 'Cómo funciona',
    process: [
      { step: '01', title: 'Consulta inicial', body: 'Una llamada gratuita de 20 minutos para entender tus objetivos y encontrar el programa adecuado.' },
      { step: '02', title: 'Diagnósticos', body: 'Análisis de sangre en laboratorio asociado. Analizamos 40–80 biomarcadores.' },
      { step: '03', title: 'Evaluación', body: 'Conversación profunda con tu coach. Interpretación de valores e identificación de tus mayores palancas.' },
      { step: '04', title: 'Plan de acción', body: 'Recibes un plan de acción escrito, priorizado — concreto, accionable, individual.' },
      { step: '05', title: 'Seguimiento', body: 'Llamadas regulares y pruebas de control. Medimos si tus intervenciones funcionan.' },
    ],
    ctaHeading: '¿Listo para ser sistemáticamente más sano?',
    ctaBody: 'Reserva una consulta inicial gratuita. Veremos juntos qué te conviene.',
    ctaBtn: 'Reservar consulta inicial',
  },
  it: {
    tag: 'COACHING',
    h1: 'La longevità non è un caso',
    sub: 'I dati ti mostrano il quadro. Il coaching ti aiuta ad agire. I nostri esperti di longevità collegano i tuoi risultati di laboratorio, dati di allenamento e pattern di stile di vita in un piano coerente e attuabile.',
    badges: ['Coaching 1:1', 'Basato su evidenze', 'Diagnostica lab', 'Personalizzato'],
    approachHeading: 'Il nostro approccio',
    approach: 'Non lavoriamo con consigli di salute generici. Ogni impegno di coaching inizia con un\'analisi approfondita dei tuoi biomarcatori, stile di vita e obiettivi.',
    offeringsHeading: 'Programmi di coaching',
    offerings: [
      {
        name: 'Coaching base longevità',
        tag: 'INGRESSO',
        desc: 'Il punto di partenza ideale per capire il tuo stato di salute e ottenere un piano d\'azione chiaro.',
        included: [
          'Panel di biomarcatori (analisi del sangue completa)',
          'Consulenza di valutazione da 90 minuti',
          'Piano d\'azione personale',
          'Raccomandazioni su nutrizione e integratori',
          '2 follow-up call (30 min)',
        ],
      },
      {
        name: 'Performance & Longevità',
        tag: 'AVANZATO',
        desc: 'Per atleti, biohacker e chi cerca massima performance fisica e cognitiva.',
        included: [
          'Panel di biomarcatori esteso inclusi ormoni',
          'Valutazione VO₂max e revisione del piano di allenamento',
          'Protocollo di recupero basato su HRV',
          'Call mensili con il coach per 3 mesi',
          'Accesso diretto via WhatsApp/Telegram',
        ],
      },
      {
        name: 'Executive Health Programme',
        tag: 'PREMIUM',
        desc: 'Accompagnamento annuale per dirigenti. Diagnostica trimestrale, coaching continuo.',
        included: [
          'Panel ematici trimestrali (4×/anno)',
          'Call 1:1 mensili con medico specialista in longevità',
          'Test epigenetico (DunedinPACE + GrimAge)',
          'Protocollo di integratori personalizzato',
          'Accesso prioritario per domande urgenti',
        ],
      },
    ],
    processHeading: 'Come funziona',
    process: [
      { step: '01', title: 'Consulenza iniziale', body: 'Una chiamata gratuita di 20 minuti per capire i tuoi obiettivi e trovare il programma giusto.' },
      { step: '02', title: 'Diagnostica', body: 'Analisi del sangue presso laboratorio partner. Analizziamo 40–80 biomarcatori.' },
      { step: '03', title: 'Valutazione', body: 'Conversazione approfondita con il tuo coach. Interpretazione dei valori e identificazione delle tue leve principali.' },
      { step: '04', title: 'Piano d\'azione', body: 'Ricevi un piano d\'azione scritto, prioritizzato — concreto, attuabile, individuale.' },
      { step: '05', title: 'Follow-up & tracking', body: 'Call regolari e test di controllo. Misuriamo se le tue interventi funzionano.' },
    ],
    ctaHeading: 'Pronto a diventare sistematicamente più sano?',
    ctaBody: 'Prenota una consulenza iniziale gratuita. Vedremo insieme cosa fa per te.',
    ctaBtn: 'Prenota consulenza iniziale',
  },
};

export default async function CoachingPage() {
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
          <p className="text-white/80 text-lg leading-relaxed max-w-xl mb-6">{t.sub}</p>
          <div className="flex flex-wrap gap-2">
            {t.badges.map((b) => (
              <span key={b} className="bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">{b}</span>
            ))}
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* Approach */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.approachHeading}</p>
          <p className="text-[#1c2a2b]/75 text-base leading-relaxed">{t.approach}</p>
        </section>

        {/* Offerings */}
        <section className="bg-white border-y border-[#1c2a2b]/08 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.offeringsHeading}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {t.offerings.map((o) => (
                <div key={o.name} className="bg-[#fafaf8] rounded-2xl p-6 flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ceab84] mb-2">{o.tag}</p>
                  <h3 className="font-serif text-xl text-[#0e393d] mb-3">{o.name}</h3>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed mb-4">{o.desc}</p>
                  <ul className="mt-auto space-y-2">
                    {o.included.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-[#1c2a2b]/70">
                        <span className="text-emerald-600 mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Process */}
        <section className="max-w-4xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.processHeading}</p>
          <div className="space-y-6">
            {t.process.map((p) => (
              <div key={p.step} className="flex gap-6 items-start">
                <span className="font-serif text-3xl text-[#ceab84]/50 w-12 shrink-0">{p.step}</span>
                <div>
                  <h3 className="font-medium text-[#0e393d] mb-1">{p.title}</h3>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0e393d] py-20">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="font-serif text-4xl text-white mb-4">{t.ctaHeading}</h2>
            <p className="text-white/70 text-base leading-relaxed mb-8">{t.ctaBody}</p>
            <Link
              href="/contact"
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
