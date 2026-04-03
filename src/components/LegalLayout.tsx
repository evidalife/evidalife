'use client';

import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PageHero from '@/components/PageHero';

interface LegalLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, subtitle, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <PageHero
        variant="light"
        title={title}
        subtitle={subtitle}
        meta={lastUpdated ? `Last updated: ${lastUpdated}` : undefined}
      />

      {/* Content — narrower reading width inside the standard container */}
      <main className="mx-auto w-full max-w-[1060px] px-8 md:px-12 pb-12 flex-1">
        <div className="max-w-[720px] prose-legal">
          {children}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
