import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import RecipesGrid, { type RecipeCard } from '@/components/RecipesGrid';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.recipes[lang], path: '/recipes', locale: lang });
}

type Lang = 'de' | 'en';

const T = {
  de: { eyebrow: 'Küche', heading: 'Gesund kochen', sub: 'Vollwertige Rezepte passend zu deinen Gesundheitszielen.' },
  en: { eyebrow: 'Kitchen', heading: 'Eat well', sub: 'Whole-food recipes matched to your health goals.' },
};

export default async function RecipesPage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('recipes')
    .select(`
      id, slug, title, description, image_url,
      prep_time_min, cook_time_min, servings, difficulty, is_featured,
      recipe_daily_dozen_tags(daily_dozen_category)
    `)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  const recipes: RecipeCard[] = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug ?? null,
    title: r.title ?? null,
    description: r.description ?? null,
    image_url: r.image_url ?? null,
    prep_time_min: r.prep_time_min ?? null,
    cook_time_min: r.cook_time_min ?? null,
    servings: r.servings ?? null,
    difficulty: r.difficulty ?? null,
    is_featured: r.is_featured ?? null,
    daily_dozen_categories: Array.isArray(r.recipe_daily_dozen_tags)
      ? (r.recipe_daily_dozen_tags as { daily_dozen_category: string }[]).map((d) => d.daily_dozen_category)
      : [],
  }));

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-12">
        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
          <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.sub}</p>
        </div>

        <RecipesGrid recipes={recipes} lang={locale} />
      </main>

      <PublicFooter />
    </div>
  );
}
