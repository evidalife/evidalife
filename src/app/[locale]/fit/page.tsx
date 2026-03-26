import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1571019613576-2b22c76fd955?w=1200&q=80';

export const metadata = { title: 'Fit – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

interface SubPage { tag: string; title: string; desc: string; href: string; emoji: string }

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  sectionsHeading: string;
  sections: SubPage[];
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
}> = {
  de: {
    tag: 'FIT',
    h1: 'Bewege dich für dein längeres Leben',
    sub: 'Longevity entsteht nicht im Fitnessstudio allein. Schlaf, Bewegung, Stressregulation und professionelles Coaching sind vier gleichwertige Pfeiler deiner biologischen Vitalität.',
    sectionsHeading: 'Die vier Bereiche',
    sections: [
      { tag: 'SCHLAF', title: 'Schlaf', desc: 'Circadianer Rhythmus, Schlafstadien und die Biomarker, die erholsamen Schlaf sichtbar machen. Schlafoptimierung ist der leistungsfähigste Hebel für Regeneration und kognitive Funktion.', href: '/sleep', emoji: '🌙' },
      { tag: 'BEWEGUNG', title: 'Bewegung', desc: 'Zone-2-Training, VO₂max und Krafttraining — die drei Säulen des longevity-orientierten Trainings. Messbar, skalierbar und evidenzbasiert.', href: '/exercise', emoji: '🏃' },
      { tag: 'STRESS & RECOVERY', title: 'Stress & Recovery', desc: 'HRV-Tracking, Cortisol-Regulation und Erholungsprotokolle. Chronischer Stress beschleunigt die biologische Alterung — gezielte Recovery verlangsamt sie.', href: '/stress-recovery', emoji: '🧘' },
      { tag: 'COACHING', title: 'Coaching', desc: 'Persönliches 1:1-Coaching mit zertifizierten Longevity-Experten. Von der Labordiagnostik bis zum Trainings- und Ernährungsplan — individuell auf dich abgestimmt.', href: '/coaching', emoji: '🎯' },
    ],
    ctaHeading: 'Starte mit deinen Daten',
    ctaBody: 'Im Health Engine Dashboard verknüpfst du Blutwerte, Bewegungsdaten und Schlaf — und siehst, wo der grösste Hebel liegt.',
    ctaBtn: 'Health Engine entdecken',
  },
  en: {
    tag: 'FIT',
    h1: 'Move for a longer life',
    sub: 'Longevity is not built in the gym alone. Sleep, exercise, stress regulation, and professional coaching are four equal pillars of biological vitality.',
    sectionsHeading: 'The four pillars',
    sections: [
      { tag: 'SLEEP', title: 'Sleep', desc: 'Circadian rhythm, sleep stages, and the biomarkers that make restorative sleep visible. Sleep optimisation is the most powerful lever for recovery and cognitive function.', href: '/sleep', emoji: '🌙' },
      { tag: 'EXERCISE', title: 'Exercise', desc: 'Zone 2 training, VO₂max, and strength work — the three pillars of longevity-oriented training. Measurable, scalable, and evidence-based.', href: '/exercise', emoji: '🏃' },
      { tag: 'STRESS & RECOVERY', title: 'Stress & Recovery', desc: 'HRV tracking, cortisol regulation, and recovery protocols. Chronic stress accelerates biological ageing — targeted recovery slows it down.', href: '/stress-recovery', emoji: '🧘' },
      { tag: 'COACHING', title: 'Coaching', desc: 'Personal 1:1 coaching with certified longevity experts. From lab diagnostics to training and nutrition plans — tailored specifically to you.', href: '/coaching', emoji: '🎯' },
    ],
    ctaHeading: 'Start with your data',
    ctaBody: 'In the Health Engine Dashboard you connect blood values, movement data, and sleep — and see where the biggest lever lies.',
    ctaBtn: 'Discover Health Engine',
  },
  fr: {
    tag: 'FIT',
    h1: 'Bougez pour une vie plus longue',
    sub: 'La longévité ne se construit pas seulement en salle de sport. Le sommeil, l\'exercice, la régulation du stress et le coaching professionnel sont quatre piliers égaux de la vitalité biologique.',
    sectionsHeading: 'Les quatre piliers',
    sections: [
      { tag: 'SOMMEIL', title: 'Sommeil', desc: 'Rythme circadien, stades du sommeil et biomarqueurs qui rendent le sommeil réparateur visible. L\'optimisation du sommeil est le levier le plus puissant pour la récupération et la fonction cognitive.', href: '/sleep', emoji: '🌙' },
      { tag: 'EXERCICE', title: 'Exercice', desc: 'Entraînement Zone 2, VO₂max et travail de force — les trois piliers de l\'entraînement orienté longévité. Mesurable, évolutif et fondé sur des preuves.', href: '/exercise', emoji: '🏃' },
      { tag: 'STRESS & RÉCUPÉRATION', title: 'Stress & Récupération', desc: 'Suivi de la VFC, régulation du cortisol et protocoles de récupération. Le stress chronique accélère le vieillissement biologique — la récupération ciblée le ralentit.', href: '/stress-recovery', emoji: '🧘' },
      { tag: 'COACHING', title: 'Coaching', desc: 'Coaching personnel 1:1 avec des experts en longévité certifiés. Des diagnostics de laboratoire aux plans d\'entraînement et de nutrition — personnalisés spécifiquement pour vous.', href: '/coaching', emoji: '🎯' },
    ],
    ctaHeading: 'Commencez avec vos données',
    ctaBody: 'Dans le tableau de bord Health Engine, vous connectez valeurs sanguines, données de mouvement et sommeil — et voyez où se trouve le plus grand levier.',
    ctaBtn: 'Découvrir Health Engine',
  },
  es: {
    tag: 'FIT',
    h1: 'Muévete para una vida más larga',
    sub: 'La longevidad no se construye solo en el gimnasio. El sueño, el ejercicio, la regulación del estrés y el coaching profesional son cuatro pilares iguales de la vitalidad biológica.',
    sectionsHeading: 'Los cuatro pilares',
    sections: [
      { tag: 'SUEÑO', title: 'Sueño', desc: 'Ritmo circadiano, fases del sueño y los biomarcadores que hacen visible el sueño reparador. La optimización del sueño es la palanca más poderosa para la recuperación y la función cognitiva.', href: '/sleep', emoji: '🌙' },
      { tag: 'EJERCICIO', title: 'Ejercicio', desc: 'Entrenamiento Zona 2, VO₂máx y trabajo de fuerza — los tres pilares del entrenamiento orientado a la longevidad. Medible, escalable y basado en evidencia.', href: '/exercise', emoji: '🏃' },
      { tag: 'ESTRÉS & RECUPERACIÓN', title: 'Estrés & Recuperación', desc: 'Seguimiento de VFC, regulación del cortisol y protocolos de recuperación. El estrés crónico acelera el envejecimiento biológico — la recuperación dirigida lo ralentiza.', href: '/stress-recovery', emoji: '🧘' },
      { tag: 'COACHING', title: 'Coaching', desc: 'Coaching personal 1:1 con expertos en longevidad certificados. Desde el diagnóstico de laboratorio hasta los planes de entrenamiento y nutrición — adaptados específicamente a ti.', href: '/coaching', emoji: '🎯' },
    ],
    ctaHeading: 'Empieza con tus datos',
    ctaBody: 'En el panel de Health Engine conectas valores sanguíneos, datos de movimiento y sueño — y ves dónde está la mayor palanca.',
    ctaBtn: 'Descubrir Health Engine',
  },
  it: {
    tag: 'FIT',
    h1: 'Muoviti per una vita più lunga',
    sub: 'La longevità non si costruisce solo in palestra. Sonno, esercizio, regolazione dello stress e coaching professionale sono quattro pilastri uguali della vitalità biologica.',
    sectionsHeading: 'I quattro pilastri',
    sections: [
      { tag: 'SONNO', title: 'Sonno', desc: 'Ritmo circadiano, fasi del sonno e i biomarcatori che rendono visibile il sonno ristoratore. L\'ottimizzazione del sonno è la leva più potente per il recupero e la funzione cognitiva.', href: '/sleep', emoji: '🌙' },
      { tag: 'ESERCIZIO', title: 'Esercizio', desc: 'Allenamento Zona 2, VO₂max e lavoro di forza — i tre pilastri dell\'allenamento orientato alla longevità. Misurabile, scalabile e basato su evidenze.', href: '/exercise', emoji: '🏃' },
      { tag: 'STRESS & RECUPERO', title: 'Stress & Recupero', desc: 'Monitoraggio HRV, regolazione del cortisolo e protocolli di recupero. Lo stress cronico accelera l\'invecchiamento biologico — il recupero mirato lo rallenta.', href: '/stress-recovery', emoji: '🧘' },
      { tag: 'COACHING', title: 'Coaching', desc: 'Coaching personale 1:1 con esperti di longevità certificati. Dalla diagnostica di laboratorio ai piani di allenamento e nutrizione — adattati specificamente a te.', href: '/coaching', emoji: '🎯' },
    ],
    ctaHeading: 'Inizia con i tuoi dati',
    ctaBody: 'Nel pannello Health Engine colleghi valori del sangue, dati di movimento e sonno — e vedi dove si trova la leva più grande.',
    ctaBtn: 'Scopri Health Engine',
  },
};

export default async function FitPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative h-[72vh] min-h-[480px] flex items-end">
        <img
          src={HERO_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16 w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.tag}</p>
          <h1 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-4">{t.h1}</h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl">{t.sub}</p>
        </div>
      </section>

      <main className="flex-1">
        {/* Four pillars */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.sectionsHeading}</p>
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {t.sections.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="group bg-white border border-[#1c2a2b]/10 rounded-2xl p-8 hover:border-[#0e393d]/40 hover:shadow-md transition-all"
              >
                <div className="text-3xl mb-4">{s.emoji}</div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ceab84] mb-2">{s.tag}</p>
                <h2 className="font-serif text-2xl text-[#0e393d] mb-3 group-hover:text-[#1a5055] transition-colors">{s.title}</h2>
                <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{s.desc}</p>
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
              href="/health-engine"
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
