'use client';

import { useState } from 'react';
import LabPartnersManager, { type LabPartner } from './LabPartnersManager';
import LabPricingManager from './LabPricingManager';
import LabSettlementsManager from './LabSettlementsManager';

type Product = {
  id: string;
  slug: string;
  name: Record<string, string> | string;
  price_chf: number | null;
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

  return (
    <div>
      {/* Tab bar */}
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
