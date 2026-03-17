'use client';

import { useTranslation } from 'react-i18next';
import LegalLayout from '@/components/LegalLayout';

export default function PrivacyContent() {
  const { t } = useTranslation('common');
  const rights = t('privacy.s6.rights', { returnObjects: true }) as string[];

  return (
    <LegalLayout
      title={t('privacy.title')}
      subtitle={t('privacy.subtitle')}
      lastUpdated={t('privacy.lastUpdated')}
    >

      <h2>{t('privacy.s1.heading')}</h2>
      <p>{t('privacy.s1.intro')}</p>
      <p>
        <strong>{t('privacy.s1.company')}</strong><br />
        {t('privacy.s1.address')}<br />
        {t('privacy.s1.emailLabel')}{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>
      </p>

      <h2>{t('privacy.s2.heading')}</h2>

      <h3>{t('privacy.s2.waitlist.heading')}</h3>
      <p>{t('privacy.s2.waitlist.body')}</p>

      <h3>{t('privacy.s2.account.heading')}</h3>
      <p>{t('privacy.s2.account.body')}</p>

      <h3>{t('privacy.s2.health.heading')}</h3>
      <div className="placeholder">{t('privacy.s2.health.placeholder')}</div>

      <h3>{t('privacy.s2.auto.heading')}</h3>
      <p>{t('privacy.s2.auto.body')}</p>

      <h2>{t('privacy.s3.heading')}</h2>
      <p>
        {t('privacy.s3.body').split('Plausible Analytics').shift()}
        <a href="https://plausible.io" target="_blank" rel="noopener noreferrer">Plausible Analytics</a>
        {t('privacy.s3.body').split('Plausible Analytics').pop()}
      </p>

      <h2>{t('privacy.s4.heading')}</h2>
      <p>
        {t('privacy.s4.body').split('Supabase').shift()}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>
        {t('privacy.s4.body').split('Supabase').slice(1).join('Supabase')}
      </p>

      <h2>{t('privacy.s5.heading')}</h2>
      <p>{t('privacy.s5.body')}</p>

      <h2>{t('privacy.s6.heading')}</h2>
      <p>{t('privacy.s6.intro')}</p>
      <ul>
        {rights.map((right) => (
          <li key={right}>{right}</li>
        ))}
      </ul>
      <p>
        {t('privacy.s6.contact')}{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>
      </p>

      <h2>{t('privacy.s7.heading')}</h2>
      <div className="placeholder">{t('privacy.s7.placeholder')}</div>

      <h2>{t('privacy.s8.heading')}</h2>
      <p>{t('privacy.s8.body')}</p>

      <h2>{t('privacy.s9.heading')}</h2>
      <p>
        {t('privacy.s9.body')}{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>.
      </p>

    </LegalLayout>
  );
}
