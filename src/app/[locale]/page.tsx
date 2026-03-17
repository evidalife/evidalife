'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { supabase } from '@/lib/supabase';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

type Locale = 'de' | 'en';

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

const CARD_IMGS = [IMGS.lab, IMGS.dozen, IMGS.recipe, IMGS.shop];
const STEP_IMGS = [IMGS.step1, IMGS.step2, IMGS.step3];

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
  const t = useTranslations('');
  const locale = useLocale() as Locale;

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cards = t.raw('cards') as { title: string; desc: string }[];
  const steps = t.raw('steps.items') as { n: string; title: string; desc: string }[];

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert({ email, lang: locale });
      if (error && error.code !== '23505') {
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

      <PublicNav />

      {/* ─── HERO ─── */}
      <section className="relative h-screen min-h-[620px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${IMGS.hero}')` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e393d]/80 via-[#0e393d]/45 to-[#0e393d]/10" />
        <div className="relative z-10 h-full flex flex-col justify-end pb-20">
          <div className="w-full max-w-[1060px] mx-auto px-8 md:px-12">
            <h1 className="font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white mb-5 max-w-[640px]">
              {t('hero.h1')}<br />
              <em className="italic font-normal text-white/70">{t('hero.h1em')}</em>
            </h1>
            <p className="text-[1rem] font-light text-white/70 leading-relaxed max-w-[460px] mb-10">{t('hero.sub')}</p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => scrollTo('waitlist')}
                className="bg-[#ceab84] text-[#0e393d] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#dfc4a4] whitespace-nowrap"
              >
                {t('hero.cta1')}
              </button>
              <button
                onClick={() => scrollTo('how')}
                className="text-white bg-white/10 backdrop-blur-sm border border-white/50 text-[13px] font-light px-7 py-3.5 rounded-full transition-all hover:bg-white/20 whitespace-nowrap"
              >
                {t('hero.cta2')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SPLIT STATEMENT ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 px-8 md:px-12 py-20 md:py-28 border-b border-[#0e393d]/10">
        <div>
          <h2 className="font-serif font-normal text-4xl md:text-5xl leading-[1.12] tracking-tight text-[#0e393d]">
            {t('split.heading')}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t('split.headingEm')}</em>
          </h2>
        </div>
        <div className="flex flex-col justify-start pt-1">
          <p className="text-[1rem] font-light text-[#5a6e6f] leading-relaxed mb-7">{t('split.desc')}</p>
          <button
            onClick={() => scrollTo('waitlist')}
            className="self-start bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] tracking-wide px-7 py-3.5 rounded-full transition-colors hover:bg-[#1a5055] whitespace-nowrap"
          >
            {t('hero.cta1')}
          </button>
        </div>
      </div>

      {/* ─── FEATURE CARDS ─── */}
      <div className="max-w-[1060px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 px-8 md:px-12 pb-20 md:pb-24">
        {cards.map((card, idx) => (
          <div
            key={card.title}
            className="rounded-2xl overflow-hidden border border-[#0e393d]/10 bg-white hover:-translate-y-1 transition-transform duration-200 cursor-pointer"
          >
            <div className="h-40 bg-cover bg-center relative" style={{ backgroundImage: `url('${CARD_IMGS[idx]}')` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/30 to-transparent" />
            </div>
            <div className="p-5 pb-6">
              <h3 className="font-serif font-normal text-[1.1rem] text-[#0e393d] mb-1.5 leading-snug">{card.title}</h3>
              <p className="text-[0.8rem] font-light text-[#5a6e6f] leading-relaxed">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── STEPS ─── */}
      <section id="how" className="bg-[#0e393d] py-20 md:py-28 px-8 md:px-12">
        <div className="max-w-[1060px] mx-auto">
          <div className="mb-14">
            <SectionTag label={t('steps.tag')} />
            <h2 className="font-serif font-normal text-4xl md:text-5xl text-white leading-[1.1] tracking-tight">
              {t('steps.heading')}<br />
              <em className="italic font-normal text-white/60">{t('steps.headingEm')}</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
            {steps.map((step, idx) => (
              <div key={step.n} className="bg-[#0e393d] hover:bg-[#1a5055] transition-colors duration-200 p-10">
                <div className="font-serif font-normal text-[4.5rem] text-white/8 leading-none mb-6">{step.n}</div>
                <div className="w-full h-32 rounded-xl bg-cover bg-center mb-5 opacity-75" style={{ backgroundImage: `url('${STEP_IMGS[idx]}')` }} />
                <h3 className="font-serif font-normal text-[1.5rem] text-white mb-2.5">{step.title}</h3>
                <p className="text-[0.83rem] font-light text-white/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WAITLIST ─── */}
      <section id="waitlist" className="max-w-[1060px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 px-8 md:px-12 py-20 md:py-28 border-t border-[#0e393d]/10">
        <div>
          <SectionTag label={t('waitlist.tag')} />
          <h2 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-[1.12] tracking-tight mb-4">
            {t('waitlist.heading')}<br />
            <em className="italic font-normal text-[#0e393d]/60">{t('waitlist.headingEm')}</em>
          </h2>
          <p className="text-[0.95rem] font-light text-[#5a6e6f] leading-relaxed mb-6">{t('waitlist.desc')}</p>
          <div className="w-full h-72 rounded-2xl bg-cover bg-center border border-[#0e393d]/10" style={{ backgroundImage: `url('${IMGS.wl}')` }} />
        </div>
        <div className="flex flex-col justify-center gap-4">
          {!submitted ? (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('waitlist.placeholder')}
                className="border border-[#0e393d]/15 bg-white rounded-xl px-5 py-3.5 text-[14px] font-light text-[#1c2a2b] placeholder:text-[#b0bfbf] outline-none focus:border-[#0e393d] transition-colors"
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#0e393d] text-[#f2ebdb] font-medium text-[13px] uppercase tracking-widest py-3.5 px-6 rounded-xl transition-colors hover:bg-[#1a5055] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? '...' : t('waitlist.cta')}
              </button>
              <p className="text-[11px] font-light text-[#b0bfbf] tracking-wide">{t('waitlist.footnote')}</p>
            </>
          ) : (
            <div className="bg-[#eaf3f0] border border-[#0e393d]/15 rounded-xl px-5 py-4 text-[13.5px] text-[#0e393d]">
              {t('waitlist.success')}
            </div>
          )}
        </div>
      </section>

      <PublicFooter />

    </div>
  );
}
