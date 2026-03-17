import { getTranslations } from 'next-intl/server';
import PrivacyContent from './PrivacyContent';

export async function generateMetadata() {
  const t = await getTranslations('privacy');
  return { title: `${t('title')} – Evida Life` };
}

export default function PrivacyPage() {
  return <PrivacyContent />;
}
