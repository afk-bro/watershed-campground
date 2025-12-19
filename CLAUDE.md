# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Watershed Campground is a modern, production-ready Next.js 16 website for a family-owned lakeside campground. Built with React 19, TypeScript, and Tailwind CSS 4, featuring both a public-facing website and a private admin panel for managing reservations and campsites.

## Common Development Commands

```bash
# Development
npm run dev              # Start dev server on 0.0.0.0:3000
npm run build            # Production build
npm start               # Start production server
npm run type-check      # TypeScript validation
npm run lint            # ESLint with zero warnings policy

# Testing
npx playwright test                          # Run all E2E tests
npx playwright test tests/admin/             # Run admin tests only
npx playwright test --headed                 # Run with browser UI
npx playwright test --debug                  # Debug mode
npx playwright show-report                   # View test report

# Run a single test file
npx playwright test tests/admin/smoke.spec.ts

# Database (Supabase Local - installed via npm)
npx supabase start          # Start local Supabase (requires Docker)
npx supabase stop           # Stop local instance
npx supabase db reset       # Reset DB and run all migrations
npx supabase migration new <name>  # Create new migration
npx supabase db push        # Push local schema to remote (use carefully)
```

## Architecture Overview

### Dual-Layout System

The app uses **conditional layouts** via `components/ConditionalLayout.tsx`:
- **Public routes** (`/`, `/gallery`, `/rates`, etc.): Get `Navbar` + `Footer`
- **Admin routes** (`/admin/*`): Get admin-specific layout with top navigation bar and logout

This is implemented at the root layout level (`app/layout.tsx`) and uses Next.js App Router's client-side pathname detection.

### Database & Backend

**Supabase Stack:**
- PostgreSQL database with Row Level Security (RLS) enabled
- Migrations in `supabase/migrations/` (sequential, date-prefixed)
- Two client types:
  - `lib/supabase/client.ts` - Browser client for client components
  - `lib/supabase-admin.ts` - Service role client for admin operations
- Local development uses `.env.test` with local Supabase credentials
- Production uses `.env.local` with remote Supabase

**Key Tables:**
- `reservations` - Guest bookings with status tracking
- `campsites` - Site inventory (RV, tent, cabin)
- `blackout_dates` - Unavailable date ranges
- `audit_logs` - Admin action tracking

### Authentication System

**Admin Auth Flow:**
1. Supabase Auth handles login via `/admin/login`
2. Protected routes check auth state in `app/admin/layout.tsx`
3. Session stored in cookies via `@supabase/ssr`
4. Auth callback handler at `/app/auth/callback/route.ts` processes:
   - Email invite links
   - Password reset links
   - Email confirmation links
   - Magic link authentication
5. E2E tests use pre-authenticated state in `tests/.auth/admin.json`

**Password Reset Flow:**
1. User visits `/admin/forgot-password` and enters email
2. Supabase sends password reset email with link to `/auth/callback?type=recovery`
3. Callback handler redirects to `/admin/update-password`
4. User sets new password and is redirected to `/admin`

**User Invitation Flow:**
1. Admin invites user via Supabase dashboard
2. User receives invite email with link to `/auth/callback?code=...`
3. Callback handler exchanges code for session
4. User is redirected to admin area or password setup page

**Important:** All Supabase auth redirect URLs must be allowlisted in:
- Local: `supabase/config.toml` → `[auth].additional_redirect_urls`
- Production: Supabase dashboard → Authentication → URL Configuration

**Test Setup:**
- `tests/auth.setup.ts` runs once to authenticate and save session
- Other tests depend on this setup project
- Uses `.env.test` credentials: `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD`

### Availability System

Core logic in `lib/availability.ts`:
- `checkAvailability()` - Main function that checks date conflicts
- Validates against existing reservations, blackout dates, and guest capacity
- Returns available sites + recommended site ID
- Used by both booking flow and admin calendar

**Public API:** `POST /api/availability`
**Admin API:** `GET /api/admin/availability/calendar`

### Payment Integration

**Stripe:**
- `lib/payment-policy.ts` - Pricing, fees, refund rules
- `POST /api/create-payment-intent` - Server-side Stripe integration
- `components/PaymentForm.tsx` - Client-side Stripe Elements
- Webhook handler at `app/api/webhooks/stripe/route.ts`

**Environment Variables Required:**
```
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
```

### Email System

**Resend API** via `lib/emails/`:
- Confirmation emails, cancellation notices
- HTML templates with inline styles
- Requires `RESEND_API_KEY` in environment

## Important Patterns

### Path Aliases

Uses `@/*` for imports:
```typescript
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/Navbar"
```

### Type Safety

