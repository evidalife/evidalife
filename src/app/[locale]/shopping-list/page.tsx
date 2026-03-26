import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import ShoppingListView, { type ShoppingList, type ShoppingListItem } from '@/components/ShoppingListView';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

// TODO: migrate hero image to Supabase Storage
const HERO_IMG = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'de' ? 'de' : 'en';
  return buildMeta({ ...PAGE_META.shoppingList[lang], path: '/shopping-list', locale: lang });
}

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

interface Feature { emoji: string; title: string; desc: string }

const T: Record<Lang, {
  tag: string;
  h1: string;
  sub: string;
  featuresHeading: string;
  features: Feature[];
  ctaHeading: string;
  ctaBody: string;
  ctaSignup: string;
  ctaLogin: string;
}> = {
  de: {
    tag: 'EINKAUFSLISTE',
    h1: 'Plane deinen pflanzlichen Wocheneinkauf',
    sub: 'Füge Rezeptzutaten mit einem Klick hinzu, ergänze eigene Artikel und hake alles im Supermarkt ab — deine persönliche Einkaufsliste, synchronisiert über alle Geräte.',
    featuresHeading: 'Was du bekommst',
    features: [
      { emoji: '🍽️', title: 'Aus Rezepten befüllen', desc: 'Klicke auf einem Rezept auf "Zur Einkaufsliste" — alle Zutaten werden sofort übernommen, Mengen skaliert.' },
      { emoji: '✅', title: 'Daily Dozen integriert', desc: 'Füge Daily-Dozen-Kategorien direkt hinzu und stelle sicher, dass du alle 12 Gruppen im Wocheneinkauf hast.' },
      { emoji: '🔄', title: 'Intelligente Duplikat-Erkennung', desc: 'Gleiche Zutaten aus verschiedenen Rezepten werden zusammengefasst — keine doppelten Einträge.' },
      { emoji: '📱', title: 'Alle Geräte', desc: 'Deine Liste ist auf allen Geräten verfügbar. Öffne sie im Supermarkt auf dem Handy, plane am Desktop.' },
    ],
    ctaHeading: 'Kostenlos starten',
    ctaBody: 'Erstelle dein Konto und beginne mit deiner ersten Einkaufsliste.',
    ctaSignup: 'Konto erstellen',
    ctaLogin: 'Bereits Mitglied? Anmelden',
  },
  en: {
    tag: 'SHOPPING LIST',
    h1: 'Plan your plant-based week',
    sub: 'Add recipe ingredients with one click, add your own items, and check everything off at the supermarket — your personal shopping list, synced across all devices.',
    featuresHeading: 'What you get',
    features: [
      { emoji: '🍽️', title: 'Fill from recipes', desc: 'Click "Add to shopping list" on any recipe — all ingredients are instantly added, quantities scaled.' },
      { emoji: '✅', title: 'Daily Dozen integration', desc: 'Add Daily Dozen categories directly and make sure you have all 12 groups in your weekly shop.' },
      { emoji: '🔄', title: 'Smart deduplication', desc: 'Same ingredients from different recipes are merged — no duplicate entries.' },
      { emoji: '📱', title: 'All devices', desc: 'Your list is available on all devices. Open it in the supermarket on your phone, plan on the desktop.' },
    ],
    ctaHeading: 'Start for free',
    ctaBody: 'Create your account and start your first shopping list.',
    ctaSignup: 'Create account',
    ctaLogin: 'Already a member? Sign in',
  },
  fr: {
    tag: 'LISTE DE COURSES',
    h1: 'Planifiez votre semaine végétale',
    sub: 'Ajoutez des ingrédients de recettes en un clic, ajoutez vos propres articles et cochez tout au supermarché — votre liste de courses personnelle, synchronisée sur tous vos appareils.',
    featuresHeading: 'Ce que vous obtenez',
    features: [
      { emoji: '🍽️', title: 'Remplir depuis les recettes', desc: 'Cliquez sur "Ajouter à la liste" sur n\'importe quelle recette — tous les ingrédients sont instantanément ajoutés.' },
      { emoji: '✅', title: 'Intégration Daily Dozen', desc: 'Ajoutez directement les catégories Daily Dozen et assurez-vous d\'avoir les 12 groupes dans vos achats.' },
      { emoji: '🔄', title: 'Déduplication intelligente', desc: 'Les mêmes ingrédients de différentes recettes sont fusionnés — pas de doublons.' },
      { emoji: '📱', title: 'Tous les appareils', desc: 'Votre liste est disponible sur tous vos appareils. Ouvrez-la au supermarché sur votre téléphone.' },
    ],
    ctaHeading: 'Commencez gratuitement',
    ctaBody: 'Créez votre compte et commencez votre première liste de courses.',
    ctaSignup: 'Créer un compte',
    ctaLogin: 'Déjà membre? Se connecter',
  },
  es: {
    tag: 'LISTA DE COMPRAS',
    h1: 'Planifica tu semana plant-based',
    sub: 'Agrega ingredientes de recetas con un clic, añade tus propios artículos y marca todo en el supermercado — tu lista de compras personal, sincronizada en todos los dispositivos.',
    featuresHeading: 'Qué obtienes',
    features: [
      { emoji: '🍽️', title: 'Llenar desde recetas', desc: 'Haz clic en "Agregar a la lista" en cualquier receta — todos los ingredientes se agregan instantáneamente.' },
      { emoji: '✅', title: 'Integración Daily Dozen', desc: 'Agrega categorías del Daily Dozen directamente y asegúrate de tener los 12 grupos en tu compra semanal.' },
      { emoji: '🔄', title: 'Deduplicación inteligente', desc: 'Los mismos ingredientes de diferentes recetas se combinan — sin entradas duplicadas.' },
      { emoji: '📱', title: 'Todos los dispositivos', desc: 'Tu lista está disponible en todos los dispositivos. Ábrela en el supermercado en tu teléfono.' },
    ],
    ctaHeading: 'Empieza gratis',
    ctaBody: 'Crea tu cuenta y comienza tu primera lista de compras.',
    ctaSignup: 'Crear cuenta',
    ctaLogin: '¿Ya eres miembro? Iniciar sesión',
  },
  it: {
    tag: 'LISTA DELLA SPESA',
    h1: 'Pianifica la tua settimana plant-based',
    sub: 'Aggiungi ingredienti di ricette con un clic, aggiungi i tuoi articoli e spunta tutto al supermercato — la tua lista della spesa personale, sincronizzata su tutti i dispositivi.',
    featuresHeading: 'Cosa ottieni',
    features: [
      { emoji: '🍽️', title: 'Riempire dalle ricette', desc: 'Clicca su "Aggiungi alla lista" su qualsiasi ricetta — tutti gli ingredienti vengono aggiunti istantaneamente.' },
      { emoji: '✅', title: 'Integrazione Daily Dozen', desc: 'Aggiungi direttamente le categorie Daily Dozen e assicurati di avere tutti i 12 gruppi nella tua spesa.' },
      { emoji: '🔄', title: 'Deduplicazione intelligente', desc: 'Gli stessi ingredienti da ricette diverse vengono uniti — nessuna voce duplicata.' },
      { emoji: '📱', title: 'Tutti i dispositivi', desc: 'La tua lista è disponibile su tutti i dispositivi. Aprila al supermercato sul telefono.' },
    ],
    ctaHeading: 'Inizia gratuitamente',
    ctaBody: 'Crea il tuo account e inizia la tua prima lista della spesa.',
    ctaSignup: 'Crea account',
    ctaLogin: 'Già membro? Accedi',
  },
};

