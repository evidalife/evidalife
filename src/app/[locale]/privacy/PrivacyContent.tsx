'use client';

import { useTranslations } from 'next-intl';
import LegalLayout from '@/components/LegalLayout';

export default function PrivacyContent() {
  const t = useTranslations('privacy');
  const rights = t.raw('s6.rights') as string[];

  return (
    <LegalLayout
      title={t('title')}
      subtitle={t('subtitle')}
      lastUpdated={t('lastUpdated')}
    >

      <h2>{t('s1.heading')}</h2>
      <p>{t('s1.intro')}</p>
      <p>
        <strong>{t('s1.company')}</strong><br />
        {t('s1.address')}<br />
        {t('s1.emailLabel')}{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>
      </p>

      <h2>{t('s2.heading')}</h2>

      <h3>{t('s2.account.heading')}</h3>
      <p>{t('s2.account.body')}</p>

      <h3>{t('s2.health.heading')}</h3>
      <div className="placeholder">{t('s2.health.placeholder')}</div>

      <h3>{t('s2.auto.heading')}</h3>
      <p>{t('s2.auto.body')}</p>

      <h2>{t('s3.heading')}</h2>
      <p>
        {t('s3.body').split('Plausible Analytics').shift()}
        <a href="https://plausible.io" target="_blank" rel="noopener noreferrer">Plausible Analytics</a>
        {t('s3.body').split('Plausible Analytics').pop()}
      </p>

      <h2>{t('s4.heading')}</h2>
      <p>
        {t('s4.body').split('Supabase').shift()}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>
        {t('s4.body').split('Supabase').slice(1).join('Supabase')}
      </p>

      <h2>{t('s5.heading')}</h2>
      <p>{t('s5.body')}</p>

      <h2>{t('s6.heading')}</h2>
      <p>{t('s6.intro')}</p>
      <ul>
        {rights.map((right) => (
          <li key={right}>{right}</li>
        ))}
      </ul>
      <p>
        {t('s6.contact')}{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>
      </p>

      <h2>{t('s7.heading')}</h2>
      <div className="placeholder">{t('s7.placeholder')}</div>

      <h2>{t('s8.heading')}</h2>
      <p>{t('s8.body')}</p>

      <h2>{t('s9.heading')}</h2>
      <p>
        {t('s9.body')}{' '}
        <a href="mailto:datenschutz@evidalife.com">datenschutz@evidalife.com</a>.
      </p>

    </LegalLayout>
  );
}
