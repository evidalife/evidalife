import ImprintContent from './ImprintContent';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.legal[lang], path: '/legal', locale: lang });
}

export default function LegalPage() {
  return <ImprintContent />;
}
