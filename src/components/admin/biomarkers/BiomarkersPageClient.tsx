'use client';

import { useState } from 'react';
import BiomarkersManager, { ItemDefinition } from './BiomarkersManager';
import UnitConversionsManager from './UnitConversionsManager';

export default function BiomarkersPageClient({ initialItems }: { initialItems: ItemDefinition[] }) {
  const [activeTab, setActiveTab] = useState<'biomarkers' | 'conversions'>('biomarkers');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-2 px-8 pt-6 pb-4">
        <button
          onClick={() => setActiveTab('biomarkers')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === 'biomarkers'
              ? 'bg-[#0e393d] text-white'
              : 'bg-[#0e393d]/6 text-[#0e393d]/60 hover:bg-[#0e393d]/12'
          }`}
        >
          Biomarkers
        </button>
        <button
          onClick={() => setActiveTab('conversions')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            activeTab === 'conversions'
              ? 'bg-[#0e393d] text-white'
              : 'bg-[#0e393d]/6 text-[#0e393d]/60 hover:bg-[#0e393d]/12'
          }`}
        >
          Unit Conversions
        </button>
      </div>

      {activeTab === 'biomarkers' && <BiomarkersManager initialItems={initialItems} />}
      {activeTab === 'conversions' && <UnitConversionsManager />}
    </div>
  );
}
