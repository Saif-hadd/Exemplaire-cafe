# Maison Or — Restaurant OS

An incremental upgrade of the supplied restaurant application. Next.js App Router, React, TypeScript, Tailwind/shadcn, Supabase Auth/Postgres/Realtime, Recharts, and local QR generation are retained. Next.js was updated from 13.5.1 to 15.5.28 because the original major is [outside support](https://nextjs.org/support-policy). There are no online payment gateways or paid AI services.

Read [the architecture assessment](docs/ARCHITECTURE.md), [accounting rules](docs/ACCOUNTING.md), and [production checklist and verification limits](docs/PRODUCTION.md).

## Run locally

Use Node.js 24 for the supplied tests and a current npm. On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`.

```sh
npm ci
npm run dev
```

The existing `.env` is preserved. For a different environment, copy `.env.example` to `.env.local` and supply the Supabase project URL and **public anon key**. Never put a service-role key in a `NEXT_PUBLIC_` variable. Fonts and the supplied sample photographs are bundled locally; font licenses are under `public/fonts`, and photograph source URLs are recorded in `public/images/sources.json`.

Customer routes: `/`, `/menu`, `/orders`, `/wifi`, `/feedback`.

Staff login: `/admin/login`. Staff routes include `/admin`, `/admin/orders`, `/admin/kitchen`, `/admin/tables`, `/admin/payments`, `/admin/service`, `/admin/analytics`, `/admin/reports`, `/admin/products`, `/admin/categories`, `/admin/modifiers`, `/admin/qr-code`, `/admin/wifi`, `/admin/settings`, and `/admin/staff`.

Existing page-view, menu-count, private-feedback and click metrics are retained under `/admin/activity`.

## Database setup — required before operations work

No migration has been applied to your connected database by this implementation. Back up and review the database first. Test on a staging Supabase project before production.

1. On a **new** database, apply `supabase/migrations/20261013102938_001_restaurant_platform_schema.sql` once. **Do not rerun the original seed migration on an existing initialized project**: its generated UUID seeds are not idempotent.
2. Apply `supabase/migrations/20261017000100_restaurant_operations.sql` once through your normal Supabase migration workflow or SQL editor. It runs in a transaction and extends existing tables. It also replaces the original permissive authenticated write policies with explicit staff permissions. Tables and financial records are not seeded with sample activity.
3. Create your owner login in Supabase Auth. Provision that existing user's UUID through the SQL editor:

```sql
insert into public.staff_users (id, display_name, role, can_collect)
values ('YOUR-AUTH-USER-UUID'::uuid, 'Restaurant owner', 'owner', true);
```

4. Sign in at `/admin/login`. Configure restaurant details, valid external links, opening hours, timezone, Wi-Fi, and tax. The inherited placeholder Maps/review/WhatsApp details must be replaced with your restaurant's actual values.
5. Keep your existing menu, or create your actual products. The original database migration seeds categories, not products. The static catalog in `lib/data.ts` is a **browse-only sample fallback** when the database is unavailable; it is not inserted into production.
6. Create restaurant spaces and tables. Create other staff logins in Supabase Auth, then assign their UUIDs and roles under Staff. Assign tables to waiters. Only explicitly authorized waiters may record payments.
7. Open a table visit. Its six-character visit code allows general-QR guests to identify that table. A table-specific QR resolves the active visit automatically. Visits expire after the configured duration; expired visits must be settled and closed before opening a new visit at the same table.
8. Generate QR cards using the final **HTTPS public restaurant URL**, not localhost. Print cards only after the destination is correct.

Supabase Storage installs the public `menu-images` bucket and owner/manager upload policy when Storage exists. JPEG, PNG, and WebP uploads are limited to 5 MB. The SQL works without Storage in the local database tests. Production Storage behavior needs staging verification.

The migration adds operational tables to `supabase_realtime` if that publication exists. Staff also reconcile every 15 seconds and on reconnection. Guest order tracking uses capability-protected polling every 5 seconds. Failed submissions retain their idempotency key across reloads and retries.

## A normal service

Open a table visit → guest scans QR or enters table/code → customize and add items → confirm the order → staff accepts → kitchen prepares and marks ready → waiter serves → complete operationally → guest requests bill → staff receives money physically → authorized staff explicitly confirms cash/card-terminal/other receipt → settle remaining balances → close visit → clean table → make available for the next visit.

Multiple orders share the current visit's bill. Partial payments allocate oldest outstanding orders first. Completing or serving an order **never** marks it paid. The owner can record a full physical refund with a reason; the original receipt stays intact. A refund on a closed historical visit creates a correction balance under that same visit, independently of the current table visit.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm start -- --hostname 127.0.0.1
# In another terminal, with the server running:
npm run test:browser
```

`npm test` uses PGlite, a real local Postgres engine, and the actual migrations/RPC/RLS. It covers the 105 MAD acceptance scenario, permissions, transaction rollback, duplicate prevention, partial allocations, historical corrections, tax/modifiers, expiring/revoked access, code-attempt rate limiting, and daily close reconciliation.

Browser tests use installed Microsoft Edge in headless mode and a disposable local database. REST/Auth traffic is intercepted by a test adapter, and external WebSockets are blocked. They do not use real logins or modify hosted Supabase. Set `TEST_BASE_URL` to test another local port. Screenshots are written under ignored `test-results/`.

## Costs and deployment

The libraries are open source. Hosting, Supabase infrastructure/storage, a domain, email delivery, backups, and internet access can have operating costs. Supabase can be self-hosted; manage backups and authentication infrastructure accordingly. Nothing is deployed automatically by this upgrade.
