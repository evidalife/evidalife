import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

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
  const totalErrorsWeek = (failedEmailsWeek ?? 0) + (failedPdfsWeek ?? 0);

  // Pipeline counts grouped by fulfilment_status
  const PIPELINE_KEYS = ['paid', 'voucher_sent', 'sample_collected', 'processing', 'completed'] as const;
  const pipeline: Record<string, number> = Object.fromEntries(PIPELINE_KEYS.map(k => [k, 0]));
  let pipelineTotal = 0;
  for (const o of pipelineOrders ?? []) {
    const fs = o.fulfilment_status;
    if (fs && fs in pipeline) { pipeline[fs]++; pipelineTotal++; }
  }

  // Activity feed — merge, sort, slice to 10
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
    .slice(0, 10);

  // ── Static config ────────────────────────────────────────────────────────

  const PIPELINE_CONFIG = [
    { key: 'paid',             label: 'Paid',             icon: '💳', color: 'bg-amber-400'   },
    { key: 'voucher_sent',     label: 'Voucher Sent',     icon: '📧', color: 'bg-sky-400'     },
    { key: 'sample_collected', label: 'Sample Collected', icon: '🧪', color: 'bg-violet-400'  },
    { key: 'processing',       label: 'Processing',       icon: '🔬', color: 'bg-indigo-400'  },
    { key: 'completed',        label: 'Completed',        icon: '✅', color: 'bg-emerald-400' },
  ] as const;

  const ATTENTION_ITEMS = [
    { label: 'Lab reports awaiting review',     count: labReviewCount ?? 0,      href: '/admin/lab-results',      icon: '🔬', action: 'Review' },
    { label: 'Orders paid — awaiting voucher',  count: paidOrderCount ?? 0,      href: '/admin/orders',           icon: '📦', action: 'Manage' },
    { label: 'Contact messages (7 days)',        count: contactWeekCount ?? 0,    href: '/admin/contact-messages', icon: '💬', action: 'View'   },
    { label: 'Overdue vouchers (>7 days)',       count: overdueVoucherCount ?? 0, href: '/admin/orders',           icon: '⏰', action: 'View'   },
  ];

  const ERROR_ITEMS = [
    { label: 'Email delivery failures',  count: failedEmailsWeek ?? 0, href: '/admin/communications', icon: '📧' },
    { label: 'PDF extraction failures',  count: failedPdfsWeek ?? 0,   href: '/admin/lab-results',    icon: '📄' },
  ];

  const ACTIVITY_ICON: Record<string, string> = {
    order:   '💳',
    signup:  '👤',
    lab:     '🧪',
    email:   '📧',
    contact: '💬',
  };

  const ACTIVITY_BADGE_CLS: Record<string, string> = {
    order:   'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    signup:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    lab:     'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
    email:   'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
    contact: 'bg-[#0e393d]/[0.06] text-[#0e393d] ring-1 ring-[#0e393d]/10',
  };

  const QUICK_ACTIONS = [
    { title: 'Upload Lab PDF',      desc: 'AI extraction + review',  href: '/admin/lab-results',     icon: '📄' },
    { title: 'Create Order',        desc: 'Manual order entry',      href: '/admin/orders',          icon: '📦' },
    { title: 'Send Test Email',     desc: 'Preview all templates',   href: '/admin/communications',  icon: '📧' },
    { title: 'Manage Users',        desc: 'Search + admin roles',    href: '/admin/users',           icon: '👥' },
    { title: 'Export Orders',       desc: 'CSV download',            href: '/admin/orders',          icon: '📊' },
    { title: 'Export Lab Results',  desc: 'CSV download',            href: '/admin/lab-results',     icon: '🧬' },
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
    <div>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-6">
        <h1 className="font-serif text-3xl text-[#0e393d] tracking-tight">Dashboard</h1>
        <p className="mt-1.5 text-sm text-[#1c2a2b]/45">Platform overview and operations at a glance</p>
      </div>

      <div className="px-8 space-y-6 pb-8">

        {/* ── Section 1: KPI Stat Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Users */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e393d] to-[#165c62] p-5 text-white shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/[0.04] -translate-y-8 translate-x-8" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">Users</p>
            <p className="font-serif text-3xl tracking-tight">{totalUsers ?? '—'}</p>
            <p className="mt-1.5 text-xs text-white/45">+{newUsersWeek ?? 0} this week</p>
          </div>

          {/* Revenue */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#ceab84] to-[#b8935e] p-5 text-white shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/[0.06] -translate-y-8 translate-x-8" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/55 mb-3">Revenue (month)</p>
            <p className="font-serif text-3xl tracking-tight">{formatCHF(monthRevenue)}</p>
            <p className="mt-1.5 text-xs text-white/45">{monthOrderCount} order{monthOrderCount !== 1 ? 's' : ''}</p>
          </div>

          {/* Lab Reports */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/[0.04] -translate-y-8 translate-x-8" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3">Lab Reports</p>
            <p className="font-serif text-3xl tracking-tight">{totalReports ?? '—'}</p>
            <p className="mt-1.5 text-xs text-white/45">{pendingReports ?? 0} pending review</p>
          </div>

          {/* System Health */}
          <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-sm ${
            totalErrors24h === 0
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-red-600'
          }`}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/[0.04] -translate-y-8 translate-x-8" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/55 mb-3">System Health</p>
            {totalErrors24h === 0
              ? <p className="font-serif text-3xl tracking-tight">All Clear</p>
              : <p className="font-serif text-3xl tracking-tight">{totalErrors24h} Issue{totalErrors24h !== 1 ? 's' : ''}</p>
            }
            <p className="mt-1.5 text-xs text-white/45">
              {totalErrorsWeek} error{totalErrorsWeek !== 1 ? 's' : ''} this week
            </p>
          </div>

        </div>

        {/* ── Section 2: Order Pipeline ────────────────────────────── */}
        <div className="rounded-2xl border border-[#0e393d]/8 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-[#0e393d]">Order Pipeline</h2>
              <p className="text-xs text-[#1c2a2b]/35 mt-0.5">{pipelineTotal} total orders in pipeline</p>
            </div>
            <Link href="/admin/orders" className="text-xs text-[#0e393d]/50 hover:text-[#0e393d] transition-colors">
              View all orders →
            </Link>
          </div>

          {/* Pipeline progress bar */}
          {pipelineTotal > 0 && (
            <div className="px-6 pb-4">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-[#0e393d]/[0.04]">
                {PIPELINE_CONFIG.map(({ key, color }) => {
                  const pct = pipelineTotal > 0 ? (pipeline[key] / pipelineTotal) * 100 : 0;
                  return pct > 0 ? (
                    <div key={key} className={`${color} transition-all`} style={{ width: `${pct}%` }} />
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 divide-x divide-[#0e393d]/5 border-t border-[#0e393d]/5">
            {PIPELINE_CONFIG.map(({ key, label, icon, color }) => (
              <Link
                key={key}
                href="/admin/orders"
                className="group flex flex-col items-center py-5 hover:bg-[#0e393d]/[0.02] transition-colors"
              >
                <span className="text-base mb-1">{icon}</span>
                <span className="font-serif text-2xl text-[#0e393d] tabular-nums">{pipeline[key]}</span>
                <span className="text-[10px] text-[#1c2a2b]/40 mt-1 text-center leading-tight px-2">{label}</span>
                <div className={`h-1 w-8 rounded-full ${color} mt-2.5 opacity-60`} />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 3: Attention + Errors ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Needs Attention — 2/3 width */}
          <div className="lg:col-span-2 rounded-2xl border border-[#0e393d]/8 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4">
              <h2 className="font-serif text-lg text-[#0e393d]">Needs Attention</h2>
            </div>

            <div className="divide-y divide-[#0e393d]/5">
              {ATTENTION_ITEMS.map(({ label, count, href, icon, action }) => (
                <div key={label} className="flex items-center gap-4 px-6 py-3.5 hover:bg-[#fafaf8] transition-colors">
                  <span className="text-base shrink-0">{icon}</span>
                  <span className="flex-1 text-sm text-[#1c2a2b]/75">{label}</span>
                  <span className={`min-w-[28px] text-center text-xs font-semibold px-2.5 py-1 rounded-full ${
                    count > 0
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                  }`}>
                    {count}
                  </span>
                  <Link href={href} className="text-xs font-medium text-[#0e393d]/50 hover:text-[#0e393d] transition-colors whitespace-nowrap">
                    {action} →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Errors & Failures — 1/3 width */}
          <div className="rounded-2xl border border-[#0e393d]/8 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4">
              <h2 className="font-serif text-lg text-[#0e393d]">Errors & Failures</h2>
              <p className="text-xs text-[#1c2a2b]/35 mt-0.5">Last 7 days</p>
            </div>

            <div className="px-6 pb-5 space-y-4">
              {ERROR_ITEMS.map(({ label, count, href, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-base shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#1c2a2b]/75 block">{label}</span>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#0e393d]/[0.04] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${count > 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ width: count > 0 ? `${Math.min(count * 10, 100)}%` : '100%' }}
                        />
                      </div>
                      <span className={`text-xs font-semibold tabular-nums ${count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {count}
                      </span>
                    </div>
                  </div>
                  <Link href={href} className="text-xs text-[#0e393d]/40 hover:text-[#0e393d] transition-colors shrink-0">
                    View →
                  </Link>
                </div>
              ))}

              {/* Overall status indicator */}
              <div className={`mt-2 rounded-xl p-3 text-center text-xs font-medium ${
                totalErrorsWeek === 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {totalErrorsWeek === 0 ? '✓ No failures this week' : `${totalErrorsWeek} total failure${totalErrorsWeek !== 1 ? 's' : ''} this week`}
              </div>
            </div>
          </div>

        </div>

        {/* ── Section 4: Quick Actions ─────────────────────────────── */}
        <div className="rounded-2xl border border-[#0e393d]/8 bg-white shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4">
            <h2 className="font-serif text-lg text-[#0e393d]">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#0e393d]/5 border-t border-[#0e393d]/5">
            {QUICK_ACTIONS.map(({ title, desc, href, icon }) => (
              <Link
                key={title}
                href={href}
                className="group bg-white hover:bg-[#0e393d]/[0.02] transition-colors p-5 flex items-start gap-3"
              >
                <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-[#0e393d] group-hover:text-[#0e393d] mb-0.5">{title}</p>
                  <p className="text-xs text-[#1c2a2b]/35">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 5: Activity Feed + Platform Monitoring ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recent Activity */}
          <div className="rounded-2xl border border-[#0e393d]/8 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4">
              <h2 className="font-serif text-lg text-[#0e393d]">Recent Activity</h2>
            </div>
            {activity.length === 0 ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-[#1c2a2b]/30">No recent activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#0e393d]/5">
                {activity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-[#fafaf8] transition-colors">
                    <span className="text-sm shrink-0">{ACTIVITY_ICON[item.type]}</span>
                    <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${ACTIVITY_BADGE_CLS[item.type]}`}>
                      {item.type}
                    </span>
                    <span className="flex-1 text-[13px] text-[#1c2a2b]/70 leading-snug min-w-0 truncate">{item.label}</span>
                    <span className="shrink-0 text-[11px] text-[#1c2a2b]/25 tabular-nums whitespace-nowrap">{relativeTime(item.ts)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Monitoring */}
          <div className="rounded-2xl border border-[#0e393d]/8 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4">
              <h2 className="font-serif text-lg text-[#0e393d]">Platform Monitoring</h2>
            </div>
            <div className="px-3 pb-3 space-y-0.5">
              {MONITORING_LINKS.map(({ abbr, name, desc, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3.5 px-3 py-3 rounded-xl hover:bg-[#0e393d]/[0.03] transition-colors group"
                >
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#0e393d]/10 to-[#0e393d]/[0.04] flex items-center justify-center text-[10px] font-bold tracking-wide text-[#0e393d]">
                    {abbr}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-[#1c2a2b] group-hover:text-[#0e393d] transition-colors">{name}</span>
                    <span className="block text-[11px] text-[#1c2a2b]/35 leading-tight">{desc}</span>
                  </span>
                  <span className="shrink-0 text-[#1c2a2b]/20 group-hover:text-[#0e393d] transition-colors text-sm">↗</span>
                </a>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
