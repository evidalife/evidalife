import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Kitchen – Evida Life' };

export default async function KitchenPage() {
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-28 text-center">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
            {locale === 'de' ? 'Demnächst' : 'Coming soon'}
          </p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-4">Kitchen</h1>
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed">
            {locale === 'de'
              ? 'Rezepte, Daily Dozen Tracker und Ernährungsplanung – bald verfügbar.'
              : 'Recipes, Daily Dozen tracker, and meal planning — coming soon.'}
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
