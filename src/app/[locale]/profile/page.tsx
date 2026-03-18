import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import ProfileEditor, { type ProfileData } from '@/components/ProfileEditor';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Profil – Evida Life' };

type Lang = 'de' | 'en';

const T = {
  de: { eyebrow: 'Konto', heading: 'Mein Profil' },
  en: { eyebrow: 'Account', heading: 'My Profile' },
};

export default async function ProfilePage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login?redirectTo=/profile', locale });
    return null;
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, onboarding_completed, is_admin, created_at')
    .eq('id', user.id)
    .single();

  const profile: ProfileData = {
    id:                   user.id,
    email:                user.email ?? '',
    full_name:            profileRow?.full_name ?? null,
    avatar_url:           profileRow?.avatar_url ?? null,
    onboarding_completed: profileRow?.onboarding_completed ?? null,
    is_admin:             profileRow?.is_admin ?? null,
    created_at:           profileRow?.created_at ?? user.created_at,
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 pt-28 pb-12">
        {/* Hero */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-3xl text-[#0e393d]">{t.heading}</h1>
        </div>

        <ProfileEditor profile={profile} lang={locale} />
      </main>

      <PublicFooter />
    </div>
  );
}
