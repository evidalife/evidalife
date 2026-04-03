'use client';

import { useAuth } from '@/context/AuthProvider';
import dynamic from 'next/dynamic';

const AICompanion = dynamic(() => import('@/components/AICompanion'), { ssr: false });

export default function AICompanionWrapper() {
  const { user } = useAuth();
  if (!user) return null;
  return <AICompanion />;
}
