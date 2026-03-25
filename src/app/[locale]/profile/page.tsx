import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { type ProfileData } from '@/components/ProfileEditor';
import ProfileTabs from '@/components/ProfileTabs';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Profil – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T = {
  de: { eyebrow: 'Konto', heading: 'Mein Profil' },
  en: { eyebrow: 'Account', heading: 'My Profile' },
  fr: { eyebrow: 'Compte', heading: 'Mon profil' },
  es: { eyebrow: 'Cuenta', heading: 'Mi perfil' },
  it: { eyebrow: 'Account', heading: 'Il mio profilo' },
};

export default async function ProfilePage({ searchParams }: { searchParams?: Promise<{ tab?: string }> }) {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const params = await searchParams;
  const initialTab = params?.tab;
  const t = T[lang];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: '/login?redirectTo=/profile', locale });
    return null;
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, email, display_name, first_name, last_name, date_of_birth, sex, height_cm, weight_kg, blood_type, activity_level, diet, phone, country, street_address, city, postal_code, avatar_url, onboarding_completed, is_admin, created_at')
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
    weight_kg:            profileRow?.weight_kg     ?? null,
    blood_type:           profileRow?.blood_type    ?? null,
    activity_level:       profileRow?.activity_level ?? null,
    diet:                 profileRow?.diet          ?? null,
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

        <ProfileTabs profile={profile} lang={lang} initialTab={initialTab} />
      </main>

      <PublicFooter />
    </div>
  );
}
