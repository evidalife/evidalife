'use client';

import { useTranslations } from 'next-intl';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, subtitle, lastUpdated, children }: LegalLayoutProps) {
  const t = useTranslations('layout');

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {/* Content — padded to clear the floating nav */}
      <main className="mx-auto w-full max-w-3xl px-6 pt-28 pb-12 flex-1">
        <div className="mb-10">
          <h1 className="font-serif text-4xl text-[#0e393d] mb-2">{title}</h1>
          {subtitle && <p className="text-[#0e393d]/60 text-lg">{subtitle}</p>}
          {lastUpdated && (
            <p className="mt-3 text-sm text-[#0e393d]/40">
              {t('lastUpdated', { date: lastUpdated })}
            </p>
          )}
        </div>

        <div className="prose-legal">
          {children}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
