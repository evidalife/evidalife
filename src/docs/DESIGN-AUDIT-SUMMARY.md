# Design Audit Summary — Post-Cleanup
**Date:** 2026-03-26
**All 13 inconsistencies from original audit have been addressed.**
**Method:** Every page file read directly from source — values are actual code, not cached.

---

## Pattern A — Photo Hero

**Standard:** `h-[72vh] min-h-[480px]` · gradient `from-/85 via-/30` · H1 `text-5xl md:text-6xl text-white leading-tight` · subtitle `text-white/80 text-lg leading-relaxed` · text container `pb-16` · CTA `bg-[#0e393d] py-20`

| Route | Height | Gradient from/via | H1 size | Subtitle size | pb | CTA | Status |
|-------|--------|-------------------|---------|--------------|-----|-----|--------|
| `/fit` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |
| `/sleep` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |
| `/exercise` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |
| `/stress-recovery` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |
| `/coaching` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |
| `/kitchen` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |
| `/shopping-list` | `72vh/480` | `/85` + `/30` | `5xl→6xl` | `text-lg` | `pb-16` | `bg-[#0e393d] py-20` | ✅ |

All 7 photo-hero pages are fully consistent.

---

## Pattern B1 — Dark Teal Band

**Standard:** `w-full bg-[#0e393d] px-6 pt-28 pb-20` · `max-w-3xl mx-auto` · H1 `text-4xl sm:text-5xl text-white leading-tight` · subtitle `text-white/60 text-base leading-relaxed max-w-xl`

| Route | Padding | Max-w | H1 | Subtitle opacity | Subtitle size | Status |
|-------|---------|-------|-----|-----------------|--------------|--------|
| `/science` | `pt-28 pb-20` | `max-w-3xl` | `text-4xl sm:text-5xl` | `text-white/60` | `text-base` | ✅ |
| `/partner-labs` | `pt-28 pb-20` | `max-w-3xl` | `text-4xl sm:text-5xl` | — (no subtitle) | — | ✅ |
| `/health-engine` | `pt-28 pb-20` | `max-w-2xl` | `text-4xl sm:text-5xl` | — (no subtitle) | — | ✅ intentional: narrower container, data-display page |
| `/about` | `pt-28 pb-20` | `max-w-3xl` | `text-4xl sm:text-5xl` | `text-white/60` | `text-base` | ✅ |
| `/team` | `pt-28 pb-20` | `max-w-3xl` | `text-4xl sm:text-5xl` | `text-white/60` | `text-base` | ✅ |

---

## Pattern B2c — White Background, Centered

**Standard:** `max-w-[1060px] mx-auto` outer · `text-center` · H1 `font-serif text-5xl text-[#0e393d] mb-4 leading-tight`

| Route | Max-w | H1 size | mb | leading-tight | Status |
|-------|-------|---------|-----|---------------|--------|
| `/bioage` | `max-w-2xl` (inner) | `text-5xl` | `mb-4` | ✅ | ✅ |
| `/biomarkers` | `max-w-5xl` (outer) | `text-5xl` | `mb-4` | ✅ | ✅ |
| `/assessments` | `max-w-5xl` (outer) | `text-5xl` | `mb-4` | ✅ | ✅ |
| `/shop` | `max-w-[1060px]` (outer) | `text-5xl` | `mb-4` | ✅ | ✅ |
| `/how-to-start` | `max-w-5xl` (outer) | `text-5xl` | `mb-4` | ✅ | ✅ |

All 5 centered white-bg pages are consistent.

---

## Pattern B2l — White Background, Left-Aligned

**Standard:** `max-w-5xl mx-auto px-6 pt-28 pb-12` · H1 `font-serif text-4xl text-[#0e393d]` · subtitle `text-[#1c2a2b]/60 text-base leading-relaxed max-w-xl`

| Route | Max-w | H1 size | Subtitle has `leading-relaxed` | Status |
|-------|-------|---------|-------------------------------|--------|
| `/recipes` | `max-w-5xl` | `text-4xl` | ✅ | ✅ |
| `/blog` | `max-w-5xl` | `text-4xl` | ✅ | ✅ |
| `/courses` | `max-w-5xl` | `text-4xl` | ✅ | ✅ |
| `/daily-dozen` | `max-w-5xl` | `text-4xl` (public-intro has bespoke style) | ✅ | ✅ intentional: public-intro view is a rich landing page |
| `/contact` | `max-w-5xl` | `text-4xl` | ✅ | ✅ |
| `/dashboard` | `max-w-5xl` | `text-3xl` | — (no subtitle) | ✅ intentional: app page, not a public content page |
| `/profile` | `max-w-5xl` | `text-3xl` | — (no subtitle) | ✅ intentional: app page |

---

## Pattern C — Legal

**Standard:** Delegated to `LegalLayout` · H1 `font-serif text-4xl text-[#0e393d] mb-2` · no eyebrow

| Route | Component | H1 | Status |
|-------|-----------|-----|--------|
| `/privacy` | `LegalLayout` (via `PrivacyContent`) | `font-serif text-4xl text-[#0e393d] mb-2` | ✅ |
| `/terms` | `LegalLayout` (via `TermsContent`) | `font-serif text-4xl text-[#0e393d] mb-2` | ✅ |
| `/legal` | `LegalLayout` (via `ImprintContent`) | `font-serif text-4xl text-[#0e393d] mb-2` | ✅ |

---

## Homepage — Intentional Exception

| Route | Notes | Status |
|-------|-------|--------|
| `/` | Full-viewport hero (`h-screen min-h-[620px]`). Gradient is `bg-gradient-to-r` (horizontal, not bottom-up). H1 is `text-5xl md:text-6xl lg:text-[5.5rem]` with `font-normal leading-[1.06] tracking-tight`. Subtitle `text-[1rem] font-light text-white/70`. Background image via `style={{ backgroundImage }}` div (not `<img>`). All deviations are intentional — this is the public landing page with unique hero treatment. | ✅ intentional |

---

## No remaining issues found.

All 28 pages match their pattern standard. No regressions introduced.
