'use client';

import React from 'react';
import type { BriefingSlide, Lang } from '@/lib/health-engine-v2-types';
import SlideCard from './SlideCard';

interface Props {
  slide: BriefingSlide;
  lang: Lang;
  narrationText: string;
  isPlaying: boolean;
}

export default function BriefingSlides({ slide, lang, narrationText, isPlaying }: Props) {
  return (
    <div className="w-full space-y-6 fade-in">
      {/* Slide Card — each slide provides its own card styling */}
      <SlideCard slide={slide} lang={lang} />

      {/* Narration Text with Listening Indicator */}
      <div className="space-y-4">
        {isPlaying && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-[#ceab84] rounded-full animate-pulse" />
              <div className="w-1 h-4 bg-[#ceab84] rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-4 bg-[#ceab84] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            </div>
            <span className="text-xs text-[#1c2a2b]/50 font-medium uppercase tracking-wide">
              Listening…
            </span>
          </div>
        )}

        {narrationText && (
          <div className="bg-[#fafaf8] rounded-lg p-5 border border-[#0e393d]/5">
            <p className="text-sm leading-relaxed text-[#1c2a2b]/80">
              {narrationText}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
