'use client';

import { useState, useEffect, useCallback } from 'react';
import { StatCard, StatCardRow } from '@/components/admin/shared/AdminUI';
import LabPartnersManager, { type LabPartner } from './LabPartnersManager';
import LabPricingManager from './LabPricingManager';
import LabSettlementsManager from './LabSettlementsManager';

type Product = {
  id: string;
  slug: string;
  name: Record<string, string> | string;
  price_chf: number | null;
  price_eur: number | null;
  product_type: string;
};

const TABS = [
  { key: 'partners', label: 'Lab Partners' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'settlements', label: 'Settlements' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function LabsAdminTabs({
  initialLabPartners,
  initialProducts,
}: {
  initialLabPartners: LabPartner[];
  initialProducts: Product[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('partners');

  // ─── Overview Stats ──────────────────────────────────────────────────────
  const totalLabs = initialLabPartners.length;
  const activeLabs = initialLabPartners.filter(l => l.is_active).length;
  const parentOrgs = initialLabPartners.filter(l => !l.parent_lab_id).length;
  const daughterLocs = initialLabPartners.filter(l => l.parent_lab_id).length;

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-[#0e393d]">Lab Partners</h1>
          <p className="text-sm text-[#1c2a2b]/40 mt-1">
            Manage lab partnerships, pricing agreements, and settlement payouts
          </p>
        </div>
      </div>

      {/* Overview KPI cards */}
      <StatCardRow>
        <StatCard value={totalLabs} label="Total Labs" detail={`${activeLabs} active`} />
        <StatCard value={parentOrgs} label="Organizations" variant="default" detail="Billing entities" />
        <StatCard value={daughterLocs} label="Locations" variant="purple" detail="Daughter labs" />
        <StatCard value={activeLabs} label="Active" variant="emerald" detail={`${totalLabs - activeLabs} inactive`} />
      </StatCardRow>

      {/* Tab bar — pill style matching existing labs design */}
      <div className="flex gap-1 mb-6 bg-[#0e393d]/5 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-[#0e393d] shadow-sm'
                : 'text-[#0e393d]/50 hover:text-[#0e393d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'partners' && (
        <LabPartnersManager initialLabPartners={initialLabPartners} />
      )}
      {activeTab === 'pricing' && (
        <LabPricingManager
          labPartners={initialLabPartners}
          products={initialProducts}
        />
      )}
      {activeTab === 'settlements' && (
        <LabSettlementsManager labPartners={initialLabPartners} />
      )}
    </div>
  );
}
