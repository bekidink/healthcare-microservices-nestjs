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
COPY apps/facility/package.json apps/facility/package.json
RUN pnpm install --frozen-lockfile=false --filter @healthcare/facility...

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/facility apps/facility
RUN pnpm --filter @healthcare/shared build
RUN pnpm --filter @healthcare/facility prisma:generate
RUN pnpm --filter @healthcare/facility build

FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl && corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace ./
WORKDIR /workspace/apps/facility
EXPOSE 3002
CMD ["node", "dist/main.js"]
