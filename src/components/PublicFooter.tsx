'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

const PLATFORM_ITEMS = [
  { href: '/kitchen',  label: 'Kitchen' },
  { href: '/health',   label: 'Health'  },
  { href: '/fit',      label: 'Fit'     },
  { href: '/shop',     label: 'Shop'    },
];

const COMPANY_HREFS = ['/about', '/team', '/partner-labs', '/contact'];

export default function PublicFooter() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const companyItems = t.raw('co.items') as string[];

  return (
    <footer className="bg-[#0e393d] border-t-[3px] border-[#ceab84] px-8 md:px-12 pt-12 pb-6 mt-auto">
      <div className="max-w-[1060px] mx-auto">

        {/* 3-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-white/10">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity mb-4">
              <Image src="/evida-logo.png" alt="Evida Life" width={28} height={28} className="rounded-full opacity-80" />
              <span className="text-[0.78rem] font-medium tracking-[0.2em] uppercase text-[#f2ebdb]/55">EVIDA LIFE</span>
            </Link>
            <p className="text-[13px] font-light text-white/35 leading-relaxed max-w-[200px]">
              {locale === 'de'
                ? 'Gesund leben. Wissenschaftlich fundiert.'
                : 'Live well. Scientifically grounded.'}
            </p>
          </div>

          {/* Platform column */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ceab84]/70 mb-4">
              {t('platform.label')}
            </p>
            <ul className="space-y-2.5">
              {PLATFORM_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[13px] font-light text-white/45 hover:text-white/75 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company column */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ceab84]/70 mb-4">
              {t('co.label')}
            </p>
            <ul className="space-y-2.5">
              {companyItems.map((label, i) => (
                <li key={label}>
                  <Link href={COMPANY_HREFS[i] ?? '/'} className="text-[13px] font-light text-white/45 hover:text-white/75 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ceab84]/70 mb-4">
              {locale === 'de' ? 'Rechtliches' : 'Legal'}
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link href="/privacy" className="text-[13px] font-light text-white/45 hover:text-white/75 transition-colors">
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[13px] font-light text-white/45 hover:text-white/75 transition-colors">
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link href="/legal" className="text-[13px] font-light text-white/45 hover:text-white/75 transition-colors">
                  {t('legal.imprint')}
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="pt-5 text-[11px] font-light text-white/20 tracking-wide">{t('copy')}</div>
      </div>
    </footer>
  );
}