function PublicIntro({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative h-[72vh] min-h-[480px] flex items-end">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16 w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.tag}</p>
          <h1 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-4">{t.h1}</h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl">{t.sub}</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16 w-full">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-8">{t.featuresHeading}</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {t.features.map((f) => (
            <div key={f.title} className="bg-white border border-[#1c2a2b]/10 rounded-2xl p-6 flex gap-4">
              <span className="text-2xl shrink-0">{f.emoji}</span>
              <div>
                <h3 className="font-medium text-[#0e393d] mb-1">{f.title}</h3>
                <p className="text-[#1c2a2b]/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0e393d] py-20 mt-auto">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl text-white mb-3">{t.ctaHeading}</h2>
          <p className="text-white/70 text-sm leading-relaxed mb-7">{t.ctaBody}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/signup"
              className="inline-block bg-[#ceab84] text-[#0e393d] text-sm font-semibold px-8 py-3.5 rounded-full hover:bg-[#d4b98e] transition-colors"
            >
              {t.ctaSignup}
            </Link>
            <Link
              href="/login"
              className="text-white/70 text-sm hover:text-white transition-colors underline underline-offset-2"
            >
              {t.ctaLogin}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function ShoppingListPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const supabase = await createClient();

  const params = await searchParams;
  const viewInfo = params.view === 'info';

  const { data: { user } } = await supabase.auth.getUser();

  // Logged-out users, or logged-in users requesting the info view, get the public intro page
  if (!user || viewInfo) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col">
        <PublicNav />
        <PublicIntro lang={lang} />
        <PublicFooter />
      </div>
    );
  }

  // Logged-in users get the interactive shopping list
  let list: ShoppingList | null = null;
  let items: ShoppingListItem[] = [];

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

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />
      <ShoppingListView
        lang={lang}
        initialList={list}
        initialItems={items}
        userId={user.id}
      />
      <PublicFooter />
    </div>
  );
}
