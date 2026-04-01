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
  notes?: string | null;
  sort_order: number;
  created_at: string;
  recipe_title?: Record<string, string> | null;
};

// DisplayItem: a ShoppingListItem or merge of several (deduplication)
type DisplayItem = ShoppingListItem & { sourceIds: string[] };

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
  default_unit_id?: string | null;
};

type MeasurementUnit = { id: string; code: string; abbreviation: Record<string, string> };

// ─── Daily Dozen categories ────────────────────────────────────────────────────

const DD_CATEGORIES = [
  { slug: 'beans',            icon: '🫘', label: { en: 'Beans',              de: 'Bohnen',            fr: 'Légumineuses',       es: 'Legumbres',            it: 'Legumi'            } },
  { slug: 'berries',          icon: '🫐', label: { en: 'Berries',            de: 'Beeren',            fr: 'Baies',              es: 'Bayas',                it: 'Bacche'            } },
  { slug: 'other_fruits',     icon: '🍎', label: { en: 'Other Fruits',       de: 'Anderes Obst',      fr: 'Autres fruits',      es: 'Otras frutas',         it: 'Altra frutta'      } },
  { slug: 'cruciferous',      icon: '🥦', label: { en: 'Cruciferous',        de: 'Kreuzblütler',      fr: 'Légumes crucifères', es: 'Verduras crucíferas',  it: 'Verdure crocifere' } },
  { slug: 'greens',           icon: '🥬', label: { en: 'Greens',             de: 'Blattgemüse',       fr: 'Légumes verts',      es: 'Verduras de hoja',     it: 'Verdure a foglia'  } },
  { slug: 'other_vegetables', icon: '🥕', label: { en: 'Other Vegetables',   de: 'Anderes Gemüse',    fr: 'Autres légumes',     es: 'Otras verduras',       it: 'Altre verdure'     } },
  { slug: 'flaxseeds',        icon: '🌰', label: { en: 'Flaxseeds',          de: 'Leinsamen',         fr: 'Graines de lin',     es: 'Semillas de lino',     it: 'Semi di lino'      } },
  { slug: 'nuts_seeds',       icon: '🥜', label: { en: 'Nuts & Seeds',       de: 'Nüsse & Samen',     fr: 'Noix & graines',     es: 'Frutos secos',         it: 'Noci e semi'       } },
  { slug: 'herbs_spices',     icon: '🌿', label: { en: 'Herbs & Spices',     de: 'Kräuter & Gewürze', fr: 'Herbes & épices',    es: 'Hierbas y especias',   it: 'Erbe e spezie'     } },
  { slug: 'whole_grains',     icon: '🌾', label: { en: 'Whole Grains',       de: 'Vollkornprodukte',  fr: 'Céréales complètes', es: 'Granos integrales',    it: 'Cereali integrali' } },
  { slug: 'beverages',        icon: '💧', label: { en: 'Beverages',          de: 'Getränke',          fr: 'Boissons',           es: 'Bebidas',              it: 'Bevande'           } },
  { slug: 'exercise',         icon: '🏃', label: { en: 'Exercise',           de: 'Bewegung',          fr: 'Exercice',           es: 'Ejercicio',            it: 'Esercizio'         } },
] as const;

// Alias old DB slugs → new slugs (in case DB still uses the old names)
const SLUG_ALIASES: Record<string, string> = {
  fruits:     'other_fruits',
  vegetables: 'other_vegetables',
  nuts:       'nuts_seeds',
};

const DD_ORDER = DD_CATEGORIES.map((c) => c.slug);
const DD_MAP   = new Map<string, (typeof DD_CATEGORIES)[number]>(DD_CATEGORIES.map((c) => [c.slug, c]));
const DD_INDEX = new Map<string, number>(DD_CATEGORIES.map((c, i) => [c.slug, i]));

// ─── Translations ──────────────────────────────────────────────────────────────

