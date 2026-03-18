import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';

type Lang = 'de' | 'en';

// ─── Copy ─────────────────────────────────────────────────────────────────────

const T = {
  de: {
    back: 'Blog',
    by: 'von',
    minutes: 'Min. Lesezeit',
    published: 'Veröffentlicht am',
    tags: 'Tags',
    related: 'Weitere Artikel',
    readMore: 'Lesen →',
    featured: 'Empfohlen',
  },
  en: {
    back: 'Blog',
    by: 'by',
    minutes: 'min read',
    published: 'Published',
    tags: 'Tags',
    related: 'More Articles',
    readMore: 'Read →',
    featured: 'Featured',
  },
};

const CAT_LABELS: Record<string, { de: string; en: string }> = {
  kitchen:   { de: 'Küche',          en: 'Kitchen' },
  health:    { de: 'Gesundheit',     en: 'Health' },
  fit:       { de: 'Fitness',        en: 'Fitness' },
  longevity: { de: 'Langlebigkeit',  en: 'Longevity' },
  science:   { de: 'Wissenschaft',   en: 'Science' },
  news:      { de: 'Neuigkeiten',    en: 'News' },
};

const CAT_CLS: Record<string, string> = {
  kitchen:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  health:    'bg-[#0e393d]/8 text-[#0e393d] ring-1 ring-[#0e393d]/20',
  fit:       'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
  longevity: 'bg-[#ceab84]/15 text-[#8a6a3e] ring-1 ring-[#ceab84]/30',
  science:   'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
  news:      'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20',
};

