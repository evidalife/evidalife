import { getLocale } from 'next-intl/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import BlogGrid, { type ArticleCard } from '@/components/BlogGrid';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const metaLang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.blog[metaLang], path: '/blog', locale });
}

const T = {
  de: { eyebrow: 'Wissen', heading: 'Blog', sub: 'Evidenzbasierte Artikel zu Gesundheit, Ernährung und Langlebigkeit.' },
  en: { eyebrow: 'Knowledge', heading: 'Blog', sub: 'Evidence-based articles on health, nutrition, and longevity.' },
};

export default async function BlogPage() {
  const locale = await getLocale();
  const t = (T as Record<string, typeof T.en>)[locale] ?? T.en;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('articles')
    .select(`
      id, slug, title, excerpt, featured_image_url,
      category, author_name, reading_time_min,
      published_at, is_featured,
      article_tags(tag)
    `)
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });

  const articles: ArticleCard[] = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug ?? null,
    title: r.title ?? null,
    excerpt: r.excerpt ?? null,
    featured_image_url: r.featured_image_url ?? null,
    category: r.category ?? null,
    author_name: r.author_name ?? null,
    reading_time_min: r.reading_time_min ?? null,
    published_at: r.published_at ?? null,
    is_featured: r.is_featured ?? null,
    tags: Array.isArray(r.article_tags)
      ? (r.article_tags as { tag: string }[]).map((t) => t.tag)
      : [],
  }));

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-28 pb-12">
        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">{t.eyebrow}</p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
          <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.sub}</p>
        </div>

        <BlogGrid articles={articles} lang={locale} />
      </main>

      <PublicFooter />
    </div>
  );
}
