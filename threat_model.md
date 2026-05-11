# Threat Model

## Project Overview

Sistema de Romaneios is a logistics operations application for registering packages, recording package scans during sorting, and generating delivery manifests. The production stack is a React + Vite frontend in `artifacts/romaneio`, an Express 5 API in `artifacts/api-server`, Clerk for authentication, and PostgreSQL via Drizzle in `lib/db`.

## Assets

- **Operational logistics data** -- package tracking numbers, destination cities, promised delivery dates, scan history, and generated route/city manifests. Unauthorized access or tampering can disrupt delivery operations.
- **User accounts and sessions** -- Clerk identities and session cookies/tokens used to access the API. Compromise allows impersonation and destructive actions.
- **Application secrets** -- `DATABASE_URL`, `CLERK_SECRET_KEY`, and related auth configuration. Exposure would enable database or identity compromise.
- **Operational integrity** -- the correctness of scan records, route progress, operator rankings, and romaneio outputs. Incorrect data can lead to misrouting, lost accountability, or fraudulent manifest generation.

## Trust Boundaries

- **Browser to API** -- the React client is untrusted and all package, scan, and manifest inputs must be validated and authorized server-side.
- **API to PostgreSQL** -- the API has direct write access to the logistics database; injection or business-logic flaws here affect all stored operational data.
- **Public to authenticated** -- `/api/healthz` is public, while operational APIs are intended to require a valid Clerk-authenticated session.
- **Authenticated operator to privileged actions** -- package deletion, bulk import, scan deletion, and manifest generation are sensitive operations and must not be granted more broadly than intended.
- **API to Clerk Frontend API** -- the production auth flow crosses a proxy boundary at `/api/__clerk`, so forwarded client identity and abuse-control signals must come only from trusted edge infrastructure.
- **Production to dev-only surfaces** -- `artifacts/mockup-sandbox/` is a development-only preview surface and should be ignored for production vulnerability reporting unless runtime exposure is proven.

## Scan Anchors

- Production API entry: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`
- Auth boundary: `artifacts/api-server/src/middlewares/requireAuth.ts`, `artifacts/romaneio/src/App.tsx`
- Auth proxy boundary: `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`
- Shared data model: `lib/db/src/schema/packages.ts`, `lib/db/src/schema/scans.ts`
- High-risk flows: package creation/deletion, bulk import, scan creation/deletion, romaneio generation, stats aggregation
- Dev-only area to usually ignore: `artifacts/mockup-sandbox/`

## Threat Categories

### Spoofing

The application relies on Clerk sessions to distinguish authenticated users from the public internet. All non-health operational API routes must require a valid Clerk-authenticated identity, only intended operators should be able to obtain that access level, and any client IP or host information forwarded to Clerk must be derived from trusted proxy infrastructure rather than raw user-controlled headers.

### Tampering

Clients can submit package and scan data that directly shapes downstream manifests and dashboards. The API must derive security-relevant or business-critical fields from authoritative server-side records whenever possible, and it must reject requests that attempt to alter operational state outside allowed workflows.

### Information Disclosure

Package lists, scan history, operator names, route progress, and manifest data are sensitive operational records. The API must not expose this shared dataset to unauthorized users, and responses should be limited to the minimum data needed for the logged-in operator's role.

### Denial of Service

Bulk import, package clearing, and repeated scan operations can change or remove large portions of operational data. Sensitive write endpoints must be protected against abuse and destructive misuse by unauthorized or over-privileged users.

### Elevation of Privilege

The main privilege boundary in this project is between a merely authenticated Clerk user and a legitimately authorized logistics operator or administrator. Authentication alone is not sufficient for high-impact actions such as viewing all shipments, deleting records, importing bulk data, and generating manifests across the entire dataset.