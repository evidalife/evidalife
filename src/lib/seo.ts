import type { Metadata } from 'next';

const DOMAIN  = 'https://evidalife.com';
const DEFAULT_IMAGE = `${DOMAIN}/evida-logo.png`;
const SITE_NAME = 'Evida Life';

export function buildMeta({
  title,
  description,
  path = '',
  image = DEFAULT_IMAGE,
  locale = 'de',
  type = 'website',
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  locale?: string;
  type?: 'website' | 'article';
}): Metadata {
  const url          = `${DOMAIN}/${locale}${path}`;
  const altLocale    = locale === 'de' ? 'en' : 'de';
  const altUrl       = `${DOMAIN}/${altLocale}${path}`;
  const fullTitle    = title.includes(SITE_NAME) ? title : `${title} – ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: url,
      languages: {
        de: `${DOMAIN}/de${path}`,
        en: `${DOMAIN}/en${path}`,
      },
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      alternateLocale: altLocale === 'de' ? 'de_DE' : 'en_US',
      type,
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

// ─── Per-page bilingual definitions ──────────────────────────────────────────

export const PAGE_META = {
  home: {
    de: { title: 'Evida Life', description: 'Evidenzbasierte, pflanzliche Gesundheit. Biomarker-Tests, Daily Dozen Tracker und Rezepte – alles in einer Plattform.' },
    en: { title: 'Evida Life', description: 'Evidence-based, plant-powered health. Biomarker testing, Daily Dozen tracker, and recipes — all in one platform.' },
  },
  shop: {
    de: { title: 'Shop', description: 'Longevity Bluttest-Pakete und Add-ons. Verstehe deine Biomarker und optimiere deine Gesundheit.' },
    en: { title: 'Shop', description: 'Longevity blood test packages and add-ons. Understand your biomarkers and optimise your health.' },
  },
  recipes: {
    de: { title: 'Rezepte', description: 'Vollwertige, pflanzliche Rezepte abgestimmt auf deine Daily Dozen Gesundheitsziele.' },
    en: { title: 'Recipes', description: 'Whole-food, plant-based recipes matched to your Daily Dozen health goals.' },
  },
  blog: {
    de: { title: 'Blog', description: 'Evidenzbasierte Artikel zu Gesundheit, Ernährung und Langlebigkeit. Aktuell, wissenschaftlich, verständlich.' },
    en: { title: 'Blog', description: 'Evidence-based articles on health, nutrition, and longevity. Current, scientific, accessible.' },
  },
  courses: {
    de: { title: 'Kurse', description: 'Fundiertes Wissen für ein längeres, gesünderes Leben. Online-Kurse zu Ernährung, Biomarkern und Lebensstil.' },
    en: { title: 'Courses', description: 'Evidence-based learning for a longer, healthier life. Online courses on nutrition, biomarkers, and lifestyle.' },
  },
  dailyDozen: {
    de: { title: 'Daily Dozen', description: 'Verfolge täglich die 12 Lebensmittelgruppen nach Dr. Michael Greger für optimale Gesundheit.' },
    en: { title: 'Daily Dozen', description: "Track Dr. Michael Greger's 12 daily food groups every day for optimal health." },
  },
  shoppingList: {
    de: { title: 'Einkaufsliste', description: 'Deine persönliche Einkaufsliste – Zutaten aus Rezepten direkt hinzufügen.' },
    en: { title: 'Shopping List', description: 'Your personal shopping list — add ingredients from recipes directly.' },
  },
  about: {
    de: { title: 'Über uns', description: 'Evida Life AG – Mission, Vision und die Geschichte hinter unserer evidenzbasierten Gesundheitsplattform aus Zürich.' },
    en: { title: 'About us', description: 'Evida Life AG – Mission, vision, and the story behind our evidence-based health platform from Zurich.' },
  },
  team: {
    de: { title: 'Team', description: 'Das interdisziplinäre Team hinter Evida Life – Medizin, Datenwissenschaft, Ernährung und Produktentwicklung.' },
    en: { title: 'Team', description: 'The interdisciplinary team behind Evida Life – medicine, data science, nutrition, and product development.' },
  },
  science: {
    de: { title: 'Wissenschaft & Quellen', description: 'Unsere Evidenz-Prinzipien, Schlüsselstudien und die wissenschaftlichen Quellen, auf die wir uns bei Evida Life stützen.' },
    en: { title: 'Science & Sources', description: 'Our evidence principles, key studies, and the scientific sources that inform everything we do at Evida Life.' },
  },
  contact: {
    de: { title: 'Kontakt', description: 'Kontaktiere das Evida Life Team. Fragen, Feedback oder Kooperationsanfragen – wir freuen uns von dir zu hören.' },
    en: { title: 'Contact', description: 'Contact the Evida Life team. Questions, feedback, or partnership enquiries — we\'d love to hear from you.' },
  },
  privacy: {
    de: { title: 'Datenschutz', description: 'Datenschutzerklärung von Evida Life AG – Wie wir deine persönlichen Daten verarbeiten und schützen.' },
    en: { title: 'Privacy Policy', description: 'Privacy policy of Evida Life AG – How we process and protect your personal data.' },
  },
  terms: {
    de: { title: 'AGB', description: 'Allgemeine Geschäftsbedingungen von Evida Life AG.' },
    en: { title: 'Terms & Conditions', description: 'Terms and conditions of Evida Life AG.' },
  },
  legal: {
    de: { title: 'Impressum', description: 'Rechtliche Angaben und Impressum von Evida Life AG, Zürich.' },
    en: { title: 'Legal Notice', description: 'Legal information and imprint of Evida Life AG, Zurich.' },
  },
} as const;
