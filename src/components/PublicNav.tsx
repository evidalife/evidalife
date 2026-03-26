'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthProvider';
import { useCart } from '@/lib/cart';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type Locale = 'de' | 'en' | 'fr' | 'es' | 'it';

// URL slugs for each section's dropdown items, matching nav.dropdowns.* order in translations
const NAV_SLUG_MAP: Record<string, (string | null)[]> = {
  Kitchen: ['/kitchen', '/recipes', '/blog', '/courses', '/daily-dozen', '/how-to-start', '/shopping-list'],
  Health:  ['/health', '/health-engine', '/science', '/biomarkers', '/assessments', '/bioage', '/partner-labs'],
  Fit:     ['/fit', '/sleep', '/exercise', '/stress-recovery', '/coaching'],
  Shop:    ['/shop', '/shop?type=blood_test', '/shop?type=clinical_test', '/shop?type=epigenetic_test'],
};

const NAV_SECTIONS = ['Kitchen', 'Health', 'Fit', 'Shop'] as const;

// Auth-only items appended to each section dropdown (with a separator) when the user is logged in
type AuthDropdownItem = { label: string; href: string };

const AUTH_DROPDOWN_ITEMS: Partial<Record<string, Record<Locale, AuthDropdownItem[]>>> = {
  Health: {
    de: [{ label: 'Mein Dashboard',      href: '/dashboard' }],
    en: [{ label: 'My Dashboard',        href: '/dashboard' }],
    fr: [{ label: 'Mon tableau de bord', href: '/dashboard' }],
    es: [{ label: 'Mi panel',            href: '/dashboard' }],
    it: [{ label: 'La mia dashboard',    href: '/dashboard' }],
  },
  Kitchen: {
    de: [
      { label: 'Mein Daily Dozen',    href: '/daily-dozen' },
      { label: 'Meine Einkaufsliste', href: '/shopping-list' },
    ],
    en: [
      { label: 'My Daily Dozen',   href: '/daily-dozen' },
      { label: 'My Shopping List', href: '/shopping-list' },
    ],
    fr: [
      { label: 'Mon Daily Dozen',     href: '/daily-dozen' },
      { label: 'Ma liste de courses', href: '/shopping-list' },
    ],
    es: [
      { label: 'Mi Daily Dozen',        href: '/daily-dozen' },
      { label: 'Mi lista de la compra', href: '/shopping-list' },
    ],
    it: [
      { label: 'Il mio Daily Dozen',       href: '/daily-dozen' },
      { label: 'La mia lista della spesa', href: '/shopping-list' },
    ],
  },
  Shop: {
    de: [
      { label: 'Meine Bestellungen', href: '/profile?tab=orders' },
      { label: 'Meine Rechnungen',   href: '/profile?tab=invoices' },
    ],
    en: [
      { label: 'My Orders',   href: '/profile?tab=orders' },
      { label: 'My Invoices', href: '/profile?tab=invoices' },
    ],
    fr: [
      { label: 'Mes commandes', href: '/profile?tab=orders' },
      { label: 'Mes factures',  href: '/profile?tab=invoices' },
    ],
    es: [
      { label: 'Mis pedidos',  href: '/profile?tab=orders' },
      { label: 'Mis facturas', href: '/profile?tab=invoices' },
    ],
    it: [
      { label: 'I miei ordini',  href: '/profile?tab=orders' },
      { label: 'Le mie fatture', href: '/profile?tab=invoices' },
    ],
  },
};

// ── Profile dropdown menu ─────────────────────────────────────────────────────

type MenuItem = { label: string; href: string; admin?: boolean } | { label: string; action: 'signout' } | 'divider';

