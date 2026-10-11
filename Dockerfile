# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the Sistema de Romaneios monorepo (pnpm workspaces).
# Produces two final images via --target:
#   api       -> Node runtime running the bundled Express API (port 5000)
#   frontend  -> Nginx serving the built React app + reverse-proxying /api
#
# Build (from repo root):
#   docker build --target api      -t romaneio-api .
#   docker build --target frontend --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_... -t romaneio-frontend .
#
# In practice this is driven by docker-compose.yml, which passes the right
# build args and wires the containers together.

FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

# ---- install workspace dependencies (shared by api + frontend builds) ----
FROM base AS deps
COPY . .
# pnpm's build-script gate blocks postinstall scripts (esbuild, @clerk/shared,
# core-js) until explicitly approved. First install fails on purpose; the
# approve step unblocks it, then we install for real.
RUN pnpm install --frozen-lockfile || true
RUN pnpm approve-builds --all
RUN pnpm install --frozen-lockfile
# Type-checks + compiles the shared workspace libs (lib/db, lib/api-zod, etc.)
# that both the API and the frontend depend on via `workspace:*`.
RUN pnpm run typecheck:libs

# ---- build the API server (esbuild bundle -> dist/index.mjs) ----
FROM deps AS api-build
RUN pnpm --filter @workspace/api-server run build

# ---- build the frontend (Vite static build) ----
FROM deps AS frontend-build
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_PROXY_URL=""
ARG BASE_PATH=/
# Vite's config requires PORT to be set even for a production build (it's
# only actually used by `vite dev`/`vite preview`); the value here is unused.
ENV PORT=5173
ENV BASE_PATH=${BASE_PATH}
ENV VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY}
ENV VITE_CLERK_PROXY_URL=${VITE_CLERK_PROXY_URL}
RUN pnpm --filter @workspace/romaneio run build

# ---- final: API runtime ----
FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-build /app/artifacts/api-server/dist ./dist
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--enable-source-maps", "dist/index.mjs"]

# ---- final: frontend static files + reverse proxy to the API ----
FROM nginx:1.27-alpine AS frontend
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/artifacts/romaneio/dist/public /usr/share/nginx/html
EXPOSE 80
