'use client';

import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';

interface TwoFactorInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export default function TwoFactorInput({ onComplete, disabled }: TwoFactorInputProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const d = [...digits];
    d[index] = clean;
    setDigits(d);
    if (clean && index < 5) {
      refs.current[index + 1]?.focus();
    }
    const code = d.join('');
    if (code.length === 6 && d.every((c) => c !== '')) {
      onComplete(code);
    }
  };

  const handleKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const d = Array(6).fill('');
    for (let i = 0; i < text.length; i++) d[i] = text[i];
    setDigits(d);
    const filled = text.length;
    refs.current[Math.min(filled, 5)]?.focus();
    if (text.length === 6) onComplete(text);
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-13 text-center text-xl font-mono rounded-lg border border-[#0e393d]/15 bg-white focus:outline-none focus:ring-2 focus:ring-[#0e393d]/20 disabled:opacity-50 transition-colors"
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}
