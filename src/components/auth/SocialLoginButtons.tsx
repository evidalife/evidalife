'use client';

// TODO: Enable Google and Apple OAuth providers in the Supabase dashboard
// Authentication > Providers > Google / Apple

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SocialLoginButtonsProps {
  googleLabel: string;
  appleLabel: string;
  errGoogle: string;
  errApple: string;
}

export default function SocialLoginButtons({ googleLabel, appleLabel, errGoogle, errApple }: SocialLoginButtonsProps) {
  const [error, setError] = useState('');

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(provider === 'google' ? errGoogle : errApple);
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => handleOAuth('google')}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-[#0e393d]/15 bg-white text-sm text-[#1c2a2b] hover:bg-[#f5f4f0] hover:border-[#0e393d]/25 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" fillRule="evenodd">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </g>
        </svg>
        {googleLabel}
      </button>
      <button
        type="button"
        onClick={() => handleOAuth('apple')}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-[#0e393d]/15 bg-white text-sm text-[#1c2a2b] hover:bg-[#f5f4f0] hover:border-[#0e393d]/25 transition-colors"
      >
        <svg width="15" height="18" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-148.8-101.8C28.9 749.8 0 673.7 0 601.3c0-154.7 100.7-236.4 199.2-236.4 52.8 0 96.5 35.9 129.4 35.9 31.6 0 80.8-38 141.1-38 22.4 0 108.2 1.9 162.3 84.8zm-162.5-218.1C662 88 707 30 707 0 707 0 538 0 452.2 89.9c-39.1 43.6-75.4 108.9-65.8 177.3 6.4.5 12.8.8 19.3.8 64.2 0 134.7-38.5 172.4-87.8z"/>
        </svg>
        {appleLabel}
      </button>
    </div>
  );
}
