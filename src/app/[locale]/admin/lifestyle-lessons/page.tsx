import { createClient } from '@/lib/supabase/server';
import LifestyleLessonsManager from '@/components/admin/lifestyle-lessons/LifestyleLessonsManager';

export const metadata = { title: 'Lifestyle Lessons — Evida Admin' };

export default async function AdminLifestyleLessonsPage() {
  const supabase = await createClient();

  const { data: lessons } = await supabase
    .from('lifestyle_lessons')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });

  return <LifestyleLessonsManager initialLessons={lessons ?? []} />;
}
