# ─── Base: install dependencies ──────────────────────────────────────────────
FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile

COPY . .

# ─── API ─────────────────────────────────────────────────────────────────────
FROM base AS api
WORKDIR /app
EXPOSE 3000
CMD ["bun", "run", "apps/api/src/index.ts"]

# ─── Web: build static files ────────────────────────────────────────────────
FROM base AS web-build

RUN bun run --filter=@kyra/web build

# ─── Web: serve with nginx ───────────────────────────────────────────────────
FROM nginx:alpine AS web
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
