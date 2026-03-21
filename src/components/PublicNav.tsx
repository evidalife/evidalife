'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

type Locale = 'de' | 'en';

// URL slugs for each section's dropdown items, matching nav.dropdowns.* order in translations
const NAV_SLUG_MAP: Record<string, (string | null)[]> = {
  Kitchen: ['/how-to-start', '/daily-dozen', '/recipes', '/restaurant', null, '/blog', '/shopping-list', '/courses'],
  Health:  ['/health-engine', '/biomarkers', '/bioage', '/interventions', null, '/dashboard', '/science'],
  Fit:     ['/sleep', '/exercise', '/stress-recovery', null, '/coaching'],
  Shop:    ['/shop', '/food', '/eat-at-home', null, '/cart', '/orders'],
};

const NAV_SECTIONS = ['Kitchen', 'Health', 'Fit', 'Shop'] as const;

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

  const login = locale === 'de' ? 'Anmelden' : 'Login';
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
            const isOpen = activeDropdown === section;
            return (
              <div
                key={section}
                className="relative"
                onMouseEnter={() => setActiveDropdown(section)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={`/${section.toLowerCase()}`}
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
                </Link>

                {isOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
                    <div
                      className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 py-1.5 min-w-[210px]"
                      style={{ animation: 'dropdownIn 0.15s ease-out' }}
                    >
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
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right side: hamburger (mobile) + lang toggle + user */}
        <div className="flex items-center gap-2 shrink-0">

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
                  {([['de', 'Deutsch'], ['en', 'English']] as [Locale, string][]).map(([l, label]) => (
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

          {/* Login / User with logout dropdown */}
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
                    className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.14)] border border-[#0e393d]/8 min-w-[160px] py-1.5"
                    style={{ animation: 'dropdownIn 0.15s ease-out' }}
                  >
                    <Link
                      href="/dashboard"
                      className="block px-5 py-2.5 text-[13px] text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-5 py-2.5 text-[13px] text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                    >
                      {locale === 'de' ? 'Profil' : 'Profile'}
                    </Link>
                    {profile?.is_admin && (
                      <Link
                        href="/admin"
                        className="block px-5 py-2.5 text-[13px] text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-[#0e393d] transition-colors"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <div className="h-px bg-[#0e393d]/10 mx-4 my-1.5" />
                    <button
                      onClick={handleSignOut}
                      aria-label={locale === 'de' ? 'Abmelden' : 'Sign out'}
                      className="w-full text-left px-5 py-2.5 text-[13px] text-[#1c2a2b] font-light hover:bg-[#f5f4f0] hover:text-red-600 transition-colors"
                    >
                      {locale === 'de' ? 'Abmelden' : 'Sign out'}
                    </button>
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
            const isExp = expandedSection === section;
            return (
              <div key={section} className={si > 0 ? 'border-t border-[#0e393d]/6' : ''}>
                {/* Section row */}
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
                    maxHeight: isExp ? '400px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.25s ease',
                  }}
                >
                  <div className="pb-1.5">
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
