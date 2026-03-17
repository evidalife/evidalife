'use client';

import { useTranslation } from 'react-i18next';
import LegalLayout from '@/components/LegalLayout';

export default function ImprintContent() {
  const { t } = useTranslation('common');

  return (
    <LegalLayout title={t('imprint.title')}>

      <h2>{t('imprint.s1.heading')}</h2>
      <p>
        <strong>{t('imprint.s1.company')}</strong><br />
        {t('imprint.s1.addressLine1')}<br />
        {t('imprint.s1.addressLine2')}<br />
        {t('imprint.s1.country')}
      </p>
      <p>
        <strong>{t('imprint.s1.emailLabel')}</strong>{' '}
        <a href="mailto:hello@evidalife.com">hello@evidalife.com</a>
      </p>
      <p>
        <strong>{t('imprint.s1.registryLabel')}</strong> {t('imprint.s1.registryValue')}<br />
        <strong>{t('imprint.s1.uidLabel')}</strong> {t('imprint.s1.uidValue')}
      </p>

      <h2>{t('imprint.s2.heading')}</h2>
      <p>
        {t('imprint.s2.name')}<br />
        {t('imprint.s2.company')}
      </p>

      <h2>{t('imprint.s3.heading')}</h2>
      <p>{t('imprint.s3.body')}</p>

      <h2>{t('imprint.s4.heading')}</h2>
      <p>{t('imprint.s4.body')}</p>

      <h2>{t('imprint.s5.heading')}</h2>
      <p>{t('imprint.s5.body')}</p>

    </LegalLayout>
  );
}
