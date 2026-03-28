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

Full-stack longevity health platform for the DACH market. 35+ public routes, 12 admin pages, e-commerce with Stripe, biomarker tracking, Health Engine score dashboard. Built with Next.js 16 App Router, TypeScript, Tailwind CSS 4, and Supabase (Zurich).

**Key files:**
- `src/app/[locale]/page.tsx` — Landing page
- `src/app/[locale]/layout.tsx` — Root layout with Google Fonts (Playfair Display, Inter) and metadata
- `src/app/globals.css` — Tailwind import + CSS variables for theme colors and fonts
- `src/lib/supabase.ts` — Supabase client initialization using `NEXT_PUBLIC_SUPABASE_*` env vars
- `src/components/admin/biomarkers/BiomarkersManager.tsx` — Biomarker admin panel (~1400 lines)
- `src/components/health/HealthEnginePublic.tsx` — Health Engine dashboard UI
- `src/components/admin/lab-results/shared.tsx` — Shared enums (TEST_CATEGORIES, HE_DOMAINS, RANGE_TYPES)

**i18n (next-intl):**
- URL-based locale routing: `/de/`, `/en/`
- Translation files in `src/i18n/`
- DB content uses JSONB `{de, en, fr, es, it}` inline
- 6 languages planned: DE, EN, FR, ES, IT + future

**Supabase:**
- 56 tables, RLS on all, project `rwbmdxgcjgidalcoeppp` (eu-central-2, Zurich)
- Env vars required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` in `.env.local` for psql access via session pooler

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

## External Service Access

### Supabase
- Project ref: `rwbmdxgcjgidalcoeppp` (eu-central-2, Zurich)
- CLI: `supabase` is logged in and linked. Token stored in macOS keychain ("Supabase CLI").
- For running SQL: Use the Supabase Management API with the personal access token from keychain. Do NOT use `supabase db dump` (requires Docker which is not installed).
- REST API: Use service role key from `.env.local` for data operations.
- If access fails or token expires: **ASK the user before trying workarounds.** Do not spend time searching for alternative methods.

### Vercel
- CLI: `vercel` is logged in. Team: evidalifes-projects. Project: evidalife.
- Project ID: `prj_Jxk9uOncTluyxANkbe63fyFqjonX`
- Org ID: `team_1NtIpK0Geax7sbM8QpUCJ99m`
- Production URL: evidalife.com
- Project is linked (`.vercel/project.json` exists).
- Useful commands: `vercel env ls`, `vercel ls`, `vercel logs <url>`

## Working Principles

- **If you don't have access to a tool or service, ASK the user immediately.** Do not spend multiple attempts searching for tokens, trying workarounds, or exploring alternative access methods. Simply say "I can't access X — can you help me connect?" and wait for instructions.
- **Always read CLAUDE.md at the start of every session** for conventions, DB rules, and access info.
- **psql is NOT installed.** Use the Supabase Management API or REST API instead.
- **Docker is NOT installed.** Commands requiring Docker (like `supabase db dump`) will fail.
