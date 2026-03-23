import { getLocale } from 'next-intl/server';
import { redirect, Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata = { title: 'Meine Bestellungen – Evida Life' };

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

const T: Record<Lang, {
  title: string;
  empty: string;
  browseShop: string;
  order: string;
  date: string;
  status: string;
  total: string;
  items: string;
  downloadInvoice: string;
  statusLabels: Record<string, string>;
}> = {
  de: {
    title: 'Meine Bestellungen',
    empty: 'Du hast noch keine Bestellungen.',
    browseShop: '→ Zum Shop',
    order: 'Bestellung',
    date: 'Datum',
    status: 'Status',
    total: 'Gesamt',
    items: 'Artikel',
    downloadInvoice: 'Rechnung herunterladen',
    statusLabels: { paid: 'Bezahlt', pending: 'Ausstehend', failed: 'Fehlgeschlagen', refunded: 'Erstattet' },
  },
  en: {
    title: 'My Orders',
    empty: 'You have no orders yet.',
    browseShop: '→ Browse Shop',
    order: 'Order',
    date: 'Date',
    status: 'Status',
    total: 'Total',
    items: 'Items',
    downloadInvoice: 'Download Invoice',
    statusLabels: { paid: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' },
  },
  fr: {
    title: 'Mes commandes',
    empty: 'Vous n\'avez pas encore de commandes.',
    browseShop: '→ Voir la boutique',
    order: 'Commande',
    date: 'Date',
    status: 'Statut',
    total: 'Total',
    items: 'Articles',
    downloadInvoice: 'Télécharger la facture',
    statusLabels: { paid: 'Payé', pending: 'En attente', failed: 'Échoué', refunded: 'Remboursé' },
  },
  es: {
    title: 'Mis pedidos',
    empty: 'Aún no tienes pedidos.',
    browseShop: '→ Ver la tienda',
    order: 'Pedido',
    date: 'Fecha',
    status: 'Estado',
    total: 'Total',
    items: 'Artículos',
    downloadInvoice: 'Descargar factura',
    statusLabels: { paid: 'Pagado', pending: 'Pendiente', failed: 'Fallido', refunded: 'Reembolsado' },
  },
  it: {
    title: 'I miei ordini',
    empty: 'Non hai ancora nessun ordine.',
    browseShop: '→ Visita il negozio',
    order: 'Ordine',
    date: 'Data',
    status: 'Stato',
    total: 'Totale',
    items: 'Articoli',
    downloadInvoice: 'Scarica fattura',
    statusLabels: { paid: 'Pagato', pending: 'In attesa', failed: 'Fallito', refunded: 'Rimborsato' },
  },
};

type OrderItem = {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  currency: string;
  product_name: string | null;
  product_sku: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  currency: string;
  total_amount: number;
  paid_at: string | null;
  created_at: string;
  order_items: OrderItem[];
  invoices: Invoice[];
};

function statusBadge(status: string, labels: Record<string, string>) {
  const colors: Record<string, string> = {
    paid:     'bg-emerald-100 text-emerald-700',
    pending:  'bg-amber-100 text-amber-700',
    failed:   'bg-red-100 text-red-700',
    refunded: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-CH' : lang === 'it' ? 'it-CH' : lang === 'es' ? 'es-ES' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function OrdersPage() {
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const t = T[lang];

  // Auth check
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    redirect({ href: '/login?redirectTo=/orders', locale });
  }

  // Fetch orders via admin client (avoids RLS issues), filtered by user_id
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from('orders')
    .select('id, order_number, status, currency, total_amount, paid_at, created_at, order_items(*), invoices(id, invoice_number)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false });

  const typedOrders = (orders ?? []) as Order[];

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="mx-auto w-full max-w-3xl px-6 pt-28 pb-20 flex-1">
        <h1 className="font-serif text-4xl text-[#0e393d] mb-10">{t.title}</h1>

        {typedOrders.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[#1c2a2b]/50 text-base mb-6">{t.empty}</p>
            <Link
              href="/shop"
              className="inline-block bg-[#0e393d] text-[#f2ebdb] text-sm font-medium px-6 py-3 rounded-full hover:bg-[#1a5055] transition-colors"
            >
              {t.browseShop}
            </Link>
          </div>
        )}

        <div className="space-y-6">
          {typedOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl bg-white shadow-sm ring-1 ring-[#0e393d]/8 overflow-hidden"
            >
              {/* Order header */}
              <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-[#0e393d]/8 bg-[#0e393d]/2">
                <span className="font-medium text-[#0e393d] text-sm">{order.order_number}</span>
                <span className="text-[#1c2a2b]/40 text-xs">
                  {formatDate(order.paid_at ?? order.created_at, lang)}
                </span>
                <span className="ml-auto">{statusBadge(order.status, t.statusLabels)}</span>
                <span className="font-serif text-base font-medium text-[#0e393d]">
                  {chf(order.total_amount)}
                </span>
              </div>

              {/* Order items */}
              <div className="px-6 py-4 space-y-2">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#1c2a2b]">
                      {item.product_name ?? item.product_id ?? '—'}
                      {item.quantity > 1 && (
                        <span className="ml-1.5 text-[#1c2a2b]/45">×{item.quantity}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[#1c2a2b]/60">{chf(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Invoice download */}
              {order.invoices.length > 0 && (
                <div className="px-6 pb-4">
                  <a
                    href={`/api/invoices/${order.id}/pdf`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#0e393d]/60 hover:text-[#0e393d] transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {t.downloadInvoice} — {order.invoices[0].invoice_number}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
