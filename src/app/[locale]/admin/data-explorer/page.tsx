import dynamic from 'next/dynamic';

const DataExplorerManager = dynamic(
  () => import('@/components/admin/data-explorer/DataExplorerManager'),
  { ssr: false, loading: () => <div className="p-8 text-center text-sm text-[#1c2a2b]/40">Loading Data Explorer...</div> }
);

export default function DataExplorerPage() {
  return <DataExplorerManager />;
}
