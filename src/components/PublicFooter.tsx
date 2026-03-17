'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

export default function PublicFooter() {
  const t = useTranslations('footer');
  const locale = useLocale();

  return (
    <footer className="bg-[#0e393d] border-t-[3px] border-[#ceab84] px-8 md:px-12 pt-10 pb-6 mt-auto">
      <div className="max-w-[1060px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/evida-logo.png" alt="Evida Life" width={28} height={28} className="rounded-full opacity-80" />
            <span className="text-[0.78rem] font-medium tracking-[0.2em] uppercase text-[#f2ebdb]/55">EVIDA LIFE</span>
          </Link>
          <div className="flex gap-6 text-[13px] font-light">
            <Link href="/privacy" className="text-white/38 hover:text-white/65 transition-colors">
              {t('legal.privacy')}
            </Link>
            <Link href="/terms" className="text-white/38 hover:text-white/65 transition-colors">
              {t('legal.terms')}
            </Link>
            <Link href="/legal" className="text-white/38 hover:text-white/65 transition-colors">
              {t('legal.imprint')}
            </Link>
          </div>
        </div>
        <div className="pt-5 text-[11px] font-light text-white/20 tracking-wide">{t('copy')}</div>
      </div>
    </footer>
  );
}
