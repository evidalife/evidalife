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

## Local Path

`~/Documents/company/evidalife/01-code/website/`

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

## Database FK Delete Rules

When creating tables with user references:

| Data type | FK rule | Example tables |
|-----------|---------|----------------|
| User health/personal data | `REFERENCES profiles(id) ON DELETE CASCADE` | health results, fitness data, tracking entries, favorites, settings |
| Business/financial records | `REFERENCES profiles(id) ON DELETE NO ACTION` | orders, invoices, lab_kits |
| Platform content | `REFERENCES profiles(id) ON DELETE NO ACTION` | articles (author_id) |

**Rule of thumb:** If the data belongs to the user and has no legal retention requirement, use CASCADE. If it's a business record with Aufbewahrungspflicht (bookkeeping duty), use NO ACTION.

## User Deletion Flow
1. **Deactivate** (soft delete) — sets `deleted_at` on profiles, blocks login
2. **Reactivate** — clears `deleted_at`, user can log in again
3. **Hard delete** — only for deactivated accounts. Deletes avatar from storage, then `auth.users` cascades to profiles and all CASCADE tables. NO ACTION tables (orders, invoices, lab_kits) preserved.

## Profiles Table
- NO `full_name` column — use `first_name`, `last_name`, `display_name`
- `onboarding_completed` exists but no onboarding flow built yet
- `deleted_at` used for soft delete

## Daily Dozen
- Uses `entry_date` not `date`
- Uses `servings_completed` not `servings`
- Slugs use underscores
- `recipe_ingredients.notes` is jsonb
