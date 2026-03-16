import PageShell from '@/components/admin/PageShell';

export default function DiscountCodesPage() {
  return (
    <PageShell
      title="Discount Codes"
      description="Create and manage promotional discount codes."
      action={
        <button className="px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm hover:bg-[#0e393d]/90 transition">
          + New Code
        </button>
      }
    />
  );
}
