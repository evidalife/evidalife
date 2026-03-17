import { Link } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';

export const metadata = { title: 'Kitchen – Evida Life' };

export default async function KitchenPage() {
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
          {locale === 'de' ? 'Demnächst' : 'Coming soon'}
        </p>
        <h1 className="font-serif text-4xl text-[#0e393d] mb-4">Kitchen</h1>
        <p className="text-[#1c2a2b]/60 text-base leading-relaxed mb-8">
          {locale === 'de'
            ? 'Rezepte, Daily Dozen Tracker und Ernährungsplanung – bald verfügbar.'
            : 'Recipes, Daily Dozen tracker, and meal planning — coming soon.'}
        </p>
        <Link
          href="/"
          className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#1a5055] transition-colors"
        >
          {locale === 'de' ? '← Zur Startseite' : '← Back to home'}
        </Link>
      </div>
    </div>
  );
}
