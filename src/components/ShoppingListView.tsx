'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { localized } from '@/lib/localized';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Lang = 'de' | 'en' | 'fr' | 'es' | 'it';
type IngredientName = Record<string, string> | string;

export type ShoppingListItem = {
  id: string;
  list_id: string;
  ingredient_name: IngredientName;
  amount: number | null;
  unit: string | null;
  recipe_id: string | null;
  is_checked: boolean;
  is_personal?: boolean;
  personal_name?: string | null;
  sort_order: number;
  created_at: string;
  recipe_title?: Record<string, string> | null;
};

export type ShoppingList = {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type IngredientSuggestion = { id: string; name: Record<string, string> };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getIngredientLabel(name: IngredientName, lang: Lang): string {
  if (typeof name === 'string') return name;
  return localized(name as Record<string, string>, lang) || '—';
}

function formatAmount(amount: number | null, unit: string | null): string {
  if (amount == null && !unit) return '';
  const parts: string[] = [];
  if (amount != null) parts.push(amount % 1 === 0 ? String(amount) : amount.toFixed(1));
  if (unit) parts.push(unit);
  return parts.join(' ');
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-[#0e393d]">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Translations ──────────────────────────────────────────────────────────────

const T = {
  de: {
    eyebrow: 'Meine Liste',
    heading: 'Einkaufsliste',
    addIngredient: 'Zutat suchen…',
    quickAdd: 'Persönlichen Artikel hinzufügen…',
    fromRecipes: 'Aus Rezepten',
    personal: 'Persönliche Artikel',
    allFilter: 'Alle',
    clearChecked: 'Erledigte löschen',
    xOfY: (x: number, y: number) => `${x} von ${y} erledigt`,
    noItems: 'Deine Liste ist leer.',
    noItemsHint: 'Füge Zutaten hinzu oder starte von einem Rezept.',
    loginPrompt: 'Bitte melde dich an, um deine Einkaufsliste zu sehen.',
    loginBtn: 'Anmelden',
    loading: 'Lade Liste…',
    removeAria: 'Entfernen',
    qty: 'Menge',
    unitLabel: 'Einheit',
    add: 'Hinzufügen',
  },
  en: {
    eyebrow: 'My List',
    heading: 'Shopping List',
    addIngredient: 'Search ingredient…',
    quickAdd: 'Add a personal item…',
    fromRecipes: 'From recipes',
    personal: 'Personal items',
    allFilter: 'All',
    clearChecked: 'Clear checked',
    xOfY: (x: number, y: number) => `${x} of ${y} checked`,
    noItems: 'Your list is empty.',
    noItemsHint: 'Add ingredients or start from a recipe.',
    loginPrompt: 'Please sign in to view your shopping list.',
    loginBtn: 'Sign in',
    loading: 'Loading list…',
    removeAria: 'Remove',
    qty: 'Qty',
    unitLabel: 'Unit',
    add: 'Add',
  },
  fr: {
    eyebrow: 'Ma liste',
    heading: 'Liste de courses',
    addIngredient: 'Rechercher un ingrédient…',
    quickAdd: 'Ajouter un article personnel…',
    fromRecipes: 'Issus de recettes',
    personal: 'Articles personnels',
    allFilter: 'Tous',
    clearChecked: 'Supprimer les cochés',
    xOfY: (x: number, y: number) => `${x} sur ${y} cochés`,
    noItems: 'Votre liste est vide.',
    noItemsHint: 'Ajoutez des ingrédients ou commencez par une recette.',
    loginPrompt: 'Connectez-vous pour voir votre liste de courses.',
    loginBtn: 'Se connecter',
    loading: 'Chargement…',
    removeAria: 'Supprimer',
    qty: 'Qté',
    unitLabel: 'Unité',
    add: 'Ajouter',
  },
  es: {
    eyebrow: 'Mi lista',
    heading: 'Lista de compras',
    addIngredient: 'Buscar ingrediente…',
    quickAdd: 'Agregar artículo personal…',
    fromRecipes: 'De recetas',
    personal: 'Artículos personales',
    allFilter: 'Todos',
    clearChecked: 'Borrar marcados',
    xOfY: (x: number, y: number) => `${x} de ${y} marcados`,
    noItems: 'Tu lista está vacía.',
    noItemsHint: 'Agrega ingredientes o empieza desde una receta.',
    loginPrompt: 'Por favor inicia sesión para ver tu lista de compras.',
    loginBtn: 'Iniciar sesión',
    loading: 'Cargando…',
    removeAria: 'Eliminar',
    qty: 'Cant.',
    unitLabel: 'Unidad',
    add: 'Agregar',
  },
  it: {
    eyebrow: 'La mia lista',
    heading: 'Lista della spesa',
    addIngredient: 'Cerca ingrediente…',
    quickAdd: 'Aggiungi articolo personale…',
    fromRecipes: 'Dalle ricette',
    personal: 'Articoli personali',
    allFilter: 'Tutti',
    clearChecked: 'Rimuovi selezionati',
    xOfY: (x: number, y: number) => `${x} di ${y} selezionati`,
    noItems: 'La tua lista è vuota.',
    noItemsHint: 'Aggiungi ingredienti o inizia da una ricetta.',
    loginPrompt: 'Accedi per vedere la tua lista della spesa.',
    loginBtn: 'Accedi',
    loading: 'Caricamento…',
    removeAria: 'Rimuovi',
    qty: 'Qtà',
    unitLabel: 'Unità',
    add: 'Aggiungi',
  },
};

// ─── ProgressRing ──────────────────────────────────────────────────────────────

function ProgressRing({ checked, total }: { checked: number; total: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const progress = total > 0 ? checked / total : 0;
  const offset = circ * (1 - progress);
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#0e393d12" strokeWidth="3.5" />
      <circle
        cx="24" cy="24" r={r}
        fill="none"
        stroke="#0C9C6C"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      <text x="24" y="28.5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0e393d" fontFamily="sans-serif">
        {checked}/{total}
      </text>
    </svg>
  );
}

// ─── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({
  item, lang, onToggle, onDelete, removeAria,
}: {
  item: ShoppingListItem;
  lang: Lang;
  onToggle: (item: ShoppingListItem) => void;
  onDelete: (id: string) => void;
  removeAria: string;
}) {
  const label = item.is_personal && item.personal_name
    ? item.personal_name
    : getIngredientLabel(item.ingredient_name, lang);
  const amount = formatAmount(item.amount, item.unit);
  const recipe = (!item.is_personal && item.recipe_title)
    ? localized(item.recipe_title, lang)
    : null;

  return (
    <li className={`group flex items-center gap-3 rounded-xl border border-[#0e393d]/8 bg-white px-4 py-3 hover:border-[#0e393d]/15 transition ${item.is_checked ? 'opacity-45' : ''}`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-pressed={item.is_checked}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
          item.is_checked
            ? 'bg-[#0C9C6C] border-[#0C9C6C]'
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
        <span className={`text-sm text-[#1c2a2b] ${item.is_checked ? 'line-through' : ''}`}>
          {label}
        </span>
        {(amount || recipe) && (
          <div className="flex items-center gap-2 mt-0.5">
            {amount && <span className="text-xs text-[#1c2a2b]/40">{amount}</span>}
            {recipe && (
              <>
                {amount && <span className="text-[#1c2a2b]/20">·</span>}
                <span className="hidden sm:inline text-xs text-[#ceab84]/80">{recipe}</span>
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
        aria-label={removeAria}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
        </svg>
      </button>
    </li>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

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

  // Recipe filter
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);

  // Ingredient autocomplete
  const [ingQuery, setIngQuery] = useState('');
  const [ingResults, setIngResults] = useState<IngredientSuggestion[]>([]);
  const [ingOpen, setIngOpen] = useState(false);
  const [selectedIng, setSelectedIng] = useState<IngredientSuggestion | null>(null);
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [addingIng, setAddingIng] = useState(false);
  const ingContainerRef = useRef<HTMLDivElement>(null);
  const ingInputRef = useRef<HTMLInputElement>(null);

  // Personal quick-add
  const [personalText, setPersonalText] = useState('');
  const [addingPersonal, setAddingPersonal] = useState(false);
  const personalInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const recipeItems = items.filter((i) => !i.is_personal);
  const personalItems = items.filter((i) => i.is_personal);
  const filteredRecipeItems = activeRecipe
    ? recipeItems.filter((i) => i.recipe_id === activeRecipe)
    : recipeItems;
  const totalChecked = items.filter((i) => i.is_checked).length;
  const totalItems = items.length;

  const uniqueRecipes = Array.from(
    new Map(
      items
        .filter((i) => i.recipe_id && i.recipe_title)
        .map((i) => [i.recipe_id!, { id: i.recipe_id!, title: i.recipe_title! }])
    ).values()
  );

  // ── Close autocomplete on outside click ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ingContainerRef.current && !ingContainerRef.current.contains(e.target as Node)) {
        setIngOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Ingredient search ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (ingQuery.length < 2) { setIngResults([]); setIngOpen(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name')
        .filter(`name->>${lang}`, 'ilike', `%${ingQuery}%`)
        .limit(8);
      if (!cancelled) {
        setIngResults((data as IngredientSuggestion[] | null) ?? []);
        setIngOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [ingQuery, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ──────────────────────────────────────────────────────

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

  // ── Data helpers ───────────────────────────────────────────────────────────────

  const refreshItems = useCallback(async () => {
    if (!list) return;
    const { data } = await supabase
      .from('shopping_list_items')
      .select('*, recipes(title)')
      .eq('list_id', list.id)
      .order('sort_order')
      .order('created_at');
    if (data) {
      setItems(data.map((row) => ({
        ...row,
        recipe_title: (row.recipes as { title?: Record<string, string> } | null)?.title ?? null,
      })));
    }
  }, [list, supabase]);

  const ensureList = useCallback(async (): Promise<ShoppingList | null> => {
    if (list) return list;
    if (!userId) return null;
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert({ user_id: userId, name: t.heading })
      .select()
      .single();
    if (error || !data) return null;
    setList(data);
    return data;
  }, [list, userId, t.heading, supabase]);

  // ── Actions ────────────────────────────────────────────────────────────────────

  const handleSelectIngredient = (ing: IngredientSuggestion) => {
    setSelectedIng(ing);
    setIngQuery(localized(ing.name, lang) || '');
    setIngOpen(false);
    setIngResults([]);
  };

  const handleAddIngredient = async () => {
    if (!selectedIng) return;
    setAddingIng(true);
    const activeList = await ensureList();
    if (!activeList) { setAddingIng(false); return; }
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: activeList.id,
        ingredient_name: selectedIng.name,
        amount: newQty ? Number(newQty) : null,
        unit: newUnit.trim() || null,
        sort_order: maxOrder,
        is_personal: false,
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [...prev, { ...data, recipe_title: null }]);
      setSelectedIng(null);
      setIngQuery('');
      setNewQty('');
      setNewUnit('');
      ingInputRef.current?.focus();
    }
    setAddingIng(false);
  };

  const handleAddPersonal = async () => {
    const text = personalText.trim();
    if (!text) { personalInputRef.current?.focus(); return; }
    setAddingPersonal(true);
    const activeList = await ensureList();
    if (!activeList) { setAddingPersonal(false); return; }
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: activeList.id,
        ingredient_name: {},
        personal_name: text,
        is_personal: true,
        amount: null,
        unit: null,
        sort_order: maxOrder,
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [...prev, { ...data, recipe_title: null }]);
      setPersonalText('');
      personalInputRef.current?.focus();
    }
    setAddingPersonal(false);
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
    const ids = items.filter((i) => i.is_checked).map((i) => i.id);
    if (!ids.length) return;
    setItems((prev) => prev.filter((i) => !i.is_checked));
    await supabase.from('shopping_list_items').delete().in('id', ids);
  };

  // ── Not logged in ──────────────────────────────────────────────────────────────

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 pt-28 py-20">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-[#0e393d]/8 flex items-center justify-center mx-auto mb-5">
            <CartIcon className="w-6 h-6 text-[#0e393d]/50" />
          </div>
          <h2 className="font-serif text-2xl text-[#0e393d] mb-2">{t.heading}</h2>
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

  // ── Section splits ─────────────────────────────────────────────────────────────

  const recipeUnchecked = filteredRecipeItems.filter((i) => !i.is_checked);
  const recipeChecked   = filteredRecipeItems.filter((i) => i.is_checked);
  const personalUnchecked = activeRecipe ? [] : personalItems.filter((i) => !i.is_checked);
  const personalChecked   = activeRecipe ? [] : personalItems.filter((i) => i.is_checked);

  // ── Main UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 pt-28 pb-0">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-1">{t.eyebrow}</p>
          <h1 className="font-serif text-3xl text-[#0e393d]">{t.heading}</h1>
        </div>
        {totalItems > 0 && (
          <ProgressRing checked={totalChecked} total={totalItems} />
        )}
      </div>

      {/* Recipe filter cards */}
      {uniqueRecipes.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveRecipe(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              activeRecipe === null
                ? 'bg-[#0e393d] text-white border-[#0e393d]'
                : 'bg-white text-[#1c2a2b]/60 border-[#0e393d]/15 hover:border-[#0e393d]/30'
            }`}
          >
            {t.allFilter}
          </button>
          {uniqueRecipes.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRecipe(activeRecipe === r.id ? null : r.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                activeRecipe === r.id
                  ? 'bg-[#0e393d] text-white border-[#0e393d]'
                  : 'bg-white text-[#1c2a2b]/60 border-[#0e393d]/15 hover:border-[#0e393d]/30'
              }`}
            >
              {localized(r.title as Record<string, string>, lang) || '—'}
            </button>
          ))}
        </div>
      )}

      {/* Ingredient search with autocomplete */}
      <div ref={ingContainerRef} className="relative mb-3">
        <input
          ref={ingInputRef}
          type="text"
          value={ingQuery}
          onChange={(e) => {
            setIngQuery(e.target.value);
            if (!e.target.value) setSelectedIng(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIngOpen(false);
            if (e.key === 'Enter' && selectedIng) handleAddIngredient();
          }}
          placeholder={t.addIngredient}
          className="w-full rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        {ingOpen && ingResults.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#0e393d]/12 shadow-lg overflow-hidden">
            {ingResults.map((ing) => {
              const label = localized(ing.name, lang) || '—';
              return (
                <li key={ing.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectIngredient(ing); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#1c2a2b] hover:bg-[#0e393d]/5 transition"
                  >
                    {highlightMatch(label, ingQuery)}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Qty + Unit + Add — shown when ingredient selected */}
      {selectedIng && (
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddIngredient(); }}
            placeholder={t.qty}
            min={0}
            step={0.1}
            className="w-20 rounded-xl border border-[#0e393d]/15 bg-white px-3 py-2.5 text-sm text-center text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
          />
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddIngredient(); }}
            placeholder={t.unitLabel}
            className="w-20 rounded-xl border border-[#0e393d]/15 bg-white px-3 py-2.5 text-sm text-center text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
          />
          <button
            onClick={handleAddIngredient}
            disabled={addingIng}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition"
          >
            {addingIng ? '…' : t.add}
          </button>
        </div>
      )}

      {/* Personal quick-add */}
      <div className="flex gap-2 mb-6">
        <input
          ref={personalInputRef}
          type="text"
          value={personalText}
          onChange={(e) => setPersonalText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAddPersonal(); }}
          placeholder={t.quickAdd}
          className="flex-1 rounded-xl border border-[#0e393d]/15 bg-white px-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <button
          onClick={handleAddPersonal}
          disabled={addingPersonal || !personalText.trim()}
          aria-label={t.add}
          className="w-10 h-10 rounded-xl bg-[#0e393d]/8 text-[#0e393d] font-bold text-lg hover:bg-[#0e393d]/15 disabled:opacity-40 transition flex items-center justify-center"
        >
          {addingPersonal ? '…' : '+'}
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 flex-1">
          <div className="w-12 h-12 rounded-full bg-[#0e393d]/6 flex items-center justify-center mx-auto mb-4">
            <CartIcon className="w-5 h-5 text-[#0e393d]/30" />
          </div>
          <p className="text-sm text-[#1c2a2b]/50">{t.noItems}</p>
          <p className="text-xs text-[#1c2a2b]/30 mt-1">{t.noItemsHint}</p>
        </div>
      )}

      {/* From recipes section */}
      {(recipeUnchecked.length > 0 || recipeChecked.length > 0) && (
        <div className="mb-4">
          {!activeRecipe && recipeItems.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1c2a2b]/30 mb-2">{t.fromRecipes}</p>
          )}
          <ul className="space-y-1.5">
            {recipeUnchecked.map((item) => (
              <ItemRow key={item.id} item={item} lang={lang} onToggle={handleToggle} onDelete={handleDelete} removeAria={t.removeAria} />
            ))}
          </ul>
          {recipeChecked.length > 0 && (
            <ul className="space-y-1.5 mt-1.5">
              {recipeChecked.map((item) => (
                <ItemRow key={item.id} item={item} lang={lang} onToggle={handleToggle} onDelete={handleDelete} removeAria={t.removeAria} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Personal items section */}
      {(personalUnchecked.length > 0 || personalChecked.length > 0) && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#1c2a2b]/30 mb-2">{t.personal}</p>
          <ul className="space-y-1.5">
            {personalUnchecked.map((item) => (
              <ItemRow key={item.id} item={item} lang={lang} onToggle={handleToggle} onDelete={handleDelete} removeAria={t.removeAria} />
            ))}
          </ul>
          {personalChecked.length > 0 && (
            <ul className="space-y-1.5 mt-1.5">
              {personalChecked.map((item) => (
                <ItemRow key={item.id} item={item} lang={lang} onToggle={handleToggle} onDelete={handleDelete} removeAria={t.removeAria} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer bar */}
      {items.length > 0 && (
        <div className="sticky bottom-0 bg-[#fafaf8] border-t border-[#0e393d]/8 py-3 flex items-center justify-between">
          <span className="text-xs text-[#1c2a2b]/40">{t.xOfY(totalChecked, totalItems)}</span>
          {totalChecked > 0 && (
            <button
              onClick={handleClearChecked}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition"
            >
              {t.clearChecked}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
