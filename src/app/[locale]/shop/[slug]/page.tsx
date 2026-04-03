import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { buildMeta } from '@/lib/seo';
import BuyButton from './BuyButton';

type Params = Promise<{ locale: string; slug: string }>;
type I18n = Record<string, string> | string | null;

function loc(field: I18n, lng: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lng] ?? field['en'] ?? field['de'] ?? '';
}

const T: Record<string, Record<string, string>> = {
  back:           { de: '← Zurück zum Shop', en: '← Back to Shop', fr: '← Retour à la boutique', es: '← Volver a la tienda', it: '← Torna al negozio' },
  recommended:    { de: 'EMPFOHLEN', en: 'RECOMMENDED', fr: 'RECOMMANDÉ', es: 'RECOMENDADO', it: 'CONSIGLIATO' },
  includedTests:  { de: 'Enthaltene Tests', en: 'Included tests', fr: 'Tests inclus', es: 'Pruebas incluidas', it: 'Test inclusi' },
  buyNow:         { de: 'Jetzt kaufen', en: 'Buy Now', fr: 'Acheter maintenant', es: 'Comprar ahora', it: 'Acquista ora' },
  viewBiomarkers: { de: 'Alle Biomarker im Detail ansehen →', en: 'See detailed biomarker information →', fr: 'Voir les informations détaillées →', es: 'Ver información detallada →', it: 'Vedi informazioni dettagliate →' },
};

function t(key: string, lng: string): string {
  return T[key]?.[lng] ?? T[key]?.['en'] ?? '';
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('name, short_description')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) return {};

  const name = loc(data.name, locale);
  const description = loc(data.short_description, locale) || loc(data.short_description, 'en') || '';

  return buildMeta({ title: name, description, path: `/shop/${slug}`, locale });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductSlugPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('id, name, description, short_description, price_chf, compare_at_price_chf, product_type, is_featured, image_url, metadata')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (!product) notFound();

  // Fetch included test items for test packages / add-ons
  const isTestProduct = product.product_type === 'blood_test' || product.product_type === 'addon_test';
  type TestItem = { id: string; name: I18n; item_type: string | null };
  let testItems: TestItem[] = [];

  if (isTestProduct) {
    const { data: rows } = await supabase
      .from('product_biomarkers')
      .select('sort_order, biomarkers(id, name, item_type)')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true });

    if (rows) {
      testItems = rows
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.biomarkers)
        .filter(Boolean) as TestItem[];
    }
  }

  const lng = locale;
  const name = loc(product.name, lng);
  const shortDesc = loc(product.short_description, lng);
  const description = loc(product.description, lng);
  const markerCount = product.metadata?.marker_count;
  const featured = product.is_featured ?? false;

  const biomarkerLabel = (count: number): string => {
    const map: Record<string, string> = {
      de: `${count} Biomarker analysiert`,
      en: `${count} biomarkers analysed`,
      fr: `${count} biomarqueurs analysés`,
      es: `${count} biomarcadores analizados`,
      it: `${count} biomarcatori analizzati`,
    };
    return map[lng] ?? map['en'];
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1060px] px-8 md:px-12 pt-28 pb-20 flex-1">

        {/* Back */}
        <Link
          href="/shop"
          className="inline-flex items-center text-sm text-[#0e393d]/60 hover:text-[#0e393d] transition-colors mb-8"
        >
          {t('back', lng)}
        </Link>

        {/* Image */}
        {product.image_url && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image_url}
              alt={name}
              className="w-full max-h-[300px] object-cover"
            />
          </div>
        )}

        {/* Name + featured badge */}
        <div className="flex flex-wrap items-start gap-3 mb-3">
          <h1 className="font-serif text-4xl text-[#0e393d] flex-1 min-w-0">{name || '—'}</h1>
          {featured && (
            <span className="mt-2 shrink-0 rounded-full bg-[#ceab84] px-4 py-1 text-xs font-semibold text-[#0e393d] tracking-wide">
              {t('recommended', lng)}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-wrap items-baseline gap-3 mb-6">
          <span className="font-serif text-3xl text-[#0e393d]">
            {product.price_chf != null ? `CHF ${product.price_chf.toLocaleString('de-CH')}` : '—'}
          </span>
          {product.compare_at_price_chf != null &&
            product.compare_at_price_chf > (product.price_chf ?? 0) && (
              <span className="text-base line-through text-[#1c2a2b]/35">
                CHF {product.compare_at_price_chf.toLocaleString('de-CH')}
              </span>
            )}
          {markerCount != null && (
            <span className="rounded-full bg-[#0e393d]/8 px-3 py-1 text-xs font-medium text-[#0e393d]">
              {biomarkerLabel(markerCount)}
            </span>
          )}
        </div>

        {/* Short description */}
        {shortDesc && (
          <p className="mb-6 text-lg text-[#1c2a2b]/70 leading-relaxed">{shortDesc}</p>
        )}

        {/* Buy button */}
        <BuyButton productId={product.id} locale={locale} />

        {/* Full description */}
        {description && (
          <div className="mt-10 space-y-3 text-base text-[#1c2a2b]/65 leading-relaxed">
            {description.split('\n').map((para, i) =>
              para.trim() ? <p key={i}>{para}</p> : <br key={i} />
            )}
          </div>
        )}

        {/* Included test items */}
        {isTestProduct && testItems.length > 0 && (
          <section className="mt-14">
            <h2 className="font-serif text-2xl text-[#0e393d] mb-6">
              {t('includedTests', lng)}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {testItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-[#0e393d]/8 bg-white px-4 py-3"
                >
                  <svg
                    width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 text-[#0e393d]"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="flex-1 text-sm text-[#1c2a2b]">{loc(item.name, lng)}</span>
                  {item.item_type && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-[#1c2a2b]/30">
                      {item.item_type}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Biomarkers link */}
        <div className="mt-10">
          <Link
            href="/biomarkers"
            className="text-sm text-[#0e393d]/55 hover:text-[#0e393d] transition-colors"
          >
            {t('viewBiomarkers', lng)}
          </Link>
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
