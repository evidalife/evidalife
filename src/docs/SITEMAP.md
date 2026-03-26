# Evidalife — Full Sitemap
Generated: 2026-03-26 · Updated after cleanup: 2026-03-26

---

## Public Pages (Logged Out)
Pages accessible without authentication.

| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/` | Evida Life — Homepage | ✅ Live | Navbar logo, Footer logo |
| `/about` | About | ✅ Live | Footer |
| `/assessments` | Clinical Assessments | ✅ Live | Navbar → Health → Clinical Assessments |
| `/bioage` | Biological Age Testing | ✅ Live | Navbar → Health → Biological Age |
| `/biomarkers` | Biomarkers Guide | ✅ Live | Navbar → Health → Biomarkers, inline CTAs |
| `/blog` | Blog | ✅ Live | Navbar → Kitchen → Blog |
| `/blog/[slug]` | Blog Post | ✅ Live | /blog listing |
| `/cart` | Warenkorb | ✅ Live | Navbar cart icon (desktop), Navbar mobile cart |
| `/contact` | Contact | ✅ Live | Footer |
| `/courses` | Courses | ✅ Live | Navbar → Kitchen → Courses |
| `/courses/[slug]` | Course Detail | ✅ Live | /courses listing |
| `/daily-dozen` | Daily Dozen | ✅ Live | Navbar → Kitchen → Daily Dozen |
| `/health` | Health | ✅ Live | Navbar → Health → Overview |
| `/health-engine` | Health Engine | ✅ Live | Navbar → Health → Health Engine |
| `/how-to-start` | How to Start | ✅ Live | Navbar → Kitchen → How to Start |
| `/legal` | Imprint / Legal | ✅ Live | Footer |
| `/partner-labs` | Partner Labs | ✅ Live | Navbar → Health → Partner Labs, Footer |
| `/privacy` | Privacy Policy | ✅ Live | Footer, waitlist form |
| `/recipes` | Recipes | ✅ Live | Navbar → Kitchen → Recipes |
| `/recipes/[slug]` | Recipe Detail | ✅ Live | /recipes listing |
| `/science` | Science & Research | ✅ Live | Navbar → Health → Science & Research |
| `/shop` | Shop | ✅ Live | Navbar → Shop → Browse Shop, Footer |
| `/shop/[slug]` | Product Detail | ✅ Live | /shop listing |
| `/shopping-list` | Shopping List | ✅ Live | Navbar → Kitchen → Shopping List |
| `/team` | Team | ✅ Live | Footer |
| `/terms` | Terms of Service | ✅ Live | Footer |
| `/coaching` | Coaching | 🟡 Placeholder | Navbar → Fit → Coaching |
| `/exercise` | Exercise | 🟡 Placeholder | Navbar → Fit → Exercise |
| `/fit` | Fit | 🟡 Placeholder | Navbar → Fit → Overview |
| `/kitchen` | Kitchen | 🟡 Placeholder | Navbar → Kitchen → Overview |
| `/sleep` | Schlaf / Sleep | 🟡 Placeholder | Navbar → Fit → Sleep |
| `/stress-recovery` | Stress Recovery | 🟡 Placeholder | Navbar → Fit → Stress & Recovery |

---

## Auth Pages (Login / Signup Flow)
Pages in the `(auth)` route group — no authentication required.

| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/login` | Login | ✅ Live | Navbar (logged-out state) |
| `/login/verify` | Verify (MFA / Magic Link) | ✅ Live | /login flow |
| `/signup` | Sign Up | ✅ Live | /login page |
| `/forgot-password` | Forgot Password | ✅ Live | /login page |

---

## Authenticated Pages (Logged In — Regular User)
Pages requiring login but no admin role. All redirect to `/login?redirectTo=...` if unauthenticated.

| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/dashboard` | Health Engine Dashboard | ✅ Live | Navbar → Health → My Dashboard (auth) |
| `/profile` | My Profile | ✅ Live | Profile dropdown → Profile |
| `/profile?tab=results` | Profile — Lab Results | ✅ Live | Profile dropdown → Results |
| `/profile?tab=orders` | Profile — My Orders | ✅ Live | Profile dropdown → Orders; Navbar → Shop → My Orders (auth) |
| `/profile?tab=invoices` | Profile — My Invoices | ✅ Live | Profile dropdown → Invoices; Navbar → Shop → My Invoices (auth) |

---

## Admin Pages (Logged In — Admin Role)
Protected by `src/app/[locale]/admin/layout.tsx`: checks `getUser()` and `profile.is_admin === true`. Unauthorized users are redirected to `/`.

### Shop
| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/admin/products` | Products Manager | ✅ Live | Admin sidebar → Shop |
| `/admin/orders` | Orders Manager | ✅ Live | Admin sidebar → Shop |
| `/admin/discount-codes` | Discount Codes | ✅ Live | Admin sidebar → Shop |

### Content
| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/admin/recipes` | Recipes Manager | ✅ Live | Admin sidebar → Content |
| `/admin/ingredients` | Ingredients Manager | ✅ Live | Admin sidebar → Content |
| `/admin/preparation-notes` | Preparation Notes | ✅ Live | Admin sidebar → Content |
| `/admin/units` | Units / Measurements | ✅ Live | Admin sidebar → Content |
| `/admin/courses` | Courses Manager | ✅ Live | Admin sidebar → Content |
| `/admin/articles` | Articles Manager | ✅ Live | Admin sidebar → Content |

### Health / Lab
| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/admin/lab-results` | Lab Results Manager | ✅ Live | Admin sidebar → Health |
| `/admin/biomarkers` | Biomarkers Manager | ✅ Live | Admin sidebar → Health |
| `/admin/labs` | Partner Labs Manager | ✅ Live | Admin sidebar → Health |

