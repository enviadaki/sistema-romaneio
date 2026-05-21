# Sistema de Romaneios

Aplicativo de logística para cadastro de pacotes, bipagem pré-sorter, geração de romaneio PDF, confirmação de entregas — com suporte a múltiplas operações (LOGGI e AMAZON).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/` — packages, scans, deliveries (all with `operation` column)
- API routes: `artifacts/api-server/src/routes/` — packages, scans, stats, romaneio, deliveries
- Frontend pages: `artifacts/romaneio/src/pages/`
- Operation context: `artifacts/romaneio/src/contexts/operation-context.tsx`
- Generated types (manually extended): `lib/api-client-react/src/generated/api.schemas.ts`, `lib/api-zod/src/generated/api.ts`

## Architecture decisions

- **Multi-operation via column**: `operation TEXT DEFAULT 'LOGGI'` on all data tables. Filters applied server-side via `?operation=` query param. Scans/deliveries inherit operation from the parent package automatically.
- **Global operation context**: React Context + localStorage persists selected operation across page reloads. Toggle visible in sidebar — blue for LOGGI, orange for AMAZON.
- **Generated types manually extended**: Rather than re-running Orval codegen (which would overwrite the operation field), `PackageInput` and `Package` interfaces were manually extended in both `api-client-react` and `api-zod` generated files.
- **Scan operation inheritance**: When creating a scan, the server looks up the package's operation and stores it on the scan — frontend never needs to send operation for bipagem.

## Product

- **Cadastro**: registro de pacotes por operação (LOGGI ou AMAZON), importação em lote via CSV/XLSX
- **Pré-Sorter**: bipagem de pacotes filtrada por operação, por rota ou cidade
- **Romaneio**: geração de PDF por operação, rota ou cidade
- **Dashboard**: estatísticas por operação (pacotes, bipagens hoje, operadores, rotas)
- **Histórico**: listagem de scans filtrada por operação, cidade, data, operador
- **Consulta**: lookup de pacote por rastreador (global, sem filtro de operação)
- **Checagem de Entrega**: confirmação de entrega por rota, filtrada por operação

## User preferences

- Interface em português (Brasil)
- Sons de bipe para ambiente industrial: alto volume, distorção, square wave

## Gotchas

- **Trusted-proxy assumption**: `app.set("trust proxy", 1)` in `artifacts/api-server/src/app.ts` assumes exactly one upstream reverse-proxy hop in production (Replit's edge). `req.ip` and the IP forwarded to Clerk's Frontend API depend on this being correct. If the deployment topology changes (multiple load balancer hops or direct internet exposure), this value must be updated to match — either a hop count, an array of trusted CIDRs, or a custom function — or per-IP abuse controls at Clerk will be bypassable again.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
