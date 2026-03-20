'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  onboarding_completed: boolean | null;
  created_at: string;
  updated_at: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  street_address: string | null;
  postal_code: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(p: Profile): string {
  if (p.display_name) return p.display_name;
  const parts = [p.first_name, p.last_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return '';
}

function getInitials(p: Profile): string {
  const name = getDisplayName(p);
  if (name) return name.charAt(0).toUpperCase();
  if (p.email) return p.email.charAt(0).toUpperCase();
  return '?';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-[#0e393d]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function Badge({ color, children }: { color: 'green' | 'gray' | 'teal' | 'red'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray:  'bg-gray-50 text-gray-600 ring-gray-500/20',
    teal:  'bg-[#0e393d]/8 text-[#0e393d] ring-[#0e393d]/20',
    red:   'bg-red-50 text-red-700 ring-red-600/20',
  }[color];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

function UserAvatar({ profile }: { profile: Profile }) {
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className="w-8 h-8 rounded-full object-cover border border-[#0e393d]/10 shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 bg-[#0e393d]">
      {getInitials(profile)}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 text-[#0e393d]/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-[#1c2a2b]/40 mb-0.5">{label}</dt>
      <dd className="text-sm text-[#1c2a2b]">{value || <span className="text-[#1c2a2b]/30">—</span>}</dd>
    </div>
  );
}

function UserDetail({ profile }: { profile: Profile }) {
  return (
    <tr className="bg-[#f5f4f0]/60 border-b border-[#0e393d]/8">
      <td colSpan={6} className="px-6 py-5">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
          <DetailRow label="Display name"  value={profile.display_name} />
          <DetailRow label="First name"    value={profile.first_name} />
          <DetailRow label="Last name"     value={profile.last_name} />
          <DetailRow label="Email"         value={profile.email} />
          <DetailRow label="Phone"         value={profile.phone} />
          <DetailRow label="Date of birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
          <DetailRow label="Sex"           value={profile.sex} />
          <DetailRow label="Height (cm)"   value={profile.height_cm != null ? String(profile.height_cm) : null} />
          <DetailRow label="Country"       value={profile.country} />
          <DetailRow label="City"          value={profile.city} />
          <DetailRow label="Postal code"   value={profile.postal_code} />
          <DetailRow label="Street"        value={profile.street_address} />
          <DetailRow label="Joined"        value={formatDate(profile.created_at)} />
          <DetailRow label="Last updated"  value={formatDate(profile.updated_at)} />
          <DetailRow label="Onboarding"    value={profile.onboarding_completed ? 'Completed' : 'Not completed'} />
        </dl>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type FilterType = 'all' | 'admins' | 'regular';

export default function UsersManager({ initialProfiles }: { initialProfiles: Profile[] }) {
  const supabase = createClient();

  const [profiles, setProfiles]     = useState<Profile[]>(initialProfiles);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState<FilterType>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  // ── Data refresh ────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, display_name, avatar_url, is_admin, onboarding_completed, created_at, updated_at, phone, country, city, date_of_birth, sex, height_cm, street_address, postal_code')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setProfiles(data);
  }, [supabase]);

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = profiles.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        p.email?.toLowerCase().includes(q) ||
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.display_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filter === 'admins' && !p.is_admin) return false;
    if (filter === 'regular' && p.is_admin) return false;
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const totalUsers  = profiles.length;
  const adminCount  = profiles.filter((p) => p.is_admin).length;
  const memberCount = profiles.filter((p) => !p.is_admin).length;

  // ── Admin toggle ─────────────────────────────────────────────────────────────

  const toggleAdmin = (profile: Profile) => {
    setUpdatingId(profile.id);
    supabase
      .from('profiles')
      .update({ is_admin: !profile.is_admin })
      .eq('id', profile.id)
      .then(() => refresh().finally(() => setUpdatingId(null)));
  };

  // ── Delete user ───────────────────────────────────────────────────────────────

  const deleteUser = async (userId: string) => {
    setDeletingId(userId);
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      if (expandedId === userId) setExpandedId(null);
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#0e393d]">Users</h1>
        <p className="mt-0.5 text-sm text-[#1c2a2b]/50">View registered users and manage account details.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total users', value: totalUsers },
          { label: 'Admins',      value: adminCount  },
          { label: 'Members',     value: memberCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4">
            <p className="text-2xl font-semibold text-[#0e393d] tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-[#1c2a2b]/50">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter pills */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#0e393d]/15 bg-white px-3 py-2 text-sm placeholder:text-[#1c2a2b]/30 focus:border-[#0e393d]/40 focus:outline-none focus:ring-2 focus:ring-[#0e393d]/10 transition"
        />
        <div className="flex gap-1.5">
          {([
            { key: 'all',     label: 'All'          },
            { key: 'admins',  label: 'Admins'       },
            { key: 'regular', label: 'Regular users' },
          ] as { key: FilterType; label: string }[]).map((p) => (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === p.key
                  ? 'bg-[#0e393d] text-white'
                  : 'bg-[#0e393d]/8 text-[#0e393d]/70 hover:bg-[#0e393d]/15'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#0e393d]/10 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#0e393d]/8 bg-[#0e393d]/3">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Admin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">Last updated</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((profile) => {
              const isExpanded = expandedId === profile.id;
              const isConfirming = confirmId === profile.id;
              const isDeleting = deletingId === profile.id;
              const displayName = getDisplayName(profile);

              return (
                <>
                  <tr
                    key={profile.id}
                    onClick={() => setExpandedId(isExpanded ? null : profile.id)}
                    className="hover:bg-[#fafaf8] transition-colors cursor-pointer"
                  >
                    {/* User: avatar + name + email */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar profile={profile} />
                        <div>
                          {displayName ? (
                            <>
                              <div className="font-medium text-[#0e393d]">{displayName}</div>
                              <div className="text-xs text-[#1c2a2b]/50 mt-0.5">{profile.email ?? '—'}</div>
                            </>
                          ) : (
                            <div className="font-medium text-[#0e393d]">{profile.email ?? '—'}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      {profile.is_admin
                        ? <Badge color="teal">Admin</Badge>
                        : <Badge color="gray">Member</Badge>
                      }
                    </td>

                    {/* Admin toggle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Toggle
                          checked={profile.is_admin ?? false}
                          onChange={() => toggleAdmin(profile)}
                        />
                        {updatingId === profile.id && <Spinner />}
                      </div>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-[#1c2a2b]/50 text-xs tabular-nums">
                      {formatDate(profile.created_at)}
                    </td>

                    {/* Last updated */}
                    <td className="px-4 py-3 text-[#1c2a2b]/50 text-xs tabular-nums">
                      {formatDate(profile.updated_at)}
                    </td>

                    {/* Delete / confirm */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => deleteUser(profile.id)}
                            disabled={isDeleting}
                            className="text-[11px] font-medium text-red-600 hover:text-red-800 transition disabled:opacity-50"
                          >
                            {isDeleting ? <Spinner /> : 'Delete'}
                          </button>
                          <span className="text-[#1c2a2b]/20">|</span>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-[11px] text-[#1c2a2b]/50 hover:text-[#1c2a2b] transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(profile.id)}
                          className="text-[#1c2a2b]/25 hover:text-red-500 transition-colors p-1 rounded"
                          title="Delete user"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && <UserDetail profile={profile} />}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
