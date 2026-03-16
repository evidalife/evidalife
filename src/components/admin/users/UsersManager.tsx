'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean | null;
  onboarding_completed: boolean | null;
  created_at: string;
  avatar_url: string | null;
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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

function Badge({
  color,
  children,
}: {
  color: 'green' | 'gray' | 'amber';
  children: React.ReactNode;
}) {
  const cls = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    gray: 'bg-gray-50 text-gray-600 ring-gray-500/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ profile }: { profile: Profile }) {
  const initials = (() => {
    if (profile.full_name) return profile.full_name.charAt(0).toUpperCase();
    if (profile.email) return profile.email.charAt(0).toUpperCase();
    return '?';
  })();

  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt=""
        className="w-8 h-8 rounded-full object-cover border border-[#0e393d]/10"
      />
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
      style={{ backgroundColor: '#0e393d' }}
    >
      {initials}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 text-[#0e393d]/50"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type FilterType = 'all' | 'admins' | 'regular';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function UsersManager({
  initialProfiles,
}: {
  initialProfiles: Profile[];
}) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Data refresh ────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, onboarding_completed, created_at, avatar_url')
      .order('created_at', { ascending: false })
      .limit(500);
    if (data) setProfiles(data);
  }, [supabase]);

  // ── Filtered list ────────────────────────────────────────────────────────────

  const filtered = profiles.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.full_name?.toLowerCase().includes(q) ?? false;
      const matchEmail = p.email?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchEmail) return false;
    }
    if (filter === 'admins' && !p.is_admin) return false;
    if (filter === 'regular' && p.is_admin) return false;
    return true;
  });

  const filterPills: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admins', label: 'Admins' },
    { key: 'regular', label: 'Regular users' },
  ];

  // ── Stats ─────────────────────────────────────────────────────────────────────

  const totalUsers = profiles.length;
  const adminCount = profiles.filter((p) => p.is_admin).length;
  const onboardedCount = profiles.filter((p) => p.onboarding_completed).length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#0e393d]">Users</h1>
        <p className="mt-0.5 text-sm text-[#1c2a2b]/50">
          View registered users and manage account details.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total users', value: totalUsers },
          { label: 'Admins', value: adminCount },
          { label: 'Onboarded', value: onboardedCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#0e393d]/10 bg-white px-5 py-4"
          >
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
          {filterPills.map((p) => (
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
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider w-10">
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Name / Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Onboarding
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#0e393d]/60 uppercase tracking-wider">
                Member Since
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0e393d]/6">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#1c2a2b]/40">
                  No users found.
                </td>
              </tr>
            )}
            {filtered.map((profile) => (
              <tr key={profile.id} className="hover:bg-[#fafaf8] transition-colors">

                {/* Avatar */}
                <td className="px-4 py-3">
                  <Avatar profile={profile} />
                </td>

                {/* Name + Email */}
                <td className="px-4 py-3">
                  {profile.full_name && (
                    <div className="font-medium text-[#0e393d]">{profile.full_name}</div>
                  )}
                  <div
                    className={`text-[#1c2a2b]/50 ${
                      profile.full_name ? 'text-xs mt-0.5' : 'text-sm font-medium text-[#0e393d]'
                    }`}
                  >
                    {profile.email ?? '—'}
                  </div>
                </td>

                {/* Admin toggle */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Toggle
                        checked={profile.is_admin ?? false}
                        onChange={() => {
                          setUpdatingId(profile.id);
                          supabase
                            .from('profiles')
                            .update({ is_admin: !profile.is_admin })
                            .eq('id', profile.id)
                            .then(() => refresh().finally(() => setUpdatingId(null)));
                        }}
                      />
                    </div>
                    {updatingId === profile.id && <Spinner />}
                  </div>
                </td>

                {/* Onboarding */}
                <td className="px-4 py-3">
                  {profile.onboarding_completed ? (
                    <Badge color="green">Completed</Badge>
                  ) : (
                    <Badge color="amber">Pending</Badge>
                  )}
                </td>

                {/* Member since */}
                <td className="px-4 py-3 text-[#1c2a2b]/50 text-xs tabular-nums">
                  {formatDate(profile.created_at)}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
