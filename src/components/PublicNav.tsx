'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname, Link } from '@/i18n/navigation';
import { useAuth } from '@/context/AuthProvider';
import Image from 'next/image';

type Locale = 'de' | 'en';

interface PublicNavProps {
  loginLabel?: string;
}

export default function PublicNav({ loginLabel }: PublicNavProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [langOpen, setLangOpen] = useState(false);

  const changeLang = (l: Locale) => {
    router.replace(pathname, { locale: l });
    setLangOpen(false);
  };

  const login = loginLabel ?? (locale === 'de' ? 'Anmelden' : 'Login');

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1060px] z-50">
      <nav className="flex items-center justify-between px-5 py-3 bg-white/90 backdrop-blur-md rounded-full border border-white/70 shadow-[0_4px_24px_rgba(14,57,61,0.1)]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/evida-logo.png" alt="Evida Life" width={34} height={34} className="rounded-full" />
          <span className="font-medium text-[0.8rem] tracking-[0.16em] uppercase text-[#0e393d]">
            EVIDA LIFE
          </span>
        </Link>

        {/* Right: lang toggle + login/user */}
        <div className="flex items-center gap-2">

          {/* Lang toggle */}
          <div
            className="relative"
            onMouseEnter={() => setLangOpen(true)}
            onMouseLeave={() => setLangOpen(false)}
          >
            <button
              onClick={() => setLangOpen(!langOpen)}
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
                  className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(14,57,61,0.12)] border border-[#0e393d]/8 min-w-[140px] py-1.5"
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

          {/* Login / User */}
          {user ? (
            <Link
              href="/dashboard"
              className="bg-[#0e393d] text-[#f2ebdb] text-[12px] font-medium px-5 py-2 rounded-full tracking-wide transition-colors hover:bg-[#1a5055] whitespace-nowrap"
            >
              {user.email?.split('@')[0] ?? login}
            </Link>
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
    </div>
  );
}
