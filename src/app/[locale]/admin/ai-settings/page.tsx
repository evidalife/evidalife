import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AISettingsManager from '@/components/admin/ai/AISettingsManager';

export const metadata = { title: 'AI Settings – Evida Admin' };

export default async function AISettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/admin');

  // Fetch settings server-side for SSR
  const { data: settings } = await admin
    .from('ai_settings')
    .select('key, value, updated_at');

  // Key status — server-only, never sent as actual values
  const keyStatus = {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    deepgram: !!process.env.DEEPGRAM_API_KEY,
  };

  return (
    <AISettingsManager
      initialSettings={settings ?? []}
      initialKeyStatus={keyStatus}
    />
  );
}
