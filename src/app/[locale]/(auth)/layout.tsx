'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

const HERO_IMG = 'https://images.unsplash.com/photo-1476611338391-6f395a0ebc7b?w=1600&q=80';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('auth.hero');

  let pillKey: 'pillLogin' | 'pillSignup' | 'pill2fa' | 'pillForgot' = 'pillLogin';
  if (pathname.includes('/signup')) pillKey = 'pillSignup';
  else if (pathname.includes('/verify')) pillKey = 'pill2fa';
  else if (pathname.includes('/forgot-password')) pillKey = 'pillForgot';

  return (
    <div className="min-h-screen flex">
      {/* Left: hero panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        {/* Hero image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_IMG}')` }}
        />
        {/* Gradient overlay: transparent top → dark forest green bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a3a2a]/40 to-[#1a3a2a]/80" />

        {/* Content anchored to bottom-left */}
        <div className="relative z-10 flex flex-col justify-end p-10 pb-12 w-full">
          <h2 className="font-serif text-5xl lg:text-[3.5rem] text-white leading-[1.08] tracking-tight mb-3">
            {t('h1')}<br />
            <em className="italic font-normal text-[#ceab84]">{t('h1em')}</em>
          </h2>
          <p className="text-white/65 text-sm max-w-[340px] leading-relaxed mb-8">
            {t('sub')}
          </p>
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/[0.12] rounded-full px-3 py-1.5 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-white text-xs">{t(pillKey)}</span>
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#fafaf8] px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
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
