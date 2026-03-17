'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const STORAGE_KEY = 'evida-cookie-consent';

export default function CookieBanner() {
  const t = useTranslations('cookie');
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl bg-[#0e393d] px-5 py-4 shadow-lg text-white/85 text-sm">
        <p className="flex-1 leading-relaxed">
          {t('text')}{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-white transition-colors">
            {t('link')}
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-[#ceab84] px-5 py-2 text-[#0e393d] font-medium text-sm hover:bg-[#ceab84]/90 transition-colors"
        >
          {t('button')}
        </button>
      </div>
    </div>
  );
}
