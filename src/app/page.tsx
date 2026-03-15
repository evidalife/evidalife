'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

type Lang = 'de' | 'en';

interface CardData { t: string; d: string; img: string; }
interface StepData { n: string; t: string; d: string; img: string; }

interface Translations {
  brand: string;
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
  footerCoLabel: string;
  footerCoItems: string[];
}

const NAV_ITEMS = ['Kitchen', 'Health', 'Fit', 'Shop'] as const;
type NavItem = typeof NAV_ITEMS[number];

const DROPDOWNS: Record<Lang, Record<NavItem, (string | null)[]>> = {
  de: {
    Kitchen: ['Wie starten', 'Daily Dozen', 'Rezepte', 'Restaurant'],
    Health: ['Health Engine ⚡', 'Blutwerte & Biomarker', 'BioAge', 'Interventionen'],
    Fit: ['Schlaf', 'Bewegung', 'Stress & Recovery', null, 'Coaching'],
    Shop: ['Test Pakete', 'Lebensmittel', 'Eat@Home Abo', null, 'Warenkorb & Checkout', 'Meine Bestellungen'],
  },
  en: {
    Kitchen: ['How to start', 'Daily Dozen', 'Recipes', 'Restaurant'],
    Health: ['Health Engine ⚡', 'Blood Values & Biomarkers', 'BioAge', 'Interventions'],
    Fit: ['Sleep', 'Exercise', 'Stress & Recovery', null, 'Coaching'],
    Shop: ['Test Packages', 'Food', 'Eat@Home Subscription', null, 'Cart & Checkout', 'My Orders'],
  },
};

