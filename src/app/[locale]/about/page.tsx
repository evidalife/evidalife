import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Über uns – Evida Life' };

type Lang = 'de' | 'en';

const T = {
  de: {
    eyebrow: 'Über uns',
    heroHead: 'Gesundheit, die auf Wissenschaft basiert.',
    heroSub: 'Evida Life verbindet modernste Diagnostik mit evidenzbasierter Ernährungsforschung – damit du informierte Entscheidungen für ein längeres, gesünderes Leben treffen kannst.',

    missionEyebrow: 'Unsere Mission',
    missionHead: 'Jedem Menschen ermöglichen, sein biologisches Potenzial auszuschöpfen.',
    missionBody: 'Wir glauben, dass Krankheiten, die uns vorzeitig altern lassen, in vielen Fällen durch Ernährung und Lebensstil beeinflusst werden können. Unser Ziel ist es, die besten verfügbaren wissenschaftlichen Erkenntnisse verständlich zu machen und mit konkreten Werkzeugen zu verbinden – von Biomarker-Analysen bis zu täglichen Gewohnheiten.',

    visionEyebrow: 'Unsere Vision',
    visionHead: 'Eine Welt ohne vermeidbare chronische Erkrankungen.',
    visionBody: 'Chronische Erkrankungen wie Typ-2-Diabetes, Herzerkrankungen und bestimmte Krebsarten sind zu einem grossen Teil durch Lebensstilentscheidungen beeinflusst. Wir sehen eine Zukunft, in der präventive Diagnostik und pflanzliche Ernährung Standard sind – nicht Ausnahme.',

    whyEyebrow: 'Warum pflanzlich?',
    whyHead: 'Die Wissenschaft zeigt einen klaren Weg.',
    whyPoints: [
      { title: 'Herzgesundheit', body: 'Pflanzliche Ernährung ist die einzige Ernährungsweise, die koronare Herzerkrankungen nachweislich umkehren kann – belegt durch jahrzehntelange klinische Studien.' },
      { title: 'Entzündungsreduktion', body: 'Phytonährstoffe aus Gemüse, Früchten und Hülsenfrüchten wirken entzündungshemmend und schützen vor oxidativem Stress.' },
      { title: 'Darmgesundheit', body: 'Ein hoher Ballaststoffgehalt fördert ein diverses Darmmikrobiom – die Basis für Immunsystem, Stimmung und Stoffwechsel.' },
      { title: 'Langlebigkeit', body: 'Bevölkerungen in den sogenannten Blue Zones ernähren sich vorwiegend pflanzlich und erreichen überdurchschnittliche Lebenserwartungen.' },
    ],

    scienceEyebrow: 'Unser Ansatz',
    scienceHead: 'Nicht Trends, sondern Evidenz.',
    scienceBody: 'Wir stützen uns auf peer-reviewed Studien, meta-analytische Reviews und klinische Daten. Unser Team sichtet kontinuierlich neue Forschung und integriert sie in unsere Empfehlungen. Jede Aussage auf unserer Plattform ist belegbar.',

    founderEyebrow: 'Gründerteam',
    founderHead: 'Gegründet mit einer persönlichen Überzeugung.',
    founderBody: 'Evida Life entstand aus der Überzeugung, dass die Wissenschaft über Ernährung und Gesundheit breiter zugänglich sein muss. Unser Gründungsteam vereint Expertise in Medizin, Datenwissenschaft und Produktentwicklung – mit der gemeinsamen Überzeugung, dass Prävention besser ist als Behandlung.',
    founderName: 'Gründer & CEO',
    founderRole: 'Evida Life AG',
  },
  en: {
    eyebrow: 'About us',
    heroHead: 'Health built on science.',
    heroSub: 'Evida Life combines cutting-edge diagnostics with evidence-based nutrition research so you can make informed decisions for a longer, healthier life.',

    missionEyebrow: 'Our mission',
    missionHead: 'Empower every person to reach their biological potential.',
    missionBody: 'We believe that diseases that age us prematurely can in many cases be influenced by nutrition and lifestyle. Our goal is to make the best available scientific evidence understandable and connect it to concrete tools — from biomarker analysis to daily habits.',

    visionEyebrow: 'Our vision',
    visionHead: 'A world without preventable chronic disease.',
    visionBody: 'Chronic diseases like type-2 diabetes, heart disease, and certain cancers are largely driven by lifestyle choices. We envision a future where preventive diagnostics and whole-food plant-based nutrition are the standard — not the exception.',

    whyEyebrow: 'Why plant-based?',
    whyHead: 'The science points in a clear direction.',
    whyPoints: [
      { title: 'Heart health', body: 'A whole-food plant-based diet is the only diet clinically proven to reverse coronary artery disease — supported by decades of clinical evidence.' },
      { title: 'Reduced inflammation', body: 'Phytonutrients from vegetables, fruits, and legumes act as natural anti-inflammatories and protect against oxidative stress.' },
      { title: 'Gut health', body: 'High fibre intake promotes a diverse gut microbiome — the foundation of immune function, mood, and metabolism.' },
      { title: 'Longevity', body: 'Populations in so-called Blue Zones eat predominantly plant-based diets and achieve above-average life expectancy.' },
    ],

    scienceEyebrow: 'Our approach',
    scienceHead: 'Evidence, not trends.',
    scienceBody: 'We rely on peer-reviewed studies, meta-analytic reviews, and clinical data. Our team continuously monitors new research and integrates it into our recommendations. Every claim on our platform is traceable to a source.',

    founderEyebrow: 'Founding team',
    founderHead: 'Founded with a personal conviction.',
    founderBody: 'Evida Life was born from the belief that the science of nutrition and health needs to be more widely accessible. Our founding team brings together expertise in medicine, data science, and product development — united by the conviction that prevention is better than treatment.',
    founderName: 'Founder & CEO',
    founderRole: 'Evida Life AG',
  },
};

