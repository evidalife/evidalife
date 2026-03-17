'use client';

import { useEffect } from 'react';
import '@/lib/i18n';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Run detection after hydration to avoid SSR mismatch.
    // Mirrors the existing localStorage / navigator detection logic.
    const saved = localStorage.getItem('evida-lang');
    if (saved === 'de' || saved === 'en') {
      if (saved !== i18n.language) i18n.changeLanguage(saved);
    } else if (navigator.language.toLowerCase().startsWith('en')) {
      if (i18n.language !== 'en') i18n.changeLanguage('en');
    }
  }, []);

  return <>{children}</>;
}
