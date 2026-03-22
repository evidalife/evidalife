import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import AddToShoppingListButton from '@/components/AddToShoppingListButton';
import AddAllToShoppingListButton from '@/components/AddAllToShoppingListButton';
import RecipeRating from '@/components/RecipeRating';
import PrintButton from '@/components/PrintButton';
import FavouriteButton from '@/components/FavouriteButton';
import RecipeGallery, { type GalleryPhoto } from '@/components/RecipeGallery';
import { createClient } from '@/lib/supabase/server';
import { T } from './translations';

function supabaseTransform(url: string | null, width: number, height?: number): string | null {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const rendered = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return height ? `${rendered}?width=${width}&height=${height}&resize=cover` : `${rendered}?width=${width}&resize=cover`;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const DD_LABELS: Record<string, Record<Lang, string>> = {
  beans:        { de: 'Hülsenfrüchte',     en: 'Beans',           fr: 'Légumineuses',  es: 'Legumbres',        it: 'Legumi' },
  berries:      { de: 'Beeren',            en: 'Berries',         fr: 'Baies',         es: 'Bayas',            it: 'Bacche' },
  fruits:       { de: 'Früchte',           en: 'Other Fruits',    fr: 'Autres fruits', es: 'Otras frutas',     it: 'Altra frutta' },
  cruciferous:  { de: 'Kreuzblütler',      en: 'Cruciferous',     fr: 'Crucifères',    es: 'Crucíferas',       it: 'Crucifere' },
  greens:       { de: 'Grüns',             en: 'Greens',          fr: 'Légumes verts', es: 'Verduras de hoja', it: 'Verdure a foglia' },
  vegetables:   { de: 'Gemüse',            en: 'Other Vegetables',fr: 'Autres légumes',es: 'Otras verduras',   it: 'Altre verdure' },
  flaxseeds:    { de: 'Leinsamen',         en: 'Flaxseeds',       fr: 'Graines de lin',es: 'Semillas de lino', it: 'Semi di lino' },
  nuts:         { de: 'Nüsse & Samen',     en: 'Nuts & Seeds',    fr: 'Noix & graines',es: 'Nueces & semillas',it: 'Noci & semi' },
  herbs_spices: { de: 'Kräuter & Gewürze', en: 'Herbs & Spices',  fr: 'Herbes & épices',es: 'Hierbas & especias',it: 'Erbe & spezie' },
  whole_grains: { de: 'Vollkorn',          en: 'Whole Grains',    fr: 'Céréales complètes',es: 'Cereales integrales',it: 'Cereali integrali' },
  beverages:    { de: 'Getränke',          en: 'Beverages',       fr: 'Boissons',      es: 'Bebidas',          it: 'Bevande' },
  exercise:     { de: 'Bewegung',          en: 'Exercise',        fr: 'Exercice',      es: 'Ejercicio',        it: 'Esercizio' },
};

const GOAL_LABELS: Record<string, Record<Lang, string>> = {
  weight_loss:         { de: 'Gewichtsverlust',    en: 'Weight Loss',         fr: 'Perte de poids',       es: 'Pérdida de peso',     it: 'Perdita di peso' },
  heart_health:        { de: 'Herzgesundheit',      en: 'Heart Health',        fr: 'Santé cardiaque',      es: 'Salud cardíaca',       it: 'Salute cardiaca' },
  anti_inflammation:   { de: 'Anti-Entzündung',     en: 'Anti-Inflammation',   fr: 'Anti-inflammation',    es: 'Anti-inflamación',     it: 'Anti-infiammazione' },
  longevity:           { de: 'Langlebigkeit',       en: 'Longevity',           fr: 'Longévité',            es: 'Longevidad',           it: 'Longevità' },
  gut_health:          { de: 'Darmgesundheit',      en: 'Gut Health',          fr: 'Santé intestinale',    es: 'Salud intestinal',     it: 'Salute intestinale' },
  energy:              { de: 'Energie',             en: 'Energy',              fr: 'Énergie',              es: 'Energía',              it: 'Energia' },
  immune:              { de: 'Immunsystem',         en: 'Immune Support',      fr: 'Soutien immunitaire',  es: 'Apoyo inmune',         it: 'Supporto immunitario' },
  bone_health:         { de: 'Knochengesundheit',   en: 'Bone Health',         fr: 'Santé osseuse',        es: 'Salud ósea',           it: 'Salute ossea' },
  brain_health:        { de: 'Gehirngesundheit',    en: 'Brain Health',        fr: 'Santé cérébrale',      es: 'Salud cerebral',       it: 'Salute cerebrale' },
  diabetes_prevention: { de: 'Diabetesprävention', en: 'Diabetes Prevention', fr: 'Prévention du diabète',es: 'Prevención de diabetes',it: 'Prevenzione del diabete' },
};

const DIFF_CLS = {
  easy:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  hard:   'bg-red-50 text-red-700 ring-1 ring-red-600/20',
};

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(md: string, gallery: GalleryPhoto[] = []): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let ulBuffer: string[] = [];
  let olBuffer: { num: string; text: string }[] = [];
  let key = 0;

  const inlineFormat = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#1c2a2b]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const flushUl = () => {
    if (!ulBuffer.length) return;
    nodes.push(
      <ul key={key++} className="space-y-1.5 mb-4 pl-0">
        {ulBuffer.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-[#1c2a2b]/75 leading-relaxed">
            <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-[#ceab84]" />
            <span>{inlineFormat(item)}</span>
          </li>
        ))}
      </ul>
    );
    ulBuffer = [];
  };

  const flushOl = () => {
    if (!olBuffer.length) return;
    nodes.push(
      <ol key={key++} className="space-y-3 mb-5 pl-0">
        {olBuffer.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-[#0e393d]/8 text-[#0e393d] text-[11px] font-semibold flex items-center justify-center mt-0.5">
              {item.num}
            </span>
            <span className="flex-1 text-sm text-[#1c2a2b]/75 leading-relaxed pt-0.5">{inlineFormat(item.text)}</span>
          </li>
        ))}
      </ol>
    );
    olBuffer = [];
  };

  const flushAll = () => { flushUl(); flushOl(); };

  for (const line of lines) {
    const trimmed = line.trim();

    const photoMatch = trimmed.match(/^!\[photo:(\d+)\]$/);
    if (photoMatch) {
      flushAll();
      const p = gallery[parseInt(photoMatch[1], 10) - 1];
      if (p) {
        // eslint-disable-next-line @next/next/no-img-element
        nodes.push(<img key={key++} src={p.url} alt="" className="w-full rounded-xl object-cover my-4" />);
      }
    } else if (trimmed === '---') {
      flushAll();
      nodes.push(<hr key={key++} className="border-[#0e393d]/10 my-5" />);
    } else if (trimmed.startsWith('## ')) {
      flushAll();
      nodes.push(
        <h3 key={key++} className="text-xs font-semibold uppercase tracking-widest text-[#0e393d]/50 mt-7 mb-3">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushAll();
      nodes.push(
        <h2 key={key++} className="font-serif text-xl text-[#0e393d] mt-7 mb-3">{trimmed.slice(2)}</h2>
      );
    } else if (trimmed.startsWith('> ')) {
      flushAll();
      nodes.push(
        <div key={key++} className="border-l-2 border-[#ceab84] pl-4 py-1.5 mb-3 bg-[#ceab84]/5 rounded-r-lg">
          <p className="text-sm text-[#1c2a2b]/65 italic leading-relaxed">{inlineFormat(trimmed.slice(2))}</p>
        </div>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushOl();
      ulBuffer.push(trimmed.slice(2));
    } else {
      const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (olMatch) {
        flushUl();
        olBuffer.push({ num: olMatch[1], text: olMatch[2] });
      } else if (trimmed === '') {
        flushAll();
      } else {
        flushAll();
        nodes.push(
          <p key={key++} className="text-sm text-[#1c2a2b]/75 leading-relaxed mb-3">{inlineFormat(trimmed)}</p>
        );
      }
    }
  }

  flushAll();
  return nodes;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RecipeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const supabase = await createClient();

  // Auth (for favourites)
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      id, slug, title, description, instructions, image_url, image_gallery,
      prep_time_min, cook_time_min, servings, difficulty, is_featured,
      nutrition_info,
      recipe_ingredients(id, ingredient_name, amount, unit, notes, is_optional, sort_order, section_header),
      recipe_goal_tags(goal)
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single();

  if (!recipe) notFound();

  // Parallel: DD coverage + ratings + favourite status
  const [{ data: ddRows }, { data: ratingsData }, { data: favData }] = await Promise.all([
    supabase
      .from('v_recipe_daily_dozen_coverage')
      .select('category_slug, category_icon')
      .eq('recipe_id', recipe.id),
    supabase
      .from('recipe_ratings')
      .select('rating')
      .eq('recipe_id', recipe.id),
    user
      ? supabase
          .from('recipe_favourites')
          .select('id')
          .eq('recipe_id', recipe.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const ratingCount = ratingsData?.length ?? 0;
  const ratingAvg   = ratingCount > 0
    ? ratingsData!.reduce((sum, r) => sum + (r.rating as number), 0) / ratingCount
    : null;
  const isFavourited = !!favData;

  const title        = recipe.title?.[lang] || recipe.title?.en || recipe.title?.de || '';
  const description  = recipe.description?.[lang] || recipe.description?.en || recipe.description?.de || '';
  const instructions = recipe.instructions?.[lang] || recipe.instructions?.en || recipe.instructions?.de || '';

  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const ddTags    = (ddRows ?? []) as { category_slug: string; category_icon: string }[];
  const goals     = (recipe.recipe_goal_tags ?? []) as { goal: string }[];
  const nutrition = recipe.nutrition_info as {
    calories?: number; protein_g?: number; fat_g?: number; carbs_g?: number; fiber_g?: number;
  } | null;

  const gallery   = ((recipe.image_gallery ?? []) as GalleryPhoto[]).sort((a, b) => a.order - b.order);
  const totalTime = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0) || null;
  const diffKey   = recipe.difficulty as 'easy' | 'medium' | 'hard' | null;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-12">

        {/* Breadcrumb */}
        <nav className="mb-6 text-xs text-[#1c2a2b]/40">
          <Link href="/recipes" className="hover:text-[#0e393d] transition">{t.back}</Link>
          <span className="mx-2">›</span>
          <span className="text-[#1c2a2b]/60">{title}</span>
        </nav>

        {/* Cover image */}
        {recipe.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={supabaseTransform(recipe.image_url, 1400, 560) ?? recipe.image_url}
            alt={title}
            className="w-full h-56 sm:h-72 max-h-[400px] object-cover rounded-2xl border border-[#0e393d]/10 mb-8"
          />
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            {recipe.is_featured && (
              <span className="inline-block mb-2 bg-[#ceab84] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                ★ {t.featured}
              </span>
            )}
            <h1 className="font-serif text-3xl sm:text-4xl text-[#0e393d] leading-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-1" data-print-hide>
            <FavouriteButton
              recipeId={recipe.id}
              userId={user?.id ?? null}
              initialIsFavourited={isFavourited}
              size="md"
            />
            <PrintButton label={t.print} />
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed max-w-2xl mb-6">{description}</p>
        )}

        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-8 pb-8 border-b border-[#0e393d]/10 text-sm text-[#1c2a2b]/60">
          {recipe.prep_time_min != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.prep}</span>
              <span className="font-medium text-[#1c2a2b]">{recipe.prep_time_min} {t.minutes}</span>
            </div>
          )}
          {recipe.cook_time_min != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.cook}</span>
              <span className="font-medium text-[#1c2a2b]">{recipe.cook_time_min} {t.minutes}</span>
            </div>
          )}
          {totalTime != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">{t.total}</span>
              <span className="font-medium text-[#1c2a2b]">{totalTime} {t.minutes}</span>
            </div>
          )}
          {recipe.servings != null && (
            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#1c2a2b]/35 mb-0.5">&nbsp;</span>
              <span className="font-medium text-[#1c2a2b]">{t.servings(recipe.servings)}</span>
            </div>
          )}
          {diffKey && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${DIFF_CLS[diffKey]}`}>
              {t.difficulty[diffKey]}
            </span>
          )}
        </div>

        {/* Main two-column layout */}
        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">

          {/* LEFT: Gallery + Ingredients + Instructions */}
          <div>

            {/* Gallery — inside left column, same width as ingredients */}
            {gallery.length > 0 && (
              <div className="mb-8">
                <RecipeGallery photos={gallery} />
              </div>
            )}

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-[#0e393d]">{t.ingredients}</h2>
                  <span data-print-hide>
                    <AddAllToShoppingListButton
                      ingredients={ingredients.filter((i) => !i.section_header)}
                      recipeId={recipe.id}
                      lang={locale}
                    />
                  </span>
                </div>

                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  {ingredients.map((ing) => {
                    if (ing.section_header) {
                      return (
                        <li key={ing.id} className="col-span-full pt-3 pb-1 first:pt-0">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#ceab84]">
                            {ing.section_header}
                          </h3>
                        </li>
                      );
                    }

                    const ingName = typeof ing.ingredient_name === 'object' && ing.ingredient_name !== null
                      ? (ing.ingredient_name as Record<string, string>)?.[lang]
                        || (ing.ingredient_name as Record<string, string>)?.en
                        || (ing.ingredient_name as Record<string, string>)?.de
                        || ''
                      : String(ing.ingredient_name || '');

                    const rawNotes = ing.notes;
                    const notesText = !rawNotes ? '' :
                      typeof rawNotes === 'object'
                        ? ((rawNotes as Record<string, string>)?.[lang]
                          || (rawNotes as Record<string, string>)?.en
                          || (rawNotes as Record<string, string>)?.de
                          || '')
                        : String(rawNotes);

                    const displayAmount = ing.amount != null ? ing.amount : null;

                    return (
                      <li
                        key={ing.id}
                        className="flex items-center gap-3 rounded-xl border border-[#0e393d]/10 bg-white px-4 py-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-[#1c2a2b]">{ingName}</span>
                          {notesText && (
                            <span className="ml-1.5 text-xs text-[#1c2a2b]/40">({notesText})</span>
                          )}
                        </div>
                        {(displayAmount != null || ing.unit) && (
                          <span className="shrink-0 text-sm text-[#1c2a2b]/50">
                            {displayAmount != null ? displayAmount : ''}{ing.unit ? ` ${ing.unit}` : ''}
                          </span>
                        )}
                        <span data-print-hide>
                          <AddToShoppingListButton
                            ingredientName={ingName}
                            amount={displayAmount}
                            unit={typeof ing.unit === 'string' ? ing.unit : null}
                            recipeId={recipe.id}
                            lang={locale}
                            compact
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Instructions */}
            {instructions && (
              <section>
                <h2 className="font-serif text-xl text-[#0e393d] mb-5">{t.instructions}</h2>
                <div>{renderMarkdown(instructions, gallery)}</div>
              </section>
            )}

            {/* Print-only sidebar content */}
            <div className="hidden print:block mt-8 pt-6 border-t border-[#0e393d]/15 space-y-6">
              {nutrition && Object.values(nutrition).some((v) => v != null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">
                    {t.nutrition}{recipe.servings != null ? ` · ${t.per_serving}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {nutrition.calories  != null && <span className="text-sm">{t.calories}: <strong>{nutrition.calories}</strong></span>}
                    {nutrition.protein_g != null && <span className="text-sm">{t.protein}: <strong>{nutrition.protein_g} g</strong></span>}
                    {nutrition.fat_g     != null && <span className="text-sm">{t.fat}: <strong>{nutrition.fat_g} g</strong></span>}
                    {nutrition.carbs_g   != null && <span className="text-sm">{t.carbs}: <strong>{nutrition.carbs_g} g</strong></span>}
                    {nutrition.fiber_g   != null && <span className="text-sm">{t.fiber}: <strong>{nutrition.fiber_g} g</strong></span>}
                  </div>
                </div>
              )}
              {ddTags.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.daily_dozen}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ddTags.map((tag) => (
                      <span key={tag.category_slug} className="text-sm">
                        {tag.category_icon} {DD_LABELS[tag.category_slug]?.[lang] ?? tag.category_slug}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {goals.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-2">{t.goals}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {goals.map((g) => (
                      <span key={g.goal} className="text-sm">
                        {GOAL_LABELS[g.goal]?.[lang] ?? g.goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT sidebar */}
          <aside className="space-y-5">

            <RecipeRating
              recipeId={recipe.id}
              initialAvg={ratingAvg}
              initialCount={ratingCount}
              lang={locale}
            />

            {nutrition && Object.values(nutrition).some((v) => v != null) && (
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-1">{t.nutrition}</p>
                {recipe.servings != null && (
                  <p className="text-[11px] text-[#1c2a2b]/40 mb-4">{t.per_serving}</p>
                )}
                <div className="space-y-2.5">
                  {nutrition.calories != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.calories}</span>
                      <span className="text-sm font-semibold text-[#0e393d]">{nutrition.calories}</span>
                    </div>
                  )}
                  {nutrition.protein_g != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.protein}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.protein_g} g</span>
                    </div>
                  )}
                  {nutrition.fat_g != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.fat}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.fat_g} g</span>
                    </div>
                  )}
                  {nutrition.carbs_g != null && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-[#1c2a2b]/70">{t.carbs}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.carbs_g} g</span>
                    </div>
                  )}
                  {nutrition.fiber_g != null && (
                    <div className="flex justify-between items-baseline border-t border-[#0e393d]/8 pt-2.5 mt-2">
                      <span className="text-sm text-[#1c2a2b]/70">{t.fiber}</span>
                      <span className="text-sm font-medium text-[#1c2a2b]">{nutrition.fiber_g} g</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {ddTags.length > 0 && (
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.daily_dozen}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ddTags.map((tag) => (
                    <span
                      key={tag.category_slug}
                      className="rounded-full bg-[#ceab84]/12 px-2.5 py-1 text-xs font-medium text-[#8a6a3e]"
                    >
                      {tag.category_icon} {DD_LABELS[tag.category_slug]?.[lang] ?? tag.category_slug}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {goals.length > 0 && (
              <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.goals}</p>
                <div className="flex flex-wrap gap-1.5">
                  {goals.map((g) => (
                    <span
                      key={g.goal}
                      className="rounded-full bg-[#0e393d]/6 px-2.5 py-1 text-xs font-medium text-[#0e393d]/70"
                    >
                      {GOAL_LABELS[g.goal]?.[lang] ?? g.goal}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
