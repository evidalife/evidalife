import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import PageShell from '@/components/admin/PageShell';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCHF(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);
  if (diffMin < 2)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH   < 24) return `${diffH}h ago`;
  if (diffD   === 1) return 'yesterday';
  if (diffD   < 7)  return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ActivityItem = {
  type: 'order' | 'signup' | 'lab' | 'email' | 'contact';
  label: string;
  ts: string;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const now       = new Date();
  const weekAgo   = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const dayAgo    = new Date(now.getTime() - 86_400_000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── All queries in parallel ──────────────────────────────────────────────

  const [
    { count: totalUsers },
    { count: newUsersWeek },
    { data: monthOrders },
    { count: totalReports },
    { count: pendingReports },
    { count: failedEmailsDay },
    { count: failedPdfsDay },
    { data: pipelineOrders },
    { count: labReviewCount },
    { count: paidOrderCount },
    { count: contactWeekCount },
    { count: overdueVoucherCount },
    { count: failedEmailsWeek },
    { count: failedPdfsWeek },
    { data: recentOrders },
    { data: recentSignups },
    { data: recentReports },
    { data: recentEmails },
    { data: recentContacts },
  ] = await Promise.all([
    // KPI — users total
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    // KPI — users new this week
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    // KPI — revenue this month (paid orders)
    supabase.from('orders').select('total_amount').eq('status', 'paid').gte('created_at', monthStart),
    // KPI — total lab reports
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }),
    // KPI — lab reports pending review
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }).in('status', ['ai_extracted', 'review_pending']),
    // KPI — failed emails last 24h
    supabase.from('email_log').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('sent_at', dayAgo),
    // KPI — failed PDF extractions last 24h
    supabase.from('lab_pdf_uploads').select('*', { count: 'exact', head: true }).in('extraction_status', ['failed', 'error']).gte('created_at', dayAgo),
    // Pipeline — all orders with a fulfilment_status
    supabase.from('orders').select('fulfilment_status').not('fulfilment_status', 'is', null),
    // Attention — lab reports awaiting review
    supabase.from('lab_reports').select('*', { count: 'exact', head: true }).in('status', ['ai_extracted', 'review_pending']),
    // Attention — orders paid but not yet voucher_sent
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('fulfilment_status', 'paid'),
    // Attention — contact messages in last 7 days
    supabase.from('contact_messages').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    // Attention — overdue vouchers (sent > 7 days ago, not yet collected)
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('fulfilment_status', 'voucher_sent').lt('updated_at', weekAgo),
    // Errors — failed emails last 7 days
    supabase.from('email_log').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('sent_at', weekAgo),
    // Errors — failed PDF extractions last 7 days
    supabase.from('lab_pdf_uploads').select('*', { count: 'exact', head: true }).in('extraction_status', ['failed', 'error']).gte('created_at', weekAgo),
    // Activity — recent orders
    supabase.from('orders').select('id, order_number, total_amount, created_at').order('created_at', { ascending: false }).limit(5),
    // Activity — recent signups
    supabase.from('profiles').select('email, first_name, created_at').order('created_at', { ascending: false }).limit(5),
    // Activity — recent lab reports
    supabase.from('lab_reports').select('report_number, status, created_at').order('created_at', { ascending: false }).limit(5),
    // Activity — recent emails (sent_at is the timestamp, not created_at)
    supabase.from('email_log').select('template, email_address, sent_at').order('sent_at', { ascending: false }).limit(5),
    // Activity — recent contact messages
    supabase.from('contact_messages').select('email, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  // ── Derived values ───────────────────────────────────────────────────────

  const monthRevenue    = (monthOrders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0);
  const monthOrderCount = (monthOrders ?? []).length;
  const totalErrors24h  = (failedEmailsDay ?? 0) + (failedPdfsDay ?? 0);

  // Pipeline counts grouped by fulfilment_status
  const PIPELINE_KEYS = ['paid', 'voucher_sent', 'sample_collected', 'processing', 'completed'] as const;
  const pipeline: Record<string, number> = Object.fromEntries(PIPELINE_KEYS.map(k => [k, 0]));
  for (const o of pipelineOrders ?? []) {
    const fs = o.fulfilment_status;
    if (fs && fs in pipeline) pipeline[fs]++;
  }

  // Activity feed — merge, sort, slice to 8
  const activity: ActivityItem[] = [
    ...(recentOrders ?? []).map(o => ({
      type:  'order' as const,
      label: `Order ${o.order_number ?? o.id.slice(0, 8)} — ${formatCHF(o.total_amount ?? 0)}`,
      ts:    o.created_at,
    })),
    ...(recentSignups ?? []).map(p => ({
      type:  'signup' as const,
      label: `New user: ${p.first_name ?? p.email ?? 'Unknown'}`,
      ts:    p.created_at,
    })),
    ...(recentReports ?? []).map(r => ({
      type:  'lab' as const,
      label: `Lab report ${r.report_number ?? '—'} (${r.status ?? '—'})`,
      ts:    r.created_at,
    })),
    ...(recentEmails ?? []).map(e => ({
      type:  'email' as const,
      label: `${e.template} → ${e.email_address}`,
      ts:    e.sent_at,
    })),
    ...(recentContacts ?? []).map(c => ({
      type:  'contact' as const,
      label: `Contact from ${c.email ?? 'unknown'}`,
      ts:    c.created_at,
    })),
  ]
    .filter(a => !!a.ts)
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 8);

  // ── Static config ────────────────────────────────────────────────────────

  const PIPELINE_CONFIG = [
    { key: 'paid',             label: 'Paid',             bar: 'bg-amber-400'   },
    { key: 'voucher_sent',     label: 'Voucher sent',     bar: 'bg-sky-400'     },
    { key: 'sample_collected', label: 'Sample collected', bar: 'bg-violet-400'  },
    { key: 'processing',       label: 'Processing',       bar: 'bg-indigo-400'  },
    { key: 'completed',        label: 'Completed',        bar: 'bg-emerald-400' },
  ] as const;

  const ATTENTION_ITEMS = [
    { label: 'Lab reports awaiting review',     count: labReviewCount ?? 0,      href: '/admin/lab-results',      action: 'Review' },
    { label: 'Orders paid — awaiting voucher',  count: paidOrderCount ?? 0,      href: '/admin/orders',           action: 'Manage' },
    { label: 'Contact messages (last 7 days)',  count: contactWeekCount ?? 0,    href: '/admin/contact-messages', action: 'View'   },
    { label: 'Overdue vouchers (>7 days)',      count: overdueVoucherCount ?? 0, href: '/admin/orders',           action: 'View'   },
  ];

  const ERROR_ITEMS = [
    { label: 'Email delivery',  count: failedEmailsWeek ?? 0, href: '/admin/communications' },
    { label: 'PDF extractions', count: failedPdfsWeek ?? 0,  href: '/admin/lab-results'    },
  ];

  const ACTIVITY_BADGE: Record<string, string> = {
    order:   'bg-amber-50   text-amber-700',
    signup:  'bg-emerald-50 text-emerald-700',
    lab:     'bg-sky-50     text-sky-700',
    email:   'bg-violet-50  text-violet-700',
    contact: 'bg-[#0e393d]/8 text-[#0e393d]',
  };

  const QUICK_ACTIONS = [
    { title: 'Upload Lab PDF',      desc: 'AI extraction + review', href: '/admin/lab-results'     },
    { title: 'Create Order',        desc: 'Manual order entry',     href: '/admin/orders'           },
    { title: 'Send Test Email',     desc: 'Preview all templates',  href: '/admin/communications'   },
    { title: 'Manage Users',        desc: 'Search + admin roles',   href: '/admin/users'            },
    { title: 'Export Orders',       desc: 'CSV download',           href: '/admin/orders'           },
    { title: 'Export Lab Results',  desc: 'CSV download',           href: '/admin/lab-results'      },
  ];

  const MONITORING_LINKS = [
    { abbr: 'V',  name: 'Vercel Analytics',        desc: 'Page speed, web vitals, traffic',    href: 'https://vercel.com/evidalifes-projects/evidalife/analytics' },
    { abbr: 'S',  name: 'Supabase Dashboard',      desc: 'DB performance, API latency',        href: 'https://supabase.com/dashboard/project/rwbmdxgcjgidalcoeppp' },
    { abbr: 'St', name: 'Stripe Dashboard',        desc: 'Payments, payouts, disputes',        href: 'https://dashboard.stripe.com' },
    { abbr: 'R',  name: 'Resend Dashboard',        desc: 'Email delivery rates, bounces',      href: 'https://resend.com' },
    { abbr: 'G',  name: 'Google Search Console',   desc: 'SEO, indexing, search performance',  href: 'https://search.google.com/search-console' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageShell title="Dashboard" description="Platform overview">
      <div className="space-y-6">

        {/* ── Section 1: KPI Strip ────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Users */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-5">
            <p className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-widest mb-2">Users</p>
            <p className="font-serif text-3xl text-[#0e393d]">{totalUsers ?? '—'}</p>
            <p className="mt-1 text-xs text-[#1c2a2b]/50">+{newUsersWeek ?? 0} this week</p>
          </div>

          {/* Revenue */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-5">
            <p className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-widest mb-2">Revenue (this month)</p>
            <p className="font-serif text-3xl text-[#0e393d]">{formatCHF(monthRevenue)}</p>
            <p className="mt-1 text-xs text-[#1c2a2b]/50">{monthOrderCount} order{monthOrderCount !== 1 ? 's' : ''}</p>
          </div>

          {/* Lab Reports */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-5">
            <p className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-widest mb-2">Lab Reports</p>
            <p className="font-serif text-3xl text-[#0e393d]">{totalReports ?? '—'}</p>
            <p className="mt-1 text-xs text-[#1c2a2b]/50">{pendingReports ?? 0} pending review</p>
          </div>

          {/* System Health */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white px-6 py-5">
            <p className="text-[10px] text-[#1c2a2b]/40 uppercase tracking-widest mb-2">System Health</p>
            {totalErrors24h === 0
              ? <p className="font-serif text-3xl text-emerald-600">OK</p>
              : <p className="font-serif text-3xl text-red-600">{totalErrors24h} issue{totalErrors24h !== 1 ? 's' : ''}</p>
            }
            <p className="mt-1 text-xs text-[#1c2a2b]/50">
              {totalErrors24h === 0 ? '0 errors (24h)' : `${totalErrors24h} error${totalErrors24h !== 1 ? 's' : ''} (24h)`}
            </p>
          </div>

        </div>

        {/* ── Section 2: Order Pipeline ────────────────────────────────── */}
        <div className="rounded-xl border border-[#0e393d]/10 bg-white p-6">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#1c2a2b]/40 mb-5">Order Pipeline</h2>
          <div className="grid grid-cols-5 gap-3">
            {PIPELINE_CONFIG.map(({ key, label, bar }) => (
              <Link
                key={key}
                href="/admin/orders"
                className="group flex flex-col items-center rounded-lg border border-[#0e393d]/8 hover:border-[#0e393d]/20 transition-colors overflow-hidden"
              >
                <div className="w-full py-4 flex flex-col items-center gap-1">
                  <span className="font-serif text-2xl text-[#0e393d]">{pipeline[key]}</span>
                  <span className="text-[11px] text-[#1c2a2b]/50 text-center leading-tight px-1">{label}</span>
                </div>
                <div className={`h-1 w-full ${bar}`} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 3: Needs Attention + Errors ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Needs Attention */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white p-6">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#1c2a2b]/40 mb-5">Needs Attention</h2>
            <div className="space-y-3">
              {ATTENTION_ITEMS.map(({ label, count, href, action }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-[#1c2a2b]/80">{label}</span>
                  <span className={`min-w-[28px] text-center text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${
                    count > 0
                      ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  }`}>
                    {count}
                  </span>
                  <Link href={href} className="text-xs text-[#0e393d]/60 hover:text-[#0e393d] transition-colors whitespace-nowrap">
                    {action} →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Errors & Failures */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white p-6">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#1c2a2b]/40 mb-5">
              Errors &amp; Failures <span className="normal-case text-[#1c2a2b]/30">(last 7 days)</span>
            </h2>
            <div className="space-y-3">
              {ERROR_ITEMS.map(({ label, count, href }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${count > 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="flex-1 text-sm text-[#1c2a2b]/80">{label}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap ${
                    count > 0
                      ? 'bg-red-50 text-red-700 ring-red-600/20'
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  }`}>
                    {count} failed
                  </span>
                  <Link href={href} className="text-xs text-[#0e393d]/60 hover:text-[#0e393d] transition-colors whitespace-nowrap">
                    View →
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── Section 4: Quick Actions ─────────────────────────────────── */}
        <div className="rounded-xl border border-[#0e393d]/10 bg-white p-6">
          <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#1c2a2b]/40 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map(({ title, desc, href }) => (
              <Link
                key={title}
                href={href}
                className="group rounded-lg border border-[#0e393d]/8 hover:border-[#0e393d]/20 hover:bg-[#0e393d]/[0.02] transition-colors p-4"
              >
                <p className="text-sm font-medium text-[#0e393d] mb-0.5">{title}</p>
                <p className="text-xs text-[#1c2a2b]/40">{desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 5: Activity Feed + Platform Monitoring ───────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent Activity */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white p-6">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#1c2a2b]/40 mb-5">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-[#1c2a2b]/30">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className={`shrink-0 mt-px text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${ACTIVITY_BADGE[item.type]}`}>
                      {item.type}
                    </span>
                    <span className="flex-1 text-sm text-[#1c2a2b]/80 leading-snug min-w-0 break-words">{item.label}</span>
                    <span className="shrink-0 text-xs text-[#1c2a2b]/30 whitespace-nowrap">{relativeTime(item.ts)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Monitoring */}
          <div className="rounded-xl border border-[#0e393d]/10 bg-white p-6">
            <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#1c2a2b]/40 mb-5">Platform Monitoring</h2>
            <div className="space-y-1">
              {MONITORING_LINKS.map(({ abbr, name, desc, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#0e393d]/[0.04] transition-colors group"
                >
                  <span className="shrink-0 w-7 h-7 rounded-md bg-[#0e393d]/8 flex items-center justify-center text-[9px] font-bold tracking-wide text-[#0e393d]">
                    {abbr}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[#1c2a2b] group-hover:text-[#0e393d] transition-colors">{name}</span>
                    <span className="block text-xs text-[#1c2a2b]/40 leading-tight">{desc}</span>
                  </span>
                  <span className="shrink-0 text-[#1c2a2b]/25 group-hover:text-[#0e393d] transition-colors">↗</span>
                </a>
              ))}
            </div>
          </div>

        </div>

      </div>
    </PageShell>
  );
}
