'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

interface Props {
  ingredientName: { de: string; en: string } | string;
  amount?: number | null;
  unit?: string | null;
  recipeId?: string | null;
  lang?: Lang;
  /** Optional class overrides for the button */
  className?: string;
  /** Render as icon-only (compact) or full label */
  compact?: boolean;
}

const T = {
  de: { add: 'Zur Liste', added: 'Hinzugefügt', login: 'Anmelden' },
  en: { add: 'Add to list', added: 'Added', login: 'Sign in' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddToShoppingListButton({
  ingredientName,
  amount = null,
  unit = null,
  recipeId = null,
  lang = 'de',
  className,
  compact = false,
}: Props) {
  const { user } = useAuth();
  const supabase = createClient();
  const t = T[lang];

  const [state, setState] = useState<'idle' | 'adding' | 'added'>('idle');

  const handleAdd = async () => {
    if (!user || state !== 'idle') return;
    setState('adding');

    // Ensure an active list exists for this user
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
        .insert({ user_id: user.id, name: lang === 'de' ? 'Einkaufsliste' : 'Shopping List' })
        .select('id')
        .single();
      listId = created?.id ?? null;
    }

    if (!listId) { setState('idle'); return; }

    // Get current max sort_order
    const { data: last } = await supabase
      .from('shopping_list_items')
      .select('sort_order')
      .eq('list_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = last ? last.sort_order + 1 : 0;

    // Normalise ingredient_name to { de, en }
    const name = typeof ingredientName === 'string'
      ? { de: ingredientName, en: ingredientName }
      : ingredientName;

    await supabase.from('shopping_list_items').insert({
      list_id: listId,
      ingredient_name: name,
      amount,
      unit,
      recipe_id: recipeId,
      sort_order: sortOrder,
    });

    setState('added');
    // Reset after 2 s so button is reusable
    setTimeout(() => setState('idle'), 2000);
  };

  const isAdded = state === 'added';
  const isBusy  = state === 'adding';

  const baseClass = className ?? (compact
    ? 'flex items-center justify-center w-8 h-8 rounded-full border border-[#0e393d]/15 text-[#0e393d]/50 hover:border-[#0e393d]/40 hover:text-[#0e393d] hover:bg-[#0e393d]/5 transition'
    : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0e393d]/15 text-xs font-medium text-[#0e393d] hover:bg-[#0e393d]/5 hover:border-[#0e393d]/30 transition'
  );

  const addedClass = compact
    ? 'flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600'
    : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700';

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isBusy || !user}
      title={isAdded ? t.added : t.add}
      className={isAdded ? addedClass : baseClass}
      aria-label={isAdded ? t.added : t.add}
    >
      {isAdded ? (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {!compact && t.added}
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M12 11v6M9 14h6"/>
          </svg>
          {!compact && (isBusy ? '…' : t.add)}
        </>
      )}
    </button>
  );
}