const T = {
  de: {
    eyebrow: 'Meine Liste', heading: 'Einkaufsliste',
    addItem: 'Artikel hinzufügen…', enterHint: 'Enter: als persönlichen Artikel hinzufügen',
    allFilter: 'Alle', clearChecked: 'Erledigte löschen',
    xOfY: (x: number, y: number) => `${x} von ${y} erledigt`,
    noItems: 'Deine Liste ist leer.', noItemsHint: 'Füge Zutaten hinzu oder starte von einem Rezept.',
    loginPrompt: 'Bitte melde dich an, um deine Einkaufsliste zu sehen.', loginBtn: 'Anmelden',
    removeAria: 'Entfernen', qty: 'Menge', unitLabel: 'Einheit', add: 'Hinzufügen',
    items: (n: number) => `${n} Artikel`,
  },
  en: {
    eyebrow: 'My List', heading: 'Shopping List',
    addItem: 'Add an item…', enterHint: 'Press Enter to add as a personal item',
    allFilter: 'All', clearChecked: 'Clear checked',
    xOfY: (x: number, y: number) => `${x} of ${y} checked`,
    noItems: 'Your list is empty.', noItemsHint: 'Add ingredients or start from a recipe.',
    loginPrompt: 'Please sign in to view your shopping list.', loginBtn: 'Sign in',
    removeAria: 'Remove', qty: 'Qty', unitLabel: 'Unit', add: 'Add',
    items: (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`,
  },
  fr: {
    eyebrow: 'Ma liste', heading: 'Liste de courses',
    addItem: 'Ajouter un article…', enterHint: 'Entrée : ajouter comme article personnel',
    allFilter: 'Tous', clearChecked: 'Supprimer les cochés',
    xOfY: (x: number, y: number) => `${x} sur ${y} cochés`,
    noItems: 'Votre liste est vide.', noItemsHint: 'Ajoutez des ingrédients ou commencez par une recette.',
    loginPrompt: 'Connectez-vous pour voir votre liste de courses.', loginBtn: 'Se connecter',
    removeAria: 'Supprimer', qty: 'Qté', unitLabel: 'Unité', add: 'Ajouter',
    items: (n: number) => `${n} article${n !== 1 ? 's' : ''}`,
  },
  es: {
    eyebrow: 'Mi lista', heading: 'Lista de compras',
    addItem: 'Agregar un artículo…', enterHint: 'Intro: añadir como artículo personal',
    allFilter: 'Todos', clearChecked: 'Borrar marcados',
    xOfY: (x: number, y: number) => `${x} de ${y} marcados`,
    noItems: 'Tu lista está vacía.', noItemsHint: 'Agrega ingredientes o empieza desde una receta.',
    loginPrompt: 'Por favor inicia sesión para ver tu lista de compras.', loginBtn: 'Iniciar sesión',
    removeAria: 'Eliminar', qty: 'Cant.', unitLabel: 'Unidad', add: 'Agregar',
    items: (n: number) => `${n} artículo${n !== 1 ? 's' : ''}`,
  },
  it: {
    eyebrow: 'La mia lista', heading: 'Lista della spesa',
    addItem: 'Aggiungi un articolo…', enterHint: 'Invio: aggiunge come articolo personale',
    allFilter: 'Tutti', clearChecked: 'Rimuovi selezionati',
    xOfY: (x: number, y: number) => `${x} di ${y} selezionati`,
    noItems: 'La tua lista è vuota.', noItemsHint: 'Aggiungi ingredienti o inizia da una ricetta.',
    loginPrompt: 'Accedi per vedere la tua lista della spesa.', loginBtn: 'Accedi',
    removeAria: 'Rimuovi', qty: 'Qtà', unitLabel: 'Unità', add: 'Aggiungi',
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

function truncate(text: string, max = 25): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// Resolve a shopping list item to its DD category slug
function resolveCategory(
  item: DisplayItem,
  nameMap: Map<string, string>,  // ingredient name EN → category slug
  idMap: Map<string, string>,    // ingredient id → category slug
): string {
  if (item.is_personal) return 'personal';
  // 1. Stored on item
  if (item.daily_dozen_category_slug) {
    return SLUG_ALIASES[item.daily_dozen_category_slug] ?? item.daily_dozen_category_slug;
  }
  // 2. By ingredient_id
  if (item.ingredient_id) {
    const cat = idMap.get(item.ingredient_id);
    if (cat) return cat;
  }
  // 3. By EN name
  const nameEn = getIngredientLabel(item.ingredient_name, 'en').toLowerCase().trim();
  if (nameEn) {
    const cat = nameMap.get(nameEn);
    if (cat) return cat;
  }
  return 'other';
}

// Deduplicate non-personal items: same ingredient + same unit → merge, sum amounts
function deduplicateItems(nonPersonalItems: ShoppingListItem[]): DisplayItem[] {
  const groups = new Map<string, ShoppingListItem[]>();
  for (const item of nonPersonalItems) {
    const nameEn = getIngredientLabel(item.ingredient_name, 'en').toLowerCase().trim();
    const unit   = (item.unit ?? '').toLowerCase().trim();
    const key    = `${nameEn}||${unit}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.values()).map((group) => {
    const first       = group[0];
    const totalAmount = group.some((i) => i.amount != null)
      ? group.reduce((sum, i) => sum + (i.amount ?? 0), 0)
      : null;
    return {
      ...first,
      amount:     totalAmount,
      is_checked: group.every((i) => i.is_checked),
      sourceIds:  group.map((i) => i.id),
    };
  });
}

function toDisplayItems(items: ShoppingListItem[]): DisplayItem[] {
  return items.map((i) => ({ ...i, sourceIds: [i.id] }));
}

// ─── ProgressRing ──────────────────────────────────────────────────────────────

function ProgressRing({ checked, total }: { checked: number; total: number }) {
  const r = 18, circ = 2 * Math.PI * r;
  const offset = circ * (1 - (total > 0 ? checked / total : 0));
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#0e393d12" strokeWidth="3.5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke="#0C9C6C" strokeWidth="3.5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 24 24)" style={{ transition: 'stroke-dashoffset 0.4s ease' }} />
      <text x="24" y="28.5" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0e393d" fontFamily="sans-serif">
        {checked}/{total}
      </text>
    </svg>
  );
}

