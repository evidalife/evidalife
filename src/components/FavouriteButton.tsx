'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  recipeId: string;
  userId: string | null;
  initialIsFavourited: boolean;
  size?: 'sm' | 'md';
  onToggle?: (recipeId: string, isFavourited: boolean) => void;
  className?: string;
}

export default function FavouriteButton({
  recipeId,
  userId,
  initialIsFavourited,
  size = 'md',
  onToggle,
  className = '',
}: Props) {
  const [isFavourited, setIsFavourited] = useState(initialIsFavourited);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!userId || loading) return;

    const newVal = !isFavourited;
    setIsFavourited(newVal);
    onToggle?.(recipeId, newVal);
    setLoading(true);

    try {
      if (newVal) {
        await supabase.from('recipe_favourites').insert({ user_id: userId, recipe_id: recipeId });
      } else {
        await supabase.from('recipe_favourites').delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId);
      }
    } catch {
      // Revert on error
      setIsFavourited(!newVal);
      onToggle?.(recipeId, !newVal);
    } finally {
      setLoading(false);
    }
  };

  const sizeClass  = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const iconSize   = size === 'sm' ? 16 : 20;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!userId}
      aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={isFavourited}
      className={`${sizeClass} rounded-full flex items-center justify-center transition-colors ${
        isFavourited
          ? 'text-red-500'
          : userId
            ? 'text-[#1c2a2b]/30 hover:text-red-400'
            : 'text-[#1c2a2b]/20 cursor-default'
      } ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isFavourited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  );
}
