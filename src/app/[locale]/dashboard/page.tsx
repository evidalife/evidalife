import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Dashboard – Evida Life' };

export default async function DashboardPage() {
  const locale = await getLocale();

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
            {locale === 'de' ? 'Demnächst' : 'Coming soon'}
          </p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-4">Dashboard</h1>
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed">
            {locale === 'de'
              ? 'Dein persönliches Gesundheits-Dashboard wird gerade gebaut. Bleib dran!'
              : 'Your personal health dashboard is being built. Stay tuned!'}
          </p>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
