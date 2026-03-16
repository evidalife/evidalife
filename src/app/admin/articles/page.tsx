import { createClient } from '@/lib/supabase/server';
import ArticlesManager from '@/components/admin/articles/ArticlesManager';

export default async function ArticlesPage() {
  const supabase = await createClient();

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, category, author_name, reading_time_min, is_published, is_featured, featured_image_url, published_at, created_at')
    .order('created_at', { ascending: false });

  return <ArticlesManager initialArticles={articles ?? []} />;
}
