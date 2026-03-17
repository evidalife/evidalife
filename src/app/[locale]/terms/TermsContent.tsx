'use client';

import { useTranslations } from 'next-intl';
import LegalLayout from '@/components/LegalLayout';

export default function TermsContent() {
  const t = useTranslations('terms');
  const s2Items = t.raw('s2.items') as string[];
  const s6Items = t.raw('s6.items') as string[];

  return (
    <LegalLayout
      title={t('title')}
      subtitle={t('subtitle')}
      lastUpdated={t('lastUpdated')}
    >

      <h2>{t('s1.heading')}</h2>
      <p>{t('s1.body')}</p>

      <h2>{t('s2.heading')}</h2>
      <p>{t('s2.intro')}</p>
      <ul>
        {s2Items.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="placeholder">{t('s2.placeholder')}</div>

      <h2>{t('s3.heading')}</h2>
      <p>{t('s3.body')}</p>

      <h3>{t('s3.age.heading')}</h3>
      <p>{t('s3.age.body')}</p>

      <h2>{t('s4.heading')}</h2>
      <p>{t('s4.body')}</p>

      <h2>{t('s5.heading')}</h2>
      <p>{t('s5.body1')}</p>
      <p>{t('s5.body2')}</p>

      <h2>{t('s6.heading')}</h2>
      <p>{t('s6.intro')}</p>
      <ul>
        {s6Items.map((item) => <li key={item}>{item}</li>)}
      </ul>

      <h2>{t('s7.heading')}</h2>
      <p>{t('s7.body')}</p>
      <div className="placeholder">{t('s7.placeholder')}</div>

      <h2>{t('s8.heading')}</h2>
      <div className="placeholder">{t('s8.placeholder')}</div>

      <h2>{t('s9.heading')}</h2>
      <p>{t('s9.body')}</p>

      <h2>{t('s10.heading')}</h2>
      <p>{t('s10.body')}</p>

      <h2>{t('s11.heading')}</h2>
      <p>{t('s11.body')}</p>

      <h2>{t('s12.heading')}</h2>
      <p>
        {t('s12.body')}{' '}
        <a href="mailto:hello@evidalife.com">hello@evidalife.com</a>.
      </p>

    </LegalLayout>
  );
}
