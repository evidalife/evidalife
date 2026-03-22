import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import ShoppingListView, { type ShoppingList, type ShoppingListItem } from '@/components/ShoppingListView';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.shoppingList[lang], path: '/shopping-list', locale: lang });
}

export default async function ShoppingListPage() {
  const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
  type Lang = typeof VALID_LANGS[number];
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let list: ShoppingList | null = null;
  let items: ShoppingListItem[] = [];

  if (user) {
    // Load or (lazily create) the active shopping list
    const { data: lists } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    list = lists?.[0] ?? null;

    if (list) {
      const { data: rows } = await supabase
        .from('shopping_list_items')
        .select('*, recipes(title)')
        .eq('list_id', list.id)
        .order('sort_order')
        .order('created_at');

      items = (rows ?? []).map((row) => ({
        ...row,
        recipe_title: (row.recipes as { title?: { de?: string; en?: string; fr?: string; es?: string; it?: string } } | null)?.title ?? null,
      }));
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <ShoppingListView
        lang={lang}
        initialList={list}
        initialItems={items}
        userId={user?.id ?? null}
      />
      <PublicFooter />
    </div>
  );
}
