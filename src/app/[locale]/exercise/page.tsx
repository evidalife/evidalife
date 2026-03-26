import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80';

export const metadata = { title: 'Exercise – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  badges: string[];
  whyHeading: string;
  why: string;
  pillarsHeading: string;
  pillars: { name: string; tag: string; desc: string; bullets: string[] }[];
  metricsHeading: string;
  metrics: { name: string; desc: string; optimal: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
  ctaBtn2: string;
}> = {
  de: {
    tag: 'BEWEGUNG',
    h1: 'Bewegung ist das stärkste Medikament',
    sub: 'Körperliche Fitness ist der beste Einzelprediktor für Langlebigkeit — stärker als Ernährung, Schlaf oder Genetik. VO₂max in den oberen 25 % senkt die Gesamtmortalität um über 50 %.',
    badges: ['Zone 2', 'VO₂max', 'Krafttraining', 'Longevity-orientiert'],
    whyHeading: 'Warum Bewegung die wichtigste Intervention ist',
    why: 'Peter Attia, einer der führenden Longevity-Ärzte, bezeichnet körperliche Fitness als «die einflussreichste Variable für ein langes, gesundes Leben». Die Datenlage ist eindeutig: Cardiorespiratorische Fitness (VO₂max) und Muskelkraft sind unabhängig voneinander mit reduzierter Mortalität assoziiert — über alle Altersgruppen, Geschlechter und Ausgangsgesundheitszustände.',
    pillarsHeading: 'Die drei Trainingspfeiler',
    pillars: [
      {
        name: 'Zone-2-Training',
        tag: 'AEROBE BASIS',
        desc: 'Moderates Cardio auf dem Level, bei dem du noch ein Gespräch führen kannst. Trainiert Mitochondriendichte, fettbasierte Energiegewinnung und metabolische Effizienz.',
        bullets: [
          '3–4× pro Woche, 45–90 Minuten',
          'Herzfrequenz: ~65–75 % HFmax',
          'Laufen, Radfahren, Rudern, Schwimmen',
          'Fundament für VO₂max-Verbesserung',
        ],
      },
      {
        name: 'VO₂max-Training',
        tag: 'HOCHINTENSITÄT',
        desc: 'Kurze, intensive Intervalle nahe maximaler Sauerstoffaufnahme. Erhöht Herzauswurf, Kapillarisierung und maximale aerobe Kapazität — der stärkste Prädiktor für Lebensdauer.',
        bullets: [
          '1–2× pro Woche',
          '4–6 × 4 Minuten bei ~90–95 % HFmax',
          'Oder 30/15-Intervalle, Tabata, Sprints',
          'Nach Zone-2-Basis aufbauen',
        ],
      },
      {
        name: 'Krafttraining',
        tag: 'MUSKEL & KNOCHEN',
        desc: 'Muskelmasse ist «metabolisches Kapital» — schützt vor Sarkopenie, verbessert Insulinsensitivität und reduziert Sturzrisiko. Unverzichtbar ab 40+.',
        bullets: [
          '2–3× pro Woche Ganzkörper',
          'Fokus: Kniebeuge, Kreuzheben, Drücken, Ziehen',
          'Progressive Überlastung über Monate',
          'Protein: 1.6–2.2 g/kg Körpergewicht täglich',
        ],
      },
    ],
    metricsHeading: 'Longevity-Kennzahlen',
    metrics: [
      { name: 'VO₂max', desc: 'Maximale Sauerstoffaufnahme — bester Einzelprediktor für Mortalität', optimal: 'Obere 25 % der Altersgruppe (>50 ml/kg/min für Männer unter 50)' },
      { name: 'Griffstärke', desc: 'Einfachster Proxy für Gesamtmuskelkraft und Mortalitätsrisiko', optimal: 'Altersangepasste Perzentile >50 %' },
      { name: 'Gehgeschwindigkeit', desc: 'Langsame Ganggeschwindigkeit prädiziert Gebrechlichkeit und Mortalität im Alter', optimal: '>1.2 m/s bei freier Gehgeschwindigkeit' },
      { name: 'Sit-to-Stand-Test', desc: '30-Sekunden-Aufstehtest ohne Arme — misst funktionelle Beinmuskelkraft', optimal: 'Altersspezifische Normen; Verbesserung über Zeit' },
    ],
    ctaHeading: 'Messe deinen Fortschritt',
    ctaBody: 'Verbinde Bewegungsdaten mit deinen Blutwerten im Health Engine Dashboard — und sieh, wie Training deine Biomarker verändert.',
    ctaBtn: 'Health Engine entdecken',
    ctaBtn2: 'Klinische Assessments',
  },
  en: {
    tag: 'EXERCISE',
    h1: 'Exercise is the most powerful medicine',
    sub: 'Physical fitness is the single best predictor of longevity — stronger than diet, sleep, or genetics. VO₂max in the top 25% reduces all-cause mortality by over 50%.',
    badges: ['Zone 2', 'VO₂max', 'Strength training', 'Longevity-oriented'],
    whyHeading: 'Why exercise is the most important intervention',
    why: 'Peter Attia, one of the leading longevity physicians, calls physical fitness "the most influential variable for a long, healthy life". The evidence is clear: cardiorespiratory fitness (VO₂max) and muscle strength are independently associated with reduced mortality — across all age groups, genders, and baseline health states.',
    pillarsHeading: 'The three training pillars',
    pillars: [
      {
        name: 'Zone 2 training',
        tag: 'AEROBIC BASE',
        desc: 'Moderate cardio at the level where you can still hold a conversation. Trains mitochondrial density, fat-based energy production, and metabolic efficiency.',
        bullets: [
          '3–4× per week, 45–90 minutes',
          'Heart rate: ~65–75% HRmax',
          'Running, cycling, rowing, swimming',
          'Foundation for VO₂max improvement',
        ],
      },
      {
        name: 'VO₂max training',
        tag: 'HIGH INTENSITY',
        desc: 'Short, intense intervals near maximum oxygen uptake. Increases cardiac output, capillarisation, and maximal aerobic capacity — the strongest predictor of lifespan.',
        bullets: [
          '1–2× per week',
          '4–6 × 4 minutes at ~90–95% HRmax',
          'Or 30/15 intervals, Tabata, sprints',
          'Build on Zone 2 base first',
        ],
      },
      {
        name: 'Strength training',
        tag: 'MUSCLE & BONE',
        desc: 'Muscle mass is "metabolic capital" — protects against sarcopenia, improves insulin sensitivity, and reduces fall risk. Indispensable from age 40+.',
        bullets: [
          '2–3× per week full body',
          'Focus: squat, deadlift, press, pull',
          'Progressive overload over months',
          'Protein: 1.6–2.2 g/kg body weight daily',
        ],
      },
    ],
    metricsHeading: 'Longevity metrics',
    metrics: [
      { name: 'VO₂max', desc: 'Maximum oxygen uptake — best single predictor of mortality', optimal: 'Top 25% for age group (>50 ml/kg/min for men under 50)' },
      { name: 'Grip strength', desc: 'Simplest proxy for overall muscle strength and mortality risk', optimal: 'Age-adjusted percentile >50%' },
      { name: 'Walking speed', desc: 'Slow gait speed predicts frailty and mortality in older age', optimal: '>1.2 m/s at free walking speed' },
      { name: 'Sit-to-stand test', desc: '30-second chair stand test without arms — measures functional leg muscle strength', optimal: 'Age-specific norms; improvement over time' },
    ],
    ctaHeading: 'Measure your progress',
    ctaBody: 'Connect movement data with your blood values in the Health Engine Dashboard — and see how training changes your biomarkers.',
    ctaBtn: 'Discover Health Engine',
    ctaBtn2: 'Clinical Assessments',
  },
  fr: {
    tag: 'EXERCICE',
    h1: 'L\'exercice est le médicament le plus puissant',
    sub: 'La condition physique est le meilleur prédicteur unique de la longévité — plus fort que l\'alimentation, le sommeil ou la génétique. Un VO₂max dans le top 25 % réduit la mortalité toutes causes de plus de 50 %.',
    badges: ['Zone 2', 'VO₂max', 'Musculation', 'Orienté longévité'],
    whyHeading: 'Pourquoi l\'exercice est l\'intervention la plus importante',
    why: 'La condition physique cardio-respiratoire (VO₂max) et la force musculaire sont indépendamment associées à une mortalité réduite — dans tous les groupes d\'âge, sexes et états de santé de départ.',
    pillarsHeading: 'Les trois piliers d\'entraînement',
    pillars: [
      {
        name: 'Entraînement Zone 2',
        tag: 'BASE AÉROBIE',
        desc: 'Cardio modéré au niveau où vous pouvez encore tenir une conversation. Entraîne la densité mitochondriale et l\'efficacité métabolique.',
        bullets: [
          '3–4× par semaine, 45–90 minutes',
          'Fréquence cardiaque: ~65–75% FCmax',
          'Course, vélo, aviron, natation',
          'Fondation pour l\'amélioration du VO₂max',
        ],
      },
      {
        name: 'Entraînement VO₂max',
        tag: 'HAUTE INTENSITÉ',
        desc: 'Intervalles courts et intenses proches de l\'absorption maximale d\'oxygène. Augmente le débit cardiaque et la capacité aérobie maximale.',
        bullets: [
          '1–2× par semaine',
          '4–6 × 4 minutes à ~90–95% FCmax',
          'Ou intervalles 30/15, Tabata, sprints',
          'Construire d\'abord la base Zone 2',
        ],
      },
      {
        name: 'Musculation',
        tag: 'MUSCLE & OS',
        desc: 'La masse musculaire est un «capital métabolique» — protège contre la sarcopénie, améliore la sensibilité à l\'insuline et réduit le risque de chute.',
        bullets: [
          '2–3× par semaine corps entier',
          'Focus: squat, soulevé de terre, poussée, tirage',
          'Surcharge progressive sur des mois',
          'Protéines: 1.6–2.2 g/kg de poids corporel',
        ],
      },
    ],
    metricsHeading: 'Métriques de longévité',
    metrics: [
      { name: 'VO₂max', desc: 'Absorption maximale d\'oxygène — meilleur prédicteur unique de la mortalité', optimal: 'Top 25% pour le groupe d\'âge' },
      { name: 'Force de préhension', desc: 'Proxy le plus simple pour la force musculaire globale et le risque de mortalité', optimal: 'Percentile ajusté à l\'âge >50%' },
      { name: 'Vitesse de marche', desc: 'Une vitesse de marche lente prédit la fragilité et la mortalité', optimal: '>1.2 m/s à vitesse de marche libre' },
      { name: 'Test assis-debout', desc: 'Test debout 30 secondes sans les bras — mesure la force fonctionnelle des jambes', optimal: 'Normes spécifiques à l\'âge' },
    ],
    ctaHeading: 'Mesurez vos progrès',
    ctaBody: 'Connectez données de mouvement et valeurs sanguines dans le tableau de bord Health Engine.',
    ctaBtn: 'Découvrir Health Engine',
    ctaBtn2: 'Évaluations cliniques',
  },
  es: {
    tag: 'EJERCICIO',
    h1: 'El ejercicio es el medicamento más poderoso',
    sub: 'La condición física es el mejor predictor único de longevidad — más fuerte que la dieta, el sueño o la genética. Un VO₂máx en el top 25% reduce la mortalidad por todas las causas en más del 50%.',
    badges: ['Zona 2', 'VO₂máx', 'Entrenamiento de fuerza', 'Orientado a longevidad'],
    whyHeading: 'Por qué el ejercicio es la intervención más importante',
    why: 'La condición física cardiorrespiratoria (VO₂máx) y la fuerza muscular están independientemente asociadas con la reducción de la mortalidad — en todos los grupos de edad, géneros y estados de salud de partida.',
    pillarsHeading: 'Los tres pilares del entrenamiento',
    pillars: [
      {
        name: 'Entrenamiento Zona 2',
        tag: 'BASE AERÓBICA',
        desc: 'Cardio moderado al nivel en que todavía puedes mantener una conversación. Entrena la densidad mitocondrial y la eficiencia metabólica.',
        bullets: [
          '3–4× por semana, 45–90 minutos',
          'Frecuencia cardíaca: ~65–75% FCmáx',
          'Correr, ciclismo, remo, natación',
          'Base para la mejora del VO₂máx',
        ],
      },
      {
        name: 'Entrenamiento VO₂máx',
        tag: 'ALTA INTENSIDAD',
        desc: 'Intervalos cortos e intensos cerca de la captación máxima de oxígeno. Aumenta el gasto cardíaco y la capacidad aeróbica máxima.',
        bullets: [
          '1–2× por semana',
          '4–6 × 4 minutos al ~90–95% FCmáx',
          'O intervalos 30/15, Tabata, sprints',
          'Construir primero la base Zona 2',
        ],
      },
      {
        name: 'Entrenamiento de fuerza',
        tag: 'MÚSCULO & HUESO',
        desc: 'La masa muscular es «capital metabólico» — protege contra la sarcopenia, mejora la sensibilidad a la insulina y reduce el riesgo de caídas.',
        bullets: [
          '2–3× por semana cuerpo completo',
          'Foco: sentadilla, peso muerto, press, jalón',
          'Sobrecarga progresiva durante meses',
          'Proteína: 1.6–2.2 g/kg de peso corporal',
        ],
      },
    ],
    metricsHeading: 'Métricas de longevidad',
    metrics: [
      { name: 'VO₂máx', desc: 'Captación máxima de oxígeno — mejor predictor único de mortalidad', optimal: 'Top 25% para el grupo de edad' },
      { name: 'Fuerza de prensión', desc: 'Proxy más simple para la fuerza muscular total y el riesgo de mortalidad', optimal: 'Percentil ajustado por edad >50%' },
      { name: 'Velocidad de marcha', desc: 'La velocidad de marcha lenta predice fragilidad y mortalidad', optimal: '>1.2 m/s a velocidad libre' },
      { name: 'Test sentarse-levantarse', desc: 'Test de 30 segundos sin brazos — mide fuerza funcional de piernas', optimal: 'Normas específicas por edad' },
    ],
    ctaHeading: 'Mide tu progreso',
    ctaBody: 'Conecta datos de movimiento con valores sanguíneos en el panel de Health Engine.',
    ctaBtn: 'Descubrir Health Engine',
    ctaBtn2: 'Valoraciones clínicas',
  },
  it: {
    tag: 'ESERCIZIO',
    h1: 'L\'esercizio è il farmaco più potente',
    sub: 'La forma fisica è il miglior predittore unico di longevità — più forte di dieta, sonno o genetica. Un VO₂max nel top 25% riduce la mortalità per tutte le cause di oltre il 50%.',
    badges: ['Zona 2', 'VO₂max', 'Allenamento della forza', 'Orientato alla longevità'],
    whyHeading: 'Perché l\'esercizio è l\'intervento più importante',
    why: 'La forma fisica cardiorespiratori (VO₂max) e la forza muscolare sono indipendentemente associate a una ridotta mortalità — in tutti i gruppi di età, sessi e stati di salute di partenza.',
    pillarsHeading: 'I tre pilastri dell\'allenamento',
    pillars: [
      {
        name: 'Allenamento Zona 2',
        tag: 'BASE AEROBICA',
        desc: 'Cardio moderato al livello in cui puoi ancora tenere una conversazione. Allena la densità mitocondriale e l\'efficienza metabolica.',
        bullets: [
          '3–4× per settimana, 45–90 minuti',
          'Frequenza cardiaca: ~65–75% FCmax',
          'Corsa, ciclismo, canottaggio, nuoto',
          'Base per il miglioramento del VO₂max',
        ],
      },
      {
        name: 'Allenamento VO₂max',
        tag: 'ALTA INTENSITÀ',
        desc: 'Intervalli brevi e intensi vicino all\'assorbimento massimo di ossigeno. Aumenta la gittata cardiaca e la capacità aerobica massima.',
        bullets: [
          '1–2× per settimana',
          '4–6 × 4 minuti al ~90–95% FCmax',
          'O intervalli 30/15, Tabata, sprint',
          'Costruire prima la base Zona 2',
        ],
      },
      {
        name: 'Allenamento della forza',
        tag: 'MUSCOLO & OSSO',
        desc: 'La massa muscolare è «capitale metabolico» — protegge dalla sarcopenia, migliora la sensibilità all\'insulina e riduce il rischio di cadute.',
        bullets: [
          '2–3× per settimana corpo intero',
          'Focus: squat, stacco, press, trazioni',
          'Sovraccarico progressivo nel tempo',
          'Proteine: 1.6–2.2 g/kg di peso corporeo',
        ],
      },
    ],
    metricsHeading: 'Metriche di longevità',
    metrics: [
      { name: 'VO₂max', desc: 'Assorbimento massimo di ossigeno — miglior predittore unico di mortalità', optimal: 'Top 25% per il gruppo di età' },
      { name: 'Forza di presa', desc: 'Proxy più semplice per la forza muscolare complessiva e il rischio di mortalità', optimal: 'Percentile aggiustato per età >50%' },
      { name: 'Velocità di cammino', desc: 'La velocità di cammino lenta predice fragilità e mortalità', optimal: '>1.2 m/s a velocità libera' },
      { name: 'Test sedersi-alzarsi', desc: 'Test 30 secondi senza braccia — misura la forza funzionale delle gambe', optimal: 'Norme specifiche per età' },
    ],
    ctaHeading: 'Misura i tuoi progressi',
    ctaBody: 'Collega dati di movimento e valori del sangue nel pannello Health Engine.',
    ctaBtn: 'Scopri Health Engine',
    ctaBtn2: 'Valutazioni cliniche',
  },
};

export default async function ExercisePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative h-[72vh] min-h-[480px] flex items-end">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
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
        {/* Why */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.whyHeading}</p>
          <p className="text-[#1c2a2b]/75 text-base leading-relaxed">{t.why}</p>
        </section>

        {/* Three pillars */}
        <section className="bg-white border-y border-[#1c2a2b]/08 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.pillarsHeading}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {t.pillars.map((p) => (
                <div key={p.name} className="bg-[#fafaf8] rounded-2xl p-6 flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ceab84] mb-2">{p.tag}</p>
                  <h3 className="font-serif text-xl text-[#0e393d] mb-3">{p.name}</h3>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed mb-4">{p.desc}</p>
                  <ul className="mt-auto space-y-1.5">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-[#1c2a2b]/70">
                        <span className="text-[#ceab84] mt-0.5">—</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Metrics */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.metricsHeading}</p>
          <div className="space-y-4">
            {t.metrics.map((m) => (
              <div key={m.name} className="bg-white border border-[#1c2a2b]/10 rounded-xl p-5 grid md:grid-cols-3 gap-4 items-start">
                <p className="font-medium text-[#0e393d] text-sm">{m.name}</p>
                <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{m.desc}</p>
                <p className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{m.optimal}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0e393d] py-20">
          <div className="max-w-2xl mx-auto px-6 text-center">
            <h2 className="font-serif text-4xl text-white mb-4">{t.ctaHeading}</h2>
            <p className="text-white/70 text-base leading-relaxed mb-8">{t.ctaBody}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/health-engine"
                className="inline-block bg-[#ceab84] text-[#0e393d] text-sm font-semibold px-8 py-4 rounded-full hover:bg-[#d4b98e] transition-colors"
              >
                {t.ctaBtn}
              </Link>
              <Link
                href="/assessments"
                className="inline-block bg-transparent border border-white/40 text-white text-sm font-medium px-8 py-4 rounded-full hover:bg-white/10 transition-colors"
              >
                {t.ctaBtn2}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