const PROFILE_MENU: Record<Locale, MenuItem[]> = {
  de: [
    { label: 'Admin Panel',  href: '/admin', admin: true },
    'divider',
    { label: 'Profil',       href: '/profile' },
    { label: 'Bestellungen', href: '/profile?tab=orders' },
    { label: 'Laborwerte',   href: '/profile?tab=results' },
    { label: 'Rechnungen',   href: '/profile?tab=invoices' },
    'divider',
    { label: 'Abmelden',     action: 'signout' },
  ],
  en: [
    { label: 'Admin Panel', href: '/admin', admin: true },
    'divider',
    { label: 'Profile',     href: '/profile' },
    { label: 'Orders',      href: '/profile?tab=orders' },
    { label: 'Results',     href: '/profile?tab=results' },
    { label: 'Invoices',    href: '/profile?tab=invoices' },
    'divider',
    { label: 'Sign out',    action: 'signout' },
  ],
  fr: [
    { label: 'Admin Panel', href: '/admin', admin: true },
    'divider',
    { label: 'Profil',      href: '/profile' },
    { label: 'Commandes',   href: '/profile?tab=orders' },
    { label: 'Résultats',   href: '/profile?tab=results' },
    { label: 'Factures',    href: '/profile?tab=invoices' },
    'divider',
    { label: 'Se déconnecter', action: 'signout' },
  ],
  es: [
    { label: 'Admin Panel', href: '/admin', admin: true },
    'divider',
    { label: 'Perfil',      href: '/profile' },
    { label: 'Pedidos',     href: '/profile?tab=orders' },
    { label: 'Resultados',  href: '/profile?tab=results' },
    { label: 'Facturas',    href: '/profile?tab=invoices' },
    'divider',
    { label: 'Cerrar sesión', action: 'signout' },
  ],
  it: [
    { label: 'Admin Panel', href: '/admin', admin: true },
    'divider',
    { label: 'Profilo',    href: '/profile' },
    { label: 'Ordini',     href: '/profile?tab=orders' },
    { label: 'Risultati',  href: '/profile?tab=results' },
    { label: 'Fatture',    href: '/profile?tab=invoices' },
    'divider',
    { label: 'Esci',       action: 'signout' },
  ],
};

