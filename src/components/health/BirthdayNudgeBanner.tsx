'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';

interface Props {
  locale: string;
}

export default function BirthdayNudgeBanner({ locale }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#0e393d]/20 bg-[#0e393d]/8 p-4">
      <span className="text-xl shrink-0 mt-0.5">📅</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0e393d]">
          Add your date of birth to unlock PhenoAge and FIB-4 Score
        </p>
        <p className="text-xs text-[#1c2a2b]/60 mt-0.5 leading-relaxed">
          These markers calculate your biological age and liver health — they need your age to compute.
        </p>
        <Link
          href={`/${locale}/profile`}
          className="inline-block mt-2 text-xs font-medium text-[#0e393d] underline underline-offset-2 hover:text-[#1a5055] transition-colors"
        >
          Update profile →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-[#1c2a2b]/35 hover:text-[#1c2a2b]/60 transition-colors mt-0.5"
      >
        <svg width="14" height="14" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 2l6 6M8 2l-6 6" />
        </svg>
      </button>
    </div>
  );
}
