import PrivacyContent from './PrivacyContent';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.privacy[lang], path: '/privacy', locale: lang });
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
