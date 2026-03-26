import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&q=80';

export const metadata = { title: 'Sleep – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  badges: string[];
  whyHeading: string;
  why: string;
  stagesHeading: string;
  stages: { name: string; pct: string; desc: string }[];
  biomarkersHeading: string;
  biomarkers: { name: string; role: string; optimal: string }[];
  tipsHeading: string;
  tips: { title: string; body: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
}> = {
  de: {
    tag: 'SCHLAF',
    h1: 'Schlaf ist deine mächtigste Intervention',
    sub: 'Wer regelmässig weniger als 7 Stunden schläft, hat ein doppelt so hohes Risiko für Herzerkrankungen, Demenz und metabolische Dysfunktion. Kein Supplement, kein Training kann schlechten Schlaf kompensieren.',
    badges: ['7–9 Stunden', 'Circadianer Rhythmus', 'Tiefer Schlaf & REM'],
    whyHeading: 'Warum Schlaf für Longevity entscheidend ist',
    why: 'Im Schlaf läuft das glymphatische System des Gehirns auf Hochtouren und entfernt neurotoxische Proteine — darunter Beta-Amyloid und Tau, die mit Alzheimer assoziiert sind. Gleichzeitig regenerieren Muskeln, reguliert sich der Cortisol-Rhythmus und konsolidiert sich das Gedächtnis. Chronischer Schlafmangel beschleunigt epigenetische Alterung messbar.',
    stagesHeading: 'Die Schlafstadien',
    stages: [
      { name: 'Leichtschlaf (N1/N2)', pct: '~50 %', desc: 'Übergang und Konsolidierung. Das Gehirn verarbeitet Tageserlebnisse und bereitet Tiefen- und REM-Phasen vor.' },
      { name: 'Tiefschlaf (N3)', pct: '~20 %', desc: 'Physische Regeneration: Wachstumshormone werden ausgeschüttet, Gewebe repariert, das Immunsystem gestärkt. Abnahme im Alter — messbar trainierbar.' },
      { name: 'REM-Schlaf', pct: '~25 %', desc: 'Kognitive Regeneration: emotionale Verarbeitung, Kreativität, Gedächtniskonsolidierung. Unterdrückt durch Alkohol, spätes Essen und Schlafmangel.' },
    ],
    biomarkersHeading: 'Relevante Biomarker',
    biomarkers: [
      { name: 'Cortisol (morgendlich)', role: 'Cortisol Awakening Response (CAR) — Peak 30 Min nach dem Aufwachen zeigt Stressachsen-Gesundheit', optimal: 'Klarer Morgen-Peak, niedrige Abendwerte' },
      { name: 'Melatonin', role: 'Regelt Einschlaftiming und circadianen Rhythmus. Unterdrückt durch Blaulicht und späte Mahlzeiten.', optimal: 'Anstieg 2h vor Schlaf, Peak um 2–3 Uhr morgens' },
      { name: 'Ferritin / Eisen', role: 'Eisenmangel ist häufige Ursache von Restless Legs Syndrome und fragmentiertem Schlaf', optimal: 'Ferritin > 50 µg/l' },
      { name: 'TSH / Schilddrüse', role: 'Hypo- und Hyperthyreose stören Schlafarchitektur messbar', optimal: 'TSH 0.5–2.5 mIU/l' },
    ],
    tipsHeading: 'Evidenzbasierte Optimierung',
    tips: [
      { title: 'Konstante Aufstehzeit', body: 'Wichtiger als Einschlafzeit. Der Körper ankert den circadianen Rhythmus an der Aufstehzeit — täglich, auch am Wochenende.' },
      { title: 'Licht-Protokoll', body: 'Helles Morgenlicht (10–20 Min) direkt nach dem Aufwachen. Dunkelheit ab 21 Uhr. Kein Blaulicht in den 2h vor dem Schlafen.' },
      { title: 'Kühleres Schlafzimmer', body: 'Kernkörpertemperatur muss um 1–2 °C sinken um einzuschlafen. 17–19 °C ist optimal für die meisten Menschen.' },
      { title: 'Kein Alkohol vor dem Schlafen', body: 'Alkohol unterdrückt REM massiv. Selbst ein Glas Wein reduziert REM-Schlaf um 20–30 %. Letzte Einnahme mind. 3h vor dem Schlafen.' },
    ],
    ctaHeading: 'Schlaf in deinem Health Dashboard',
    ctaBody: 'Verbinde Schlaf-Tracker, Blutwerte und Symptome im Evida Life Health Engine Dashboard — und sieh, welche Interventionen wirken.',
    ctaBtn: 'Health Engine entdecken',
  },
  en: {
    tag: 'SLEEP',
    h1: 'Sleep is your most powerful intervention',
    sub: 'People who regularly sleep less than 7 hours have twice the risk of heart disease, dementia, and metabolic dysfunction. No supplement, no training can compensate for poor sleep.',
    badges: ['7–9 hours', 'Circadian rhythm', 'Deep sleep & REM'],
    whyHeading: 'Why sleep is critical for longevity',
    why: 'During sleep, the brain\'s glymphatic system runs at full capacity, removing neurotoxic proteins — including beta-amyloid and tau associated with Alzheimer\'s. Simultaneously, muscles regenerate, cortisol rhythms reset, and memory consolidates. Chronic sleep deprivation measurably accelerates epigenetic ageing.',
    stagesHeading: 'The sleep stages',
    stages: [
      { name: 'Light sleep (N1/N2)', pct: '~50%', desc: 'Transition and consolidation. The brain processes daily experiences and prepares for deep and REM phases.' },
      { name: 'Deep sleep (N3)', pct: '~20%', desc: 'Physical regeneration: growth hormones are released, tissue is repaired, the immune system strengthened. Decreases with age — measurably trainable.' },
      { name: 'REM sleep', pct: '~25%', desc: 'Cognitive regeneration: emotional processing, creativity, memory consolidation. Suppressed by alcohol, late eating, and sleep deprivation.' },
    ],
    biomarkersHeading: 'Relevant biomarkers',
    biomarkers: [
      { name: 'Cortisol (morning)', role: 'Cortisol Awakening Response (CAR) — peak 30 min after waking shows stress axis health', optimal: 'Clear morning peak, low evening values' },
      { name: 'Melatonin', role: 'Regulates sleep timing and circadian rhythm. Suppressed by blue light and late meals.', optimal: 'Rise 2h before sleep, peak around 2–3 am' },
      { name: 'Ferritin / Iron', role: 'Iron deficiency is a common cause of restless legs syndrome and fragmented sleep', optimal: 'Ferritin > 50 µg/l' },
      { name: 'TSH / Thyroid', role: 'Both hypo- and hyperthyroidism measurably disrupt sleep architecture', optimal: 'TSH 0.5–2.5 mIU/l' },
    ],
    tipsHeading: 'Evidence-based optimisation',
    tips: [
      { title: 'Consistent wake time', body: 'More important than bedtime. The body anchors the circadian rhythm to the wake time — daily, including weekends.' },
      { title: 'Light protocol', body: 'Bright morning light (10–20 min) immediately after waking. Darkness from 9 pm. No blue light in the 2h before sleep.' },
      { title: 'Cooler bedroom', body: 'Core body temperature must drop by 1–2°C to fall asleep. 17–19°C is optimal for most people.' },
      { title: 'No alcohol before sleep', body: 'Alcohol massively suppresses REM. Even one glass of wine reduces REM sleep by 20–30%. Last intake at least 3h before sleep.' },
    ],
    ctaHeading: 'Sleep in your Health Dashboard',
    ctaBody: 'Connect sleep trackers, blood values, and symptoms in the Evida Life Health Engine Dashboard — and see which interventions work.',
    ctaBtn: 'Discover Health Engine',
  },
  fr: {
    tag: 'SOMMEIL',
    h1: 'Le sommeil est votre intervention la plus puissante',
    sub: 'Les personnes qui dorment régulièrement moins de 7 heures ont deux fois plus de risques de maladies cardiaques, de démence et de dysfonctionnement métabolique. Aucun supplément ni entraînement ne peut compenser un mauvais sommeil.',
    badges: ['7–9 heures', 'Rythme circadien', 'Sommeil profond & REM'],
    whyHeading: 'Pourquoi le sommeil est crucial pour la longévité',
    why: 'Pendant le sommeil, le système glymphatique du cerveau fonctionne à plein régime, éliminant les protéines neurotoxiques — dont la bêta-amyloïde et la tau associées à Alzheimer. Simultanément, les muscles se régénèrent, le rythme du cortisol se réinitialise et la mémoire se consolide.',
    stagesHeading: 'Les stades du sommeil',
    stages: [
      { name: 'Sommeil léger (N1/N2)', pct: '~50%', desc: 'Transition et consolidation. Le cerveau traite les expériences quotidiennes et prépare les phases profondes et REM.' },
      { name: 'Sommeil profond (N3)', pct: '~20%', desc: 'Régénération physique: les hormones de croissance sont libérées, les tissus réparés, le système immunitaire renforcé.' },
      { name: 'Sommeil REM', pct: '~25%', desc: 'Régénération cognitive: traitement émotionnel, créativité, consolidation de la mémoire. Supprimé par l\'alcool et les repas tardifs.' },
    ],
    biomarkersHeading: 'Biomarqueurs pertinents',
    biomarkers: [
      { name: 'Cortisol (matin)', role: 'Réponse d\'éveil du cortisol (CAR) — pic 30 min après le réveil', optimal: 'Pic matinal clair, valeurs vespérales basses' },
      { name: 'Mélatonine', role: 'Régule le timing du sommeil et le rythme circadien.', optimal: 'Augmentation 2h avant le sommeil' },
      { name: 'Ferritine / Fer', role: 'La carence en fer est une cause fréquente du syndrome des jambes sans repos', optimal: 'Ferritine > 50 µg/l' },
      { name: 'TSH / Thyroïde', role: 'L\'hypo- et l\'hyperthyroïdie perturbent l\'architecture du sommeil', optimal: 'TSH 0,5–2,5 mUI/l' },
    ],
    tipsHeading: 'Optimisation fondée sur des preuves',
    tips: [
      { title: 'Heure de réveil constante', body: 'Plus important que l\'heure du coucher. Le corps ancre le rythme circadien à l\'heure du réveil — quotidiennement, même le week-end.' },
      { title: 'Protocole lumière', body: 'Lumière vive du matin (10–20 min) immédiatement après le réveil. Obscurité à partir de 21h. Pas de lumière bleue dans les 2h avant le sommeil.' },
      { title: 'Chambre plus fraîche', body: 'La température corporelle centrale doit baisser de 1–2°C pour s\'endormir. 17–19°C est optimal pour la plupart des gens.' },
      { title: 'Pas d\'alcool avant le sommeil', body: 'L\'alcool supprime massivement le REM. Même un verre de vin réduit le sommeil REM de 20–30%.' },
    ],
    ctaHeading: 'Le sommeil dans votre tableau de bord santé',
    ctaBody: 'Connectez trackers de sommeil, valeurs sanguines et symptômes dans le tableau de bord Evida Life Health Engine.',
    ctaBtn: 'Découvrir Health Engine',
  },
  es: {
    tag: 'SUEÑO',
    h1: 'El sueño es tu intervención más poderosa',
    sub: 'Las personas que duermen regularmente menos de 7 horas tienen el doble de riesgo de enfermedades cardíacas, demencia y disfunción metabólica. Ningún suplemento ni entrenamiento puede compensar el mal sueño.',
    badges: ['7–9 horas', 'Ritmo circadiano', 'Sueño profundo & REM'],
    whyHeading: 'Por qué el sueño es crítico para la longevidad',
    why: 'Durante el sueño, el sistema glinfático del cerebro funciona a plena capacidad, eliminando proteínas neurotóxicas, incluidas la beta-amiloide y la tau asociadas al Alzheimer. Simultáneamente, los músculos se regeneran, los ritmos del cortisol se reestablecen y la memoria se consolida.',
    stagesHeading: 'Las fases del sueño',
    stages: [
      { name: 'Sueño ligero (N1/N2)', pct: '~50%', desc: 'Transición y consolidación. El cerebro procesa las experiencias diarias y prepara las fases profundas y REM.' },
      { name: 'Sueño profundo (N3)', pct: '~20%', desc: 'Regeneración física: se liberan hormonas de crecimiento, se reparan tejidos, se fortalece el sistema inmunitario.' },
      { name: 'Sueño REM', pct: '~25%', desc: 'Regeneración cognitiva: procesamiento emocional, creatividad, consolidación de la memoria. Suprimido por el alcohol y las comidas tardías.' },
    ],
    biomarkersHeading: 'Biomarcadores relevantes',
    biomarkers: [
      { name: 'Cortisol (mañana)', role: 'Respuesta de despertar del cortisol (CAR) — pico 30 min después de despertar', optimal: 'Pico matutino claro, valores vespertinos bajos' },
      { name: 'Melatonina', role: 'Regula el tiempo de sueño y el ritmo circadiano.', optimal: 'Aumento 2h antes del sueño' },
      { name: 'Ferritina / Hierro', role: 'La deficiencia de hierro es causa común del síndrome de piernas inquietas', optimal: 'Ferritina > 50 µg/l' },
      { name: 'TSH / Tiroides', role: 'El hipo e hipertiroidismo alteran la arquitectura del sueño', optimal: 'TSH 0.5–2.5 mUI/l' },
    ],
    tipsHeading: 'Optimización basada en evidencia',
    tips: [
      { title: 'Hora de despertar constante', body: 'Más importante que la hora de dormir. El cuerpo ancla el ritmo circadiano a la hora de despertar — diariamente, incluso los fines de semana.' },
      { title: 'Protocolo de luz', body: 'Luz brillante matutina (10–20 min) inmediatamente después de despertar. Oscuridad desde las 21h. Sin luz azul en las 2h antes del sueño.' },
      { title: 'Dormitorio más fresco', body: 'La temperatura corporal central debe bajar 1–2°C para dormirse. 17–19°C es óptimo para la mayoría.' },
      { title: 'Sin alcohol antes de dormir', body: 'El alcohol suprime masivamente el REM. Incluso una copa de vino reduce el sueño REM en un 20–30%.' },
    ],
    ctaHeading: 'El sueño en tu panel de salud',
    ctaBody: 'Conecta rastreadores de sueño, valores sanguíneos y síntomas en el panel de Health Engine de Evida Life.',
    ctaBtn: 'Descubrir Health Engine',
  },
  it: {
    tag: 'SONNO',
    h1: 'Il sonno è il tuo intervento più potente',
    sub: 'Le persone che dormono regolarmente meno di 7 ore hanno il doppio del rischio di malattie cardiache, demenza e disfunzione metabolica. Nessun integratore né allenamento può compensare un sonno scarso.',
    badges: ['7–9 ore', 'Ritmo circadiano', 'Sonno profondo & REM'],
    whyHeading: 'Perché il sonno è fondamentale per la longevità',
    why: 'Durante il sonno, il sistema glinfatico del cervello funziona a piena capacità, rimuovendo proteine neurotossiche — tra cui beta-amiloide e tau associate all\'Alzheimer. Contemporaneamente, i muscoli si rigenerano, i ritmi del cortisolo si ripristinano e la memoria si consolida.',
    stagesHeading: 'Le fasi del sonno',
    stages: [
      { name: 'Sonno leggero (N1/N2)', pct: '~50%', desc: 'Transizione e consolidamento. Il cervello elabora le esperienze quotidiane e prepara le fasi profonde e REM.' },
      { name: 'Sonno profondo (N3)', pct: '~20%', desc: 'Rigenerazione fisica: vengono rilasciati ormoni della crescita, riparati i tessuti, rafforzato il sistema immunitario.' },
      { name: 'Sonno REM', pct: '~25%', desc: 'Rigenerazione cognitiva: elaborazione emotiva, creatività, consolidamento della memoria. Soppresso da alcol e pasti tardivi.' },
    ],
    biomarkersHeading: 'Biomarcatori rilevanti',
    biomarkers: [
      { name: 'Cortisolo (mattina)', role: 'Cortisol Awakening Response (CAR) — picco 30 min dopo il risveglio', optimal: 'Picco mattutino chiaro, valori serali bassi' },
      { name: 'Melatonina', role: 'Regola il timing del sonno e il ritmo circadiano.', optimal: 'Aumento 2h prima del sonno' },
      { name: 'Ferritina / Ferro', role: 'La carenza di ferro è causa comune della sindrome delle gambe senza riposo', optimal: 'Ferritina > 50 µg/l' },
      { name: 'TSH / Tiroide', role: 'Ipo e ipertiroidismo alterano measurabilmente l\'architettura del sonno', optimal: 'TSH 0.5–2.5 mUI/l' },
    ],
    tipsHeading: 'Ottimizzazione basata su evidenze',
    tips: [
      { title: 'Orario di risveglio costante', body: 'Più importante dell\'orario di addormentamento. Il corpo ancora il ritmo circadiano all\'orario di risveglio — ogni giorno, anche nel weekend.' },
      { title: 'Protocollo luce', body: 'Luce mattutina intensa (10–20 min) immediatamente dopo il risveglio. Buio dalle 21. Nessuna luce blu nelle 2h prima del sonno.' },
      { title: 'Camera più fresca', body: 'La temperatura corporea centrale deve scendere di 1–2°C per addormentarsi. 17–19°C è ottimale per la maggior parte delle persone.' },
      { title: 'Niente alcol prima di dormire', body: 'L\'alcol sopprime massicciamente il REM. Anche un solo bicchiere di vino riduce il sonno REM del 20–30%.' },
    ],
    ctaHeading: 'Il sonno nel tuo pannello salute',
    ctaBody: 'Collega tracker del sonno, valori del sangue e sintomi nel pannello Health Engine di Evida Life.',
    ctaBtn: 'Scopri Health Engine',
  },
};

export default async function SleepPage() {
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
        {/* Why sleep matters */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.whyHeading}</p>
          <p className="text-[#1c2a2b]/75 text-base leading-relaxed">{t.why}</p>
        </section>

        {/* Sleep stages */}
        <section className="bg-white border-y border-[#1c2a2b]/08 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.stagesHeading}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {t.stages.map((s) => (
                <div key={s.name} className="bg-[#fafaf8] rounded-2xl p-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <h3 className="font-serif text-lg text-[#0e393d]">{s.name}</h3>
                    <span className="text-xs font-semibold text-[#ceab84]">{s.pct}</span>
                  </div>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Biomarkers */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.biomarkersHeading}</p>
          <div className="space-y-4">
            {t.biomarkers.map((b) => (
              <div key={b.name} className="bg-white border border-[#1c2a2b]/10 rounded-xl p-5 grid md:grid-cols-3 gap-4 items-start">
                <div>
                  <p className="font-medium text-[#0e393d] text-sm">{b.name}</p>
                </div>
                <div>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{b.role}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{b.optimal}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="bg-[#f2ebdb]/40 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.tipsHeading}</p>
            <div className="grid md:grid-cols-2 gap-6">
              {t.tips.map((tip, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-[#1c2a2b]/08">
                  <h3 className="font-serif text-lg text-[#0e393d] mb-2">{tip.title}</h3>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{tip.body}</p>
                </div>
              ))}
            </div>
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
