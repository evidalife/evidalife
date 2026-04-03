import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import VoiceConversation from '@/components/voice/VoiceConversation';

export const metadata = { title: 'Voice Conversation – Evida Admin' };

export default async function VoiceConversationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/admin');

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <VoiceConversation lang="en" />
      </div>
    </div>
  );
}
