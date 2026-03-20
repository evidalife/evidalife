'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import Image from 'next/image';

type Locale = 'de' | 'en';

const HERO_IMG = 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('auth.hero');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [langOpen, setLangOpen] = useState(false);

  const changeLang = (l: Locale) => {
    router.replace(pathname, { locale: l });
    setLangOpen(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: hero panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMG}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a3a2a]/40 to-[#1a3a2a]/80" />

        <div className="relative z-10 flex flex-col justify-end p-10 pb-12 w-full">
          <h2 className="font-serif text-5xl lg:text-[3.5rem] text-white leading-[1.08] tracking-tight mb-3">
            {t('h1')}<br />
            <em className="italic font-normal text-[#ceab84]">{t('h1em')}</em>
          </h2>
          <p className="text-white/65 text-sm max-w-[340px] leading-relaxed">
            {t('sub')}
          </p>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 relative flex flex-col items-center justify-center bg-[#fafaf8] px-6 py-12 overflow-y-auto">

        {/* Top-right pill: lang switcher + close */}
        <div className="absolute top-6 right-6 flex items-center gap-0 bg-white border border-[#0e393d]/12 rounded-full shadow-sm">

          {/* Language switcher */}
          <div
            className="relative"
            onMouseEnter={() => setLangOpen(true)}
            onMouseLeave={() => setLangOpen(false)}
          >
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1 px-3 py-2 rounded-l-full text-[12px] font-medium text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors"
            >
              <span className="uppercase tracking-wider">{locale.toUpperCase()}</span>
              <svg
                width="10" height="10" viewBox="0 0 12 12" fill="none"
                className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
              >
                <path d="M2 4l4 4 4-4" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {langOpen && (
              <div className="absolute right-0 top-full pt-2 z-50">
                <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 min-w-[130px] py-1.5">
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

          {/* Divider */}
          <div className="w-px h-4 bg-[#0e393d]/12" />

          {/* Close button */}
          <button
            onClick={() => router.back()}
            aria-label="Close"
            className="px-3 py-2 rounded-r-full text-[#1c2a2b]/40 hover:text-[#0e393d] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Form content */}
        <div className="w-full max-w-[400px]">
          <Link href="/" className="flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity w-fit">
            <Image src="/evida-logo.png" alt="Evida Life" width={32} height={32} className="rounded-full" />
            <span className="font-medium text-[0.75rem] tracking-[0.16em] uppercase text-[#0e393d]">
              EVIDA LIFE
            </span>
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}
