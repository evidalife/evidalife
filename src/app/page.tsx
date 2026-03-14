'use client';

import { useState } from 'react';
import Image from 'next/image';

type Lang = 'de' | 'en';

interface CardData { t: string; d: string; img: string; }
interface StepData { n: string; t: string; d: string; img: string; }

interface Translations {
  brand: string;
  n1: string; n2: string; n3: string; n4: string;
  navCta: string;
  h1: string; h1em: string;
  sub: string;
  cta1: string; cta2: string; ctaFull: string;
  splitH: string; splitHem: string; splitD: string;
  cards: CardData[];
  howTag: string; howH: string; howHem: string;
  steps: StepData[];
  wlTag: string; wlH: string; wlHem: string; wlD: string;
  ph: string; fn: string; ok: string;
  fp1: string; fp2: string; fp3: string;
  copy: string;
}

const IMGS = {
  hero:   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1600&q=80',
  lab:    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
  dozen:  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80',
  recipe: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80',
  shop:   'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
  step1:  'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&q=80',
  step2:  'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
  step3:  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  wl:     'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80',
};

const T: Record<Lang, Translations> = {
  de: {
    brand: 'EVIDA LIFE',
    n1: 'Ernährung', n2: 'Laborwerte', n3: 'Daily Dozen', n4: 'Shop',
    navCta: 'Früher Zugang',
    h1: 'Gesund leben.',
    h1em: 'Wissenschaftlich fundiert.',
    sub: 'Evidenzgestützte, vollwertige, pflanzenbasierte Ernährung – kombiniert mit messbaren Gesundheitsmarkern. Gesundheit für jeden erschwinglich.',
    cta1: 'Früher Zugang sichern',
    cta2: 'Wie es funktioniert',
    ctaFull: 'Jetzt auf die Warteliste',
    splitH: 'Mehr als nur',
    splitHem: 'Informationen.',
    splitD: 'Wir stellen nicht nur Wissen zur Verfügung – wir machen positive Veränderungen messbar. Mit Partnerlaboren, täglichem Tracking und deinem persönlichen Longevity Score siehst du, wie deine Ernährung deine Gesundheit wirklich beeinflusst.',
    cards: [
      { t: 'Laborwerte & Score', d: 'Alle Biomarker in einem Dashboard. Dein Longevity Score zeigt deinen Fortschritt in Echtzeit.', img: IMGS.lab },
      { t: 'Daily Dozen Tracker', d: 'Die 12 Lebensmittelgruppen nach Dr. Michael Greger – täglich tracken, einfach umsetzen.', img: IMGS.dozen },
      { t: 'Rezeptdatenbank', d: 'Leckere, vollwertige Gerichte passend zu deinen Gesundheitszielen und dem Daily Dozen.', img: IMGS.recipe },
      { t: 'Shop & Pakete', d: 'Labortest-Pakete und mehr – Gesundheit für jeden erschwinglich. Einfach buchen.', img: IMGS.shop },
    ],
    howTag: 'So funktioniert es',
    howH: 'Drei Schritte zu',
    howHem: 'messbarer Gesundheit',
    steps: [
      { n: '01', t: 'Messen', d: 'Partnerlabore analysieren deine wichtigsten Gesundheits- und Longevity-Marker. Alle Werte übersichtlich in deinem persönlichen Dashboard.', img: IMGS.step1 },
      { n: '02', t: 'Ernähren', d: 'Vollwertige, pflanzenbasierte Ernährung nach Dr. Gregers Daily Dozen. Mit Rezepten, Tipps und täglichem Tracking in der App.', img: IMGS.step2 },
      { n: '03', t: 'Verbessern', d: 'Dein Longevity Score zeigt messbar, wie deine Ernährung deine Biomarker beeinflusst. Klar. Verständlich. Motivierend.', img: IMGS.step3 },
    ],
    wlTag: 'Früher Zugang',
    wlH: 'Sei dabei,',
    wlHem: 'von Anfang an.',
    wlD: 'Trag dich ein und erhalte als Erster Zugang zur Plattform – inklusive exklusivem Frühzugang-Rabatt.',
    ph: 'deine@email.ch',
    fn: 'Kein Spam. Abmeldung jederzeit möglich.',
    ok: 'Danke – du bist auf der Warteliste! Wir melden uns bald.',
    fp1: 'Datenschutz', fp2: 'AGB', fp3: 'Impressum',
    copy: '© 2026 Evida Life GmbH · Schweiz · Alle Rechte vorbehalten',
  },
  en: {
    brand: 'EVIDA LIFE',
    n1: 'Nutrition', n2: 'Lab Results', n3: 'Daily Dozen', n4: 'Shop',
    navCta: 'Early access',
    h1: 'Live well.',
    h1em: 'Scientifically grounded.',
    sub: 'Evidence-based, whole-food, plant-based nutrition – combined with measurable health markers. Quality health, made affordable for everyone.',
    cta1: 'Secure early access',
    cta2: 'How it works',
    ctaFull: 'Join the waitlist now',
    splitH: 'More than just',
    splitHem: 'information.',
    splitD: "We don't just provide knowledge – we make positive change measurable. With partner labs, daily tracking and your personal Longevity Score, you see exactly how your nutrition affects your health.",
    cards: [
      { t: 'Lab results & score', d: 'All biomarkers in one dashboard. Your Longevity Score tracks your progress in real time.', img: IMGS.lab },
      { t: 'Daily Dozen tracker', d: "Dr. Michael Greger's 12 food groups – track daily, simple to implement.", img: IMGS.dozen },
      { t: 'Recipe database', d: 'Delicious whole-food dishes matched to your health goals and the Daily Dozen.', img: IMGS.recipe },
      { t: 'Shop & packages', d: 'Lab test packages and more – quality health made affordable. Easy to book.', img: IMGS.shop },
    ],
    howTag: 'How it works',
    howH: 'Three steps to',
    howHem: 'measurable health',
    steps: [
      { n: '01', t: 'Measure', d: 'Partner labs analyse your most important health and longevity markers. All results clearly visible in your personal dashboard.', img: IMGS.step1 },
      { n: '02', t: 'Nourish', d: "Whole-food, plant-based nutrition following Dr. Greger's Daily Dozen. With recipes, tips, and daily tracking built into the app.", img: IMGS.step2 },
      { n: '03', t: 'Improve', d: 'Your Longevity Score shows measurably how your nutrition affects your biomarkers. Clear. Understandable. Motivating.', img: IMGS.step3 },
    ],
    wlTag: 'Early access',
    wlH: 'Be there',
    wlHem: 'from the beginning.',
    wlD: 'Sign up and be among the first to access the platform – including an exclusive early access discount.',
    ph: 'your@email.com',
    fn: 'No spam. Unsubscribe anytime.',
    ok: "You're on the waitlist – thank you! We'll be in touch soon.",
    fp1: 'Privacy policy', fp2: 'Terms', fp3: 'Imprint',
    copy: '© 2026 Evida Life GmbH · Switzerland · All rights reserved',
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

export default function HomePage() {
  const [lang, setLang] = useState<Lang>('de');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const t = T[lang];

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleSubmit = () => {
    if (!email || !email.includes('@')) return;
    // TODO: await supabase.from('waitlist').insert({ email });
    setSubmitted(true);
  };

  return (
    <div className="font-sans bg-[#fafaf8] text-[#2a3632] overflow-x-hidden">

      {/* ─── FLOATING NAV ─── */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1060px] z-50">
        <nav className="flex items-center justify-between px-5 py-3 bg-white/90 backdrop-blur-md rounded-full border border-white/70 shadow-[0_4px_24px_rgba(44,95,82,0.1)]">
          <div className="flex items-center gap-2.5">
            <Image src="/evida-logo.png" alt="Evida Life" width={34} height={34} className="rounded-full" />
            <span className="font-medium text-[0.8rem] tracking-[0.16em] uppercase text-[#2c5f52]">
              {t.brand}
            </span>
          </div>
          <div className="hidden md:flex gap-7 items-center">
            {[t.n1, t.n2, t.n3, t.n4].map((label) => (
              <a key={label} className="text-[0.8rem] font-light text-[#5a7068] cursor-pointer hover:text-[#2c5f52] transition-colors">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 bg-[#2c5f52]/8 rounded-full p-0.5">
              {(['de', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider transition-all ${
                    lang === l ? 'bg-[#2c5f52] text-[#f5efe4]' : 'text-[#5a7068] hover:text-[#2c5f52]'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => scrollTo('waitlist')}
              className="bg-[#2c5f52] text-[#f5efe4] text-[12px] font-medium px-5 py-2 rounded-full tracking-wide transition-colors hover:bg-[#3d7a6a] whitespace-nowrap"
            >
              {t.navCta}
            </button>
          </div>
        </nav>
      </div>

      {/* ─── HERO ─── */}
      <section className="relative h-screen min-h-[620px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${IMGS.hero}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1e4a3d]/82 via-[#2c5f52]/42 to-[#2c5f52]/10" />
        <div className="relative z-10 h-full flex flex-col justify-end px-8 md:px-12 pb-20 max-w-[680px]">
          <h1 className="font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white mb-5">
            {t.h1}<br />
            <em className="italic font-normal text-white/70">{t.h1em}</em>
          </h1>
          <p className="text-[1rem] font-light text-white/70 leading-relaxed max-w-[460px] mb-10">{t.sub}</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => scrollTo('waitlist')}
              className="bg-[#ceab84] text-[#2c5f52] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
            >
              {t.cta1}
            </button>
            <button
              onClick={() => scrollTo('how')}
              className="text-white bg-white/10 backdrop-blur-sm border border-white/50 text-[13px] font-light px-7 py-3.5 rounded-full transition-all hover:bg-white/20 whitespace-nowrap"
            >
              {t.cta2}
            </button>
          </div>
        </div>
      </section>

      {/* ─── SPLIT STATEMENT ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 px-8 md:px-12 py-20 md:py-28 border-b border-[#2c5f52]/10">
        <div>
          <h2 className="font-serif font-normal text-4xl md:text-5xl leading-[1.12] tracking-tight text-[#2c5f52]">
            {t.splitH}<br />
            <em className="italic font-normal text-[#5a9e8c]">{t.splitHem}</em>
          </h2>
        </div>
        <div className="flex flex-col justify-start pt-1">
          <p className="text-[1rem] font-light text-[#5a7068] leading-relaxed mb-7">{t.splitD}</p>
          <button
            onClick={() => scrollTo('waitlist')}
            className="self-start bg-[#2c5f52] text-[#f5efe4] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#3d7a6a] whitespace-nowrap"
          >
            {t.cta1}
          </button>
        </div>
      </div>

      {/* ─── FEATURE CARDS ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 px-8 md:px-12 pb-20 md:pb-24">
        {t.cards.map((card) => (
          <div
            key={card.t}
            className="rounded-2xl overflow-hidden border border-[#2c5f52]/10 bg-white hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
          >
            <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${card.img}')` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e4a3d]/30 to-transparent" />
            </div>
            <div className="p-5 pb-6">
              <h3 className="font-serif font-normal text-[1.1rem] text-[#2c5f52] mb-1.5 leading-snug">{card.t}</h3>
              <p className="text-[0.8rem] font-light text-[#5a7068] leading-relaxed">{card.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── STEPS ─── */}
      <section id="how" className="bg-[#2c5f52] py-20 md:py-28 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <div className="mb-14">
            <SectionTag label={t.howTag} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-white leading-[1.1] tracking-tight">
              {t.howH}<br />
              <em className="italic font-normal text-white/60">{t.howHem}</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {t.steps.map((step) => (
              <div key={step.n} className="bg-[#2c5f52] hover:bg-[#3d7a6a] transition-colors duration-200 p-10">
                <div className="font-serif font-normal text-[4.5rem] text-white/8 leading-none mb-6">{step.n}</div>
                <div className="w-full h-32 rounded-xl bg-cover bg-center mb-5 opacity-75" style={{ backgroundImage: `url('${step.img}')` }} />
                <h3 className="font-serif font-normal text-[1.5rem] text-white mb-2.5">{step.t}</h3>
                <p className="text-[0.83rem] font-light text-white/50 leading-relaxed">{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 px-8 md:px-12 py-20 md:py-28 border-t border-[#2c5f52]/10">
        <div>
          <SectionTag label={t.wlTag} />
          <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#2c5f52] leading-[1.12] tracking-tight mb-4">
            {t.wlH}<br />
            <em className="italic font-normal text-[#5a9e8c]">{t.wlHem}</em>
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a7068] leading-relaxed mb-6">{t.wlD}</p>
          <div className="w-full h-72 rounded-2xl bg-cover bg-center border border-[#2c5f52]/10" style={{ backgroundImage: `url('${IMGS.wl}')` }} />
        </div>
        <div className="flex flex-col justify-center gap-4">
          {!submitted ? (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.ph}
                className="border border-[#2c5f52]/15 bg-white rounded-xl px-5 py-3.5 text-[14px] font-light text-[#2a3632] placeholder:text-[#b0bfbf] outline-none focus:border-[#2c5f52] transition-colors"
              />
              <button
                onClick={handleSubmit}
                className="bg-[#2c5f52] text-[#f5efe4] font-medium text-[13px] uppercase tracking-widest py-3.5 px-6 rounded-xl transition-colors hover:bg-[#3d7a6a]"
              >
                {t.ctaFull}
              </button>
              <p className="text-[11px] font-light text-[#b0bfbf] tracking-wide">{t.fn}</p>
            </>
          ) : (
            <div className="bg-[#e8f4f0] border border-[#2c5f52]/15 rounded-xl px-5 py-4 text-[13.5px] text-[#2c5f52]">
              {t.ok}
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#2c5f52] border-t-[3px] border-[#ceab84] px-8 md:px-12 py-10">
        <div className="max-w-[1060px] mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image src="/evida-logo.png" alt="Evida Life" width={28} height={28} className="rounded-full opacity-80" />
            <span className="text-[0.78rem] font-medium tracking-[0.2em] uppercase text-[#f5efe4]/55">{t.brand}</span>
          </div>
          <div className="flex gap-8">
            {[t.fp1, t.fp2, t.fp3].map((label) => (
              <a key={label} className="text-[12px] font-light text-white/30 hover:text-white/65 cursor-pointer transition-colors">{label}</a>
            ))}
          </div>
          <div className="text-[11px] font-light text-white/20 w-full mt-1 tracking-wide">{t.copy}</div>
        </div>
      </footer>

    </div>
  );
}
