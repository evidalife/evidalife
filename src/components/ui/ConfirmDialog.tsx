'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
};

type DialogState = ConfirmOptions & { resolve: (v: boolean) => void };

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useConfirmDialog() {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    const options = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const dialog = state ? (
    <ConfirmDialog
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialog: dialog };
}

// ─── Component ───────────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    confirmBtnRef.current?.focus();
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
      onCancel();
    }
  };

  const variantStyles = {
    danger: {
      icon: (
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      ),
      confirmBtn: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 text-white',
    },
    warning: {
      icon: (
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      ),
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500 text-white',
    },
    default: {
      icon: (
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#0e393d]/[0.06]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0e393d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
      ),
      confirmBtn: 'bg-[#0e393d] hover:bg-[#0a2e31] focus-visible:ring-[#ceab84] text-white',
    },
  };

  const v = variantStyles[variant];
  const resolvedTitle = title ?? (variant === 'danger' ? 'Delete' : variant === 'warning' ? 'Warning' : 'Confirm');

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-200 ${
        visible ? 'bg-black/30 backdrop-blur-[2px]' : 'bg-black/0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={`relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 transition-all duration-200 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        <div className="px-6 pt-6 pb-2 text-center">
          {v.icon}
          <h3 className="mt-3 text-[15px] font-semibold text-[#1c2a2b]">{resolvedTitle}</h3>
          <p className="mt-1.5 text-[13px] text-[#1c2a2b]/60 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-5 pt-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#1c2a2b]/70 bg-[#f5f4f0] hover:bg-[#eae8e3] rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ceab84]"
          >
            {cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-[13px] font-medium rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${v.confirmBtn}`}
          >
            {confirmLabel ?? (variant === 'danger' ? 'Delete' : 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
