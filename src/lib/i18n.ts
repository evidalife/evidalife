import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import deCommon from '../../public/locales/de/common.json';
import enCommon from '../../public/locales/en/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { common: deCommon },
      en: { common: enCommon },
    },
    // Start with 'de' so SSR and first client render match (avoids hydration mismatch).
    // LanguageDetector will override after mount via i18n.changeLanguage().
    lng: 'de',
    fallbackLng: 'de',
    supportedLngs: ['de', 'en'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'evida-lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