export default async function AboutPage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1">

        {/* Hero */}
        <section className="w-full bg-[#0e393d] px-6 py-24">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-6">{t.heroHead}</h1>
            <p className="text-white/65 text-lg leading-relaxed max-w-2xl">{t.heroSub}</p>
          </div>
        </section>

        {/* Mission */}
        <section className="w-full max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.missionEyebrow}</p>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-6 leading-snug">{t.missionHead}</h2>
          <p className="text-[#1c2a2b]/65 text-base leading-relaxed">{t.missionBody}</p>
        </section>

        <div className="max-w-3xl mx-auto px-6"><hr className="border-[#0e393d]/10" /></div>

        {/* Vision */}
        <section className="w-full max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.visionEyebrow}</p>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-6 leading-snug">{t.visionHead}</h2>
          <p className="text-[#1c2a2b]/65 text-base leading-relaxed">{t.visionBody}</p>
        </section>

        {/* Why plant-based */}
        <section className="w-full bg-white border-y border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.whyEyebrow}</p>
            <h2 className="font-serif text-3xl text-[#0e393d] mb-10 leading-snug">{t.whyHead}</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {t.whyPoints.map((point) => (
                <div key={point.title} className="rounded-2xl border border-[#0e393d]/10 p-6">
                  <div className="w-8 h-0.5 bg-[#ceab84] mb-4" />
                  <h3 className="font-serif text-lg text-[#0e393d] mb-2">{point.title}</h3>
                  <p className="text-sm text-[#1c2a2b]/60 leading-relaxed">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Science approach */}
        <section className="w-full max-w-3xl mx-auto px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.scienceEyebrow}</p>
          <h2 className="font-serif text-3xl text-[#0e393d] mb-6 leading-snug">{t.scienceHead}</h2>
          <p className="text-[#1c2a2b]/65 text-base leading-relaxed">{t.scienceBody}</p>
        </section>

        {/* Founder */}
        <section className="w-full bg-white border-t border-[#0e393d]/10 px-6 py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.founderEyebrow}</p>
            <h2 className="font-serif text-3xl text-[#0e393d] mb-8 leading-snug">{t.founderHead}</h2>
            <div className="flex items-start gap-6">
              <div className="shrink-0 w-20 h-20 rounded-full bg-[#0e393d]/8 border-2 border-[#0e393d]/12 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-[#0e393d]/30">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[#1c2a2b]/65 text-base leading-relaxed mb-4">{t.founderBody}</p>
                <p className="text-sm font-semibold text-[#0e393d]">{t.founderName}</p>
                <p className="text-xs text-[#1c2a2b]/45">{t.founderRole}</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      <PublicFooter />
    </div>
  );
}