export default function PublicNav() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const t = useTranslations('nav');
  const [langOpen,         setLangOpen]         = useState(false);
  const [activeDropdown,   setActiveDropdown]   = useState<string | null>(null);
  const [userOpen,         setUserOpen]         = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [expandedSection,  setExpandedSection]  = useState<string | null>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setExpandedSection(null);
  }, [pathname]);

  const changeLang = (l: Locale) => {
    router.replace(pathname, { locale: l });
    setLangOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const closeAllMenus = () => { setMobileOpen(false); setLangOpen(false); setUserOpen(false); };

  const { itemCount } = useCart();
  const login = locale === 'de' ? 'Anmelden' : locale === 'fr' ? 'Connexion' : locale === 'es' ? 'Entrar' : locale === 'it' ? 'Accedi' : 'Login';
  const dropdowns = t.raw('dropdowns') as Record<string, (string | null)[]>;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1060px] z-50">

      {/* Main pill nav */}
      <nav
        className="flex items-center justify-between px-5 py-3 bg-white/90 backdrop-blur-md rounded-full border border-white/70 shadow-[0_4px_24px_rgba(14,57,61,0.1)] overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
          <Image src="/evida-logo.png" alt="Evida Life" width={34} height={34} className="rounded-full" />
          <span className="hidden sm:inline font-medium text-[0.8rem] tracking-[0.16em] uppercase text-[#0e393d]">EVIDA LIFE</span>
          <span className="sm:hidden flex flex-col leading-tight font-medium text-[0.8rem] tracking-[0.16em] uppercase text-[#0e393d]">
            <span>EVIDA</span>
            <span>LIFE</span>
          </span>
        </Link>

        {/* Center nav items — desktop only */}
        <div className="hidden md:flex gap-6 items-center">
          {NAV_SECTIONS.map((section) => {
            const items = dropdowns[section] ?? [];
            const slugs = NAV_SLUG_MAP[section] ?? [];
            const authItems = user ? (AUTH_DROPDOWN_ITEMS[section]?.[locale] ?? []) : [];
            const isOpen = activeDropdown === section;
            return (
              <div
                key={section}
                className="relative"
                onMouseEnter={() => setActiveDropdown(section)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {/* Trigger — dropdown only, not a nav link */}
                <button
                  onClick={() => setActiveDropdown(isOpen ? null : section)}
                  className={`flex items-center gap-1 text-[0.8rem] font-light cursor-pointer hover:text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors px-3 py-1.5 rounded-full ${
                    isOpen ? 'text-[#0e393d] bg-[#0e393d]/6' : 'text-[#5a6e6f]'
                  }`}
                >
                  {section}
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {isOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div
                      className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 py-1.5 min-w-[210px]"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
                      {/* Public items */}
                      {items.map((label, i) => {
                        const href = slugs[i];
                        if (label === null || href === null) {
                          return <div key={i} className="h-px bg-[#0e393d]/10 mx-4 my-1.5" />;
                        }
                        return (
                          <Link
                            key={i}
                            href={href}
                            className="block w-full text-left px-5 py-2.5 text-[13px] font-light text-[#1c2a2b] hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                          >
                            {label}
                          </Link>
                        );
                      })}

                      {/* Auth-only items — shown below a separator when logged in */}
                      {authItems.length > 0 && (
                        <>
                          <div className="h-px bg-[#0e393d]/10 mx-4 my-1.5" />
                          {authItems.map((item, i) => (
                            <Link
                              key={`auth-${i}`}
                              href={item.href}
                              className="block w-full text-left px-5 py-2.5 text-[13px] font-light text-[#0e393d]/70 hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right side: hamburger (mobile) + lang toggle + user */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Cart icon — desktop only */}
          <Link
            href="/cart"
            aria-label={locale === 'de' ? 'Warenkorb' : locale === 'fr' ? 'Panier' : locale === 'es' ? 'Carrito' : locale === 'it' ? 'Carrello' : 'Cart'}
            className="relative hidden md:flex w-9 h-9 items-center justify-center rounded-full text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#ceab84] text-[#0e393d] text-[9px] font-bold px-1">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {/* Hamburger / X — mobile only */}
          <button
            onClick={() => { const willOpen = !mobileOpen; closeAllMenus(); if (willOpen) setMobileOpen(true); }}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>

          {/* Lang toggle */}
          <div
            className="relative"
            onMouseEnter={() => setLangOpen(true)}
            onMouseLeave={() => setLangOpen(false)}
          >
            <button
              onClick={() => { const willOpen = !langOpen; closeAllMenus(); if (willOpen) setLangOpen(true); }}
              aria-label="Switch language"
              aria-expanded={langOpen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium text-[#0e393d] hover:bg-[#0e393d]/6 transition-colors"
            >
              <span className="uppercase tracking-wider">{locale.toUpperCase()}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}>
                <path d="M2 4l4 4 4-4" stroke="#0e393d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full pt-2 z-50">
                <div
                  className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 min-w-[140px] py-1.5"
                  style={{ animation: 'dropdownIn 0.15s ease-out' }}
                >
                  {([['de', 'Deutsch'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['it', 'Italiano']] as [Locale, string][]).map(([l, label]) => (
                    <button
                      key={l}
                      onClick={() => changeLang(l)}
                      className={`w-full text-left px-5 py-2.5 text-[13px] transition-colors ${
                        locale === l
                          ? 'text-[#0e393d] font-medium'
                          : 'text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-[#0e393d]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Login / User with profile dropdown */}
          {user ? (
            <div
              className="relative"
              onMouseEnter={() => setUserOpen(true)}
              onMouseLeave={() => setUserOpen(false)}
            >
              <button onClick={() => { const willOpen = !userOpen; closeAllMenus(); if (willOpen) setUserOpen(true); }} aria-label="Open user menu" aria-expanded={userOpen} className="bg-[#0e393d] text-[#f2ebdb] text-[12px] font-medium pl-1.5 pr-4 py-1.5 rounded-full tracking-wide transition-colors hover:bg-[#1a5055] whitespace-nowrap flex items-center gap-2">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url.includes('/storage/v1/object/public/')
                      ? profile.avatar_url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=96&height=96&resize=cover'
                      : profile.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#f2ebdb]/20 flex items-center justify-center text-[10px] font-semibold">
                    {(profile?.display_name ?? profile?.first_name ?? user.email ?? '?')[0]?.toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline">{profile?.display_name ?? profile?.first_name ?? user.email?.split('@')[0] ?? login}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform duration-200 ${userOpen ? 'rotate-180' : ''}`}>
                  <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full pt-2 z-50">
                  <div
                    className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 min-w-[200px] py-1.5"
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}
                  >
                    {PROFILE_MENU[locale]
                      .filter((item) => !(item !== 'divider' && 'admin' in item && item.admin && !profile?.is_admin))
                      .reduce<MenuItem[]>((acc, item) => {
                        if (item === 'divider' && (acc.length === 0 || acc[acc.length - 1] === 'divider')) return acc;
                        return [...acc, item];
                      }, [])
                      .filter((item, i, arr) => !(item === 'divider' && i === arr.length - 1))
                      .map((item, i) => {
                        if (item === 'divider') {
                          return <div key={i} className="h-px bg-[#0e393d]/10 mx-4 my-1.5" />;
                        }
                        if ('action' in item) {
                          return (
                            <button key={i} onClick={handleSignOut} className="w-full text-left px-5 py-2.5 text-[13px] text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-red-600 transition-colors">
                              {item.label}
                            </button>
                          );
                        }
                        return (
                          <Link key={i} href={item.href} className="block px-5 py-2.5 text-[13px] text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors">
                            {item.label}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-[#0e393d] text-[#f2ebdb] text-[12px] font-medium px-5 py-2 rounded-full tracking-wide transition-colors hover:bg-[#1a5055] whitespace-nowrap"
            >
              {login}
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile menu — slide down below the pill, md:hidden */}
      <div
        className="md:hidden overflow-hidden"
        style={{
          maxHeight: mobileOpen ? '600px' : '0',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div className="mt-2 rounded-2xl bg-white/90 backdrop-blur-md border border-[#0e393d]/8 shadow-[0_8px_32px_rgba(14,57,61,0.14)] overflow-hidden">

          {NAV_SECTIONS.map((section, si) => {
            const items = dropdowns[section] ?? [];
            const slugs = NAV_SLUG_MAP[section] ?? [];
            const authItems = user ? (AUTH_DROPDOWN_ITEMS[section]?.[locale] ?? []) : [];
            const isExp = expandedSection === section;
            return (
              <div key={section} className={si > 0 ? 'border-t border-[#0e393d]/6' : ''}>
                {/* Section row — accordion trigger, not a link */}
                <button
                  onClick={() => setExpandedSection(isExp ? null : section)}
                  aria-label={`Toggle ${section} menu`}
                  aria-expanded={isExp}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-[0.8rem] font-medium text-[#0e393d] hover:bg-[#f5f4f0] transition-colors"
                >
                  <span>{section}</span>
                  <svg
                    width="12" height="12" viewBox="0 0 10 10" fill="none"
                    className={`transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`}
                  >
                    <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Sub-items accordion */}
                <div
                  style={{
                    maxHeight: isExp ? '500px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <div className="pb-1.5">
                    {/* Public items */}
                    {items.map((label, i) => {
                      const href = slugs[i];
                      if (label === null || href === null) {
                        return <div key={i} className="h-px bg-[#0e393d]/8 mx-5 my-1" />;
                      }
                      return (
                        <Link
                          key={i}
                          href={href}
                          className="block px-8 py-2.5 text-[13px] font-light text-[#1c2a2b] hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                        >
                          {label}
                        </Link>
                      );
                    })}

                    {/* Auth-only items */}
                    {authItems.length > 0 && (
                      <>
                        <div className="h-px bg-[#0e393d]/8 mx-5 my-1" />
                        {authItems.map((item, i) => (
                          <Link
                            key={`auth-${i}`}
                            href={item.href}
                            className="block px-8 py-2.5 text-[13px] font-light text-[#0e393d]/70 hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile cart link — bottom of menu */}
          <Link
            href="/cart"
            className="flex items-center gap-3 px-5 py-3.5 text-[0.8rem] font-medium text-[#0e393d] hover:bg-[#f5f4f0] border-t border-[#0e393d]/6 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>{locale === 'de' ? 'Warenkorb' : locale === 'fr' ? 'Panier' : locale === 'es' ? 'Carrito' : locale === 'it' ? 'Carrello' : 'Cart'}</span>
            {itemCount > 0 && (
              <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center rounded-full bg-[#ceab84] text-[#0e393d] text-[10px] font-bold px-1.5">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>

          {/* Mobile profile section — logged-in users only */}
          {user && (
            <div className="border-t border-[#0e393d]/6">
              <button
                onClick={() => setExpandedSection(expandedSection === 'profile' ? null : 'profile')}
                aria-label="Toggle profile menu"
                aria-expanded={expandedSection === 'profile'}
                className="flex w-full items-center justify-between px-5 py-3.5 text-[0.8rem] font-medium text-[#0e393d] hover:bg-[#f5f4f0] transition-colors"
              >
                <span>{profile?.display_name ?? profile?.first_name ?? user.email?.split('@')[0]}</span>
                <svg
                  width="12" height="12" viewBox="0 0 10 10" fill="none"
                  className={`transition-transform duration-200 ${expandedSection === 'profile' ? 'rotate-180' : ''}`}
                >
                  <path d="M1.5 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div
                style={{
                  maxHeight: expandedSection === 'profile' ? '400px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height 0.25s ease',
                }}
              >
                <div className="pb-1.5">
                  {PROFILE_MENU[locale]
                    .filter((item) => !(item !== 'divider' && 'admin' in item && item.admin && !profile?.is_admin))
                    .reduce<MenuItem[]>((acc, item) => {
                      if (item === 'divider' && (acc.length === 0 || acc[acc.length - 1] === 'divider')) return acc;
                      return [...acc, item];
                    }, [])
                    .filter((item, i, arr) => !(item === 'divider' && i === arr.length - 1))
                    .map((item, i) => {
                      if (item === 'divider') {
                        return <div key={i} className="h-px bg-[#0e393d]/8 mx-5 my-1" />;
                      }
                      if ('action' in item) {
                        return (
                          <button key={i} onClick={handleSignOut} className="w-full text-left px-8 py-2.5 text-[13px] font-light text-[#1c2a2b] hover:bg-[#f5f4f0] hover:text-red-600 transition-colors">
                            {item.label}
                          </button>
                        );
                      }
                      return (
                        <Link key={i} href={item.href} className="block px-8 py-2.5 text-[13px] font-light text-[#1c2a2b] hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors">
                          {item.label}
                        </Link>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
