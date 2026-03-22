import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import CourseDetail, { type LessonWithProgress } from '@/components/CourseDetail';
import { createClient } from '@/lib/supabase/server';

const VALID_LANGS = ['en', 'de', 'fr', 'es', 'it'] as const;
type Lang = typeof VALID_LANGS[number];

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const lang: Lang = (VALID_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';
  const supabase = await createClient();

  // Fetch course — try slug first, fall back to id
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, image_url, slug, is_published')
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .eq('is_published', true)
    .single();

  if (!course) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch lessons with article info
  const { data: lessonRows } = await supabase
    .from('course_lessons')
    .select('id, article_id, sort_order, is_free, articles(title, slug, reading_time_min)')
    .eq('course_id', course.id)
    .order('sort_order');

  // Fetch user's completed lessons for this course
  let completedSet = new Set<string>();
  if (user && lessonRows && lessonRows.length > 0) {
    const lessonIds = lessonRows.map((l) => l.id);
    const { data: progress } = await supabase
      .from('course_progress')
      .select('lesson_id')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);
    completedSet = new Set((progress ?? []).map((p) => p.lesson_id));
  }

  const lessons: LessonWithProgress[] = (lessonRows ?? []).map((row) => {
    const article = row.articles as {
      title?: { de?: string; en?: string };
      slug?: string;
      reading_time_min?: number;
    } | null;
    return {
      id: row.id,
      article_id: row.article_id,
      sort_order: row.sort_order,
      is_free: row.is_free,
      is_completed: completedSet.has(row.id),
      article_title: article?.title ?? null,
      article_slug: article?.slug ?? null,
      article_reading_time_min: article?.reading_time_min ?? null,
    };
  });

  const title       = course.title?.[lang] || course.title?.en || course.title?.de || '';
  const description = course.description?.[lang] || course.description?.en || course.description?.de || '';
  const totalCount  = lessons.length;
  const doneCount   = lessons.filter((l) => l.is_completed).length;

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-2xl mx-auto px-6 pt-28 pb-12">

        {/* Breadcrumb */}
        <nav className="mb-8 text-xs text-[#1c2a2b]/40">
          <Link href="/courses" className="hover:text-[#0e393d] transition">
            {lang === 'de' ? 'Kurse' : lang === 'fr' ? 'Cours' : lang === 'es' ? 'Cursos' : lang === 'it' ? 'Corsi' : 'Courses'}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-[#1c2a2b]/60">{title}</span>
        </nav>

        {/* Course header */}
        <div className="mb-8">
          {course.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.image_url} alt={title}
              className="w-full h-52 object-cover rounded-2xl border border-[#0e393d]/10 mb-6" />
          )}

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">
            {lang === 'de' ? 'Kurs' : lang === 'fr' ? 'Cours' : lang === 'es' ? 'Curso' : lang === 'it' ? 'Corso' : 'Course'} · {totalCount} {lang === 'de' ? (totalCount === 1 ? 'Lektion' : 'Lektionen') : lang === 'fr' ? (totalCount === 1 ? 'leçon' : 'leçons') : lang === 'es' ? (totalCount === 1 ? 'lección' : 'lecciones') : lang === 'it' ? (totalCount === 1 ? 'lezione' : 'lezioni') : (totalCount === 1 ? 'lesson' : 'lessons')}
          </p>
          <h1 className="font-serif text-3xl text-[#0e393d] mb-3">{title}</h1>
          {description && (
            <p className="text-[#1c2a2b]/60 text-base leading-relaxed">{description}</p>
          )}

          {/* Quick stats for logged-in */}
          {user && totalCount > 0 && (
            <p className="mt-3 text-sm text-[#1c2a2b]/50">
              {locale === 'de'
                ? `${doneCount} von ${totalCount} Lektionen abgeschlossen`
                : `${doneCount} of ${totalCount} lessons completed`}
            </p>
          )}
        </div>

        {/* Interactive lesson list */}
        <CourseDetail
          lang={lang}
          lessons={lessons}
          userId={user?.id ?? null}
        />

      </main>

      <PublicFooter />
    </div>
  );
}
