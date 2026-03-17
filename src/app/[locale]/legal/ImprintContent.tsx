'use client';

import { useTranslations } from 'next-intl';
import LegalLayout from '@/components/LegalLayout';

export default function ImprintContent() {
  const t = useTranslations('imprint');

  return (
    <LegalLayout title={t('title')}>

      <h2>{t('s1.heading')}</h2>
      <p>
        <strong>{t('s1.company')}</strong><br />
        {t('s1.addressLine1')}<br />
        {t('s1.addressLine2')}<br />
        {t('s1.country')}
      </p>
      <p>
        <strong>{t('s1.emailLabel')}</strong>{' '}
        <a href="mailto:hello@evidalife.com">hello@evidalife.com</a>
      </p>
      <p>
        <strong>{t('s1.registryLabel')}</strong> {t('s1.registryValue')}<br />
        <strong>{t('s1.uidLabel')}</strong> {t('s1.uidValue')}
      </p>

      <h2>{t('s2.heading')}</h2>
      <p>
        {t('s2.name')}<br />
        {t('s2.company')}
      </p>

      <h2>{t('s3.heading')}</h2>
      <p>{t('s3.body')}</p>

      <h2>{t('s4.heading')}</h2>
      <p>{t('s4.body')}</p>

      <h2>{t('s5.heading')}</h2>
      <p>{t('s5.body')}</p>

    </LegalLayout>
  );
}
