'use client';

import { useState } from 'react';
import BiomarkersManager, { ItemDefinition } from './BiomarkersManager';
import UnitConversionsManager from './UnitConversionsManager';
import UnitsOverview from './UnitsOverview';

type Tab = 'biomarkers' | 'conversions' | 'units';

export default function BiomarkersPageClient({ initialItems }: { initialItems: ItemDefinition[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('biomarkers');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'biomarkers',  label: '🔬 Biomarkers' },
    { id: 'conversions', label: '⚖️ Unit Conversions' },
    { id: 'units',       label: '📏 Units' },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 px-8 pt-6 pb-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeTab === id
                ? 'bg-[#0e393d] text-white'
                : 'bg-[#0e393d]/6 text-[#0e393d]/60 hover:bg-[#0e393d]/12'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'biomarkers'  && <BiomarkersManager initialItems={initialItems} />}
      {activeTab === 'conversions' && <UnitConversionsManager />}
      {activeTab === 'units'       && <UnitsOverview />}
    </div>
  );
}
