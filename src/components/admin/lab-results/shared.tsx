'use client';

// Shared primitives for LabResultsManager tabs

import { FLAG_COLOR_CLASS, FLAG_DOT_COLOR, FLAG_LABEL, StatusFlag } from '@/lib/lab-results/flagging';

export type { StatusFlag };
export { FLAG_LABEL, FLAG_COLOR_CLASS, FLAG_DOT_COLOR };

export type LocalizedString = string | Record<string, string>;
export function locName(field: LocalizedString | null | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field.en || field.de || '';
}

export const HE_DOMAIN_LABEL: Record<string, string> = {
  heart_vessels:    'Heart & Vessels',
  metabolism:       'Metabolism',
  inflammation:     'Inflammation & Immune',
  organ_function:   'Organ Function',
  nutrients:        'Nutrients',
  hormones:         'Hormones',
  body_composition: 'Body Composition',
  fitness:          'Fitness & Recovery',
  epigenetics:      'Epigenetics / Bio Age',
  genetics:         'Genetics / DNA Risk',
  // legacy values kept for display compatibility
  longevity:        'Longevity',
};

export const HE_DOMAIN_ORDER = [
  'heart_vessels', 'metabolism', 'inflammation', 'organ_function',
  'nutrients', 'hormones', 'body_composition', 'fitness', 'epigenetics', 'genetics',
];

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function FlagBadge({ flag }: { flag: StatusFlag | string | null | undefined }) {
  if (!flag) return <span className="text-[11px] text-[#1c2a2b]/30">—</span>;
  const cls = FLAG_COLOR_CLASS[flag as StatusFlag] ?? 'bg-gray-50 text-gray-500 ring-gray-400/20';
  const label = FLAG_LABEL[flag as StatusFlag] ?? flag;
  return <Badge className={cls}>{label}</Badge>;
}

export function FlagDot({ flag }: { flag: StatusFlag | string | null | undefined }) {
  const color = FLAG_DOT_COLOR[flag as StatusFlag] ?? '#888';
  return <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: color }} />;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#ceab84] mb-3">
      {children}
    </p>
  );
}

export function Spinner({ size = 4 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border border-[#0e393d]/30 border-t-[#0e393d] shrink-0"
      style={{ height: `${size * 4}px`, width: `${size * 4}px` }}
    />
  );
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type Toast = { id: number; message: string; type: 'success' | 'error' };
let _toastId = 0;
export function nextToastId() { return ++_toastId; }

export function ToastContainer({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
            t.type === 'success' ? 'bg-[#0e393d] text-white' : 'bg-red-600 text-white'
          }`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}
