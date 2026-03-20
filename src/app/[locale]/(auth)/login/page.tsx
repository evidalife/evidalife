'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import PasswordInput from '@/components/auth/PasswordInput';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';
import AuthDivider from '@/components/auth/AuthDivider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';
  const t = useTranslations('auth.login');
  const ts = useTranslations('auth.social');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(t('errInvalid'));
      setLoading(false);
      return;
    }

    // Check if MFA step-up is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      router.push('/login/verify');
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm text-[#1c2a2b]/60">{t('password')}</label>
            <Link href="/forgot-password" className="text-xs text-[#0e393d] hover:underline">
              {t('forgotPassword')}
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            showLabel={t('show')}
            hideLabel={t('hide')}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#0e393d] text-[#f2ebdb] text-sm font-medium hover:bg-[#1a5055] transition-colors disabled:opacity-50"
        >
          {loading ? '…' : t('signIn')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#1c2a2b]/60">
        {t('noAccount')}{' '}
        <Link href="/signup" className="text-[#0e393d] hover:underline font-medium">
          {t('createAccount')}
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
