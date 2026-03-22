'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ingredient_id?: string | null;
  daily_dozen_category_slug?: string | null;
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

type IngredientSuggestion = {
  id: string;
  name: Record<string, string>;
  daily_dozen_categories: { slug: string; icon: string } | null;
};

// ─── Daily Dozen categories ────────────────────────────────────────────────────

const DD_CATEGORIES = [
  { slug: 'beans',        icon: '🫘', label: { en: 'Beans',              de: 'Bohnen',          fr: 'Légumineuses',       es: 'Legumbres',            it: 'Legumi'            } },
  { slug: 'berries',      icon: '🫐', label: { en: 'Berries',            de: 'Beeren',          fr: 'Baies',              es: 'Bayas',                it: 'Bacche'            } },
  { slug: 'fruits',       icon: '🍎', label: { en: 'Other Fruits',       de: 'Anderes Obst',    fr: 'Autres fruits',      es: 'Otras frutas',         it: 'Altra frutta'      } },
  { slug: 'cruciferous',  icon: '🥦', label: { en: 'Cruciferous',        de: 'Kreuzblütler',    fr: 'Légumes crucifères', es: 'Verduras crucíferas',  it: 'Verdure crocifere' } },
  { slug: 'greens',       icon: '🥬', label: { en: 'Greens',             de: 'Blattgemüse',     fr: 'Légumes verts',      es: 'Verduras de hoja',     it: 'Verdure a foglia'  } },
  { slug: 'vegetables',   icon: '🥕', label: { en: 'Other Vegetables',   de: 'Anderes Gemüse',  fr: 'Autres légumes',     es: 'Otras verduras',       it: 'Altre verdure'     } },
  { slug: 'flaxseeds',    icon: '🌰', label: { en: 'Flaxseeds',          de: 'Leinsamen',       fr: 'Graines de lin',     es: 'Semillas de lino',     it: 'Semi di lino'      } },
  { slug: 'nuts',         icon: '🥜', label: { en: 'Nuts & Seeds',       de: 'Nüsse & Samen',   fr: 'Noix & graines',     es: 'Frutos secos',         it: 'Noci e semi'       } },
  { slug: 'herbs_spices', icon: '🌿', label: { en: 'Herbs & Spices',     de: 'Kräuter & Gewürze',fr: 'Herbes & épices',   es: 'Hierbas y especias',   it: 'Erbe e spezie'     } },
  { slug: 'whole_grains', icon: '🌾', label: { en: 'Whole Grains',       de: 'Vollkornprodukte',fr: 'Céréales complètes', es: 'Granos integrales',    it: 'Cereali integrali' } },
  { slug: 'beverages',    icon: '🍵', label: { en: 'Beverages',          de: 'Getränke',        fr: 'Boissons',           es: 'Bebidas',              it: 'Bevande'           } },
] as const;

const OTHER_CAT  = { icon: '📦', label: { en: 'Other',    de: 'Sonstiges',  fr: 'Autres',   es: 'Otros',    it: 'Altri'    } };
const PERSONAL_CAT = { icon: '🛒', label: { en: 'Personal', de: 'Persönlich', fr: 'Personnel',es: 'Personal', it: 'Personale' } };

const DD_ORDER = DD_CATEGORIES.map((c) => c.slug);
const DD_MAP = new Map<string, (typeof DD_CATEGORIES)[number]>(DD_CATEGORIES.map((c) => [c.slug, c]));

// ─── Translations ──────────────────────────────────────────────────────────────

