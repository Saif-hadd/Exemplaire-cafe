# Production readiness and remaining verification

The implementation is local. No production migration, production data write, hosting registration, or deployment was performed.

## Before serving real guests

- [ ] Back up the existing database; rehearse the additive migration against a staging copy and review any preexisting RLS policies beyond the supplied schema.
- [ ] Apply the operations migration and provision the first owner explicitly. Existing authenticated users intentionally receive no operational privileges until assigned a role.
- [ ] Configure the actual menu, tax treatment, restaurant timezone, photos/branding, Wi-Fi, opening hours, public address, phone, WhatsApp, Google review destination, Maps destination and final QR URL. Inherited placeholder values are not verified real integrations.
- [ ] Disable unnecessary public account signup in Supabase Auth, configure strong staff passwords/MFA and recovery, and verify owner/manager/waiter/cashier/kitchen access with separate real accounts.
- [ ] Verify Supabase Realtime publication, RLS delivery, reconnect behavior and dropped-response retries in staging. Local browser tests intentionally block external WebSockets and exercise reconciliation polling. Hosted event delivery has not been verified.
- [ ] Verify Storage upload policies, MIME/size restrictions, bucket exposure and image delivery against your Supabase Storage installation. Local database tests do not emulate the Storage service.
- [ ] Run the full guest/kitchen/waiter/cashier acceptance scenario against staging and physically scan printed QR cards on iOS and Android. Local tests do not prove device-camera QR decoding or physical terminal/cash handling.
- [ ] Reconcile report calculations and a day-end count with the restaurant accountant. Run competing payment/closing transactions against a multi-connection staging database; the local Postgres engine serializes queries and cannot prove load behavior across independent database connections.
- [ ] Confirm hosting HTTPS, security headers, environment configuration, backups/restore, monitoring, upstream Auth/API rate limits and deployment rollback. Add infrastructure rate limiting for unidentified traffic; the application limits valid table-code attempts per table, successful order submissions per visit, and new service requests per visit.
- [ ] Load-test expected restaurant traffic and historical reporting volume. Staff currently reconcile paginated operational records every 15 seconds; move aggregation and historical range filtering into database queries if the venue's volume warrants it. No Core Web Vitals benchmark or formal accessibility audit was performed.
- [ ] Review dependency security advisories at release time. The inherited Next.js 13.5.1 was updated to 15.5.28 without replacing the framework. Dependency security is an ongoing release task.

## Scope and limitations

Implemented: guest portal, live database catalog, configurable menu options, rule-based cart pairings, persistent selection, validated table visits, server-priced idempotent ordering, secure tracking, separate operational/payment states, live staff order views with polling recovery, kitchen controls and timers, assigned-waiter access, grid floor plan, per-visit consolidated bills, partial offline receipts and allocations, owner-controlled full refunds, payment/audit history, real-data reporting and CSV/print, cash reconciliation closing, staff roles, service requests, table/general QR generation and revocation, local Wi-Fi QR, private feedback persistence, and editable integrations/settings.

Remaining or deliberately limited:

- The existing French/English/Arabic menu content, navigation and RTL are preserved and language choice persists; new guest dialogs, hospitality copy and staff operations are not fully translated. Some existing product descriptions also have no translated database content. Complete translation and native-speaker review before claiming full three-language coverage.
- Staff Auth account creation/invitation/password reset uses Supabase administration. The app manages provisioned staff UUIDs, roles and permissions, not email invitations.
- Refunds are full-receipt only. No partial refunds, discount campaigns, per-diner split bills, category reorder transaction, or custom names for extra offline methods are supplied. The `other` method accepts a receipt reference.
- PDF export uses the browser's Print / Save as PDF. There is no server PDF renderer or fiscal receipt certification.
- General QR guests need the visit code supplied by staff. Table QR guests can join a staff-opened, unexpired visit; a photographed printed QR can resolve another currently open visit until rotated or deactivated. Deploy stricter per-visit codes for table QR too if the venue requires proof of current physical presence.
- The visual floor plan is a maintainable grid. Drag-and-drop positioning is not implemented.
- Date filters, hourly/daily collections, top products, category sales, averages and peak/cancellation metrics are implemented. Comparative growth charts, custom fiscal business-day cutoff, and low-performing-product insights need further product work.
- Existing public analytics event ingestion and aggregate traffic-event reporting remain available under `/admin/activity`, independently of operational and financial reports.
- Local browser tests use a Supabase-compatible test adapter, rather than hosted Supabase Auth/PostgREST/Realtime. Their mock identity token is isolated to tests and never provisioned in the application. No authentication bypass or demo staff login exists in production code.

## Local verification record

Executed results and test boundaries are recorded in [VERIFICATION.md](VERIFICATION.md). Screenshots are generated in `test-results/` and are ignored by source control.
