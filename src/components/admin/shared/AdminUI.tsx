'use client';

import React from 'react';

// ─── Design tokens ─────────────────────────────────────────────────────────────
// Shared across all admin pages for consistent look & feel.
// Brand colours: deep-teal #0e393d, warm-gold #ceab84, off-white #fafaf8

// ─── Input / Select class strings ────────────────────────────────────────────

export const inputCls =
  'w-full rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition';

export const selectCls = inputCls + ' cursor-pointer';

// ─── Page Header ─────────────────────────────────────────────────────────────

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-serif text-2xl text-[#0e393d]">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[#1c2a2b]/40 mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Primary Action Button ───────────────────────────────────────────────────

export function AdminPrimaryButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon?: 'plus' | 'none';
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 shadow-sm shadow-[#0e393d]/20 transition"
    >
      {icon !== 'none' && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
      {label}
    </button>
  );
}

// ─── Stat Cards ──────────────────────────────────────────────────────────────

export type StatCardVariant = 'default' | 'purple' | 'emerald' | 'amber' | 'gold' | 'auto-health';

export function StatCard({
  value,
  label,
  detail,
  variant = 'default',
}: {
  value: number | string;
  label: string;
  detail?: string;
  variant?: StatCardVariant;
}) {
  const styles: Record<StatCardVariant, { border: string; bg: string; value: string; label: string }> = {
    default:       { border: 'border-[#0e393d]/8',      bg: 'from-white to-[#0e393d]/[0.02]',   value: 'text-[#0e393d]',   label: 'text-[#1c2a2b]/50' },
    purple:        { border: 'border-purple-200/60',     bg: 'from-white to-purple-50/30',        value: 'text-purple-700',  label: 'text-purple-600/60' },
    emerald:       { border: 'border-emerald-200/60',    bg: 'from-white to-emerald-50/30',       value: 'text-emerald-700', label: 'text-emerald-600/60' },
    amber:         { border: 'border-amber-200/60',      bg: 'from-white to-amber-50/30',         value: 'text-amber-700',   label: 'text-amber-600/60' },
    gold:          { border: 'border-[#ceab84]/30',      bg: 'from-white to-[#ceab84]/[0.04]',    value: 'text-[#8a6a3e]',  label: 'text-[#8a6a3e]/60' },
    'auto-health': { border: 'border-emerald-200/60',    bg: 'from-white to-emerald-50/30',       value: 'text-emerald-700', label: 'text-emerald-600/60' },
  };
  // auto-health: if numeric 0, swap to amber
  const resolvedVariant = variant === 'auto-health' && value === 0 ? 'emerald' : variant;
  const s = resolvedVariant === 'auto-health'
    ? (typeof value === 'number' && value > 0 ? styles.amber : styles.emerald)
    : styles[resolvedVariant] ?? styles.default;

  return (
    <div className={`rounded-xl border ${s.border} bg-gradient-to-br ${s.bg} px-4 py-3`}>
      <div className={`text-2xl font-semibold ${s.value}`}>{value}</div>
      <div className={`text-xs mt-0.5 ${s.label}`}>{label}</div>
      {detail && <div className="mt-2 text-[10px] text-[#1c2a2b]/40">{detail}</div>}
    </div>
  );
}

export function StatCardRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {children}
    </div>
  );
}

// ─── Search Field with icon ──────────────────────────────────────────────────

export function AdminSearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className = 'w-56',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 pointer-events-none"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#0e393d]/12 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/30 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/8 transition"
      />
    </div>
  );
}

// ─── Table Container ─────────────────────────────────────────────────────────

