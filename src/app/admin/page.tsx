import { createClient } from '@/lib/supabase/server';
import PageShell from '@/components/admin/PageShell';

const STATS = [
  { label: 'Users', key: 'profiles' },
  { label: 'Orders', key: 'orders' },
  { label: 'Products', key: 'products' },
  { label: 'Articles', key: 'articles' },
];

export default async function AdminDashboard() {
  const supabase = await createClient();

  const counts = await Promise.all(
    STATS.map(({ key }) =>
      supabase.from(key).select('*', { count: 'exact', head: true }).then(({ count }) => count ?? 0)
    )
  );

  return (
    <PageShell title="Dashboard" description="Platform overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label }, i) => (
          <div key={label} className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-5">
            <p className="text-xs text-[#1c2a2b]/40 uppercase tracking-widest mb-1">{label}</p>
            <p className="font-serif text-3xl text-[#0e393d]">{counts[i]}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
        Recent activity — coming soon
      </div>
    </PageShell>
  );
}
