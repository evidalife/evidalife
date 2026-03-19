'use client';

interface Props {
  label?: string;
}

export default function PrintButton({ label = 'Print' }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0e393d]/15 text-xs font-medium text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/30 transition print:hidden"
      aria-label={label}
    >
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {label}
    </button>
  );
}
