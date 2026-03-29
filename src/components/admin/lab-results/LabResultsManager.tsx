'use client';

import { useState } from 'react';
import OrderEntryTab from './OrderEntryTab';
import PdfUploadTab from './PdfUploadTab';
import ManualEntryTab from './ManualEntryTab';
import ReviewQueueTab from './ReviewQueueTab';
import AllResultsTab from './AllResultsTab';

type Tab = 'order_entry' | 'pdf_upload' | 'manual_entry' | 'review_queue' | 'all_results';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'order_entry',  label: 'Order Entry',  icon: '📦' },
  { id: 'pdf_upload',   label: 'PDF Upload',   icon: '📄' },
  { id: 'manual_entry', label: 'Manual Entry',  icon: '✏️' },
  { id: 'review_queue', label: 'Review Queue',  icon: '🔍' },
  { id: 'all_results',  label: 'All Results',   icon: '📊' },
];

export default function LabResultsManager() {
  const [tab, setTab] = useState<Tab>('order_entry');
  const [reviewCount, setReviewCount] = useState(0);

  return (
    <div>
      {/* Tab bar — matches biomarkers style */}
      <div className="border-b border-[#0e393d]/8 px-8 pt-5">
        <div className="flex gap-1">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
                tab === id
                  ? 'text-[#0e393d] bg-white'
                  : 'text-[#0e393d]/45 hover:text-[#0e393d]/70 hover:bg-[#0e393d]/[0.03]'
              }`}
            >
              {icon} {label}
              {tab === id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0e393d] rounded-full" />
              )}
              {id === 'review_queue' && reviewCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {reviewCount > 9 ? '9+' : reviewCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'order_entry'  && <OrderEntryTab />}
      {tab === 'pdf_upload'   && <PdfUploadTab onSwitchToManual={() => setTab('manual_entry')} />}
      {tab === 'manual_entry' && <ManualEntryTab />}
      {tab === 'review_queue' && <ReviewQueueTab onCountChange={setReviewCount} onSwitchToPdf={() => setTab('pdf_upload')} />}
      {tab === 'all_results'  && <AllResultsTab />}
    </div>
  );
}
