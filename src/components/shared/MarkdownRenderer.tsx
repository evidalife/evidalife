import ReactMarkdown from 'react-markdown';
import { Link } from '@/i18n/navigation';

/* ─── Types ──────────────────────────────────────────────────────────────────── */

export interface GalleryPhoto {
  url: string;
  order: number;
}

export interface RecipeEmbed {
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  servings: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

export type MarkdownVariant = 'article' | 'recipe' | 'product';

interface Props {
  content: string;
  variant?: MarkdownVariant;
  gallery?: GalleryPhoto[];
  recipeEmbeds?: RecipeEmbed[];
  lang?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function supabaseTransform(url: string, width: number, height?: number): string {
  if (!url.includes('/storage/v1/object/public/')) return url;
  const rendered = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  return height ? `${rendered}?width=${width}&height=${height}&resize=cover` : `${rendered}?width=${width}&resize=cover`;
}

const DIFF_LABELS: Record<string, Record<string, string>> = {
  easy:   { de: 'Einfach', en: 'Easy',   fr: 'Facile',  es: 'Fácil',   it: 'Facile'   },
  medium: { de: 'Mittel',  en: 'Medium', fr: 'Moyen',   es: 'Medio',   it: 'Medio'    },
  hard:   { de: 'Schwer',  en: 'Hard',   fr: 'Difficile',es: 'Difícil', it: 'Difficile' },
};

const DIFF_CLS: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  hard:   'bg-red-50 text-red-700 ring-1 ring-red-600/20',
};

const T_VIEW: Record<string, string> = {
  de: 'Rezept ansehen', en: 'View recipe', fr: 'Voir la recette', es: 'Ver receta', it: 'Vedi ricetta',
};
const T_MIN: Record<string, string> = {
  de: 'Min.', en: 'min', fr: 'min', es: 'min', it: 'min',
};
const T_SERVINGS: Record<string, (n: number) => string> = {
  de: (n) => `${n} Portion${n > 1 ? 'en' : ''}`,
  en: (n) => `${n} serving${n > 1 ? 's' : ''}`,
  fr: (n) => `${n} portion${n > 1 ? 's' : ''}`,
  es: (n) => `${n} porci${n > 1 ? 'ones' : 'ón'}`,
  it: (n) => `${n} porzi${n > 1 ? 'oni' : 'one'}`,
};

/* ─── Variant-specific styles ────────────────────────────────────────────────── */

const STYLES = {
  article: {
    h1: 'font-serif text-2xl text-[#0e393d] mt-10 mb-3',
    h2: 'font-serif text-xl text-[#0e393d] mt-8 mb-3',
    h3: 'font-serif text-lg text-[#0e393d] mt-6 mb-2',
    p: 'text-base text-[#1c2a2b]/75 leading-relaxed mb-4',
    strong: 'font-semibold text-[#1c2a2b]',
    em: '',
    code: 'rounded bg-[#0e393d]/6 px-1 py-0.5 text-[0.85em] font-mono text-[#0e393d]',
    blockquote: 'border-l-4 border-[#ceab84] pl-4 my-5 italic text-[#1c2a2b]/65 text-base leading-relaxed',
    ul: 'list-disc list-outside ml-5 space-y-1.5 text-[#1c2a2b]/80 text-base leading-relaxed mb-5',
    ol: 'list-decimal list-outside ml-5 space-y-1.5 text-[#1c2a2b]/80 text-base leading-relaxed mb-5',
    li: '',
    hr: 'my-8 border-[#0e393d]/10',
    a: 'text-[#0e393d] underline underline-offset-2 decoration-[#ceab84] hover:decoration-[#0e393d] transition-colors',
    img: 'w-full rounded-xl object-cover my-4',
  },
  recipe: {
    h1: 'font-serif text-xl text-[#0e393d] mt-7 mb-3',
    h2: 'text-xs font-semibold uppercase tracking-widest text-[#0e393d]/50 mt-7 mb-3',
    h3: 'text-xs font-semibold uppercase tracking-widest text-[#0e393d]/40 mt-5 mb-2',
    p: 'text-sm text-[#1c2a2b]/75 leading-relaxed mb-3',
    strong: 'font-semibold text-[#1c2a2b]',
    em: '',
    code: 'rounded bg-[#0e393d]/6 px-1 py-0.5 text-[0.85em] font-mono text-[#0e393d]',
    blockquote: 'border-l-2 border-[#ceab84] pl-4 py-1.5 mb-3 bg-[#ceab84]/5 rounded-r-lg text-sm text-[#1c2a2b]/65 italic leading-relaxed',
    ul: 'space-y-1.5 mb-4 pl-5 list-disc text-sm text-[#1c2a2b]/75 leading-relaxed',
    ol: 'space-y-3 mb-5 pl-5 list-decimal text-sm text-[#1c2a2b]/75 leading-relaxed',
    li: '',
    hr: 'border-[#0e393d]/10 my-5',
    a: 'text-[#0e393d] underline underline-offset-2 decoration-[#ceab84] hover:decoration-[#0e393d] transition-colors',
    img: 'w-full rounded-xl object-cover my-4',
  },
  product: {
    h1: 'font-serif text-xl text-[#0e393d] mt-8 mb-3',
    h2: 'font-serif text-lg text-[#0e393d] mt-6 mb-2',
    h3: 'text-sm font-semibold text-[#0e393d] mt-5 mb-2',
    p: 'text-sm text-[#1c2a2b]/70 leading-relaxed mb-3',
    strong: 'font-semibold text-[#1c2a2b]',
    em: '',
    code: 'rounded bg-[#0e393d]/6 px-1 py-0.5 text-[0.85em] font-mono text-[#0e393d]',
    blockquote: 'border-l-4 border-[#ceab84] pl-4 my-4 italic text-[#1c2a2b]/60 text-sm leading-relaxed',
    ul: 'list-disc list-outside ml-5 space-y-1 text-sm text-[#1c2a2b]/70 leading-relaxed mb-4',
    ol: 'list-decimal list-outside ml-5 space-y-1 text-sm text-[#1c2a2b]/70 leading-relaxed mb-4',
    li: '',
    hr: 'my-6 border-[#0e393d]/10',
    a: 'text-[#0e393d] underline underline-offset-2 decoration-[#ceab84] hover:decoration-[#0e393d] transition-colors',
    img: 'w-full rounded-xl object-cover my-4',
  },
};

/* ─── Pre-process: custom syntax → standard markdown ─────────────────────────── */

function preprocess(
  content: string,
  gallery: GalleryPhoto[],
): string {
  // Replace ![photo:N] with actual image markdown
  return content.replace(/^!\[photo:(\d+)\]$/gm, (_match, num) => {
    const idx = parseInt(num, 10) - 1;
    const photo = gallery[idx];
    if (!photo) return '';
    return `![photo](${photo.url})`;
  });
}

/* ─── Recipe embed card (inline) ─────────────────────────────────────────────── */

function RecipeEmbedCard({ recipe, lang }: { recipe: RecipeEmbed; lang: string }) {
  const time = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0) || null;
  const diff = recipe.difficulty;

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200 my-6"
    >
      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={supabaseTransform(recipe.image_url, 400, 300)}
          alt={recipe.title}
          className="w-40 sm:w-48 object-cover shrink-0 group-hover:scale-105 transition-transform duration-300"
        />
      )}
      <div className="flex flex-col flex-1 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#ceab84] mb-1">Recipe</p>
        <h3 className="font-serif text-lg text-[#0e393d] leading-snug mb-1.5 group-hover:text-[#1a5055] transition-colors">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-sm text-[#1c2a2b]/55 leading-relaxed line-clamp-2 mb-3">{recipe.description}</p>
        )}
        <div className="flex items-center gap-3 mt-auto text-xs text-[#1c2a2b]/50">
          {time != null && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {time} {T_MIN[lang] ?? 'min'}
            </span>
          )}
          {recipe.servings != null && (
            <span>{(T_SERVINGS[lang] ?? T_SERVINGS.en)(recipe.servings)}</span>
          )}
          {diff && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${DIFF_CLS[diff]}`}>
              {DIFF_LABELS[diff]?.[lang] ?? DIFF_LABELS[diff]?.en ?? diff}
            </span>
          )}
        </div>
        <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#0e393d] group-hover:text-[#0e393d]/70 transition">
          {T_VIEW[lang] ?? T_VIEW.en}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function MarkdownRenderer({
  content,
  variant = 'article',
  gallery = [],
  recipeEmbeds = [],
  lang = 'en',
}: Props) {
  const s = STYLES[variant];
  const processed = preprocess(content, gallery);

  // Split content by ::recipe[slug] blocks and render them as embeds
  const parts = processed.split(/(::recipe\[[^\]]+\])/g);

  return (
    <div>
      {parts.map((part, i) => {
        // Check for recipe embed syntax
        const recipeMatch = part.match(/^::recipe\[([^\]]+)\]$/);
        if (recipeMatch) {
          const slug = recipeMatch[1];
          const embed = recipeEmbeds.find((r) => r.slug === slug);
          if (embed) {
            return <RecipeEmbedCard key={i} recipe={embed} lang={lang} />;
          }
          return null;
        }

        // Regular markdown
        return (
          <ReactMarkdown
            key={i}
            components={{
              h1: ({ children }) => <h2 className={s.h1}>{children}</h2>,
              h2: ({ children }) => <h3 className={s.h2}>{children}</h3>,
              h3: ({ children }) => <h4 className={s.h3}>{children}</h4>,
              p: ({ children }) => <p className={s.p}>{children}</p>,
              strong: ({ children }) => <strong className={s.strong}>{children}</strong>,
              em: ({ children }) => <em className={s.em}>{children}</em>,
              code: ({ children }) => <code className={s.code}>{children}</code>,
              blockquote: ({ children }) => <blockquote className={s.blockquote}>{children}</blockquote>,
              ul: ({ children }) => <ul className={s.ul}>{children}</ul>,
              ol: ({ children }) => <ol className={s.ol}>{children}</ol>,
              li: ({ children }) => <li className={s.li}>{children}</li>,
              hr: () => <hr className={s.hr} />,
              img: ({ src, alt }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src ?? ''} alt={alt ?? ''} className={s.img} />
              ),
              a: ({ href, children }) => {
                const url = href ?? '#';
                // Internal links use Next.js Link
                if (url.startsWith('/')) {
                  return <Link href={url} className={s.a}>{children}</Link>;
                }
                return (
                  <a href={url} className={s.a} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                );
              },
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}