### System
| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/admin/users` | Users Manager | ✅ Live | Admin sidebar → System |
| `/admin/communications` | Communications | ✅ Live | Admin sidebar → System |
| `/admin/contact-messages` | Contact Messages | ✅ Live | Admin sidebar → System |

### Admin Root
| Route | Page Title | Status | Linked From |
|-------|-----------|--------|-------------|
| `/admin` | Admin Dashboard | 🟡 Partially built | Admin sidebar, Profile dropdown (admin only) |

---

## Navbar Dropdown Structure

The navbar has four section triggers — all **dropdown-only** (not clickable links themselves). Dropdowns show public items always; auth items appear below a separator only when logged in.

### Kitchen ▾
| # | Label | Route | Auth? |
|---|-------|-------|-------|
| 1 | Overview | `/kitchen` | No |
| 2 | Recipes | `/recipes` | No |
| 3 | Blog | `/blog` | No |
| 4 | Courses | `/courses` | No |
| 5 | Daily Dozen | `/daily-dozen` | No |
| 6 | How to Start | `/how-to-start` | No |
| 7 | Shopping List | `/shopping-list` | No |
| — | *(separator)* | — | — |
| 8 | My Daily Dozen | `/daily-dozen` | ✅ logged-in only |
| 9 | My Shopping List | `/shopping-list` | ✅ logged-in only |

### Health ▾
| # | Label | Route | Auth? |
|---|-------|-------|-------|
| 1 | Overview | `/health` | No |
| 2 | Health Engine | `/health-engine` | No |
| 3 | Science & Research | `/science` | No |
| 4 | Biomarkers | `/biomarkers` | No |
| 5 | Clinical Assessments | `/assessments` | No |
| 6 | Biological Age | `/bioage` | No |
| 7 | Partner Labs | `/partner-labs` | No |
| — | *(separator)* | — | — |
| 8 | My Dashboard | `/dashboard` | ✅ logged-in only |

### Fit ▾
| # | Label | Route | Auth? |
|---|-------|-------|-------|
| 1 | Overview | `/fit` | No |
| — | *(separator)* | — | — |
| 2 | Sleep | `/sleep` | No |
| 3 | Exercise | `/exercise` | No |
| 4 | Stress & Recovery | `/stress-recovery` | No |
| 5 | Coaching | `/coaching` | No |

### Shop ▾
| # | Label | Route | Auth? |
|---|-------|-------|-------|
| 1 | Browse Shop | `/shop` | No |
| — | *(separator)* | — | — |
| 2 | My Orders | `/profile?tab=orders` | ✅ logged-in only |
| 3 | My Invoices | `/profile?tab=invoices` | ✅ logged-in only |

### Profile Dropdown (logged in only)
| Label | Route | Notes |
|-------|-------|-------|
| Profile | `/profile` | — |
| Orders | `/profile?tab=orders` | — |
| Results | `/profile?tab=results` | — |
| Invoices | `/profile?tab=invoices` | — |
| *(separator)* | — | — |
| Admin Panel | `/admin` | Only shown when `is_admin === true` |
| *(separator)* | — | — |
| Abmelden / Sign out | — | Auth action |

---

## Unlinked Pages (Orphans)
_None._ The `/orders` standalone page was deleted in this cleanup. Redirect exists at `/:locale/orders → /:locale/profile?tab=orders` (permanent).

---

## Dead Links
_None found._ All linked routes have corresponding `page.tsx` files.

---

## Placeholder / Stub Pages
Pages with a "coming soon" / `comingSoon` template — real routes, minimal content.

| Route | Current State | Notes |
|-------|--------------|-------|
| `/kitchen` | 🟡 Coming soon | Section landing — sub-pages not yet built |
| `/fit` | 🟡 Coming soon | Section landing — sub-pages not yet built |
| `/sleep` | 🟡 Coming soon | Linked from Fit dropdown |
| `/exercise` | 🟡 Coming soon | Linked from Fit dropdown |
| `/stress-recovery` | 🟡 Coming soon | Linked from Fit dropdown |
| `/coaching` | 🟡 Coming soon | Linked from Fit dropdown |
| `/admin` | 🟡 Partially built | Has order stats; some dashboard sections still placeholder |

> **Confirmed removed:** Data Explorer (TanStack Table) — no `page.tsx` found.
> **Not present:** `/fit/sleep`, `/fit/movement`, `/kitchen/pflanzlich-starten` — no subdirectories exist under `/fit/` or `/kitchen/`.

---

## API Routes
Grouped by domain. Not user-facing.

### Auth (not under `/api/`)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/auth/callback` | Supabase OAuth / magic link callback handler |

### User — Storage
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/upload-image` | Upload image to Supabase Storage |
| POST | `/api/delete-image` | Delete image from Supabase Storage |

### User — Commerce
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/checkout` | Create Stripe checkout session |
| GET | `/api/invoices/[orderId]/pdf` | Generate and stream invoice PDF |

### User — Lab Results
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/lab-results/extract` | AI extraction of biomarkers from uploaded document |
| POST | `/api/lab-results/save-report` | Save extracted lab report to DB |
| POST | `/api/lab-results/update-report` | Update existing lab report |
| POST | `/api/lab-results/delete-report` | Delete a lab report |
| POST | `/api/lab-results/self-report` | Manually enter a single biomarker result |

### Webhooks
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/webhooks/stripe` | Handle Stripe payment events (order fulfillment) |

### Admin — Orders & Commerce
| Method | Route | Purpose |
|--------|-------|---------|
| GET, POST | `/api/admin/order-status` | Get / update order fulfilment status |
| GET, POST, DELETE | `/api/admin/order-notes` | Manage internal order notes |
| POST | `/api/admin/create-order` | Manually create an order |
| GET, POST | `/api/admin/refund-order` | Issue a Stripe refund |
| GET | `/api/admin/orders/export` | Export orders as CSV |

