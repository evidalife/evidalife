import { getLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';
import { buildMeta, PAGE_META } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = locale === 'en' ? 'en' : 'de';
  return buildMeta({ ...PAGE_META.courses[lang], path: '/courses', locale: lang });
}

type Lang = 'de' | 'en';

const T = {
  de: {
    heading: 'Kurse',
    sub: 'Fundiertes Wissen für ein längeres, gesünderes Leben.',
    lessons: (n: number) => `${n} ${n === 1 ? 'Lektion' : 'Lektionen'}`,
    progress: (pct: number) => `${pct}% abgeschlossen`,
    start: 'Kurs starten',
    continue: 'Fortfahren',
    done: 'Abgeschlossen ✓',
    empty: 'Noch keine Kurse verfügbar.',
  },
  en: {
    heading: 'Courses',
    sub: 'Evidence-based learning for a longer, healthier life.',
    lessons: (n: number) => `${n} ${n === 1 ? 'lesson' : 'lessons'}`,
    progress: (pct: number) => `${pct}% complete`,
    start: 'Start course',
    continue: 'Continue',
    done: 'Completed ✓',
    empty: 'No courses available yet.',
  },
};

export default async function CoursesPage() {
  const locale = (await getLocale()) as Lang;
  const t = T[locale];
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch published courses with lesson count
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, description, slug, image_url, sort_order, course_lessons(count)')
    .eq('is_published', true)
    .order('sort_order')
    .order('created_at', { ascending: false });

  // For logged-in users fetch their progress counts per course
  type ProgressMap = Record<string, number>;
  let progressMap: ProgressMap = {};

  if (user && courses && courses.length > 0) {
    // Get all lesson IDs for published courses in one query
    const { data: userProgress } = await supabase
      .from('course_progress')
      .select('lesson_id, course_lessons!inner(course_id)')
      .eq('user_id', user.id);

    if (userProgress) {
      userProgress.forEach((row) => {
        const lessonJoin = row.course_lessons as unknown as { course_id: string } | null;
        const courseId = lessonJoin?.course_id;
        if (courseId) progressMap[courseId] = (progressMap[courseId] ?? 0) + 1;
      });
    }
  }

  const items = (courses ?? []).map((c) => {
    const lessonCount = Array.isArray(c.course_lessons)
      ? (c.course_lessons[0] as { count: number } | undefined)?.count ?? 0
      : 0;
    const completed = progressMap[c.id] ?? 0;
    const pct = lessonCount > 0 ? Math.round((completed / lessonCount) * 100) : 0;
    return { ...c, lessonCount, completed, pct };
  });

  return (
    <div className="min-h-screen bg-[#fafaf8] flex flex-col">
      <PublicNav />

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-2">
            {locale === 'de' ? 'Wissen' : 'Knowledge'}
          </p>
          <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
          <p className="text-[#1c2a2b]/60 text-base max-w-xl">{t.sub}</p>
        </div>

        {/* Empty */}
        {items.length === 0 && (
          <div className="rounded-xl border border-[#0e393d]/10 bg-white p-12 text-center text-sm text-[#1c2a2b]/40">
            {t.empty}
          </div>
        )}

        {/* Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((course) => {
            const title = course.title?.[locale] || course.title?.de || course.title?.en || '';
            const desc  = course.description?.[locale] || course.description?.de || '';
            const isDone = user && course.pct === 100;
            const hasStarted = user && course.completed > 0 && course.pct < 100;

            return (
              <Link
                key={course.id}
                href={`/courses/${course.slug ?? course.id}`}
                className="group flex flex-col rounded-2xl border border-[#0e393d]/10 bg-white overflow-hidden hover:border-[#0e393d]/25 hover:shadow-md transition-all duration-200"
              >
                {/* Image */}
                <div className="relative h-44 bg-[#0e393d]/6 overflow-hidden">
                  {course.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.image_url} alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
                        className="text-[#0e393d]/20">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>
                    </div>
                  )}
                  {isDone && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      ✓ {locale === 'de' ? 'Fertig' : 'Done'}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-5">
                  <h2 className="font-serif text-lg text-[#0e393d] leading-snug mb-1.5 group-hover:text-[#1a5055] transition-colors">
                    {title}
                  </h2>
                  {desc && (
                    <p className="text-sm text-[#1c2a2b]/55 leading-relaxed line-clamp-2 mb-3">{desc}</p>
                  )}

                  <div className="mt-auto space-y-3">
                    <p className="text-xs text-[#1c2a2b]/40">{t.lessons(course.lessonCount)}</p>

                    {/* Progress bar (logged-in users only) */}
                    {user && course.lessonCount > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-[#0e393d]/8 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-[#ceab84]'}`}
                            style={{ width: `${course.pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[#1c2a2b]/40">
                          {isDone ? t.done : hasStarted ? t.progress(course.pct) : t.start}
                        </p>
                      </div>
                    )}

                    {!user && (
                      <span className="text-xs font-medium text-[#0e393d] group-hover:underline">{t.start} →</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

      </main>

      <PublicFooter />
    </div>
  );
}
