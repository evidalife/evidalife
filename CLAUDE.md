# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production server
npm run lint     # Run ESLint
```

No test framework is configured.

## Architecture

Single-page landing site for Evida Life (health/nutrition platform). Built with Next.js App Router, TypeScript, Tailwind CSS 4, and Supabase.

**Key files:**
- `src/app/page.tsx` — The entire landing page. Contains all sections (nav, hero, features, waitlist, footer) and the full bilingual translation object `T`.
- `src/app/layout.tsx` — Root layout with Google Fonts (Playfair Display, Inter) and metadata.
- `src/app/globals.css` — Tailwind import + CSS variables for theme colors and fonts.
- `src/lib/supabase.ts` — Supabase client initialization using `NEXT_PUBLIC_SUPABASE_*` env vars.

**Bilingual support (DE/EN):**
- Language preference stored in `localStorage` under key `evida-lang`.
- Browser language auto-detects on first visit, defaulting to German.
- All copy lives in the `T` translation object inside `page.tsx`.

**Waitlist / Supabase:**
- Email submissions go directly to the `waitlist` table via the Supabase anon key.
- Duplicate emails are handled gracefully by catching Postgres error code `23505`.
- Env vars required: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**Path alias:** `@/*` resolves to `./src/*`.
