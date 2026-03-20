'use client';

import { useState } from 'react';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';
import PasswordStrength from '@/components/auth/PasswordStrength';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';
import AuthDivider from '@/components/auth/AuthDivider';

export default function SignupPage() {
  const router = useRouter();
  const t = useTranslations('auth.signup');
  const ts = useTranslations('auth.social');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tcAccepted, setTcAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('errPasswordShort'));
      return;
    }
    if (!tcAccepted) {
      setError(t('errTcRequired'));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { first_name: firstName, last_name: lastName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      await supabase.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        display_name: firstName,
      }).eq('id', signUpData.user.id);
    }

    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-2 mx-auto">
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
        <h2 className="text-2xl font-semibold text-[#1c2a2b]">{t('confirmHeading')}</h2>
        <p className="text-sm text-[#1c2a2b]/60">
          {t('confirmSubtext')} <strong>{email}</strong>
        </p>
        <Link href="/login" className="text-sm text-[#0e393d] hover:underline font-medium block">
          ← {t('backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold text-[#1c2a2b] mb-1">{t('heading')}</h1>
      <p className="text-sm text-[#1c2a2b]/50 mb-6">{t('subtext')}</p>

      <SocialLoginButtons
        googleLabel={ts('google')}
        appleLabel={ts('apple')}
        errGoogle={ts('errGoogle')}
        errApple={ts('errApple')}
      />

      <AuthDivider text={t('orWith')} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* First name + Last name row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-[#1c2a2b]/60 mb-1">{t('firstName')}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              placeholder={t('firstNamePlaceholder')}
              className="w-full px-4 py-2.5 rounded-lg border border-[#0e393d]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-[#1c2a2b]/60 mb-1">{t('lastName')}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              placeholder={t('lastNamePlaceholder')}
              className="w-full px-4 py-2.5 rounded-lg border border-[#0e393d]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20"
            />
          </div>
        </div>

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

        <div>
          <label className="block text-sm text-[#1c2a2b]/60 mb-1">{t('password')}</label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder={t('passwordPlaceholder')}
            showLabel={t('show')}
            hideLabel={t('hide')}
          />
          <PasswordStrength password={password} />
        </div>

        {/* T&C checkbox */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={tcAccepted}
            onChange={(e) => setTcAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-[#0e393d]/30 text-[#0e393d] focus:ring-[#0e393d]/20 shrink-0"
          />
          <span className="text-xs text-[#1c2a2b]/60 leading-snug">
            {t('tcAgree')}{' '}
            <Link href="/terms" target="_blank" className="text-[#0e393d] hover:underline">
              {t('tcTerms')}
            </Link>
            {' '}{t('tcAnd')}{' '}
            <Link href="/privacy" target="_blank" className="text-[#0e393d] hover:underline">
              {t('tcPrivacy')}
            </Link>
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !tcAccepted}
          className="w-full py-2.5 rounded-lg bg-[#0e393d] text-[#f2ebdb] text-sm font-medium hover:bg-[#1a5055] transition-colors disabled:opacity-50"
        >
          {loading ? '…' : t('createAccount')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#1c2a2b]/60">
        {t('alreadyHaveAccount')}{' '}
        <Link href="/login" className="text-[#0e393d] hover:underline font-medium">
          {t('signIn')}
        </Link>
      </p>
    </>
  );
}
