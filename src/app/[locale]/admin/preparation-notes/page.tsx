import { createClient } from '@/lib/supabase/server';
import PrepNotesManager, { type PrepNote } from '@/components/admin/prep-notes/PrepNotesManager';

export default async function PrepNotesPage() {
  const supabase = await createClient();

  const { data: notes } = await supabase
    .from('preparation_notes')
    .select('*')
    .order('slug');

  return <PrepNotesManager initialNotes={(notes ?? []) as PrepNote[]} />;
}
