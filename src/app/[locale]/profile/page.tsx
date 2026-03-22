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
  const locale = await getLocale();
  const lang: Lang = locale === 'de' ? 'de' : 'en';
  const t = T[lang];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login?redirectTo=/profile', locale });
    return null;
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, email, display_name, first_name, last_name, date_of_birth, sex, height_cm, phone, country, street_address, city, postal_code, avatar_url, onboarding_completed, is_admin, created_at')
    .eq('id', user.id)
    .single();

  const profile: ProfileData = {
    id:                   user.id,
    email:                user.email ?? '',
    display_name:         profileRow?.display_name  ?? null,
    first_name:           profileRow?.first_name    ?? null,
    last_name:            profileRow?.last_name     ?? null,
    date_of_birth:        profileRow?.date_of_birth ?? null,
    sex:                  profileRow?.sex           ?? null,
    height_cm:            profileRow?.height_cm     ?? null,
    phone:                profileRow?.phone         ?? null,
    country:              profileRow?.country       ?? null,
    street_address:       profileRow?.street_address ?? null,
    city:                 profileRow?.city          ?? null,
    postal_code:          profileRow?.postal_code   ?? null,
    avatar_url:           profileRow?.avatar_url    ?? null,
    onboarding_completed: profileRow?.onboarding_completed ?? null,
    is_admin:             profileRow?.is_admin      ?? null,
    created_at:           profileRow?.created_at    ?? user.created_at,
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-12">
        {/* Hero */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-3xl text-[#0e393d]">{t.heading}</h1>
        </div>

        <ProfileEditor profile={profile} lang={lang} />
      </main>

      <PublicFooter />
    </div>
  );
}
