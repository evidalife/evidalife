import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80';

export const metadata = { title: 'Stress & Recovery – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  badges: string[];
  whyHeading: string;
  why: string;
  toolsHeading: string;
  tools: { name: string; tag: string; desc: string; details: string[] }[];
  protocolsHeading: string;
  protocols: { title: string; body: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaBtn: string;
}> = {
  de: {
    tag: 'STRESS & RECOVERY',
    h1: 'Stress kontrollieren, Regeneration optimieren',
    sub: 'Chronischer Stress ist ein stiller Beschleuniger des biologischen Alterns. Er erhöht Entzündungsmarker, stört Schlafarchitektur und komprimiert epigenetische Uhren — messbar und umkehrbar.',
    badges: ['HRV-Tracking', 'Cortisol-Regulation', 'Breathwork', 'Erholungsprotokolle'],
    whyHeading: 'Warum Stress die biologische Uhr beschleunigt',
    why: 'Der Körper unterscheidet nicht zwischen physischem und psychischem Stress. Chronisch erhöhtes Cortisol schädigt den Hippocampus, stört den Schlaf, erhöht Insulinresistenz und erhöht systemische Entzündung (IL-6, CRP, TNF-α). Studien zeigen, dass chronischer Stress den DunedinPACE-Score um 0.05–0.15 erhöht — entsprechend 5–15 % schnellerem biologischen Altern. Gezielte Recovery-Massnahmen sind die einzige Gegenstrategie.',
    toolsHeading: 'Messung & Monitoring',
    tools: [
      {
        name: 'HRV (Herzratenvariabilität)',
        tag: 'DER WICHTIGSTE MARKER',
        desc: 'HRV misst die Variabilität zwischen Herzschlägen — ein direktes Fenster in die autonome Nervensystembalance. Höhere HRV = bessere Stressresilienz und Erholung.',
        details: [
          'Messe morgens nach dem Aufwachen, liegend',
          'Wearables: Oura Ring, Whoop, Garmin, Polar',
          'Trend über 4–8 Wochen, nicht tagesweise',
          'Abfall nach schlechtem Schlaf, Alkohol, Übertraining',
          'Anstieg durch Zone-2-Training und Breathwork',
        ],
      },
      {
        name: 'Cortisol-Tageschrofil',
        tag: 'STRESSACHSE',
        desc: 'Cortisol folgt einem klaren Tagesmuster: Peak am Morgen, Abfall über den Tag. Chronischer Stress verflacht diese Kurve — ein messbarer Marker für Burn-out-Risiko.',
        details: [
          'Speichel-Cortisol: 4 Messungen über den Tag',
          'Morgen-Peak fehlt: Erschöpfung der HPA-Achse',
          'Hoher Abend-Cortisol: schlechter Schlaf, Grübeln',
          'DHEA-S als Gegenspieler zu Cortisol messen',
          'Im Labor über Evida Life Partnerlabore',
        ],
      },
      {
        name: 'Inflammationsmarker',
        tag: 'STILLE ENTZÜNDUNG',
        desc: 'Chronischer Stress treibt systemische Entzündung — eine der Hauptursachen für Alterung und Krankheit. Messbar über Bluttest.',
        details: [
          'hsCRP < 1.0 mg/L (optimal)',
          'IL-6 < 3.1 pg/ml',
          'Homocystein < 10 µmol/L',
          'Ferritin als Entzündungsmarker (nicht nur Eisen)',
          'Regelmässig alle 6 Monate tracken',
        ],
      },
    ],
    protocolsHeading: 'Erholungsprotokolle',
    protocols: [
      { title: 'Physiologisches Seufzen', body: 'Doppelte Einatmung durch die Nase, langsame vollständige Ausatmung durch den Mund. Sofortige Aktivierung des Parasympathikus. 1–3 Atemzüge reichen für akute Stressreduktion — belegt durch Stanford-Studien (Huberman Lab, 2023).' },
      { title: 'Box Breathing (4-4-4-4)', body: '4 Sekunden einatmen, 4 Sekunden halten, 4 Sekunden ausatmen, 4 Sekunden halten. Balanciert sympathisches und parasympathisches Nervensystem. Täglich 5 Minuten erhöht HRV messbar über 4 Wochen.' },
      { title: 'Kälteexposition', body: 'Kaltes Duschen (1–3 Minuten, <15°C) oder Eisbad erhöht kurzfristig Noradrenalin massiv und trainiert die Stressachse. Verbessert HRV und reduziert Entzündungsmarker bei regelmässiger Anwendung.' },
      { title: 'Nicht-Schlaf-Tiefenruhe (NSDR)', body: 'Yoga Nidra oder geführte NSDR-Protokolle (10–20 Min) nach dem Mittagessen. Stellt das Nervensystem schneller wieder her als Schlaf und verbessert nachmittägliche Kognition und HRV.' },
    ],
    ctaHeading: 'Tracke deine Stressresilienz',
    ctaBody: 'Verbinde HRV-Daten, Cortisol-Werte und Inflammationsmarker im Evida Life Health Dashboard — und sieh deinen Fortschritt über Zeit.',
    ctaBtn: 'Health Engine entdecken',
  },
  en: {
    tag: 'STRESS & RECOVERY',
    h1: 'Control stress, optimise recovery',
    sub: 'Chronic stress is a silent accelerator of biological ageing. It elevates inflammatory markers, disrupts sleep architecture, and compresses epigenetic clocks — measurably and reversibly.',
    badges: ['HRV tracking', 'Cortisol regulation', 'Breathwork', 'Recovery protocols'],
    whyHeading: 'Why stress accelerates the biological clock',
    why: 'The body does not distinguish between physical and psychological stress. Chronically elevated cortisol damages the hippocampus, disrupts sleep, increases insulin resistance, and drives systemic inflammation (IL-6, CRP, TNF-α). Studies show that chronic stress increases the DunedinPACE score by 0.05–0.15 — corresponding to 5–15% faster biological ageing. Targeted recovery measures are the only counter-strategy.',
    toolsHeading: 'Measurement & monitoring',
    tools: [
      {
        name: 'HRV (Heart Rate Variability)',
        tag: 'THE KEY MARKER',
        desc: 'HRV measures the variability between heartbeats — a direct window into autonomic nervous system balance. Higher HRV = better stress resilience and recovery.',
        details: [
          'Measure each morning after waking, lying down',
          'Wearables: Oura Ring, Whoop, Garmin, Polar',
          'Track trend over 4–8 weeks, not day by day',
          'Drops after poor sleep, alcohol, overtraining',
          'Rises with Zone 2 training and breathwork',
        ],
      },
      {
        name: 'Cortisol diurnal profile',
        tag: 'STRESS AXIS',
        desc: 'Cortisol follows a clear daily pattern: peak in the morning, decline through the day. Chronic stress flattens this curve — a measurable marker of burnout risk.',
        details: [
          'Salivary cortisol: 4 measurements across the day',
          'Missing morning peak: HPA axis exhaustion',
          'High evening cortisol: poor sleep, rumination',
          'DHEA-S as a counter-measure to cortisol',
          'Via Evida Life partner labs',
        ],
      },
      {
        name: 'Inflammation markers',
        tag: 'SILENT INFLAMMATION',
        desc: 'Chronic stress drives systemic inflammation — one of the main drivers of ageing and disease. Measurable via blood test.',
        details: [
          'hsCRP < 1.0 mg/L (optimal)',
          'IL-6 < 3.1 pg/ml',
          'Homocysteine < 10 µmol/L',
          'Ferritin as an inflammation marker',
          'Track every 6 months',
        ],
      },
    ],
    protocolsHeading: 'Recovery protocols',
    protocols: [
      { title: 'Physiological sigh', body: 'Double inhale through the nose, slow complete exhale through the mouth. Immediate activation of the parasympathetic nervous system. 1–3 breaths are enough for acute stress reduction — proven by Stanford studies (Huberman Lab, 2023).' },
      { title: 'Box Breathing (4-4-4-4)', body: 'Inhale 4 seconds, hold 4 seconds, exhale 4 seconds, hold 4 seconds. Balances sympathetic and parasympathetic nervous system. 5 minutes daily measurably increases HRV over 4 weeks.' },
      { title: 'Cold exposure', body: 'Cold showers (1–3 minutes, <15°C) or ice baths sharply increase noradrenaline and train the stress axis. Improves HRV and reduces inflammation markers with regular use.' },
      { title: 'Non-sleep deep rest (NSDR)', body: 'Yoga Nidra or guided NSDR protocols (10–20 min) after lunch. Restores the nervous system faster than sleep and improves afternoon cognition and HRV.' },
    ],
    ctaHeading: 'Track your stress resilience',
    ctaBody: 'Connect HRV data, cortisol values, and inflammation markers in the Evida Life Health Dashboard — and see your progress over time.',
    ctaBtn: 'Discover Health Engine',
  },
  fr: {
    tag: 'STRESS & RÉCUPÉRATION',
    h1: 'Contrôler le stress, optimiser la récupération',
    sub: 'Le stress chronique est un accélérateur silencieux du vieillissement biologique. Il élève les marqueurs inflammatoires, perturbe l\'architecture du sommeil et comprime les horloges épigénétiques.',
    badges: ['Suivi VFC', 'Régulation du cortisol', 'Respiration', 'Protocoles de récupération'],
    whyHeading: 'Pourquoi le stress accélère l\'horloge biologique',
    why: 'Le corps ne fait pas la distinction entre stress physique et psychologique. Le cortisol chroniquement élevé endommage l\'hippocampe, perturbe le sommeil, augmente la résistance à l\'insuline et provoque une inflammation systémique. Les études montrent que le stress chronique augmente le score DunedinPACE de 0.05–0.15.',
    toolsHeading: 'Mesure & surveillance',
    tools: [
      {
        name: 'VFC (Variabilité de la Fréquence Cardiaque)',
        tag: 'LE MARQUEUR CLÉ',
        desc: 'La VFC mesure la variabilité entre les battements de cœur — une fenêtre directe sur l\'équilibre du système nerveux autonome.',
        details: [
          'Mesurer chaque matin après le réveil, allongé',
          'Wearables: Oura Ring, Whoop, Garmin, Polar',
          'Suivre la tendance sur 4–8 semaines',
          'Chute après mauvais sommeil, alcool, surentraînement',
          'Hausse avec Zone 2 et exercices respiratoires',
        ],
      },
      {
        name: 'Profil diurne du cortisol',
        tag: 'AXE DU STRESS',
        desc: 'Le cortisol suit un schéma quotidien clair. Le stress chronique aplatit cette courbe — un marqueur mesurable du risque d\'épuisement professionnel.',
        details: [
          'Cortisol salivaire: 4 mesures dans la journée',
          'Pic matinal manquant: épuisement de l\'axe HPA',
          'Cortisol vespéral élevé: mauvais sommeil',
          'DHEA-S comme contrepoids au cortisol',
          'Via les laboratoires partenaires Evida Life',
        ],
      },
      {
        name: 'Marqueurs d\'inflammation',
        tag: 'INFLAMMATION SILENCIEUSE',
        desc: 'Le stress chronique alimente l\'inflammation systémique. Mesurable par analyse sanguine.',
        details: [
          'hsCRP < 1.0 mg/L (optimal)',
          'IL-6 < 3.1 pg/ml',
          'Homocystéine < 10 µmol/L',
          'Ferritine comme marqueur inflammatoire',
          'Tous les 6 mois',
        ],
      },
    ],
    protocolsHeading: 'Protocoles de récupération',
    protocols: [
      { title: 'Soupir physiologique', body: 'Double inspiration par le nez, expiration lente et complète par la bouche. Activation immédiate du parasympathique. 1–3 respirations suffisent — prouvé par les études de Stanford.' },
      { title: 'Respiration en boîte (4-4-4-4)', body: 'Inspiration 4 sec, rétention 4 sec, expiration 4 sec, rétention 4 sec. Équilibre le système nerveux. 5 minutes par jour augmente la VFC mesurée sur 4 semaines.' },
      { title: 'Exposition au froid', body: 'Douches froides (1–3 min, <15°C) ou bains de glace augmentent la noradrénaline et entraînent l\'axe du stress. Améliore la VFC et réduit les marqueurs d\'inflammation.' },
      { title: 'Repos profond non-sommeil (NSDR)', body: 'Yoga Nidra ou protocoles NSDR guidés (10–20 min) après le déjeuner. Restaure le système nerveux plus vite que le sommeil.' },
    ],
    ctaHeading: 'Suivez votre résilience au stress',
    ctaBody: 'Connectez données VFC, valeurs de cortisol et marqueurs d\'inflammation dans le tableau de bord Evida Life.',
    ctaBtn: 'Découvrir Health Engine',
  },
  es: {
    tag: 'ESTRÉS & RECUPERACIÓN',
    h1: 'Controla el estrés, optimiza la recuperación',
    sub: 'El estrés crónico es un acelerador silencioso del envejecimiento biológico. Eleva los marcadores inflamatorios, altera la arquitectura del sueño y comprime los relojes epigenéticos.',
    badges: ['Seguimiento VFC', 'Regulación del cortisol', 'Respiración', 'Protocolos de recuperación'],
    whyHeading: 'Por qué el estrés acelera el reloj biológico',
    why: 'El cuerpo no distingue entre estrés físico y psicológico. El cortisol crónicamente elevado daña el hipocampo, altera el sueño, aumenta la resistencia a la insulina e impulsa la inflamación sistémica. Los estudios muestran que el estrés crónico aumenta el puntuaje DunedinPACE en 0.05–0.15.',
    toolsHeading: 'Medición y monitoreo',
    tools: [
      {
        name: 'VFC (Variabilidad de la Frecuencia Cardíaca)',
        tag: 'EL MARCADOR CLAVE',
        desc: 'La VFC mide la variabilidad entre latidos — una ventana directa al equilibrio del sistema nervioso autónomo.',
        details: [
          'Medir cada mañana al despertar, tumbado',
          'Wearables: Oura Ring, Whoop, Garmin, Polar',
          'Seguir tendencia en 4–8 semanas',
          'Cae tras mal sueño, alcohol, sobreentrenamiento',
          'Sube con Zona 2 y trabajo respiratorio',
        ],
      },
      {
        name: 'Perfil diurno de cortisol',
        tag: 'EJE DEL ESTRÉS',
        desc: 'El cortisol sigue un patrón diario claro. El estrés crónico aplana esta curva — marcador medible de riesgo de agotamiento.',
        details: [
          'Cortisol salival: 4 mediciones al día',
          'Pico matutino ausente: agotamiento del eje HPA',
          'Cortisol vespertino alto: mal sueño',
          'DHEA-S como contrapeso al cortisol',
          'A través de laboratorios asociados de Evida Life',
        ],
      },
      {
        name: 'Marcadores de inflamación',
        tag: 'INFLAMACIÓN SILENCIOSA',
        desc: 'El estrés crónico impulsa la inflamación sistémica. Medible mediante análisis de sangre.',
        details: [
          'hsCRP < 1.0 mg/L (óptimo)',
          'IL-6 < 3.1 pg/ml',
          'Homocisteína < 10 µmol/L',
          'Ferritina como marcador inflamatorio',
          'Cada 6 meses',
        ],
      },
    ],
    protocolsHeading: 'Protocolos de recuperación',
    protocols: [
      { title: 'Suspiro fisiológico', body: 'Doble inhalación por la nariz, exhalación lenta y completa por la boca. Activación inmediata del parasimpático. 1–3 respiraciones son suficientes — probado por estudios de Stanford.' },
      { title: 'Respiración en caja (4-4-4-4)', body: 'Inhalar 4 seg, retener 4 seg, exhalar 4 seg, retener 4 seg. Equilibra el sistema nervioso. 5 minutos al día aumenta la VFC medida en 4 semanas.' },
      { title: 'Exposición al frío', body: 'Duchas frías (1–3 min, <15°C) o baños de hielo aumentan la noradrenalina y entrenan el eje del estrés. Mejora la VFC y reduce los marcadores inflamatorios.' },
      { title: 'Descanso profundo sin sueño (NSDR)', body: 'Yoga Nidra o protocolos NSDR guiados (10–20 min) después del almuerzo. Restaura el sistema nervioso más rápido que el sueño.' },
    ],
    ctaHeading: 'Rastrea tu resiliencia al estrés',
    ctaBody: 'Conecta datos de VFC, valores de cortisol y marcadores de inflamación en el panel de Evida Life.',
    ctaBtn: 'Descubrir Health Engine',
  },
  it: {
    tag: 'STRESS & RECUPERO',
    h1: 'Controlla lo stress, ottimizza il recupero',
    sub: 'Lo stress cronico è un acceleratore silenzioso dell\'invecchiamento biologico. Eleva i marcatori infiammatori, altera l\'architettura del sonno e comprime gli orologi epigenetici.',
    badges: ['Monitoraggio HRV', 'Regolazione del cortisolo', 'Respirazione', 'Protocolli di recupero'],
    whyHeading: 'Perché lo stress accelera l\'orologio biologico',
    why: 'Il corpo non distingue tra stress fisico e psicologico. Il cortisolo cronicamente elevato danneggia l\'ippocampo, disturba il sonno, aumenta la resistenza all\'insulina e alimenta l\'infiammazione sistemica. Gli studi mostrano che lo stress cronico aumenta il punteggio DunedinPACE di 0.05–0.15.',
    toolsHeading: 'Misurazione e monitoraggio',
    tools: [
      {
        name: 'HRV (Variabilità della Frequenza Cardiaca)',
        tag: 'IL MARCATORE CHIAVE',
        desc: 'L\'HRV misura la variabilità tra i battiti cardiaci — una finestra diretta sull\'equilibrio del sistema nervoso autonomo.',
        details: [
          'Misurare ogni mattina dopo il risveglio, sdraiati',
          'Wearables: Oura Ring, Whoop, Garmin, Polar',
          'Seguire la tendenza su 4–8 settimane',
          'Calo dopo sonno scarso, alcol, sovrallenamento',
          'Aumento con Zona 2 e lavoro respiratorio',
        ],
      },
      {
        name: 'Profilo diurno del cortisolo',
        tag: 'ASSE DELLO STRESS',
        desc: 'Il cortisolo segue un chiaro schema giornaliero. Lo stress cronico appiattisce questa curva — marcatore misurabile del rischio di burnout.',
        details: [
          'Cortisolo salivare: 4 misurazioni nell\'arco della giornata',
          'Picco mattutino assente: esaurimento dell\'asse HPA',
          'Cortisolo serale elevato: sonno scarso',
          'DHEA-S come contrappeso al cortisolo',
          'Tramite i laboratori partner di Evida Life',
        ],
      },
      {
        name: 'Marcatori di infiammazione',
        tag: 'INFIAMMAZIONE SILENZIOSA',
        desc: 'Lo stress cronico alimenta l\'infiammazione sistemica. Misurabile tramite esame del sangue.',
        details: [
          'hsCRP < 1.0 mg/L (ottimale)',
          'IL-6 < 3.1 pg/ml',
          'Omocisteina < 10 µmol/L',
          'Ferritina come marcatore infiammatorio',
          'Ogni 6 mesi',
        ],
      },
    ],
    protocolsHeading: 'Protocolli di recupero',
    protocols: [
      { title: 'Sospiro fisiologico', body: 'Doppia inspirazione dal naso, lenta e completa espirazione dalla bocca. Attivazione immediata del parasimpatico. 1–3 respiri bastano — provato da studi Stanford.' },
      { title: 'Respirazione a scatola (4-4-4-4)', body: 'Inspira 4 sec, tieni 4 sec, espira 4 sec, tieni 4 sec. Bilancia il sistema nervoso. 5 minuti al giorno aumenta l\'HRV misurata in 4 settimane.' },
      { title: 'Esposizione al freddo', body: 'Docce fredde (1–3 min, <15°C) o bagni di ghiaccio aumentano la noradrenalina e allenano l\'asse dello stress. Migliora l\'HRV e riduce i marcatori di infiammazione.' },
      { title: 'Riposo profondo non-sonno (NSDR)', body: 'Yoga Nidra o protocolli NSDR guidati (10–20 min) dopo pranzo. Ripristina il sistema nervoso più velocemente del sonno.' },
    ],
    ctaHeading: 'Monitora la tua resilienza allo stress',
    ctaBody: 'Collega dati HRV, valori del cortisolo e marcatori di infiammazione nel pannello Evida Life.',
    ctaBtn: 'Scopri Health Engine',
  },
};

export default async function StressRecoveryPage() {
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
        {/* Why */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.whyHeading}</p>
          <p className="text-[#1c2a2b]/75 text-base leading-relaxed">{t.why}</p>
        </section>

        {/* Tools */}
        <section className="bg-white border-y border-[#1c2a2b]/08 py-20">
          <div className="max-w-5xl mx-auto px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.toolsHeading}</p>
            <div className="grid md:grid-cols-3 gap-6">
              {t.tools.map((tool) => (
                <div key={tool.name} className="bg-[#fafaf8] rounded-2xl p-6 flex flex-col">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ceab84] mb-2">{tool.tag}</p>
                  <h3 className="font-serif text-lg text-[#0e393d] mb-3">{tool.name}</h3>
                  <p className="text-[#1c2a2b]/65 text-sm leading-relaxed mb-4">{tool.desc}</p>
                  <ul className="mt-auto space-y-1.5">
                    {tool.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-xs text-[#1c2a2b]/70">
                        <span className="text-[#ceab84] mt-0.5">—</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Protocols */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-10">{t.protocolsHeading}</p>
          <div className="grid md:grid-cols-2 gap-6">
            {t.protocols.map((p, i) => (
              <div key={i} className="bg-white border border-[#1c2a2b]/10 rounded-2xl p-6">
                <h3 className="font-serif text-lg text-[#0e393d] mb-2">{p.title}</h3>
                <p className="text-[#1c2a2b]/65 text-sm leading-relaxed">{p.body}</p>
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