const T = {
  de: {
    eyebrow: 'Meine Liste',
    heading: 'Einkaufsliste',
    addItem: 'Artikel hinzufügen…',
    enterHint: 'Enter: als persönlichen Artikel hinzufügen',
    allFilter: 'Alle',
    clearChecked: 'Erledigte löschen',
    xOfY: (x: number, y: number) => `${x} von ${y} erledigt`,
    noItems: 'Deine Liste ist leer.',
    noItemsHint: 'Füge Zutaten hinzu oder starte von einem Rezept.',
    loginPrompt: 'Bitte melde dich an, um deine Einkaufsliste zu sehen.',
    loginBtn: 'Anmelden',
    removeAria: 'Entfernen',
    qty: 'Menge',
    unitLabel: 'Einheit',
    add: 'Hinzufügen',
    items: (n: number) => `${n} ${n === 1 ? 'Artikel' : 'Artikel'}`,
  },
  en: {
    eyebrow: 'My List',
    heading: 'Shopping List',
    addItem: 'Add an item…',
    enterHint: 'Press Enter to add as a personal item',
    allFilter: 'All',
    clearChecked: 'Clear checked',
    xOfY: (x: number, y: number) => `${x} of ${y} checked`,
    noItems: 'Your list is empty.',
    noItemsHint: 'Add ingredients or start from a recipe.',
    loginPrompt: 'Please sign in to view your shopping list.',
    loginBtn: 'Sign in',
    removeAria: 'Remove',
    qty: 'Qty',
    unitLabel: 'Unit',
    add: 'Add',
    items: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
  },
  fr: {
    eyebrow: 'Ma liste',
    heading: 'Liste de courses',
    addItem: 'Ajouter un article…',
    enterHint: 'Entrée : ajouter comme article personnel',
    allFilter: 'Tous',
    clearChecked: 'Supprimer les cochés',
    xOfY: (x: number, y: number) => `${x} sur ${y} cochés`,
    noItems: 'Votre liste est vide.',
    noItemsHint: 'Ajoutez des ingrédients ou commencez par une recette.',
    loginPrompt: 'Connectez-vous pour voir votre liste de courses.',
    loginBtn: 'Se connecter',
    removeAria: 'Supprimer',
    qty: 'Qté',
    unitLabel: 'Unité',
    add: 'Ajouter',
    items: (n: number) => `${n} article${n !== 1 ? 's' : ''}`,
  },
  es: {
    eyebrow: 'Mi lista',
    heading: 'Lista de compras',
    addItem: 'Agregar un artículo…',
    enterHint: 'Intro: añadir como artículo personal',
    allFilter: 'Todos',
    clearChecked: 'Borrar marcados',
    xOfY: (x: number, y: number) => `${x} de ${y} marcados`,
    noItems: 'Tu lista está vacía.',
    noItemsHint: 'Agrega ingredientes o empieza desde una receta.',
    loginPrompt: 'Por favor inicia sesión para ver tu lista de compras.',
    loginBtn: 'Iniciar sesión',
    removeAria: 'Eliminar',
    qty: 'Cant.',
    unitLabel: 'Unidad',
    add: 'Agregar',
    items: (n: number) => `${n} artículo${n !== 1 ? 's' : ''}`,
  },
  it: {
    eyebrow: 'La mia lista',
    heading: 'Lista della spesa',
    addItem: 'Aggiungi un articolo…',
    enterHint: 'Invio: aggiunge come articolo personale',
    allFilter: 'Tutti',
    clearChecked: 'Rimuovi selezionati',
    xOfY: (x: number, y: number) => `${x} di ${y} selezionati`,
    noItems: 'La tua lista è vuota.',
    noItemsHint: 'Aggiungi ingredienti o inizia da una ricetta.',
    loginPrompt: 'Accedi per vedere la tua lista della spesa.',
    loginBtn: 'Accedi',
    removeAria: 'Rimuovi',
    qty: 'Qtà',
    unitLabel: 'Unità',
    add: 'Aggiungi',
    items: (n: number) => n === 1 ? '1 articolo' : `${n} articoli`,
  },
};

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