// ─── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({ item, lang, icon, units, onToggle, onDelete, onUpdate, removeAria }: {
  item: DisplayItem;
  lang: Lang;
  icon: string | null;
  units: MeasurementUnit[];
  onToggle: (item: DisplayItem) => void;
  onDelete: (item: DisplayItem) => void;
  onUpdate: (item: DisplayItem, patch: Partial<ShoppingListItem>) => void;
  removeAria: string;
}) {
  const [editing, setEditing] = useState<'qty-unit' | 'name' | null>(null);
  const [editQty,  setEditQty]  = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editName, setEditName] = useState('');
  const editQtyRef  = useRef<HTMLInputElement>(null);
  const editUnitRef = useRef<HTMLSelectElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const discardRef  = useRef(false);

  const label  = item.is_personal && item.personal_name
    ? item.personal_name
    : getIngredientLabel(item.ingredient_name, lang);
  const amount = formatAmount(item.amount, item.unit);

  const startEditQtyUnit = () => {
    if (item.is_checked) return;
    setEditQty(item.amount != null ? String(item.amount % 1 === 0 ? item.amount : item.amount.toFixed(1)) : '');
    setEditUnit(item.unit ?? '');
    setEditing('qty-unit');
    setTimeout(() => editQtyRef.current?.focus(), 0);
  };

  const saveQtyUnit = () => {
    if (discardRef.current) { discardRef.current = false; setEditing(null); return; }
    setEditing(null);
    const newAmount = editQty.trim() ? Number(editQty) : null;
    const newUnit   = editUnit.trim() || null;
    if (newAmount !== item.amount || newUnit !== item.unit) {
      onUpdate(item, { amount: newAmount, unit: newUnit });
    }
  };

  const startEditName = () => {
    if (!item.is_personal || item.is_checked) return;
    setEditName(item.personal_name ?? label);
    setEditing('name');
    setTimeout(() => { editNameRef.current?.focus(); editNameRef.current?.select(); }, 0);
  };

  const saveName = () => {
    if (discardRef.current) { discardRef.current = false; setEditing(null); return; }
    setEditing(null);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== (item.personal_name ?? label)) {
      onUpdate(item, { personal_name: trimmed });
    }
  };

  return (
    <li className={`group grid grid-cols-[20px_1.25rem_4rem_1fr_auto] items-center gap-x-2 rounded-xl border border-[#0e393d]/8 bg-white px-3.5 py-2.5 hover:border-[#0e393d]/15 transition ${item.is_checked ? 'opacity-45' : ''}`}>
      {/* Col 1: Checkbox */}
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-pressed={item.is_checked}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
          item.is_checked ? 'bg-[#0C9C6C] border-[#0C9C6C]' : 'border-[#0e393d]/25 hover:border-[#0e393d]/60'
        }`}
      >
        {item.is_checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path d="M2 5.5l2.5 2.5 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Col 2: DD emoji */}
      <span className="text-base leading-none text-center">{icon ?? ''}</span>

      {/* Col 3: Qty+unit display OR qty input when editing */}
      {editing === 'qty-unit' ? (
        <input
          ref={editQtyRef}
          type="number"
          value={editQty}
          onChange={(e) => setEditQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  { e.preventDefault(); editUnitRef.current?.focus(); }
            if (e.key === 'Escape') { discardRef.current = true; setEditing(null); }
          }}
          onBlur={(e) => { if (e.relatedTarget !== editUnitRef.current) saveQtyUnit(); }}
          min={0} step={0.1}
          className="w-full rounded-md border border-[#0e393d]/25 bg-white px-1.5 py-1 text-xs text-center text-[#1c2a2b] focus:border-[#0e393d]/50 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/15 transition"
        />
      ) : (
        <span
          onClick={startEditQtyUnit}
          title={!item.is_checked ? 'Edit qty / unit' : undefined}
          className={`text-sm font-medium text-[#0e393d] text-right leading-snug select-none ${!item.is_checked ? 'cursor-text hover:bg-[#0e393d]/5 rounded px-0.5' : ''}`}
        >
          {amount}
        </span>
      )}

      {/* Col 4: unit select (qty-unit edit) | name input (name edit) | name+notes display */}
      {editing === 'qty-unit' ? (
        <select
          ref={editUnitRef}
          value={editUnit}
          onChange={(e) => setEditUnit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  { e.preventDefault(); saveQtyUnit(); }
            if (e.key === 'Escape') { discardRef.current = true; setEditing(null); }
          }}
          onBlur={(e) => { if (e.relatedTarget !== editQtyRef.current) saveQtyUnit(); }}
          className="w-full rounded-md border border-[#0e393d]/25 bg-white px-1 py-1 text-xs text-[#1c2a2b] focus:border-[#0e393d]/50 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/15 transition"
        >
          <option value="">—</option>
          {units.map((u) => (
            <option key={u.id} value={u.code}>
              {(u.abbreviation as Record<string, string>)[lang] ?? u.code}
            </option>
          ))}
        </select>
      ) : editing === 'name' ? (
        <input
          ref={editNameRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  { e.preventDefault(); saveName(); }
            if (e.key === 'Escape') { discardRef.current = true; setEditing(null); }
          }}
          onBlur={saveName}
          className="min-w-0 w-full rounded-md border border-[#0e393d]/25 bg-white px-2 py-1 text-sm text-[#1c2a2b] focus:border-[#0e393d]/50 focus:outline-none focus:ring-1 focus:ring-[#0e393d]/15 transition"
        />
      ) : (
        <div
          className="min-w-0"
          onClick={startEditName}
          title={item.is_personal && !item.is_checked ? 'Edit name' : undefined}
        >
          <span className={`text-sm text-[#1c2a2b] leading-snug ${item.is_checked ? 'line-through' : ''} ${item.is_personal && !item.is_checked ? 'cursor-text' : ''}`}>
            {label}
          </span>
          {item.notes && (
            <span className="ml-1 text-xs text-[#1c2a2b]/40">{item.notes}</span>
          )}
        </div>
      )}

      {/* Col 5: Delete */}
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-[#1c2a2b]/30 hover:text-red-500 hover:bg-red-50 transition"
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

  const [list, setList]   = useState<ShoppingList | null>(initialList);
  const [items, setItems] = useState<ShoppingListItem[]>(initialItems);

  // Ingredient→category maps (useState so changes trigger useMemo recalc)
  const [ingNameMap, setIngNameMap] = useState<Map<string, string>>(new Map()); // nameEn → catSlug
  const [ingIdMap,   setIngIdMap]   = useState<Map<string, string>>(new Map()); // id → catSlug
  const [units,      setUnits]      = useState<MeasurementUnit[]>([]);

  const [activeRecipe,    setActiveRecipe]    = useState<string | null>(null);
  const [query,           setQuery]           = useState('');
  const [suggestions,     setSuggestions]     = useState<IngredientSuggestion[]>([]);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [selectedIng,     setSelectedIng]     = useState<IngredientSuggestion | null>(null);
  const [newQty,          setNewQty]          = useState('');
  const [newUnit,         setNewUnit]         = useState('');
  const [adding,           setAdding]           = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);
  const qtyInputRef       = useRef<HTMLInputElement>(null);
  const unitSelectRef     = useRef<HTMLSelectElement>(null);

  // ── Fetch ingredient→category maps on mount ───────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, daily_dozen_categories(slug)');
      if (!data) return;
      const nameMap = new Map<string, string>();
      const idMap   = new Map<string, string>();
      for (const ing of data as Array<{ id: string; name: Record<string, string>; daily_dozen_categories: unknown }>) {
        const dc  = ing.daily_dozen_categories;
        const raw = Array.isArray(dc)
          ? (dc[0] as { slug?: string })?.slug
          : (dc as { slug?: string } | null)?.slug;
        if (raw) {
          const slug   = SLUG_ALIASES[raw] ?? raw;
          const nameEn = localized(ing.name, 'en').toLowerCase().trim();
          if (nameEn) nameMap.set(nameEn, slug);
          idMap.set(ing.id, slug);
        }
      }
      setIngNameMap(nameMap);
      setIngIdMap(idMap);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch measurement units on mount ─────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('measurement_units')
        .select('id, code, abbreviation')
        .order('sort_order');
      if (data) setUnits(data as MeasurementUnit[]);
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

  // Count of raw items per recipe (for filter pill badges)
  const recipeItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.is_personal && item.recipe_id) {
        counts.set(item.recipe_id, (counts.get(item.recipe_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  // Deduplicated display items for current filter
  const displayItems = useMemo(() => {
    const recipeItems   = items.filter((i) => !i.is_personal);
    const personalItems = items.filter((i) => i.is_personal);
    const filtered      = activeRecipe
      ? recipeItems.filter((i) => i.recipe_id === activeRecipe)
      : recipeItems;
    const deduped       = deduplicateItems(filtered);
    const personal      = activeRecipe ? [] : toDisplayItems(personalItems);
    return [...deduped, ...personal];
  }, [items, activeRecipe]);

  // Flat sorted list: by DD category order → unchecked before checked → name alphabetically
  const sortedItems = useMemo(() => {
    return displayItems.map((item) => {
      const slug = resolveCategory(item, ingNameMap, ingIdMap);
      const catIdx = slug === 'personal' ? DD_INDEX.size + 1
        : slug === 'other' ? DD_INDEX.size
        : (DD_INDEX.get(slug) ?? DD_INDEX.size);
      const icon = item.is_personal ? '🛒' : (DD_MAP.get(slug)?.icon ?? null);
      return { ...item, _catIdx: catIdx, _icon: icon };
    }).sort((a, b) => {
      if (a._catIdx !== b._catIdx) return a._catIdx - b._catIdx;
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1;
      const nameA = a.is_personal && a.personal_name ? a.personal_name : getIngredientLabel(a.ingredient_name, 'en');
      const nameB = b.is_personal && b.personal_name ? b.personal_name : getIngredientLabel(b.ingredient_name, 'en');
      return nameA.localeCompare(nameB);
    });
  }, [displayItems, ingNameMap, ingIdMap]);

  const totalChecked = items.filter((i) => i.is_checked).length;
  const totalItems   = items.length;

  // ── Close dropdown on outside click ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Autocomplete ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedIng || query.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, daily_dozen_categories(slug, icon), default_unit_id')
        .filter(`name->>${lang}`, 'ilike', `%${query}%`)
        .limit(8);
      if (!cancelled) { setSuggestions((data as IngredientSuggestion[] | null) ?? []); setShowDropdown(true); setHighlightedIndex(-1); }
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
      .from('shopping_list_items').select('*, recipes(title)')
      .eq('list_id', list.id).order('sort_order').order('created_at');
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
      .from('shopping_lists').insert({ user_id: userId, name: t.heading }).select().single();
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
    if (ing.default_unit_id) {
      const defaultUnit = units.find((u) => u.id === ing.default_unit_id);
      if (defaultUnit) setNewUnit(defaultUnit.code);
    }
    setTimeout(() => qtyInputRef.current?.focus(), 0);
  };

  const handleAddIngredient = async () => {
    if (!selectedIng) return;
    setAdding(true);
    const activeList = await ensureList();
    if (!activeList) { setAdding(false); return; }
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const dc = selectedIng.daily_dozen_categories as { slug: string } | null;
    const catRaw  = dc?.slug ?? null;
    const catSlug = catRaw ? (SLUG_ALIASES[catRaw] ?? catRaw) : null;
    const { data } = await supabase.from('shopping_list_items').insert({
      list_id: activeList.id,
      ingredient_name: selectedIng.name,
      ingredient_id: selectedIng.id,
      daily_dozen_category_slug: catSlug,
      amount: newQty ? Number(newQty) : null,
      unit: newUnit.trim() || null,
      sort_order: maxOrder,
      is_personal: false,
    }).select().single();
    if (data) {
      setItems((prev) => [...prev, { ...data, recipe_title: null }]);
      setSelectedIng(null); setQuery(''); setNewQty(''); setNewUnit('');
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
    const { data } = await supabase.from('shopping_list_items').insert({
      list_id: activeList.id, ingredient_name: {}, personal_name: text.trim(),
      is_personal: true, amount: null, unit: null, sort_order: maxOrder,
    }).select().single();
    if (data) { setItems((prev) => [...prev, { ...data, recipe_title: null }]); setQuery(''); inputRef.current?.focus(); }
    setAdding(false);
  };

  const handleToggle = async (item: DisplayItem) => {
    const newVal = !item.is_checked;
    setItems((prev) => prev.map((i) => item.sourceIds.includes(i.id) ? { ...i, is_checked: newVal } : i));
    await Promise.all(
      item.sourceIds.map((id) => supabase.from('shopping_list_items').update({ is_checked: newVal }).eq('id', id))
    );
  };

  const handleDelete = async (item: DisplayItem) => {
    setItems((prev) => prev.filter((i) => !item.sourceIds.includes(i.id)));
    await supabase.from('shopping_list_items').delete().in('id', item.sourceIds);
  };

  const handleUpdate = useCallback(async (item: DisplayItem, patch: Partial<ShoppingListItem>) => {
    setItems((prev) => prev.map((i) => item.sourceIds.includes(i.id) ? { ...i, ...patch } : i));
    await Promise.all(
      item.sourceIds.map((id) => supabase.from('shopping_list_items').update(patch).eq('id', id))
    );
  }, [supabase]);

  const handleClearChecked = async () => {
    const ids = items.filter((i) => i.is_checked).map((i) => i.id);
    if (!ids.length) return;
    setItems((prev) => prev.filter((i) => !i.is_checked));
    await supabase.from('shopping_list_items').delete().in('id', ids);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      setHighlightedIndex(-1);
      if (selectedIng) { setSelectedIng(null); setQuery(''); }
      return;
    }
    if (e.key === 'ArrowDown') {
      if (showDropdown && suggestions.length > 0) {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      if (showDropdown && suggestions.length > 0) {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, -1));
      }
      return;
    }
    if (e.key === 'Enter') {
      if (showDropdown && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectIngredient(suggestions[highlightedIndex]);
        setHighlightedIndex(-1);
      } else if (selectedIng) {
        handleAddIngredient();
      } else if (!showDropdown && query.trim()) {
        handleAddPersonal(query);
      }
    }
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
          <Link href="/login" className="inline-block bg-[#0e393d] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#0e393d]/90 transition">
            {t.loginBtn}
          </Link>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────────

  const showEnterHint = query.trim().length >= 2 && !selectedIng && !showDropdown;

  return (
    <div className="flex-1 flex flex-col">

      {/* Hero header */}
      <section className="w-full bg-[#0e393d] px-6 pt-28 pb-14">
        <div className="max-w-5xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
            <h1 className="font-serif text-3xl sm:text-4xl text-white leading-tight">{t.heading}</h1>
          </div>
          {totalItems > 0 && <ProgressRing checked={totalChecked} total={totalItems} />}
        </div>
      </section>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-0">

      {/* Recipe filter pills */}
      {uniqueRecipes.length > 0 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {/* All pill */}
          <button
            onClick={() => setActiveRecipe(null)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              activeRecipe === null
                ? 'bg-[#0e393d] text-white border-[#0e393d]'
                : 'bg-white text-[#1c2a2b]/60 border-[#0e393d]/12 hover:border-[#0e393d]/25'
            }`}
          >
            {t.allFilter}
            <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
              activeRecipe === null ? 'bg-white/20 text-white' : 'bg-[#0e393d]/8 text-[#0e393d]/50'
            }`}>
              {items.filter((i) => !i.is_personal).length}
            </span>
          </button>

          {/* Recipe pills */}
          {uniqueRecipes.map((r) => {
            const name  = localized(r.title as Record<string, string>, lang) || '—';
            const count = recipeItemCounts.get(r.id) ?? 0;
            const active = activeRecipe === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRecipe(active ? null : r.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? 'bg-[#0e393d] text-white border-[#0e393d]'
                    : 'bg-white text-[#1c2a2b]/60 border-[#0e393d]/12 hover:border-[#0e393d]/25'
                }`}
              >
                {truncate(name, 25)}
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  active ? 'bg-white/20 text-white' : 'bg-[#0e393d]/8 text-[#0e393d]/50'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Unified input */}
      <div ref={inputContainerRef} className="relative mb-1">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1c2a2b]/30 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <input
          ref={inputRef} type="text" value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedIng && e.target.value !== (localized(selectedIng.name, lang) || '')) setSelectedIng(null);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={t.addItem}
          className="w-full rounded-xl border border-[#0e393d]/15 bg-white pl-10 pr-4 py-2.5 text-sm text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-[#0e393d]/12 shadow-lg overflow-hidden">
            {suggestions.map((ing, idx) => {
              const label = localized(ing.name, lang) || '—';
              const cat   = ing.daily_dozen_categories;
              return (
                <li key={ing.id}>
                  <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleSelectIngredient(ing); setHighlightedIndex(-1); }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-4 py-2.5 text-sm text-[#1c2a2b] transition flex items-center gap-2 ${
                      highlightedIndex === idx ? 'bg-[#0e393d]/8' : 'hover:bg-[#0e393d]/5'
                    }`}>
                    {cat?.icon && <span className="text-base leading-none">{cat.icon}</span>}
                    <span>{highlightMatch(label, query)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showEnterHint && (
        <p className="text-xs text-[#1c2a2b]/30 mb-2 px-1">{t.enterHint}</p>
      )}

      {/* Qty + Unit + Add */}
      {selectedIng && (
        <div className="flex gap-2 mt-2 mb-4">
          <input ref={qtyInputRef} type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); unitSelectRef.current?.focus(); } }}
            placeholder={t.qty} min={0} step={0.1}
            className="w-20 rounded-xl border border-[#0e393d]/15 bg-white px-3 py-2.5 text-sm text-center text-[#1c2a2b] placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition" />
          <select ref={unitSelectRef} value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIngredient(); } }}
            className="w-28 rounded-xl border border-[#0e393d]/15 bg-white px-2 py-2.5 text-sm text-[#1c2a2b] focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition">
            <option value="">—</option>
            {units.map((u) => (
              <option key={u.id} value={u.code}>
                {(u.abbreviation as Record<string, string>)[lang] ?? u.code}
              </option>
            ))}
          </select>
          <button onClick={handleAddIngredient} disabled={adding}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0e393d] text-white text-sm font-medium hover:bg-[#0e393d]/90 disabled:opacity-40 transition">
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

      {/* Flat sorted grid */}
      {sortedItems.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {sortedItems.map((item) => (
            <ItemRow key={item.id} item={item} lang={lang} icon={item._icon} units={units}
              onToggle={handleToggle} onDelete={handleDelete} onUpdate={handleUpdate} removeAria={t.removeAria} />
          ))}
        </ul>
      )}

      <div className="flex-1 min-h-8" />

      {/* Footer */}
      {items.length > 0 && (
        <div className="sticky bottom-0 bg-[#fafaf8] border-t border-[#0e393d]/8 py-3 flex items-center justify-between">
          <span className="text-xs text-[#1c2a2b]/40">{t.xOfY(totalChecked, totalItems)}</span>
          {totalChecked > 0 && (
            <button onClick={handleClearChecked} className="text-xs text-red-500 hover:text-red-700 font-medium transition">
              {t.clearChecked}
            </button>
          )}
        </div>
      )}
      </div>
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
