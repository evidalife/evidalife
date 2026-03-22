'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';

interface IngredientItem {
  ingredient_name: Record<string, string> | string | null;
  amount?: number | null;
  unit?: string | Record<string, string> | null;
}

interface Props {
  ingredients: IngredientItem[];
  recipeId: string;
  lang?: string;
}

const T = {
  de: { add: 'Alle hinzufügen', adding: 'Wird hinzugefügt…', added: 'Alle hinzugefügt' },
  en: { add: 'Add All to List', adding: 'Adding…', added: 'All Added!' },
};

export default function AddAllToShoppingListButton({ ingredients, recipeId, lang = 'de' }: Props) {
  const { user } = useAuth();
  const supabase = createClient();
  const t = (T as Record<string, typeof T.en>)[lang] ?? T.en;

  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle');

  if (!user) return null;

  const handleAddAll = async () => {
    if (state !== 'idle' || ingredients.length === 0) return;
    setState('adding');

    // Get or create active shopping list
    let listId: string | null = null;
    const { data: existing } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      listId = existing.id;
    } else {
      const { data: created } = await supabase
        .from('shopping_lists')
        .insert({ user_id: user.id, name: lang === 'de' ? 'Einkaufsliste' : 'Shopping List' /* fr/es/it use EN default */ })
        .select('id')
        .single();
      listId = created?.id ?? null;
    }

    if (!listId) { setState('idle'); return; }

    // Get max sort_order
    const { data: last } = await supabase
      .from('shopping_list_items')
      .select('sort_order')
      .eq('list_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    let sortOrder = last ? last.sort_order + 1 : 0;

    // Build and insert rows
    const rows = ingredients.map((ing) => {
      const rawName = ing.ingredient_name;
      const name = !rawName
        ? { de: '', en: '' }
        : typeof rawName === 'string'
        ? { de: rawName, en: rawName }
        : { de: (rawName as Record<string, string>).de ?? '', en: (rawName as Record<string, string>).en ?? '' };

      const unit = !ing.unit
        ? null
        : typeof ing.unit === 'string'
        ? ing.unit
        : (ing.unit as Record<string, string>)?.[lang] ??
          (ing.unit as Record<string, string>)?.en ??
          (ing.unit as Record<string, string>)?.de ??
          null;

      return {
        list_id: listId,
        ingredient_name: name,
        amount: ing.amount ?? null,
        unit,
        recipe_id: recipeId,
        sort_order: sortOrder++,
      };
    });

    await supabase.from('shopping_list_items').insert(rows);

    setState('added');
    setTimeout(() => setState('idle'), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleAddAll}
      disabled={state !== 'idle'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition print:hidden ${
        state === 'added'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'border-[#0e393d]/15 text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/30'
      }`}
    >
      {state === 'added' ? (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t.added}
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M12 11v6M9 14h6" />
          </svg>
          {state === 'adding' ? t.adding : t.add}
        </>
      )}
    </button>
  );
}