All database types exported from `lib/supabase.ts`:
```typescript
import type { Reservation, Campsite, ReservationStatus } from "@/lib/supabase"
```

### Server vs Client Components

- **Server by default** - Most components are server components
- **Client components** marked with `"use client"` directive
- Admin layout is client component for auth state management
- Booking flow uses client components for Stripe integration

### Error Handling

Custom error classes:
- `AvailabilityError` - Validation errors in availability checks
- API routes return structured error responses with field-level details

### Rate Limiting

**Upstash Redis** (`lib/rate-limit-upstash.ts`):
- Distributed rate limiting across all Vercel instances
- Sliding window algorithm for smooth UX
- Standard rate limit headers (X-RateLimit-*)
- Pre-configured limiters for different endpoints:
  - Payment intent: 5 req/min
  - Availability: 30 req/min
  - Contact form: 3 req/5min
  - Admin API: 100 req/min
- Fails open if Upstash unavailable (prevents blocking users)

**Setup:** See `docs/RATE_LIMITING.md` for Upstash configuration

## Testing Strategy

### Playwright E2E Tests

**Setup Pattern:**
1. `tests/auth.setup.ts` - Runs once, creates `tests/.auth/admin.json`
2. All other tests use saved auth state
3. Config in `config/playwright.config.ts`

**Test Environment:**
- Uses `.env.test` for local Supabase instance
- Dev server auto-starts via `webServer` config
- Tests use `data-testid` attributes for stable selectors

**Example Test Structure:**
```typescript
import { test, expect } from '@playwright/test';

test('admin can view reservations', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Reservations' })).toBeVisible();
});
```

## Configuration Files

All config files symlinked from `/config/` directory:
- `next.config.ts` → `config/next.config.ts`
- `tailwind.config.ts` → `config/tailwind.config.ts`
- `postcss.config.mjs` → `config/postcss.config.mjs`
- `eslint.config.mjs` → `config/eslint.config.mjs`
- `playwright.config.ts` → `config/playwright.config.ts`

## Environment Variables

**Local Development** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Testing** (`.env.test`):
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
TEST_ADMIN_EMAIL=
TEST_ADMIN_PASSWORD=
```

## Design System

**Color Palette** (defined in `globals.css`):
- `--color-brand-forest`: #06251c (primary background)
- `--color-accent-gold`: #c8a75a (CTAs, headings)
- `--color-accent-beige`: #e9dfc7 (body text)

**Typography:**
- Headings: Cormorant Garamond (serif)
- Body: Inter (sans-serif)

**Admin Panel Theme:**
- Dark mode aesthetic with elevated surfaces
- Custom checkbox styling using brand colors
- Consistent spacing with design tokens

## Database Migrations

**Migration Naming:**
Format: `YYYYMMDD_description.sql`

**Creating Migrations:**
```bash
supabase migration new add_feature_name
```

**Migration Structure:**
1. DDL changes (tables, columns)
2. RLS policies
3. Indexes
4. Seed data (if needed)

**Important:** Never hardcode generated IDs in migrations. Use variables or subqueries.

## Admin Panel Structure

Located in `app/admin/`:
- `/` - Reservations dashboard (main page)
- `/calendar` - Visual calendar view with drag-and-drop
- `/campsites` - Manage campsite inventory
- `/settings` - System settings
- `/help` - Help documentation
- `/login` - Authentication

**Admin Components** in `components/admin/`:
- `calendar/` - Calendar grid, reservation blocks
- `dashboard/` - Dashboard widgets
- `help/` - Help system components

## Key Libraries

- `@supabase/ssr` - Supabase client with SSR support
- `@stripe/stripe-js` & `@stripe/react-stripe-js` - Stripe integration
- `date-fns` - Date manipulation and formatting
- `zod` - Schema validation
- `lucide-react` - Icon library
- `@playwright/test` - E2E testing

## CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):
- Runs on every PR and push to main/dev
- **Lint & Type Check** - ESLint + TypeScript validation
- **E2E Tests** - All 24 Playwright tests with local Supabase
- **Build Check** - Verifies production build succeeds
- **Lighthouse** - Performance checks on PRs to main
- **Artifacts** - Playwright reports uploaded on failure

**Pipeline takes ~8-12 minutes** for full run.

See `docs/CI_CD.md` for complete documentation.

## Deployment Notes

**Vercel Deployment:**
- Automatic deployment on push to main
- Preview deployments on every PR
- Environment variables configured in Vercel dashboard
- Security headers configured in `next.config.ts`

**Supabase Production:**
- Migrations applied via Supabase CLI or dashboard
- RLS policies must be enabled before going live
- Service role key only used server-side