### Admin — Lab Results
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/parse-lab-results` | AI parse of uploaded lab document |
| POST | `/api/admin/lab-results/bulk` | Bulk upload / process lab results |
| POST | `/api/admin/lab-results/review` | Review and approve extracted results |
| GET | `/api/admin/lab-results/export` | Export lab results as CSV |

### Admin — Products
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/parse-product` | AI parse product data from raw input |
| POST | `/api/admin/rewrite-product` | AI rewrite product copy |
| POST | `/api/admin/style-product` | AI style / format product description |
| POST | `/api/admin/translate-product` | AI translate product to all locales |

### Admin — Recipes & Content
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/parse-recipe` | AI parse recipe from raw input |
| POST | `/api/admin/rewrite-recipe` | AI rewrite recipe copy |
| POST | `/api/admin/style-recipe` | AI style / format recipe |
| POST | `/api/admin/translate-recipe` | AI translate recipe to all locales |
| POST | `/api/admin/translate-article` | AI translate article to all locales |
| POST | `/api/admin/translate-course` | AI translate course to all locales |

### Admin — Ingredients, Units & Prep Notes
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/autocomplete-ingredient` | AI autocomplete ingredient name |
| POST | `/api/admin/autocomplete-unit` | AI autocomplete unit name |
| POST | `/api/admin/autocomplete-prep-note` | AI autocomplete preparation note |
| POST | `/api/admin/review-ingredients` | AI review / normalise ingredients |
| POST | `/api/admin/review-units` | AI review / normalise units |
| POST | `/api/admin/review-prep-notes` | AI review / normalise prep notes |
| POST | `/api/admin/bulk-translate-ingredients` | Bulk AI translate ingredient names |
| POST | `/api/admin/bulk-nutrition` | Bulk calculate nutritional values |
| POST | `/api/admin/bulk-common-grams` | Bulk calculate common weight conversions |
| POST | `/api/admin/calc-grams-per-unit` | Calculate grams per serving unit |
| POST | `/api/admin/translate-unit` | AI translate a unit to all locales |
| POST | `/api/admin/translate-prep-note` | AI translate a prep note to all locales |

### Admin — Biomarkers & Labs
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/autocomplete-biomarker` | AI autocomplete biomarker name |
| GET | `/api/admin/audit-biomarkers` | Audit biomarker data integrity |
| POST | `/api/admin/rewrite-lab-partner` | AI rewrite lab partner description |
| POST | `/api/admin/translate-lab-partner` | AI translate lab partner to all locales |
| POST | `/api/admin/suggest-health-goals` | AI suggest health goals for a biomarker |

### Admin — Users
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/toggle-admin` | Grant / revoke admin role |
| POST | `/api/admin/deactivate-user` | Soft-delete user (sets `deleted_at`) |
| POST | `/api/admin/reactivate-user` | Reactivate soft-deleted user |
| POST | `/api/admin/delete-user` | Hard-delete user from auth + cascade |

### Admin — Communications
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/admin/send-test-email` | Send a test email via Resend |
| POST | `/api/admin/resend-email` | Resend a transactional email |
| POST | `/api/admin/ai-email-assist` | AI drafting assistance for email content |

---

## Route Summary

| Category | Count |
|---------|-------|
| Public pages — live | 26 route patterns |
| Public pages — placeholder / coming soon | 6 |
| Auth pages (login/signup flow) | 4 |
| Authenticated user pages | 3 |
| Admin pages | 16 |
| **Total page routes** | **54** |
| API routes (user-facing) | 8 |
| API routes (admin) | 43 |
| Auth callback route | 1 |
| Webhook routes | 1 |
| **Total API routes** | **53** |
| Orphan pages | 0 (was 1 — `/orders` deleted, redirect added) |
| Dead links | 0 |
| Placeholder pages | 6 |
