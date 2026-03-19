'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';

type Lang = 'de' | 'en';

interface Props {
  recipeId: string;
  initialAvg: number | null;
  initialCount: number;
  lang?: Lang;
}

const T = {
  de: { ratings: 'Bewertungen', sign_in: 'Anmelden zum Bewerten' },
  en: { ratings: 'Ratings', sign_in: 'Sign in to rate' },
};

export default function RecipeRating({ recipeId, initialAvg, initialCount, lang = 'de' }: Props) {
  const { user } = useAuth();
  const supabase = createClient();
  const t = T[lang];

  const [avg, setAvg] = useState(initialAvg);
  const [count, setCount] = useState(initialCount);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  // Fetch current user's rating on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from('recipe_ratings')
      .select('rating')
      .eq('recipe_id', recipeId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setUserRating(data.rating);
      });
  }, [user, recipeId, supabase]);

  const handleRate = async (rating: number) => {
    if (!user || saving) return;
    setSaving(true);

    await supabase
      .from('recipe_ratings')
      .upsert({ recipe_id: recipeId, user_id: user.id, rating }, { onConflict: 'recipe_id,user_id' });

    // Refetch aggregate
    const { data } = await supabase
      .from('recipe_ratings')
      .select('rating')
      .eq('recipe_id', recipeId);

    if (data && data.length > 0) {
      const total = data.reduce((sum, r) => sum + (r.rating as number), 0);
      setAvg(total / data.length);
      setCount(data.length);
    }
    setUserRating(rating);
    setSaving(false);
  };

  const displayRating = hover > 0 ? hover : (userRating ?? 0);

  return (
    <div className="rounded-2xl border border-[#0e393d]/10 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#ceab84] mb-3">{t.ratings}</p>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={!user || saving}
              onClick={() => handleRate(star)}
              onMouseEnter={() => { if (user) setHover(star); }}
              onMouseLeave={() => setHover(0)}
              className={`text-2xl leading-none transition-transform ${
                user && !saving ? 'cursor-pointer hover:scale-110' : 'cursor-default'
              } ${star <= displayRating ? 'text-[#ceab84]' : 'text-[#0e393d]/15'}`}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
        {avg != null && (
          <span className="text-xs text-[#1c2a2b]/40 tabular-nums">
            {avg.toFixed(1)} <span className="text-[#1c2a2b]/25">({count})</span>
          </span>
        )}
      </div>

      {!user && (
        <p className="text-[11px] text-[#1c2a2b]/35 mt-1">{t.sign_in}</p>
      )}
    </div>
  );
}
