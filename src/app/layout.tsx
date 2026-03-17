import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "@/context/AuthProvider";
import CookieBanner from "@/components/CookieBanner";
import I18nProvider from "@/components/I18nProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Evida Life – Gesund leben. Wissenschaftlich fundiert.",
  description:
    "Evidenzgestützte, vollwertige, pflanzenbasierte Ernährung kombiniert mit messbaren Gesundheitsmarkern. Laborwerte, Daily Dozen Tracker und Rezeptdatenbank – alles in einer Plattform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <Script
          defer
          data-domain="evidalife.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased`}
      >
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
          <CookieBanner />
        </I18nProvider>
      </body>
    </html>
  );
}
