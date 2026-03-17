'use client';

import { useTranslation } from 'react-i18next';
import LegalLayout from '@/components/LegalLayout';

export default function TermsContent() {
  const { t } = useTranslation('common');
  const s2Items = t('terms.s2.items', { returnObjects: true }) as string[];
  const s6Items = t('terms.s6.items', { returnObjects: true }) as string[];

  return (
    <LegalLayout
      title={t('terms.title')}
      subtitle={t('terms.subtitle')}
      lastUpdated={t('terms.lastUpdated')}
    >

      <h2>{t('terms.s1.heading')}</h2>
      <p>{t('terms.s1.body')}</p>

      <h2>{t('terms.s2.heading')}</h2>
      <p>{t('terms.s2.intro')}</p>
      <ul>
        {s2Items.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="placeholder">{t('terms.s2.placeholder')}</div>

      <h2>{t('terms.s3.heading')}</h2>
      <p>{t('terms.s3.body')}</p>

      <h3>{t('terms.s3.age.heading')}</h3>
      <p>{t('terms.s3.age.body')}</p>

      <h2>{t('terms.s4.heading')}</h2>
      <p>{t('terms.s4.body')}</p>

      <h2>{t('terms.s5.heading')}</h2>
      <p>{t('terms.s5.body1')}</p>
      <p>{t('terms.s5.body2')}</p>

      <h2>{t('terms.s6.heading')}</h2>
      <p>{t('terms.s6.intro')}</p>
      <ul>
        {s6Items.map((item) => <li key={item}>{item}</li>)}
      </ul>

      <h2>{t('terms.s7.heading')}</h2>
      <p>{t('terms.s7.body')}</p>
      <div className="placeholder">{t('terms.s7.placeholder')}</div>

      <h2>{t('terms.s8.heading')}</h2>
      <div className="placeholder">{t('terms.s8.placeholder')}</div>

      <h2>{t('terms.s9.heading')}</h2>
      <p>{t('terms.s9.body')}</p>

      <h2>{t('terms.s10.heading')}</h2>
      <p>{t('terms.s10.body')}</p>

      <h2>{t('terms.s11.heading')}</h2>
      <p>{t('terms.s11.body')}</p>

      <h2>{t('terms.s12.heading')}</h2>
      <p>
        {t('terms.s12.body')}{' '}
        <a href="mailto:hello@evidalife.com">hello@evidalife.com</a>.
      </p>

    </LegalLayout>
  );
}
