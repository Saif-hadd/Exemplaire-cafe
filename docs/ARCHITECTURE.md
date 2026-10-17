# Architecture assessment and implementation plan

The existing application is a single-restaurant Next.js 13 App Router application with React 18, TypeScript, Tailwind, Radix/shadcn, Lucide, Recharts, and Supabase Auth/Postgres. It has customer home/menu/feedback/Wi-Fi routes and authenticated category/product/feedback administration. Customer content is currently static in lib/data.ts; admin content is database-backed. Feedback submission is simulated. Wi-Fi QR generation sends credentials to a third party. Admin Wi-Fi/QR/settings links have no routes. Existing RLS allows any authenticated account to write administrative records. No ordering, sessions, payment ledger, KDS, or staff roles exist. There is no Git repository or installed dependency directory in the supplied checkout.

## Incremental approach

1. Preserve existing entities, URLs, Supabase authentication, menu translations, catalog, feedback and integration behavior. Add an additive migration; never apply schema changes to the connected production database automatically.
2. Introduce staff roles, zones, tables, expiring table visits, immutable order snapshots, modifiers, order history, service requests, payments, allocations, refunds and audit records. Use Postgres RPC transactions, row locks, integer minor units and explicit grants/RLS.
3. Connect the guest portal to live settings/catalog, table validation, customization/cart, idempotent order submission, capability-protected tracking, and service requests. Existing static menu remains a clearly identified browse-only fallback when the database is unavailable.
4. Extend authenticated admin with orders, kitchen, floor plan, offline payment confirmation, analytics/reports, QR, staff and configuration. Use Supabase Realtime plus periodic reconciliation; the database remains authoritative.
5. Retain Maison Or branding with warm ivory, charcoal, champagne gold, editorial serif typography, responsive layouts, keyboard-accessible Radix dialogs and reduced-motion support.
6. Run type checking, a production build, meaningful local Postgres integration tests and browser checks when available. Document setup, accounting rules, production prerequisites and unverified features. Do not deploy.

## Boundaries

No production rows or schema will be changed during implementation. No online payments, paid AI, framework replacement, or new tenant models. A database administrator must apply the reviewed migration and explicitly provision the first owner. Runtime reads/writes are authorized by database policies, independently of the client UI. Do not claim a connected production workflow has passed without executing it.

## Final implementation note

The original framework is retained. Next.js was updated to 15.5.28 because version 13 is outside the vendor's supported releases. Recharts was aligned with that runtime, and font/image assets are bundled locally. Existing activity metrics remain available under `/admin/activity`. See the README for database activation and the production checklist for features that are limited or still need hosted verification.
