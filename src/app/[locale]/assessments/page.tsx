import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Clinical Assessments – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = (typeof VALID_LANGS)[number];

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  bookBtn: string;
  learnMore: string;
  free: string;
  includedWith: string;
  sections: {
    vitalcheck: {
      name: string;
      tag: string;
      price: string;
      intro: string;
      items: { name: string; why: string }[];
    };
    vo2max: {
      name: string;
      tag: string;
      price: string;
      intro: string;
      what: string;
      why: string;
      optimal: string;
      how: string;
      stat: string;
    };
    dexa: {
      name: string;
      tag: string;
      price: string;
      intro: string;
      what: string;
      why: string;
      results: string[];
    };
  };
}> = {
  de: {
    tag: 'KLINISCHE ASSESSMENT',
    h1: 'Miss, was zählt.',
    sub: 'Körperliche Messungen und Scans, die zeigen, was Bluttests nicht sehen können.',
    bookBtn: 'Im Shop buchen →',
    learnMore: 'Mehr erfahren →',
    free: 'Gratis',
    includedWith: 'Inklusive bei jedem Bluttest',
    sections: {
      vitalcheck: {
        name: 'Vitalcheck',
        tag: 'Körperliche Basis-Messungen',
        price: 'Gratis',
        intro: 'Bei jedem Bluttest inklusive. Sechs schnelle Messungen, die einen umfassenden Überblick über deine körperliche Gesundheit geben.',
        items: [
          { name: 'Blutdruck', why: 'Der stille Killer. Nr. 1 Risikofaktor für Herzerkrankungen. Systolisch <120 mmHg optimal. Hoher Blutdruck schädigt Blutgefässe jahrzehntelang, bevor Symptome auftreten.' },
          { name: 'Taillenumfang', why: 'Proxy für viszerales Fett – ein stärkerer Mortalitätsprädiktor als der BMI. >88 cm (Frauen) / >102 cm (Männer) erhöht das metabolische Risiko erheblich.' },
          { name: 'Griffkraft (Dynamometer)', why: 'Stärkster einzelner Prädiktor für Gesamtmortalität (Leong et al., Lancet 2015). Misst funktionelle Muskelstärke und Nervensystemintegrität.' },
          { name: 'SpO₂ & Ruheherzfrequenz', why: 'Indikatoren für kardiovaskuläre Fitness. Ruhepuls <60 bpm = ausgezeichnet. SpO₂ <95% kann auf Atemprobleme hinweisen.' },
          { name: 'AGEs-Haut-Scan', why: 'Misst Advanced Glycation End Products (AGEs) in der Haut – Ablagerungen aus Zuckerreaktion mit Proteinen. AGEs beschleunigen Alterung, Herzerkrankungen und Diabetes.' },
          { name: 'Körpergewicht', why: 'Trends sind wichtiger als einzelne Messungen. Gewichtsveränderungen über Zeit sind ein wichtiger Gesundheitsindikator.' },
        ],
      },
      vo2max: {
        name: 'VO₂max Test (CPET)',
        tag: 'Kardiovaskuläre Fitness',
        price: 'CHF 149',
        intro: 'Kardiopulmonaler Belastungstest (CPET) – der Goldstandard zur Messung deiner maximalen Sauerstoffaufnahme.',
        what: 'Was: Progressiver Belastungstest auf Laufband oder Fahrrad mit Atemmaske. Dauer 10–15 Minuten bis zur Ausbelastung. Misst, wie viel Sauerstoff dein Körper pro Kilogramm Körpergewicht pro Minute verarbeiten kann.',
        why: 'Warum: VO₂max ist der STÄRKSTE Prädiktor für Gesamtmortalität – stärker als Rauchen, Diabetes oder Herzerkrankungen. Wer von «unterdurchschnittlich» zu «überdurchschnittlich» fit wird, reduziert das Mortalitätsrisiko um 50%. (Mandsager et al., JAMA Network Open 2018)',
        optimal: 'Optimal: >40 ml/kg/min = gut, >50 = ausgezeichnet, >55 = Elite (altersadjustiert). Elite-Ausdauersportler erreichen 70–90.',
        how: 'Ablauf: Warm-up, dann progressive Steigerung alle 1–3 Minuten bis zur Erschöpfung. Kontinuierliche Messung von O₂-Verbrauch, CO₂-Abgabe, Herzfrequenz und Atemvolumen.',
        stat: '«Jede Stufe höheres kardiorespiratorisches Fitness reduziert das Mortalitätsrisiko um 13–15%.» – Mandsager et al., JAMA 2018',
      },
      dexa: {
        name: 'Körperzusammensetzung (DEXA)',
        tag: 'Körperzusammensetzung',
        price: 'CHF 129',
        intro: 'Dual-Energy-Röntgen-Absorptiometrie (DEXA) – der Goldstandard für präzise Körperzusammensetzung.',
        what: 'Was: Ein Low-Dose-Röntgenscan, der deinen Körper in drei Komponenten aufteilt: Fettmasse, Magermasse (Muskeln + Organe + Wasser) und Knochenmasse. Dauert 10–15 Minuten.',
        why: 'Warum: Körperfettanteil und viszerales Fett sind weit wichtiger als der BMI. Viszerales Fett ist metabolisch aktiv und treibt Insulinresistenz, Entzündung und Herzerkrankungen an. Muskelmasse schützt langfristig – sie ist einer der stärksten Prädiktoren für Langlebigkeit und funktionelle Unabhängigkeit im Alter.',
        results: [
          'Körperfettanteil (total & segmentär)',
          'Viszeralfett in Gramm (präziser als Taillenumfang)',
          'Lean Mass pro Gliedmasse (Sarkopenie-Screening)',
          'Knochendichte T-Score (Osteoporose-Screening)',
          'Fortschritts-Tracking über Zeit',
        ],
      },
    },
  },
  en: {
    tag: 'CLINICAL ASSESSMENT',
    h1: 'Measure what matters.',
    sub: 'Physical measurements and scans that reveal what blood tests can\'t see.',
    bookBtn: 'Book in shop →',
    learnMore: 'Learn more →',
    free: 'Free',
    includedWith: 'Included with every blood test',
    sections: {
      vitalcheck: {
        name: 'Vitalcheck',
        tag: 'Physical baseline measurements',
        price: 'Free',
        intro: 'Included with every blood test. Six quick measurements that give a comprehensive snapshot of your physical health.',
        items: [
          { name: 'Blood Pressure', why: 'The silent killer. #1 risk factor for cardiovascular disease. Systolic <120 mmHg is optimal. High blood pressure damages blood vessels for decades before symptoms appear.' },
          { name: 'Waist Circumference', why: 'Proxy for visceral fat – a stronger mortality predictor than BMI. >88 cm (women) / >102 cm (men) substantially increases metabolic risk.' },
          { name: 'Grip Strength (Dynamometer)', why: 'The single strongest predictor of all-cause mortality (Leong et al., Lancet 2015). Measures functional muscle strength and nervous system integrity.' },
          { name: 'SpO₂ & Resting Heart Rate', why: 'Indicators of cardiovascular fitness. Resting HR <60 bpm = excellent. SpO₂ <95% may indicate respiratory issues.' },
          { name: 'AGEs Skin Scan', why: 'Measures Advanced Glycation End Products (AGEs) in skin — deposits from sugar reacting with proteins. AGEs accelerate aging, heart disease and diabetes.' },
          { name: 'Body Weight', why: 'Trends matter more than single measurements. Weight change over time is an important health indicator.' },
        ],
      },
      vo2max: {
        name: 'VO₂max Test (CPET)',
        tag: 'Cardiovascular fitness',
        price: 'CHF 149',
        intro: 'Cardiopulmonary exercise test (CPET) — the gold standard for measuring your maximal oxygen uptake.',
        what: 'What: A progressive test on treadmill or bike with a breathing mask. Duration 10–15 minutes to exhaustion. Measures how much oxygen your body can process per kilogram of bodyweight per minute.',
        why: 'Why: VO₂max is the STRONGEST predictor of all-cause mortality — stronger than smoking, diabetes, or heart disease. Going from "below average" to "above average" fitness reduces mortality risk by 50%. (Mandsager et al., JAMA Network Open 2018)',
        optimal: 'Optimal: >40 mL/kg/min = good, >50 = excellent, >55 = elite (age-adjusted). Elite endurance athletes reach 70–90.',
        how: 'Protocol: Warm-up, then progressive intensity increase every 1–3 minutes to exhaustion. Continuous measurement of O₂ consumption, CO₂ output, heart rate, and breathing volume.',
        stat: '"Each fitness category improvement reduces mortality risk by 13–15%." — Mandsager et al., JAMA 2018',
      },
      dexa: {
        name: 'Body Composition (DEXA)',
        tag: 'Body composition',
        price: 'CHF 129',
        intro: 'Dual-energy X-ray absorptiometry (DEXA) — the gold standard for precise body composition analysis.',
        what: 'What: A low-dose X-ray scan that divides your body into three components: fat mass, lean mass (muscle + organs + water), and bone mass. Takes 10–15 minutes.',
        why: 'Why: Body fat percentage and visceral fat are far more important than BMI. Visceral fat is metabolically active and drives insulin resistance, inflammation, and heart disease. Muscle mass is protective long-term — it\'s one of the strongest predictors of longevity and functional independence in old age.',
        results: [
          'Body fat percentage (total & segmental)',
          'Visceral fat in grams (more precise than waist circumference)',
          'Lean mass per limb (sarcopenia screening)',
          'Bone density T-score (osteoporosis screening)',
          'Progress tracking over time',
        ],
      },
    },
  },
  fr: {
    tag: 'ÉVALUATION CLINIQUE',
    h1: 'Mesurez ce qui compte.',
    sub: 'Mesures physiques et scans qui révèlent ce que les analyses sanguines ne peuvent pas voir.',
    bookBtn: 'Réserver en boutique →',
    learnMore: 'En savoir plus →',
    free: 'Gratuit',
    includedWith: 'Inclus avec tout bilan sanguin',
    sections: {
      vitalcheck: {
        name: 'Vitalcheck',
        tag: 'Mesures physiques de référence',
        price: 'Gratuit',
        intro: 'Inclus avec tout bilan sanguin. Six mesures rapides qui donnent un aperçu complet de votre santé physique.',
        items: [
          { name: 'Pression artérielle', why: 'Le tueur silencieux. Facteur de risque n°1 pour les maladies cardiovasculaires. Systolique <120 mmHg est optimal.' },
          { name: 'Tour de taille', why: 'Indicateur de la graisse viscérale — un prédicteur de mortalité plus fort que l\'IMC. >88 cm (femmes) / >102 cm (hommes) augmente considérablement le risque métabolique.' },
          { name: 'Force de préhension (Dynamomètre)', why: 'Le plus fort prédicteur individuel de la mortalité toutes causes (Leong et al., Lancet 2015). Mesure la force musculaire fonctionnelle.' },
          { name: 'SpO₂ & FC au repos', why: 'Indicateurs de forme cardiovasculaire. FC repos <60 bpm = excellent. SpO₂ <95% peut indiquer des problèmes respiratoires.' },
          { name: 'Scan AGEs cutané', why: 'Mesure les produits de glycation avancée (AGEs) dans la peau — dépôts issus de la réaction du sucre avec les protéines. Accélèrent le vieillissement.' },
          { name: 'Poids corporel', why: 'Les tendances importent plus que les mesures uniques. La variation de poids dans le temps est un indicateur de santé important.' },
        ],
      },
      vo2max: {
        name: 'Test VO₂max (CPET)',
        tag: 'Forme cardiovasculaire',
        price: 'CHF 149',
        intro: 'Test d\'effort cardiopulmonaire (CPET) — l\'étalon-or pour mesurer votre consommation maximale d\'oxygène.',
        what: 'Quoi: Test progressif sur tapis ou vélo avec un masque respiratoire. Durée 10-15 minutes jusqu\'à épuisement. Mesure la quantité d\'oxygène que votre corps peut traiter par kilogramme de poids corporel par minute.',
        why: 'Pourquoi: Le VO₂max est le PLUS FORT prédicteur de la mortalité toutes causes — plus fort que le tabagisme, le diabète ou les maladies cardiaques. Passer de «en dessous de la moyenne» à «au-dessus de la moyenne» réduit le risque de mortalité de 50%.',
        optimal: 'Optimal: >40 mL/kg/min = bon, >50 = excellent, >55 = élite (ajusté par âge).',
        how: 'Protocole: Échauffement, puis augmentation progressive de l\'intensité toutes les 1-3 minutes jusqu\'à épuisement.',
        stat: '«Chaque amélioration de catégorie de forme physique réduit le risque de mortalité de 13-15%.» — Mandsager et al., JAMA 2018',
      },
      dexa: {
        name: 'Composition corporelle (DEXA)',
        tag: 'Composition corporelle',
        price: 'CHF 129',
        intro: 'Absorptiométrie à rayons X à double énergie (DEXA) — l\'étalon-or pour l\'analyse précise de la composition corporelle.',
        what: 'Quoi: Un scan radiographique à faible dose qui divise votre corps en trois composantes: masse grasse, masse maigre et masse osseuse. Prend 10-15 minutes.',
        why: 'Pourquoi: Le pourcentage de graisse corporelle et la graisse viscérale sont bien plus importants que l\'IMC. La graisse viscérale est métaboliquement active et favorise la résistance à l\'insuline, l\'inflammation et les maladies cardiaques.',
        results: [
          'Pourcentage de graisse corporelle (total & segmentaire)',
          'Graisse viscérale en grammes (plus précis que le tour de taille)',
          'Masse maigre par membre (dépistage de la sarcopénie)',
          'T-score de densité osseuse (dépistage de l\'ostéoporose)',
          'Suivi des progrès dans le temps',
        ],
      },
    },
  },
  es: {
    tag: 'EVALUACIÓN CLÍNICA',
    h1: 'Mide lo que importa.',
    sub: 'Mediciones físicas y escáneres que revelan lo que los análisis de sangre no pueden ver.',
    bookBtn: 'Reservar en tienda →',
    learnMore: 'Saber más →',
    free: 'Gratis',
    includedWith: 'Incluido con cualquier análisis de sangre',
    sections: {
      vitalcheck: {
        name: 'Vitalcheck',
        tag: 'Mediciones físicas de referencia',
        price: 'Gratis',
        intro: 'Incluido con cualquier análisis de sangre. Seis mediciones rápidas que ofrecen una instantánea completa de tu salud física.',
        items: [
          { name: 'Tensión arterial', why: 'El asesino silencioso. Factor de riesgo nº 1 para enfermedades cardiovasculares. Sistólica <120 mmHg es óptima.' },
          { name: 'Perímetro abdominal', why: 'Indicador de grasa visceral — un predictor de mortalidad más fuerte que el IMC. >88 cm (mujeres) / >102 cm (hombres) aumenta considerablemente el riesgo metabólico.' },
          { name: 'Fuerza de agarre (Dinamómetro)', why: 'El predictor individual más fuerte de mortalidad por todas las causas (Leong et al., Lancet 2015). Mide la fuerza muscular funcional.' },
          { name: 'SpO₂ & FC en reposo', why: 'Indicadores de forma cardiovascular. FC reposo <60 ppm = excelente. SpO₂ <95% puede indicar problemas respiratorios.' },
          { name: 'Escáner AGEs cutáneo', why: 'Mide los productos de glicación avanzada (AGEs) en la piel. Los AGEs aceleran el envejecimiento, las enfermedades cardíacas y la diabetes.' },
          { name: 'Peso corporal', why: 'Las tendencias importan más que las mediciones individuales. La variación del peso a lo largo del tiempo es un importante indicador de salud.' },
        ],
      },
      vo2max: {
        name: 'Test VO₂max (CPET)',
        tag: 'Forma cardiovascular',
        price: 'CHF 149',
        intro: 'Test de esfuerzo cardiopulmonar (CPET) — el estándar de oro para medir tu consumo máximo de oxígeno.',
        what: 'Qué: Test progresivo en cinta o bicicleta con mascarilla respiratoria. Duración 10-15 minutos hasta el agotamiento. Mide cuánto oxígeno puede procesar tu cuerpo por kilogramo de peso corporal por minuto.',
        why: 'Por qué: El VO₂max es el PREDICTOR MÁS FUERTE de mortalidad por todas las causas — más fuerte que fumar, la diabetes o las enfermedades cardíacas. Pasar de «por debajo de la media» a «por encima de la media» reduce el riesgo de mortalidad en un 50%.',
        optimal: 'Óptimo: >40 mL/kg/min = bueno, >50 = excelente, >55 = élite (ajustado por edad).',
        how: 'Protocolo: Calentamiento, luego aumento progresivo de la intensidad cada 1-3 minutos hasta el agotamiento.',
        stat: '«Cada mejora de categoría de forma física reduce el riesgo de mortalidad en un 13-15%.» — Mandsager et al., JAMA 2018',
      },
      dexa: {
        name: 'Composición corporal (DEXA)',
        tag: 'Composición corporal',
        price: 'CHF 129',
        intro: 'Absorciometría de rayos X de energía dual (DEXA) — el estándar de oro para el análisis preciso de la composición corporal.',
        what: 'Qué: Un escáner de rayos X de baja dosis que divide tu cuerpo en tres componentes: masa grasa, masa magra y masa ósea. Tarda 10-15 minutos.',
        why: 'Por qué: El porcentaje de grasa corporal y la grasa visceral son mucho más importantes que el IMC. La grasa visceral es metabólicamente activa e impulsa la resistencia a la insulina, la inflamación y las enfermedades cardíacas.',
        results: [
          'Porcentaje de grasa corporal (total y segmentario)',
          'Grasa visceral en gramos (más preciso que el perímetro abdominal)',
          'Masa magra por extremidad (cribado de sarcopenia)',
          'T-score de densidad ósea (cribado de osteoporosis)',
          'Seguimiento del progreso a lo largo del tiempo',
        ],
      },
    },
  },
  it: {
    tag: 'VALUTAZIONE CLINICA',
    h1: 'Misura ciò che conta.',
    sub: 'Misurazioni fisiche e scansioni che rivelano ciò che le analisi del sangue non possono vedere.',
    bookBtn: 'Prenota nel negozio →',
    learnMore: 'Scopri di più →',
    free: 'Gratuito',
    includedWith: 'Incluso con ogni esame del sangue',
    sections: {
      vitalcheck: {
        name: 'Vitalcheck',
        tag: 'Misurazioni fisiche di base',
        price: 'Gratuito',
        intro: 'Incluso con ogni esame del sangue. Sei misurazioni rapide che offrono un quadro completo della tua salute fisica.',
        items: [
          { name: 'Pressione arteriosa', why: 'Il killer silenzioso. Fattore di rischio n. 1 per le malattie cardiovascolari. Sistolica <120 mmHg è ottimale.' },
          { name: 'Circonferenza vita', why: 'Indicatore del grasso viscerale — un predittore di mortalità più forte dell\'IMC. >88 cm (donne) / >102 cm (uomini) aumenta notevolmente il rischio metabolico.' },
          { name: 'Forza di presa (Dinamometro)', why: 'Il più forte predittore individuale di mortalità per tutte le cause (Leong et al., Lancet 2015). Misura la forza muscolare funzionale.' },
          { name: 'SpO₂ & FC a riposo', why: 'Indicatori di forma cardiovascolare. FC riposo <60 bpm = eccellente. SpO₂ <95% può indicare problemi respiratori.' },
          { name: 'Scan AGEs cutaneo', why: 'Misura i prodotti di glicazione avanzata (AGEs) nella pelle. Gli AGEs accelerano l\'invecchiamento, le malattie cardiache e il diabete.' },
          { name: 'Peso corporeo', why: 'Le tendenze contano più delle misurazioni singole. La variazione del peso nel tempo è un importante indicatore di salute.' },
        ],
      },
      vo2max: {
        name: 'Test VO₂max (CPET)',
        tag: 'Forma cardiovascolare',
        price: 'CHF 149',
        intro: 'Test da sforzo cardiopolmonare (CPET) — lo standard oro per misurare il consumo massimo di ossigeno.',
        what: 'Cosa: Test progressivo su tapis roulant o bicicletta con maschera respiratoria. Durata 10-15 minuti fino all\'esaurimento. Misura quanto ossigeno il tuo corpo può elaborare per chilogrammo di peso corporeo al minuto.',
        why: 'Perché: Il VO₂max è il PIÙ FORTE predittore di mortalità per tutte le cause — più forte del fumo, del diabete o delle malattie cardiache. Passare da «sotto la media» a «sopra la media» riduce il rischio di mortalità del 50%.',
        optimal: 'Ottimale: >40 mL/kg/min = buono, >50 = eccellente, >55 = élite (aggiustato per età).',
        how: 'Protocollo: Riscaldamento, poi aumento progressivo dell\'intensità ogni 1-3 minuti fino all\'esaurimento.',
        stat: '«Ogni miglioramento di categoria di forma fisica riduce il rischio di mortalità del 13-15%.» — Mandsager et al., JAMA 2018',
      },
      dexa: {
        name: 'Composizione corporea (DEXA)',
        tag: 'Composizione corporea',
        price: 'CHF 129',
        intro: 'Assorbimetria a raggi X a doppia energia (DEXA) — lo standard oro per l\'analisi precisa della composizione corporea.',
        what: 'Cosa: Una scansione a raggi X a bassa dose che divide il corpo in tre componenti: massa grassa, massa magra e massa ossea. Richiede 10-15 minuti.',
        why: 'Perché: La percentuale di grasso corporeo e il grasso viscerale sono molto più importanti dell\'IMC. Il grasso viscerale è metabolicamente attivo e favorisce la resistenza all\'insulina, l\'infiammazione e le malattie cardiache.',
        results: [
          'Percentuale di grasso corporeo (totale e segmentale)',
          'Grasso viscerale in grammi (più preciso della circonferenza vita)',
          'Massa magra per arto (screening della sarcopenia)',
          'T-score della densità ossea (screening dell\'osteoporosi)',
          'Monitoraggio dei progressi nel tempo',
        ],
      },
    },
  },
};

