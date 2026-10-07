# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
# Prisma's engine binaries need real OpenSSL to detect the right target on
# Alpine (musl+openssl3) — without it, it silently guesses "openssl-1.1.x"
# and the engine fails to load at runtime with a non-JSON error.
RUN apk add --no-cache openssl && corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/finance/package.json apps/finance/package.json
RUN pnpm install --frozen-lockfile=false --filter @healthcare/finance...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/finance apps/finance
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/finance prisma:generate
RUN pnpm --filter @healthcare/finance build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl && corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
WORKDIR /workspace/apps/finance
EXPOSE 3008
CMD ["node", "dist/main.js"]