function truncate(text: string, max = 22): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function resolveCategory(item: ShoppingListItem, ingCategoryMap: Map<string, string>): string {
  if (item.is_personal) return 'personal';
  if (item.daily_dozen_category_slug) return item.daily_dozen_category_slug;
  // Fallback: look up by EN ingredient name
  const nameEn = getIngredientLabel(item.ingredient_name, 'en').toLowerCase().trim();
  if (nameEn) {
    const cat = ingCategoryMap.get(nameEn);
    if (cat) return cat;
  }
  return 'other';
}

function groupItems(
  items: ShoppingListItem[],
  ingCategoryMap: Map<string, string>
): { slug: string; items: ShoppingListItem[] }[] {
  const groups: Record<string, ShoppingListItem[]> = {};
  for (const item of items) {
    const cat = resolveCategory(item, ingCategoryMap);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  const result: { slug: string; items: ShoppingListItem[] }[] = [];
  for (const slug of DD_ORDER) {
    if (groups[slug as string]) result.push({ slug: slug as string, items: groups[slug as string] });
  }
  if (groups['other'])    result.push({ slug: 'other',    items: groups['other'] });
  if (groups['personal']) result.push({ slug: 'personal', items: groups['personal'] });
  return result;
}

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
        fill="none" stroke="#0C9C6C" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
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
  const recipeLabel = (!item.is_personal && item.recipe_title)
    ? truncate(localized(item.recipe_title, lang) || '', 22)
    : null;

  return (
    <li className={`group flex items-center gap-3 rounded-xl border border-[#0e393d]/8 bg-white px-3.5 py-2.5 hover:border-[#0e393d]/15 transition ${item.is_checked ? 'opacity-45' : ''}`}>
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

      {/* Name + amount */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className={`text-sm font-medium text-[#1c2a2b] leading-snug ${item.is_checked ? 'line-through' : ''}`}>
          {label}
        </span>
        {amount && (
          <span className="shrink-0 text-xs text-[#1c2a2b]/40">{amount}</span>
        )}
      </div>

      {/* Recipe pill + delete */}
      <div className="shrink-0 flex items-center gap-1">
        {recipeLabel && (
          <span className="hidden sm:inline text-[10px] text-[#ceab84] bg-[#ceab84]/8 rounded-full px-2 py-0.5 whitespace-nowrap group-hover:hidden">
            {recipeLabel}
          </span>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-[#1c2a2b]/30 hover:text-red-500 hover:bg-red-50 transition"
          aria-label={removeAria}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </li>
  );
}

// ─── CategorySection ───────────────────────────────────────────────────────────

function CategorySection({
  slug, catItems, lang, t, onToggle, onDelete, collapsed, onCollapseToggle,
}: {
  slug: string;
  catItems: ShoppingListItem[];
  lang: Lang;
  t: typeof T.en;
  onToggle: (item: ShoppingListItem) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
}) {
  const ddCat = DD_MAP.get(slug);
  const icon  = ddCat?.icon ?? (slug === 'personal' ? PERSONAL_CAT.icon : OTHER_CAT.icon);
  const label = ddCat
    ? (ddCat.label[lang] ?? ddCat.label.en)
    : slug === 'personal'
      ? (PERSONAL_CAT.label[lang] ?? PERSONAL_CAT.label.en)
      : (OTHER_CAT.label[lang] ?? OTHER_CAT.label.en);

  const unchecked = catItems.filter((i) => !i.is_checked);
  const checked   = catItems.filter((i) => i.is_checked);
  const display   = [...unchecked, ...checked];

  return (
    <div>
      {/* Header */}
      <button
        type="button"
        onClick={onCollapseToggle}
        className="w-full flex items-center gap-2 py-2 text-left group/header"
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#1c2a2b]/40 group-hover/header:text-[#1c2a2b]/60 transition">
          {label}
        </span>
        <span className="flex-1" />
        <span className="text-[11px] text-[#1c2a2b]/30 mr-1">
          {t.items(unchecked.length)}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-[#1c2a2b]/25 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Items */}
      {!collapsed && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-1">
          {display.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              lang={lang}
              onToggle={onToggle}
              onDelete={onDelete}
              removeAria={t.removeAria}
            />
          ))}
        </ul>
      )}
    </div>
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

  const [list, setList]   = useState<ShoppingList | null>(initialList);
  const [items, setItems] = useState<ShoppingListItem[]>(initialItems);
  const [ingCategoryMap]  = useState<Map<string, string>>(() => new Map());
  const ingMapRef = useRef(ingCategoryMap);

  // Recipe filter
  const [activeRecipe, setActiveRecipe] = useState<string | null>(null);

  // Collapsed category sections
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  // Unified input
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState<IngredientSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIng, setSelectedIng] = useState<IngredientSuggestion | null>(null);
  const [newQty, setNewQty]   = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [adding, setAdding]   = useState(false);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── On mount: fetch ingredient→category map ───────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, daily_dozen_categories(slug)');
      if (data) {
        for (const ing of data as Array<{ id: string; name: Record<string, string>; daily_dozen_categories: unknown }>) {
          const dc = ing.daily_dozen_categories;
          const catSlug = Array.isArray(dc) ? (dc[0] as { slug?: string })?.slug : (dc as { slug?: string } | null)?.slug;
          if (catSlug) {
            const nameEn = localized(ing.name, 'en').toLowerCase().trim();
            if (nameEn) ingMapRef.current.set(nameEn, catSlug);
          }
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────────

  const uniqueRecipes = useMemo(() => Array.from(
    new Map(
      items
        .filter((i) => i.recipe_id && i.recipe_title)
        .map((i) => [i.recipe_id!, { id: i.recipe_id!, title: i.recipe_title! }])
    ).values()
  ), [items]);

  const displayItems = useMemo(() =>
    activeRecipe
      ? items.filter((i) => !i.is_personal && i.recipe_id === activeRecipe)
      : items,
    [items, activeRecipe]
  );

  const grouped = useMemo(() =>
    groupItems(displayItems, ingMapRef.current),
    [displayItems]
  );

  const totalChecked = items.filter((i) => i.is_checked).length;
  const totalItems   = items.length;

  // ── Close dropdown on outside click ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Autocomplete ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedIng || query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, daily_dozen_categories(slug, icon)')
        .filter(`name->>${lang}`, 'ilike', `%${query}%`)
        .limit(8);
      if (!cancelled) {
        setSuggestions((data as IngredientSuggestion[] | null) ?? []);
        setShowDropdown(true);
      }
    })();
    return () => { cancelled = true; };
  }, [query, lang, selectedIng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!list) return;
    const channel = supabase
      .channel(`shopping_list_items:${list.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `list_id=eq.${list.id}` },
        () => { refreshItems(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [list?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data helpers ──────────────────────────────────────────────────────────────

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

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleSelectIngredient = (ing: IngredientSuggestion) => {
    setSelectedIng(ing);
    setQuery(localized(ing.name, lang) || '');
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleAddIngredient = async () => {
    if (!selectedIng) return;
    setAdding(true);
    const activeList = await ensureList();
    if (!activeList) { setAdding(false); return; }
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const catSlug = (selectedIng.daily_dozen_categories as { slug: string } | null)?.slug ?? null;
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: activeList.id,
        ingredient_name: selectedIng.name,
        ingredient_id: selectedIng.id,
        daily_dozen_category_slug: catSlug,
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
      setQuery('');
      setNewQty('');
      setNewUnit('');
      inputRef.current?.focus();
    }
    setAdding(false);
  };

  const handleAddPersonal = async (text: string) => {
    if (!text.trim()) return;
    setAdding(true);
    const activeList = await ensureList();
    if (!activeList) { setAdding(false); return; }
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({
        list_id: activeList.id,
        ingredient_name: {},
        personal_name: text.trim(),
        is_personal: true,
        amount: null,
        unit: null,
        sort_order: maxOrder,
      })
      .select()
      .single();
    if (data) {
      setItems((prev) => [...prev, { ...data, recipe_title: null }]);
      setQuery('');
      inputRef.current?.focus();
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
    const ids = items.filter((i) => i.is_checked).map((i) => i.id);
    if (!ids.length) return;
    setItems((prev) => prev.filter((i) => !i.is_checked));
    await supabase.from('shopping_list_items').delete().in('id', ids);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      if (selectedIng) { setSelectedIng(null); setQuery(''); }
      return;
    }
    if (e.key === 'Enter') {
      if (selectedIng) {
        handleAddIngredient();
      } else if (!showDropdown && query.trim()) {
        handleAddPersonal(query);
      }
    }
  };

  const toggleCollapse = (slug: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // ── Not logged in ─────────────────────────────────────────────────────────────

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

  // ── Main UI ───────────────────────────────────────────────────────────────────

  const showEnterHint = query.trim().length >= 2 && !selectedIng && !showDropdown;

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-0">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-1">{t.eyebrow}</p>
          <h1 className="font-serif text-3xl text-[#0e393d]">{t.heading}</h1>
        </div>
        {totalItems > 0 && <ProgressRing checked={totalChecked} total={totalItems} />}
      </div>

      {/* Recipe filter pills */}
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
              {truncate(localized(r.title as Record<string, string>, lang) || '—', 28)}
            </button>
          ))}
        </div>
      )}

      {/* Unified input */}
      <div ref={inputContainerRef} className="relative mb-1">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedIng && e.target.value !== (localized(selectedIng.name, lang) || '')) {
              setSelectedIng(null);
            }
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={t.addItem}
          className="w-full rounded-xl border border-[#0e393d]/15 bg-white pl-10 pr-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#0e393d]/12 shadow-lg overflow-hidden">
            {suggestions.map((ing) => {
              const label = localized(ing.name, lang) || '—';
              const cat = ing.daily_dozen_categories;
              return (
                <li key={ing.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectIngredient(ing); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#1c2a2b] hover:bg-[#0e393d]/5 transition flex items-center gap-2"
                  >
                    {cat?.icon && <span className="text-base leading-none">{cat.icon}</span>}
                    <span>{highlightMatch(label, query)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Enter hint */}
      {showEnterHint && (
        <p className="text-xs text-[#1c2a2b]/30 mb-2 px-1">{t.enterHint}</p>
      )}

      {/* Qty + Unit + Add */}
      {selectedIng && (
        <div className="flex gap-2 mt-2 mb-4">
          <input
            type="number"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddIngredient(); }}
            placeholder={t.qty}
            min={0} step={0.1}
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
            disabled={adding}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition"
          >
            {adding ? '…' : t.add}
          </button>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !selectedIng && (
        <div className="text-center py-16 flex-1">
          <div className="w-12 h-12 rounded-full bg-[#0e393d]/6 flex items-center justify-center mx-auto mb-4">
            <CartIcon className="w-5 h-5 text-[#0e393d]/30" />
          </div>
          <p className="text-sm text-[#1c2a2b]/50">{t.noItems}</p>
          <p className="text-xs text-[#1c2a2b]/30 mt-1">{t.noItemsHint}</p>
        </div>
      )}

      {/* Grouped category sections */}
      {grouped.length > 0 && (
        <div className="mt-4 divide-y divide-[#0e393d]/6">
          {grouped.map(({ slug, items: catItems }) => (
            <div key={slug} className="py-3">
              <CategorySection
                slug={slug}
                catItems={catItems}
                lang={lang}
                t={t}
                onToggle={handleToggle}
                onDelete={handleDelete}
                collapsed={collapsedCats.has(slug)}
                onCollapseToggle={() => toggleCollapse(slug)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1 min-h-8" />

      {/* Footer */}
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
