/**
 * Shared hero component for consistent page headers across the site.
 *
 * Three variants:
 * - "teal"  — dark teal band (bg-[#0e393d]) with white text. For tool/feature pages.
 * - "light" — warm white (bg-[#fafaf8]) with dark text. For info/content pages.
 * - "photo" — full-height image hero with gradient overlay. For editorial/marketing pages.
 *
 * All variants enforce max-w-[1060px] with px-8 md:px-12 on the inner
 * container to stay aligned with the navbar and footer content.
 */

import React from 'react';

interface PageHeroProps {
  /** Visual variant */
  variant: 'teal' | 'light' | 'photo';
  /** Small uppercase label above the heading */
  eyebrow?: string;
  /** Main heading (serif) */
  title: string;
  /** Optional subtitle below the heading */
  subtitle?: string;
  /** Optional extra info line (e.g. "Last updated: ...") */
  meta?: string;
  /** Background image URL — required for "photo" variant */
  imageUrl?: string;
  /** Optional children rendered below subtitle inside the hero */
  children?: React.ReactNode;
}

export default function PageHero({
  variant,
  eyebrow,
  title,
  subtitle,
  meta,
  imageUrl,
  children,
}: PageHeroProps) {
  if (variant === 'photo') {
    return (
      <section className="relative h-[72vh] min-h-[480px] flex items-end overflow-hidden">
        {/* Background image */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent" />
        {/* Content — padding on inner div to match navbar alignment */}
        <div className="relative w-full pb-16">
          <div className="max-w-[1060px] mx-auto px-8 md:px-12">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
                {eyebrow}
              </p>
            )}
            <h1 className="font-serif font-normal text-5xl md:text-6xl text-white leading-tight mb-4">
              {title}
            </h1>
            {subtitle && (
              <p className="text-white/60 text-lg leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
            {children}
          </div>
        </div>
      </section>
    );
  }

  if (variant === 'teal') {
    return (
      <section className="w-full bg-[#0e393d] pt-28 pb-14">
        <div className="max-w-[1060px] mx-auto px-8 md:px-12">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif font-normal text-4xl md:text-5xl text-white leading-tight mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/60 text-base leading-relaxed max-w-xl">
              {subtitle}
            </p>
          )}
          {meta && (
            <p className="mt-3 text-sm text-white/30">{meta}</p>
          )}
          {children}
        </div>
      </section>
    );
  }

  // variant === 'light'
  return (
    <section className="w-full bg-[#fafaf8] pt-28 pb-14">
      <div className="max-w-[1060px] mx-auto px-8 md:px-12">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif font-normal text-4xl md:text-5xl text-[#0e393d] leading-tight mb-3">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl">
            {subtitle}
          </p>
        )}
        {meta && (
          <p className="mt-3 text-sm text-[#0e393d]/40">{meta}</p>
        )}
        {children}
      </div>
    </section>
  );
}
