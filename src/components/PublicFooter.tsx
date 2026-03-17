'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';

const PLATFORM_ITEMS = [
  { label: 'Kitchen', href: '/kitchen' },
  { label: 'Health',  href: '/health'  },
  { label: 'Fit',     href: '/fit'     },
  { label: 'Shop',    href: '/shop'    },
];

const COMPANY_HREFS = ['/about', '/team', '/partner-labs', '/contact'];

export default function PublicFooter() {
  const t = useTranslations('footer');
  const companyItems = t.raw('co.items') as string[];

  return (
    <footer className="bg-[#0e393d] border-t-[3px] border-[#ceab84] px-8 md:px-12 pt-14 pb-8 mt-auto">
      <div className="max-w-[1060px] mx-auto">

        <div className="flex flex-col md:flex-row md:justify-between gap-10 md:gap-8 pb-10 border-b border-white/10">

          {/* Logo */}
          <div className="flex items-center gap-3 md:flex-shrink-0 md:self-start">
            <Image src="/evida-logo.png" alt="Evida Life" width={30} height={30} className="rounded-full opacity-80" />
            <span className="text-[0.78rem] font-medium tracking-[0.2em] uppercase text-[#f2ebdb]/55">EVIDA LIFE</span>
          </div>

          {/* 3 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-14">

            {/* Platform */}
            <div>
              <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {PLATFORM_ITEMS.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-[13px] font-light text-white/38 hover:text-white/65 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">
                {t('co.label')}
              </h4>
              <ul className="space-y-2.5">
                {companyItems.map((label, i) => (
                  <li key={label}>
                    <Link href={COMPANY_HREFS[i] ?? '/'} className="text-[13px] font-light text-white/38 hover:text-white/65 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#ceab84] mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {([
                  [t('legal.privacy'), '/privacy'],
                  [t('legal.terms'), '/terms'],
                  [t('legal.imprint'), '/legal'],
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

        <div className="pt-6 text-[11px] font-light text-white/20 tracking-wide">{t('copy')}</div>
      </div>
    </footer>
  );
}
