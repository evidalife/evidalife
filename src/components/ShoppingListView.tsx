'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en';

type IngredientName = { de?: string; en?: string } | string;

export type ShoppingListItem = {
  id: string;
  list_id: string;
  ingredient_name: IngredientName;
  amount: number | null;
  unit: string | null;
  recipe_id: string | null;
  is_checked: boolean;
  sort_order: number;
  created_at: string;
  // joined from recipes
  recipe_title?: { de?: string; en?: string } | null;
};

export type ShoppingList = {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIngredientLabel(name: IngredientName, lang: Lang): string {
  if (typeof name === 'string') return name;
  return name?.[lang] || name?.de || name?.en || '—';
}

function formatAmount(amount: number | null, unit: string | null): string {
  if (amount == null && !unit) return '';
  const parts = [];
  if (amount != null) parts.push(amount % 1 === 0 ? String(amount) : amount.toFixed(1));
  if (unit) parts.push(unit);
  return parts.join(' ');
}

const T = {
  de: {
    title: 'Einkaufsliste',
    empty: 'Deine Liste ist leer.',
    emptyHint: 'Füge Zutaten hinzu oder starte von einem Rezept.',
    addPlaceholder: 'Zutat hinzufügen…',
    addAmountPlaceholder: 'Menge',
    addUnitPlaceholder: 'Einheit',
    add: 'Hinzufügen',
    checkedSection: 'Erledigt',
    clearChecked: 'Erledigte löschen',
    loginPrompt: 'Bitte melde dich an, um deine Einkaufsliste zu sehen.',
    loginBtn: 'Anmelden',
    loading: 'Lade Liste…',
    itemsCount: (n: number) => `${n} ${n === 1 ? 'Artikel' : 'Artikel'}`,
  },
  en: {
    title: 'Shopping List',
    empty: 'Your list is empty.',
    emptyHint: 'Add ingredients or start from a recipe.',
    addPlaceholder: 'Add an ingredient…',
    addAmountPlaceholder: 'Qty',
    addUnitPlaceholder: 'Unit',
    add: 'Add',
    checkedSection: 'Done',
    clearChecked: 'Remove done items',
    loginPrompt: 'Please sign in to view your shopping list.',
    loginBtn: 'Sign in',
    loading: 'Loading list…',
    itemsCount: (n: number) => `${n} item${n !== 1 ? 's' : ''}`,
  },
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  lang: Lang;
  initialList: ShoppingList | null;
  initialItems: ShoppingListItem[];
  userId: string | null;
}

export default function ShoppingListView({ lang, initialList, initialItems, userId }: Props) {
  const t = T[lang];
  const supabase = createClient();

  const [list, setList] = useState<ShoppingList | null>(initialList);
  const [items, setItems] = useState<ShoppingListItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [showChecked, setShowChecked] = useState(true);

  // Add-item form
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [adding, setAdding] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const unchecked = items.filter((i) => !i.is_checked);
  const checked   = items.filter((i) => i.is_checked);

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!list) return;
    const channel = supabase
      .channel(`shopping_list_items:${list.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_list_items', filter: `list_id=eq.${list.id}` },
        () => { refreshItems(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [list?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data helpers ──────────────────────────────────────────────────────────

  const refreshItems = useCallback(async () => {
    if (!list) return;
    const { data } = await supabase
      .from('shopping_list_items')
      .select('*, recipes(title)')
      .eq('list_id', list.id)
      .order('sort_order')
      .order('created_at');
    if (data) {
      setItems(data.map((row) => ({ ...row, recipe_title: (row.recipes as { title?: { de?: string; en?: string } } | null)?.title ?? null })));
    }
  }, [list, supabase]);

  const ensureList = useCallback(async (): Promise<ShoppingList | null> => {
    if (list) return list;
    if (!userId) return null;
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ user_id: userId, name: lang === 'de' ? 'Einkaufsliste' : 'Shopping List' })
      .select()
      .single();
    if (error || !data) return null;
    setList(data);
    return data;
  }, [list, userId, lang, supabase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { nameInputRef.current?.focus(); return; }
    setAdding(true);
    const activeList = await ensureList();
    if (!activeList) { setAdding(false); return; }

    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: activeList.id,
        ingredient_name: { de: name, en: name },
        amount: newAmount ? Number(newAmount) : null,
        unit: newUnit.trim() || null,
        sort_order: maxOrder,
      })
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, { ...data, recipe_title: null }]);
      setNewName('');
      setNewAmount('');
      setNewUnit('');
      nameInputRef.current?.focus();
    }
    setAdding(false);
  };

  const handleToggle = async (item: ShoppingListItem) => {
    const newVal = !item.is_checked;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_checked: newVal } : i));
    await supabase.from('shopping_list_items').update({ is_checked: newVal }).eq('id', item.id);
  };

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('shopping_list_items').delete().eq('id', id);
  };

  const handleClearChecked = async () => {
    const ids = checked.map((i) => i.id);
    if (!ids.length) return;
    setItems((prev) => prev.filter((i) => !i.is_checked));
    await supabase.from('shopping_list_items').delete().in('id', ids);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  // ── Not logged in ─────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-[#0e393d]/8 flex items-center justify-center mx-auto mb-5">
            <CartIcon className="w-6 h-6 text-[#0e393d]/50" />
          </div>
          <h2 className="font-serif text-2xl text-[#0e393d] mb-2">{t.title}</h2>
          <p className="text-[#1c2a2b]/60 text-sm mb-6">{t.loginPrompt}</p>
          <Link
            href="/login"
            className="inline-block bg-[#0e393d] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#0e393d]/90 transition"
          >
            {t.loginBtn}
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[#1c2a2b]/40">
        {t.loading}
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 w-full max-w-xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-[#0e393d]">{t.title}</h1>
          {items.length > 0 && (
            <p className="mt-0.5 text-sm text-[#1c2a2b]/40">
              {t.itemsCount(unchecked.length)} {lang === 'de' ? 'offen' : 'remaining'}
            </p>
          )}
        </div>
        {checked.length > 0 && (
          <button
            onClick={handleClearChecked}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition"
          >
            {t.clearChecked}
          </button>
        )}
      </div>

      {/* Add item form */}
      <div className="flex gap-2 mb-6">
        <input
          ref={nameInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.addPlaceholder}
          className="flex-1 rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <input
          type="number"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.addAmountPlaceholder}
          min={0}
          step={0.1}
          className="w-16 rounded-xl border border-[#0e393d]/15 bg-white px-2 py-2.5 text-sm text-center text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <input
          type="text"
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.addUnitPlaceholder}
          className="w-16 rounded-xl border border-[#0e393d]/15 bg-white px-2 py-2.5 text-sm text-center text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition shrink-0"
        >
          {adding ? '…' : t.add}
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-[#0e393d]/6 flex items-center justify-center mx-auto mb-4">
            <CartIcon className="w-5 h-5 text-[#0e393d]/30" />
          </div>
          <p className="text-sm text-[#1c2a2b]/50">{t.empty}</p>
          <p className="text-xs text-[#1c2a2b]/30 mt-1">{t.emptyHint}</p>
        </div>
      )}

      {/* Unchecked items */}
      {unchecked.length > 0 && (
        <ul className="space-y-1.5 mb-6">
          {unchecked.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              lang={lang}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {/* Checked items */}
      {checked.length > 0 && (
        <div>
          <button
            onClick={() => setShowChecked((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-2 hover:text-[#ceab84]/70 transition"
          >
            <ChevronIcon
              className={`w-3 h-3 transition-transform ${showChecked ? 'rotate-90' : ''}`}
            />
            {t.checkedSection} ({checked.length})
          </button>
          {showChecked && (
            <ul className="space-y-1.5 opacity-60">
              {checked.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  lang={lang}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow({
  item, lang, onToggle, onDelete,
}: {
  item: ShoppingListItem;
  lang: Lang;
  onToggle: (item: ShoppingListItem) => void;
  onDelete: (id: string) => void;
}) {
  const label  = getIngredientLabel(item.ingredient_name, lang);
  const amount = formatAmount(item.amount, item.unit);
  const recipe = item.recipe_title
    ? (item.recipe_title as { de?: string; en?: string })[lang] || (item.recipe_title as { de?: string; en?: string }).de
    : null;

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-[#0e393d]/8 bg-white px-4 py-3 hover:border-[#0e393d]/15 transition">
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
          item.is_checked
            ? 'bg-[#0e393d] border-[#0e393d]'
            : 'border-[#0e393d]/25 hover:border-[#0e393d]/60'
        }`}
      >
        {item.is_checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm text-[#1c2a2b] ${item.is_checked ? 'line-through text-[#1c2a2b]/40' : ''}`}>
          {label}
        </span>
        {(amount || recipe) && (
          <div className="flex items-center gap-2 mt-0.5">
            {amount && <span className="text-xs text-[#1c2a2b]/40">{amount}</span>}
            {recipe && (
              <>
                {amount && <span className="text-[#1c2a2b]/20">·</span>}
                <span className="text-xs text-[#ceab84]/80">{recipe}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-[#1c2a2b]/30 hover:text-red-500 hover:bg-red-50 transition"
        aria-label="Remove"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
        </svg>
      </button>
    </li>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
