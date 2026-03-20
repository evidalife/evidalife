'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import TwoFactorInput from '@/components/auth/TwoFactorInput';

export default function VerifyPage() {
  const router = useRouter();
  const t = useTranslations('auth.verify');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const verify = async (code: string) => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factorId = factors?.totp?.[0]?.id;

    if (!factorId) {
      setError(t('errInvalid'));
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    if (error) {
      setError(t('errInvalid'));
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const handleResend = async () => {
    const supabase = createClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factorId = factors?.totp?.[0]?.id;
    if (factorId) await supabase.auth.mfa.challenge({ factorId });
  };

  return (
    <div className="text-center">
      {/* Lock icon */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-5 mx-auto">
        <svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-blue-500"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h1 className="text-2xl font-semibold text-[#1c2a2b] mb-1">{t('heading')}</h1>
      <p className="text-sm text-[#1c2a2b]/50 mb-8">{t('subtext')}</p>

      {!useBackup ? (
        <>
          <TwoFactorInput onComplete={verify} disabled={loading} />

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          <p className="mt-6 text-xs text-[#1c2a2b]/50">
            {t('didntReceive')}{' '}
            <button
              onClick={handleResend}
              className="text-[#0e393d] hover:underline"
            >
              {t('resend')}
            </button>
            {' · '}
            <button
              onClick={() => setUseBackup(true)}
              className="text-[#0e393d] hover:underline"
            >
              {t('backupCode')}
            </button>
          </p>
        </>
      ) : (
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-sm text-[#1c2a2b]/60 mb-1">{t('backupCodeLabel')}</label>
            <input
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[#0e393d]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20 font-mono tracking-widest"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={() => verify(backupCode)}
            disabled={loading || !backupCode}
            className="w-full py-2.5 rounded-lg bg-[#0e393d] text-[#f2ebdb] text-sm font-medium hover:bg-[#1a5055] transition-colors disabled:opacity-50"
          >
            {loading ? '…' : t('verify')}
          </button>

          <button
            onClick={() => { setUseBackup(false); setError(''); }}
            className="text-sm text-[#0e393d] hover:underline block"
          >
            ← {t('backToCode')}
          </button>
        </div>
      )}
    </div>
  );
}
