import TermsContent from './TermsContent';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.terms[lang], path: '/terms', locale: lang });
}

export default function TermsPage() {
  return <TermsContent />;
}
