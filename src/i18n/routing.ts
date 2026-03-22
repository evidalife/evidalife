import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['de', 'en', 'fr', 'es', 'it'],
  defaultLocale: 'de',
});
