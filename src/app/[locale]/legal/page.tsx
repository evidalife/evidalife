import { getTranslations } from 'next-intl/server';
import ImprintContent from './ImprintContent';

export async function generateMetadata() {
  const t = await getTranslations('imprint');
  return { title: `${t('title')} – Evida Life` };
}

export default function LegalPage() {
  return <ImprintContent />;
}
