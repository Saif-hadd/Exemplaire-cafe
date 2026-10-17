# Local verification — 17 October 2026

Executed in the supplied Windows workspace with Node.js 24.15.0, Next.js 15.5.28, and installed Microsoft Edge in headless mode.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 24 passed, 0 failed |
| `npm run build` | Passed; all customer and staff routes built |
| `npm run test:browser` | 4 scenarios passed, 0 failed |

Browser scenarios verified:

1. Table 05 identification, two cappuccinos plus one cheesecake totaling 105 MAD, a deliberately lost successful order response, safe retry without a duplicate order, and secure guest tracking.
2. Staff login, acceptance/preparation/ready/served/completed lifecycle, guest bill request, 40 MAD plus 65 MAD offline cash confirmations, collected-sales distinction, rendered financial chart, and settled visit closure.
3. Saved cash reconciliation close, local QR PNG download, one-star private feedback persistence while Google review access remains available, and all listed staff navigation destinations.
4. A 390-pixel mobile layout without horizontal overflow, local Wi-Fi QR generation, existing integration links, Arabic selection and RTL, and no uncaught browser page errors.

Database tests execute the actual migrations, RPC functions and RLS against a disposable local Postgres engine. Browser tests use the same engine through a Supabase-compatible REST/Auth adapter. External WebSockets are blocked in tests. Real hosted Supabase Auth, Realtime, Storage, physical QR decoding and production load were **not** verified. See [the production checklist](PRODUCTION.md).

Representative local screenshots are generated at:

- `test-results/portal-desktop.png`
- `test-results/portal-mobile.png`
- `test-results/workspace-desktop.png`
- `test-results/workspace-settled.png`

The existing project emits a nonblocking Browserslist data-age warning during builds and a Node module-type warning when directly importing TypeScript in tests. No lint run or formal accessibility/Core Web Vitals audit is claimed.
