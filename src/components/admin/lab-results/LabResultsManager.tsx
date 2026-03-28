'use client';

import { useCallback, useState } from 'react';
import OrderEntryTab from './OrderEntryTab';
import PdfUploadTab from './PdfUploadTab';
import ManualEntryTab from './ManualEntryTab';
import ReviewQueueTab from './ReviewQueueTab';
import AllResultsTab from './AllResultsTab';

type Tab = 'order_entry' | 'pdf_upload' | 'manual_entry' | 'review_queue' | 'all_results';

const TABS: { id: Tab; label: string }[] = [
  { id: 'order_entry',  label: 'Order Entry' },
  { id: 'pdf_upload',   label: 'PDF Upload' },
  { id: 'manual_entry', label: 'Manual Entry' },
  { id: 'review_queue', label: 'Review Queue' },
  { id: 'all_results',  label: 'All Results' },
];

export default function LabResultsManager() {
  const [tab, setTab] = useState<Tab>('order_entry');
  const [reviewCount, setReviewCount] = useState(0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl text-[#0e393d]">Lab Results</h1>
        <p className="text-sm text-[#1c2a2b]/40 mt-1">Enter results, extract from PDFs, manage review queue, and browse all results</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#0e393d]/10 mb-6">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative px-1 py-3 mr-8 text-sm font-medium border-b-2 transition ${
              tab === id
                ? 'border-[#0e393d] text-[#0e393d]'
                : 'border-transparent text-[#1c2a2b]/40 hover:text-[#1c2a2b]'
            }`}
          >
            {label}
            {id === 'review_queue' && reviewCount > 0 && (
              <span className="absolute -top-0.5 -right-3 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
                {reviewCount > 9 ? '9+' : reviewCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'order_entry'  && <OrderEntryTab />}
      {tab === 'pdf_upload'   && <PdfUploadTab onSwitchToManual={() => setTab('manual_entry')} />}
      {tab === 'manual_entry' && <ManualEntryTab />}
      {tab === 'review_queue' && <ReviewQueueTab onCountChange={setReviewCount} />}
      {tab === 'all_results'  && <AllResultsTab />}
    </div>
  );
}