export function AdminTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden shadow-sm">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/[0.03]">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTh({
  label,
  sortKey,
  active,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey?: string;
  active?: boolean;
  direction?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
}) {
  if (!sortKey || !onSort) {
    return (
      <th className={`px-3 py-3 text-left ${className ?? ''}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#0e393d]/50">
          {label}
        </span>
      </th>
    );
  }
  return (
    <th className={`px-3 py-3 text-left ${className ?? ''}`}>
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition hover:text-[#0e393d] ${
          active ? 'text-[#0e393d]' : 'text-[#0e393d]/50'
        }`}
      >
        {label}
        <span className="text-[10px] leading-none">
          {active && direction === 'asc'
            ? '▲'
            : active && direction === 'desc'
              ? '▼'
              : <span className="opacity-0">▲</span>}
        </span>
      </button>
    </th>
  );
}

// ─── Table Footer ────────────────────────────────────────────────────────────

export function AdminTableFooter({
  showing,
  total,
  onClearFilters,
  hasFilters,
}: {
  showing: number;
  total: number;
  onClearFilters?: () => void;
  hasFilters?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-[#1c2a2b]/40 px-1">
      <span>Showing {showing} of {total}</span>
      {hasFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="text-[#0e393d]/60 hover:text-[#0e393d] underline underline-offset-2 transition"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function AdminEmptyRow({
  colSpan,
  message = 'No results found',
  hint = 'Try adjusting your search or filters',
}: {
  colSpan: number;
  message?: string;
  hint?: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <div className="text-[#1c2a2b]/30 text-sm">{message}</div>
        {hint && <p className="text-xs text-[#1c2a2b]/20 mt-1">{hint}</p>}
      </td>
    </tr>
  );
}

// ─── Slide-over Panel ────────────────────────────────────────────────────────

export function AdminPanel({
  open,
  onClose,
  title,
  subtitle,
  headerRight,
  footer,
  children,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full ${width} flex-col bg-white shadow-2xl rounded-l-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0e393d]/10 px-6 py-4 shrink-0">
          <div>
            <h2 className="font-serif text-lg text-[#0e393d]">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-[#1c2a2b]/35 mt-0.5 font-mono">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#1c2a2b]/40 hover:text-[#1c2a2b] hover:bg-[#0e393d]/5 transition"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="border-t border-[#0e393d]/10 px-6 py-4 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Panel Footer (save/cancel) ──────────────────────────────────────────────

export function AdminPanelFooter({
  error,
  saving,
  onCancel,
  onSave,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
}: {
  error?: string | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[#0e393d]/15 py-2.5 text-sm font-medium text-[#1c2a2b] hover:bg-[#fafaf8] transition"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-[#0e393d] py-2.5 text-sm font-medium text-white hover:bg-[#0e393d]/90 disabled:opacity-50 transition"
        >
          {saving ? 'Saving…' : saveLabel}
        </button>
      </div>
    </>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export type BadgeColor = 'green' | 'gray' | 'red' | 'gold' | 'teal' | 'amber' | 'purple' | 'sky';

export function AdminBadge({
  color,
  children,
}: {
  color: BadgeColor;
  children: React.ReactNode;
}) {
  const cls: Record<BadgeColor, string> = {
    green:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray:   'bg-gray-100 text-gray-500 ring-gray-300/40',
    red:    'bg-red-50 text-red-700 ring-red-600/20',
    gold:   'bg-[#ceab84]/15 text-[#8a6a3e] ring-[#ceab84]/30',
    teal:   'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
    amber:  'bg-amber-50 text-amber-700 ring-amber-600/20',
    purple: 'bg-purple-100 text-purple-700 ring-purple-200',
    sky:    'bg-sky-50 text-sky-700 ring-sky-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls[color]}`}
    >
      {children}
    </span>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export function AdminToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#0e393d]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────

export function AdminField({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#0e393d]/70 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-[#1c2a2b]/40">{hint}</p>}
    </div>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

export function AdminTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="border-b border-[#0e393d]/8 px-8 pt-5">
      <div className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
              active === tab.id
                ? 'text-[#0e393d] bg-white'
                : 'text-[#0e393d]/45 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/[0.03]'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {tab.count > 9 ? '9+' : tab.count}
              </span>
            )}
            {active === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e393d] rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Section Block (collapsible) ─────────────────────────────────────────────

export function AdminSectionBlock({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#0e393d]/8">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#fafaf8] transition"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84]">
          {title}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-[#0e393d]/30 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-6 pb-5 space-y-4">{children}</div>}
    </div>
  );
}
