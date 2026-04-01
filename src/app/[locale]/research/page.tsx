import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import ResearchChat from '@/components/research/ResearchChat';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Research Engine | Evida Life',
  description: 'Ask health and nutrition questions answered by AI synthesis of 500,000+ peer-reviewed studies.',
};

export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-[#fafaf8] pt-16 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#0e393d]/8 bg-white">
          <div className="max-w-[1060px] mx-auto px-8 md:px-12 py-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0e393d] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#ceab84]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h1 className="font-['Playfair_Display'] text-xl text-[#0e393d] font-semibold leading-tight">
                Research Engine
              </h1>
              <p className="text-xs text-[#1c2a2b]/45 mt-0.5">
                AI synthesis of peer-reviewed nutrition and longevity research
              </p>
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[11px] text-[#1c2a2b]/35 bg-[#0e393d]/[.04] rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C9C6C]" />
              500K+ studies indexed
            </div>
          </div>
        </div>

        {/* Chat fills remaining screen height */}
        <div className="flex-1 max-w-[1060px] mx-auto w-full px-0 md:px-4 flex flex-col" style={{ height: 'calc(100vh - 64px - 73px)' }}>
          <ResearchChat />
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
