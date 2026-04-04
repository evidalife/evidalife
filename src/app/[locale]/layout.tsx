import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { AuthProvider } from '@/context/AuthProvider';
import { CartProvider } from '@/lib/cart';
import CookieBanner from '@/components/CookieBanner';
import AICompanionWrapper from '@/components/AICompanionWrapper';
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: {
    default: 'Evida Life – Gesund leben. Wissenschaftlich belegt, KI-gestützt.',
    template: '%s – Evida Life',
  },
  description:
    'Evidenzgestützte, vollwertige, pflanzenbasierte Ernährung kombiniert mit messbaren Gesundheitsmarkern. Laborwerte, Daily Dozen Tracker und Rezeptdatenbank – alles in einer Plattform.',
  metadataBase: new URL('https://evidalife.com'),
  openGraph: {
    siteName: 'Evida Life',
    type: 'website',
    images: [{ url: '/evida-logo.png', width: 1200, height: 630, alt: 'Evida Life' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/evida-logo.png'],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-visual" />
        <link rel="preconnect" href="https://rwbmdxgcjgidalcoeppp.supabase.co" />
        <link rel="preconnect" href="https://plausible.io" />
        <Script
          defer
          data-domain="evidalife.com"
          src="https://plausible.io/js/pa-rd8Vg53lkvL2l8ft9io4h.js"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased overscroll-none`}>
        <NextIntlClientProvider messages={messages}>
          <CartProvider>
            <AuthProvider>{children}</AuthProvider>
          </CartProvider>
          <CookieBanner />
          <AICompanionWrapper />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
