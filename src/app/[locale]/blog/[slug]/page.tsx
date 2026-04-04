import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import PageHero from '@/components/PageHero';
import { createClient } from '@/lib/supabase/server';


function supabaseTransform(url: string | null, width: number, height?: number): string | null {
  if (!url || !url.includes('/storage/v1/object/public/')) return url;
  const rendered = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return height ? `${rendered}?width=${width}&height=${height}&resize=cover` : `${rendered}?width=${width}&resize=cover`;
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

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
  fr: {
    back: 'Blog',
    by: 'par',
    minutes: 'min de lecture',
    published: 'Publié le',
    tags: 'Tags',
    related: 'Plus d\'articles',
    readMore: 'Lire →',
    featured: 'À la une',
  },
  es: {
    back: 'Blog',
    by: 'por',
    minutes: 'min de lectura',
    published: 'Publicado el',
    tags: 'Etiquetas',
    related: 'Más artículos',
    readMore: 'Leer →',
    featured: 'Destacado',
  },
  it: {
    back: 'Blog',
    by: 'di',
    minutes: 'min di lettura',
    published: 'Pubblicato il',
    tags: 'Tag',
    related: 'Altri articoli',
    readMore: 'Leggi →',
    featured: 'In evidenza',
  },
};

const CAT_LABELS: Record<string, Record<Lang, string>> = {
  kitchen:   { de: 'Küche',          en: 'Kitchen',    fr: 'Cuisine',     es: 'Cocina',     it: 'Cucina' },
  health:    { de: 'Gesundheit',     en: 'Health',     fr: 'Santé',       es: 'Salud',      it: 'Salute' },
  fit:       { de: 'Fitness',        en: 'Fitness',    fr: 'Fitness',     es: 'Fitness',    it: 'Fitness' },
  longevity: { de: 'Langlebigkeit',  en: 'Longevity',  fr: 'Longévité',   es: 'Longevidad', it: 'Longevità' },
  science:   { de: 'Wissenschaft',   en: 'Science',    fr: 'Science',     es: 'Ciencia',    it: 'Scienza' },
  news:      { de: 'Neuigkeiten',    en: 'News',       fr: 'Actualités',  es: 'Noticias',   it: 'Notizie' },
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

const DATE_LOCALE: Record<string, string> = {
  de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', it: 'it-IT',
};

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE[lang] ?? 'en-US', {
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
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];
  const supabase = await createClient();

  // Fetch article – only match by id when slug looks like a UUID (avoids type-cast error)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  let query = supabase
    .from('articles')
    .select(`
      id, slug, title, excerpt, content,
      featured_image_url, photo_credit, category, author_name,
      reading_time_min, published_at, is_featured,
      article_tags(tag)
    `)
    .eq('is_published', true)
    .is('deleted_at', null);

  if (isUuid) {
    query = query.or(`slug.eq.${slug},id.eq.${slug}`);
  } else {
    query = query.eq('slug', slug);
  }

  const { data: article } = await query.single();

  if (!article) notFound();

  const titleObj   = article.title as Record<string, string> | null;
  const excerptObj = article.excerpt as Record<string, string> | null;
  const contentObj = article.content as Record<string, string> | null;
  const title   = titleObj?.[lang] || titleObj?.en || titleObj?.de || '';
  const excerpt = excerptObj?.[lang] || excerptObj?.en || excerptObj?.de || '';
  const content = contentObj?.[lang] || contentObj?.en || contentObj?.de || '';
  const tags    = Array.isArray(article.article_tags)
    ? (article.article_tags as { tag: string }[]).map((t) => t.tag)
    : [];

  const catLabel = article.category ? (CAT_LABELS[article.category]?.[lang] ?? CAT_LABELS[article.category]?.en ?? article.category) : null;
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
    title: r.title as Record<string, string> | null,
    excerpt: r.excerpt as Record<string, string> | null,
    featured_image_url: r.featured_image_url as string | null,
    category: r.category as string | null,
    reading_time_min: r.reading_time_min as number | null,
    published_at: r.published_at as string | null,
  }));

  // Build meta line
  const metaParts: string[] = [];
  if (article.author_name) metaParts.push(`${t.by} ${article.author_name}`);
  if (article.published_at) metaParts.push(`${t.published} ${formatDate(article.published_at, locale)}`);
  if (article.reading_time_min) metaParts.push(`${article.reading_time_min} ${t.minutes}`);
  const metaLine = metaParts.join('  ·  ');

  // Eyebrow: featured badge + category
  const eyebrowParts: string[] = [];
  if (article.is_featured) eyebrowParts.push(`★ ${t.featured}`);
  if (catLabel) eyebrowParts.push(catLabel);
  const eyebrow = eyebrowParts.join('  ·  ') || undefined;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      {article.featured_image_url ? (
        <div className="relative">
          <PageHero
            variant="photo"
            eyebrow={eyebrow}
            title={title}
            subtitle={excerpt || undefined}
            imageUrl={supabaseTransform(article.featured_image_url, 1400) ?? article.featured_image_url}
          >
            {metaLine && (
              <p className="mt-4 text-sm text-white/40">{metaLine}</p>
            )}
          </PageHero>
          {article.photo_credit && (
            <span className="absolute bottom-3 right-4 text-[10px] text-white/30 tracking-wide">
              Photo: {article.photo_credit as string}
            </span>
          )}
        </div>
      ) : (
        <PageHero
          variant="light"
          eyebrow={eyebrow}
          title={title}
          subtitle={excerpt || undefined}
          meta={metaLine || undefined}
        />
      )}

      <main className="flex-1 w-full max-w-[1060px] mx-auto px-8 md:px-12 pt-10 pb-12">

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
                const rTitle   = r.title?.[lang] || r.title?.en || r.title?.de || '';
                const rExcerpt = r.excerpt?.[lang] || r.excerpt?.en || r.excerpt?.de || '';
                const rHref    = `/blog/${r.slug ?? r.id}`;
                const rCatLabel = r.category ? (CAT_LABELS[r.category]?.[lang] ?? CAT_LABELS[r.category]?.en ?? r.category) : null;
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
                        src={supabaseTransform(r.featured_image_url, 400, 200) ?? r.featured_image_url}
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
