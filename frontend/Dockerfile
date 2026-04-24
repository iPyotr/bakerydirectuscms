# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

# ---------- base image with pnpm via corepack ----------
FROM node:${NODE_VERSION} AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ---------- install production + dev deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
    && pnpm install --frozen-lockfile

# ---------- build Next.js (standalone) ----------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Runtime env (DIRECTUS_URL, USE_DIRECTUS) are NOT required at build time —
# they are read on each request in server components / route handlers.
RUN pnpm build

# ---------- production runtime ----------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => { if (r.status >= 500) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