// ─── Inline markdown renderer ─────────────────────────────────────────────────

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[#1c2a2b]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="rounded bg-[#0e393d]/6 px-1 py-0.5 text-[0.85em] font-mono text-[#0e393d]">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let orderedBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      nodes.push(
        <ul key={key++} className="list-disc list-outside ml-5 space-y-1.5 text-[#1c2a2b]/80 text-base leading-relaxed mb-5">
          {listBuffer.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}
        </ul>
      );
      listBuffer = [];
    }
    if (orderedBuffer.length > 0) {
      nodes.push(
        <ol key={key++} className="list-decimal list-outside ml-5 space-y-1.5 text-[#1c2a2b]/80 text-base leading-relaxed mb-5">
          {orderedBuffer.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}
        </ol>
      );
      orderedBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      flushList();
      nodes.push(
        <h4 key={key++} className="font-serif text-lg text-[#0e393d] mt-6 mb-2">{trimmed.slice(4)}</h4>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      nodes.push(
        <h3 key={key++} className="font-serif text-xl text-[#0e393d] mt-8 mb-3">{trimmed.slice(3)}</h3>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      nodes.push(
        <h2 key={key++} className="font-serif text-2xl text-[#0e393d] mt-10 mb-3">{trimmed.slice(2)}</h2>
      );
    } else if (trimmed.startsWith('> ')) {
      flushList();
      nodes.push(
        <blockquote key={key++} className="border-l-4 border-[#ceab84] pl-4 my-5 italic text-[#1c2a2b]/65 text-base leading-relaxed">
          {inlineFormat(trimmed.slice(2))}
        </blockquote>
      );
    } else if (/^---+$/.test(trimmed)) {
      flushList();
      nodes.push(<hr key={key++} className="my-8 border-[#0e393d]/10" />);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (orderedBuffer.length > 0) flushList();
      listBuffer.push(trimmed.slice(2));
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listBuffer.length > 0) flushList();
      orderedBuffer.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      nodes.push(
        <p key={key++} className="text-base text-[#1c2a2b]/75 leading-relaxed mb-4">{inlineFormat(trimmed)}</p>
      );
    }
  }

  flushList();
  return nodes;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  // Fetch article
  const { data: article } = await supabase
    .from('articles')
    .select(`
      id, slug, title, excerpt, content,
      featured_image_url, category, author_name,
      reading_time_min, published_at, is_featured,
      article_tags(tag)
    `)
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .eq('is_published', true)
    .is('deleted_at', null)
    .single();

  if (!article) notFound();

  const title   = article.title?.[locale] || article.title?.de || article.title?.en || '';
  const excerpt = article.excerpt?.[locale] || article.excerpt?.de || '';
  const content = article.content?.[locale] || article.content?.de || '';
  const tags    = Array.isArray(article.article_tags)
    ? (article.article_tags as { tag: string }[]).map((t) => t.tag)
    : [];

  const catLabel = article.category ? (CAT_LABELS[article.category]?.[locale] ?? article.category) : null;
  const catCls   = article.category ? CAT_CLS[article.category] : '';

  // Related articles: same category, excluding current
  const { data: relatedRows } = await supabase
    .from('articles')
    .select('id, slug, title, excerpt, featured_image_url, category, reading_time_min, published_at')
    .eq('is_published', true)
    .is('deleted_at', null)
    .eq('category', article.category ?? '')
    .neq('id', article.id)
    .order('published_at', { ascending: false })
    .limit(3);

  const related = (relatedRows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug as string | null,
    title: r.title as { de?: string; en?: string } | null,
    excerpt: r.excerpt as { de?: string; en?: string } | null,
    featured_image_url: r.featured_image_url as string | null,
    category: r.category as string | null,
    reading_time_min: r.reading_time_min as number | null,
    published_at: r.published_at as string | null,
  }));

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 pt-28 pb-12">

        {/* Breadcrumb */}
        <nav className="mb-8 text-xs text-[#1c2a2b]/40">
          <Link href="/blog" className="hover:text-[#0e393d] transition">{t.back}</Link>
          <span className="mx-2">›</span>
          <span className="text-[#1c2a2b]/60 line-clamp-1">{title}</span>
        </nav>

        {/* Hero image */}
        {article.featured_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.featured_image_url}
            alt={title}
            className="w-full h-64 object-cover rounded-2xl border border-[#0e393d]/10 mb-8"
          />
        )}

        {/* Header */}
        <header className="mb-8 pb-8 border-b border-[#0e393d]/10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {article.is_featured && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#ceab84]">★ {t.featured}</span>
            )}
            {catLabel && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${catCls}`}>
                {catLabel}
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl text-[#0e393d] leading-snug mb-3">{title}</h1>

          {excerpt && (
            <p className="text-[#1c2a2b]/60 text-base leading-relaxed mb-4">{excerpt}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#1c2a2b]/45">
            {article.author_name && (
              <span>{t.by} <span className="font-medium text-[#1c2a2b]/70">{article.author_name}</span></span>
            )}
            {article.published_at && (
              <span>{t.published} {formatDate(article.published_at, locale)}</span>
            )}
            {article.reading_time_min && (
              <span>{article.reading_time_min} {t.minutes}</span>
            )}
          </div>
        </header>

        {/* Article body */}
        {content ? (
          <div className="mb-12">
            {renderMarkdown(content)}
          </div>
        ) : null}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-12 pt-6 border-t border-[#0e393d]/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#1c2a2b]/35 mb-3">{t.tags}</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#0e393d]/6 px-3 py-1 text-xs font-medium text-[#0e393d]/70"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <section>
            <h2 className="font-serif text-xl text-[#0e393d] mb-5">{t.related}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => {
                const rTitle   = r.title?.[locale] || r.title?.de || '';
                const rExcerpt = r.excerpt?.[locale] || r.excerpt?.de || '';
                const rHref    = `/blog/${r.slug ?? r.id}`;
                const rCatLabel = r.category ? (CAT_LABELS[r.category]?.[locale] ?? r.category) : null;
                const rCatCls  = r.category ? CAT_CLS[r.category] : '';

                return (
                  <Link
                    key={r.id}
                    href={rHref}
                    className="group flex flex-col rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-sm transition-all duration-200"
                  >
                    {r.featured_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.featured_image_url}
                        alt={rTitle}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    <div className="flex flex-col flex-1 p-4">
                      {rCatLabel && (
                        <span className={`self-start mb-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${rCatCls}`}>
                          {rCatLabel}
                        </span>
                      )}
                      <h3 className="font-serif text-sm text-[#0e393d] leading-snug mb-1 group-hover:text-[#1a5055] transition-colors line-clamp-2">
                        {rTitle}
                      </h3>
                      {rExcerpt && (
                        <p className="text-xs text-[#1c2a2b]/50 line-clamp-2 mb-2">{rExcerpt}</p>
                      )}
                      <div className="mt-auto flex items-center justify-between text-[10px] text-[#1c2a2b]/35">
                        <span>{r.published_at ? formatDate(r.published_at, locale) : ''}</span>
                        {r.reading_time_min && <span>{r.reading_time_min} {t.minutes}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </main>

      <PublicFooter />
    </div>
  );
}
