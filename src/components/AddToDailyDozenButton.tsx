'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  categorySlugs: string[];
  label: string;
};

export default function AddToDailyDozenButton({ categorySlugs, label }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const supabase = createClient();

  const handleClick = useCallback(async () => {
    if (state === 'loading' || categorySlugs.length === 0) return;
    setState('loading');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState('idle');
        return;
      }

      // Resolve slugs → category UUIDs
      const { data: categories } = await supabase
        .from('daily_dozen_categories')
        .select('id, slug')
        .in('slug', categorySlugs);

      const categoryIds = (categories ?? []).map((c) => c.id);
      if (categoryIds.length === 0) {
        setState('idle');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Fetch current servings for today
      const { data: existing } = await supabase
        .from('daily_dozen_entries')
        .select('category_id, servings_completed')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .in('category_id', categoryIds);

      const currentMap = new Map(
        (existing ?? []).map((e) => [e.category_id, e.servings_completed ?? 0])
      );

      // Upsert +1 serving for each category
      const rows = categoryIds.map((id) => ({
        user_id: user.id,
        category_id: id,
        entry_date: today,
        servings_completed: (currentMap.get(id) ?? 0) + 1,
      }));

      await supabase
        .from('daily_dozen_entries')
        .upsert(rows, { onConflict: 'user_id,entry_date,category_id' });

      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('idle');
    }
  }, [categorySlugs, state, supabase]);

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
        state === 'done'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-[#ceab84]/12 text-[#8a6a3e] hover:bg-[#ceab84]/25'
      }`}
    >
      {state === 'loading' ? (
        <span className="inline-flex items-center gap-1">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          …
        </span>
      ) : state === 'done' ? (
        <span>✓ {label}</span>
      ) : (
        <span>+ {label}</span>
      )}
    </button>
  );
}
