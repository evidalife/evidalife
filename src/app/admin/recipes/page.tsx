import PageShell from '@/components/admin/PageShell';

export default function RecipesPage() {
  return (
    <PageShell
      title="Recipes"
      description="Manage plant-based recipes in the database."
      action={
        <button className="px-4 py-2 rounded-lg bg-[#0e393d] text-white text-sm hover:bg-[#0e393d]/90 transition">
          + New Recipe
        </button>
      }
    />
  );
}
