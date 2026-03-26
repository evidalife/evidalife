import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import HealthEnginePublic from '@/components/health/HealthEnginePublic';

export const metadata = { title: 'Health Engine – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

// Always shows the public info/preview page regardless of auth state.
// Authenticated users who want their personal dashboard go to /dashboard.
export default async function HealthEnginePage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

  return (
    <>
      <PublicNav />
      <HealthEnginePublic lang={lang} />
      <PublicFooter />
    </>
  );
}
