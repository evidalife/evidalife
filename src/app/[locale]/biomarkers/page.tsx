import { Link } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Biomarker – Evida Life' };

export default async function BiomarkersPage() {
  const locale = await getLocale();
  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-28 text-center">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
            {locale === 'de' ? 'Demnächst' : 'Coming soon'}
          </p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-4">
            {locale === 'de' ? 'Blutwerte & Biomarker' : 'Biomarkers'}
          </h1>
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed mb-8">
            {locale === 'de'
              ? 'Alle deine Laborwerte übersichtlich in einem persönlichen Dashboard – bald verfügbar.'
              : 'All your lab values in one personal dashboard — coming soon.'}
          </p>
          <Link href="/" className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#1a5055] transition-colors">
            {locale === 'de' ? '← Zur Startseite' : '← Back to home'}
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
