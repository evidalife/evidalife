import { createClient } from '@/lib/supabase/server';
import CoursesManager from '@/components/admin/courses/CoursesManager';

export const metadata = { title: 'Courses — Evida Admin' };

export default async function AdminCoursesPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('*, course_lessons(count)')
    .order('sort_order')
    .order('created_at', { ascending: false });

  const mapped = (courses ?? []).map((c) => ({
    ...c,
    lesson_count: Array.isArray(c.course_lessons) ? (c.course_lessons[0] as { count: number } | undefined)?.count ?? 0 : 0,
  }));

  return <CoursesManager initialCourses={mapped} />;
}
