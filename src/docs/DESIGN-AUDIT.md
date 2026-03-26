# Design Audit — Evida Life Public Pages

**Date:** 2026-03-26
**Last cleanup:** 2026-03-26 — all inconsistencies resolved (13 fixes applied)
**Scope:** All public-facing and auth pages under `src/app/[locale]/`
**ARCHITECTURE.md:** Does not exist at time of audit.

---

## 1. Summary Table

| Page | Route | Hero Type | Hero Height | Text Align | Text Container | Eyebrow className | H1 className | Subtitle className | Gradient | Bottom CTA | CTA style |
|------|-------|-----------|-------------|------------|----------------|-------------------|--------------|-------------------|----------|------------|-----------|
| **Homepage** | `/` | Photo (bg-cover inline style) | `h-screen min-h-[620px]` | left | `max-w-[1060px]` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` (as `SectionTag`) | `font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white` | `text-[1rem] font-light text-white/70` | `bg-gradient-to-r from-[#0e393d]/85 via-[#0e393d]/50 to-[#0e393d]/10` | Yes — `rounded-2xl bg-[#0e393d]` | 2 CTAs |
| **fit** | `/fit` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-5xl md:text-6xl text-white leading-tight` | `text-white/80 text-lg leading-relaxed max-w-xl` | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 1 CTA |
| **sleep** | `/sleep` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | same as fit | `font-serif text-5xl md:text-6xl text-white leading-tight` | `text-white/80 text-lg leading-relaxed max-w-xl` + badges | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 1 CTA |
| **exercise** | `/exercise` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | same as fit | same as sleep | same as sleep + badges | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 2 CTAs |
| **stress-recovery** | `/stress-recovery` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | same as fit | same as sleep | same as sleep + badges | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 1 CTA |
| **coaching** | `/coaching` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | same as fit | same as sleep | same as sleep + badges | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 1 CTA |
| **kitchen** | `/kitchen` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | same as fit | `font-serif text-5xl md:text-6xl text-white leading-tight` | `text-white/80 text-lg leading-relaxed max-w-xl` (no badges) | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 1 CTA |
| **how-to-start** | `/how-to-start` | Text-only (white bg) | `pt-28 pb-16` (inside `max-w-[1060px]`) | **center** | `max-w-[1060px]` (outer), no inner max-w on heading | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-5xl text-[#0e393d] leading-tight` | `mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed` | none | No separate CTA section | 2 CTAs inline |
| **bioage** | `/bioage` | Text-only (white bg) | `pt-28 pb-16` (inside `max-w-[1060px]`) | **center** | `max-w-2xl mx-auto` | `mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-5xl text-[#0e393d] mb-4 leading-tight` | `text-base text-[#1c2a2b]/60 leading-relaxed` | none | Yes — `rounded-2xl bg-[#0e393d]` inline | 1 CTA |
| **science** | `/science` | Solid-color (`bg-[#0e393d]`) | `pt-28 pb-20` | left | `max-w-3xl` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-4xl sm:text-5xl text-white leading-tight` | `text-white/60 text-base leading-relaxed max-w-xl` | none (solid bg) | Yes — `rounded-2xl bg-[#0e393d]` inline | 2 CTAs |
| **health-engine** | `/health-engine` | Solid-color (`bg-[#0e393d]`) | `pt-28 pb-20` | left | `max-w-2xl` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-4xl sm:text-5xl text-white leading-tight` | none | none (solid bg) | No | — |
| **biomarkers** | `/biomarkers` | Text-only (white bg) | `pt-28 pb-16` (inside `max-w-[1060px]`) | **center** | `max-w-[1060px]` (outer), `div.mb-14 text-center` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-5xl text-[#0e393d] mb-4 leading-tight` | `text-base text-[#1c2a2b]/60 leading-relaxed` | none | No (bottom CTA is inline buy button) | — |
| **assessments** | `/assessments` | Text-only (white bg) | `pt-28 pb-16` (inside `max-w-[1060px]`) | **center** | `max-w-[1060px]` (outer), `div.mb-16 text-center` | same | `font-serif text-5xl text-[#0e393d] mb-4 leading-tight` | same | none | No (inline) | — |
| **partner-labs** | `/partner-labs` | Solid-color (`bg-[#0e393d]`) | `pt-28 pb-20` | left | `max-w-3xl` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-4xl sm:text-5xl text-white leading-tight` | subtitled | none (solid bg) | No | — |
| **recipes** | `/recipes` | Text-only (white bg) | `pt-28 pb-12` (inside `max-w-5xl`) | left | `max-w-5xl` | `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` | `font-serif text-4xl text-[#0e393d]` | `text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl` | none | No | — |
| **blog** | `/blog` | Text-only (white bg) | `pt-28 pb-12` (inside `max-w-5xl`) | left | `max-w-5xl` | same | `font-serif text-4xl text-[#0e393d]` | `text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl` | none | No | — |
| **shop** | `/shop` | Text-only (white bg) | `pt-28 pb-16` (inside `max-w-[1060px]`) | **center** | `max-w-[1060px]` (outer), `div.mb-10 text-center` | same | `font-serif text-5xl text-[#0e393d] leading-tight` | `mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed` | none | No (inline buy) | — |
| **courses** | `/courses` | Text-only (white bg) | `pt-28 pb-12` (inside `max-w-5xl`) | left | `max-w-5xl` | same | `font-serif text-4xl text-[#0e393d]` | `text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl` | none | No | — |
| **daily-dozen** | `/daily-dozen` | Text-only (white bg) | `pt-28 pb-12` (inside `max-w-5xl`) | left | `max-w-5xl` | same | `font-serif text-4xl text-[#0e393d]` | text | none | No | — |
| **shopping-list** | `/shopping-list` | Photo (`<img>`) | `h-[72vh] min-h-[480px]` | left | `max-w-3xl` | same as fit | `font-serif text-5xl md:text-6xl text-white leading-tight` | `text-white/80 text-lg leading-relaxed max-w-xl` | `bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent` | Yes — `bg-[#0e393d] py-20` | 2 CTAs |
| **dashboard** | `/dashboard` | Text-only (white bg) | `pt-28 pb-12` (inside `max-w-5xl`) | left | `max-w-5xl` | same | `font-serif text-4xl text-[#0e393d]` | — | none | No | — |
| **profile** | `/profile` | Text-only (white bg) | `pt-28 pb-12` (inside `max-w-5xl`) | left | `max-w-5xl` | same | — | — | none | No | — |
| **about** | `/about` | Solid-color (`bg-[#0e393d]`) | `pt-28 pb-20` | left | `max-w-3xl` | same | `font-serif text-4xl sm:text-5xl text-white leading-tight` | `text-white/60 text-lg leading-relaxed max-w-2xl` | none | No | — |
| **team** | `/team` | Solid-color (`bg-[#0e393d]`) | `pt-28 pb-20` | left | `max-w-3xl` | same | `font-serif text-4xl sm:text-5xl text-white leading-tight` | — | none | Yes — inline `max-w-xl text-center` | 1 CTA |
| **contact** | `/contact` | Text-only (white bg) | `pt-28 pb-16` (inside `max-w-5xl`) | left | `max-w-5xl` | same | `font-serif text-4xl text-[#0e393d]` | text | none | No | — |
| **privacy** | `/privacy` | Text-only (white bg, via `LegalLayout`) | `pt-28 pb-12` (inside `max-w-3xl`) | left | `max-w-3xl` | — | `font-serif text-4xl text-[#0e393d]` | — | none | No | — |
| **terms** | `/terms` | Text-only (white bg, via `LegalLayout`) | same as privacy | left | `max-w-3xl` | — | same | — | none | No | — |
| **legal** | `/legal` | Text-only (white bg, via `LegalLayout`) | same as privacy | left | `max-w-3xl` | — | same | — | none | No | — |

---

## 2. Detailed Per-Page Notes

### Homepage (`/`)

- **Hero**: Uses an inline `style={{ backgroundImage: url(...) }}` div (not an `<img>` tag and not a Tailwind background-image utility). All other photo-hero pages use an `<img>` tag. This is the only page that does so.
- **Hero height**: `h-screen min-h-[620px]` — full viewport. All other photo-hero pages use fractional viewport (`h-[72vh]`, `h-[65vh]`, `h-[55vh]`).
- **Gradient direction**: `bg-gradient-to-r` (left-to-right). All other photo pages use `bg-gradient-to-t` (bottom-up).
- **H1 font size**: `text-5xl md:text-6xl lg:text-[5.5rem]` with `font-normal` modifier. Other pages omit `font-normal` on h1 (it's implied by `font-serif`).
- **Text alignment**: left, but uses a wider `max-w-[1060px]` container.
- **No eyebrow on the hero itself** — uses a custom `<SectionTag>` component for subsequent sections instead of a plain `<p>` with classes.
- **CTA buttons**: 2 — primary gold pill + ghost white pill. Unique style among all pages.
- **Bottom CTA**: `rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14 text-center` (padding differs from the standard pillar-page CTA `py-20`).

### fit (`/fit`)

- **Gradient**: ~~`from-[#0e393d]/80`~~ → `from-[#0e393d]/85` ✅ Fixed.
- **No badges** in hero. All other pillar pages (sleep, exercise, stress-recovery, coaching) include badge pills.
- **Subtitle**: no `mb-6` on `<p>` (ends at `mb-4` on h1). Other badge-carrying pages add `mb-6` to p to make space for badges.
- **Content sections**: 2×2 card grid linking to sub-pages (`/sleep`, `/exercise`, `/stress-recovery`, `/coaching`).

### kitchen (`/kitchen`)

- **Hero height**: ~~`h-[65vh] min-h-[440px]`~~ → `h-[72vh] min-h-[480px]` ✅ Fixed.
- **Gradient via**: ~~`via-[#0e393d]/25`~~ → `via-[#0e393d]/30` ✅ Fixed.
- **No badges** (same as `/fit`).
- **Content sections**: 3-column card grid (sm:2, lg:3) linking to kitchen sub-sections.

### shopping-list (`/shopping-list`)

- **Hero height**: ~~`h-[55vh] min-h-[380px]`~~ → `h-[72vh] min-h-[480px]` ✅ Fixed.
- **H1 size**: ~~`text-4xl md:text-5xl`~~ → `text-5xl md:text-6xl` ✅ Fixed.
- **Subtitle**: ~~`text-base`~~ → `text-lg` ✅ Fixed.
- **Gradient via**: ~~`via-[#0e393d]/25`~~ → `via-[#0e393d]/30` ✅ Fixed.
- **pb in hero text area**: ~~`pb-14`~~ → `pb-16` ✅ Fixed.
- **Bottom CTA**: ~~`bg-[#0e393d] py-16`~~ → `py-20` ✅ Fixed.
- Renders a `PublicIntro` component for unauthenticated users; authenticated users see `ShoppingListView`.

### how-to-start (`/how-to-start`)

- **No photo hero**. Uses white background with `pt-28 pb-16` inside `max-w-[1060px]`.
- **Text alignment**: `text-center` — unique among the "text-only" category (most text-only pages align left).
- **H1 size**: `text-5xl` matches the bioage/shop/assessments centered text-only pages.
- **Content structure**: Extremely rich — includes a 3-step cycle section with inset photos, a full breakfast recipe, food green/red lists, stats strip, results preview, and more. This is the most content-dense page.
- **No standalone bottom CTA section** — has two inline CTA links at the very bottom.

### bioage (`/bioage`)

- **No photo hero**. White background with `pt-28 pb-16` inside `max-w-[1060px]`.
- **Text alignment**: `text-center` on hero div.
- **CTA is inline** at the bottom (not a full-bleed `bg-[#0e393d]` section) — uses `rounded-2xl bg-[#0e393d] p-10 sm:p-12 text-center`.
- **H1 size**: `text-5xl` — consistent with other centered text-only pages.
- **H1 margin**: ~~`mb-5`~~ → `mb-4` ✅ Fixed.
- Fetches live product data from Supabase for pricing/slug.

### science (`/science`)

- **Solid-color hero** (`bg-[#0e393d]`). `pt-28 pb-20`, left-aligned, `max-w-3xl`.
- **H1 size**: `text-4xl sm:text-5xl` — starts at `text-4xl` on mobile, unlike the full-bleed photo pages that start at `text-5xl`.
- **Subtitle**: `text-white/60` — slightly more transparent than other solid-color heroes (`about` uses `text-white/65`; `health-engine` has no subtitle).
- **Content**: Very rich — evidence pyramid, disease data table, heatmap with food data, reversal trial section.

### health-engine (`/health-engine`)

- **Solid-color hero** (`bg-[#0e393d]`). `pt-28 pb-20`, left-aligned, `max-w-2xl` — narrower than the standard `max-w-3xl` used by other solid-color heroes.
- **No subtitle** in hero.
- **No bottom CTA section**.
- Primarily a data display page for the user's health score.

### biomarkers (`/biomarkers`)

- **Text-only hero** (white bg). Uses `max-w-[1060px]` wrapper, `text-center` within `div.mb-14`.
- **H1 size**: `text-5xl` — consistent with other centered text-only pages.
- Content fetches live from Supabase (products, biomarker counts).
- Unique: package comparison matrix table, ISO badge strip, detailed biomarker accordion.

### assessments (`/assessments`)

- **Text-only hero** (white bg). Uses `max-w-[1060px]` wrapper, `text-center` within `div.mb-16`.
- **H1 size**: `text-5xl`.
- Content: Three assessment sections (Vitalcheck, VO2max, DEXA) with shop links.

### partner-labs (`/partner-labs`)

- **Solid-color hero** (`bg-[#0e393d]`). `pt-28 pb-20`, left-aligned, `max-w-3xl`.
- **H1 size**: `text-4xl sm:text-5xl`.
- Unique: ISO accreditation badge strip, interactive map via `PartnerLabsClient` component.

### recipes (`/recipes`), blog (`/blog`), courses (`/courses`), daily-dozen (`/daily-dozen`)

- All four use the same pattern: `max-w-5xl mx-auto px-6 pt-28 pb-12`, left-aligned, `div.mb-10`.
- **H1 size**: `text-4xl` (not `text-5xl`).
- No bottom CTA section.
- `daily-dozen` has a unique SVG gauge (tachometer) animation on the public "intro" view.

### shop (`/shop`)

- **Text-only hero** (white bg), `max-w-[1060px]`, `text-center`.
- **H1 size**: `text-5xl` — larger than the other list pages (`recipes`, `blog`, `courses`).
- Renders `ShopContent.tsx` (client component).

### dashboard (`/dashboard`), profile (`/profile`)

- Both use `max-w-5xl mx-auto px-6 pt-28 pb-12`.
- Auth-required pages; redirect unauthenticated users.
- No hero beyond a plain eyebrow + heading.

### about (`/about`)

- **Solid-color hero** (`bg-[#0e393d]`). ~~`pt-28 pb-24`~~ → `pt-28 pb-20` ✅ Fixed.
- Left-aligned, `max-w-3xl`.
- **H1 subtitle**: ~~`text-white/65`~~ → `text-white/60` ✅ Fixed.

### team (`/team`)

- **Solid-color hero** (`bg-[#0e393d]`). `pt-28 pb-20`, left-aligned, `max-w-3xl`.
- **H1 size**: `text-4xl sm:text-5xl`.
- Has a CTA at the bottom but it is inline within `max-w-xl mx-auto text-center`, not a full-bleed dark section.

### contact (`/contact`)

- **Text-only hero** (white bg). `max-w-5xl mx-auto px-6 pt-28 pb-16`, left-aligned.
- **H1 size**: `text-4xl`.
- Unique: renders `ContactForm` client component.

### privacy (`/privacy`), terms (`/terms`), legal (`/legal`)

- All three delegate to content components (`PrivacyContent`, `TermsContent`, `ImprintContent`) that use `LegalLayout`.
- `LegalLayout` renders: `max-w-3xl px-6 pt-28 pb-12`, left-aligned.
- H1: `font-serif text-4xl text-[#0e393d]` (no eyebrow).
- These are the only pages with no eyebrow element.

---

## 3. Inconsistencies Found

### 3.1 Hero Type Inconsistencies

| Issue | Affected Pages |
|-------|---------------|
| Photo hero but NOT a pillar/content page | `shopping-list` (utility/intro page uses photo hero) |
| No photo hero despite being content-rich pillar page | `how-to-start`, `bioage` |
| Full-viewport (`h-screen`) hero while others use fractional height | homepage only |

### 3.2 Hero Height Inconsistencies (Photo Heroes) ✅ Fixed

| Height | Pages |
|--------|-------|
| `h-screen min-h-[620px]` | homepage |
| `h-[72vh] min-h-[480px]` | fit, sleep, exercise, stress-recovery, coaching, **kitchen**, **shopping-list** |

~~Three different heights across 7 photo-hero pages (excluding homepage).~~ All photo-hero pages (except homepage) now use `h-[72vh] min-h-[480px]`.

### 3.3 Gradient Opacity Inconsistencies (Photo Heroes) ✅ Fixed

| `from` opacity | `via` opacity | Pages |
|----------------|---------------|-------|
| `/85` | `/30` | fit, sleep, exercise, stress-recovery, coaching, **kitchen**, **shopping-list** |

~~`fit` uses `/80` on `from`, not `/85` like the other four pillar pages.~~ All photo-hero pages now use `/85` from and `/30` via.

### 3.4 Hero Text Container Width Inconsistencies

| max-w | Context | Pages |
|-------|---------|-------|
| `max-w-3xl` | photo/solid hero inner wrapper | fit, sleep, exercise, stress-recovery, coaching, partner-labs, about, team |
| `max-w-2xl` | solid hero inner wrapper | health-engine |
| `max-w-[1060px]` | text-only outer container, centered heading | how-to-start, bioage, shop, biomarkers, assessments |
| `max-w-5xl` | text-only outer container, left heading | recipes, blog, courses, daily-dozen, dashboard, profile, contact |
| `max-w-3xl` | LegalLayout | privacy, terms, legal |

`health-engine` uses `max-w-2xl` while all other solid-color heroes use `max-w-3xl`.

### 3.5 H1 Font Size Inconsistencies

| h1 classes | Pages |
|-----------|-------|
| `font-serif text-5xl md:text-6xl lg:text-[5.5rem] font-normal leading-[1.06] tracking-tight text-white` | homepage |
| `font-serif text-5xl md:text-6xl text-white leading-tight` | fit, sleep, exercise, stress-recovery, coaching |
| `font-serif text-4xl md:text-5xl text-white leading-tight` | shopping-list |
| `font-serif text-4xl sm:text-5xl text-white leading-tight` | science, health-engine, partner-labs, about, team |
| `font-serif text-5xl text-[#0e393d] leading-tight` | how-to-start (text-only centered) |
| `font-serif text-5xl text-[#0e393d] mb-5 leading-tight` | bioage (text-only centered) |
| `font-serif text-5xl text-[#0e393d] mb-4 leading-tight` | biomarkers, assessments (text-only centered) |
| `font-serif text-5xl text-[#0e393d] mb-4` | shop (text-only centered) |
| `font-serif text-4xl text-[#0e393d]` | recipes, blog, courses, daily-dozen, contact (text-only left) |
| `font-serif text-4xl text-[#0e393d] mb-2` | LegalLayout (privacy, terms, legal) |

Summary ✅ Fixed where applicable:
- Photo-hero pillar pages: `text-5xl md:text-6xl` — **shopping-list** now matches
- Solid-color hero pages: `text-4xl sm:text-5xl` (5 pages) — consistent within type (different breakpoint prefix from photo heroes is intentional)
- Text-only centered pages: `text-5xl` — **shop** now has `leading-tight`; **bioage** `mb-` now `mb-4`
- Text-only left pages: `text-4xl` (5 pages) — consistent within type

### 3.6 Subtitle / Subheading Style Inconsistencies

| Subtitle classes | Pages |
|-----------------|-------|
| `text-white/80 text-lg leading-relaxed max-w-xl` | fit, sleep, exercise, stress-recovery, coaching (with or without `mb-6`) |
| `text-white/80 text-base leading-relaxed max-w-xl` | shopping-list (photo hero but `text-base` not `text-lg`) |
| `text-white/60 text-base leading-relaxed max-w-xl` | science |
| `text-white/65 text-lg leading-relaxed max-w-2xl` | about |
| `text-[#1c2a2b]/60 text-base max-w-xl` | recipes, blog, courses (no `leading-relaxed`) |
| `text-[#1c2a2b]/60 text-base leading-relaxed` | contact, daily-dozen |
| `text-base text-[#1c2a2b]/60 leading-relaxed` | (same but property order differs) |
| `mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed` | how-to-start, shop |
| `text-base text-[#1c2a2b]/60 leading-relaxed` | bioage (`text-base text-[#1c2a2b]/60`) |

Issues ✅ Fixed:
- `text-white/65` on `about` → `text-white/60` ✅
- `text-base` on `shopping-list` photo-hero subtitle → `text-lg` ✅
- Missing `leading-relaxed` on `recipes`, `blog`, `courses` list-page subtitles → added ✅
- Property order varies for the same effective classes (cosmetic, not fixed)

### 3.7 Bottom CTA Section Inconsistencies

All pillar pages (fit, sleep, exercise, stress-recovery, coaching, kitchen) use:
```
<section className="bg-[#0e393d] py-20">
  <div className="max-w-2xl mx-auto px-6 text-center">
```

But:
- ~~`shopping-list` uses `bg-[#0e393d] py-16`~~ → now `py-20` ✅
- `bioage`, `how-to-start`, `biomarkers`, `assessments`, `science` use inline `rounded-2xl bg-[#0e393d]` boxes inside content flow (not full-bleed sections) — intentional, not changed.
- `team` uses no full-bleed CTA but has a small centered CTA block — intentional.
- `homepage` uses `rounded-2xl bg-[#0e393d] px-10 md:px-16 py-14` — intentional (landing page variant).

### 3.8 Eyebrow Inconsistencies

- All content pages: `text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84]` — consistent.
- `legal`, `privacy`, `terms`: No eyebrow element at all.
- Homepage: Eyebrow in subsequent sections uses a `<SectionTag>` component rather than the inline `<p>` pattern.

### 3.9 Pb on Hero Text Area (Photo Heroes) ✅ Fixed

| `pb-` on the hero inner `div` | Pages |
|-------------------------------|-------|
| `pb-16` | fit, sleep, exercise, stress-recovery, coaching, **shopping-list** |

~~`pb-14` on shopping-list~~ → now `pb-16` ✅

### 3.10 About Page: Non-standard `pb-24` ✅ Fixed

~~`about` uses `pt-28 pb-24`~~ → now `pt-28 pb-20` ✅

### 3.11 Homepage Uses `div` with inline style for background image

All other photo-hero pages use `<img src=... className="absolute inset-0 w-full h-full object-cover ...">`. The homepage uses `<div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: ... }}>`. This means the homepage hero image does not benefit from Next.js image optimization and is stylistically inconsistent.

### 3.12 `how-to-start` and `bioage` have no visual hero separation

Both pages use white background with padding — they look indistinguishable from the first content section. No visual signal that the opening is the "hero". Compare to solid-color pages where the dark band clearly delineates the hero.

---

## 4. Proposed Standard

### Pattern A: Photo Hero (pillar / content pages)

**Use for:** fit, sleep, exercise, stress-recovery, coaching, kitchen, shopping-list, how-to-start (proposed change)

```tsx
{/* Hero */}
<section className="relative h-[72vh] min-h-[480px] flex items-end">
  <img
    src={HERO_IMG}
    alt=""
    className="absolute inset-0 w-full h-full object-cover object-center"
  />
  <div className="absolute inset-0 bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent" />
  <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16 w-full">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.tag}</p>
    <h1 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-4">{t.h1}</h1>
    <p className="text-white/80 text-lg leading-relaxed max-w-xl">{t.sub}</p>
    {/* Optional: badge pills below subtitle */}
  </div>
</section>
```

Standard bottom CTA for Pattern A:
```tsx
<section className="bg-[#0e393d] py-20">
  <div className="max-w-2xl mx-auto px-6 text-center">
    <h2 className="font-serif text-4xl text-white mb-4">{t.ctaHeading}</h2>
    <p className="text-white/70 text-base leading-relaxed mb-8">{t.ctaBody}</p>
    <Link href="..." className="inline-block bg-[#ceab84] text-[#0e393d] text-sm font-semibold px-8 py-4 rounded-full hover:bg-[#d4b98e] transition-colors">
      {t.ctaBtn}
    </Link>
  </div>
</section>
```

### Pattern B: Solid-Color Hero (utility / info / list pages)

**Use for:** science, health-engine, partner-labs, about, team, biomarkers, assessments, shop, contact, recipes, blog, courses, daily-dozen, dashboard, profile

Two sub-patterns:

**B1 — Dark band hero** (for pages with substantive intro copy: science, about, partner-labs, team):
```tsx
<section className="w-full bg-[#0e393d] px-6 pt-28 pb-20">
  <div className="max-w-3xl mx-auto">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-4">{t.eyebrow}</p>
    <h1 className="font-serif text-4xl sm:text-5xl text-white leading-tight mb-5">{t.heading}</h1>
    <p className="text-white/65 text-base leading-relaxed max-w-xl">{t.sub}</p>
  </div>
</section>
```

**B2 — White-background "title area"** (for grid/list/tool pages: biomarkers, shop, assessments, recipes, blog, etc.):
```tsx
{/* Inside <main className="mx-auto w-full max-w-5xl px-6 pt-28 pb-12 flex-1"> */}
<div className="mb-10">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.eyebrow}</p>
  <h1 className="font-serif text-4xl text-[#0e393d] mb-3">{t.heading}</h1>
  <p className="text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl">{t.sub}</p>
</div>
```

For centered feature/product pages (shop, biomarkers, assessments, how-to-start, bioage), use `max-w-[1060px]` outer + `text-center` + `text-5xl`:
```tsx
{/* Inside <main className="mx-auto w-full max-w-[1060px] px-6 pt-28 pb-16 flex-1"> */}
<div className="mb-14 text-center">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3">{t.eyebrow}</p>
  <h1 className="font-serif text-5xl text-[#0e393d] mb-4 leading-tight">{t.heading}</h1>
  <p className="mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed">{t.sub}</p>
</div>
```

### Pattern C: No hero (legal / auth detail pages)

**Use for:** privacy, terms, legal (all use `LegalLayout`), profile (already correct)

```tsx
{/* LegalLayout standard — no change needed */}
<main className="mx-auto w-full max-w-3xl px-6 pt-28 pb-12 flex-1">
  <h1 className="font-serif text-4xl text-[#0e393d] mb-2">{title}</h1>
  {/* prose content */}
</main>
```

---

## 5. Required Changes Per Page

### High Priority (visible inconsistencies on pillar pages)

| Page | Issue | Required Change |
|------|-------|----------------|
| `fit` | `from-[#0e393d]/80` instead of `/85` | Change gradient to `from-[#0e393d]/85 via-[#0e393d]/30` |
| `fit` | No badges but has `mb-4` on h1; sibling pages have `mb-4` + `mb-6` on `p` | Add `mb-6` to subtitle `p` for visual rhythm consistency |
| `kitchen` | `h-[65vh] min-h-[440px]` — shorter than standard | Change to `h-[72vh] min-h-[480px]` |
| `kitchen` | `via-[#0e393d]/25` instead of `/30` | Change to `via-[#0e393d]/30` |
| `shopping-list` | `h-[55vh] min-h-[380px]` — much shorter | Change to `h-[72vh] min-h-[480px]` to match pillar pages |
| `shopping-list` | `text-4xl md:text-5xl` on h1, `text-base` on subtitle | Change h1 to `text-5xl md:text-6xl`, subtitle to `text-lg` |
| `shopping-list` | `via-[#0e393d]/25` | Change to `via-[#0e393d]/30` |
| `shopping-list` | `pb-14` on hero inner div | Change to `pb-16` |
| `shopping-list` | `py-16` on CTA section | Change to `py-20` to match all other photo-hero CTAs |

### Medium Priority (solid-color hero inconsistencies)

| Page | Issue | Required Change |
|------|-------|----------------|
| `about` | `pb-24` instead of `pb-20` | Change to `pt-28 pb-20` |
| `health-engine` | `max-w-2xl` hero container instead of `max-w-3xl` | Change to `max-w-3xl` if a subtitle is ever added; acceptable as-is given no subtitle |
| `science`, `partner-labs`, `health-engine`, `team` | `sm:text-5xl` breakpoint while photo-heroes use `md:text-6xl` | These are categorically different heroes — this is acceptable variation, but document as deliberate |
| `about` | `text-white/65` subtitle | Standardise to `text-white/65 text-base` or `text-white/70 text-base` (match `science`'s `text-white/60` or find middle ground) |

### Lower Priority (text-only centered pages)

| Page | Issue | Required Change |
|------|-------|----------------|
| `bioage` | h1 has `mb-5` (not `mb-4`) | Change to `mb-4` |
| `shop` | h1 missing `leading-tight` | Add `leading-tight` |
| `recipes`, `blog`, `courses`, `daily-dozen` | Missing `leading-relaxed` on subtitle `p` | Add `leading-relaxed` |

### Homepage (special case — deliberate exceptions acceptable)

| Issue | Recommendation |
|-------|---------------|
| `bg-cover` div with `style={}` instead of `<img>` tag | Migrate to Next.js `<Image>` component with `fill` for performance |
| `h-screen` full viewport vs fractional `vh` | Keep — homepage deserves full-screen hero |
| `bg-gradient-to-r` left-to-right | Keep — horizontal gradient is a deliberate homepage distinction |
| `font-normal leading-[1.06] tracking-tight` extra modifiers on h1 | Keep — homepage h1 is intentionally larger/more refined |

---

## 6. Quick Reference: Canonical Class Values

### Eyebrow (all pages, all hero types)
```
text-xs font-semibold uppercase tracking-[0.18em] text-[#ceab84] mb-3
```
(Use `mb-4` in the B1 dark-band variant where there is more vertical space.)

### H1 by pattern
| Pattern | H1 classes |
|---------|-----------|
| A (photo hero pillar) | `font-serif text-5xl md:text-6xl text-white leading-tight mb-4` |
| B1 (dark band) | `font-serif text-4xl sm:text-5xl text-white leading-tight mb-5` |
| B2-wide centered | `font-serif text-5xl text-[#0e393d] mb-4 leading-tight` |
| B2-narrow left | `font-serif text-4xl text-[#0e393d] mb-3` |
| C (legal) | `font-serif text-4xl text-[#0e393d] mb-2` |

### Subtitle by pattern
| Pattern | Subtitle classes |
|---------|-----------------|
| A (photo hero) | `text-white/80 text-lg leading-relaxed max-w-xl` |
| B1 (dark band) | `text-white/65 text-base leading-relaxed max-w-xl` |
| B2-wide centered | `mx-auto max-w-xl text-base text-[#1c2a2b]/60 leading-relaxed` |
| B2-narrow left | `text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl` |

### Photo gradient (standard)
```
bg-gradient-to-t from-[#0e393d]/85 via-[#0e393d]/30 to-transparent
```

### Hero section wrapper (photo)
```
relative h-[72vh] min-h-[480px] flex items-end
```

### Hero text container (photo)
```
relative z-10 max-w-3xl mx-auto px-6 pb-16 w-full
```

### Bottom CTA section (standard)
```html
<section className="bg-[#0e393d] py-20">
  <div className="max-w-2xl mx-auto px-6 text-center">
```

### Badge pills (optional, inside photo hero)
```
bg-white/15 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm
```