const IMGS = {
  hero:   'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80',
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
    navCta: 'Warteliste',
    h1: 'Gesund leben.',
    h1em: 'Wissenschaftlich fundiert.',
    sub: 'Evidenzgestützte, vollwertige, pflanzenbasierte Ernährung – kombiniert mit messbaren Gesundheitsmarkern. Gesundheit für jeden erschwinglich.',
    cta1: 'Zur Warteliste',
    cta2: 'Wie es funktioniert',
    ctaFull: 'Jetzt eintragen',
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
    copy: '© 2026 Evida Life AG · Schweiz · Alle Rechte vorbehalten',
    footerCoLabel: 'Unternehmen',
    footerCoItems: ['Über uns', 'Team', 'Partner Labs', 'Kontakt'],
  },
  en: {
    brand: 'EVIDA LIFE',
    navCta: 'Waitlist',
    h1: 'Live well.',
    h1em: 'Scientifically grounded.',
    sub: 'Evidence-based, whole-food, plant-based nutrition – combined with measurable health markers. Quality health, made affordable for everyone.',
    cta1: 'Join the waitlist',
    cta2: 'How it works',
    ctaFull: 'Sign up now',
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
    copy: '© 2026 Evida Life AG · Switzerland · All rights reserved',
    footerCoLabel: 'Company',
    footerCoItems: ['About us', 'Team', 'Partner Labs', 'Contact'],
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
  const getInitialLang = (): Lang => {
    if (typeof window === 'undefined') return 'de';
    const saved = localStorage.getItem('evida-lang') as Lang | null;
    if (saved === 'de' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'de';
  };

  const [lang, setLang] = useState<Lang>(getInitialLang);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<NavItem | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedItem, setMobileExpandedItem] = useState<NavItem | null>(null);
  const t = T[lang];

  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('evida-lang', l);
  };

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({ email, lang });
      if (error && error.code !== '23505') {
        // 23505 = unique violation (email already registered) — treat as success
        console.error(error);
        setSubmitting(false);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="font-sans bg-[#fafaf8] text-[#1c2a2b] overflow-x-hidden">

      {/* ─── FLOATING NAV ─── */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1060px] z-50">
        <nav
          className="flex items-center justify-between px-5 py-3 bg-white/90 backdrop-blur-md rounded-full border border-white/70 shadow-[0_4px_24px_rgba(14,57,61,0.1)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Image src="/evida-logo.png" alt="Evida Life" width={34} height={34} className="rounded-full" />
            <span className="font-medium text-[0.8rem] tracking-[0.16em] uppercase text-[#0e393d]">
              {t.brand}
            </span>
          </div>

          {/* Desktop nav items with dropdowns */}
          <div className="hidden md:flex gap-6 items-center">
            {NAV_ITEMS.map((item) => (
              <div
                key={item}
                className="relative"
                onMouseEnter={() => setOpenDropdown(item)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  onClick={() => setOpenDropdown(openDropdown === item ? null : item)}
                  className="flex items-center gap-1 text-[0.8rem] font-light text-[#5a6e6f] cursor-pointer hover:text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors px-3 py-1.5 rounded-full"
                >
                  {item}
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className={`transition-transform duration-200 ${openDropdown === item ? 'rotate-180' : ''}`}
                  >
                    <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {openDropdown === item && (
                  /* pt-2 transparent bridge prevents closing when mouse crosses the gap */
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div
                      className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 py-1.5 min-w-[210px]"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
                      {DROPDOWNS[lang][item].map((dropItem, i) =>
                        dropItem === null ? (
                          <div key={`div-${i}`} className="h-px bg-[#0e393d]/10 mx-4 my-1.5" />
                        ) : (
                          <button
                            key={dropItem}
                            className="w-full text-left px-5 py-2.5 text-[13px] font-light text-[#1c2a2b] hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                          >
                            {dropItem}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right side: mobile hamburger + lang toggle + CTA */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger — only on small screens */}
            <button
              onClick={() => { setMobileOpen(!mobileOpen); setMobileExpandedItem(null); }}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-full text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors"
              aria-label="Menu"
            >
              {mobileOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="#0e393d" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="#0e393d" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {/* Lang toggle */}
            <div
              className="relative"
              onMouseEnter={() => setLangOpen(true)}
              onMouseLeave={() => setLangOpen(false)}
            >
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors"
              >
                <span className="uppercase tracking-wider">{lang.toUpperCase()}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {langOpen && (
                <div
                  className="absolute right-0 top-full pt-2 z-50"
                >
                  <div
                    className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.12)] border border-[#0e393d]/8 min-w-[140px] py-1.5"
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}
                  >
                  {([['de', 'Deutsch'], ['en', 'English']] as [Lang, string][]).map(([l, label]) => (
                    <button
                      key={l}
                      onClick={() => { changeLang(l); setLangOpen(false); }}
                      className={`w-full text-left px-5 py-2.5 text-[13px] transition-colors ${
                        lang === l
                          ? 'text-[#0e393d] font-medium'
                          : 'text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-[#0e393d]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  </div>
                </div>
              )}
            </div>

            {/* Waitlist CTA */}
            <button
              onClick={() => scrollTo('waitlist')}
              className="bg-[#0e393d] text-[#f2ebdb] text-[12px] font-medium px-5 py-2 rounded-full tracking-wide transition-colors hover:bg-[#1a5055] whitespace-nowrap"
            >
              {t.navCta}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown panel — appears below the pill */}
        {mobileOpen && (
          <div
            className="md:hidden mt-2 bg-white/96 backdrop-blur-md rounded-3xl border border-[#0e393d]/8 shadow-[0_8px_32px_rgba(14,57,61,0.14)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'dropdownIn 0.18s ease-out' }}
          >
            {NAV_ITEMS.map((item, i) => (
              <div key={item} className={i !== 0 ? 'border-t border-[#0e393d]/6' : ''}>
                <button
                  onClick={() => setMobileExpandedItem(mobileExpandedItem === item ? null : item)}
                  className="w-full flex items-center justify-between px-6 py-4 text-[14px] font-medium text-[#0e393d]"
                >
                  {item}
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className={`transition-transform duration-200 ${mobileExpandedItem === item ? 'rotate-180' : ''}`}
                  >
                    <path d="M2 4l4 4 4-4" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {mobileExpandedItem === item && (
                  <div className="pb-2">
                    {DROPDOWNS[lang][item].map((dropItem, j) =>
                      dropItem === null ? (
                        <div key={`div-${j}`} className="h-px bg-[#0e393d]/8 mx-6 my-1" />
                      ) : (
                        <button
                          key={dropItem}
                          onClick={() => setMobileOpen(false)}
                          className="w-full text-left px-8 py-2.5 text-[13px] font-light text-[#5a6e6f]"
                        >
                          {dropItem}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transparent overlay — closes mobile menu on outside tap */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setMobileOpen(false); setMobileExpandedItem(null); }}
        />
      )}

      {/* ─── HERO ─── */}
      <section className="relative h-screen min-h-[620px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${IMGS.hero}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e393d]/80 via-[#0e393d]/45 to-[#0e393d]/10" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-20">
          <div className="w-full max-w-[1060px] mx-auto px-8 md:px-12">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white mb-5 max-w-[640px]">
              {t.h1}<br />
              <em className="italic font-normal text-white/70">{t.h1em}</em>
            </h1>
            <p className="text-[1rem] font-light text-white/70 leading-relaxed max-w-[460px] mb-10">{t.sub}</p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => scrollTo('waitlist')}
                className="bg-[#ceab84] text-[#0e393d] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
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
        </div>
      </section>

      {/* ─── SPLIT STATEMENT ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 px-8 md:px-12 py-20 md:py-28 border-b border-[#0e393d]/10">
        <div>
          <h2 className="font-serif font-normal text-4xl md:text-5xl leading-[1.12] tracking-tight text-[#0e393d]">
            {t.splitH}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t.splitHem}</em>
          </h2>
        </div>
        <div className="flex flex-col justify-start pt-1">
          <p className="text-[1rem] font-light text-[#5a6e6f] leading-relaxed mb-7">{t.splitD}</p>
          <button
            onClick={() => scrollTo('waitlist')}
            className="self-start bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
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
            className="rounded-2xl overflow-hidden border border-[#0e393d]/10 bg-white hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
          >
            <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${card.img}')` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/30 to-transparent" />
            </div>
            <div className="p-5 pb-6">
              <h3 className="font-serif font-normal text-[1.1rem] text-[#0e393d] mb-1.5 leading-snug">{card.t}</h3>
              <p className="text-[0.8rem] font-light text-[#5a6e6f] leading-relaxed">{card.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── STEPS ─── */}
      <section id="how" className="bg-[#0e393d] py-20 md:py-28 px-8 md:px-12">
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
              <div key={step.n} className="bg-[#0e393d] hover:bg-[#1a5055] transition-colors duration-200 p-10">
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
      <section id="waitlist" className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 px-8 md:px-12 py-20 md:py-28 border-t border-[#0e393d]/10">
        <div>
          <SectionTag label={t.wlTag} />
          <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.12] tracking-tight mb-4">
            {t.wlH}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t.wlHem}</em>
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed mb-6">{t.wlD}</p>
          <div className="w-full h-72 rounded-2xl bg-cover bg-center border border-[#0e393d]/10" style={{ backgroundImage: `url('${IMGS.wl}')` }} />
        </div>
        <div className="flex flex-col justify-center gap-4">
          {!submitted ? (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.ph}
                className="border border-[#0e393d]/15 bg-white rounded-xl px-5 py-3.5 text-[14px] font-light text-[#1c2a2b] placeholder:text-[#b0bfbf] outline-none focus:border-[#0e393d] transition-colors"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] uppercase tracking-widest py-3.5 px-6 rounded-xl transition-colors hover:bg-[#1a5055] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : t.ctaFull}
              </button>
              <p className="text-[11px] font-light text-[#b0bfbf] tracking-wide">{t.fn}</p>
            </>
          ) : (
            <div className="bg-[#eaf3f0] border border-[#0e393d]/15 rounded-xl px-5 py-4 text-[13.5px] text-[#0e393d]">
              {t.ok}
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0e393d] border-t-[3px] border-[#ceab84] px-8 md:px-12 pt-14 pb-8">
        <div className="max-w-[1060px] mx-auto">

          {/* Top row: logo + nav columns */}
          <div className="flex flex-col md:flex-row md:justify-between gap-10 md:gap-8 pb-10 border-b border-white/10">

            {/* Logo */}
            <div className="flex items-center gap-3 md:flex-shrink-0 md:self-start">
              <Image src="/evida-logo.png" alt="Evida Life" width={30} height={30} className="rounded-full opacity-80" />
              <span className="text-[0.78rem] font-medium tracking-[0.2em] uppercase text-[#f2ebdb]/55">{t.brand}</span>
            </div>

            {/* Nav columns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-14">

              {/* Platform */}
              <div>
                <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">Platform</h4>
                <ul className="space-y-2.5">
                  {['Kitchen', 'Health', 'Fit', 'Shop', 'Health Engine'].map((item) => (
                    <li key={item}>
                      <span className="text-[13px] font-light text-white/38 hover:text-white/65 cursor-default transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">{t.footerCoLabel}</h4>
                <ul className="space-y-2.5">
                  {t.footerCoItems.map((item) => (
                    <li key={item}>
                      <span className="text-[13px] font-light text-white/38 hover:text-white/65 cursor-default transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  {[t.fp1, t.fp2, t.fp3].map((item) => (
                    <li key={item}>
                      <span className="text-[13px] font-light text-white/38 hover:text-white/65 cursor-default transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* Bottom: copyright */}
          <div className="pt-6 text-[11px] font-light text-white/20 tracking-wide">{t.copy}</div>

        </div>
      </footer>

    </div>
  );
}
