import PageShell from '@/components/admin/PageShell';

export default function ArticlesPage() {
  return (
    <PageShell
      title="Articles"
      description="Write and publish evidence-based health articles."
      action={
        <button className="px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm hover:bg-[#0e393d]/90 transition">
          + New Article
        </button>
      }
    />
  );
}
