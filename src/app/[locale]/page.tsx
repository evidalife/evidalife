'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import Image from 'next/image';

type Locale = 'de' | 'en';

const NAV_ITEMS = ['Kitchen', 'Health', 'Fit', 'Shop'] as const;
type NavItem = typeof NAV_ITEMS[number];

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
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<NavItem | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedItem, setMobileExpandedItem] = useState<NavItem | null>(null);

  const cards = t.raw('cards') as { title: string; desc: string }[];
  const steps = t.raw('steps.items') as { n: string; title: string; desc: string }[];
  const footerCoItems = t.raw('footer.co.items') as string[];
  const dropdowns = t.raw('nav.dropdowns') as Record<NavItem, (string | null)[]>;

  const changeLang = (l: Locale) => {
    router.replace(pathname, { locale: l });
    setLangOpen(false);
  };

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
              {t('nav.brand')}
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
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div
                      className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 py-1.5 min-w-[210px]"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
                      {(dropdowns[item] ?? []).map((dropItem, i) =>
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
            {/* Mobile hamburger */}
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
                <span className="uppercase tracking-wider">{locale.toUpperCase()}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full pt-2 z-50">
                  <div
                    className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.12)] border border-[#0e393d]/8 min-w-[140px] py-1.5"
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}
                  >
                    {([['de', 'Deutsch'], ['en', 'English']] as [Locale, string][]).map(([l, label]) => (
                      <button
                        key={l}
                        onClick={() => changeLang(l)}
                        className={`w-full text-left px-5 py-2.5 text-[13px] transition-colors ${
                          locale === l
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

            {/* Login / User */}
            {user ? (
              <Link
                href="/dashboard"
                className="bg-[#0e393d] text-[#f2ebdb] text-[12px] font-medium px-5 py-2 rounded-full tracking-wide transition-colors hover:bg-[#1a5055] whitespace-nowrap"
              >
                {user.email?.split('@')[0] ?? t('nav.login')}
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-[#0e393d] text-[#f2ebdb] text-[12px] font-medium px-5 py-2 rounded-full tracking-wide transition-colors hover:bg-[#1a5055] whitespace-nowrap"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile dropdown panel */}
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
                    {(dropdowns[item] ?? []).map((dropItem, j) =>
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

      {/* Transparent overlay */}
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

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0e393d] border-t-[3px] border-[#ceab84] px-8 md:px-12 pt-14 pb-8">
        <div className="max-w-[1060px] mx-auto">

          <div className="flex flex-col md:flex-row md:justify-between gap-10 md:gap-8 pb-10 border-b border-white/10">
            <div className="flex items-center gap-3 md:flex-shrink-0 md:self-start">
              <Image src="/evida-logo.png" alt="Evida Life" width={30} height={30} className="rounded-full opacity-80" />
              <span className="text-[0.78rem] font-medium tracking-[0.2em] uppercase text-[#f2ebdb]/55">{t('nav.brand')}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-14">
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

              <div>
                <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">{t('footer.co.label')}</h4>
                <ul className="space-y-2.5">
                  {footerCoItems.map((item) => (
                    <li key={item}>
                      <span className="text-[13px] font-light text-white/38 hover:text-white/65 cursor-default transition-colors">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">Legal</h4>
                <ul className="space-y-2.5">
                  {([
                    [t('footer.legal.privacy'), '/privacy'],
                    [t('footer.legal.terms'), '/terms'],
                    [t('footer.legal.imprint'), '/legal'],
                  ] as [string, string][]).map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] font-light text-white/38 hover:text-white/65 transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 text-[11px] font-light text-white/20 tracking-wide">{t('footer.copy')}</div>
        </div>
      </footer>

    </div>
  );
}
