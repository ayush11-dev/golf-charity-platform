# Golf Charity Platform

A subscription-based golf charity platform built with Next.js, Supabase, Stripe, and Resend.

## Features

- Public landing page with unified navigation and charity discovery.
- Supabase auth flow with protected main app routes.
- Stripe subscription checkout for monthly/yearly plans.
- Stripe one-time donation checkout for charities.
- Dashboard score submission and score management (edit/delete).
- Monthly draw engine (random/algorithmic), winner generation, and prize allocation.
- Winner proof URL submission from dashboard.
- Admin panel with tabs for users, scores, draws, winners, charities, and analytics.
- Admin controls for user subscription overrides and score moderation.
- Email notifications for subscription lifecycle and draw outcomes.

## Tech Stack

- Next.js 16 (App Router + proxy)
- React 19 + TypeScript
- Supabase (SSR auth + admin service role operations)
- Stripe (subscriptions and one-time payments)
- Resend (transactional notifications)
- Tailwind CSS v4 + Biome

## Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project
- Stripe account (test mode for local development)

## Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

RESEND_API_KEY=...
RESEND_FROM_EMAIL=Golf Charity Platform <onboarding@resend.dev>

ADMIN_EMAIL=admin@example.com
```

Notes:

- `ADMIN_EMAIL` must match the authenticated Supabase user email that should access `/admin`.
- Plan price IDs are currently defined in `lib/stripe.ts`. Update them for your Stripe account if needed.

## Local Setup

1. Install dependencies.

```bash
pnpm install
```

2. Apply database schema from `supabase/schema.sql` to your Supabase project.

3. Start the app.

```bash
pnpm dev
```

4. Open `http://localhost:3000`.

## Test Credentials (Local Only)

Use these accounts for local/demo testing only.

### Admin

- Email: `admin@gmail.com`
- Password: `Admin@123`

### Users

- Email: `ayush@gmail.com`
	Password: `Ayush@123`
- Email: `suresh@gmail.com`
	Password: `Ayush@123`
- Email: `ramesh@gmail.com`
	Password: `Ayush@123`

### Stripe Test Card

- Card number: `4242 4242 4242 4242`
- Expiry: `12/29`
- CVC: `123`

## Stripe Webhook (Local)

Forward Stripe events to the local webhook endpoint:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret from Stripe CLI output into `STRIPE_WEBHOOK_SECRET`.

## Useful Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm smoke
```

## Smoke Test Suite

A lightweight API/UI guard smoke suite is available at `scripts/smoke.mjs`.

What it validates:

- Public page availability.
- Redirect guard for protected dashboard routes.
- Admin API authentication guards.
- Stripe checkout authentication guard.
- Donation API request validation.
- Stripe webhook signature requirement.

Run it against a running app:

```bash
pnpm build
pnpm start
pnpm smoke
```

To target a different URL:

```bash
SMOKE_BASE_URL=http://localhost:3001 pnpm smoke
```

## Verification Checklist

- Sign up/login works and protected routes redirect correctly.
- Subscription checkout activates plan via webhook.
- Dashboard allows adding/updating/removing scores.
- Donation checkout records donations in database.
- Admin can run/publish draws and update winner status.
- Admin can update user subscription fields and moderate scores.
- Notification emails send when configured with Resend.
