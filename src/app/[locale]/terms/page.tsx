import { getTranslations } from 'next-intl/server';
import TermsContent from './TermsContent';

export async function generateMetadata() {
  const t = await getTranslations('terms');
  return { title: `${t('title')} – Evida Life` };
}

export default function TermsPage() {
  return <TermsContent />;
}
