'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgot');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    });

    // Show success regardless of whether the email exists (security best practice)
    setLoading(false);
    setSent(true);
  };

  const handleResend = async () => {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    });
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-5 mx-auto">
          <svg
            width="26" height="26" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-green-500"
          >
            <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2" />
            <path d="M22 6l-10 7L2 6" />
            <path d="M2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-[#1c2a2b] mb-2">{t('successHeading')}</h2>
        <p className="text-sm text-[#1c2a2b]/60 mb-6">
          {t('successSubtext')} <strong>{email}</strong>
        </p>
        <button
          onClick={handleResend}
          className="text-sm text-[#0e393d] hover:underline"
        >
          {t('resend')}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mail icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0e393d]/6 mb-5">
        <svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-[#0e393d]"
        >
          <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2" />
          <path d="M22 6l-10 7L2 6" />
          <path d="M2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6" />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-[#1c2a2b] mb-1">{t('heading')}</h1>
      <p className="text-sm text-[#1c2a2b]/50 mb-6">{t('subtext')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#1c2a2b]/60 mb-1">{t('email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="max@example.com"
            className="w-full px-4 py-2.5 rounded-lg border border-[#0e393d]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#0e393d] text-[#f2ebdb] text-sm font-medium hover:bg-[#1a5055] transition-colors disabled:opacity-50"
        >
          {loading ? '…' : t('sendLink')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#1c2a2b]/60">
        {t('rememberPassword')}{' '}
        <Link href="/login" className="text-[#0e393d] hover:underline font-medium">
          {t('signIn')}
        </Link>
      </p>
    </>
  );
}
