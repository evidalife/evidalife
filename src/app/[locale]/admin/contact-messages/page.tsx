import { createAdminClient } from '@/lib/supabase/admin';
import ContactMessagesViewer from '@/components/admin/contact-messages/ContactMessagesViewer';

export default async function ContactMessagesPage() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('contact_messages')
    .select('id, name, email, message, created_at')
    .order('created_at', { ascending: false });

  return <ContactMessagesViewer messages={data ?? []} />;
}
