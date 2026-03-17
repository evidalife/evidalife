'use client';

import { useEffect } from 'react';
import '@/lib/i18n';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Runs after hydration. Determines the correct language and applies it.
    // i18n was initialised with lng:'de' for SSR consistency; this overrides it
    // with the user's actual preference.
    //
    // Detection order:
    //   1. localStorage key 'evida-lang'  — explicit user choice
    //   2. navigator.language             — browser default
    //   3. fallback: 'de'
    const saved = localStorage.getItem('evida-lang');
    let resolved: 'de' | 'en';

    if (saved === 'de' || saved === 'en') {
      resolved = saved;
    } else if (navigator.language.toLowerCase().startsWith('en')) {
      resolved = 'en';
    } else {
      resolved = 'de';
    }

    i18n.changeLanguage(resolved);
  }, []);

  return <>{children}</>;
}
