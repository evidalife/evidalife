'use client';

import { useState } from 'react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showLabel?: string;
  hideLabel?: string;
}

export default function PasswordInput({ showLabel = 'Show', hideLabel = 'Hide', className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`w-full px-4 py-2.5 rounded-lg border border-[#0e393d]/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20 pr-16 ${className ?? ''}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1c2a2b]/50 hover:text-[#0e393d] transition-colors"
      >
        {show ? hideLabel : showLabel}
      </button>
    </div>
  );
}