function SectionBadge({ text }: { text: string }) {
  return (
    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ceab84] bg-[#ceab84]/15 rounded-full px-3 py-1 mb-2">
      {text}
    </span>
  );
}

export default async function AssessmentsPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const s = t.sections;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]">{t.tag}</p>
          <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">{t.h1}</h1>
          <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">{t.sub}</p>
        </div>

        {/* ── 1. Vitalcheck ─────────────────────────────────────────────────── */}
        <section className="mb-16 rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden">
          <div className="bg-[#0e393d]/3 px-8 py-6 flex items-center justify-between gap-4">
            <div>
              <SectionBadge text={s.vitalcheck.tag} />
              <h2 className="font-serif text-2xl text-[#0e393d]">{s.vitalcheck.name}</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="font-serif text-2xl text-emerald-600">{s.vitalcheck.price}</p>
              <p className="text-xs text-[#1c2a2b]/40 mt-0.5">{t.includedWith}</p>
            </div>
          </div>
          <div className="px-8 py-6">
            <p className="text-sm text-[#1c2a2b]/60 leading-relaxed mb-6">{s.vitalcheck.intro}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.vitalcheck.items.map((item) => (
                <div key={item.name} className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                  <h3 className="font-medium text-sm text-[#0e393d] mb-1.5">{item.name}</h3>
                  <p className="text-xs text-[#1c2a2b]/55 leading-relaxed">{item.why}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. VO₂max ─────────────────────────────────────────────────────── */}
        <section className="mb-16 rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden">
          <div className="bg-[#0e393d] px-8 py-6 flex items-center justify-between gap-4">
            <div>
              <SectionBadge text={s.vo2max.tag} />
              <h2 className="font-serif text-2xl text-white">{s.vo2max.name}</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="font-serif text-2xl text-[#ceab84]">{s.vo2max.price}</p>
            </div>
          </div>
          <div className="px-8 py-6 space-y-4">
            <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{s.vo2max.intro}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                <p className="text-xs text-[#1c2a2b]/70 leading-relaxed">{s.vo2max.what}</p>
              </div>
              <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                <p className="text-xs text-[#1c2a2b]/70 leading-relaxed">{s.vo2max.why}</p>
              </div>
              <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                <p className="text-xs text-[#1c2a2b]/70 leading-relaxed">{s.vo2max.optimal}</p>
              </div>
              <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                <p className="text-xs text-[#1c2a2b]/70 leading-relaxed">{s.vo2max.how}</p>
              </div>
            </div>
            <blockquote className="border-l-2 border-[#ceab84] pl-4 text-sm italic text-[#1c2a2b]/50">
              {s.vo2max.stat}
            </blockquote>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-block bg-[#0e393d] text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-[#0e393d]/90 transition-colors"
              >
                {t.bookBtn}
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3. DEXA ───────────────────────────────────────────────────────── */}
        <section className="mb-16 rounded-2xl bg-white ring-1 ring-[#0e393d]/8 overflow-hidden">
          <div className="bg-[#ceab84]/15 px-8 py-6 flex items-center justify-between gap-4">
            <div>
              <SectionBadge text={s.dexa.tag} />
              <h2 className="font-serif text-2xl text-[#0e393d]">{s.dexa.name}</h2>
            </div>
            <div className="text-right shrink-0">
              <p className="font-serif text-2xl text-[#0e393d]">{s.dexa.price}</p>
            </div>
          </div>
          <div className="px-8 py-6 space-y-4">
            <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{s.dexa.intro}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                <p className="text-xs text-[#1c2a2b]/70 leading-relaxed">{s.dexa.what}</p>
              </div>
              <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-4">
                <p className="text-xs text-[#1c2a2b]/70 leading-relaxed">{s.dexa.why}</p>
              </div>
            </div>
            <div className="rounded-xl bg-[#fafaf8] ring-1 ring-[#0e393d]/6 p-5">
              <ul className="space-y-2">
                {s.dexa.results.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-[#1c2a2b]/70">
                    <svg className="mt-0.5 shrink-0 text-emerald-500" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7l3 3L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-block bg-[#0e393d] text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-[#0e393d]/90 transition-colors"
              >
                {t.bookBtn}
              </Link>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
